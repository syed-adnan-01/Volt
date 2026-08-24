import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateSafetyMargin,
  checkReachability,
  evaluateRouteBattery,
} from '../src/reachability/reachability.js';

describe('Reachability & Safety Margin Calculations', () => {
  it('should calculate positive safety margin for safe routes', () => {
    // Arrival SoC = 24%, Reserve = 10% -> Margin = +14%
    const margin = calculateSafetyMargin(24, 10);
    assert.strictEqual(margin, 14);
    assert.strictEqual(checkReachability(24, 10), true);
  });

  it('should calculate negative safety margin for unreachable routes', () => {
    // Arrival SoC = 4%, Reserve = 10% -> Margin = -6%
    const margin = calculateSafetyMargin(4, 10);
    assert.strictEqual(margin, -6);
    assert.strictEqual(checkReachability(4, 10), false);
  });

  it('should treat boundary equal to reserve as reachable with 0 margin', () => {
    const margin = calculateSafetyMargin(10, 10);
    assert.strictEqual(margin, 0);
    assert.strictEqual(checkReachability(10, 10), true);
  });

  it('should evaluate full route battery result correctly for reachable leg', () => {
    const result = evaluateRouteBattery({
      distanceKm: 50,
      currentSoCPercent: 60,
      usableCapacityKWh: 40,
      consumptionKWhPerKm: 0.15,
      reserveSoCPercent: 10,
      batteryHealthPercent: 95,
    });

    // 50 km * 0.15 = 7.5 kWh required
    assert.strictEqual(result.energyRequiredKWh, 7.5);
    // Start energy = 24 kWh, arrival energy = 16.5 kWh -> arrival SoC = 41.25%
    assert.strictEqual(result.arrivalSoC, 41.25);
    assert.strictEqual(result.reachable, true);
    assert.strictEqual(result.safetyMarginPercent, 31.25);
    assert.strictEqual(result.batteryHealthPercent, 95);
    assert.ok(result.riskScore < 0.5, 'Risk score should be low for safe margin');
    assert.ok(result.estimatedRangeKm > 100);
  });

  it('should evaluate route as unreachable when battery is insufficient', () => {
    const result = evaluateRouteBattery({
      distanceKm: 200,
      currentSoCPercent: 30, // 12 kWh available
      usableCapacityKWh: 40,
      consumptionKWhPerKm: 0.15, // 30 kWh required
      reserveSoCPercent: 10,
    });

    assert.strictEqual(result.energyRequiredKWh, 30);
    assert.strictEqual(result.arrivalSoC, -45);
    assert.strictEqual(result.reachable, false);
    assert.strictEqual(result.safetyMarginPercent, -55);
    assert.strictEqual(result.riskScore, 1.0);
    assert.strictEqual(result.estimatedRangeKm, 0);
  });
});
