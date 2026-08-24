import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateEnergyRequired,
  kwhPer100KmToKwhPerKm,
  kwhPerKmToKwhPer100Km,
  kmToMeters,
  metersToKm,
} from '../src/calculations/energy.js';

describe('Energy Consumption Calculations', () => {
  it('should correctly calculate energy required for route', () => {
    // 100 km @ 0.15 kWh/km = 15 kWh
    const energy = calculateEnergyRequired(100, 0.15);
    assert.strictEqual(energy, 15);
  });

  it('should return 0 energy for 0 distance', () => {
    const energy = calculateEnergyRequired(0, 0.15);
    assert.strictEqual(energy, 0);
  });

  it('should throw error on negative distance', () => {
    assert.throws(() => calculateEnergyRequired(-10, 0.15), /Distance cannot be negative/);
  });

  it('should throw error on non-positive consumption rate', () => {
    assert.throws(() => calculateEnergyRequired(50, 0), /Consumption rate must be greater than zero/);
  });

  it('should correctly convert unit rates', () => {
    assert.strictEqual(kwhPer100KmToKwhPerKm(15), 0.15);
    assert.strictEqual(kwhPerKmToKwhPer100Km(0.15), 15);
    assert.strictEqual(kmToMeters(48.2), 48200);
    assert.strictEqual(metersToKm(48200), 48.2);
  });
});
