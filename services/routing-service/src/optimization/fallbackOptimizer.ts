import { optimizeMultiStopRoute } from "./multiStopOptimizer.js";
import type { MultiStopOptimizerInput, MultiStopOptimizerResult } from "./multiStopOptimizer.js";
import { optimizeSingleStop } from "./singleStopOptimizer.js";
import { chargers, calculateDistance } from "../chargers/chargerCandidates.js";
import { DEFAULT_EV_VEHICLE, calculateEnergyConsumed } from "../models/evModel.js";

/**
 * Fallback Route Optimization Hierarchy
 * Tries Multi-Stop -> Single-Stop -> Nearest Reachable Charger while strictly enforcing battery safety.
 */
export async function optimizeWithFallback(
  input: MultiStopOptimizerInput
): Promise<{ result: MultiStopOptimizerResult; strategyUsed: string }> {
  const evProfile = input.evProfile || DEFAULT_EV_VEHICLE;

  // Level 1: Try Preferred Multi-Stop Optimization Strategy
  try {
    const multiResult = await optimizeMultiStopRoute(input);
    return { result: multiResult, strategyUsed: "MULTI_STOP_OPTIMIZED" };
  } catch (multiErr: unknown) {
    const multiMsg = multiErr instanceof Error ? multiErr.message : String(multiErr);

    // Level 2: Try Single-Stop Optimization Strategy
    try {
      const singleResult = await optimizeSingleStop({
        origin: input.origin,
        destination: input.destination,
        evProfile,
        candidateChargers: input.candidateChargers,
        predictions: input.predictions,
        weights: input.weights,
        maxDetourKm: input.maxDetourKm
      });

      // Wrap single-stop result into MultiStopOptimizerResult structure
      const multiStopWrapped: MultiStopOptimizerResult = {
        origin: input.origin,
        destination: input.destination,
        stops: [
          {
            charger: singleResult.selectedCharger,
            socBeforeChargingPct: singleResult.arrivalSoCPct,
            socAfterChargingPct: singleResult.targetSoCPct,
            energyChargedKwh: ((singleResult.targetSoCPct - singleResult.arrivalSoCPct) / 100) * evProfile.batteryCapacityKwh,
            chargingTimeMinutes: singleResult.totalChargingDurationMinutes,
            legDistanceToChargerKm: singleResult.routeToCharger.distanceKm,
            prediction: singleResult.rankedCandidates[0]!.prediction
          }
        ],
        legs: [
          {
            from: input.origin.name,
            to: singleResult.selectedCharger.name,
            distanceKm: singleResult.routeToCharger.distanceKm,
            durationMinutes: singleResult.routeToCharger.durationMinutes,
            startSoCPct: evProfile.initialSoCPct,
            endSoCPct: singleResult.arrivalSoCPct,
            geometry: singleResult.routeToCharger.geometry
          },
          {
            from: singleResult.selectedCharger.name,
            to: input.destination.name,
            distanceKm: singleResult.routeFromChargerToDest.distanceKm,
            durationMinutes: singleResult.routeFromChargerToDest.durationMinutes,
            startSoCPct: singleResult.targetSoCPct,
            endSoCPct: evProfile.minSoCBufferPct + 5,
            geometry: singleResult.routeFromChargerToDest.geometry
          }
        ],
        totalDistanceKm: singleResult.totalDistanceKm,
        totalDrivingDurationMinutes: singleResult.totalDrivingDurationMinutes,
        totalChargingDurationMinutes: singleResult.totalChargingDurationMinutes,
        totalPredictedWaitMinutes: singleResult.expectedWaitMinutes,
        totalTripDurationMinutes: singleResult.totalEstimatedJourneyMinutes,
        initialSoCPct: evProfile.initialSoCPct,
        destinationSoCPct: evProfile.minSoCBufferPct + 5,
        totalCost: singleResult.totalCost,
        reason: `Fallback to Single-Stop Optimization: ${singleResult.reason}`,
        evaluatedRoutesCount: singleResult.rankedCandidates.length,
        feasibleRoutesCount: singleResult.rankedCandidates.length,
        mode: input.mode || "BALANCED",
        alternatives: []
      };

      return { result: multiStopWrapped, strategyUsed: "SINGLE_STOP_FALLBACK" };
    } catch (singleErr: unknown) {
      // Level 3: Safe Fallback Check for Nearest Reachable Charger
      const candidateList = input.candidateChargers || chargers;
      const initialEnergyKwh = (evProfile.initialSoCPct / 100) * evProfile.batteryCapacityKwh;

      const reachableCandidates = candidateList.filter((c) => {
        const distKm = calculateDistance(input.origin.lat, input.origin.lon, c.lat, c.lon);
        const energyConsumed = calculateEnergyConsumed(distKm, evProfile.consumptionKwhPerKm);
        const arrivalEnergy = initialEnergyKwh - energyConsumed;
        const arrivalSoC = (arrivalEnergy / evProfile.batteryCapacityKwh) * 100;
        return arrivalSoC >= evProfile.minSoCBufferPct;
      });

      if (reachableCandidates.length === 0) {
        throw new Error(
          `Destination cannot be reached safely with current battery SoC (${evProfile.initialSoCPct}%), and no safe reachable fallback charging station exists respecting minimum safety buffer of ${evProfile.minSoCBufferPct}%. (${multiMsg})`
        );
      }

      // Sort reachable candidates by distance to origin
      reachableCandidates.sort((a, b) => {
        const distA = calculateDistance(input.origin.lat, input.origin.lon, a.lat, a.lon);
        const distB = calculateDistance(input.origin.lat, input.origin.lon, b.lat, b.lon);
        return distA - distB;
      });

      const nearestCharger = reachableCandidates[0]!;
      const { getRoute } = await import("../osrm/osrmClient.js");

      const routeToCharger = await getRoute(input.origin.lon, input.origin.lat, nearestCharger.lon, nearestCharger.lat);
      const energyToCharger = calculateEnergyConsumed(routeToCharger.distanceKm, evProfile.consumptionKwhPerKm);
      const arrivalSoCPct = ((initialEnergyKwh - energyToCharger) / evProfile.batteryCapacityKwh) * 100;

      let routeFromChargerToDest;
      try {
        routeFromChargerToDest = await getRoute(nearestCharger.lon, nearestCharger.lat, input.destination.lon, input.destination.lat);
      } catch {
        routeFromChargerToDest = null;
      }

      const destDist = routeFromChargerToDest ? routeFromChargerToDest.distanceKm : 0;
      const destDur = routeFromChargerToDest ? routeFromChargerToDest.durationMinutes : 0;
      const energyToDest = calculateEnergyConsumed(destDist, evProfile.consumptionKwhPerKm);
      const socNeededToDest = (energyToDest / evProfile.batteryCapacityKwh) * 100;
      const targetSoCPct = Math.min(100, Math.max(80, Math.ceil(socNeededToDest + evProfile.minSoCBufferPct)));
      const chargingTimeMinutes = Math.max(0, ((targetSoCPct - arrivalSoCPct) / 100) * evProfile.batteryCapacityKwh / Math.min(nearestCharger.powerKw, evProfile.chargingPowerKw) * 60);

      const destSoCPct = Math.max(evProfile.minSoCBufferPct, targetSoCPct - socNeededToDest);

      const nearestFallbackResult: MultiStopOptimizerResult = {
        origin: input.origin,
        destination: input.destination,
        stops: [
          {
            charger: nearestCharger,
            socBeforeChargingPct: arrivalSoCPct,
            socAfterChargingPct: targetSoCPct,
            energyChargedKwh: ((targetSoCPct - arrivalSoCPct) / 100) * evProfile.batteryCapacityKwh,
            chargingTimeMinutes,
            legDistanceToChargerKm: routeToCharger.distanceKm,
            prediction: {
              stationId: nearestCharger.id,
              availabilityProbability: 1.0,
              expectedWaitMinutes: 0,
              reliabilityScore: 1.0,
              confidence: 1.0
            }
          }
        ],
        legs: [
          {
            from: input.origin.name,
            to: nearestCharger.name,
            distanceKm: routeToCharger.distanceKm,
            durationMinutes: routeToCharger.durationMinutes,
            startSoCPct: evProfile.initialSoCPct,
            endSoCPct: arrivalSoCPct,
            geometry: routeToCharger.geometry
          },
          ...(routeFromChargerToDest ? [{
            from: nearestCharger.name,
            to: input.destination.name,
            distanceKm: destDist,
            durationMinutes: destDur,
            startSoCPct: targetSoCPct,
            endSoCPct: destSoCPct,
            geometry: routeFromChargerToDest.geometry
          }] : [])
        ],
        totalDistanceKm: routeToCharger.distanceKm + destDist,
        totalDrivingDurationMinutes: routeToCharger.durationMinutes + destDur,
        totalChargingDurationMinutes: chargingTimeMinutes,
        totalPredictedWaitMinutes: 0,
        totalTripDurationMinutes: routeToCharger.durationMinutes + destDur + chargingTimeMinutes,
        initialSoCPct: evProfile.initialSoCPct,
        destinationSoCPct: destSoCPct,
        totalCost: 1.0,
        reason: `Fallback to Nearest Safe Charger: Selected ${nearestCharger.name} as nearest safe reachable charger (${calculateDistance(input.origin.lat, input.origin.lon, nearestCharger.lat, nearestCharger.lon).toFixed(1)} km away).`,
        evaluatedRoutesCount: candidateList.length,
        feasibleRoutesCount: reachableCandidates.length,
        mode: input.mode || "BALANCED",
        alternatives: []
      };

      return { result: nearestFallbackResult, strategyUsed: "NEAREST_SAFE_CHARGER" };
    }
  }
}
