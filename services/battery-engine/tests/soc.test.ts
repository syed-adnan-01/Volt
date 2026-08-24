import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateArrivalSoC,
  calculateSoCFromEnergy,
  calculateEnergyFromSoC,
} from '../src/calculations/soc.js';

describe('State of Charge (SoC) Calculations', () => {
  it('should correctly calculate arrival SoC', () => {
    // 40 kWh capacity, start at 70% (28 kWh), consume 18 kWh -> 10 kWh remaining -> 25% SoC
    const arrivalSoC = calculateArrivalSoC(70, 40, 18);
    assert.strictEqual(arrivalSoC, 25);
  });

  it('should handle negative arrival SoC for unreachable routes', () => {
    // 40 kWh capacity, start at 20% (8 kWh), consume 12 kWh -> -4 kWh -> -10% SoC
    const arrivalSoC = calculateArrivalSoC(20, 40, 12);
    assert.strictEqual(arrivalSoC, -10);
  });

  it('should convert energy to SoC correctly', () => {
    assert.strictEqual(calculateSoCFromEnergy(24, 40), 60);
  });

  it('should convert SoC to energy correctly', () => {
    assert.strictEqual(calculateEnergyFromSoC(60, 40), 24);
  });

  it('should validate inputs', () => {
    assert.throws(() => calculateArrivalSoC(120, 40, 10), /SoC percent must be between 0 and 100/);
    assert.throws(() => calculateArrivalSoC(50, 0, 10), /Usable capacity must be greater than zero/);
  });
});
