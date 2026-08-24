/**
 * Live / Simulated Battery State Model
 * Member 3 — Battery & EV Intelligence Subsystem
 */

export type BatteryStateSource = 'SIMULATION' | 'TELEMETRY' | 'OBD' | 'MANUAL';

export interface BatteryState {
  /** Target vehicle identifier */
  vehicleId: string;
  /** Current state of charge (0 to 100%) */
  socPercent: number;
  /** Current usable energy remaining in battery (kWh) */
  energyRemainingKWh: number;
  /** Estimated driving range with remaining energy (km) */
  estimatedRangeKm: number;
  /** Current battery health percentage (0 to 100%) */
  batteryHealthPercent: number;
  /** ISO timestamp of reading */
  timestamp: string;
  /** Source origin of the battery reading */
  source: BatteryStateSource;
}

/**
 * Creates a BatteryState snapshot from current SoC and Vehicle Profile.
 */
export function createBatteryState(
  vehicleId: string,
  socPercent: number,
  usableCapacityKWh: number,
  consumptionKWhPerKm: number,
  batteryHealthPercent = 100,
  source: BatteryStateSource = 'SIMULATION'
): BatteryState {
  const clampedSoC = Math.min(100, Math.max(0, socPercent));
  const energyRemainingKWh = (clampedSoC / 100.0) * usableCapacityKWh;
  const estimatedRangeKm = consumptionKWhPerKm > 0 ? energyRemainingKWh / consumptionKWhPerKm : 0;

  return {
    vehicleId,
    socPercent: clampedSoC,
    energyRemainingKWh: Number(energyRemainingKWh.toFixed(3)),
    estimatedRangeKm: Number(estimatedRangeKm.toFixed(2)),
    batteryHealthPercent,
    timestamp: new Date().toISOString(),
    source,
  };
}
