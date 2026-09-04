package com.volt.android.data

import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/**
 * Fetches real driving route geometry from Google Directions API or Open Source Routing Machine (OSRM).
 * This allows the app to render actual road networks and highways even without Google Cloud billing
 * or when the backend services are not reachable from a physical mobile device.
 */
object GoogleDirectionsClient {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    /**
     * Fetch a driving route from origin to destination.
     * Tries Google Directions API first; if unavailable, unauthorized, or lacking billing,
     * seamlessly falls back to public OSRM for real road networks with full highway curves.
     *
     * @param originLat Origin latitude
     * @param originLng Origin longitude
     * @param destLat Destination latitude
     * @param destLng Destination longitude
     * @param apiKey Google Maps API key
     * @param waypoints Optional list of LatLng waypoints to route through
     */
    suspend fun fetchRoute(
        originLat: Double,
        originLng: Double,
        destLat: Double,
        destLng: Double,
        apiKey: String,
        waypoints: List<LatLng> = emptyList()
    ): DirectionsResult? = withContext(Dispatchers.IO) {
        // 1. Try Google Directions API if a non-placeholder API key is configured
        if (apiKey.isNotBlank() && apiKey != "YOUR_API_KEY_HERE") {
            val googleResult = try {
                fetchGoogleDirections(originLat, originLng, destLat, destLng, apiKey, waypoints)
            } catch (e: Exception) {
                android.util.Log.w("GoogleDirections", "Google Directions request failed: ${e.message}")
                null
            }
            if (googleResult != null) return@withContext googleResult
        }

        // 2. Seamless fallback to public OSRM for actual real-world road networks
        val osrmResult = try {
            fetchOsrmRoute(originLat, originLng, destLat, destLng, waypoints)
        } catch (e: Exception) {
            android.util.Log.w("OsrmRouting", "OSRM request failed: ${e.message}")
            null
        }
        if (osrmResult != null) return@withContext osrmResult

        null
    }

    /**
     * Queries Google Directions API.
     */
    private fun fetchGoogleDirections(
        originLat: Double,
        originLng: Double,
        destLat: Double,
        destLng: Double,
        apiKey: String,
        waypoints: List<LatLng> = emptyList()
    ): DirectionsResult? {
        val origin = "$originLat,$originLng"
        val destination = "$destLat,$destLng"

        var url = "https://maps.googleapis.com/maps/api/directions/json" +
                "?origin=$origin" +
                "&destination=$destination" +
                "&mode=driving" +
                "&key=$apiKey"

        if (waypoints.isNotEmpty()) {
            val waypointStr = waypoints.joinToString("|") { "${it.latitude},${it.longitude}" }
            url += "&waypoints=$waypointStr"
        }

        val request = Request.Builder().url(url).get().build()
        val response = client.newCall(request).execute()

        if (response.isSuccessful) {
            val body = response.body?.string()
            if (body != null) {
                val directionsResponse = json.decodeFromString<DirectionsApiResponse>(body)
                if (directionsResponse.status == "OK" && directionsResponse.routes.isNotEmpty()) {
                    val route = directionsResponse.routes[0]
                    val leg = route.legs[0]
                    return DirectionsResult(
                        encodedPolyline = route.overviewPolyline.points,
                        distanceMeters = route.legs.sumOf { it.distance.value },
                        durationSeconds = route.legs.sumOf { it.duration.value },
                        startAddress = leg.startAddress,
                        endAddress = leg.endAddress
                    )
                }
            }
        }
        return null
    }

