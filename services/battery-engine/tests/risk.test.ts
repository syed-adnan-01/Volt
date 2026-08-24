import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateBatteryRisk } from '../src/risk/battery-risk.js';

describe('Battery Risk Scoring Model', () => {
  it('should return maximum risk (1.0) when arrival SoC is below minimum safe buffer', () => {
    // Arrival SoC = 8%, Reserve = 10%
    const risk = calculateBatteryRisk(8, 10, 100);
    assert.strictEqual(risk, 1.0);
  });

  it('should return maximum risk (1.0) when arrival SoC equals minimum safe buffer', () => {
    const risk = calculateBatteryRisk(10, 10, 100);
    assert.strictEqual(risk, 1.0);
  });

  it('should return low risk for high arrival SoC and good battery health', () => {
    // Arrival SoC = 80%, Reserve = 10%, Health = 100%
    const risk = calculateBatteryRisk(80, 10, 100);
    assert.ok(risk < 0.1, `Expected risk < 0.1, got ${risk}`);
  });

  it('should return higher risk for tight arrival SoC margins', () => {
    const tightRisk = calculateBatteryRisk(13, 10, 100);
    const safeRisk = calculateBatteryRisk(50, 10, 100);
    assert.ok(tightRisk > safeRisk, 'Tight margin should have higher risk than safe margin');
    assert.ok(tightRisk > 0.5, `Expected tight margin risk > 0.5, got ${tightRisk}`);
  });

  it('should apply higher risk for degraded battery health', () => {
    // Same arrival SoC (30%), compare 100% health vs 70% health
    const healthyRisk = calculateBatteryRisk(30, 10, 100);
    const degradedRisk = calculateBatteryRisk(30, 10, 70);

    assert.ok(degradedRisk > healthyRisk, 'Degraded health must yield higher risk score');
    // Difference should reflect health penalty
    assert.ok(degradedRisk - healthyRisk >= 0.05);
  });
});
