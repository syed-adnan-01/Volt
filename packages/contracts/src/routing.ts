// ──────────────────────────────────────────────
// Routing Service Contract
// Provided by Member 5 — integrated by Member 1
// ──────────────────────────────────────────────

export interface RoutingResult {
  /** Total distance in kilometres */
  distanceKm: number;
  /** Total duration in minutes */
  durationMinutes: number;
  /** Extra time compared to direct route (minutes) */
  detourMinutes: number;
  /** Encoded route geometry (e.g. polyline or coordinate array) */
  geometry: Array<[number, number]>;
}
