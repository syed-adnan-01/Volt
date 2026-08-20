// ──────────────────────────────────────────────
// Battery Engine Contract
// Provided by Member 3 — integrated by Member 1
// ──────────────────────────────────────────────

export interface BatteryResult {
  /** Current state of charge (%) */
  currentSoC: number;
  /** Predicted SoC at arrival (%) */
  arrivalSoC: number;
  /** Energy needed for the leg (kWh) */
  energyRequiredKWh: number;
  /** Whether the destination/charger is reachable */
  reachable: boolean;
  /** Battery risk score (0 = safe, 1 = critical) */
  riskScore: number;
}