    /**
     * Fetches driving route from public OSRM (Open Source Routing Machine).
     * Uses OpenStreetMap road network data — 100% free, requires no API key or billing,
     * and returns real driving roads with thousands of GPS coordinates along highways and streets.
     */
    suspend fun fetchOsrmRoute(
        originLat: Double,
        originLng: Double,
        destLat: Double,
        destLng: Double,
        waypoints: List<LatLng> = emptyList()
    ): DirectionsResult? = withContext(Dispatchers.IO) {
        val allPoints = mutableListOf<LatLng>()
        allPoints.add(LatLng(originLat, originLng))
        allPoints.addAll(waypoints.filter { it.latitude != 0.0 || it.longitude != 0.0 })
        allPoints.add(LatLng(destLat, destLng))

        if (allPoints.size < 2) return@withContext null

        val coordStringWithWaypoints = allPoints.joinToString(";") { "${it.longitude},${it.latitude}" }
        val directCoordString = "${originLng},${originLat};${destLng},${destLat}"

        val coordinateQueries = if (waypoints.isNotEmpty()) {
            listOf(coordStringWithWaypoints, directCoordString)
        } else {
            listOf(coordStringWithWaypoints)
        }

        for (coordString in coordinateQueries) {
            val serverCandidates = listOf(
                "https://router.project-osrm.org/route/v1/driving/$coordString?overview=full&geometries=polyline",
                "https://routing.openstreetmap.de/routed-car/route/v1/driving/$coordString?overview=full&geometries=polyline",
                "https://router.project-osrm.org/route/v1/driving/$coordString?overview=simplified&geometries=polyline",
                "https://router.project-osrm.org/route/v1/driving/$coordString?overview=full&geometries=geojson"
            )

            for (url in serverCandidates) {
                try {
                    val request = Request.Builder()
                        .url(url)
                        .header("User-Agent", "VoltEV-Android/1.0")
                        .get()
                        .build()

                    val response = client.newCall(request).execute()
                    if (response.isSuccessful) {
                        val body = response.body?.string()
                        if (!body.isNullOrBlank()) {
                            val root = json.parseToJsonElement(body) as? JsonObject
                            val code = (root?.get("code") as? JsonPrimitive)?.content
                            val routes = root?.get("routes") as? JsonArray
                            if (code == "Ok" && routes != null && routes.isNotEmpty()) {
                                val firstRoute = routes[0] as? JsonObject ?: continue
                                val distance = (firstRoute["distance"] as? JsonPrimitive)?.doubleOrNull ?: 0.0
                                val duration = (firstRoute["duration"] as? JsonPrimitive)?.doubleOrNull ?: 0.0

                                val geomElem = firstRoute["geometry"]
                                val geometryStr = when (geomElem) {
                                    is JsonPrimitive -> geomElem.content
                                    is JsonObject -> geomElem.toString()
                                    is JsonArray -> geomElem.toString()
                                    else -> ""
                                }

                                if (geometryStr.isNotBlank()) {
                                    android.util.Log.d("OsrmRouting", "Successfully fetched OSRM route (${geometryStr.length} chars, distance ${distance.toInt()}m) from $url")
                                    return@withContext DirectionsResult(
                                        encodedPolyline = geometryStr,
                                        distanceMeters = distance.toInt(),
                                        durationSeconds = duration.toInt(),
                                        startAddress = "Origin",
                                        endAddress = "Destination"
                                    )
                                }
                            }
                        }
                    } else {
                        android.util.Log.w("OsrmRouting", "Server $url responded with HTTP ${response.code}")
                    }
                } catch (e: Exception) {
                    android.util.Log.w("OsrmRouting", "OSRM candidate $url failed: ${e.message}")
                }
            }
        }
        null
    }

    /**
     * Generates a fallback polyline (straight line with interpolated points)
     * connecting origin -> waypoints (charging stops) -> destination.
     */
    fun generateFallbackPolyline(
        originLat: Double, originLng: Double,
        destLat: Double, destLng: Double,
        waypoints: List<LatLng> = emptyList()
    ): String {
        val allStops = mutableListOf<LatLng>()
        if (originLat != 0.0 || originLng != 0.0) {
            allStops.add(LatLng(originLat, originLng))
        }
        allStops.addAll(waypoints.filter { it.latitude != 0.0 || it.longitude != 0.0 })
        if (destLat != 0.0 || destLng != 0.0) {
            allStops.add(LatLng(destLat, destLng))
        }

        if (allStops.size < 2) return ""

        val points = mutableListOf<LatLng>()
        for (seg in 0 until allStops.size - 1) {
            val p1 = allStops[seg]
            val p2 = allStops[seg + 1]
            val numPoints = 15
            for (i in 0 until numPoints) {
                val fraction = i.toDouble() / numPoints
                val lat = p1.latitude + (p2.latitude - p1.latitude) * fraction
                val lng = p1.longitude + (p2.longitude - p1.longitude) * fraction
                points.add(LatLng(lat, lng))
            }
        }
        points.add(allStops.last())
        return encodePolyline(points)
    }

    /**
     * Encodes a list of LatLng points into a Google-encoded polyline string.
     */
    fun encodePolyline(points: List<LatLng>): String {
        val result = StringBuilder()
        var prevLat = 0
        var prevLng = 0

        for (point in points) {
            val lat = Math.round(point.latitude * 1E5).toInt()
            val lng = Math.round(point.longitude * 1E5).toInt()

            encodeValue(lat - prevLat, result)
            encodeValue(lng - prevLng, result)

            prevLat = lat
            prevLng = lng
        }

        return result.toString()
    }

    private fun encodeValue(value: Int, result: StringBuilder) {
        var v = if (value < 0) (value shl 1).inv() else value shl 1
        while (v >= 0x20) {
            result.append((((v and 0x1F) or 0x20) + 63).toChar())
            v = v shr 5
        }
        result.append((v + 63).toChar())
    }
}

data class DirectionsResult(
    val encodedPolyline: String,
    val distanceMeters: Int,
    val durationSeconds: Int,
    val startAddress: String = "",
    val endAddress: String = ""
)

// Google Directions API JSON response models
@Serializable
data class DirectionsApiResponse(
    @SerialName("status") val status: String,
    @SerialName("routes") val routes: List<DirectionsRoute> = emptyList()
)

@Serializable
data class DirectionsRoute(
    @SerialName("overview_polyline") val overviewPolyline: DirectionsPolyline,
    @SerialName("legs") val legs: List<DirectionsLeg>
)

@Serializable
data class DirectionsPolyline(
    @SerialName("points") val points: String
)

@Serializable
data class DirectionsLeg(
    @SerialName("distance") val distance: DirectionsValue,
    @SerialName("duration") val duration: DirectionsValue,
    @SerialName("start_address") val startAddress: String = "",
    @SerialName("end_address") val endAddress: String = ""
)

@Serializable
data class DirectionsValue(
    @SerialName("value") val value: Int,
    @SerialName("text") val text: String = ""
)
