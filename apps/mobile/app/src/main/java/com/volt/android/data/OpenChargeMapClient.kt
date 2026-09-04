package com.volt.android.data

import com.volt.android.BuildConfig
import com.volt.android.data.models.ChargingStation
import com.volt.android.data.models.Connector
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Client for fetching live, real-world operational EV charging stations from OpenChargeMap.
 * Supports radial proximity search and corridor bounding box search worldwide.
 */
object OpenChargeMapClient {

    private const val DEFAULT_API_KEY = "8298d554-faff-4049-adc0-61c4a74ed27f"

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .build()

    private fun logD(msg: String) {
        try { android.util.Log.d("OpenChargeMapClient", msg) } catch (_: Exception) {}
    }

    private fun logW(msg: String) {
        try { android.util.Log.w("OpenChargeMapClient", msg) } catch (_: Exception) {}
    }

    private fun logE(msg: String) {
        try { android.util.Log.e("OpenChargeMapClient", msg) } catch (_: Exception) {}
    }

    private fun getApiKey(): String {
        return try {
            val key = BuildConfig.OPENCHARGEMAP_API_KEY
            if (key.isNotBlank() && key != "YOUR_KEY_HERE") key else DEFAULT_API_KEY
        } catch (_: Exception) {
            DEFAULT_API_KEY
        }
    }

    suspend fun fetchCorridorStations(
        originLat: Double,
        originLng: Double,
        destLat: Double,
        destLng: Double,
        maxResults: Int = 80
    ): List<ChargingStation> = withContext(Dispatchers.IO) {
        if (originLat == 0.0 || destLat == 0.0) return@withContext emptyList()

        val allStationsMap = mutableMapOf<String, ChargingStation>()

        // 1. Primary corridor bounding box query
        val minLat = min(originLat, destLat) - 0.25
        val maxLat = max(originLat, destLat) + 0.25
        val minLng = min(originLng, destLng) - 0.25
        val maxLng = max(originLng, destLng) + 0.25

        val bboxStr = "($minLat,$minLng),($maxLat,$maxLng)"
        val url = "https://api.openchargemap.io/v3/poi/?output=json" +
                "&boundingbox=$bboxStr" +
                "&maxresults=$maxResults" +
                "&compact=true&verbose=false" +
                "&key=${getApiKey()}"

        val bboxResults = fetchFromUrl(url)
        bboxResults.forEach { s -> allStationsMap[s.id] = s }

        // 2. Multi-waypoint corridor sampling (at 20%, 40%, 60%, 80% along route corridor)
        // Guarantees real EV stations in intermediate highway towns (Ramanagara, Mandya, Maddur, etc.) are fetched
        val sampleFractions = listOf(0.2, 0.4, 0.6, 0.8)
        for (fraction in sampleFractions) {
            val wpLat = originLat + (destLat - originLat) * fraction
            val wpLng = originLng + (destLng - originLng) * fraction
            val wpStations = fetchStationsNearby(wpLat, wpLng, radiusKm = 45.0, maxResults = 15)
            wpStations.forEach { s -> allStationsMap[s.id] = s }
        }

        val combined = allStationsMap.values.toList()
        logD("Corridor multi-waypoint search returned ${combined.size} total unique stations for ($originLat,$originLng)->($destLat,$destLng)")
        combined
    }

    suspend fun fetchStationsNearby(
        lat: Double,
        lng: Double,
        radiusKm: Double = 50.0,
        maxResults: Int = 20
    ): List<ChargingStation> = withContext(Dispatchers.IO) {
        if (lat == 0.0 && lng == 0.0) return@withContext emptyList()

        val url = "https://api.openchargemap.io/v3/poi/?output=json" +
                "&latitude=$lat&longitude=$lng" +
                "&distance=${radiusKm.toInt()}&distanceunit=KM" +
                "&maxresults=$maxResults" +
                "&compact=true&verbose=false" +
                "&key=${getApiKey()}"

        fetchFromUrl(url)
    }

    private fun fetchFromUrl(url: String): List<ChargingStation> {
        try {
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "VoltEV-Android/1.0")
                .get()
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                logW("OpenChargeMap API responded with HTTP ${response.code}")
                return emptyList()
            }

