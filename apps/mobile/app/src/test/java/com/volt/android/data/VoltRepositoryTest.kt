package com.volt.android.data

import com.volt.android.data.models.StopType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class VoltRepositoryTest {

    private lateinit var repository: VoltRepository

    @Before
    fun setUp() {
        repository = VoltRepository()
    }

    @Test
    fun calculateTrip_directReachable_whenSufficientBattery() {
        val vehicle = repository.sampleVehicles[0] // Tesla Model 3 Long Range (75 kWh, 78% SoC)
        val plan = repository.calculateTrip("San Francisco", "San Jose", 80.0, vehicle)

        assertTrue(plan.isFeasible)
        assertEquals(0, plan.totalChargingTimeMinutes)
        assertEquals(2, plan.stops.size)
        assertEquals(StopType.ORIGIN, plan.stops[0].type)
        assertEquals(StopType.DESTINATION, plan.stops[1].type)
        assertTrue(plan.arrivalSoC > vehicle.reserveSocPercent)
        assertNotNull(plan.battery)
        assertTrue(plan.battery!!.reachable)
    }

    @Test
    fun calculateTrip_insertsChargerStop_whenInsufficientBattery() {
        val vehicle = repository.sampleVehicles[3] // Tata Nexon EV (40.5 kWh, 52% SoC)
        val plan = repository.calculateTrip("Mumbai", "Goa", 580.0, vehicle)

        assertTrue(plan.isFeasible)
        assertTrue(plan.totalChargingTimeMinutes > 0)
        assertEquals(3, plan.stops.size)
        assertEquals(StopType.ORIGIN, plan.stops[0].type)
        assertEquals(StopType.CHARGER_STOP, plan.stops[1].type)
        assertEquals(StopType.DESTINATION, plan.stops[2].type)
        assertEquals(80.0, plan.stops[1].departureSoC, 0.1)
    }

    @Test
    fun generateRouteStrategies_producesThreeDistinctStrategies() {
        val vehicle = repository.sampleVehicles[0]
        val plan = repository.calculateTrip("San Francisco", "Lake Tahoe", 315.0, vehicle)
        val strategies = repository.generateRouteStrategies(plan, vehicle)

        assertEquals(3, strategies.size)
        val ids = strategies.map { it.id }
        assertTrue(ids.contains("RECOMMENDED"))
        assertTrue(ids.contains("FASTEST"))
        assertTrue(ids.contains("MAX_EFFICIENCY"))

        strategies.forEach { strategy ->
            assertTrue(strategy.totalTimeMinutes >= strategy.driveTimeMinutes)
            assertTrue(strategy.whyExplanation.isNotBlank())
            assertTrue(strategy.arrivalSoC > 0.0)
        }
    }

    @Test
    fun simulateDrive_reducesEnergyAndCalculatesDrainRate() {
        val initialEnergy = repository.telemetry.value.currentEnergyKWh
        repository.simulateDrive(distanceKm = 50.0, speedKmH = 100.0, tempCelsius = 20.0)

        val updatedTelemetry = repository.telemetry.value
        assertTrue(updatedTelemetry.currentEnergyKWh < initialEnergy)
        assertTrue(updatedTelemetry.socPercent < 78.0)
        assertTrue(updatedTelemetry.drainRateWhKm > 0.0)
        assertFalse(updatedTelemetry.isCharging)
    }

    @Test
    fun simulateCharge_increasesEnergyAndSoC() {
        // First drain slightly
        repository.simulateDrive(distanceKm = 100.0, speedKmH = 90.0, tempCelsius = 22.0)
        val drainedSoC = repository.telemetry.value.socPercent

        // Charge for 15 mins at 250 kW
        repository.simulateCharge(durationMinutes = 15, chargerPowerKw = 250.0)
        val chargedSoC = repository.telemetry.value.socPercent

        assertTrue(chargedSoC > drainedSoC)
        assertTrue(repository.telemetry.value.isCharging)
    }

    @Test
    fun toggleRangeMode_adjustsDrainRateAndRange() {
        assertFalse(repository.telemetry.value.isRangeMode)
        val baseRange = repository.telemetry.value.estimatedRangeKm

        repository.toggleRangeMode()
        assertTrue(repository.telemetry.value.isRangeMode)
        assertTrue(repository.telemetry.value.estimatedRangeKm > baseRange)

        repository.toggleRangeMode()
        assertFalse(repository.telemetry.value.isRangeMode)
    }

    @Test
    fun resetTelemetryBaseline_restoresInitialVehicleStats() {
        repository.simulateDrive(distanceKm = 150.0, speedKmH = 120.0, tempCelsius = 5.0)
        assertTrue(repository.telemetry.value.socPercent < 78.0)

        repository.resetTelemetryBaseline()
        assertEquals(78.0, repository.telemetry.value.socPercent, 0.1)
        assertFalse(repository.telemetry.value.isCharging)
    }
}
