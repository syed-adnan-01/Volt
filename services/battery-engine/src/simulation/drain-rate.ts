/**
 * Drain-Rate Tracking & Anomaly Monitoring
 * Member 3 — Battery & EV Intelligence Subsystem
 */

import { batteryConfig } from '../config/thresholds.js';
import { BatteryValidationError } from '../validation/battery-validation.js';

export interface DrainRateEvaluation {
  /** Empirical observed consumption in kWh/km */
  observedKWhPerKm: number;
  /** Expected baseline consumption in kWh/km */
  expectedKWhPerKm: number;
  /** Percentage deviation from baseline (+ indicates higher drain than expected) */
  deviationPercent: number;
  /** True if observed consumption exceeds tolerance threshold */
  isElevated: boolean;
  /** Warning message if drain is anomalously high */
  alertMessage?: string;
}

/**
 * Calculates empirical consumption rate from observed energy consumed over distance.
 *
 * Formula: Observed Consumption = Energy Used (kWh) / Distance Travelled (km)
 */
export function calculateObservedConsumption(energyUsedKWh: number, distanceKm: number): number {
  if (distanceKm < 0 || !Number.isFinite(distanceKm)) {
    throw new BatteryValidationError(
      `Invalid distance ${distanceKm} km for drain calculation`,
      'INVALID_DISTANCE'
    );
  }

  if (distanceKm === 0) {
    return 0;
  }

  if (energyUsedKWh < 0 || !Number.isFinite(energyUsedKWh)) {
    throw new BatteryValidationError(
      `Invalid energy consumed ${energyUsedKWh} kWh`,
      'INVALID_ENERGY_VALUE'
    );
  }

  return Number((energyUsedKWh / distanceKm).toFixed(4));
}

/**
 * Calculates percentage deviation of observed consumption relative to baseline expected consumption.
 *
 * Formula: ((Observed - Expected) / Expected) * 100
 */
export function calculateDrainDeviation(observedKWhPerKm: number, expectedKWhPerKm: number): number {
  if (expectedKWhPerKm <= 0 || !Number.isFinite(expectedKWhPerKm)) {
    throw new BatteryValidationError(
      `Invalid baseline consumption ${expectedKWhPerKm} kWh/km`,
      'INVALID_CONSUMPTION_RATE'
    );
  }

  if (observedKWhPerKm < 0 || !Number.isFinite(observedKWhPerKm)) {
    throw new BatteryValidationError(
      `Invalid observed consumption ${observedKWhPerKm} kWh/km`,
      'INVALID_CONSUMPTION_RATE'
    );
  }

  const deviation = ((observedKWhPerKm - expectedKWhPerKm) / expectedKWhPerKm) * 100.0;
  return Number(deviation.toFixed(2));
}

/**
 * Evaluates observed drain rate against expected baseline and tolerance thresholds.
 */
export function evaluateDrainRateRisk(
  observedKWhPerKm: number,
  expectedKWhPerKm: number,
  tolerancePercent = batteryConfig.drainDeviationTolerancePercent
): DrainRateEvaluation {
  const deviationPercent = calculateDrainDeviation(observedKWhPerKm, expectedKWhPerKm);
  const isElevated = deviationPercent > tolerancePercent;

  let alertMessage: string | undefined;
  if (isElevated) {
    alertMessage = `High battery drain detected: ${observedKWhPerKm.toFixed(3)} kWh/km (${deviationPercent > 0 ? '+' : ''}${deviationPercent.toFixed(1)}% vs expected ${expectedKWhPerKm.toFixed(3)} kWh/km)`;
  }

  return {
    observedKWhPerKm,
    expectedKWhPerKm,
    deviationPercent,
    isElevated,
    alertMessage,
  };
}
