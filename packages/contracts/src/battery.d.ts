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
export interface MultiStopLegInput {
    /** Order in the trip sequence */
    sequence: number;
    /** Distance for this leg in km */
    distanceKm: number;
    /** Optional station identifier if this leg ends at a charger */
    stationId?: string;
    /** Target SoC to charge up to before continuing (0-100%) */
    targetSoC?: number;
    /** Maximum power of the charger at stop in kW */
    chargingPowerKW?: number;
}
export interface MultiStopBatteryResult {
    /** Sequential battery evaluations for each route leg */
    legs: BatteryResult[];
    /** Cumulative energy required across all driving legs (kWh) */
    totalEnergyRequiredKWh: number;
    /** Cumulative estimated charging time across all charging stops (minutes) */
    totalChargingMinutes: number;
    /** True if every leg in the trip is safely reachable */
    isEntireTripFeasible: boolean;
    /** Final SoC upon arriving at final destination (%) */
    finalSoC: number;
    /** Peak risk score encountered across all legs */
    maxRiskScore: number;
}
//# sourceMappingURL=battery.d.ts.map