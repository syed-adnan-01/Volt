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
//# sourceMappingURL=optimizer.d.ts.map