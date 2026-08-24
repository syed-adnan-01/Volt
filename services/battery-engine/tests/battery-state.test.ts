import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createBatteryState } from '../src/models/battery-state.js';
import { validateBatteryState } from '../src/validation/battery-validation.js';

describe('BatteryState Model & Validation', () => {
  it('should create a valid battery state', () => {
    const state = createBatteryState('V1', 50, 60.0, 0.15, 100, 'SIMULATION');
    assert.strictEqual(state.vehicleId, 'V1');
    assert.strictEqual(state.socPercent, 50);
    assert.strictEqual(state.energyRemainingKWh, 30.0);
    assert.strictEqual(state.estimatedRangeKm, 200.0);
    assert.strictEqual(state.source, 'SIMULATION');
  });

  it('should clamp SoC between 0 and 100 on creation', () => {
    const state = createBatteryState('V1', 120, 60.0, 0.15);
    assert.strictEqual(state.socPercent, 100);
    
    const state2 = createBatteryState('V1', -10, 60.0, 0.15);
    assert.strictEqual(state2.socPercent, 0);
  });

  it('should validate a valid battery state', () => {
    const state = createBatteryState('V1', 50, 60.0, 0.15);
    assert.doesNotThrow(() => validateBatteryState(state));
  });

  it('should throw INVALID_BATTERY_STATE on negative energy', () => {
    const state = createBatteryState('V1', 50, 60.0, 0.15);
    state.energyRemainingKWh = -5;
    assert.throws(() => validateBatteryState(state), /INVALID_BATTERY_STATE: Energy remaining cannot be negative/);
  });

  it('should throw INVALID_BATTERY_STATE on invalid SoC', () => {
    const state = createBatteryState('V1', 50, 60.0, 0.15);
    state.socPercent = 101;
    assert.throws(() => validateBatteryState(state), /INVALID_BATTERY_STATE: SoC must be between 0 and 100/);
  });
});
