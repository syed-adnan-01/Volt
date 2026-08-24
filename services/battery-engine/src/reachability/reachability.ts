/**
 * Reachability & Safety Margin Calculations
 * Member 3 — Battery & EV Intelligence Subsystem
 */

import { batteryConfig } from '../config/thresholds.js';
import { calculateEnergyRequired } from '../calculations/energy.js';
import { calculateArrivalSoC, calculateEnergyFromSoC } from '../calculations/soc.js';
import { estimateRemainingRange } from '../calculations/range.js';
import { calculateBatteryRisk } from '../risk/battery-risk.js';
import { BatteryRouteInput, BatteryRouteResult } from '../models/battery-result.js';

/**
 * Calculates safety margin (percentage points above minimum safe buffer).
 * Positive = safe margin, Negative = below buffer / unreachable.
 */
export function calculateSafetyMargin(
  arrivalSoCPercent: number,
  minimumSafeSoCPercent = batteryConfig.defaultReserveSoCPercent
): number {
  return Number((arrivalSoCPercent - minimumSafeSoCPercent).toFixed(2));
}

/**
 * Determines whether a destination/charger is reachable with required safety buffer.
 */
export function checkReachability(
  arrivalSoCPercent: number,
  minimumSafeSoCPercent = batteryConfig.defaultReserveSoCPercent
): boolean {
  return arrivalSoCPercent >= minimumSafeSoCPercent;
}

/**
 * Evaluates full battery feasibility and risk for a candidate route segment.
 * Returns the standardized BatteryRouteResult for the Route Optimizer (Member 5).
 */
export function evaluateRouteBattery(input: BatteryRouteInput): BatteryRouteResult {
  const minSafeSoC = input.reserveSoCPercent ?? batteryConfig.defaultReserveSoCPercent;
  const healthPercent = input.batteryHealthPercent ?? 100;

  // 1. Calculate required energy for leg
  const energyRequiredKWh = calculateEnergyRequired(
    input.distanceKm,
    input.consumptionKWhPerKm
  );

  // 2. Calculate projected arrival SoC
  const arrivalSoC = calculateArrivalSoC(
    input.currentSoCPercent,
    input.usableCapacityKWh,
    energyRequiredKWh
  );

  // 3. Determine safety margin and reachability
  const safetyMargin = calculateSafetyMargin(arrivalSoC, minSafeSoC);
  const reachable = checkReachability(arrivalSoC, minSafeSoC);

  // 4. Calculate normalized battery risk score
  const riskScore = calculateBatteryRisk(arrivalSoC, minSafeSoC, healthPercent);

  // 5. Calculate remaining range at arrival
  const remainingEnergyAtArrival = calculateEnergyFromSoC(
    Math.max(0, arrivalSoC),
    input.usableCapacityKWh
  );
  const estimatedRangeKm = estimateRemainingRange(
    remainingEnergyAtArrival,
    input.consumptionKWhPerKm
  );

  return {
    currentSoC: input.currentSoCPercent,
    arrivalSoC,
    energyRequiredKWh,
    reachable,
    riskScore,
    minimumSafeSoCPercent: minSafeSoC,
    safetyMarginPercent: safetyMargin,
    batteryHealthPercent: healthPercent,
    estimatedRangeKm,
  };
}
