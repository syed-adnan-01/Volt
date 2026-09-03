import { getRoute } from "../osrm/osrmClient.js";
import type { RouteResult } from "../osrm/osrmClient.js";
import { chargers, findChargersAlongRoute, calculateDistance, filterCandidateChargers } from "../chargers/chargerCandidates.js";
import type { Charger, ChargerFilterOptions } from "../chargers/chargerCandidates.js";
import { DEFAULT_EV_VEHICLE, calculateEnergyConsumed, calculateChargingTimeMinutes } from "../models/evModel.js";
import type { EVVehicle } from "../models/evModel.js";
import type { StationPrediction } from "../models/predictionModel.js";
import { getDefaultPrediction, sanitizePrediction } from "../models/predictionModel.js";
import { calculateRouteCosts } from "../scoring/routeCost.js";
import type { RouteCostWeights, RawCandidateMetrics, OptimizationMode } from "../scoring/routeCost.js";

export interface Location {
  name: string;
  lon: number;
  lat: number;
}

export interface ChargingStopInfo {
  charger: Charger;
  socBeforeChargingPct: number;
  socAfterChargingPct: number;
  energyChargedKwh: number;
  chargingTimeMinutes: number;
  legDistanceToChargerKm: number;
  prediction: StationPrediction;
}

export interface EVRouteLeg {
  from: string;
  to: string;
  distanceKm: number;
  durationMinutes: number;
  startSoCPct: number;
  endSoCPct: number;
  geometry: unknown;
}

export interface EVRouteAlternative {
  rank: number;
  stops: ChargingStopInfo[];
  legs: EVRouteLeg[];
  totalDistanceKm: number;
  totalDrivingDurationMinutes: number;
  totalChargingDurationMinutes: number;
  totalPredictedWaitMinutes: number;
  totalTripDurationMinutes: number;
  destinationSoCPct: number;
  totalCost: number;
  reason: string;
}

export interface MultiStopOptimizerInput {
  origin: Location;
  destination: Location;
  evProfile?: EVVehicle | undefined;
  candidateChargers?: Charger[] | undefined;
  predictions?: Record<string, StationPrediction> | Map<string, StationPrediction> | StationPrediction[] | undefined;
  weights?: Partial<RouteCostWeights> | undefined;
  mode?: OptimizationMode | undefined;
  maxDetourKm?: number | undefined;
  maxChargingStops?: number | undefined;
  destinationProximityKmThreshold?: number | undefined;
  allowDestinationChargerStop?: boolean | undefined;
  allowEmergencyReserve?: boolean | undefined;
  connectorTypes?: string[] | undefined;
  minPowerKw?: number | undefined;
  blacklistedChargerIds?: string[] | undefined;
  optimizationTimeoutMs?: number | undefined;
  returnAlternativesCount?: number | undefined;
}

export interface MultiStopOptimizerResult {
  origin: Location;
  destination: Location;
  stops: ChargingStopInfo[];
  legs: EVRouteLeg[];
  totalDistanceKm: number;
  totalDrivingDurationMinutes: number;
  totalChargingDurationMinutes: number;
  totalPredictedWaitMinutes: number;
  totalTripDurationMinutes: number;
  initialSoCPct: number;
  destinationSoCPct: number;
  totalCost: number;
  reason: string;
  evaluatedRoutesCount: number;
  feasibleRoutesCount: number;
  mode: OptimizationMode;
  alternatives: EVRouteAlternative[];
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
      map.set(p.stationId, sanitizePrediction(p));
    }
    return map;
  }
  if (typeof predictions === "object") {
    for (const [key, p] of Object.entries(predictions)) {
      map.set(key, sanitizePrediction(p));
    }
  }
  return map;
}

/**
 * Multi-stop EV Route Optimizer
 * Plans safe, feasible, and optimal charging routes (0, 1, or multiple stops)
 * evaluating complete route costs with battery safety margin enforcement,
 * optimization modes, route alternatives, connector filtering, and timeout protection.
 */
