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
  totalTimeMinutes: number;
  driveTimeMinutes: number;
  chargeTimeMinutes: number;
  arrivalSoc: number;
  energyKwh: number;
  whyExplanation: string;
}
