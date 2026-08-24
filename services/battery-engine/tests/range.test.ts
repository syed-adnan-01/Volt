import { describe, it } from 'node:test';
import assert from 'node:assert';
import { estimateRemainingRange, estimateRangeFromSoC } from '../src/calculations/range.js';

describe('Range Estimation Calculations', () => {
  it('should estimate remaining range correctly', () => {
    // 24 kWh energy remaining @ 0.15 kWh/km = 160 km
    const range = estimateRemainingRange(24, 0.15);
    assert.strictEqual(range, 160);
  });

  it('should return 0 range for 0 energy', () => {
    const range = estimateRemainingRange(0, 0.15);
    assert.strictEqual(range, 0);
  });

  it('should estimate range from SoC percentage', () => {
    // 60% SoC on 40 kWh battery (24 kWh) @ 0.15 kWh/km = 160 km
    const range = estimateRangeFromSoC(60, 40, 0.15);
    assert.strictEqual(range, 160);
  });

  it('should handle zero SoC gracefully', () => {
    assert.strictEqual(estimateRangeFromSoC(0, 40, 0.15), 0);
  });
});
