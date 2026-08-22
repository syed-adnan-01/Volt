// ──────────────────────────────────────────────
// Optimizer Client (Integration with Member 5)
// ──────────────────────────────────────────────

import type { Charger } from './chargerClient.js';
import type { ChargerPrediction } from './predictionClient.js';
import type { BatteryResult, RoutingResult } from '@volt/contracts';

export interface TripStop {
  stationId: string;
  sequence: number;
  arrivalSoc: number;
  departureSoc: number;
  expectedWaitMinutes: number;
  chargingMinutes: number;
  latitude: number;
  longitude: number;
}

export interface OptimizerResult {
  status: 'OPTIMAL' | 'SUBOPTIMAL' | 'UNREACHABLE';
  stops: TripStop[];
  totalWaitMinutes: number;
  totalChargingMinutes: number;
  finalSoc: number;
}

/**
 * Computes the best multi-stop sequence.
 * Mock implementation for Phase 3 development.
 */
export async function optimizeTrip(
  route: RoutingResult,
  vehicleId: string,
  currentSoc: number,
  candidateChargers: Charger[],
  predictions: Record<string, ChargerPrediction>
): Promise<OptimizerResult> {
  // Simulate computation delay
  await new Promise(resolve => setTimeout(resolve, 200));

  if (candidateChargers.length === 0) {
    return {
      status: 'UNREACHABLE',
      stops: [],
      totalWaitMinutes: 0,
      totalChargingMinutes: 0,
      finalSoc: 0,
    };
  }

  // Pick the first charger as a mock single stop
  const selectedCharger = candidateChargers[0];
  const prediction = predictions[selectedCharger.id];

  const stop: TripStop = {
    stationId: selectedCharger.id,
    sequence: 1,
    arrivalSoc: Math.max(10, currentSoc - 40), // mock
    departureSoc: 80, // mock
    expectedWaitMinutes: prediction ? prediction.expectedWaitMinutes : 0,
    chargingMinutes: 25,
    latitude: selectedCharger.latitude,
    longitude: selectedCharger.longitude,
  };

  return {
    status: 'OPTIMAL',
    stops: [stop],
    totalWaitMinutes: stop.expectedWaitMinutes,
    totalChargingMinutes: stop.chargingMinutes,
    finalSoc: 30, // mock arrival at destination
  };
}
