import { optimizeMultiStopRoute } from "./multiStopOptimizer.js";
import type { Location, MultiStopOptimizerResult, EVRouteLeg, ChargingStopInfo } from "./multiStopOptimizer.js";
import { DEFAULT_EV_VEHICLE } from "../models/evModel.js";
import type { EVVehicle } from "../models/evModel.js";
import type { StationPrediction } from "../models/predictionModel.js";
import type { RouteCostWeights, OptimizationMode } from "../scoring/routeCost.js";
import type { Charger } from "../chargers/chargerCandidates.js";

export interface RerouteInput {
  currentLocation: Location;
  destination: Location;
  evProfile?: EVVehicle | undefined;
  candidateChargers?: Charger[] | undefined;
  predictions?: Record<string, StationPrediction> | Map<string, StationPrediction> | StationPrediction[] | undefined;
  weights?: Partial<RouteCostWeights> | undefined;
  mode?: OptimizationMode | undefined;
  currentPlannedStops?: ChargingStopInfo[] | string[] | undefined;
  blacklistedChargerIds?: string[] | undefined;
  driverDeviated?: boolean | undefined;
  previousTripDurationMinutes?: number | undefined;
  previousRouteCost?: number | undefined;
  previousSoCPct?: number | undefined;
  minSoCChangePct?: number | undefined;
  lastReroutedTimestampMs?: number | undefined;
  cooldownMs?: number | undefined;
  minCostImprovementPct?: number | undefined;
  minEtaImprovementMinutes?: number | undefined;
  connectorTypes?: string[] | undefined;
  minPowerKw?: number | undefined;
  maxDetourKm?: number | undefined;
  optimizationTimeoutMs?: number | undefined;
}

export interface RerouteResult {
  rerouteRecommended: boolean;
  rerouteReason: string;
  triggerEvent?: string | undefined;
  previousRouteSummary?: {
    plannedStopsCount: number;
    estimatedTripDurationMinutes: number;
    estimatedCost: number;
  } | undefined;
  optimizedRoute: MultiStopOptimizerResult;
}

/**
 * Real-time EV Route Rerouting Engine
 * Evaluates current trip context against dynamic conditions (charger unavailability,
 * wait time spikes, reliability drops, SoC change, driver route deviation)
 * and enforces hysteresis and cooldown to prevent route oscillation and loops.
 */
