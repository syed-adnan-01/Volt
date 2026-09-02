// ──────────────────────────────────────────────
// Prediction Client (Integration with Member 4)
// ──────────────────────────────────────────────

import { getCachedJson, setCachedJson } from '../cache/redisCache.js';

export interface ChargerPrediction {
  stationId: string;
  predictedAvailablePlugs: number;
  expectedWaitMinutes: number;
  reliabilityScore: number; // 0 to 1
  timestamp: string;
}

/**
 * Gets availability and reliability predictions for a set of stations.
 * Includes 5-minute Redis caching.
 */
export async function getStationPredictions(
  stationIds: string[]
): Promise<Record<string, ChargerPrediction>> {
  const predictions: Record<string, ChargerPrediction> = {};
  const missingIds: string[] = [];

  // Check Redis cache for each station ID
  for (const id of stationIds) {
    const cached = await getCachedJson<ChargerPrediction>(`cache:prediction:${id}`);
    if (cached) {
      predictions[id] = cached;
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) {
    return predictions;
  }

  // Simulate network delay for uncached stations
  await new Promise(resolve => setTimeout(resolve, 100));

  for (const id of missingIds) {
    const prediction: ChargerPrediction = {
      stationId: id,
      predictedAvailablePlugs: Math.floor(Math.random() * 4) + 1,
      expectedWaitMinutes: Math.floor(Math.random() * 15),
      reliabilityScore: 0.85 + (Math.random() * 0.1),
      timestamp: new Date().toISOString(),
    };

    predictions[id] = prediction;
    // Cache prediction for 5 minutes (300 seconds)
    await setCachedJson(`cache:prediction:${id}`, prediction, 300);
  }

  return predictions;
}
