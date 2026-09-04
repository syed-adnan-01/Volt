package com.volt.android.data

import com.google.android.gms.maps.model.LatLng
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Universal Route Decoder & Path Builder for VOLT.
 *
 * Supports:
 * 1. GeoJSON LineString (e.g. OSRM `geometries=geojson` -> {"type":"LineString","coordinates":[[lon,lat],...]})
 * 2. JSON coordinate arrays (e.g. `[[lon, lat], ...]`)
 * 3. JSON object arrays (e.g. `[{"lat":..., "lng":...}]`)
 * 4. Google-encoded polylines (5-bit precision 1E5 and 6-bit precision 1E6)
 * 5. Waypoint & charging stop path synthesis (connecting origin -> all charging stops -> destination)
 */
object PolylineDecoder {

    private val jsonParser = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
    }

    /**
     * Decode route geometry from any backend format into a list of [LatLng] points.
     * Handles GeoJSON, JSON arrays, and Google encoded polyline strings.
     * Returns an empty list if decoding fails or geometry is invalid.
     */
    fun decode(geometry: String?): List<LatLng> {
        if (geometry.isNullOrBlank()) return emptyList()
        val trimmed = geometry.trim()
        if (trimmed == "null" || trimmed == "[]" || trimmed == "{}") return emptyList()

        return try {
            when {
                trimmed.startsWith("{") || trimmed.startsWith("[") -> {
                    val element = jsonParser.parseToJsonElement(trimmed)
                    decodeJsonElement(element)
                }
                else -> decodeGooglePolylineSafe(trimmed)
            }
        } catch (_: Exception) {
            decodeGooglePolylineSafe(trimmed)
        }
    }

    private fun decodeJsonElement(element: JsonElement): List<LatLng> {
        return when (element) {
            is JsonObject -> decodeJsonObject(element)
            is JsonArray -> decodeJsonArray(element)
            else -> emptyList()
        }
    }

    /**
     * Parse GeoJSON LineString or geometry JSON object.
     * Standard GeoJSON format: {"type": "LineString", "coordinates": [[lon, lat], ...]}
     */
    private fun decodeJsonObject(obj: JsonObject): List<LatLng> {
        // Case A: obj has "coordinates" array
        val directCoords = obj["coordinates"] as? JsonArray
        if (directCoords != null) {
            return parseCoordinatesArray(directCoords)
        }

        // Case B: nested "geometry" -> "coordinates"
        val nestedGeom = obj["geometry"] as? JsonObject
        val nestedCoords = nestedGeom?.get("coordinates") as? JsonArray
        if (nestedCoords != null) {
            return parseCoordinatesArray(nestedCoords)
        }

        // Case C: FeatureCollection or Feature with features array
        val features = obj["features"] as? JsonArray
        if (features != null && features.isNotEmpty()) {
            val firstFeature = features[0] as? JsonObject
            val featGeom = firstFeature?.get("geometry") as? JsonObject
            val featCoords = featGeom?.get("coordinates") as? JsonArray
            if (featCoords != null) {
                return parseCoordinatesArray(featCoords)
            }
        }

        return emptyList()
    }

    /**
     * Parse a JSON array which could be [[lon, lat], ...] or [{"lat":..., "lng":...}]
     */
    private fun decodeJsonArray(array: JsonArray): List<LatLng> {
        if (array.isEmpty()) return emptyList()

        val firstItem = array[0]
        return when (firstItem) {
            is JsonArray -> parseCoordinatesArray(array)
            is JsonObject -> {
                val points = mutableListOf<LatLng>()
                for (item in array) {
                    val obj = item as? JsonObject ?: continue
                    val lat = obj["lat"]?.jsonPrimitive?.doubleOrNull
                        ?: obj["latitude"]?.jsonPrimitive?.doubleOrNull
                    val lng = obj["lng"]?.jsonPrimitive?.doubleOrNull
                        ?: obj["longitude"]?.jsonPrimitive?.doubleOrNull
                    if (lat != null && lng != null && isValidCoordinate(lat, lng)) {
                        points.add(LatLng(lat, lng))
                    }
                }
                points
            }
            else -> emptyList()
        }
    }

    /**
     * Parses a JsonArray of coordinate pairs: [[x, y], [x, y], ...]
     * RFC 7946 GeoJSON specifies coordinates are [longitude, latitude].
     */
    private fun parseCoordinatesArray(array: JsonArray): List<LatLng> {
        val points = mutableListOf<LatLng>()
        for (item in array) {
            val coord = item as? JsonArray ?: continue
            if (coord.size >= 2) {
                val first = coord[0].jsonPrimitive.doubleOrNull ?: continue
                val second = coord[1].jsonPrimitive.doubleOrNull ?: continue

                // In GeoJSON: [lon, lat] -> LatLng(second, first)
                // Check if coordinates were flipped:
                val (lat, lng) = if (abs(first) > 90.0 && abs(second) <= 90.0) {
                    // first is definitely longitude, second is latitude
                    Pair(second, first)
                } else if (abs(second) > 90.0 && abs(first) <= 90.0) {
                    // second is definitely longitude, first is latitude
                    Pair(first, second)
                } else {
                    // Both within [-90, 90], default to GeoJSON standard [lon, lat]
                    Pair(second, first)
                }

                if (isValidCoordinate(lat, lng)) {
                    points.add(LatLng(lat, lng))
                }
            }
        }
        return points
    }

    /**
     * Decode Google-encoded polyline string with automatic 1E5 vs 1E6 (polyline6) precision detection.
     */
    private fun decodeGooglePolylineSafe(encoded: String): List<LatLng> {
        val points5 = decodeGooglePolylineWithPrecision(encoded, 1E5)
        if (points5.isNotEmpty() && points5.all { isValidCoordinate(it.latitude, it.longitude) }) {
            return points5
        }

        // Try polyline6 (used by some OSRM endpoints)
        val points6 = decodeGooglePolylineWithPrecision(encoded, 1E6)
        if (points6.isNotEmpty() && points6.all { isValidCoordinate(it.latitude, it.longitude) }) {
            return points6
        }

        return points5.filter { isValidCoordinate(it.latitude, it.longitude) }
    }

    private fun decodeGooglePolylineWithPrecision(encoded: String, precision: Double): List<LatLng> {
        val poly = mutableListOf<LatLng>()
        var index = 0
        val len = encoded.length
        var lat = 0
        var lng = 0

        while (index < len) {
            var result = 0
            var shift = 0
            var b: Int
            do {
                if (index >= len) return poly
                b = encoded[index++].code - 63
                result = result or ((b and 0x1F) shl shift)
                shift += 5
            } while (b >= 0x20)
            lat += if (result and 1 != 0) (result shr 1).inv() else result shr 1

            result = 0
            shift = 0
            do {
                if (index >= len) return poly
                b = encoded[index++].code - 63
                result = result or ((b and 0x1F) shl shift)
                shift += 5
            } while (b >= 0x20)
            lng += if (result and 1 != 0) (result shr 1).inv() else result shr 1

            val latDouble = lat / precision
            val lngDouble = lng / precision

            if (isValidCoordinate(latDouble, lngDouble)) {
                poly.add(LatLng(latDouble, lngDouble))
            }
        }

        return poly
    }

    private fun isValidCoordinate(lat: Double, lng: Double): Boolean {
        return !lat.isNaN() && !lng.isNaN() &&
                lat >= -90.0 && lat <= 90.0 &&
                lng >= -180.0 && lng <= 180.0 &&
                !(lat == 0.0 && lng == 0.0) // Reject exact null island if isolated
    }

    /**
     * Builds a continuous path through an ordered list of waypoints
     * (e.g. Origin -> Charger 1 -> Charger 2 -> Destination).
     * Adds interpolated intermediate points for smooth curve rendering on Google Maps.
     */
    fun buildPathThroughStops(
        waypoints: List<LatLng>,
        pointsPerSegment: Int = 15
    ): List<LatLng> {
        val validWaypoints = waypoints.filter { isValidCoordinate(it.latitude, it.longitude) }
        if (validWaypoints.size < 2) return validWaypoints

        val result = mutableListOf<LatLng>()
        for (i in 0 until validWaypoints.size - 1) {
            val start = validWaypoints[i]
            val end = validWaypoints[i + 1]

            // Add start point
            result.add(start)

            // Add intermediate interpolated points along great-circle or linear segment
            for (step in 1 until pointsPerSegment) {
                val frac = step.toDouble() / pointsPerSegment.toDouble()
                val lat = start.latitude + (end.latitude - start.latitude) * frac
                val lng = start.longitude + (end.longitude - start.longitude) * frac
                result.add(LatLng(lat, lng))
            }
        }
        // Add final waypoint
        result.add(validWaypoints.last())
        return result
    }

    /**
     * Ensures that the route polyline visibly and accurately passes through all required charging stops.
     *
     * If [baseRoute] already contains or passes near each stop, it is preserved.
     * Any charging stop not visited by the base route is seamlessly spliced into the path
     * so that the drawn line visits: Origin -> Stop 1 -> Stop 2 -> ... -> Destination.
     */
    fun ensurePathVisitsAllStops(
        baseRoute: List<LatLng>,
        origin: LatLng?,
        chargingStops: List<LatLng>,
        destination: LatLng?
    ): List<LatLng> {
        val validOrigin = if (origin != null && isValidCoordinate(origin.latitude, origin.longitude)) origin else null
        val validDest = if (destination != null && isValidCoordinate(destination.latitude, destination.longitude)) destination else null
        val validStops = chargingStops.filter { isValidCoordinate(it.latitude, it.longitude) }

        // Helper to synthesize a clean, smooth line through all waypoints in order: Origin -> Stops -> Destination
        fun synthesizePath(): List<LatLng> {
            val waypoints = mutableListOf<LatLng>()
            validOrigin?.let { waypoints.add(it) }
            waypoints.addAll(validStops)
            validDest?.let { waypoints.add(it) }
            return buildPathThroughStops(waypoints)
        }

        // 1. If base route has fewer than 2 points, synthesize full line
        if (baseRoute.size < 2) {
            return synthesizePath()
        }

        // 2. Sanity check: Ensure baseRoute is in the reasonable geographic region of this trip
        // Only discard if the route starts or ends more than 150 km away (e.g. off-map coordinate bugs)
        if (validOrigin != null && distanceMeters(baseRoute.first(), validOrigin) > 150_000.0) {
            return synthesizePath()
        }
        if (validDest != null && distanceMeters(baseRoute.last(), validDest) > 150_000.0) {
            return synthesizePath()
        }

        // 3. Anchor endpoints: Ensure path visibly starts at origin and ends at destination
        val workingRoute = baseRoute.toMutableList()
        if (validOrigin != null && distanceMeters(workingRoute.first(), validOrigin) > 50.0) {
            workingRoute.add(0, validOrigin)
        }
        if (validDest != null && distanceMeters(workingRoute.last(), validDest) > 50.0) {
            workingRoute.add(validDest)
        }

        // If there are no charging stops, return the anchored route
        if (validStops.isEmpty()) {
            return workingRoute
        }

        // 4. Check which stops are already visited (within ~400 meters)
        val missingStops = validStops.filter { stop ->
            workingRoute.none { point -> distanceMeters(point, stop) < 400.0 }
        }

        if (missingStops.isEmpty()) {
            return workingRoute
        }

        // 5. Splice each missing stop into the closest segment
        for (stop in missingStops) {
            var bestIdx = 0
            var bestDist = Double.MAX_VALUE

            for (i in 0 until workingRoute.size) {
                val d = distanceMeters(workingRoute[i], stop)
                if (d < bestDist) {
                    bestDist = d
                    bestIdx = i
                }
            }

            if (bestIdx in 1 until workingRoute.size - 1) {
                val prev = workingRoute[bestIdx - 1]
                val next = workingRoute[bestIdx + 1]
                val detourIn = LatLng((prev.latitude + stop.latitude) / 2.0, (prev.longitude + stop.longitude) / 2.0)
                val detourOut = LatLng((stop.latitude + next.latitude) / 2.0, (stop.longitude + next.longitude) / 2.0)
                // Replace closest point with approach -> stop -> depart to avoid doubling back
                workingRoute[bestIdx] = stop
                workingRoute.add(bestIdx, detourIn)
                workingRoute.add(bestIdx + 2, detourOut)
            } else {
                workingRoute.add(bestIdx, stop)
            }
        }

        return workingRoute
    }

    /**
     * Approximate Haversine distance in meters between two LatLng points.
     */
    private fun distanceMeters(p1: LatLng, p2: LatLng): Double {
        val r = 6371000.0 // Earth radius in meters
        val lat1Rad = Math.toRadians(p1.latitude)
        val lat2Rad = Math.toRadians(p2.latitude)
        val dLat = Math.toRadians(p2.latitude - p1.latitude)
        val dLng = Math.toRadians(p2.longitude - p1.longitude)

        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(lat1Rad) * cos(lat2Rad) * sin(dLng / 2) * sin(dLng / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }
}
