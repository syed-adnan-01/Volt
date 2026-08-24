/**
 * Vehicle Battery Profile Model
 * Member 3 — Battery & EV Intelligence Subsystem
 */

export interface VehicleBatteryProfile {
  /** Unique vehicle identifier */
  vehicleId: string;
  /** Display vehicle name/model */
  name?: string;
  /** Total nominal battery capacity (kWh) */
  batteryCapacityKWh: number;
  /** Usable battery capacity accounting for buffer reserves (kWh) */
  usableBatteryCapacityKWh: number;
  /** Average energy consumption rate (kWh/km) */
  consumptionKWhPerKm: number;
  /** State of battery health percentage (0-100%) */
  batteryHealthPercent: number;
  /** Minimum reserve SoC percentage for safety (e.g., 10%) */
  reserveSoCPercent: number;
  /** Maximum supported fast charging rate (kW) */
  maxChargingPowerKW: number;
  /** Charging curve identifier/type */
  chargingCurveType?: string;
}

/**
 * Creates a default normalized VehicleBatteryProfile.
 */
export function createVehicleProfile(
  partial: Partial<VehicleBatteryProfile> & { vehicleId: string }
): VehicleBatteryProfile {
  const capacity = partial.batteryCapacityKWh ?? 60.0;
  return {
    vehicleId: partial.vehicleId,
    name: partial.name ?? 'Standard EV',
    batteryCapacityKWh: capacity,
    usableBatteryCapacityKWh: partial.usableBatteryCapacityKWh ?? capacity * 0.95,
    consumptionKWhPerKm: partial.consumptionKWhPerKm ?? 0.15,
    batteryHealthPercent: Math.min(100, Math.max(0, partial.batteryHealthPercent ?? 100)),
    reserveSoCPercent: partial.reserveSoCPercent ?? 10.0,
    maxChargingPowerKW: partial.maxChargingPowerKW ?? 100.0,
    chargingCurveType: partial.chargingCurveType ?? 'standard_fast',
  };
}
