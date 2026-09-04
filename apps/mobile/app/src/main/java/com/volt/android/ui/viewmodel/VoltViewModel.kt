package com.volt.android.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.maps.model.LatLng
import com.volt.android.data.LiveLocationTracker
import com.volt.android.data.VoltRepository
import com.volt.android.data.models.BatteryTelemetry
import com.volt.android.data.models.ChargingStation
import com.volt.android.data.models.RerouteAlert
import com.volt.android.data.models.RouteStrategy
import com.volt.android.data.models.TripPlanResult
import com.volt.android.data.models.UserProfile
import com.volt.android.data.models.VehicleProfile
import com.volt.android.data.remote.AuthSessionManager
import kotlinx.coroutines.Job
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
    val networkError: String? = null,
    val currentUser: UserProfile? = null,
    val isAuthenticated: Boolean = false,
    val isAuthLoading: Boolean = false,
    val authError: String? = null,
    val isNavigating: Boolean = false,
    val userLocation: LatLng? = null
)

class VoltViewModel(
    private val repository: VoltRepository = VoltRepository(),
    private val locationTracker: LiveLocationTracker? = null
) : ViewModel() {

    private val _currentTab = MutableStateFlow(VoltNavTab.DASHBOARD)
    val currentTab: StateFlow<VoltNavTab> = _currentTab.asStateFlow()

    private val _filterFastOnly = MutableStateFlow(false)
    val filterFastOnly: StateFlow<Boolean> = _filterFastOnly.asStateFlow()

    private val _filterAvailableOnly = MutableStateFlow(false)
    val filterAvailableOnly: StateFlow<Boolean> = _filterAvailableOnly.asStateFlow()

    private val _isAuthLoading = MutableStateFlow(false)
    private val _authError = MutableStateFlow<String?>(null)

    private val _isNavigating = MutableStateFlow(false)
    val isNavigating: StateFlow<Boolean> = _isNavigating.asStateFlow()

    private val _userLocation = MutableStateFlow<LatLng?>(null)
    val userLocation: StateFlow<LatLng?> = _userLocation.asStateFlow()

    private var locationJob: Job? = null

    init {
        if (AuthSessionManager.isAuthenticated.value) {
            viewModelScope.launch {
                repository.loadVehicles()
                repository.loadStations()
            }
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
        combine(
            repository.selectedVehicle,
            repository.vehicles,
            repository.telemetry,
            _filteredStations,
            repository.activeTripPlan,
            repository.routeStrategies,
            repository.selectedStrategyId,
            repository.rerouteAlert
        ) { p1 -> p1 },
        combine(
            _currentTab,
            repository.isLoading,
            repository.networkError,
            AuthSessionManager.currentUser,
            AuthSessionManager.isAuthenticated,
            _isAuthLoading,
            _authError
        ) { p2 -> p2 },
        combine(
            _isNavigating,
            _userLocation
        ) { p3 -> p3 }
    ) { p1, p2, p3 ->
        val vehicle = p1[0] as VehicleProfile
        @Suppress("UNCHECKED_CAST")
        val allVehicles = p1[1] as List<VehicleProfile>
        val telemetry = p1[2] as BatteryTelemetry
        @Suppress("UNCHECKED_CAST")
        val stations = p1[3] as List<ChargingStation>
        val tripPlan = p1[4] as TripPlanResult
        @Suppress("UNCHECKED_CAST")
        val strategies = p1[5] as List<RouteStrategy>
        val strategyId = p1[6] as String
        val reroute = p1[7] as RerouteAlert?

        val tab = p2[0] as VoltNavTab
        val loading = p2[1] as Boolean
        val netError = p2[2] as String?
        val user = p2[3] as UserProfile?
        val authed = p2[4] as Boolean
        val authLoading = p2[5] as Boolean
        val authErr = p2[6] as String?

        val isNav = p3[0] as Boolean
        val userLoc = p3[1] as LatLng?

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
            networkError = netError,
            currentUser = user,
            isAuthenticated = authed,
            isAuthLoading = authLoading,
            authError = authErr,
            isNavigating = isNav,
            userLocation = userLoc
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
            routeStrategies = repository.routeStrategies.value,
            currentUser = AuthSessionManager.currentUser.value,
            isAuthenticated = AuthSessionManager.isAuthenticated.value
        )
    )

    // ──────────────────────────────────────────────
    // Authentication Actions
    // ──────────────────────────────────────────────

    fun loginWithEmail(email: String, pass: String) {
        _isAuthLoading.value = true
        _authError.value = null
        val res = AuthSessionManager.signInWithEmail(email, pass)
        res.onSuccess {
            _isAuthLoading.value = false
            _authError.value = null
            // Trigger data refresh on login
            viewModelScope.launch {
                repository.loadVehicles()
                repository.loadStations()
            }
        }.onFailure { ex ->
            _isAuthLoading.value = false
            _authError.value = ex.message ?: "Authentication failed."
        }
    }

    fun signUp(name: String, email: String, pass: String, preferredVehicleId: String) {
        _isAuthLoading.value = true
        _authError.value = null
        val res = AuthSessionManager.signUp(name, email, pass, preferredVehicleId)
        res.onSuccess { profile ->
            _isAuthLoading.value = false
            _authError.value = null
            // Select user's preferred vehicle
            val matchedVehicle = repository.sampleVehicles.find { it.id == preferredVehicleId }
            if (matchedVehicle != null) {
                repository.selectVehicle(matchedVehicle)
            }
            viewModelScope.launch {
                repository.loadVehicles()
                repository.loadStations()
            }
        }.onFailure { ex ->
            _isAuthLoading.value = false
            _authError.value = ex.message ?: "Account creation failed."
        }
    }

    fun onGoogleSignInResult(
        name: String,
        email: String,
        idToken: String? = null
    ) {
        _isAuthLoading.value = true
        _authError.value = null
        val res = AuthSessionManager.signInWithGoogleAccount(name, email, idToken)
        res.onSuccess {
            _isAuthLoading.value = false
            _authError.value = null
            viewModelScope.launch {
                repository.loadVehicles()
                repository.loadStations()
            }
        }.onFailure { ex ->
            _isAuthLoading.value = false
            _authError.value = ex.message ?: "Google authentication failed."
        }
    }

    fun onGoogleSignInError(errorMessage: String) {
        _isAuthLoading.value = false
        _authError.value = errorMessage
    }

    fun loginWithGoogle() {
        _isAuthLoading.value = true
        _authError.value = null
        val res = AuthSessionManager.signInWithGoogle()
        res.onSuccess {
            _isAuthLoading.value = false
            _authError.value = null
            viewModelScope.launch {
                repository.loadVehicles()
                repository.loadStations()
            }
        }.onFailure { ex ->
            _isAuthLoading.value = false
            _authError.value = ex.message ?: "Google authentication failed."
        }
    }

    fun loginAsGuest() {
        _isAuthLoading.value = true
        _authError.value = null
        val res = AuthSessionManager.signInAsGuest()
        res.onSuccess {
            _isAuthLoading.value = false
            _authError.value = null
            viewModelScope.launch {
                repository.loadVehicles()
                repository.loadStations()
            }
        }
    }

    fun logout() {
        AuthSessionManager.signOut()
    }

    fun clearAuthError() {
        _authError.value = null
    }

    // ──────────────────────────────────────────────
    // Navigation & App Tab Actions
    // ──────────────────────────────────────────────

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

    fun resetSandboxBaseline() {
        repository.resetTelemetryBaseline()
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

    // ──────────────────────────────────────────────
    // Live Location & Active Trip Navigation
    // ──────────────────────────────────────────────

    fun startTripNavigation(customTracker: LiveLocationTracker? = null) {
        val activeTracker = customTracker ?: locationTracker
        _isNavigating.value = true
        locationJob?.cancel()
        if (activeTracker != null) {
            locationJob = viewModelScope.launch {
                activeTracker.getLocationUpdates().collect { latLng ->
                    _userLocation.value = latLng
                }
            }
        }
    }

    fun stopTripNavigation() {
        _isNavigating.value = false
        locationJob?.cancel()
        locationJob = null
        _userLocation.value = null
    }

    override fun onCleared() {
        super.onCleared()
        locationJob?.cancel()
    }
}
