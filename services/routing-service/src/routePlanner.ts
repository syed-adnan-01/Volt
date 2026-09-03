import { getRoute } from "./osrm/osrmClient.js";
import { chargers } from "./chargers/chargerCandidates.js";
import type { Charger } from "./chargers/chargerCandidates.js";
import { DEFAULT_EV_VEHICLE } from "./models/evModel.js";
import type { EVVehicle } from "./models/evModel.js";
import type { StationPrediction } from "./models/predictionModel.js";
import type { RouteCostWeights, OptimizationMode } from "./scoring/routeCost.js";
import { optimizeMultiStopRoute } from "./optimization/multiStopOptimizer.js";
import type { ChargingStopInfo, EVRouteLeg, EVRouteAlternative, MultiStopOptimizerResult } from "./optimization/multiStopOptimizer.js";
import { optimizeReroute } from "./optimization/rerouteOptimizer.js";
import type { RerouteInput, RerouteResult } from "./optimization/rerouteOptimizer.js";

export type { Location, ChargingStopInfo, EVRouteLeg, EVRouteAlternative } from "./optimization/multiStopOptimizer.js";
export type { RerouteInput, RerouteResult } from "./optimization/rerouteOptimizer.js";

export interface EVRouteResult {
  origin: import("./optimization/multiStopOptimizer.js").Location;
  destination: import("./optimization/multiStopOptimizer.js").Location;
  totalDistanceKm: number;
  totalDrivingDurationMinutes: number;
  totalChargingDurationMinutes: number;
  totalPredictedWaitMinutes: number;
  totalTripDurationMinutes: number;
  initialSoCPct: number;
  destinationSoCPct: number;
  totalCost: number;
  mode: OptimizationMode;
  reason: string;
  stops: ChargingStopInfo[];
  legs: EVRouteLeg[];
  alternatives: EVRouteAlternative[];
  routeGeometry?: unknown;
}

export interface EVRoutePlannerOptions {
  evProfile?: EVVehicle | undefined;
  maxDetourKm?: number | undefined;
  availableChargers?: Charger[] | undefined;
  predictions?: Record<string, StationPrediction> | StationPrediction[] | Map<string, StationPrediction> | undefined;
  weights?: Partial<RouteCostWeights> | undefined;
  mode?: OptimizationMode | undefined;
  connectorTypes?: string[] | undefined;
  minPowerKw?: number | undefined;
  blacklistedChargerIds?: string[] | undefined;
  optimizationTimeoutMs?: number | undefined;
  returnAlternativesCount?: number | undefined;
}

/**
 * Existing multi-waypoint planner (preserved for backwards compatibility)
 */
export async function planRoute(
  locations: import("./optimization/multiStopOptimizer.js").Location[]
) {
  const legs = [];

  for (let i = 0; i < locations.length - 1; i++) {
    const from = locations[i]!;
    const to = locations[i + 1]!;

    const route = await getRoute(
      from.lon,
      from.lat,
      to.lon,
      to.lat
    );

    legs.push({
      from: from.name,
      to: to.name,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      geometry: route.geometry
    });
  }

  return legs;
}

/**
 * Automated EV Route Planner supporting single & multi-stop optimization,
 * optimization modes, charger filtering, timeout protection, and route alternatives.
 */
export async function planEVRoute(
  origin: import("./optimization/multiStopOptimizer.js").Location,
  destination: import("./optimization/multiStopOptimizer.js").Location,
  evProfile: EVVehicle = DEFAULT_EV_VEHICLE,
  maxDetourKm: number = 10,
  availableChargers: Charger[] = chargers,
  predictions?: Record<string, StationPrediction> | StationPrediction[] | Map<string, StationPrediction>,
  weights?: Partial<RouteCostWeights>,
  options?: Partial<EVRoutePlannerOptions>
): Promise<EVRouteResult> {
  const mergedOptions: EVRoutePlannerOptions = {
    evProfile,
    maxDetourKm,
    availableChargers,
    predictions,
    weights,
    mode: options?.mode || "BALANCED",
    connectorTypes: options?.connectorTypes,
    minPowerKw: options?.minPowerKw,
    blacklistedChargerIds: options?.blacklistedChargerIds,
    optimizationTimeoutMs: options?.optimizationTimeoutMs || 5000,
    returnAlternativesCount: options?.returnAlternativesCount !== undefined ? options.returnAlternativesCount : 2
  };

  try {
    const { optimizeWithFallback } = await import("./optimization/fallbackOptimizer.js");
    const { result: multiResult } = await optimizeWithFallback({
      origin,
      destination,
      evProfile: mergedOptions.evProfile,
      candidateChargers: mergedOptions.availableChargers,
      predictions: mergedOptions.predictions,
      weights: mergedOptions.weights,
      mode: mergedOptions.mode,
      maxDetourKm: mergedOptions.maxDetourKm,
      maxChargingStops: 3,
      connectorTypes: mergedOptions.connectorTypes,
      minPowerKw: mergedOptions.minPowerKw,
      blacklistedChargerIds: mergedOptions.blacklistedChargerIds,
      optimizationTimeoutMs: mergedOptions.optimizationTimeoutMs,
      returnAlternativesCount: mergedOptions.returnAlternativesCount
    });

    return {
      origin: multiResult.origin,
      destination: multiResult.destination,
      totalDistanceKm: multiResult.totalDistanceKm,
      totalDrivingDurationMinutes: multiResult.totalDrivingDurationMinutes,
      totalChargingDurationMinutes: multiResult.totalChargingDurationMinutes,
      totalPredictedWaitMinutes: multiResult.totalPredictedWaitMinutes,
      totalTripDurationMinutes: multiResult.totalTripDurationMinutes,
      initialSoCPct: multiResult.initialSoCPct,
      destinationSoCPct: multiResult.destinationSoCPct,
      totalCost: multiResult.totalCost,
      mode: multiResult.mode,
      reason: multiResult.reason,
      stops: multiResult.stops,
      legs: multiResult.legs,
      alternatives: multiResult.alternatives
    };
  } catch (err: unknown) {
    const origMessage = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Destination cannot be reached safely with current battery SoC (${evProfile.initialSoCPct}%): ${origMessage}`
    );
  }
}

/**
 * Executes real-time rerouting optimization wrapper
 */
export async function rerouteEVRoute(input: RerouteInput): Promise<RerouteResult> {
  return optimizeReroute(input);
}