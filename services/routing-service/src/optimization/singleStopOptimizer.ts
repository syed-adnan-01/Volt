import { getRoute } from "../osrm/osrmClient.js";
import type { RouteResult } from "../osrm/osrmClient.js";
import { chargers, findChargersAlongRoute, calculateDistance } from "../chargers/chargerCandidates.js";
import type { Charger } from "../chargers/chargerCandidates.js";
import { DEFAULT_EV_VEHICLE, calculateEnergyConsumed, calculateChargingTimeMinutes } from "../models/evModel.js";
import type { EVVehicle } from "../models/evModel.js";
import type { StationPrediction } from "../models/predictionModel.js";
import { getDefaultPrediction } from "../models/predictionModel.js";
import { calculateRouteCosts } from "../scoring/routeCost.js";
import type { RouteCostWeights, CandidateCostBreakdown, RawCandidateMetrics } from "../scoring/routeCost.js";

export interface Location {
  name: string;
  lon: number;
  lat: number;
}

export interface SingleStopOptimizerInput {
  origin: Location;
  destination: Location;
  evProfile?: EVVehicle | undefined;
  candidateChargers?: Charger[] | undefined;
  predictions?: Record<string, StationPrediction> | Map<string, StationPrediction> | StationPrediction[] | undefined;
  weights?: Partial<RouteCostWeights> | undefined;
  maxDetourKm?: number | undefined;
  destinationProximityKmThreshold?: number | undefined;
  allowDestinationChargerStop?: boolean | undefined;
  allowEmergencyReserve?: boolean | undefined;
}

export interface SingleStopCandidateEvaluation {
  rank: number;
  charger: Charger;
  routeToCharger: RouteResult;
  routeFromChargerToDest: RouteResult;
  arrivalSoCPct: number;
  targetSoCPct: number;
  chargingTimeMinutes: number;
  detourKm: number;
  detourMinutes: number;
  totalDistanceKm: number;
  totalDrivingDurationMinutes: number;
  prediction: StationPrediction;
  costBreakdown: CandidateCostBreakdown;
  summaryReason: string;
}

export interface SingleStopOptimizerResult {
  selectedCharger: Charger;
  totalDistanceKm: number;
  totalDrivingDurationMinutes: number;
  totalChargingDurationMinutes: number;
  expectedWaitMinutes: number;
  totalEstimatedJourneyMinutes: number;
  totalCost: number;
  reason: string;
  rankedCandidates: SingleStopCandidateEvaluation[];
  routeToCharger: RouteResult;
  routeFromChargerToDest: RouteResult;
  arrivalSoCPct: number;
  targetSoCPct: number;
}

function resolvePredictionsMap(
  predictions?: Record<string, StationPrediction> | Map<string, StationPrediction> | StationPrediction[]
): Map<string, StationPrediction> {
  const map = new Map<string, StationPrediction>();
  if (!predictions) return map;

  if (predictions instanceof Map) {
    return predictions;
  }
  if (Array.isArray(predictions)) {
    for (const p of predictions) {
      map.set(p.stationId, p);
    }
    return map;
  }
  if (typeof predictions === "object") {
    for (const [key, p] of Object.entries(predictions)) {
      map.set(key, p);
    }
  }
  return map;
}

/**
 * Optimizes charger selection for single-stop EV routing based on multi-factor cost scoring.
 */
