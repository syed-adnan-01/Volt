/**
 * State of Charge (SoC) Calculations
 * Member 3 — Battery & EV Intelligence Subsystem
 */

/**
 * Calculates remaining SoC (%) after consuming a given amount of energy (kWh).
 */
export function calculateArrivalSoC(
  currentSoCPercent: number,
  usableCapacityKWh: number,
  energyRequiredKWh: number
): number {
  if (currentSoCPercent < 0 || currentSoCPercent > 100) {
    throw new Error('Current SoC percent must be between 0 and 100');
  }
  if (usableCapacityKWh <= 0) {
    throw new Error('Usable capacity must be greater than zero');
  }

  const currentEnergyKWh = (currentSoCPercent / 100.0) * usableCapacityKWh;
  const arrivalEnergyKWh = currentEnergyKWh - energyRequiredKWh;
  const arrivalSoC = (arrivalEnergyKWh / usableCapacityKWh) * 100.0;

  return Number(arrivalSoC.toFixed(2));
}

/**
 * Converts stored energy (kWh) to SoC percentage (0-100%).
 */
export function calculateSoCFromEnergy(
  energyKWh: number,
  usableCapacityKWh: number
): number {
  if (usableCapacityKWh <= 0) {
    throw new Error('Usable capacity must be greater than zero');
  }
  const soc = (energyKWh / usableCapacityKWh) * 100.0;
  return Number(Math.min(100, Math.max(0, soc)).toFixed(2));
}

/**
 * Converts SoC percentage (0-100%) to stored energy (kWh).
 */
export function calculateEnergyFromSoC(
  socPercent: number,
  usableCapacityKWh: number
): number {
  if (usableCapacityKWh <= 0) {
    throw new Error('Usable capacity must be greater than zero');
  }
  const clampedSoC = Math.min(100, Math.max(0, socPercent));
  const energy = (clampedSoC / 100.0) * usableCapacityKWh;
  return Number(energy.toFixed(4));
}
