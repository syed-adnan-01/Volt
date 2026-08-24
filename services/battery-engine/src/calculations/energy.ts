/**
 * Energy Consumption Calculations
 * Member 3 — Battery & EV Intelligence Subsystem
 */

/**
 * Calculates energy required (kWh) to cover a given route distance (km).
 * Formula: Energy = Distance (km) * Consumption (kWh/km)
 */
export function calculateEnergyRequired(
  distanceKm: number,
  consumptionKWhPerKm: number
): number {
  if (distanceKm < 0) {
    throw new Error('Distance cannot be negative');
  }
  if (consumptionKWhPerKm <= 0) {
    throw new Error('Consumption rate must be greater than zero');
  }

  const energy = distanceKm * consumptionKWhPerKm;
  return Number(energy.toFixed(4));
}

/** Converts kWh/100km to kWh/km */
export function kwhPer100KmToKwhPerKm(kwhPer100Km: number): number {
  return kwhPer100Km / 100.0;
}

/** Converts kWh/km to kWh/100km */
export function kwhPerKmToKwhPer100Km(kwhPerKm: number): number {
  return kwhPerKm * 100.0;
}

/** Converts kilometers to meters */
export function kmToMeters(km: number): number {
  return km * 1000.0;
}

/** Converts meters to kilometers */
export function metersToKm(meters: number): number {
  return meters / 1000.0;
}
