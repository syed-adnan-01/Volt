package com.volt.android.data.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ──────────────────────────────────────────────
// Domain Models (Aligned with Backend Contracts)
// ──────────────────────────────────────────────

@Serializable
data class VehicleProfile(
    @SerialName("id") val id: String,
    @SerialName("user_id") val userId: String? = null,
    @SerialName("make") val make: String,
    @SerialName("model") val model: String,
    @SerialName("trim") val trim: String = "",
    @SerialName("battery_capacity_kwh") val batteryCapacityKWh: Double,
    @SerialName("usable_capacity_kwh") val usableCapacityKWh: Double = batteryCapacityKWh * 0.95,
    @SerialName("consumption_kwh_per_km") val consumptionKWhPerKm: Double = 0.16,
    @SerialName("battery_health_percent") val batteryHealthPercent: Double = 100.0,
    @SerialName("reserve_soc_percent") val reserveSocPercent: Double = 10.0,
    @SerialName("max_charging_power_kw") val maxChargingPowerKw: Double = 150.0,
    @SerialName("current_soc") val currentSoC: Double = 80.0
) {
    val baseConsumptionWhKm: Double
        get() = consumptionKWhPerKm * 1000.0

    val batteryHealth: Double
        get() = batteryHealthPercent
}

@Serializable
data class BatteryTelemetry(
    @SerialName("soc_percent") val socPercent: Double,
    @SerialName("current_energy_kwh") val currentEnergyKWh: Double,
    @SerialName("total_capacity_kwh") val totalCapacityKWh: Double,
    @SerialName("estimated_range_km") val estimatedRangeKm: Double,
    @SerialName("battery_health_percent") val batteryHealthPercent: Double,
    @SerialName("voltage") val voltage: Double,
    @SerialName("temperature_celsius") val temperatureCelsius: Double,
    @SerialName("current_power_kw") val currentPowerKw: Double,
    @SerialName("drain_rate_wh_km") val drainRateWhKm: Double,
    @SerialName("is_charging") val isCharging: Boolean,
    @SerialName("is_preconditioning") val isPreconditioning: Boolean,
    @SerialName("is_range_mode") val isRangeMode: Boolean
)

@Serializable
data class Connector(
    @SerialName("id") val id: String? = null,
    @SerialName("connector_type") val connectorType: String,
    @SerialName("power_kw") val powerKw: Double,
    @SerialName("status") val status: String = "available"
)

@Serializable
data class ChargingStation(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("operator") val operator: String,
    @SerialName("address") val address: String,
    @SerialName("power_kw") val powerKw: Int,
    @SerialName("is_fast_charger") val isFastCharger: Boolean,
    @SerialName("connectors") val connectors: List<Connector> = emptyList(),
    @SerialName("available_plugs") val availablePlugs: Int,
    @SerialName("total_plugs") val totalPlugs: Int,
    @SerialName("price_per_kwh") val pricePerKWh: Double,
    @SerialName("distance_km") val distanceKm: Double,
    @SerialName("latitude") val latitude: Double? = null,
    @SerialName("longitude") val longitude: Double? = null,
    @SerialName("is_reachable") val isReachable: Boolean = true
) {
    val network: String
        get() = operator

    val connectorTypes: List<String>
        get() = connectors.map { it.connectorType }
}

@Serializable
data class RouteStop(
    @SerialName("name") val name: String,
    @SerialName("type") val type: StopType,
    @SerialName("distance_from_origin_km") val distanceFromOriginKm: Double,
    @SerialName("arrival_soc") val arrivalSoC: Double,
    @SerialName("departure_soc") val departureSoC: Double,
    @SerialName("charge_duration_minutes") val chargeDurationMinutes: Int = 0,
    @SerialName("energy_added_kwh") val energyAddedKWh: Double = 0.0
)

@Serializable
enum class StopType {
    ORIGIN,
    CHARGER_STOP,
    DESTINATION
}

@Serializable
data class BatteryResult(
    @SerialName("currentSoC") val currentSoC: Double? = null,
    @SerialName("arrivalSoC") val arrivalSoC: Double,
    @SerialName("energyRequiredKWh") val energyRequiredKWh: Double,
    @SerialName("reachable") val reachable: Boolean,
    @SerialName("riskScore") val riskScore: Double = 0.0,
    @SerialName("safetyMarginPercent") val safetyMarginPercent: Double = 0.0
)

@Serializable
data class OptimizerData(
    @SerialName("total_wait_minutes") val totalWaitMinutes: Double = 0.0,
    @SerialName("total_charging_minutes") val totalChargingMinutes: Int = 0,
    @SerialName("final_soc") val finalSoc: Double? = null,
    @SerialName("reason") val reason: String? = null,
    @SerialName("reasons") val reasons: List<String> = emptyList(),
    @SerialName("mode") val mode: String? = null
)

@Serializable
data class TripPlanResult(
    @SerialName("trip_id") val tripId: String? = null,
    @SerialName("origin") val origin: String,
    @SerialName("destination") val destination: String,
    @SerialName("distance_km") val distanceKm: Double,
    @SerialName("duration_minutes") val durationMinutes: Int,
    @SerialName("total_charging_time_minutes") val totalChargingTimeMinutes: Int = 0,
    @SerialName("energy_required_kwh") val energyRequiredKWh: Double,
    @SerialName("arrival_soc") val arrivalSoC: Double,
    @SerialName("is_feasible") val isFeasible: Boolean,
    @SerialName("safety_margin_percent") val safetyMarginPercent: Double,
    @SerialName("risk_score") val riskScore: Double,
    @SerialName("geometry") val geometry: String? = null,
    @SerialName("battery") val battery: BatteryResult? = null,
    @SerialName("stops") val stops: List<RouteStop>,
    @SerialName("optimizer_data") val optimizerData: OptimizerData? = null,
    @SerialName("recommendations") val recommendations: List<String> = emptyList()
) {
    val totalDistanceKm: Double
        get() = distanceKm

    val totalDrivingTimeMinutes: Int
        get() = durationMinutes
}

// ──────────────────────────────────────────────
// Multi-Strategy & Reroute Models (Phase 4)
// ──────────────────────────────────────────────

data class RouteStrategy(
    val id: String,
    val title: String,
    val tag: String,
    val totalTimeMinutes: Int,
    val driveTimeMinutes: Int,
    val chargeTimeMinutes: Int,
    val arrivalSoC: Double,
    val energyKWh: Double,
    val whyExplanation: String,
    val plan: TripPlanResult
)

data class RerouteAlert(
    val id: String,
    val tripId: String,
    val title: String,
    val reason: String,
    val newStationName: String,
    val powerKw: Int,
    val availablePlugs: Int
)