export async function optimizeMultiStopRoute(
  input: MultiStopOptimizerInput
): Promise<MultiStopOptimizerResult> {
  const startTimeMs = Date.now();

  const {
    origin,
    destination,
    evProfile = DEFAULT_EV_VEHICLE,
    candidateChargers = chargers,
    weights,
    mode = "BALANCED",
    maxDetourKm = 10,
    maxChargingStops = 3,
    destinationProximityKmThreshold = 5.0,
    allowDestinationChargerStop = false,
    allowEmergencyReserve = false,
    connectorTypes,
    minPowerKw,
    blacklistedChargerIds,
    optimizationTimeoutMs = 5000,
    returnAlternativesCount = 2
  } = input;

  const predMap = resolvePredictionsMap(input.predictions);

  // Memoized route cache to avoid duplicate OSRM HTTP calls
  const routeCache = new Map<string, Promise<RouteResult>>();
  const getMemoizedRoute = (fromLon: number, fromLat: number, toLon: number, toLat: number): Promise<RouteResult> => {
    const key = `${fromLon.toFixed(4)},${fromLat.toFixed(4)};${toLon.toFixed(4)},${toLat.toFixed(4)}`;
    let cached = routeCache.get(key);
    if (!cached) {
      cached = getRoute(fromLon, fromLat, toLon, toLat);
      routeCache.set(key, cached);
    }
    return cached;
  };

  // Construct ChargerFilterOptions safely without assigning undefined to optional properties
  const filterOptions: ChargerFilterOptions = {};
  if (connectorTypes) filterOptions.connectorTypes = connectorTypes;
  if (minPowerKw !== undefined) filterOptions.minPowerKw = minPowerKw;
  if (blacklistedChargerIds) filterOptions.blacklistedChargerIds = blacklistedChargerIds;

  const filteredBaseChargers = filterCandidateChargers(candidateChargers, filterOptions);

  if (filteredBaseChargers.length === 0 && candidateChargers.length > 0) {
    throw new Error(
      `No candidate charging stations match the specified filters (connectors: ${connectorTypes?.join(",") || "any"}, minPowerKw: ${minPowerKw || "any"}).`
    );
  }

  // 1. Direct Route Check (0 Stops)
  const directRoute = await getMemoizedRoute(origin.lon, origin.lat, destination.lon, destination.lat);
  const directEnergyConsumed = calculateEnergyConsumed(directRoute.distanceKm, evProfile.consumptionKwhPerKm);
  const initialEnergyKwh = (evProfile.initialSoCPct / 100) * evProfile.batteryCapacityKwh;
  const remainingEnergyDirect = initialEnergyKwh - directEnergyConsumed;
  const arrivalSoCDirect = (remainingEnergyDirect / evProfile.batteryCapacityKwh) * 100;

  const minRequiredArrivalSoC = allowEmergencyReserve ? 0 : evProfile.minSoCBufferPct;

  // If 0-stop route is safe (arrival SoC >= minSoCBufferPct)
  if (arrivalSoCDirect >= minRequiredArrivalSoC) {
    const leg: EVRouteLeg = {
      from: origin.name,
      to: destination.name,
      distanceKm: directRoute.distanceKm,
      durationMinutes: directRoute.durationMinutes,
      startSoCPct: evProfile.initialSoCPct,
      endSoCPct: arrivalSoCDirect,
      geometry: directRoute.geometry
    };

    return {
      origin,
      destination,
      stops: [],
      legs: [leg],
      totalDistanceKm: directRoute.distanceKm,
      totalDrivingDurationMinutes: directRoute.durationMinutes,
      totalChargingDurationMinutes: 0,
      totalPredictedWaitMinutes: 0,
      totalTripDurationMinutes: directRoute.durationMinutes,
      initialSoCPct: evProfile.initialSoCPct,
      destinationSoCPct: arrivalSoCDirect,
      totalCost: 0,
      reason: `Trip from ${origin.name} to ${destination.name} can be completed safely with 0 charging stops (arrival SoC: ${arrivalSoCDirect.toFixed(1)}%).`,
      evaluatedRoutesCount: 1,
      feasibleRoutesCount: 1,
      mode,
      alternatives: []
    };
  }

  // 2. Identify candidate chargers along corridor
  const corridorChargers = findChargersAlongRoute(directRoute.geometry, maxDetourKm, filteredBaseChargers);
  const availableCandidates = corridorChargers.length > 0 ? corridorChargers : filteredBaseChargers;

  // Filter out chargers located at/very near destination from en-route candidates (unless explicitly allowed)
  const intermediateCandidates = availableCandidates.filter((charger) => {
    if (allowDestinationChargerStop) return true;
    const distToDest = calculateDistance(charger.lat, charger.lon, destination.lat, destination.lon);
    return distToDest > destinationProximityKmThreshold;
  });

  const candidatesToUse = allowDestinationChargerStop ? availableCandidates : intermediateCandidates;

  const generateSequences = (items: Charger[], maxLen: number): Charger[][] => {
    const results: Charger[][] = [];
    const backtrack = (current: Charger[]) => {
      if (current.length > 0) {
        results.push([...current]);
      }
      if (current.length === maxLen) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        if (!current.some((c) => c.id === item.id)) {
          current.push(item);
          backtrack(current);
          current.pop();
        }
      }
    };
    backtrack([]);
    return results;
  };

  const candidateSequences = generateSequences(candidatesToUse, maxChargingStops);

  type FeasibleRouteCandidate = {
    chargers: Charger[];
    legs: EVRouteLeg[];
    stops: ChargingStopInfo[];
    totalDistanceKm: number;
    totalDrivingDurationMinutes: number;
    totalChargingDurationMinutes: number;
    totalPredictedWaitMinutes: number;
    totalTripDurationMinutes: number;
    minArrivalSoCPct: number;
    destSoCPct: number;
    rawMetric: RawCandidateMetrics;
  };

  const feasibleRoutes: FeasibleRouteCandidate[] = [];
  let evaluatedCount = 0;
  let timedOut = false;

  const maxStopsToTry = Math.min(maxChargingStops, candidatesToUse.length);

  for (let numStops = 1; numStops <= maxStopsToTry; numStops++) {
    if (Date.now() - startTimeMs > optimizationTimeoutMs) {
      timedOut = true;
      break;
    }

    const sequencesOfLength = candidateSequences.filter((seq) => seq.length === numStops);

    for (const seq of sequencesOfLength) {
      if (Date.now() - startTimeMs > optimizationTimeoutMs) {
        timedOut = true;
        break;
      }

      evaluatedCount++;

      let currentLocation: Location = origin;
      let currentSoCPct = evProfile.initialSoCPct;
      let currentEnergyKwh = (currentSoCPct / 100) * evProfile.batteryCapacityKwh;

      const legs: EVRouteLeg[] = [];
      const stops: ChargingStopInfo[] = [];

      let isFeasible = true;
      let minArrivalSoCPct = Infinity;
      let totalPredictedWaitMinutes = 0;

      for (let i = 0; i < seq.length; i++) {
        const targetCharger = seq[i]!;

        const routeLeg = await getMemoizedRoute(
          currentLocation.lon,
          currentLocation.lat,
          targetCharger.lon,
          targetCharger.lat
        );

        const energyConsumed = calculateEnergyConsumed(routeLeg.distanceKm, evProfile.consumptionKwhPerKm);
        const arrivalEnergy = currentEnergyKwh - energyConsumed;
        const arrivalSoCPct = (arrivalEnergy / evProfile.batteryCapacityKwh) * 100;

        if (arrivalSoCPct < minRequiredArrivalSoC) {
          isFeasible = false;
          break;
        }

        minArrivalSoCPct = Math.min(minArrivalSoCPct, arrivalSoCPct);

        legs.push({
          from: currentLocation.name,
          to: targetCharger.name,
          distanceKm: routeLeg.distanceKm,
          durationMinutes: routeLeg.durationMinutes,
          startSoCPct: currentSoCPct,
          endSoCPct: arrivalSoCPct,
          geometry: routeLeg.geometry
        });

        const nextLocation: Location = i + 1 < seq.length
          ? { name: seq[i + 1]!.name, lat: seq[i + 1]!.lat, lon: seq[i + 1]!.lon }
          : destination;

        const estLegToNext = await getMemoizedRoute(
          targetCharger.lon,
          targetCharger.lat,
          nextLocation.lon,
          nextLocation.lat
        );

        const estEnergyToNext = calculateEnergyConsumed(estLegToNext.distanceKm, evProfile.consumptionKwhPerKm);
        const socNeededToNext = (estEnergyToNext / evProfile.batteryCapacityKwh) * 100;

        const requiredTargetSoC = Math.ceil(socNeededToNext + evProfile.minSoCBufferPct);
        const targetSoCPct = Math.min(100, Math.max(Math.ceil(arrivalSoCPct), requiredTargetSoC));

        const socToCharge = Math.max(0, targetSoCPct - arrivalSoCPct);
        const energyChargedKwh = (socToCharge / 100) * evProfile.batteryCapacityKwh;

        const effectivePowerKw = Math.min(targetCharger.powerKw, evProfile.chargingPowerKw);
        const chargingTimeMinutes = calculateChargingTimeMinutes(
          arrivalSoCPct,
          targetSoCPct,
          evProfile,
          effectivePowerKw
        );

        const pred = predMap.get(targetCharger.id) || getDefaultPrediction(targetCharger.id);
        totalPredictedWaitMinutes += pred.expectedWaitMinutes;

        stops.push({
          charger: targetCharger,
          socBeforeChargingPct: arrivalSoCPct,
          socAfterChargingPct: targetSoCPct,
          energyChargedKwh,
          chargingTimeMinutes,
          legDistanceToChargerKm: routeLeg.distanceKm,
          prediction: pred
        });

        currentLocation = { name: targetCharger.name, lat: targetCharger.lat, lon: targetCharger.lon };
        currentSoCPct = targetSoCPct;
        currentEnergyKwh = (currentSoCPct / 100) * evProfile.batteryCapacityKwh;
      }

      if (!isFeasible) {
        continue;
      }

      const finalLegRoute = await getMemoizedRoute(
        currentLocation.lon,
        currentLocation.lat,
        destination.lon,
        destination.lat
      );

      const finalEnergyConsumed = calculateEnergyConsumed(finalLegRoute.distanceKm, evProfile.consumptionKwhPerKm);
      const destEnergy = currentEnergyKwh - finalEnergyConsumed;
      const destSoCPct = (destEnergy / evProfile.batteryCapacityKwh) * 100;

      if (destSoCPct < minRequiredArrivalSoC) {
        continue;
      }

      minArrivalSoCPct = Math.min(minArrivalSoCPct, destSoCPct);

      legs.push({
        from: currentLocation.name,
        to: destination.name,
        distanceKm: finalLegRoute.distanceKm,
        durationMinutes: finalLegRoute.durationMinutes,
        startSoCPct: currentSoCPct,
        endSoCPct: destSoCPct,
        geometry: finalLegRoute.geometry
      });

      const totalDistanceKm = legs.reduce((sum, l) => sum + l.distanceKm, 0);
      const totalDrivingDurationMinutes = legs.reduce((sum, l) => sum + l.durationMinutes, 0);
      const totalChargingDurationMinutes = stops.reduce((sum, s) => sum + s.chargingTimeMinutes, 0);
      const totalTripDurationMinutes = totalDrivingDurationMinutes + totalChargingDurationMinutes + totalPredictedWaitMinutes;

      const detourMinutes = Math.max(0, totalDrivingDurationMinutes - directRoute.durationMinutes);

      const avgReliabilityScore = stops.reduce((sum, s) => sum + s.prediction.reliabilityScore, 0) / stops.length;
      const avgConfidence = stops.reduce((sum, s) => sum + s.prediction.confidence, 0) / stops.length;

      const compositeId = seq.map((c) => c.id).join("->");

      const rawMetric: RawCandidateMetrics = {
        chargerId: compositeId,
        drivingDurationMinutes: totalDrivingDurationMinutes,
        detourMinutes,
        expectedWaitMinutes: totalPredictedWaitMinutes,
        chargingDurationMinutes: totalChargingDurationMinutes,
        arrivalSoCPct: minArrivalSoCPct,
        minSoCBufferPct: evProfile.minSoCBufferPct,
        prediction: {
          stationId: compositeId,
          availabilityProbability: 1.0,
          expectedWaitMinutes: totalPredictedWaitMinutes,
          reliabilityScore: avgReliabilityScore,
          confidence: avgConfidence,
          modelVersion: "composite-route-v1"
        }
      };

      feasibleRoutes.push({
        chargers: seq,
        legs,
        stops,
        totalDistanceKm,
        totalDrivingDurationMinutes,
        totalChargingDurationMinutes,
        totalPredictedWaitMinutes,
        totalTripDurationMinutes,
        minArrivalSoCPct,
        destSoCPct,
        rawMetric
      });
    }

    if (feasibleRoutes.length > 0 && !timedOut) {
      break;
    }
  }

  if (feasibleRoutes.length === 0) {
    throw new Error(
      `Destination cannot be reached safely with current battery SoC (${evProfile.initialSoCPct}%), respecting minimum safety buffer of ${evProfile.minSoCBufferPct}%.`
    );
  }

  // 3. Compute complete route costs using routeCost module incorporating Mode
  const rawMetricsList = feasibleRoutes.map((r) => r.rawMetric);
  const routeCostBreakdowns = calculateRouteCosts(rawMetricsList, weights, mode);

  const costMap = new Map<string, number>();
  for (const cb of routeCostBreakdowns) {
    costMap.set(cb.chargerId, cb.totalCost);
  }

  feasibleRoutes.sort((a, b) => {
    const costA = costMap.get(a.rawMetric.chargerId) ?? 0;
    const costB = costMap.get(b.rawMetric.chargerId) ?? 0;
    if (Math.abs(costA - costB) > 0.00001) {
      return costA - costB;
    }
    return a.totalTripDurationMinutes - b.totalTripDurationMinutes;
  });

  const bestRoute = feasibleRoutes[0]!;
  const bestCost = costMap.get(bestRoute.rawMetric.chargerId) ?? 0;

  const chargerNames = bestRoute.chargers.map((c) => c.name).join(" and ");
  const timeoutNote = timedOut ? " (Optimization completed under timeout limit)" : "";
  const reason = `Selected this multi-stop route via ${chargerNames} using ${mode} mode because it provides the lowest total route cost while maintaining battery safety.${timeoutNote}`;

  const seenChargerSeqs = new Set<string>();
  seenChargerSeqs.add(bestRoute.chargers.map((c) => c.id).join("->"));

  const alternatives: EVRouteAlternative[] = [];
  for (const alt of feasibleRoutes.slice(1)) {
    const seqKey = alt.chargers.map((c) => c.id).join("->");
    if (seenChargerSeqs.has(seqKey)) continue;
    seenChargerSeqs.add(seqKey);

    const altCost = costMap.get(alt.rawMetric.chargerId) ?? 0;
    const altChargers = alt.chargers.map((c) => c.name).join(" and ");
    alternatives.push({
      rank: alternatives.length + 2,
      stops: alt.stops,
      legs: alt.legs,
      totalDistanceKm: alt.totalDistanceKm,
      totalDrivingDurationMinutes: alt.totalDrivingDurationMinutes,
      totalChargingDurationMinutes: alt.totalChargingDurationMinutes,
      totalPredictedWaitMinutes: alt.totalPredictedWaitMinutes,
      totalTripDurationMinutes: alt.totalTripDurationMinutes,
      destinationSoCPct: alt.destSoCPct,
      totalCost: altCost,
      reason: `Alternative #${alternatives.length + 2} via ${altChargers} (Total Cost: ${altCost.toFixed(4)}, Duration: ${alt.totalTripDurationMinutes.toFixed(1)} mins)`
    });

    if (alternatives.length >= returnAlternativesCount) break;
  }

  return {
    origin,
    destination,
    stops: bestRoute.stops,
    legs: bestRoute.legs,
    totalDistanceKm: bestRoute.totalDistanceKm,
    totalDrivingDurationMinutes: bestRoute.totalDrivingDurationMinutes,
    totalChargingDurationMinutes: bestRoute.totalChargingDurationMinutes,
    totalPredictedWaitMinutes: bestRoute.totalPredictedWaitMinutes,
    totalTripDurationMinutes: bestRoute.totalTripDurationMinutes,
    initialSoCPct: evProfile.initialSoCPct,
    destinationSoCPct: bestRoute.destSoCPct,
    totalCost: bestCost,
    reason,
    evaluatedRoutesCount: evaluatedCount,
    feasibleRoutesCount: feasibleRoutes.length,
    mode,
    alternatives
  };
}
