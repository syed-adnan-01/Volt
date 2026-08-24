/**
 * Battery Risk Scoring Model
 * Member 3 — Battery & EV Intelligence Subsystem
 */

import { batteryConfig } from '../config/thresholds.js';

export interface BatteryRiskInput {
  arrivalSoCPercent: number;
  minimumSafeSoCPercent?: number;
  batteryHealthPercent?: number;
}

/**
 * Calculates a normalized battery risk score (0.0 = safe, 1.0 = critical/infeasible).
 *
 * Factors evaluated:
 * - Safety margin above minimum safe buffer
 * - Battery health condition penalty
 * - Proximity to low battery thresholds
 */
export function calculateBatteryRisk(
  arrivalSoCPercent: number,
  minimumSafeSoCPercent = batteryConfig.defaultReserveSoCPercent,
  batteryHealthPercent = 100
): number {
  // If arrival SoC is below minimum threshold, maximum risk
  if (arrivalSoCPercent <= minimumSafeSoCPercent) {
    return 1.0;
  }

  const clampedHealth = Math.min(100, Math.max(0, batteryHealthPercent));
  const safetyMargin = arrivalSoCPercent - minimumSafeSoCPercent;
  const maxPossibleMargin = 100 - minimumSafeSoCPercent;

  // Normalized margin factor: 1.0 when at 100% arrival SoC, 0.0 when at threshold
  const marginRatio = Math.min(1, Math.max(0, safetyMargin / maxPossibleMargin));
  
  // Margin risk: rises non-linearly as margin becomes thinner
  const marginRisk = Math.pow(1 - marginRatio, 2);

  // Health risk penalty: up to 0.25 extra risk for heavily degraded batteries
  const healthPenalty = ((100 - clampedHealth) / 100) * 0.25;

  // Combine and clamp risk between 0.0 and 1.0
  const totalRisk = Math.min(1.0, Math.max(0.0, marginRisk * 0.75 + healthPenalty));

  return Number(totalRisk.toFixed(3));
}