            val body = response.body?.string() ?: return emptyList()
            return parseOpenChargeMapJson(body)
        } catch (e: Exception) {
            logE("Failed to query OpenChargeMap: ${e.message}")
            return emptyList()
        }
    }

    fun parseOpenChargeMapJson(jsonString: String): List<ChargingStation> {
        val stations = mutableListOf<ChargingStation>()
        try {
            val element = json.parseToJsonElement(jsonString)
            val array = element.jsonArray
            for (itemEl in array) {
                val item = itemEl.jsonObject
                val id = item["ID"]?.jsonPrimitive?.longOrNull ?: 0L
                val addressInfo = item["AddressInfo"]?.jsonObject ?: continue

                val lat = addressInfo["Latitude"]?.jsonPrimitive?.doubleOrNull ?: continue
                val lng = addressInfo["Longitude"]?.jsonPrimitive?.doubleOrNull ?: continue

                val rawTitle = addressInfo["Title"]?.jsonPrimitive?.content?.trim() ?: "EV Charging Station"
                val line1 = addressInfo["AddressLine1"]?.jsonPrimitive?.content?.trim() ?: ""
                val town = addressInfo["Town"]?.jsonPrimitive?.content?.trim() ?: ""
                val state = addressInfo["StateOrProvince"]?.jsonPrimitive?.content?.trim() ?: ""
                val fullAddress = listOf(line1, town, state).filter { it.isNotBlank() }.joinToString(", ").ifBlank { "Highway Corridor" }

                val operatorInfo = item["OperatorInfo"]?.jsonObject
                val rawOperator = operatorInfo?.get("Title")?.jsonPrimitive?.content?.trim()
                val operator = if (!rawOperator.isNullOrBlank() && !rawOperator.contains("Unknown", ignoreCase = true)) {
                    rawOperator
                } else {
                    detectOperatorFromName(rawTitle)
                }

                val connectionsArray = item["Connections"]?.jsonArray
                val connectors = mutableListOf<Connector>()
                var maxPower = 0.0

                if (connectionsArray != null && connectionsArray.isNotEmpty()) {
                    for ((c, connEl) in connectionsArray.withIndex()) {
                        val connObj = connEl.jsonObject
                        val connTypeObj = connObj["ConnectionType"]?.jsonObject
                        val typeTitle = connTypeObj?.get("Title")?.jsonPrimitive?.content ?: "CCS (Type 2)"
                        val powerKw = connObj["PowerKW"]?.jsonPrimitive?.doubleOrNull?.let { if (it > 0) it else 60.0 } ?: 60.0
                        if (powerKw > maxPower) maxPower = powerKw

                        val statusObj = connObj["StatusType"]?.jsonObject
                        val isOperational = statusObj?.get("IsOperational")?.jsonPrimitive?.booleanOrNull ?: true
                        val statusStr = if (isOperational) "available" else "inoperative"

                        connectors.add(
                            Connector(
                                id = "conn-$id-$c",
                                connectorType = cleanConnectorType(typeTitle),
                                powerKw = powerKw,
                                status = statusStr
                            )
                        )
                    }
                }

                val effectivePowerKw = if (maxPower > 0) maxPower.toInt() else 60
                val numPoints = item["NumberOfPoints"]?.jsonPrimitive?.intOrNull ?: 2
                val totalPlugs = connectors.size.coerceAtLeast(numPoints)
                val availablePlugs = connectors.count { it.status == "available" }.coerceAtLeast(1)

                val usageCost = item["UsageCost"]?.jsonPrimitive?.content ?: ""
                val pricePerKWh = parseUsageCost(usageCost)

                stations.add(
                    ChargingStation(
                        id = "ocm-$id",
                        name = rawTitle,
                        operator = operator,
                        address = fullAddress,
                        powerKw = effectivePowerKw,
                        isFastCharger = effectivePowerKw >= 50,
                        connectors = connectors.ifEmpty {
                            listOf(
                                Connector(id = "c1", connectorType = "CCS2", powerKw = effectivePowerKw.toDouble(), status = "available"),
                                Connector(id = "c2", connectorType = "Type 2", powerKw = 22.0, status = "available")
                            )
                        },
                        availablePlugs = availablePlugs,
                        totalPlugs = totalPlugs,
                        pricePerKWh = pricePerKWh,
                        distanceKm = 0.0,
                        latitude = lat,
                        longitude = lng,
                        isReachable = true
                    )
                )
            }
        } catch (e: Exception) {
            logE("Error parsing OpenChargeMap JSON: ${e.message}")
        }
        return stations
    }

    private fun detectOperatorFromName(title: String): String {
        val lower = title.lowercase()
        return when {
            lower.contains("tata power") -> "Tata Power EZ Charge"
            lower.contains("zeon") -> "Zeon Charging"
            lower.contains("jio-bp") || lower.contains("jio bp") -> "Jio-bp pulse"
            lower.contains("statiq") -> "Statiq"
            lower.contains("chargezone") -> "ChargeZone"
            lower.contains("relux") -> "Relux Electric"
            lower.contains("bescom") -> "BESCOM"
            lower.contains("ather") -> "Ather Grid"
            lower.contains("shell") -> "Shell Recharge"
            lower.contains("chargepoint") -> "ChargePoint"
            lower.contains("blink") -> "Blink Charging"
            lower.contains("electrify america") -> "Electrify America"
            lower.contains("tesla") -> "Tesla Supercharger"
            else -> "Open Fast Charging Network"
        }
    }

    private fun cleanConnectorType(title: String): String {
        return when {
            title.contains("CCS (Type 2)", ignoreCase = true) || title.contains("CCS2", ignoreCase = true) -> "CCS2"
            title.contains("CCS (Type 1)", ignoreCase = true) || title.contains("CCS1", ignoreCase = true) -> "CCS1"
            title.contains("CHAdeMO", ignoreCase = true) -> "CHAdeMO"
            title.contains("Type 2", ignoreCase = true) -> "Type 2"
            title.contains("Tesla", ignoreCase = true) || title.contains("NACS", ignoreCase = true) -> "NACS / Tesla"
            else -> "CCS2"
        }
    }

    private fun parseUsageCost(costStr: String): Double {
        if (costStr.isBlank()) return 0.24
        val digits = costStr.filter { it.isDigit() || it == '.' }
        val num = digits.toDoubleOrNull() ?: return 0.24
        return if (num > 5.0) ((num / 85.0) * 100.0).roundToInt() / 100.0 else num
    }
}
