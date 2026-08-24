import { VehicleBatteryProfile } from '../models/vehicle.js';
import { BatteryState } from '../models/battery-state.js';

export class BatteryValidationError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'BATTERY_VALIDATION_ERROR') {
    super(`${code}: ${message}`);
    this.name = 'BatteryValidationError';
    this.code = code;
  }
}

/**
 * Validates a VehicleBatteryProfile against hard rules.
 */
export function validateVehicleProfile(profile: VehicleBatteryProfile): void {
  if (profile.batteryCapacityKWh <= 0) {
    throw new Error('INVALID_VEHICLE_PROFILE: Battery capacity must be > 0');
  }
  if (profile.usableBatteryCapacityKWh <= 0) {
    throw new Error('INVALID_VEHICLE_PROFILE: Usable capacity must be > 0');
  }
  if (profile.usableBatteryCapacityKWh > profile.batteryCapacityKWh) {
    throw new Error('INVALID_VEHICLE_PROFILE: Usable capacity cannot exceed total capacity');
  }
  if (profile.consumptionKWhPerKm <= 0) {
    throw new Error('INVALID_CONSUMPTION_RATE: Consumption must be > 0');
  }
  if (profile.maxChargingPowerKW <= 0) {
    throw new Error('INVALID_CHARGING_POWER: Charging power must be > 0');
  }
  if (profile.batteryHealthPercent < 0 || profile.batteryHealthPercent > 100) {
    throw new Error('INVALID_VEHICLE_PROFILE: Battery health must be between 0 and 100');
  }
  if (profile.reserveSoCPercent < 0 || profile.reserveSoCPercent > 100) {
    throw new Error('INVALID_VEHICLE_PROFILE: Reserve SoC must be between 0 and 100');
  }
}

/**
 * Validates a BatteryState against hard rules.
 */
export function validateBatteryState(state: BatteryState): void {
  if (state.socPercent < 0 || state.socPercent > 100) {
    throw new Error('INVALID_BATTERY_STATE: SoC must be between 0 and 100');
  }
  if (state.energyRemainingKWh < 0) {
    throw new Error('INVALID_BATTERY_STATE: Energy remaining cannot be negative');
  }
  if (state.batteryHealthPercent < 0 || state.batteryHealthPercent > 100) {
    throw new Error('INVALID_BATTERY_STATE: Battery health must be between 0 and 100');
  }
  if (state.estimatedRangeKm < 0) {
    throw new Error('INVALID_BATTERY_STATE: Estimated range cannot be negative');
  }
}

/**
 * Validates parameters for charging energy & time calculations.
 */
export function validateChargingInput(
  currentSoCPercent: number,
  targetSoCPercent: number,
  usableCapacityKWh: number,
  chargingPowerKW = 50.0,
  efficiency = 1.0
): void {
  if (currentSoCPercent < 0 || currentSoCPercent > 100) {
    throw new Error('INVALID_CHARGING_INPUT: Current SoC must be between 0 and 100');
  }
  if (targetSoCPercent < 0 || targetSoCPercent > 100) {
    throw new Error('INVALID_CHARGING_INPUT: Target SoC must be between 0 and 100');
  }
  if (targetSoCPercent < currentSoCPercent) {
    throw new Error('INVALID_CHARGING_INPUT: Target SoC cannot be less than current SoC');
  }
  if (usableCapacityKWh <= 0) {
    throw new Error('INVALID_CHARGING_INPUT: Usable battery capacity must be > 0');
  }
  if (chargingPowerKW <= 0) {
    throw new Error('INVALID_CHARGING_INPUT: Charging power must be > 0');
  }
  if (efficiency <= 0 || efficiency > 1.0) {
    throw new Error('INVALID_CHARGING_INPUT: Charging efficiency must be > 0 and <= 1.0');
  }
}

