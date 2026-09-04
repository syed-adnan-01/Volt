// ──────────────────────────────────────────────
// Route Optimizer Contract
// Provided by Member 5 — integrated by Member 1
// ──────────────────────────────────────────────

export interface ChargingStop {
  /** Station identifier */
  stationId: string;
  /** Order in the trip sequence */
  sequence: number;
  /** Predicted SoC on arrival (%) */
  arrivalSoC: number;
  /** Target SoC on departure (%) */
  departureSoC: number;
  /** Predicted wait time (minutes) */
  expectedWaitMinutes: number;
  /** Charging duration (minutes) */
  chargingMinutes: number;
}

export interface OptimizerResult {
  /** Total estimated trip time including charging (minutes) */
  totalTimeMinutes: number;
  /** Ordered list of recommended charging stops */
  chargingStops: ChargingStop[];
  /** Route geometry segments */
  route: Array<[number, number]>;
  /** Human-readable explanation for the recommendation */
  reason: string;
}

export interface RouteStrategyContract {
  id: string;
  title: string;
  tag: string;
  distanceKm?: number;
  distance_km?: number;
  durationMinutes?: number;
  duration_minutes?: number;
  totalTimeMinutes: number;
  total_time_minutes?: number;
  driveTimeMinutes: number;
  drive_time_minutes?: number;
  chargeTimeMinutes: number;
  charge_time_minutes?: number;
  arrivalSoc: number;
  arrival_soc?: number;
  energyKwh: number;
  energy_kwh?: number;
  whyExplanation: string;
  why_explanation?: string;
  battery?: unknown;
  optimizerData?: unknown;
  optimizer_data?: unknown;
  stops?: unknown[];
  geometry?: unknown;
}