export async function optimizeReroute(input: RerouteInput): Promise<RerouteResult> {
  const {
    currentLocation,
    destination,
    evProfile = DEFAULT_EV_VEHICLE,
    candidateChargers,
    predictions,
    weights,
    mode = "BALANCED",
    currentPlannedStops = [],
    blacklistedChargerIds = [],
    driverDeviated = false,
    previousTripDurationMinutes,
    previousRouteCost,
    previousSoCPct,
    minSoCChangePct = 10.0,
    lastReroutedTimestampMs,
    cooldownMs = 60000,
    minCostImprovementPct = 5.0,
    minEtaImprovementMinutes = 3.0,
    connectorTypes,
    minPowerKw,
    maxDetourKm = 10,
    optimizationTimeoutMs = 5000
  } = input;

  const plannedIds: string[] = currentPlannedStops.map((stop) =>
    typeof stop === "string" ? stop : stop.charger.id
  );

  let triggerEvent: string | undefined = undefined;
  let rerouteRecommended = false;
  let isCriticalTrigger = false;

  if (driverDeviated) {
    triggerEvent = "DRIVER_ROUTE_DEVIATION";
    rerouteRecommended = true;
    isCriticalTrigger = true;
  }

  if (previousSoCPct !== undefined && !rerouteRecommended) {
    const socDiff = Math.abs(previousSoCPct - evProfile.initialSoCPct);
    if (socDiff >= minSoCChangePct) {
      triggerEvent = `MEANINGFUL_SOC_CHANGE (Initial ${previousSoCPct.toFixed(1)}% -> Current ${evProfile.initialSoCPct.toFixed(1)}%)`;
      rerouteRecommended = true;
    }
  }

  if (predictions) {
    const predMap = new Map<string, StationPrediction>();
    if (predictions instanceof Map) {
      predictions.forEach((v, k) => predMap.set(k, v));
    } else if (Array.isArray(predictions)) {
      predictions.forEach((p) => predMap.set(p.stationId, p));
    } else if (typeof predictions === "object") {
      Object.entries(predictions).forEach(([k, v]) => predMap.set(k, v));
    }

    for (const chargerId of plannedIds) {
      const pred = predMap.get(chargerId);
      if (pred) {
        if (pred.availabilityProbability < 0.2) {
          triggerEvent = `PLANNED_CHARGER_UNAVAILABLE (${chargerId})`;
          rerouteRecommended = true;
          isCriticalTrigger = true;
          if (!blacklistedChargerIds.includes(chargerId)) {
            blacklistedChargerIds.push(chargerId);
          }
          break;
        }
        if (pred.expectedWaitMinutes >= 30) {
          triggerEvent = `PLANNED_CHARGER_WAIT_TIME_SPIKE (${chargerId}: ${pred.expectedWaitMinutes}m wait)`;
          rerouteRecommended = true;
          break;
        }
        if (pred.reliabilityScore < 0.5) {
          triggerEvent = `PLANNED_CHARGER_RELIABILITY_DROP (${chargerId}: ${(pred.reliabilityScore * 100).toFixed(0)}% rel)`;
          rerouteRecommended = true;
          break;
        }
      }
    }
  }

  // Check Reroute Cooldown / Oscillation Suppression
  let cooldownSuppressed = false;
  if (lastReroutedTimestampMs !== undefined && !isCriticalTrigger) {
    const timeSinceLastReroute = Date.now() - lastReroutedTimestampMs;
    if (timeSinceLastReroute < cooldownMs) {
      cooldownSuppressed = true;
    }
  }

  const newRouteResult = await optimizeMultiStopRoute({
    origin: currentLocation,
    destination,
    evProfile,
    candidateChargers,
    predictions,
    weights,
    mode,
    maxDetourKm,
    blacklistedChargerIds,
    connectorTypes,
    minPowerKw,
    optimizationTimeoutMs
  });

  let hysteresisReason = "";

  if (previousRouteCost !== undefined && previousTripDurationMinutes !== undefined && !rerouteRecommended) {
    const costDiff = previousRouteCost - newRouteResult.totalCost;
    const costImprovementPct = previousRouteCost > 0 ? (costDiff / previousRouteCost) * 100 : 0;
    const etaImprovementMinutes = previousTripDurationMinutes - newRouteResult.totalTripDurationMinutes;

    if (costImprovementPct >= minCostImprovementPct || etaImprovementMinutes >= minEtaImprovementMinutes) {
      rerouteRecommended = true;
      triggerEvent = `SUPERIOR_ROUTE_FOUND (Cost -${costImprovementPct.toFixed(1)}%, ETA -${etaImprovementMinutes.toFixed(1)}m)`;
    } else {
      rerouteRecommended = false;
      hysteresisReason = `Alternative route cost improvement (${costImprovementPct.toFixed(1)}%) is below hysteresis threshold (${minCostImprovementPct}%). Preserving existing route to prevent oscillation.`;
    }
  } else if (!rerouteRecommended) {
    rerouteRecommended = true;
    triggerEvent = "INITIAL_REROUTE_EVALUATION";
  }

  if (cooldownSuppressed && rerouteRecommended) {
    rerouteRecommended = false;
    hysteresisReason = `Reroute suppressed due to active cooldown period (${cooldownMs}ms). Preserving current route to prevent route oscillation and loops.`;
  }

  const rerouteReason = rerouteRecommended
    ? `Reroute recommended due to trigger: ${triggerEvent}. ${newRouteResult.reason}`
    : hysteresisReason || `Current planned route remains optimal. No reroute required.`;

  const previousRouteSummary = previousRouteCost !== undefined && previousTripDurationMinutes !== undefined ? {
    plannedStopsCount: plannedIds.length,
    estimatedTripDurationMinutes: previousTripDurationMinutes,
    estimatedCost: previousRouteCost
  } : undefined;

  const result: RerouteResult = {
    rerouteRecommended,
    rerouteReason,
    optimizedRoute: newRouteResult
  };

  if (triggerEvent !== undefined) result.triggerEvent = triggerEvent;
  if (previousRouteSummary !== undefined) result.previousRouteSummary = previousRouteSummary;

  return result;
}
