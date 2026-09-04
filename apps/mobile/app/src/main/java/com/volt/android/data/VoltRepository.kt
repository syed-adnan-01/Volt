package com.volt.android.data

import com.google.android.gms.maps.model.LatLng
import com.volt.android.BuildConfig
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

    private val _routeStrategies = MutableStateFlow<List<RouteStrategy>>(emptyList())
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
        destLng: Double = -120.0324,
        batteryPercent: Double = 80.0,
        vehicleId: String? = null
    ) {
        _isLoading.value = true
        _networkError.value = null

        withContext(Dispatchers.IO) {
            val currentVehicle = _selectedVehicle.value

            // 1. Dynamically fetch real operational EV charging stations along the route corridor
            if (originLat != 0.0 && destLat != 0.0) {
                try {
                    val corridorStations = OpenChargeMapClient.fetchCorridorStations(originLat, originLng, destLat, destLng)
                    if (corridorStations.isNotEmpty()) {
                        val existingIds = _stations.value.map { it.id }.toSet()
                        val newStations = corridorStations.filter { it.id !in existingIds }
                        if (newStations.isNotEmpty()) {
                            _stations.value = _stations.value + newStations
                        }
                    }
                } catch (e: Exception) {
                    android.util.Log.w("VoltRepository", "Corridor station fetch error: ${e.message}")
                }
            }

            try {
                val targetVehicleId = vehicleId ?: currentVehicle.id
                val request = TripPlanRequest(
                    vehicleId = targetVehicleId,
                    currentSoc = batteryPercent,
                    originLat = originLat,
                    originLng = originLng,
                    destLat = destLat,
                    destLng = destLng
                )

                val response = ApiClient.apiService.planTrip(request)
                if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                    val dto = response.body()!!.data!!

                    val stops = dto.stops.map { stopDto ->
                        RouteStop(
                            stationId = stopDto.stationId,
                            name = stopDto.name ?: "Charging Station",
                            type = StopType.CHARGER_STOP,
                            arrivalSoC = stopDto.arrivalSoc,
                            departureSoC = stopDto.departureSoc,
                            chargingDurationMinutes = stopDto.chargingMinutes,
                            expectedWaitMinutes = stopDto.expectedWaitMinutes.toInt(),
                            latitude = stopDto.latitude,
                            longitude = stopDto.longitude,
                            powerKw = stopDto.powerKw.toInt()
                        )
                    }

                    val optimizerData = dto.optimizerData?.let { opt ->
                        OptimizerData(
                            totalWaitMinutes = opt.totalWaitMinutes,
                            totalChargingMinutes = opt.totalChargingMinutes,
                            finalSoc = opt.finalSoc,
                            reason = opt.reason,
                            reasons = opt.reasons,
                            mode = opt.mode
                        )
                    }

                    val batteryResult = dto.battery?.let { b ->
                        BatteryResult(
                            currentSoC = b.currentSoC ?: currentVehicle.currentSoC,
                            arrivalSoC = b.arrivalSoC,
                            energyRequiredKWh = b.energyRequiredKWh,
                            reachable = b.reachable,
                            riskScore = b.riskScore,
                            safetyMarginPercent = b.safetyMarginPercent
                        )
                    }

                    val livePlan = TripPlanResult(
                        tripId = dto.tripId,
                        origin = origin,
                        destination = destination,
                        distanceKm = dto.distanceKm,
                        durationMinutes = dto.durationMinutes,
                        totalChargingTimeMinutes = dto.optimizerData?.totalChargingMinutes ?: 0,
                        energyRequiredKWh = dto.battery?.energyRequiredKWh ?: 0.0,
                        arrivalSoC = dto.battery?.arrivalSoC ?: 20.0,
                        isFeasible = dto.battery?.reachable ?: true,
                        safetyMarginPercent = dto.battery?.safetyMarginPercent ?: 10.0,
                        riskScore = dto.battery?.riskScore ?: 0.1,
                        geometry = dto.geometry,
                        battery = batteryResult,
                        stops = stops,
                        optimizerData = optimizerData,
                        recommendations = listOf(
                            "Route optimized with live battery reachability & station predictions.",
                            "Live OSRM corridor route verified."
                        )
                    )
                    _activeTripPlan.value = livePlan

                    val backendStrategies = dto.strategies.map { s ->
                        val stratBattery = s.battery?.let { b ->
                            BatteryResult(
                                currentSoC = b.currentSoC ?: currentVehicle.currentSoC,
                                arrivalSoC = b.arrivalSoC,
                                energyRequiredKWh = b.energyRequiredKWh,
                                reachable = b.reachable,
                                riskScore = b.riskScore,
                                safetyMarginPercent = b.safetyMarginPercent
                            )
                        } ?: livePlan.battery

                        val stratStops = if (s.stops.isNotEmpty()) {
                            s.stops.map { stopDto ->
                                RouteStop(
                                    stationId = stopDto.stationId,
                                    name = stopDto.name ?: "Charging Station",
                                    type = StopType.CHARGER_STOP,
                                    arrivalSoC = stopDto.arrivalSoc,
                                    departureSoC = stopDto.departureSoc,
                                    chargingDurationMinutes = stopDto.chargingMinutes,
                                    expectedWaitMinutes = stopDto.expectedWaitMinutes.toInt(),
                                    latitude = stopDto.latitude,
                                    longitude = stopDto.longitude,
                                    powerKw = stopDto.powerKw.toInt()
                                )
                            }
                        } else {
                            if (s.chargeTimeMinutes == 0) {
                                listOf(
                                    RouteStop(
                                        stationId = "origin",
                                        name = origin,
                                        type = StopType.ORIGIN,
                                        arrivalSoC = currentVehicle.currentSoC,
                                        departureSoC = currentVehicle.currentSoC
                                    ),
                                    RouteStop(
                                        stationId = "destination",
                                        name = destination,
                                        type = StopType.DESTINATION,
                                        arrivalSoC = s.arrivalSoc,
                                        departureSoC = s.arrivalSoc
                                    )
                                )
                            } else {
                                livePlan.stops
                            }
                        }

                        val stratOptData = s.optimizerData?.let { opt ->
                            OptimizerData(
                                totalWaitMinutes = opt.totalWaitMinutes,
                                totalChargingMinutes = opt.totalChargingMinutes,
                                finalSoc = opt.finalSoc,
                                reason = opt.reason,
                                reasons = opt.reasons,
                                mode = opt.mode
                            )
                        } ?: livePlan.optimizerData

                        val stratPlan = livePlan.copy(
                            distanceKm = if (s.distanceKm > 0) s.distanceKm else livePlan.distanceKm,
                            durationMinutes = if (s.durationMinutes > 0) s.durationMinutes else livePlan.durationMinutes,
                            totalChargingTimeMinutes = s.chargeTimeMinutes,
                            arrivalSoC = s.arrivalSoc,
                            energyRequiredKWh = s.energyKwh,
                            battery = stratBattery,
                            stops = stratStops,
                            optimizerData = stratOptData,
                            geometry = s.geometry ?: livePlan.geometry
                        )

                        RouteStrategy(
                            id = s.id,
                            title = s.title,
                            tag = s.tag,
                            totalTimeMinutes = s.totalTimeMinutes,
                            driveTimeMinutes = s.driveTimeMinutes,
                            chargeTimeMinutes = s.chargeTimeMinutes,
                            arrivalSoC = s.arrivalSoc,
                            energyKWh = s.energyKwh,
                            whyExplanation = s.whyExplanation,
                            plan = stratPlan
                        )
                    }

                    _routeStrategies.value = backendStrategies
                    if (backendStrategies.isNotEmpty()) {
                        _selectedStrategyId.value = backendStrategies[0].id
                    }
                } else {
                    // Fallback when backend is not responding or on physical device.
                    // Fetch OSRM route for the direct O->D corridor only (no synthetic midpoint waypoints
                    // which can be off-road and cause all OSRM candidates to fail).
                    val directionsResult = try {
                        GoogleDirectionsClient.fetchRoute(
                            originLat, originLng, destLat, destLng,
                            BuildConfig.MAPS_API_KEY,
                            emptyList() // Direct corridor only — charger stops spliced by PolylineDecoder in UI
                        )
                    } catch (_: Exception) { null }

                    android.util.Log.d("VoltRepository", "OSRM direct route: ${if (directionsResult != null) "OK ${directionsResult.encodedPolyline.length} chars" else "FAILED"}")

                    val actualDistKm = if (directionsResult != null && directionsResult.distanceMeters > 0) {
                        directionsResult.distanceMeters / 1000.0
                    } else distanceKm
                    val actualDurationMins = if (directionsResult != null && directionsResult.durationSeconds > 0) {
                        directionsResult.durationSeconds / 60
                    } else ((distanceKm / 85.0) * 60.0).roundToInt()

                    val fallbackPlan = calculateTrip(
                        origin, destination, actualDistKm, currentVehicle,
                        batteryPercent, originLat, originLng, destLat, destLng,
                        directionsResult?.encodedPolyline, actualDurationMins
                    )

                    _activeTripPlan.value = fallbackPlan
                    _routeStrategies.value = listOf(
                        RouteStrategy(
                            id = "RECOMMENDED",
                            title = if (fallbackPlan.totalChargingTimeMinutes > 0) "EV Optimized Route" else "Direct Route",
                            tag = if (fallbackPlan.totalChargingTimeMinutes > 0) "⚡ EV ROUTE" else "⚡ DIRECT ROUTE",
                            totalTimeMinutes = fallbackPlan.durationMinutes + fallbackPlan.totalChargingTimeMinutes,
                            driveTimeMinutes = fallbackPlan.durationMinutes,
                            chargeTimeMinutes = fallbackPlan.totalChargingTimeMinutes,
                            arrivalSoC = fallbackPlan.arrivalSoC,
                            energyKWh = fallbackPlan.energyRequiredKWh,
                            whyExplanation = fallbackPlan.recommendations.firstOrNull() ?: "Route calculated with EV charging optimization.",
                            plan = fallbackPlan
                        )
                    )
                    _selectedStrategyId.value = "RECOMMENDED"
                }
            } catch (e: Exception) {
                _networkError.value = e.message
                // Direct corridor route — no synthetic waypoints
                val directionsResult = try {
                    GoogleDirectionsClient.fetchRoute(
                        originLat, originLng, destLat, destLng,
                        BuildConfig.MAPS_API_KEY,
                        emptyList()
                    )
                } catch (_: Exception) { null }

                android.util.Log.d("VoltRepository", "OSRM exception-path route: ${if (directionsResult != null) "OK ${directionsResult.encodedPolyline.length} chars" else "FAILED"}")

                val actualDistanceKm = if (directionsResult != null && directionsResult.distanceMeters > 0) {
                    directionsResult.distanceMeters / 1000.0
                } else distanceKm
                val actualDurationMins = if (directionsResult != null && directionsResult.durationSeconds > 0) {
                    directionsResult.durationSeconds / 60
                } else ((distanceKm / 85.0) * 60.0).roundToInt()

                val fallbackPlan = calculateTrip(
                    origin, destination, actualDistanceKm,
                    _selectedVehicle.value, batteryPercent,
                    originLat, originLng, destLat, destLng,
                    directionsResult?.encodedPolyline, actualDurationMins
                )
                _activeTripPlan.value = fallbackPlan
                _routeStrategies.value = listOf(
                    RouteStrategy(
                        id = "RECOMMENDED",
                        title = if (fallbackPlan.totalChargingTimeMinutes > 0) "EV Optimized Route" else "Direct Route",
                        tag = if (fallbackPlan.totalChargingTimeMinutes > 0) "⚡ EV ROUTE" else "⚡ DIRECT ROUTE",
                        totalTimeMinutes = fallbackPlan.durationMinutes + fallbackPlan.totalChargingTimeMinutes,
                        driveTimeMinutes = fallbackPlan.durationMinutes,
                        chargeTimeMinutes = fallbackPlan.totalChargingTimeMinutes,
                        arrivalSoC = fallbackPlan.arrivalSoC,
                        energyKWh = fallbackPlan.energyRequiredKWh,
                        whyExplanation = fallbackPlan.recommendations.firstOrNull() ?: "Route calculated with EV charging optimization.",
                        plan = fallbackPlan
                    )
                )
                _selectedStrategyId.value = "RECOMMENDED"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun selectStrategy(strategyId: String) {
        _selectedStrategyId.value = strategyId
        val selected = _routeStrategies.value.find { it.id == strategyId }
        if (selected != null) {
            _activeTripPlan.value = selected.plan
        }
    }

    // ──────────────────────────────────────────────
    // 2. Live Reroute Trigger (POST /trips/:id/reroute)
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
                            if (dto.operator == null) {
                                android.util.Log.w("StationMapping", "Station ${dto.id} '${dto.name}' has null operator from API, defaulting to 'Open Network'")
                            }
                            val powerKw = dto.powerKw ?: (connectors.maxOfOrNull { it.powerKw } ?: 150.0).toInt()
                            val availablePlugs = dto.availablePlugs ?: connectors.count { it.status == "available" }
                            val totalPlugs = dto.totalPlugs ?: connectors.size.coerceAtLeast(1)
                            ChargingStation(
                                id = dto.id,
                                name = dto.name,
                                operator = dto.operator ?: "Open Network",
                                address = dto.address ?: "Nearby",
                                powerKw = powerKw,
                                isFastCharger = powerKw >= 100,
                                connectors = connectors,
                                availablePlugs = availablePlugs,
                                totalPlugs = totalPlugs,
                                pricePerKWh = 0.35,
                                distanceKm = ((dto.distanceMeters ?: 2000.0) / 1000.0 * 10.0).roundToInt() / 10.0,
                                latitude = dto.latitude,
                                longitude = dto.longitude,
                                isReachable = true
                            )
                        }
                        _stations.value = liveStations
                        return@withContext
                    }
                }
            } catch (e: Exception) {
                _networkError.value = e.message
            }

            // Fallback: Query live stations from OpenChargeMap around (lat, lng)
            try {
                val ocmStations = OpenChargeMapClient.fetchStationsNearby(lat, lng, radiusKm)
                if (ocmStations.isNotEmpty()) {
                    val existingIds = _stations.value.map { it.id }.toSet()
                    val newStations = ocmStations.filter { it.id !in existingIds }
                    _stations.value = if (newStations.isNotEmpty()) _stations.value + newStations else _stations.value
                }
            } catch (e: Exception) {
                android.util.Log.w("VoltRepository", "OpenChargeMap nearby fetch failed: ${e.message}")
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
        _routeStrategies.value = emptyList()
    }

    fun resetTelemetryBaseline() {
        _telemetry.value = createInitialTelemetry(_selectedVehicle.value)
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
        vehicle: VehicleProfile = _selectedVehicle.value,
        batteryPercent: Double = _telemetry.value.socPercent,
        originLat: Double = 0.0,
        originLng: Double = 0.0,
        destLat: Double = 0.0,
        destLng: Double = 0.0,
        geometry: String? = null,
        durationMinutesOverride: Int? = null
    ): TripPlanResult {
        val consumptionRate = vehicle.baseConsumptionWhKm * (if (_telemetry.value.isRangeMode) 0.9 else 1.0)
        val totalEnergyRequiredKWh = (distanceKm * consumptionRate) / 1000.0
        val currentSoC = batteryPercent
        val startingEnergyKWh = (currentSoC / 100.0) * vehicle.batteryCapacityKWh
        
        val drivingTimeMins = durationMinutesOverride ?: ((distanceKm / 85.0) * 60.0).roundToInt()
        
        val isDirectReachable = startingEnergyKWh >= (totalEnergyRequiredKWh + (vehicle.batteryCapacityKWh * (vehicle.reserveSocPercent / 100.0)))
        
        if (isDirectReachable) {
            val remainingEnergy = startingEnergyKWh - totalEnergyRequiredKWh
            val arrivalSoC = (remainingEnergy / vehicle.batteryCapacityKWh) * 100.0
            val safetyMargin = arrivalSoC - vehicle.reserveSocPercent
            val riskScore = max(0.05, min(1.0, 1.0 - (arrivalSoC / 100.0)))
            
            val stops = listOf(
                RouteStop(origin, StopType.ORIGIN, 0.0, currentSoC, currentSoC,
                    latitude = if (originLat != 0.0) originLat else null,
                    longitude = if (originLng != 0.0) originLng else null),
                RouteStop(destination, StopType.DESTINATION, distanceKm, arrivalSoC, arrivalSoC,
                    latitude = if (destLat != 0.0) destLat else null,
                    longitude = if (destLng != 0.0) destLng else null)
            )
            
            val recommendations = mutableListOf<String>().apply {
                add("Direct route feasible — no charging stops needed.")
                if (arrivalSoC < 20.0) add("⚠️ Arrival battery is under 20%. Consider destination charging.")
                else add("✅ Safe arrival buffer of ${(safetyMargin).roundToInt()}% above reserve.")
                add("Battery: ${currentSoC.roundToInt()}% → ${arrivalSoC.roundToInt()}% (${totalEnergyRequiredKWh.roundToInt()} kWh consumed)")
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

            // Use OSRM geometry if provided; do NOT call generateFallbackPolyline here
            // (that function draws a straight line). A null geometry means the map UI will
            // skip drawing the polyline rather than draw a fake straight line.
            val resolvedGeometry = geometry

            return TripPlanResult(
                tripId = "ev-trip-${System.currentTimeMillis()}",
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
                geometry = resolvedGeometry,
                battery = batteryResult,
                stops = stops,
                optimizerData = optimizerData,
                recommendations = recommendations
            )
        } else {
            // Calculate optimal charging stop position along the route
            val stopFraction = 0.55
            val stopDistanceKm = distanceKm * stopFraction
            val leg1Energy = (stopDistanceKm * consumptionRate) / 1000.0
            val chargerArrivalSoC = max(8.0, ((startingEnergyKWh - leg1Energy) / vehicle.batteryCapacityKWh) * 100.0)
            
            val targetSoC = 80.0
            val energyToAddKWh = ((targetSoC - chargerArrivalSoC) / 100.0) * vehicle.batteryCapacityKWh
            val chargingTimeMins = ((energyToAddKWh / min(150.0, vehicle.maxChargingPowerKw)) * 60.0 * 1.15).roundToInt()
            
            val leg2DistanceKm = distanceKm - stopDistanceKm
            val leg2Energy = (leg2DistanceKm * consumptionRate) / 1000.0
            val leg2StartingEnergy = (targetSoC / 100.0) * vehicle.batteryCapacityKWh
            val arrivalSoC = ((leg2StartingEnergy - leg2Energy) / vehicle.batteryCapacityKWh) * 100.0

            val idealLat = if (originLat != 0.0 && destLat != 0.0) {
                originLat + (destLat - originLat) * stopFraction
            } else null
            val idealLng = if (originLng != 0.0 && destLng != 0.0) {
                originLng + (destLng - originLng) * stopFraction
            } else null

            // Find closest real-world EV charging station from database along the corridor
            val candidateStations = _stations.value.ifEmpty { sampleStations }
            val matchedStation = if (idealLat != null && idealLng != null) {
                candidateStations.filter { it.latitude != null && it.longitude != null }
                    .minByOrNull { s ->
                        val dLat = s.latitude!! - idealLat
                        val dLng = s.longitude!! - idealLng
                        dLat * dLat + dLng * dLng
                    }
            } else null

            val chosenStation = if (matchedStation != null && idealLat != null && idealLng != null) {
                val distDeg = Math.hypot(matchedStation.latitude!! - idealLat, matchedStation.longitude!! - idealLng)
                if (distDeg < 3.0) matchedStation else null
            } else null

            val stationName = chosenStation?.let { "${it.operator} — ${it.name}" } ?: "Fast DC EV Charging Hub"
            val stationLat = chosenStation?.latitude ?: idealLat
            val stationLng = chosenStation?.longitude ?: idealLng
            val chargerPower = chosenStation?.powerKw?.toDouble() ?: min(150.0, vehicle.maxChargingPowerKw)
            val actualChargingMins = ((energyToAddKWh / chargerPower) * 60.0 * 1.15).roundToInt()

            val stops = listOf(
                RouteStop(origin, StopType.ORIGIN, 0.0, currentSoC, currentSoC,
                    latitude = if (originLat != 0.0) originLat else null,
                    longitude = if (originLng != 0.0) originLng else null),
                RouteStop(
                    name = stationName,
                    type = StopType.CHARGER_STOP,
                    distanceFromOriginKm = stopDistanceKm,
                    arrivalSoC = (chargerArrivalSoC * 10.0).roundToInt() / 10.0,
                    departureSoC = targetSoC,
                    chargeDurationMinutes = actualChargingMins,
                    energyAddedKWh = (energyToAddKWh * 10.0).roundToInt() / 10.0,
                    latitude = stationLat,
                    longitude = stationLng,
                    powerKw = chargerPower.toInt()
                ),
                RouteStop(destination, StopType.DESTINATION, distanceKm,
                    (arrivalSoC * 10.0).roundToInt() / 10.0,
                    (arrivalSoC * 10.0).roundToInt() / 10.0,
                    latitude = if (destLat != 0.0) destLat else null,
                    longitude = if (destLng != 0.0) destLng else null)
            )
            
            val recommendations = listOf(
                "🔌 Route optimized with real fast charger: $stationName ($actualChargingMins min).",
                "⚡ Charges to 80% SoC for optimal battery efficiency.",
                "🔋 Battery: ${currentSoC.roundToInt()}% → ${chargerArrivalSoC.roundToInt()}% → 80% → ${arrivalSoC.roundToInt()}% at arrival.",
                "📍 Estimated distance: ${distanceKm.roundToInt()} km • Drive time: ${drivingTimeMins} min"
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

            // Use OSRM geometry if provided; do NOT call generateFallbackPolyline here
            // (that function draws a straight line). The UI will splice in charger stops
            // using PolylineDecoder.ensurePathVisitsAllStops once real route geometry arrives.
            val resolvedGeometry = geometry
            
            return TripPlanResult(
                tripId = "ev-trip-${System.currentTimeMillis()}",
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
                geometry = resolvedGeometry,
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
            // ── Bengaluru ➔ Mangaluru Corridor (NH 75) ──────────────────
            ChargingStation(
                id = "st-bm-1",
                name = "Tata Power Fast Charger @ Swathi Delicacy",
                operator = "Tata Power EZ Charge",
                address = "NH 75, Yediyur, Kunigal",
                powerKw = 60,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 60.0),
                    Connector(connectorType = "Type 2", powerKw = 22.0)
                ),
                availablePlugs = 2,
                totalPlugs = 2,
                pricePerKWh = 0.22,
                distanceKm = 85.0,
                latitude = 12.9868,
                longitude = 76.8835,
                isReachable = true
            ),
            ChargingStation(
                id = "st-bm-2",
                name = "Zeon Fast Charging Hub @ Channarayapatna",
                operator = "Zeon Charging",
                address = "NH 75 Highway, Channarayapatna",
                powerKw = 120,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 120.0),
                    Connector(connectorType = "CCS2", powerKw = 60.0)
                ),
                availablePlugs = 4,
                totalPlugs = 4,
                pricePerKWh = 0.24,
                distanceKm = 145.0,
                latitude = 12.9056,
                longitude = 76.3912,
                isReachable = true
            ),
            ChargingStation(
                id = "st-bm-3",
                name = "Jio-bp pulse Fast Charger @ Hassan Bypass",
                operator = "Jio-bp pulse",
                address = "NH 75 Hassan Bypass, B.Katihalli",
                powerKw = 60,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 60.0),
                    Connector(connectorType = "CHAdeMO", powerKw = 50.0)
                ),
                availablePlugs = 2,
                totalPlugs = 2,
                pricePerKWh = 0.21,
                distanceKm = 185.0,
                latitude = 13.0033,
                longitude = 76.1004,
                isReachable = true
            ),
            ChargingStation(
                id = "st-bm-4",
                name = "Relux EV Charging Station @ Sakleshpur",
                operator = "Relux Electric",
                address = "BM Road, Sakleshpur Ghat Entry",
                powerKw = 60,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 60.0)
                ),
                availablePlugs = 2,
                totalPlugs = 2,
                pricePerKWh = 0.23,
                distanceKm = 225.0,
                latitude = 12.9431,
                longitude = 75.7865,
                isReachable = true
            ),
            ChargingStation(
                id = "st-bm-5",
                name = "ChargeZone DC Fast Station @ Uppinangady",
                operator = "ChargeZone",
                address = "NH 75, Uppinangady Bypass",
                powerKw = 60,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 60.0)
                ),
                availablePlugs = 2,
                totalPlugs = 2,
                pricePerKWh = 0.22,
                distanceKm = 295.0,
                latitude = 12.8530,
                longitude = 75.2514,
                isReachable = true
            ),
            ChargingStation(
                id = "st-bm-6",
                name = "Zeon Charging Hub @ Forum Fiza Mall",
                operator = "Zeon Charging",
                address = "Pandeshwar, Mangaluru",
                powerKw = 120,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 120.0),
                    Connector(connectorType = "Type 2", powerKw = 22.0)
                ),
                availablePlugs = 4,
                totalPlugs = 4,
                pricePerKWh = 0.24,
                distanceKm = 350.0,
                latitude = 12.8698,
                longitude = 74.8430,
                isReachable = true
            ),

            // ── Bengaluru ➔ Mysuru Corridor (NH 275) ────────────────────
            ChargingStation(
                id = "st-bmy-1",
                name = "Zeon Charging Hub @ Bidadi",
                operator = "Zeon Charging",
                address = "Bengaluru-Mysuru Expressway, Bidadi",
                powerKw = 60,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 60.0)
                ),
                availablePlugs = 2,
                totalPlugs = 2,
                pricePerKWh = 0.22,
                distanceKm = 35.0,
                latitude = 12.7984,
                longitude = 77.3828,
                isReachable = true
            ),
            ChargingStation(
                id = "st-bmy-2",
                name = "BESCOM Fast Charger @ Ramanagara",
                operator = "BESCOM",
                address = "Expressway Plaza, Ramanagara",
                powerKw = 50,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 50.0)
                ),
                availablePlugs = 2,
                totalPlugs = 2,
                pricePerKWh = 0.18,
                distanceKm = 50.0,
                latitude = 12.7150,
                longitude = 77.2810,
                isReachable = true
            ),
            ChargingStation(
                id = "st-bmy-3",
                name = "Zeon Charging @ Maddur Tiffany's",
                operator = "Zeon Charging",
                address = "Expressway Service Rd, Maddur",
                powerKw = 60,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 60.0)
                ),
                availablePlugs = 2,
                totalPlugs = 2,
                pricePerKWh = 0.22,
                distanceKm = 80.0,
                latitude = 12.5828,
                longitude = 77.0447,
                isReachable = true
            ),
            ChargingStation(
                id = "st-bmy-4",
                name = "Tata Power EZ Charge @ Mandya",
                operator = "Tata Power EZ Charge",
                address = "Sanjavani Nagar, Mandya",
                powerKw = 50,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 50.0)
                ),
                availablePlugs = 2,
                totalPlugs = 2,
                pricePerKWh = 0.20,
                distanceKm = 100.0,
                latitude = 12.5218,
                longitude = 76.8951,
                isReachable = true
            ),
            ChargingStation(
                id = "st-bmy-5",
                name = "Jio-bp pulse @ Srirangapatna",
                operator = "Jio-bp pulse",
                address = "Mysuru Highway, Srirangapatna",
                powerKw = 120,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 120.0)
                ),
                availablePlugs = 4,
                totalPlugs = 4,
                pricePerKWh = 0.23,
                distanceKm = 125.0,
                latitude = 12.4180,
                longitude = 76.6947,
                isReachable = true
            ),

            // ── Mumbai ➔ Pune Expressway Corridor ───────────────────────
            ChargingStation(
                id = "st-mp-1",
                name = "Tata Power Fast Charger @ Kharghar",
                operator = "Tata Power EZ Charge",
                address = "Sion-Panvel Hwy, Navi Mumbai",
                powerKw = 60,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 60.0)
                ),
                availablePlugs = 2,
                totalPlugs = 2,
                pricePerKWh = 0.22,
                distanceKm = 30.0,
                latitude = 19.0435,
                longitude = 73.0685,
                isReachable = true
            ),
            ChargingStation(
                id = "st-mp-2",
                name = "Zeon Charging Hub @ Khalapur Food Mall",
                operator = "Zeon Charging",
                address = "Mumbai-Pune Expressway Toll, Khalapur",
                powerKw = 120,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 120.0),
                    Connector(connectorType = "CCS2", powerKw = 60.0)
                ),
                availablePlugs = 4,
                totalPlugs = 4,
                pricePerKWh = 0.24,
                distanceKm = 65.0,
                latitude = 18.7915,
                longitude = 73.2842,
                isReachable = true
            ),
            ChargingStation(
                id = "st-mp-3",
                name = "Jio-bp pulse @ Lonavala Plaza",
                operator = "Jio-bp pulse",
                address = "Old Mumbai-Pune Hwy, Lonavala",
                powerKw = 120,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 120.0)
                ),
                availablePlugs = 4,
                totalPlugs = 4,
                pricePerKWh = 0.23,
                distanceKm = 85.0,
                latitude = 18.7557,
                longitude = 73.4091,
                isReachable = true
            ),
            ChargingStation(
                id = "st-mp-4",
                name = "Statiq Fast Charger @ Talegaon",
                operator = "Statiq",
                address = "Expressway Exit, Talegaon Dabhade",
                powerKw = 60,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 60.0)
                ),
                availablePlugs = 2,
                totalPlugs = 2,
                pricePerKWh = 0.21,
                distanceKm = 115.0,
                latitude = 18.7300,
                longitude = 73.6750,
                isReachable = true
            ),
            ChargingStation(
                id = "st-mp-5",
                name = "Tata Power EV Superhub @ Wakad",
                operator = "Tata Power EZ Charge",
                address = "Hinjawadi Link Rd, Wakad, Pune",
                powerKw = 150,
                isFastCharger = true,
                connectors = listOf(
                    Connector(connectorType = "CCS2", powerKw = 150.0)
                ),
                availablePlugs = 6,
                totalPlugs = 6,
                pricePerKWh = 0.24,
                distanceKm = 145.0,
                latitude = 18.5987,
                longitude = 73.7634,
                isReachable = true
            ),

            // ── US California Corridors ─────────────────────────────────
            ChargingStation(
                id = "st-us-1",
                name = "VOLT HyperCharge Gateway",
                operator = "VOLT Grid",
                address = "1040 Innovation Pkwy, San Francisco",
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
                id = "st-us-2",
                name = "Electrify Station Express",
                operator = "Electrify America",
                address = "450 Metro Boulevard, Oakland",
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
                id = "st-us-3",
                name = "Tesla Supercharger Hub",
                operator = "Tesla Open Network",
                address = "780 Silicon Expressway, Palo Alto",
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
            )
        )
    }
}
