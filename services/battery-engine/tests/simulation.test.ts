/**
 * Simulation Subsystem Tests (Milestone 6)
 * Member 3 — Battery & EV Intelligence Subsystem
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createVehicleProfile,
  SimulatedBatteryProvider,
  calculateObservedConsumption,
  calculateDrainDeviation,
  evaluateDrainRateRisk,
  BatteryValidationError,
} from '../src/index.js';

describe('Drain Rate & Anomaly Monitoring', () => {
  it('should calculate observed consumption correctly', () => {
    // 3.0 kWh used over 20 km = 0.15 kWh/km
    const observed = calculateObservedConsumption(3.0, 20);
    assert.equal(observed, 0.15);
  });

  it('should return 0 consumption for 0 distance', () => {
    const observed = calculateObservedConsumption(0, 0);
    assert.equal(observed, 0);
  });

  it('should throw error for negative distance or invalid energy', () => {
    assert.throws(
      () => calculateObservedConsumption(5, -10),
      (err: any) => err instanceof BatteryValidationError && err.code === 'INVALID_DISTANCE'
    );
    assert.throws(
      () => calculateObservedConsumption(-2, 10),
      (err: any) => err instanceof BatteryValidationError && err.code === 'INVALID_ENERGY_VALUE'
    );
  });

  it('should calculate drain deviation percentage correctly', () => {
    // Baseline 0.15, Observed 0.20 -> +33.33%
    const deviation = calculateDrainDeviation(0.20, 0.15);
    assert.equal(deviation, 33.33);

    // Baseline 0.20, Observed 0.16 -> -20.00%
    const underDeviation = calculateDrainDeviation(0.16, 0.20);
    assert.equal(underDeviation, -20.0);
  });

  it('should evaluate drain rate risk and trigger alert when exceeding tolerance', () => {
    // Baseline 0.15, observed 0.20 with 15% tolerance -> elevated!
    const evaluation = evaluateDrainRateRisk(0.20, 0.15, 15);
    assert.equal(evaluation.isElevated, true);
    assert.equal(evaluation.deviationPercent, 33.33);
    assert.ok(evaluation.alertMessage?.includes('High battery drain detected'));
  });

  it('should not trigger alert when drain is within tolerance', () => {
    // Baseline 0.15, observed 0.16 (+6.67%) with 15% tolerance -> normal
    const evaluation = evaluateDrainRateRisk(0.16, 0.15, 15);
    assert.equal(evaluation.isElevated, false);
    assert.equal(evaluation.alertMessage, undefined);
  });
});

describe('SimulatedBatteryProvider - State & Drive Ticks', () => {
  const vehicle = createVehicleProfile({
    vehicleId: 'EV-SIM-01',
    batteryCapacityKWh: 60,
    usableBatteryCapacityKWh: 57,
    consumptionKWhPerKm: 0.15,
    batteryHealthPercent: 95,
    maxChargingPowerKW: 100,
  });

  it('should initialize with correct initial state', () => {
    const provider = new SimulatedBatteryProvider(vehicle, 80);
    const state = provider.getCurrentState();

    assert.equal(state.vehicleId, 'EV-SIM-01');
    assert.equal(state.socPercent, 80);
    // 80% of 57 kWh = 45.6 kWh
    assert.equal(state.energyRemainingKWh, 45.6);
    // 45.6 / 0.15 = 304 km
    assert.equal(state.estimatedRangeKm, 304);
    assert.equal(state.batteryHealthPercent, 95);
    assert.equal(state.source, 'SIMULATION');
  });

  it('should simulate drive tick correctly with standard consumption', () => {
    const provider = new SimulatedBatteryProvider(vehicle, 80);
    
    // Drive 20 km at baseline 0.15 kWh/km -> 3.0 kWh used
    // Remaining energy = 45.6 - 3.0 = 42.6 kWh
    // Remaining SoC = (42.6 / 57) * 100 = 74.74%
    const tickResult = provider.simulateDriveTick(20);

    assert.equal(tickResult.energyUsedKWh, 3.0);
    assert.equal(tickResult.state.energyRemainingKWh, 42.6);
    assert.equal(tickResult.state.socPercent, 74.74);
    assert.equal(tickResult.state.estimatedRangeKm, 284);
    assert.equal(tickResult.drainEvaluation.isElevated, false);
  });

  it('should track elevated drain when driving under high consumption', () => {
    const provider = new SimulatedBatteryProvider(vehicle, 80);

    // Drive 30 km at high consumption 0.22 kWh/km (vs baseline 0.15)
    const tickResult = provider.simulateDriveTick(30, 0.22);

    assert.equal(tickResult.energyUsedKWh, 6.6);
    assert.equal(tickResult.drainEvaluation.isElevated, true);
    assert.ok(tickResult.drainEvaluation.deviationPercent > 40);

    const stats = provider.getTelemetryStats();
    assert.equal(stats.totalDistanceDrivenKm, 30);
    assert.equal(stats.totalEnergyConsumedKWh, 6.6);
  });

  it('should clamp energy to 0 if driven beyond available battery capacity', () => {
    const provider = new SimulatedBatteryProvider(vehicle, 10);
    // 10% of 57 kWh = 5.7 kWh. Drive 500 km at 0.15 kWh/km (75 kWh required)
    const tickResult = provider.simulateDriveTick(500);

    assert.equal(tickResult.state.energyRemainingKWh, 0);
    assert.equal(tickResult.state.socPercent, 0);
    assert.equal(tickResult.state.estimatedRangeKm, 0);
  });

  it('should throw validation error on invalid drive tick distance or consumption', () => {
    const provider = new SimulatedBatteryProvider(vehicle, 80);

    assert.throws(
      () => provider.simulateDriveTick(-5),
      (err: any) => err instanceof BatteryValidationError && err.code === 'INVALID_DISTANCE'
    );
    assert.throws(
      () => provider.simulateDriveTick(10, -0.1),
      (err: any) => err instanceof BatteryValidationError && err.code === 'INVALID_CONSUMPTION_RATE'
    );
  });
});

describe('SimulatedBatteryProvider - Charging Ticks & Event Subscriptions', () => {
  const vehicle = createVehicleProfile({
    vehicleId: 'EV-SIM-02',
    batteryCapacityKWh: 40,
    usableBatteryCapacityKWh: 38,
    consumptionKWhPerKm: 0.16,
    maxChargingPowerKW: 50,
  });

  it('should simulate charging tick correctly', () => {
    const provider = new SimulatedBatteryProvider(vehicle, 20); // 20% = 7.6 kWh
    
    // Charge for 30 minutes at 50 kW charger with 95% efficiency
    // Delivered: 50 * 0.5 = 25 kWh. Added: 25 * 0.95 = 23.75 kWh.
    // New energy: 7.6 + 23.75 = 31.35 kWh
    // New SoC: (31.35 / 38) * 100 = 82.5%
    const chargeResult = provider.simulateChargingTick(30, 50, 0.95);

    assert.equal(chargeResult.energyAddedKWh, 23.75);
    assert.equal(chargeResult.effectivePowerKW, 50);
    assert.equal(chargeResult.state.energyRemainingKWh, 31.35);
    assert.equal(chargeResult.state.socPercent, 82.5);
  });

  it('should cap charging rate at vehicle max charging power', () => {
    const provider = new SimulatedBatteryProvider(vehicle, 20);
    
    // Charger is 150 kW, but vehicle max is 50 kW
    const chargeResult = provider.simulateChargingTick(15, 150, 1.0);
    assert.equal(chargeResult.effectivePowerKW, 50);
    // 50 kW * 0.25h = 12.5 kWh
    assert.equal(chargeResult.energyAddedKWh, 12.5);
  });

  it('should cap energy and SoC at 100% capacity when overcharging', () => {
    const provider = new SimulatedBatteryProvider(vehicle, 90);
    // Charge for 120 minutes
    const chargeResult = provider.simulateChargingTick(120, 50);

    assert.equal(chargeResult.state.energyRemainingKWh, 38);
    assert.equal(chargeResult.state.socPercent, 100);
  });

  it('should notify subscribers on drive, charge, and state updates', () => {
    const provider = new SimulatedBatteryProvider(vehicle, 50);
    const notifications: number[] = [];

    const unsubscribe = provider.subscribe((state) => {
      notifications.push(state.socPercent);
    });

    provider.simulateDriveTick(10);
    provider.simulateChargingTick(10, 50);
    provider.setSoC(90);

    assert.equal(notifications.length, 3);
    assert.equal(notifications[2], 90);

    // Unsubscribe and verify no more notifications
    unsubscribe();
    provider.setSoC(40);
    assert.equal(notifications.length, 3);
  });

  it('should reset provider state to initial baseline', () => {
    const provider = new SimulatedBatteryProvider(vehicle, 80);
    provider.simulateDriveTick(50);
    assert.notEqual(provider.getCurrentState().socPercent, 80);

    provider.reset();
    assert.equal(provider.getCurrentState().socPercent, 80);
    assert.equal(provider.getTelemetryStats().totalDistanceDrivenKm, 0);
  });
});
