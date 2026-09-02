package com.volt.android.data

import com.volt.android.data.models.BatteryResult
import com.volt.android.data.models.BatteryTelemetry
import com.volt.android.data.models.ChargingStation
import com.volt.android.data.models.Connector
import com.volt.android.data.models.OptimizerData
import com.volt.android.data.models.RerouteAlert
import com.volt.android.data.models.RouteStop
import com.volt.android.data.models.RouteStrategy
import com.volt.android.data.models.StopType
import com.volt.android.data.models.TripPlanResult
import com.volt.android.data.models.VehicleProfile
import com.volt.android.data.remote.ApiClient
import com.volt.android.data.remote.dto.FeedbackRequest
import com.volt.android.data.remote.dto.TripPlanRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.withContext
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

class VoltRepository {

    val sampleVehicles = listOf(
        VehicleProfile(
            id = "v1",
            make = "Tesla",
            model = "Model 3",
            trim = "Long Range AWD",
            batteryCapacityKWh = 75.0,
            usableCapacityKWh = 72.0,
            consumptionKWhPerKm = 0.150,
            maxChargingPowerKw = 250.0,
            currentSoC = 78.0,
            batteryHealthPercent = 97.4,
            reserveSocPercent = 10.0
        ),
        VehicleProfile(
            id = "v2",
            make = "Hyundai",
            model = "Ioniq 5",
            trim = "Long Range RWD",
            batteryCapacityKWh = 77.4,
            usableCapacityKWh = 74.0,
            consumptionKWhPerKm = 0.168,
            maxChargingPowerKw = 230.0,
            currentSoC = 64.0,
            batteryHealthPercent = 98.2,
            reserveSocPercent = 10.0
        ),
        VehicleProfile(
            id = "v3",
            make = "Porsche",
            model = "Taycan",
            trim = "Performance Plus 4S",
            batteryCapacityKWh = 93.4,
            usableCapacityKWh = 88.0,
            consumptionKWhPerKm = 0.210,
            maxChargingPowerKw = 270.0,
            currentSoC = 85.0,
            batteryHealthPercent = 96.1,
            reserveSocPercent = 12.0
        ),
        VehicleProfile(
            id = "v4",
            make = "Tata",
            model = "Nexon EV",
            trim = "Empowered+ Long Range",
            batteryCapacityKWh = 40.5,
            usableCapacityKWh = 38.0,
            consumptionKWhPerKm = 0.135,
            maxChargingPowerKw = 50.0,
            currentSoC = 52.0,
            batteryHealthPercent = 99.0,
            reserveSocPercent = 10.0
        )
    )

    private val _vehicles = MutableStateFlow(sampleVehicles)
    val vehicles: StateFlow<List<VehicleProfile>> = _vehicles.asStateFlow()

    private val _selectedVehicle = MutableStateFlow(sampleVehicles[0])
    val selectedVehicle: StateFlow<VehicleProfile> = _selectedVehicle.asStateFlow()

    private val _telemetry = MutableStateFlow(createInitialTelemetry(sampleVehicles[0]))
    val telemetry: StateFlow<BatteryTelemetry> = _telemetry.asStateFlow()

    private val _stations = MutableStateFlow(sampleStations)
    val stations: StateFlow<List<ChargingStation>> = _stations.asStateFlow()

    private val _activeTripPlan = MutableStateFlow(createDefaultTripPlan(sampleVehicles[0]))
    val activeTripPlan: StateFlow<TripPlanResult> = _activeTripPlan.asStateFlow()

    private val _routeStrategies = MutableStateFlow<List<RouteStrategy>>(
        generateRouteStrategies(createDefaultTripPlan(sampleVehicles[0]), sampleVehicles[0])
    )
    val routeStrategies: StateFlow<List<RouteStrategy>> = _routeStrategies.asStateFlow()

    private val _selectedStrategyId = MutableStateFlow("RECOMMENDED")
    val selectedStrategyId: StateFlow<String> = _selectedStrategyId.asStateFlow()

