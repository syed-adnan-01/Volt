export interface EVVehicle {
  batteryCapacityKwh: number;
  consumptionKwhPerKm: number;
  initialSoCPct: number;
  minSoCBufferPct: number;
  chargingPowerKw: number;
}

export interface EnergyStatus {
  distanceKm: number;
  energyConsumedKwh: number;
  remainingEnergyKwh: number;
  remainingSoCPct: number;
  isSoCSafe: boolean;
}

export const DEFAULT_EV_VEHICLE: EVVehicle = {
  batteryCapacityKwh: 60,
  consumptionKwhPerKm: 0.15,
  initialSoCPct: 100,
  minSoCBufferPct: 20,
  chargingPowerKw: 60
};

/**
 * Calculates energy consumed in kWh for a given distance in km.
 */
export function calculateEnergyConsumed(
  distanceKm: number,
  consumptionKwhPerKm: number
): number {
  return distanceKm * consumptionKwhPerKm;
}

/**
 * Calculates max drivable range in km from starting SoC down to target/buffer SoC.
 */
export function calculateMaxRangeKm(
  vehicle: EVVehicle = DEFAULT_EV_VEHICLE,
  startingSoCPct: number = vehicle.initialSoCPct,
  targetSoCPct: number = vehicle.minSoCBufferPct
): number {
  const usableSoCPct = Math.max(0, startingSoCPct - targetSoCPct);
  const usableEnergyKwh = (usableSoCPct / 100) * vehicle.batteryCapacityKwh;
  return usableEnergyKwh / vehicle.consumptionKwhPerKm;
}

/**
 * Evaluates remaining energy, SoC percentage, and safety status after traveling a given distance.
 */
export function calculateRemainingEnergy(
  distanceKm: number,
  startingEnergyKwh: number,
  vehicle: EVVehicle = DEFAULT_EV_VEHICLE
): EnergyStatus {
  const energyConsumedKwh = calculateEnergyConsumed(
    distanceKm,
    vehicle.consumptionKwhPerKm
  );
  const remainingEnergyKwh = startingEnergyKwh - energyConsumedKwh;
  const remainingSoCPct = (remainingEnergyKwh / vehicle.batteryCapacityKwh) * 100;
  const isSoCSafe = remainingSoCPct >= vehicle.minSoCBufferPct;

  return {
    distanceKm,
    energyConsumedKwh,
    remainingEnergyKwh,
    remainingSoCPct,
    isSoCSafe
  };
}

/**
 * Calculates the charging duration in minutes needed to charge from currentSoCPct to targetSoCPct.
 */
export function calculateChargingTimeMinutes(
  currentSoCPct: number,
  targetSoCPct: number,
  vehicle: EVVehicle = DEFAULT_EV_VEHICLE,
  chargerPowerKw: number = vehicle.chargingPowerKw
): number {
  const effectiveCurrentSoC = Math.max(0, currentSoCPct);
  if (targetSoCPct <= effectiveCurrentSoC) {
    return 0;
  }
  const socDiffPct = targetSoCPct - effectiveCurrentSoC;
  const energyNeededKwh = (socDiffPct / 100) * vehicle.batteryCapacityKwh;
  const hoursNeeded = energyNeededKwh / chargerPowerKw;
  return hoursNeeded * 60;
}

