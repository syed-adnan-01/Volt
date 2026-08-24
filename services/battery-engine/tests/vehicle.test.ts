import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createVehicleProfile } from '../src/models/vehicle.js';
import { validateVehicleProfile } from '../src/validation/battery-validation.js';

describe('Vehicle Model & Validation', () => {
  it('should create a vehicle profile with defaults', () => {
    const vehicle = createVehicleProfile({ vehicleId: 'V1' });
    assert.strictEqual(vehicle.vehicleId, 'V1');
    assert.strictEqual(vehicle.batteryCapacityKWh, 60.0);
    assert.strictEqual(vehicle.usableBatteryCapacityKWh, 57.0); // 95% of 60
    assert.strictEqual(vehicle.consumptionKWhPerKm, 0.15);
    assert.strictEqual(vehicle.batteryHealthPercent, 100);
  });

  it('should validate a valid vehicle profile', () => {
    const vehicle = createVehicleProfile({ vehicleId: 'V1' });
    assert.doesNotThrow(() => validateVehicleProfile(vehicle));
  });

  it('should throw INVALID_VEHICLE_PROFILE on zero capacity', () => {
    const vehicle = createVehicleProfile({ vehicleId: 'V1', batteryCapacityKWh: 0 });
    assert.throws(() => validateVehicleProfile(vehicle), /INVALID_VEHICLE_PROFILE: Battery capacity must be > 0/);
  });

  it('should throw INVALID_VEHICLE_PROFILE on invalid health', () => {
    const vehicle = createVehicleProfile({ vehicleId: 'V1' });
    vehicle.batteryHealthPercent = 110;
    assert.throws(() => validateVehicleProfile(vehicle), /INVALID_VEHICLE_PROFILE: Battery health must be between 0 and 100/);
  });

  it('should throw INVALID_CONSUMPTION_RATE on negative consumption', () => {
    const vehicle = createVehicleProfile({ vehicleId: 'V1', consumptionKWhPerKm: -0.1 });
    assert.throws(() => validateVehicleProfile(vehicle), /INVALID_CONSUMPTION_RATE: Consumption must be > 0/);
  });
});
