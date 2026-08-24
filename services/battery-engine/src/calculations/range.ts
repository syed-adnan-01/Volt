/**
 * Range Estimation Calculations
 * Member 3 — Battery & EV Intelligence Subsystem
 */

/**
 * Estimates driving range (km) based on available energy (kWh) and consumption rate (kWh/km).
 */
export function estimateRemainingRange(
  energyRemainingKWh: number,
  consumptionKWhPerKm: number
): number {
  if (energyRemainingKWh <= 0) {
    return 0;
  }
  if (consumptionKWhPerKm <= 0) {
    throw new Error('Consumption rate must be greater than zero');
  }

  const range = energyRemainingKWh / consumptionKWhPerKm;
  return Number(range.toFixed(2));
}

/**
 * Estimates driving range directly from SoC percentage and vehicle specifications.
 */
export function estimateRangeFromSoC(
  socPercent: number,
  usableCapacityKWh: number,
  consumptionKWhPerKm: number
): number {
  if (socPercent <= 0) {
    return 0;
  }
  const energyKWh = (Math.min(100, Math.max(0, socPercent)) / 100.0) * usableCapacityKWh;
  return estimateRemainingRange(energyKWh, consumptionKWhPerKm);
}
