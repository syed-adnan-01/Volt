package com.volt.android.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.volt.android.data.VoltRepository
import com.volt.android.data.models.BatteryTelemetry
import com.volt.android.data.models.ChargingStation
import com.volt.android.data.models.RerouteAlert
import com.volt.android.data.models.RouteStrategy
import com.volt.android.data.models.TripPlanResult
import com.volt.android.data.models.VehicleProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class VoltNavTab {
    DASHBOARD,
    TRIP_PLANNER,
    CHARGERS,
    SIMULATOR,
    HEALTH
}

data class VoltUiState(
    val selectedVehicle: VehicleProfile,
    val allVehicles: List<VehicleProfile>,
    val telemetry: BatteryTelemetry,
    val stations: List<ChargingStation>,
    val tripPlan: TripPlanResult,
    val routeStrategies: List<RouteStrategy> = emptyList(),
    val selectedStrategyId: String = "RECOMMENDED",
    val rerouteAlert: RerouteAlert? = null,
    val currentTab: VoltNavTab = VoltNavTab.DASHBOARD,
    val filterFastOnly: Boolean = false,
    val filterAvailableOnly: Boolean = false,
    val isLoading: Boolean = false,
    val networkError: String? = null
)

class VoltViewModel(
    private val repository: VoltRepository = VoltRepository()
) : ViewModel() {

    private val _currentTab = MutableStateFlow(VoltNavTab.DASHBOARD)
    val currentTab: StateFlow<VoltNavTab> = _currentTab.asStateFlow()

    private val _filterFastOnly = MutableStateFlow(false)
    val filterFastOnly: StateFlow<Boolean> = _filterFastOnly.asStateFlow()

    private val _filterAvailableOnly = MutableStateFlow(false)
    val filterAvailableOnly: StateFlow<Boolean> = _filterAvailableOnly.asStateFlow()

    init {
        viewModelScope.launch {
            repository.loadVehicles()
            repository.loadStations()
        }
    }

    private val _filteredStations = combine(
        repository.stations,
        _filterFastOnly,
        _filterAvailableOnly
    ) { stations, fastOnly, availOnly ->
        stations.filter { st ->
            (!fastOnly || st.isFastCharger) && (!availOnly || st.availablePlugs > 0)
        }
    }

    val uiState: StateFlow<VoltUiState> = combine(
        repository.selectedVehicle,
        repository.vehicles,
        repository.telemetry,
        _filteredStations,
        repository.activeTripPlan,
        repository.routeStrategies,
        repository.selectedStrategyId,
        repository.rerouteAlert,
        _currentTab,
        repository.isLoading,
        repository.networkError
    ) { params: Array<Any?> ->
        val vehicle = params[0] as VehicleProfile
        @Suppress("UNCHECKED_CAST")
        val allVehicles = params[1] as List<VehicleProfile>
        val telemetry = params[2] as BatteryTelemetry
        @Suppress("UNCHECKED_CAST")
        val stations = params[3] as List<ChargingStation>
        val tripPlan = params[4] as TripPlanResult
        @Suppress("UNCHECKED_CAST")
        val strategies = params[5] as List<RouteStrategy>
        val strategyId = params[6] as String
        val reroute = params[7] as RerouteAlert?
        val tab = params[8] as VoltNavTab
        val loading = params[9] as Boolean
        val error = params[10] as String?

        VoltUiState(
            selectedVehicle = vehicle,
            allVehicles = allVehicles,
            telemetry = telemetry,
            stations = stations,
            tripPlan = tripPlan,
            routeStrategies = strategies,
            selectedStrategyId = strategyId,
            rerouteAlert = reroute,
            currentTab = tab,
            filterFastOnly = _filterFastOnly.value,
            filterAvailableOnly = _filterAvailableOnly.value,
            isLoading = loading,
            networkError = error
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = VoltUiState(
            selectedVehicle = repository.sampleVehicles[0],
            allVehicles = repository.sampleVehicles,
            telemetry = repository.telemetry.value,
            stations = repository.stations.value,
            tripPlan = repository.activeTripPlan.value,
            routeStrategies = repository.routeStrategies.value
        )
    )

    fun selectTab(tab: VoltNavTab) {
        _currentTab.value = tab
    }

    fun selectVehicle(vehicle: VehicleProfile) {
        repository.selectVehicle(vehicle)
    }

    fun selectStrategy(strategyId: String) {
        repository.selectStrategy(strategyId)
    }

    fun togglePreconditioning() {
        repository.togglePreconditioning()
    }

    fun toggleRangeMode() {
        repository.toggleRangeMode()
    }

    fun simulateDrive(distanceKm: Double, speedKmH: Double, tempCelsius: Double) {
        repository.simulateDrive(distanceKm, speedKmH, tempCelsius)
    }

    fun simulateCharge(durationMinutes: Int, chargerPowerKw: Double) {
        repository.simulateCharge(durationMinutes, chargerPowerKw)
    }

    fun planTrip(
        origin: String,
        destination: String,
        distanceKm: Double,
        originLat: Double = 37.7749,
        originLng: Double = -122.4194,
        destLat: Double = 39.0968,
        destLng: Double = -120.0324
    ) {
        viewModelScope.launch {
            repository.planTrip(origin, destination, distanceKm, originLat, originLng, destLat, destLng)
        }
    }

    fun refreshStations(lat: Double = 37.7749, lng: Double = -122.4194) {
        viewModelScope.launch {
            repository.loadStations(lat, lng)
        }
    }

    fun submitStationFeedback(
        stationId: String,
        rating: Int,
        plugsObserved: Int? = null,
        waitTimeMinutes: Int? = null,
        functional: Boolean = true,
        comment: String? = null
    ) {
        viewModelScope.launch {
            repository.submitFeedback(stationId, rating, plugsObserved, waitTimeMinutes, functional, comment)
        }
    }

    fun acceptReroute(tripId: String) {
        viewModelScope.launch {
            repository.rerouteTrip(tripId)
        }
    }

    fun dismissRerouteAlert() {
        repository.dismissRerouteAlert()
    }

    fun triggerSimulatedReroute() {
        repository.simulateRerouteAlert()
    }

    fun toggleFastChargerFilter() {
        _filterFastOnly.value = !_filterFastOnly.value
    }

    fun toggleAvailableOnlyFilter() {
        _filterAvailableOnly.value = !_filterAvailableOnly.value
    }
}