    private val _rerouteAlert = MutableStateFlow<RerouteAlert?>(null)
    val rerouteAlert: StateFlow<RerouteAlert?> = _rerouteAlert.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _networkError = MutableStateFlow<String?>(null)
    val networkError: StateFlow<String?> = _networkError.asStateFlow()

    // ──────────────────────────────────────────────
    // 1. Live Trip Planning (POST /trips)
    // ──────────────────────────────────────────────
    suspend fun planTrip(
        origin: String,
        destination: String,
        distanceKm: Double,
        originLat: Double = 37.7749,
        originLng: Double = -122.4194,
        destLat: Double = 39.0968,
        destLng: Double = -120.0324
    ) {
        _isLoading.value = true
        _networkError.value = null

        withContext(Dispatchers.IO) {
            try {
                val currentVehicle = _selectedVehicle.value
                val currentSoc = _telemetry.value.socPercent

                val request = TripPlanRequest(
                    vehicleId = currentVehicle.id,
                    currentSoc = currentSoc,
                    originLat = originLat,
                    originLng = originLng,
                    destLat = destLat,
                    destLng = destLng
                )

                val response = ApiClient.apiService.planTrip(request)
                if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                    val dto = response.body()!!.data!!
                    
                    val batteryResult = dto.battery?.let {
                        BatteryResult(
                            currentSoC = it.currentSoC,
                            arrivalSoC = it.arrivalSoC,
                            energyRequiredKWh = it.energyRequiredKWh,
                            reachable = it.reachable,
                            riskScore = it.riskScore,
                            safetyMarginPercent = it.safetyMarginPercent
                        )
                    }

                    val optimizerData = dto.optimizerData?.let {
                        OptimizerData(
                            totalWaitMinutes = it.totalWaitMinutes,
                            totalChargingMinutes = it.totalChargingMinutes,
                            finalSoc = it.finalSoc
                        )
                    }

                    val stops = dto.stops.map { stopDto ->
                        RouteStop(
                            name = stopDto.name ?: "Charging Stop ${stopDto.sequence}",
                            type = if (stopDto.sequence == 0) StopType.ORIGIN else StopType.CHARGER_STOP,
                            distanceFromOriginKm = 0.0,
                            arrivalSoC = stopDto.arrivalSoc,
                            departureSoC = stopDto.departureSoc,
                            chargeDurationMinutes = stopDto.chargingMinutes,
                            energyAddedKWh = stopDto.energyAddedKwh
                        )
                    }

                    val livePlan = TripPlanResult(
                        tripId = dto.tripId,
                        origin = origin,
                        destination = destination,
                        distanceKm = dto.distanceKm,
                        durationMinutes = dto.durationMinutes,
                        totalChargingTimeMinutes = dto.optimizerData?.totalChargingMinutes ?: 0,
                        energyRequiredKWh = dto.battery?.energyRequiredKWh ?: ((dto.distanceKm * currentVehicle.baseConsumptionWhKm) / 1000.0),
                        arrivalSoC = dto.battery?.arrivalSoC ?: 20.0,
                        isFeasible = dto.battery?.reachable ?: true,
                        safetyMarginPercent = dto.battery?.safetyMarginPercent ?: 10.0,
                        riskScore = dto.battery?.riskScore ?: 0.1,
                        geometry = dto.geometry,
                        battery = batteryResult,
                        stops = if (stops.isNotEmpty()) stops else calculateTrip(origin, destination, distanceKm, currentVehicle).stops,
                        optimizerData = optimizerData,
                        recommendations = listOf(
                            "Route optimized with live battery reachability & station predictions.",
                            "Live OSRM corridor route verified."
                        )
                    )
                    _activeTripPlan.value = livePlan
                    _routeStrategies.value = generateRouteStrategies(livePlan, currentVehicle)
                } else {
                    val fallbackPlan = calculateTrip(origin, destination, distanceKm, currentVehicle)
                    _activeTripPlan.value = fallbackPlan
                    _routeStrategies.value = generateRouteStrategies(fallbackPlan, currentVehicle)
                }
            } catch (e: Exception) {
                _networkError.value = e.message
                val fallbackPlan = calculateTrip(origin, destination, distanceKm, _selectedVehicle.value)
                _activeTripPlan.value = fallbackPlan
                _routeStrategies.value = generateRouteStrategies(fallbackPlan, _selectedVehicle.value)
            } finally {
                _isLoading.value = false
            }
        }
    }

    // ──────────────────────────────────────────────
    // 2. Generate Explainable Route Strategies
    // ──────────────────────────────────────────────
    fun generateRouteStrategies(plan: TripPlanResult, vehicle: VehicleProfile): List<RouteStrategy> {
        val totalDriveTime = plan.durationMinutes
        val totalChargeTime = plan.totalChargingTimeMinutes
        val baseEnergy = plan.energyRequiredKWh

        // 1. Recommended (Balanced)
        val recommended = RouteStrategy(
            id = "RECOMMENDED",
            title = "Recommended (Balanced)",
            tag = "⚡ AI OPTIMIZED",
            totalTimeMinutes = totalDriveTime + totalChargeTime,
            driveTimeMinutes = totalDriveTime,
            chargeTimeMinutes = totalChargeTime,
            arrivalSoC = plan.arrivalSoC,
            energyKWh = baseEnergy,
            whyExplanation = "Minimum total travel time with a safe ${(plan.safetyMarginPercent).toInt()}% reserve buffer above the 10% safety margin.",
            plan = plan
        )

        // 2. Fastest Journey (Aggressive Charging Curve)
        val fastChargeTime = (totalChargeTime * 0.75).roundToInt().coerceAtLeast(0)
        val fastestArrivalSoC = max(10.0, plan.arrivalSoC - 6.0)
        val fastest = RouteStrategy(
            id = "FASTEST",
            title = "Fastest Journey",
            tag = "⏱️ MIN TIME",
            totalTimeMinutes = totalDriveTime + fastChargeTime,
            driveTimeMinutes = totalDriveTime,
            chargeTimeMinutes = fastChargeTime,
            arrivalSoC = (fastestArrivalSoC * 10.0).roundToInt() / 10.0,
            energyKWh = baseEnergy,
            whyExplanation = "Charges up to 70% SoC at 250kW+ HyperCharge stations to exploit the fastest segment of the vehicle charging curve.",
            plan = plan.copy(
                totalChargingTimeMinutes = fastChargeTime,
                arrivalSoC = fastestArrivalSoC,
                recommendations = listOf(
                    "Charges at peak 250kW power band.",
                    "Unplugs at 70% to avoid slow charging taper segment."
                )
            )
        )

        // 3. Max Battery Safety & Longevity
        val safeChargeTime = (totalChargeTime * 1.25).roundToInt().coerceAtLeast(if (totalChargeTime > 0) 15 else 0)
        val safeArrivalSoC = min(40.0, plan.arrivalSoC + 10.0)
        val safe = RouteStrategy(
            id = "MAX_EFFICIENCY",
            title = "Battery Longevity & Buffer",
            tag = "🔋 MAX BUFFER",
            totalTimeMinutes = totalDriveTime + safeChargeTime,
            driveTimeMinutes = totalDriveTime,
            chargeTimeMinutes = safeChargeTime,
            arrivalSoC = (safeArrivalSoC * 10.0).roundToInt() / 10.0,
            energyKWh = (baseEnergy * 0.95 * 10.0).roundToInt() / 10.0,
            whyExplanation = "Protects battery health by keeping cell temperatures stable and arriving with a generous ${(safeArrivalSoC - 10.0).toInt()}% safety margin.",
            plan = plan.copy(
                totalChargingTimeMinutes = safeChargeTime,
                arrivalSoC = safeArrivalSoC,
                recommendations = listOf(
                    "High-reliability charging network selected.",
                    "Avoids deep discharges to preserve pack chemistry."
                )
            )
        )

        return listOf(recommended, fastest, safe)
    }

    fun selectStrategy(strategyId: String) {
        _selectedStrategyId.value = strategyId
        val selected = _routeStrategies.value.find { it.id == strategyId }
        if (selected != null) {
            _activeTripPlan.value = selected.plan
        }
    }

    // ──────────────────────────────────────────────
    // 3. Live Reroute Trigger (POST /trips/:id/reroute)
    // ──────────────────────────────────────────────
    suspend fun rerouteTrip(tripId: String) {
        _isLoading.value = true
        withContext(Dispatchers.IO) {
            try {
                val response = ApiClient.apiService.rerouteTrip(tripId)
                if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                    val dto = response.body()!!.data!!
                    val updatedPlan = _activeTripPlan.value.copy(
                        distanceKm = dto.distanceKm,
                        durationMinutes = dto.durationMinutes,
                        totalChargingTimeMinutes = dto.optimizerData?.totalChargingMinutes ?: _activeTripPlan.value.totalChargingTimeMinutes,
                        arrivalSoC = dto.battery?.arrivalSoC ?: _activeTripPlan.value.arrivalSoC,
                        recommendations = listOf("Reroute successfully applied. Navigating to updated charging stop.")
                    )
                    _activeTripPlan.value = updatedPlan
                    _routeStrategies.value = generateRouteStrategies(updatedPlan, _selectedVehicle.value)
                }
            } catch (e: Exception) {
                _networkError.value = e.message
            } finally {
                _rerouteAlert.value = null
                _isLoading.value = false
            }
        }
    }

    fun simulateRerouteAlert(
        title: String = "Congestion Ahead",
        reason: String = "High stall occupancy reported at Station A — Rerouting to 350kW HyperCharge with 6 open stalls.",
        newStationName: String = "VOLT HyperCharge Gateway",
        powerKw: Int = 350,
        availablePlugs: Int = 6
    ) {
        _rerouteAlert.value = RerouteAlert(
            id = "alert-1",
            tripId = _activeTripPlan.value.tripId ?: "sim-trip-1",
            title = title,
            reason = reason,
            newStationName = newStationName,
            powerKw = powerKw,
            availablePlugs = availablePlugs
        )
    }

    fun dismissRerouteAlert() {
        _rerouteAlert.value = null
    }

    // ──────────────────────────────────────────────
    // 4. Live Stations Query (GET /stations)
    // ──────────────────────────────────────────────
    suspend fun loadStations(
        lat: Double = 37.7749,
        lng: Double = -122.4194,
        radiusKm: Double = 25.0
    ) {
        _isLoading.value = true
        withContext(Dispatchers.IO) {
            try {
                val response = ApiClient.apiService.searchStations(lat, lng, radiusKm)
                if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                    val dtos = response.body()!!.data!!
                    if (dtos.isNotEmpty()) {
                        val liveStations = dtos.map { dto ->
                            val connectors = dto.connectors.map { c ->
                                Connector(
                                    id = c.id,
                                    connectorType = c.connectorType,
                                    powerKw = c.powerKw,
                                    status = c.status
                                )
                            }
                            ChargingStation(
                                id = dto.id,
                                name = dto.name,
                                operator = dto.operator ?: "Open Network",
                                address = dto.address ?: "Nearby",
                                powerKw = (connectors.maxOfOrNull { it.powerKw } ?: 150.0).toInt(),
                                isFastCharger = (connectors.maxOfOrNull { it.powerKw } ?: 0.0) >= 100.0,
                                connectors = connectors,
                                availablePlugs = connectors.count { it.status == "available" },
                                totalPlugs = connectors.size.coerceAtLeast(1),
                                pricePerKWh = 0.35,
                                distanceKm = ((dto.distanceMeters ?: 2000.0) / 1000.0 * 10.0).roundToInt() / 10.0,
                                latitude = dto.latitude,
                                longitude = dto.longitude,
                                isReachable = true
                            )
                        }
                        _stations.value = liveStations
                    }
                }
            } catch (e: Exception) {
                _networkError.value = e.message
            } finally {
                _isLoading.value = false
            }
        }
    }

    // ──────────────────────────────────────────────
    // 5. Live Vehicles Query (GET /vehicles)
    // ──────────────────────────────────────────────
    suspend fun loadVehicles() {
        withContext(Dispatchers.IO) {
            try {
                val response = ApiClient.apiService.getVehicles()
                if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                    val dtos = response.body()!!.data!!
                    if (dtos.isNotEmpty()) {
                        val liveVehicles = dtos.map { dto ->
                            VehicleProfile(
                                id = dto.id,
                                userId = dto.userId,
                                make = dto.make,
                                model = dto.model,
                                trim = "${dto.make} Performance",
                                batteryCapacityKWh = dto.batteryCapacityKwh,
                                usableCapacityKWh = dto.usableCapacityKwh,
                                consumptionKWhPerKm = dto.consumptionKwhPerKm,
                                maxChargingPowerKw = dto.maxChargingPowerKw,
                                batteryHealthPercent = dto.batteryHealthPercent,
                                reserveSocPercent = dto.reserveSocPercent,
                                currentSoC = 80.0
                            )
                        }
                        _vehicles.value = liveVehicles
                        _selectedVehicle.value = liveVehicles[0]
                        _telemetry.value = createInitialTelemetry(liveVehicles[0])
                    }
                }
            } catch (e: Exception) {
                _networkError.value = e.message
            }
        }
    }

    // ──────────────────────────────────────────────
    // 6. Submit Feedback (POST /stations/:id/feedback)
    // ──────────────────────────────────────────────
    suspend fun submitFeedback(
        stationId: String,
        rating: Int,
        plugsObserved: Int? = null,
        waitTimeMinutes: Int? = null,
        functional: Boolean = true,
        comment: String? = null
    ): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val req = FeedbackRequest(
                    rating = rating,
                    availablePlugsObserved = plugsObserved,
                    waitTimeMinutesObserved = waitTimeMinutes,
                    chargerFunctional = functional,
                    comment = comment
                )
                val response = ApiClient.apiService.submitFeedback(stationId, req)
                response.isSuccessful && response.body()?.success == true
            } catch (e: Exception) {
                false
            }
        }
    }

    fun selectVehicle(vehicle: VehicleProfile) {
        _selectedVehicle.value = vehicle
        _telemetry.value = createInitialTelemetry(vehicle)
        val newPlan = calculateTrip(
            _activeTripPlan.value.origin,
            _activeTripPlan.value.destination,
            _activeTripPlan.value.distanceKm,
            vehicle
        )
        _activeTripPlan.value = newPlan
        _routeStrategies.value = generateRouteStrategies(newPlan, vehicle)
    }

    fun togglePreconditioning() {
        _telemetry.update { current ->
            current.copy(isPreconditioning = !current.isPreconditioning)
        }
    }

    fun toggleRangeMode() {
        _telemetry.update { current ->
            val nextRangeMode = !current.isRangeMode
            val consumptionFactor = if (nextRangeMode) 0.88 else 1.0
            val effectiveConsumption = _selectedVehicle.value.baseConsumptionWhKm * consumptionFactor
            val usableEnergy = (current.socPercent / 100.0) * current.totalCapacityKWh
            val newRange = (usableEnergy * 1000.0) / effectiveConsumption
            current.copy(
                isRangeMode = nextRangeMode,
                estimatedRangeKm = (newRange * 10.0).roundToInt() / 10.0,
                drainRateWhKm = effectiveConsumption
            )
        }
    }

    fun simulateDrive(distanceKm: Double, speedKmH: Double = 80.0, tempCelsius: Double = 22.0) {
        val vehicle = _selectedVehicle.value
        val speedFactor = 1.0 + max(0.0, (speedKmH - 80.0) * 0.007)
        val tempFactor = if (tempCelsius < 10.0) 1.25 else if (tempCelsius > 35.0) 1.15 else 1.0
        val effectiveWhKm = vehicle.baseConsumptionWhKm * speedFactor * tempFactor * (if (_telemetry.value.isRangeMode) 0.9 else 1.0)
        
        val energyConsumedKWh = (distanceKm * effectiveWhKm) / 1000.0
        
        _telemetry.update { current ->
            val newEnergy = max(0.0, current.currentEnergyKWh - energyConsumedKWh)
            val newSoC = (newEnergy / current.totalCapacityKWh) * 100.0
            val remainingRange = (newEnergy * 1000.0) / effectiveWhKm
            
            current.copy(
                socPercent = (newSoC * 10.0).roundToInt() / 10.0,
                currentEnergyKWh = (newEnergy * 10.0).roundToInt() / 10.0,
                estimatedRangeKm = (remainingRange * 10.0).roundToInt() / 10.0,
                drainRateWhKm = (effectiveWhKm * 10.0).roundToInt() / 10.0,
                currentPowerKw = ((speedKmH * effectiveWhKm) / 1000.0 * 10.0).roundToInt() / 10.0,
                isCharging = false
            )
        }
    }

    fun simulateCharge(durationMinutes: Int, chargerPowerKw: Double = 150.0) {
        val vehicle = _selectedVehicle.value
        val effectivePowerKw = min(chargerPowerKw, vehicle.maxChargingPowerKw)
        val grossEnergyKWh = (effectivePowerKw * (durationMinutes / 60.0)) * 0.92
        
        _telemetry.update { current ->
            val newEnergy = min(current.totalCapacityKWh, current.currentEnergyKWh + grossEnergyKWh)
            val newSoC = min(100.0, (newEnergy / current.totalCapacityKWh) * 100.0)
            val remainingRange = (newEnergy * 1000.0) / current.drainRateWhKm
            
            current.copy(
                socPercent = (newSoC * 10.0).roundToInt() / 10.0,
                currentEnergyKWh = (newEnergy * 10.0).roundToInt() / 10.0,
                estimatedRangeKm = (remainingRange * 10.0).roundToInt() / 10.0,
                isCharging = true,
                currentPowerKw = effectivePowerKw
            )
        }
    }

    fun calculateTrip(
        origin: String,
        destination: String,
        distanceKm: Double,
        vehicle: VehicleProfile = _selectedVehicle.value
    ): TripPlanResult {
        val consumptionRate = vehicle.baseConsumptionWhKm * (if (_telemetry.value.isRangeMode) 0.9 else 1.0)
        val totalEnergyRequiredKWh = (distanceKm * consumptionRate) / 1000.0
        val currentSoC = _telemetry.value.socPercent
        val startingEnergyKWh = (currentSoC / 100.0) * vehicle.batteryCapacityKWh
        
        val drivingTimeMins = ((distanceKm / 85.0) * 60.0).roundToInt()
        
        val isDirectReachable = startingEnergyKWh >= (totalEnergyRequiredKWh + (vehicle.batteryCapacityKWh * (vehicle.reserveSocPercent / 100.0)))
        
        if (isDirectReachable) {
            val remainingEnergy = startingEnergyKWh - totalEnergyRequiredKWh
            val arrivalSoC = (remainingEnergy / vehicle.batteryCapacityKWh) * 100.0
            val safetyMargin = arrivalSoC - vehicle.reserveSocPercent
            val riskScore = max(0.05, min(1.0, 1.0 - (arrivalSoC / 100.0)))
            
            val stops = listOf(
                RouteStop(origin, StopType.ORIGIN, 0.0, currentSoC, currentSoC),
                RouteStop(destination, StopType.DESTINATION, distanceKm, arrivalSoC, arrivalSoC)
            )
            
            val recommendations = mutableListOf<String>().apply {
                add("Direct route feasible without intermediate charging stops.")
                if (arrivalSoC < 20.0) add("Arrival battery is under 20%. Consider destination charging upon arrival.")
                else add("Safe arrival buffer of ${(safetyMargin).roundToInt()}% above reserve threshold.")
            }
            
            val batteryResult = BatteryResult(
                currentSoC = currentSoC,
                arrivalSoC = (arrivalSoC * 10.0).roundToInt() / 10.0,
                energyRequiredKWh = (totalEnergyRequiredKWh * 10.0).roundToInt() / 10.0,
                reachable = true,
                riskScore = (riskScore * 100.0).roundToInt() / 100.0,
                safetyMarginPercent = (safetyMargin * 10.0).roundToInt() / 10.0
            )

            val optimizerData = OptimizerData(
                totalWaitMinutes = 0.0,
                totalChargingMinutes = 0,
                finalSoc = (arrivalSoC * 10.0).roundToInt() / 10.0
            )

            return TripPlanResult(
                tripId = "sim-trip-1",
                origin = origin,
                destination = destination,
                distanceKm = distanceKm,
                durationMinutes = drivingTimeMins,
                totalChargingTimeMinutes = 0,
                energyRequiredKWh = (totalEnergyRequiredKWh * 10.0).roundToInt() / 10.0,
                arrivalSoC = (arrivalSoC * 10.0).roundToInt() / 10.0,
                isFeasible = true,
                safetyMarginPercent = (safetyMargin * 10.0).roundToInt() / 10.0,
                riskScore = (riskScore * 100.0).roundToInt() / 100.0,
                geometry = null,
                battery = batteryResult,
                stops = stops,
                optimizerData = optimizerData,
                recommendations = recommendations
            )
        } else {
            val stopDistanceKm = distanceKm * 0.55
            val leg1Energy = (stopDistanceKm * consumptionRate) / 1000.0
            val chargerArrivalSoC = max(8.0, ((startingEnergyKWh - leg1Energy) / vehicle.batteryCapacityKWh) * 100.0)
            
            val targetSoC = 80.0
            val energyToAddKWh = ((targetSoC - chargerArrivalSoC) / 100.0) * vehicle.batteryCapacityKWh
            val chargingTimeMins = ((energyToAddKWh / min(150.0, vehicle.maxChargingPowerKw)) * 60.0 * 1.15).roundToInt()
            
            val leg2DistanceKm = distanceKm - stopDistanceKm
            val leg2Energy = (leg2DistanceKm * consumptionRate) / 1000.0
            val leg2StartingEnergy = (targetSoC / 100.0) * vehicle.batteryCapacityKWh
            val arrivalSoC = ((leg2StartingEnergy - leg2Energy) / vehicle.batteryCapacityKWh) * 100.0
            
            val stops = listOf(
                RouteStop(origin, StopType.ORIGIN, 0.0, currentSoC, currentSoC),
                RouteStop(
                    name = "VOLT SuperHub — Fast DC 250kW",
                    type = StopType.CHARGER_STOP,
                    distanceFromOriginKm = stopDistanceKm,
                    arrivalSoC = (chargerArrivalSoC * 10.0).roundToInt() / 10.0,
                    departureSoC = targetSoC,
                    chargeDurationMinutes = chargingTimeMins,
                    energyAddedKWh = (energyToAddKWh * 10.0).roundToInt() / 10.0
                ),
                RouteStop(destination, StopType.DESTINATION, distanceKm, (arrivalSoC * 10.0).roundToInt() / 10.0, (arrivalSoC * 10.0).roundToInt() / 10.0)
            )
            
            val recommendations = listOf(
                "Route optimized with 1 high-speed DC charging stop ($chargingTimeMins min).",
                "Charges vehicle to 80% to maintain fastest charging curve segment.",
                "Arrival battery at destination estimated at ${(arrivalSoC).roundToInt()}%."
            )

            val batteryResult = BatteryResult(
                currentSoC = currentSoC,
                arrivalSoC = (arrivalSoC * 10.0).roundToInt() / 10.0,
                energyRequiredKWh = (totalEnergyRequiredKWh * 10.0).roundToInt() / 10.0,
                reachable = true,
                riskScore = 0.22,
                safetyMarginPercent = ((arrivalSoC - vehicle.reserveSocPercent) * 10.0).roundToInt() / 10.0
            )

            val optimizerData = OptimizerData(
                totalWaitMinutes = 0.0,
                totalChargingMinutes = chargingTimeMins,
                finalSoc = (arrivalSoC * 10.0).roundToInt() / 10.0
            )
            
            return TripPlanResult(
                tripId = "sim-trip-2",
                origin = origin,
                destination = destination,
                distanceKm = distanceKm,
                durationMinutes = drivingTimeMins,
                totalChargingTimeMinutes = chargingTimeMins,
                energyRequiredKWh = (totalEnergyRequiredKWh * 10.0).roundToInt() / 10.0,
                arrivalSoC = (arrivalSoC * 10.0).roundToInt() / 10.0,
                isFeasible = true,
                safetyMarginPercent = ((arrivalSoC - vehicle.reserveSocPercent) * 10.0).roundToInt() / 10.0,
                riskScore = 0.22,
                geometry = null,
                battery = batteryResult,
                stops = stops,
                optimizerData = optimizerData,
                recommendations = recommendations
            )
        }
    }

    private fun createInitialTelemetry(vehicle: VehicleProfile): BatteryTelemetry {
        val currentEnergy = (vehicle.currentSoC / 100.0) * vehicle.batteryCapacityKWh
        val range = (currentEnergy * 1000.0) / vehicle.baseConsumptionWhKm
        return BatteryTelemetry(
            socPercent = vehicle.currentSoC,
            currentEnergyKWh = (currentEnergy * 10.0).roundToInt() / 10.0,
            totalCapacityKWh = vehicle.batteryCapacityKWh,
            estimatedRangeKm = (range * 10.0).roundToInt() / 10.0,
            batteryHealthPercent = vehicle.batteryHealthPercent,
            voltage = 396.4,
            temperatureCelsius = 25.8,
            currentPowerKw = 0.0,
            drainRateWhKm = vehicle.baseConsumptionWhKm,
            isCharging = false,
            isPreconditioning = false,
            isRangeMode = false
        )
    }

    private fun createDefaultTripPlan(vehicle: VehicleProfile): TripPlanResult {
        return calculateTrip("San Francisco, CA", "Lake Tahoe, NV", 315.0, vehicle)
    }

    companion object {
        val sampleStations = listOf(
            ChargingStation(
                id = "st-1",
                name = "VOLT HyperCharge Gateway",
                operator = "VOLT Grid",
                address = "1040 Innovation Pkwy",
                powerKw = 350,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 350.0),
                    Connector(connectorType = "NACS", powerKw = 350.0)
                ),
                availablePlugs = 6,
                totalPlugs = 8,
                pricePerKWh = 0.38,
                distanceKm = 2.4,
                latitude = 37.7749,
                longitude = -122.4194,
                isReachable = true
            ),
            ChargingStation(
                id = "st-2",
                name = "Electrify Station Express",
                operator = "Electrify America",
                address = "450 Metro Boulevard",
                powerKw = 150,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 150.0),
                    Connector(connectorType = "CHAdeMO", powerKw = 50.0)
                ),
                availablePlugs = 2,
                totalPlugs = 4,
                pricePerKWh = 0.42,
                distanceKm = 5.8,
                latitude = 37.8044,
                longitude = -122.2711,
                isReachable = true
            ),
            ChargingStation(
                id = "st-3",
                name = "Tesla Supercharger Hub",
                operator = "Tesla Open Network",
                address = "780 Silicon Expressway",
                powerKw = 250,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "NACS", powerKw = 250.0),
                    Connector(connectorType = "CCS2", powerKw = 250.0)
                ),
                availablePlugs = 12,
                totalPlugs = 16,
                pricePerKWh = 0.35,
                distanceKm = 8.1,
                latitude = 37.4419,
                longitude = -122.1430,
                isReachable = true
            ),
            ChargingStation(
                id = "st-4",
                name = "GreenPower Urban AC Hub",
                operator = "ChargePoint",
                address = "22 Marketplace Center",
                powerKw = 22,
                isFastCharger = false,
                connectors = listOf(
                    Connector(connectorType = "Type 2", powerKw = 22.0)
                ),
                availablePlugs = 4,
                totalPlugs = 4,
                pricePerKWh = 0.24,
                distanceKm = 1.1,
                latitude = 37.7833,
                longitude = -122.4167,
                isReachable = true
            )
        )
    }
}
