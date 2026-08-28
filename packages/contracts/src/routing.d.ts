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
//# sourceMappingURL=routing.d.ts.map