export async function optimizeSingleStop(
  input: SingleStopOptimizerInput
): Promise<SingleStopOptimizerResult> {
  const {
    origin,
    destination,
    evProfile = DEFAULT_EV_VEHICLE,
    candidateChargers = chargers,
    weights,
    maxDetourKm = 10,
    destinationProximityKmThreshold = 5.0,
    allowDestinationChargerStop = false,
    allowEmergencyReserve = false
  } = input;

  const predMap = resolvePredictionsMap(input.predictions);

  // 1. Get direct route from origin to destination for benchmark detour calculation
  const directRoute = await getRoute(origin.lon, origin.lat, destination.lon, destination.lat);

  // 2. Identify candidate chargers along route corridor
  const candidatesAlongCorridor = findChargersAlongRoute(
    directRoute.geometry,
    maxDetourKm,
    candidateChargers
  );

  const chargersToEvaluate = candidatesAlongCorridor.length > 0 ? candidatesAlongCorridor : candidateChargers;

  // RULE 1: Filter out chargers located at/very near destination from intermediate candidates
  const intermediateChargers = chargersToEvaluate.filter((charger) => {
    if (allowDestinationChargerStop) return true;
    const distToDest = calculateDistance(charger.lat, charger.lon, destination.lat, destination.lon);
    return distToDest > destinationProximityKmThreshold;
  });

  const finalChargersToEvaluate = intermediateChargers.length > 0 ? intermediateChargers : chargersToEvaluate;

  const currentEnergyKwh = (evProfile.initialSoCPct / 100) * evProfile.batteryCapacityKwh;
  const minRequiredArrivalSoC = allowEmergencyReserve ? 0 : evProfile.minSoCBufferPct;

  type CandidateRouteDetail = {
    charger: Charger;
    routeToCharger: RouteResult;
    routeFromChargerToDest: RouteResult;
    arrivalSoCPct: number;
    targetSoCPct: number;
    chargingTimeMinutes: number;
    totalDistanceKm: number;
    totalDrivingDurationMinutes: number;
    detourKm: number;
    detourMinutes: number;
    prediction: StationPrediction;
    rawMetric: RawCandidateMetrics;
  };

  const reachableCandidatesDetails: CandidateRouteDetail[] = [];

  for (const charger of finalChargersToEvaluate) {
    // Origin -> Charger route
    const routeToCharger = await getRoute(origin.lon, origin.lat, charger.lon, charger.lat);

    const energyToCharger = calculateEnergyConsumed(routeToCharger.distanceKm, evProfile.consumptionKwhPerKm);
    const arrivalEnergy = currentEnergyKwh - energyToCharger;
    const arrivalSoCPct = (arrivalEnergy / evProfile.batteryCapacityKwh) * 100;

    // RULE 2: BATTERY SAFETY MARGIN ENFORCEMENT
    if (arrivalSoCPct < minRequiredArrivalSoC) {
      continue;
    }

    // Charger -> Destination route
    const routeFromChargerToDest = await getRoute(charger.lon, charger.lat, destination.lon, destination.lat);

    const totalDistanceKm = routeToCharger.distanceKm + routeFromChargerToDest.distanceKm;
    const totalDrivingDurationMinutes = routeToCharger.durationMinutes + routeFromChargerToDest.durationMinutes;

    const detourKm = Math.max(0, totalDistanceKm - directRoute.distanceKm);
    const detourMinutes = Math.max(0, totalDrivingDurationMinutes - directRoute.durationMinutes);

    // Compute target SoC needed to reach destination with safety buffer
    const energyToDest = calculateEnergyConsumed(routeFromChargerToDest.distanceKm, evProfile.consumptionKwhPerKm);
    const socNeededToDest = (energyToDest / evProfile.batteryCapacityKwh) * 100;
    const requiredTargetSoC = Math.ceil(socNeededToDest + evProfile.minSoCBufferPct);

    // RULE 3: Charge only what is required plus safety buffer (do not unnecessarily charge to 100%)
    const targetSoCPct = Math.min(100, Math.max(Math.ceil(arrivalSoCPct), requiredTargetSoC));

    const effectivePowerKw = Math.min(charger.powerKw, evProfile.chargingPowerKw);
    const chargingTimeMinutes = calculateChargingTimeMinutes(
      arrivalSoCPct,
      targetSoCPct,
      evProfile,
      effectivePowerKw
    );

    const prediction = predMap.get(charger.id) || getDefaultPrediction(charger.id);

    const rawMetric: RawCandidateMetrics = {
      chargerId: charger.id,
      drivingDurationMinutes: totalDrivingDurationMinutes,
      detourMinutes,
      expectedWaitMinutes: prediction.expectedWaitMinutes,
      chargingDurationMinutes: chargingTimeMinutes,
      arrivalSoCPct,
      minSoCBufferPct: evProfile.minSoCBufferPct,
      prediction
    };

    reachableCandidatesDetails.push({
      charger,
      routeToCharger,
      routeFromChargerToDest,
      arrivalSoCPct,
      targetSoCPct,
      chargingTimeMinutes,
      totalDistanceKm,
      totalDrivingDurationMinutes,
      detourKm,
      detourMinutes,
      prediction,
      rawMetric
    });
  }

  if (reachableCandidatesDetails.length === 0) {
    throw new Error(
      `No reachable candidate charging stations found for current battery SoC (${evProfile.initialSoCPct}%), respecting minimum safety buffer of ${evProfile.minSoCBufferPct}%.`
    );
  }

  // 3. Compute normalized route cost breakdowns
  const rawMetricsList = reachableCandidatesDetails.map((item) => item.rawMetric);
  const costBreakdowns = calculateRouteCosts(rawMetricsList, weights);
  const costMap = new Map<string, CandidateCostBreakdown>();
  for (const cb of costBreakdowns) {
    costMap.set(cb.chargerId, cb);
  }

  // 4. Combine candidate evaluations
  const evaluations: SingleStopCandidateEvaluation[] = reachableCandidatesDetails.map((item) => {
    const cb = costMap.get(item.charger.id)!;
    return {
      rank: 0,
      charger: item.charger,
      routeToCharger: item.routeToCharger,
      routeFromChargerToDest: item.routeFromChargerToDest,
      arrivalSoCPct: item.arrivalSoCPct,
      targetSoCPct: item.targetSoCPct,
      chargingTimeMinutes: item.chargingTimeMinutes,
      detourKm: item.detourKm,
      detourMinutes: item.detourMinutes,
      totalDistanceKm: item.totalDistanceKm,
      totalDrivingDurationMinutes: item.totalDrivingDurationMinutes,
      prediction: item.prediction,
      costBreakdown: cb,
      summaryReason: ""
    };
  });

  evaluations.sort((a, b) => a.costBreakdown.totalCost - b.costBreakdown.totalCost);

  evaluations.forEach((evalItem, index) => {
    evalItem.rank = index + 1;
    evalItem.summaryReason =
      `Rank ${evalItem.rank}: ${evalItem.charger.name} (Total Cost: ${evalItem.costBreakdown.totalCost.toFixed(3)}, Drive: ${evalItem.totalDrivingDurationMinutes.toFixed(1)}m, Wait: ${evalItem.prediction.expectedWaitMinutes}m, Charge: ${evalItem.chargingTimeMinutes.toFixed(1)}m, Reliability: ${(evalItem.prediction.reliabilityScore * 100).toFixed(0)}%)`;
  });

  const selected = evaluations[0]!;
  const selectedCharger = selected.charger;

  const totalDistanceKm = selected.totalDistanceKm;
  const totalDrivingDurationMinutes = selected.totalDrivingDurationMinutes;
  const totalChargingDurationMinutes = selected.chargingTimeMinutes;
  const expectedWaitMinutes = selected.prediction.expectedWaitMinutes;
  const totalEstimatedJourneyMinutes = totalDrivingDurationMinutes + totalChargingDurationMinutes + expectedWaitMinutes;
  const totalCost = selected.costBreakdown.totalCost;

  const reason = `Selected ${selectedCharger.name} because it provides the lowest estimated total journey cost considering driving time, detour, predicted wait, charging time, battery risk and reliability.`;

  return {
    selectedCharger,
    totalDistanceKm,
    totalDrivingDurationMinutes,
    totalChargingDurationMinutes,
    expectedWaitMinutes,
    totalEstimatedJourneyMinutes,
    totalCost,
    reason,
    rankedCandidates: evaluations,
    routeToCharger: selected.routeToCharger,
    routeFromChargerToDest: selected.routeFromChargerToDest,
    arrivalSoCPct: selected.arrivalSoCPct,
    targetSoCPct: selected.targetSoCPct
  };
}
