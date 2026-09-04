// ──────────────────────────────────────────────
// Battery Engine Client (Member 3 Integration)
// Connects directly with @volt/battery-engine for
// reachability, SoC, battery risk, and charging time.
// ──────────────────────────────────────────────

import {
  evaluateRouteBattery,
  evaluateMultiStopRoute,
  type VehicleBatteryProfile,
} from '@volt/battery-engine';
import type { BatteryResult, MultiStopLegInput, MultiStopBatteryResult } from '@volt/contracts';

export interface VehicleProfileInput {
  vehicleId?: string;
  name?: string;
  batteryCapacityKwh?: number;
  usableCapacityKwh?: number;
  consumptionKwhPerKm?: number;
  reserveSoCPercent?: number;
  batteryHealthPercent?: number;
  maxChargingPowerKW?: number;
}

/**
 * Checks EV battery reachability and arrival SoC for a given route distance
 * using Member 3's high-precision battery model.
 */
export async function checkReachability(
  vehicleId: string,
  currentSoC: number,
  distanceKm: number,
  vehicleProfile?: VehicleProfileInput
): Promise<BatteryResult> {
  const profile: VehicleBatteryProfile = {
    vehicleId: vehicleProfile?.vehicleId ?? vehicleId,
    batteryCapacityKWh: vehicleProfile?.batteryCapacityKwh ?? 82.0,
    usableBatteryCapacityKWh: vehicleProfile?.usableCapacityKwh ?? 77.0,
    consumptionKWhPerKm: vehicleProfile?.consumptionKwhPerKm ?? 0.16,
    reserveSoCPercent: vehicleProfile?.reserveSoCPercent ?? 10.0,
    batteryHealthPercent: vehicleProfile?.batteryHealthPercent ?? 100.0,
    maxChargingPowerKW: vehicleProfile?.maxChargingPowerKW ?? 150.0,
  };

  const evalResult = evaluateRouteBattery({
    distanceKm,
    currentSoCPercent: currentSoC,
    usableCapacityKWh: profile.usableBatteryCapacityKWh,
    consumptionKWhPerKm: profile.consumptionKWhPerKm,
    reserveSoCPercent: profile.reserveSoCPercent,
    batteryHealthPercent: profile.batteryHealthPercent,
  });

  return {
    currentSoC,
    arrivalSoC: evalResult.arrivalSoC,
    energyRequiredKWh: evalResult.energyRequiredKWh,
    reachable: evalResult.reachable,
    riskScore: evalResult.riskScore,
    safetyMarginPercent: evalResult.safetyMarginPercent,
  };
}

/**
 * Evaluates full battery state transitions across a multi-stop journey.
 */
export function evaluateMultiStopBattery(
  initialSoCPercent: number,
  legs: MultiStopLegInput[],
  vehicleProfile?: VehicleProfileInput
): MultiStopBatteryResult {
  const profile: VehicleBatteryProfile = {
    vehicleId: vehicleProfile?.vehicleId ?? 'vehicle-multistop',
    batteryCapacityKWh: vehicleProfile?.batteryCapacityKwh ?? 82.0,
    usableBatteryCapacityKWh: vehicleProfile?.usableCapacityKwh ?? 77.0,
    consumptionKWhPerKm: vehicleProfile?.consumptionKwhPerKm ?? 0.16,
    reserveSoCPercent: vehicleProfile?.reserveSoCPercent ?? 10.0,
    batteryHealthPercent: vehicleProfile?.batteryHealthPercent ?? 100.0,
    maxChargingPowerKW: vehicleProfile?.maxChargingPowerKW ?? 150.0,
  };

  return evaluateMultiStopRoute(initialSoCPercent, legs, profile);
}
