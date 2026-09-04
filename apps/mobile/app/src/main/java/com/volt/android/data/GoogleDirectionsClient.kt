package com.volt.android.data

import com.google.android.gms.maps.model.LatLng
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/**
 * Fetches route geometry (encoded polyline) from Google Directions API.
 * This allows the app to render real driving routes on the map even when
 * the backend services are not running.
 */
object GoogleDirectionsClient {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    /**
     * Fetch a driving route from origin to destination via Google Directions API.
     * Returns the encoded polyline geometry string, or null if the request fails.
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
        try {
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
                        DirectionsResult(
                            encodedPolyline = route.overviewPolyline.points,
                            distanceMeters = route.legs.sumOf { it.distance.value },
                            durationSeconds = route.legs.sumOf { it.duration.value },
                            startAddress = leg.startAddress,
                            endAddress = leg.endAddress
                        )
                    } else null
                } else null
            } else null
        } catch (e: Exception) {
            android.util.Log.e("GoogleDirections", "Failed to fetch route: ${e.message}")
            null
        }
    }

    /**
     * Generate a simple straight-line encoded polyline between two points
     * with intermediate points for smoother rendering.
     * Used as a fallback when the Directions API is unavailable.
     */
    fun generateFallbackPolyline(
        originLat: Double,
        originLng: Double,
        destLat: Double,
        destLng: Double,
        numPoints: Int = 50
    ): String {
        val points = mutableListOf<LatLng>()
        for (i in 0..numPoints) {
            val fraction = i.toDouble() / numPoints
            val lat = originLat + (destLat - originLat) * fraction
            val lng = originLng + (destLng - originLng) * fraction
            points.add(LatLng(lat, lng))
        }
        return encodePolyline(points)
    }

    /**
     * Encodes a list of LatLng points into a Google-encoded polyline string.
     */
    private fun encodePolyline(points: List<LatLng>): String {
        val result = StringBuilder()
        var prevLat = 0
        var prevLng = 0

        for (point in points) {
            val lat = (point.latitude * 1E5).toInt()
            val lng = (point.longitude * 1E5).toInt()

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
            result.append(((v and 0x1F) or 0x20 + 63).toChar())
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
