// ──────────────────────────────────────────────
// Charger Prediction Contract
// Provided by Member 4 — integrated by Member 1
// ──────────────────────────────────────────────

export interface ChargerPrediction {
  /** Station identifier */
  stationId: string;
  /** Probability the charger will be available at ETA (0–1) */
  availabilityProbability: number;
  /** Predicted wait time in minutes */
  expectedWaitMinutes: number;
  /** Station reliability score (0–1) */
  reliabilityScore: number;
  /** Model confidence in this prediction (0–1) */
  confidence: number;
  /** Version of the ML model that produced this prediction */
  modelVersion: string;
}
