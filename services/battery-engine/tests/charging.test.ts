import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateChargingEnergy,
  estimateChargingTime,
  applyChargingStateTransition,
  createVehicleProfile,
  createBatteryState,
} from '../src/index.js';

describe('Charging Energy, Time & State Transitions (Milestone 5)', () => {
  it('should calculate net and gross charging energy with 100% efficiency', () => {
    const result = calculateChargingEnergy(20, 80, 60, 1.0);
    assert.equal(result.energyToAddKWh, 36);
    assert.equal(result.energyFromChargerKWh, 36);
  });

  it('should calculate net and gross charging energy with 90% efficiency', () => {
    const result = calculateChargingEnergy(20, 80, 60, 0.90);
    assert.equal(result.energyToAddKWh, 36);
    assert.equal(result.energyFromChargerKWh, 40);
  });

  it('should use default 95% efficiency when efficiency is omitted', () => {
    const result = calculateChargingEnergy(0, 100, 50);
    assert.equal(result.energyToAddKWh, 50);
    assert.equal(result.energyFromChargerKWh, 52.632);
  });

  it('should estimate charging time correctly for ideal charger', () => {
    // 40 kWh capacity, 20% to 80% = 24 kWh added. 20 kW charger = 1.2 hrs = 72 mins
    const result = estimateChargingTime({
      currentSoCPercent: 20,
      targetSoCPercent: 80,
      usableCapacityKWh: 40,
      chargingPowerKW: 20,
      efficiency: 1.0,
    });

    assert.equal(result.energyToAddKWh, 24);
    assert.equal(result.estimatedMinutes, 72);
    assert.equal(result.effectiveChargingPowerKW, 20);
  });

  it('should cap effective charging power by vehicle max charging power', () => {
    // 150 kW charger, but vehicle capped at 50 kW
    const result = estimateChargingTime({
      currentSoCPercent: 10,
      targetSoCPercent: 90,
      usableCapacityKWh: 50,
      chargingPowerKW: 150,
      maxVehicleChargingPowerKW: 50,
      efficiency: 1.0,
    });

    assert.equal(result.effectiveChargingPowerKW, 50);
    // 40 kWh added at 50 kW = 0.8 hrs = 48 mins
    assert.equal(result.energyToAddKWh, 40);
    assert.equal(result.estimatedMinutes, 48);
  });

  it('should apply charging state transition successfully', () => {
    const vehicle = createVehicleProfile({
      vehicleId: 'EV-TEST-1',
      batteryCapacityKWh: 60,
      usableBatteryCapacityKWh: 57,
      consumptionKWhPerKm: 0.15,
      maxChargingPowerKW: 100,
    });

    const initialState = createBatteryState(
      'EV-TEST-1',
      20, // 20% SoC
      vehicle.usableBatteryCapacityKWh,
      vehicle.consumptionKWhPerKm
    );

    assert.equal(initialState.socPercent, 20);

    const updatedState = applyChargingStateTransition(initialState, 80, vehicle);

    assert.equal(updatedState.vehicleId, 'EV-TEST-1');
    assert.equal(updatedState.socPercent, 80);
    assert.equal(updatedState.energyRemainingKWh, 45.6); // 80% of 57
    assert.equal(updatedState.estimatedRangeKm, 304); // 45.6 / 0.15
    assert.ok(updatedState.timestamp);
    assert.equal(updatedState.source, 'SIMULATION');
  });

  it('should throw error if target SoC is less than current SoC', () => {
    assert.throws(
      () => calculateChargingEnergy(80, 50, 60),
      /INVALID_CHARGING_INPUT: Target SoC cannot be less than current SoC/
    );
  });

  it('should throw error for out of bounds SoC values', () => {
    assert.throws(
      () => calculateChargingEnergy(-10, 80, 60),
      /INVALID_CHARGING_INPUT: Current SoC must be between 0 and 100/
    );
    assert.throws(
      () => calculateChargingEnergy(20, 110, 60),
      /INVALID_CHARGING_INPUT: Target SoC must be between 0 and 100/
    );
  });

  it('should throw error for invalid charging power or efficiency', () => {
    assert.throws(
      () =>
        estimateChargingTime({
          currentSoCPercent: 10,
          targetSoCPercent: 80,
          usableCapacityKWh: 50,
          chargingPowerKW: 0,
        }),
      /INVALID_CHARGING_INPUT: Charging power must be > 0/
    );

    assert.throws(
      () =>
        estimateChargingTime({
          currentSoCPercent: 10,
          targetSoCPercent: 80,
          usableCapacityKWh: 50,
          chargingPowerKW: 50,
          efficiency: 1.5,
        }),
      /INVALID_CHARGING_INPUT: Charging efficiency must be > 0 and <= 1.0/
    );
  });
});
