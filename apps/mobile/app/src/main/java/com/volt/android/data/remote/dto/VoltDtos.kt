package com.volt.android.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ──────────────────────────────────────────────
// Standard VOLT API Gateway Response Envelopes
// ──────────────────────────────────────────────

@Serializable
data class StandardResponse<T>(
    @SerialName("success") val success: Boolean,
    @SerialName("data") val data: T? = null,
    @SerialName("error") val error: ErrorDto? = null,
    @SerialName("meta") val meta: MetaDto? = null
)

@Serializable
data class ErrorDto(
    @SerialName("code") val code: String,
    @SerialName("message") val message: String
)

@Serializable
data class MetaDto(
    @SerialName("requestId") val requestId: String? = null,
    @SerialName("timestamp") val timestamp: String? = null
)

// ──────────────────────────────────────────────
// User & Auth DTOs
// ──────────────────────────────────────────────

@Serializable
data class UserDto(
    @SerialName("id") val id: String,
    @SerialName("email") val email: String? = null,
    @SerialName("name") val name: String? = null,
    @SerialName("phone") val phone: String? = null,
    @SerialName("role") val role: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class UpdateUserRequest(
    @SerialName("name") val name: String? = null,
    @SerialName("phone") val phone: String? = null
)

@Serializable
data class DeviceTokenRequest(
    @SerialName("fcm_token") val fcmToken: String,
    @SerialName("platform") val platform: String = "android"
)

// ──────────────────────────────────────────────
// Vehicle DTOs
// ──────────────────────────────────────────────

@Serializable
data class VehicleDto(
    @SerialName("id") val id: String,
    @SerialName("user_id") val userId: String? = null,
    @SerialName("make") val make: String,
    @SerialName("model") val model: String,
    @SerialName("battery_capacity_kwh") val batteryCapacityKwh: Double,
    @SerialName("usable_capacity_kwh") val usableCapacityKwh: Double = batteryCapacityKwh * 0.95,
    @SerialName("consumption_kwh_per_km") val consumptionKwhPerKm: Double = 0.16,
    @SerialName("battery_health_percent") val batteryHealthPercent: Double = 100.0,
    @SerialName("reserve_soc_percent") val reserveSocPercent: Double = 10.0,
    @SerialName("max_charging_power_kw") val maxChargingPowerKw: Double = 150.0,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class CreateVehicleRequest(
    @SerialName("make") val make: String,
    @SerialName("model") val model: String,
    @SerialName("battery_capacity_kwh") val batteryCapacityKwh: Double,
    @SerialName("usable_capacity_kwh") val usableCapacityKwh: Double? = null,
    @SerialName("consumption_kwh_per_km") val consumptionKwhPerKm: Double? = null,
    @SerialName("battery_health_percent") val batteryHealthPercent: Double? = null,
    @SerialName("reserve_soc_percent") val reserveSocPercent: Double? = null,
    @SerialName("max_charging_power_kw") val maxChargingPowerKw: Double? = null
)

// ──────────────────────────────────────────────
// Charging Station DTOs
// ──────────────────────────────────────────────

@Serializable
data class StationDto(
    @SerialName("id") val id: String,
    @SerialName("name") val name: String,
    @SerialName("operator") val operator: String? = null,
    @SerialName("address") val address: String? = null,
    @SerialName("latitude") val latitude: Double? = null,
    @SerialName("longitude") val longitude: Double? = null,
    @SerialName("distance_meters") val distanceMeters: Double? = null,
    @SerialName("power_kw") val powerKw: Int? = null,
    @SerialName("available_plugs") val availablePlugs: Int? = null,
    @SerialName("total_plugs") val totalPlugs: Int? = null,
    @SerialName("connectors") val connectors: List<ConnectorDto> = emptyList(),
    @SerialName("status") val status: String? = "active"
)

@Serializable
data class ConnectorDto(
    @SerialName("id") val id: String? = null,
    @SerialName("connector_type") val connectorType: String,
    @SerialName("power_kw") val powerKw: Double,
    @SerialName("status") val status: String = "available"
)

@Serializable
data class StationStatusDto(
    @SerialName("station_id") val stationId: String,
    @SerialName("available_connectors") val availableConnectors: Int,
    @SerialName("occupied_connectors") val occupiedConnectors: Int,
    @SerialName("status") val status: String,
    @SerialName("source") val source: String? = null
)

@Serializable
data class StationPredictionDto(
    @SerialName("station_id") val stationId: String,
    @SerialName("predicted_available_plugs") val predictedAvailablePlugs: Int? = null,
    @SerialName("availability_probability") val availabilityProbability: Double? = null,
    @SerialName("predicted_wait_minutes") val predictedWaitMinutes: Double? = null,
    @SerialName("confidence_score") val confidenceScore: Double? = null
)

@Serializable
data class FeedbackRequest(
    @SerialName("rating") val rating: Int,
    @SerialName("available_plugs_observed") val availablePlugsObserved: Int? = null,
    @SerialName("wait_time_minutes_observed") val waitTimeMinutesObserved: Int? = null,
    @SerialName("charger_functional") val chargerFunctional: Boolean = true,
    @SerialName("comment") val comment: String? = null
)

@Serializable
data class FeedbackDto(
    @SerialName("id") val id: String,
    @SerialName("station_id") val stationId: String,
    @SerialName("user_id") val userId: String,
    @SerialName("rating") val rating: Int,
    @SerialName("comment") val comment: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

// ──────────────────────────────────────────────
// Trip Planning & Optimization DTOs
// ──────────────────────────────────────────────

@Serializable
data class TripPlanRequest(
    @SerialName("vehicle_id") val vehicleId: String,
    @SerialName("current_soc") val currentSoc: Double,
    @SerialName("origin_lat") val originLat: Double,
    @SerialName("origin_lng") val originLng: Double,
    @SerialName("dest_lat") val destLat: Double,
    @SerialName("dest_lng") val destLng: Double
)

@Serializable
data class RouteStrategyDto(
    @SerialName("id") val id: String,
    @SerialName("title") val title: String,
    @SerialName("tag") val tag: String = "",
    @SerialName("distance_km") val distanceKm: Double = 0.0,
    @SerialName("duration_minutes") val durationMinutes: Int = 0,
    @SerialName("total_time_minutes") val totalTimeMinutes: Int = 0,
    @SerialName("drive_time_minutes") val driveTimeMinutes: Int = 0,
    @SerialName("charge_time_minutes") val chargeTimeMinutes: Int = 0,
    @SerialName("arrival_soc") val arrivalSoc: Double = 0.0,
    @SerialName("energy_kwh") val energyKwh: Double = 0.0,
    @SerialName("why_explanation") val whyExplanation: String = "",
    @SerialName("battery") val battery: BatteryResultDto? = null,
    @SerialName("optimizer_data") val optimizerData: OptimizerDataDto? = null,
    @SerialName("stops") val stops: List<TripStopDto> = emptyList(),
    @SerialName("geometry") val geometry: String? = null
)

@Serializable
data class TripPlanDto(
    @SerialName("trip_id") val tripId: String? = null,
    @SerialName("distance_km") val distanceKm: Double,
    @SerialName("duration_minutes") val durationMinutes: Int,
    @SerialName("geometry") val geometry: String? = null,
    @SerialName("battery") val battery: BatteryResultDto? = null,
    @SerialName("stops") val stops: List<TripStopDto> = emptyList(),
    @SerialName("optimizer_data") val optimizerData: OptimizerDataDto? = null,
    @SerialName("strategies") val strategies: List<RouteStrategyDto> = emptyList()
)

@Serializable
data class BatteryResultDto(
    @SerialName("currentSoC") val currentSoC: Double? = null,
    @SerialName("arrivalSoC") val arrivalSoC: Double,
    @SerialName("energyRequiredKWh") val energyRequiredKWh: Double,
    @SerialName("reachable") val reachable: Boolean,
    @SerialName("riskScore") val riskScore: Double = 0.0,
    @SerialName("safetyMarginPercent") val safetyMarginPercent: Double = 0.0
)

@Serializable
data class TripStopDto(
    @SerialName("station_id") val stationId: String,
    @SerialName("name") val name: String? = null,
    @SerialName("sequence") val sequence: Int,
    @SerialName("arrival_soc") val arrivalSoc: Double,
    @SerialName("departure_soc") val departureSoc: Double,
    @SerialName("expected_wait_minutes") val expectedWaitMinutes: Double = 0.0,
    @SerialName("charging_minutes") val chargingMinutes: Int = 0,
    @SerialName("energy_added_kwh") val energyAddedKwh: Double = 0.0,
    @SerialName("latitude") val latitude: Double? = null,
    @SerialName("longitude") val longitude: Double? = null,
    @SerialName("power_kw") val powerKw: Double = 0.0
)

@Serializable
data class OptimizerDataDto(
    @SerialName("total_wait_minutes") val totalWaitMinutes: Double = 0.0,
    @SerialName("total_charging_minutes") val totalChargingMinutes: Int = 0,
    @SerialName("final_soc") val finalSoc: Double? = null,
    @SerialName("reason") val reason: String? = null,
    @SerialName("reasons") val reasons: List<String> = emptyList(),
    @SerialName("mode") val mode: String? = null
)

@Serializable
data class UpdateTripStatusRequest(
    @SerialName("status") val status: String
)
