package com.volt.android.ui.viewmodel

import com.volt.android.data.VoltRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class VoltViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var repository: VoltRepository
    private lateinit var viewModel: VoltViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        repository = VoltRepository()
        viewModel = VoltViewModel(repository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun initialUiState_containsDefaultVehiclesAndStations() = runTest {
        val state = viewModel.uiState.value
        assertEquals("Tesla", state.selectedVehicle.make)
        assertEquals("Model 3", state.selectedVehicle.model)
        assertEquals(VoltNavTab.DASHBOARD, state.currentTab)
        assertTrue(state.stations.isNotEmpty())
        assertNull(state.rerouteAlert)
    }

    @Test
    fun selectTab_updatesCurrentTab() = runTest {
        viewModel.selectTab(VoltNavTab.TRIP_PLANNER)
        assertEquals(VoltNavTab.TRIP_PLANNER, viewModel.currentTab.value)

        viewModel.selectTab(VoltNavTab.CHARGERS)
        assertEquals(VoltNavTab.CHARGERS, viewModel.currentTab.value)
    }

    @Test
    fun selectVehicle_updatesSelectedVehicleAndTelemetry() = runTest {
        val ioniq = repository.sampleVehicles[1]
        viewModel.selectVehicle(ioniq)

        assertEquals("Hyundai", repository.selectedVehicle.value.make)
        assertEquals(ioniq.batteryCapacityKWh, repository.telemetry.value.totalCapacityKWh, 0.1)
    }

    @Test
    fun selectStrategy_updatesSelectedStrategyId() = runTest {
        viewModel.selectStrategy("FASTEST")
        assertEquals("FASTEST", repository.selectedStrategyId.value)

        viewModel.selectStrategy("MAX_EFFICIENCY")
        assertEquals("MAX_EFFICIENCY", repository.selectedStrategyId.value)
    }

    @Test
    fun toggleFilters_filtersChargingStations() = runTest {
        assertFalse(viewModel.filterFastOnly.value)
        viewModel.toggleFastChargerFilter()
        assertTrue(viewModel.filterFastOnly.value)

        viewModel.toggleAvailableOnlyFilter()
        assertTrue(viewModel.filterAvailableOnly.value)
    }

    @Test
    fun simulateRerouteAlert_and_dismissRerouteAlert() = runTest {
        viewModel.triggerSimulatedReroute()
        val alert = repository.rerouteAlert.value
        assertNotNull(alert)
        assertEquals("Congestion Ahead", alert?.title)

        viewModel.dismissRerouteAlert()
        assertNull(repository.rerouteAlert.value)
    }

    @Test
    fun startAndStopTripNavigation_updatesNavigatingState() = runTest {
        assertFalse(viewModel.isNavigating.value)
        assertNull(viewModel.userLocation.value)

        viewModel.startTripNavigation()
        assertTrue(viewModel.isNavigating.value)

        viewModel.stopTripNavigation()
        assertFalse(viewModel.isNavigating.value)
        assertNull(viewModel.userLocation.value)
    }
}
