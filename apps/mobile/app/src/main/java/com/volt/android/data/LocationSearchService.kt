package com.volt.android.data

import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.Locale
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

/**
 * Data class representing a location suggestion with geographic coordinates.
 */
data class PlaceSuggestion(
    val name: String,
    val secondaryText: String,
    val latitude: Double,
    val longitude: Double
) {
    val fullDisplayName: String
        get() = if (secondaryText.isNotBlank()) "$name, $secondaryText" else name
}

object LocationSearchService {

    private const val TAG = "LocationSearchService"

    // Curated high-frequency EV corridor hubs and major locations for instantaneous offline suggestions
    private val POPULAR_LOCATIONS = listOf(
        PlaceSuggestion("Bengaluru", "Karnataka, India", 12.9716, 77.5946),
        PlaceSuggestion("Mysuru", "Karnataka, India", 12.2958, 76.6394),
        PlaceSuggestion("Mumbai", "Maharashtra, India", 19.0760, 72.8777),
        PlaceSuggestion("Pune", "Maharashtra, India", 18.5204, 73.8567),
        PlaceSuggestion("Delhi", "Delhi, India", 28.7041, 77.1025),
        PlaceSuggestion("Jaipur", "Rajasthan, India", 26.9124, 75.7873),
        PlaceSuggestion("Chennai", "Tamil Nadu, India", 13.0827, 80.2707),
        PlaceSuggestion("Hyderabad", "Telangana, India", 17.3850, 78.4867),
        PlaceSuggestion("San Francisco", "California, USA", 37.7749, -122.4194),
        PlaceSuggestion("Lake Tahoe", "Nevada / California, USA", 39.0968, -120.0324),
        PlaceSuggestion("Los Angeles", "California, USA", 34.0522, -118.2437),
        PlaceSuggestion("Las Vegas", "Nevada, USA", 36.1699, -115.1398),
        PlaceSuggestion("San Jose", "California, USA", 37.3382, -121.8863),
        PlaceSuggestion("Sacramento", "California, USA", 38.5816, -121.4944),
        PlaceSuggestion("Oakland", "California, USA", 37.8044, -122.2711),
        PlaceSuggestion("Palo Alto", "California, USA", 37.4419, -122.1430),
        PlaceSuggestion("Seattle", "Washington, USA", 47.6062, -122.3321),
        PlaceSuggestion("New York", "New York, USA", 40.7128, -74.0060)
    )

    /**
     * Synchronously finds a local matching suggestion from curated locations by name.
     */
    fun findLocalSuggestion(query: String): PlaceSuggestion? {
        val trimmed = query.trim()
        if (trimmed.length < 2) return null
        return POPULAR_LOCATIONS.find {
            it.name.equals(trimmed, ignoreCase = true) ||
            it.fullDisplayName.contains(trimmed, ignoreCase = true) ||
            trimmed.contains(it.name, ignoreCase = true)
        }
    }

