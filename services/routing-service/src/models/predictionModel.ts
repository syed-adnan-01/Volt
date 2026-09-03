export interface StationPrediction {
  stationId: string;
  availabilityProbability: number;
  expectedWaitMinutes: number;
  reliabilityScore: number;
  confidence: number;
  modelVersion?: string;
}

/**
 * Provides a default fallback prediction when Member 4 prediction data is not supplied.
 */
export function getDefaultPrediction(stationId: string): StationPrediction {
  return {
    stationId,
    availabilityProbability: 1.0,
    expectedWaitMinutes: 0,
    reliabilityScore: 1.0,
    confidence: 1.0,
    modelVersion: "default-fallback-v1"
  };
}

/**
 * Normalizes and validates raw prediction input values into standard ranges [0, 1].
 */
export function sanitizePrediction(pred: Partial<StationPrediction> & { stationId: string }): StationPrediction {
  const rawAvailability = pred.availabilityProbability ?? 1.0;
  const rawReliability = pred.reliabilityScore ?? 1.0;
  const rawConfidence = pred.confidence ?? 1.0;

  return {
    stationId: pred.stationId,
    availabilityProbability: rawAvailability > 1 ? rawAvailability / 100 : Math.max(0, Math.min(1, rawAvailability)),
    expectedWaitMinutes: Math.max(0, pred.expectedWaitMinutes ?? 0),
    reliabilityScore: rawReliability > 1 ? rawReliability / 100 : Math.max(0, Math.min(1, rawReliability)),
    confidence: rawConfidence > 1 ? rawConfidence / 100 : Math.max(0, Math.min(1, rawConfidence)),
    modelVersion: pred.modelVersion ?? "member4-v1"
  };
}
