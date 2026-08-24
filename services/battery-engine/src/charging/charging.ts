/**
 * Charging Energy, Charging Time & State Transitions
 * Member 3 — Battery & EV Intelligence Subsystem
 */

import { BatteryState } from '../models/battery-state.js';
import { VehicleBatteryProfile } from '../models/vehicle.js';
import {
  validateBatteryState,
  validateVehicleProfile,
  validateChargingInput,
} from '../validation/battery-validation.js';

export interface ChargingTimeInput {
  /** Current state of charge (%) */
  currentSoCPercent: number;
  /** Target state of charge (%) */
  targetSoCPercent: number;
  /** Usable battery capacity (kWh) */
  usableCapacityKWh: number;
  /** Maximum output power of charging station (kW) */
  chargingPowerKW: number;
  /** Optional vehicle max charging rate constraint (kW) */
  maxVehicleChargingPowerKW?: number;
  /** Charging efficiency factor (0.0 to 1.0, defaults to 0.95) */
  efficiency?: number;
}

export interface ChargingEnergyResult {
  /** Net energy added to the battery (kWh) */
  energyToAddKWh: number;
  /** Gross energy consumed from grid / charger accounting for efficiency (kWh) */
  energyFromChargerKWh: number;
}

export interface ChargingTimeResult extends ChargingEnergyResult {
  /** Estimated charging duration in minutes */
  estimatedMinutes: number;
  /** Effective charging power applied considering vehicle & station limits (kW) */
  effectiveChargingPowerKW: number;
}

/**
 * Calculates net energy required to charge to target SoC and gross energy drawn from charger.
 */
export function calculateChargingEnergy(
  currentSoCPercent: number,
  targetSoCPercent: number,
  usableCapacityKWh: number,
  efficiency = 0.95
): ChargingEnergyResult {
  validateChargingInput(currentSoCPercent, targetSoCPercent, usableCapacityKWh, 50.0, efficiency);

  const socDeltaPercent = targetSoCPercent - currentSoCPercent;
  const energyToAddKWh = (socDeltaPercent / 100.0) * usableCapacityKWh;
  const energyFromChargerKWh = energyToAddKWh / efficiency;

  return {
    energyToAddKWh: Number(energyToAddKWh.toFixed(3)),
    energyFromChargerKWh: Number(energyFromChargerKWh.toFixed(3)),
  };
}

/**
 * Estimates total charging time in minutes based on charger power, vehicle limits, and efficiency.
 */
export function estimateChargingTime(input: ChargingTimeInput): ChargingTimeResult {
  const efficiency = input.efficiency ?? 0.95;
  const effectivePowerKW = input.maxVehicleChargingPowerKW
    ? Math.min(input.chargingPowerKW, input.maxVehicleChargingPowerKW)
    : input.chargingPowerKW;

  validateChargingInput(
    input.currentSoCPercent,
    input.targetSoCPercent,
    input.usableCapacityKWh,
    effectivePowerKW,
    efficiency
  );

  const energyResult = calculateChargingEnergy(
    input.currentSoCPercent,
    input.targetSoCPercent,
    input.usableCapacityKWh,
    efficiency
  );

  const timeHours = energyResult.energyToAddKWh / (effectivePowerKW * efficiency);
  const estimatedMinutes = timeHours * 60.0;

  return {
    ...energyResult,
    estimatedMinutes: Number(estimatedMinutes.toFixed(2)),
    effectiveChargingPowerKW: Number(effectivePowerKW.toFixed(2)),
  };
}

/**
 * Applies a charging state transition to update a vehicle's BatteryState snapshot.
 */
export function applyChargingStateTransition(
  currentState: BatteryState,
  targetSoCPercent: number,
  vehicle: VehicleBatteryProfile
): BatteryState {
  validateBatteryState(currentState);
  validateVehicleProfile(vehicle);
  validateChargingInput(
    currentState.socPercent,
    targetSoCPercent,
    vehicle.usableBatteryCapacityKWh,
    vehicle.maxChargingPowerKW
  );

  const clampedTargetSoC = Math.min(100, Math.max(currentState.socPercent, targetSoCPercent));
  const newEnergyRemainingKWh = (clampedTargetSoC / 100.0) * vehicle.usableBatteryCapacityKWh;
  const newEstimatedRangeKm =
    vehicle.consumptionKWhPerKm > 0 ? newEnergyRemainingKWh / vehicle.consumptionKWhPerKm : 0;

  return {
    vehicleId: currentState.vehicleId,
    socPercent: clampedTargetSoC,
    energyRemainingKWh: Number(newEnergyRemainingKWh.toFixed(3)),
    estimatedRangeKm: Number(newEstimatedRangeKm.toFixed(2)),
    batteryHealthPercent: currentState.batteryHealthPercent,
    timestamp: new Date().toISOString(),
    source: currentState.source,
  };
}