    /**
     * Searches for location recommendations matching the user's typed query.
     * Uses Android's native Geocoder with fallback to curated database and Photon OpenStreetMap API.
     */
    suspend fun searchLocations(context: Context, query: String): List<PlaceSuggestion> = withContext(Dispatchers.IO) {
        val trimmed = query.trim()
        if (trimmed.length < 2) return@withContext emptyList()

        val results = mutableListOf<PlaceSuggestion>()
        val seenKeys = mutableSetOf<String>()

        // 1. Instant match from curated popular hubs
        val localMatches = POPULAR_LOCATIONS.filter {
            it.name.contains(trimmed, ignoreCase = true) ||
            it.secondaryText.contains(trimmed, ignoreCase = true)
        }
        for (item in localMatches) {
            val key = "${item.latitude.roundTo4()},${item.longitude.roundTo4()}"
            if (seenKeys.add(key)) {
                results.add(item)
            }
        }

        // 2. Android Geocoder lookup
        try {
            val geocoder = Geocoder(context, Locale.getDefault())
            @Suppress("DEPRECATION")
            val addresses = geocoder.getFromLocationName(trimmed, 5) ?: emptyList()

            for (addr in addresses) {
                val name = addr.featureName ?: addr.locality ?: addr.subAdminArea ?: trimmed
                val admin = listOfNotNull(addr.locality, addr.adminArea, addr.countryName)
                    .distinct()
                    .filter { it != name }
                    .joinToString(", ")

                val key = "${addr.latitude.roundTo4()},${addr.longitude.roundTo4()}"
                if (seenKeys.add(key)) {
                    results.add(
                        PlaceSuggestion(
                            name = name,
                            secondaryText = admin.ifBlank { addr.countryName ?: "" },
                            latitude = addr.latitude,
                            longitude = addr.longitude
                        )
                    )
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Geocoder failed for query '$trimmed': ${e.message}")
        }

        // 3. Fallback online search via Photon API if results are still scarce
        if (results.size < 3) {
            try {
                val encodedQuery = URLEncoder.encode(trimmed, "UTF-8")
                val url = URL("https://photon.komoot.io/api/?q=$encodedQuery&limit=5")
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 3000
                conn.readTimeout = 3000
                conn.requestMethod = "GET"

                if (conn.responseCode == 200) {
                    val response = conn.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(response)
                    val features = json.optJSONArray("features")
                    if (features != null) {
                        for (i in 0 until features.length()) {
                            val feature = features.getJSONObject(i)
                            val geometry = feature.getJSONObject("geometry")
                            val coordinates = geometry.getJSONArray("coordinates")
                            val lng = coordinates.getDouble(0)
                            val lat = coordinates.getDouble(1)

                            val properties = feature.getJSONObject("properties")
                            val name = properties.optString("name", trimmed)
                            val city = properties.optString("city", "")
                            val state = properties.optString("state", "")
                            val country = properties.optString("country", "")

                            val subtitle = listOf(city, state, country)
                                .filter { it.isNotBlank() && it != name }
                                .joinToString(", ")

                            val key = "${lat.roundTo4()},${lng.roundTo4()}"
                            if (seenKeys.add(key)) {
                                results.add(
                                    PlaceSuggestion(
                                        name = name,
                                        secondaryText = subtitle,
                                        latitude = lat,
                                        longitude = lng
                                    )
                                )
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.d(TAG, "Photon fallback search error: ${e.message}")
            }
        }

        return@withContext results.take(6)
    }

    /**
     * Reverse-geocodes coordinates into a readable location string.
     */
    suspend fun reverseGeocode(context: Context, lat: Double, lng: Double): String = withContext(Dispatchers.IO) {
        try {
            val geocoder = Geocoder(context, Locale.getDefault())
            @Suppress("DEPRECATION")
            val addresses = geocoder.getFromLocation(lat, lng, 1) ?: emptyList()

            val address = addresses.firstOrNull()
            if (address != null) {
                val parts = listOfNotNull(
                    address.thoroughfare ?: address.subLocality,
                    address.locality,
                    address.adminArea
                ).distinct()
                if (parts.isNotEmpty()) {
                    return@withContext parts.joinToString(", ")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Reverse geocode failed: ${e.message}")
        }
        return@withContext "Current Location (${String.format(Locale.US, "%.3f, %.3f", lat, lng)})"
    }

    /**
     * Calculates the estimated driving distance between two coordinates in kilometers.
     * Uses Haversine formula with a 1.22x road winding/detour factor for realistic road distance.
     */
    fun calculateDistanceKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val earthRadiusKm = 6371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        val straightLineKm = earthRadiusKm * c
        // Multiply by 1.22 road detour factor to estimate driving route distance
        val estimatedRoadKm = straightLineKm * 1.22
        return (estimatedRoadKm * 10.0).roundToInt() / 10.0
    }

    private fun Double.roundTo4(): Double = (this * 10000).roundToInt() / 10000.0
}
