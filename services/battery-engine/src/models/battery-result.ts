/**
 * Battery Engine Output Result Models
 * Member 3 — Battery & EV Intelligence Subsystem
 */

import { BatteryResult } from '@volt/contracts';

export interface BatteryRouteInput {
  /** Distance of candidate route segment (km) */
  distanceKm: number;
  /** Current SoC of the vehicle (0-100%) */
  currentSoCPercent: number;
  /** Vehicle usable capacity (kWh) */
  usableCapacityKWh: number;
  /** Consumption rate (kWh/km) */
  consumptionKWhPerKm: number;
  /** Minimum reserve threshold (0-100%, defaults to 10%) */
  reserveSoCPercent?: number;
  /** Battery health percentage (0-100%) */
  batteryHealthPercent?: number;
}

export interface BatteryRouteResult extends BatteryResult {
  /** Vehicle ID associated with calculation */
  vehicleId?: string;
  /** Minimum safe arrival SoC threshold (%) */
  minimumSafeSoCPercent: number;
  /** Safety margin above minimum threshold (% points) */
  safetyMarginPercent: number;
  /** Battery health score evaluated (%) */
  batteryHealthPercent: number;
  /** Estimated remaining range at arrival (km) */
  estimatedRangeKm: number;
}
