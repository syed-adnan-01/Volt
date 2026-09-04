import type { StationPrediction } from "../models/predictionModel.js";
import { sanitizePrediction } from "../models/predictionModel.js";

export type OptimizationMode = "FASTEST" | "MOST_RELIABLE" | "MINIMUM_CHARGING" | "BALANCED";

export interface RouteCostWeights {
  drive: number;
  detour: number;
  wait: number;
  charging: number;
  risk: number;
  reliability: number;
}

export const DEFAULT_ROUTE_COST_WEIGHTS: RouteCostWeights = {
  drive: 0.20,
  detour: 0.05,
  wait: 0.30,
  charging: 0.10,
  risk: 0.15,
  reliability: 0.20
};

export const OPTIMIZATION_MODE_WEIGHTS: Record<OptimizationMode, RouteCostWeights> = {
  BALANCED: {
    drive: 0.20,
    detour: 0.05,
    wait: 0.30,
    charging: 0.10,
    risk: 0.15,
    reliability: 0.20
  },
  FASTEST: {
    drive: 0.40,
    detour: 0.20,
    wait: 0.20,
    charging: 0.10,
    risk: 0.05,
    reliability: 0.05
  },
  MOST_RELIABLE: {
    drive: 0.05,
    detour: 0.05,
    wait: 0.25,
    charging: 0.05,
    risk: 0.15,
    reliability: 0.45
  },
  MINIMUM_CHARGING: {
    drive: 0.15,
    detour: 0.10,
    wait: 0.10,
    charging: 0.45,
    risk: 0.15,
    reliability: 0.05
  }
};

export function getWeightsForMode(
  mode: OptimizationMode = "BALANCED",
  customWeights?: Partial<RouteCostWeights>
): RouteCostWeights {
  const baseWeights = OPTIMIZATION_MODE_WEIGHTS[mode] || OPTIMIZATION_MODE_WEIGHTS.BALANCED;
  if (!customWeights) return baseWeights;
  return { ...baseWeights, ...customWeights };
}

export interface RawCandidateMetrics {
  chargerId: string;
  drivingDurationMinutes: number;
  detourMinutes: number;
  expectedWaitMinutes: number;
  chargingDurationMinutes: number;
  arrivalSoCPct: number;
  minSoCBufferPct: number;
  prediction: StationPrediction;
}

export interface NormalizedCandidateMetrics {
  driveNorm: number;
  detourNorm: number;
  waitNorm: number;
  chargingNorm: number;
  riskNorm: number;
  reliabilityNorm: number;
}

export interface CandidateCostBreakdown {
  chargerId: string;
  rawMetrics: {
    drivingDurationMinutes: number;
    detourMinutes: number;
    expectedWaitMinutes: number;
    chargingDurationMinutes: number;
    arrivalSoCPct: number;
    reliabilityScore: number;
    confidence: number;
  };
  normalizedMetrics: NormalizedCandidateMetrics;
  weightedScores: {
    drive: number;
    detour: number;
    wait: number;
    charging: number;
    risk: number;
    reliability: number;
  };
  totalCost: number;
}

/**
 * Calculates normalized metric scores and total route cost for a set of candidate chargers.
 */
export function calculateRouteCosts(
  candidates: RawCandidateMetrics[],
  customWeights?: Partial<RouteCostWeights>,
  mode: OptimizationMode = "BALANCED"
): CandidateCostBreakdown[] {
  if (candidates.length === 0) {
    return [];
  }

  // Resolve base weights for selected optimization mode and merge custom weights
  const rawWeights: RouteCostWeights = getWeightsForMode(mode, customWeights);

  const totalWeightSum =
    rawWeights.drive +
    rawWeights.detour +
    rawWeights.wait +
    rawWeights.charging +
    rawWeights.risk +
    rawWeights.reliability;

  const weights: RouteCostWeights = totalWeightSum > 0 ? {
    drive: rawWeights.drive / totalWeightSum,
    detour: rawWeights.detour / totalWeightSum,
    wait: rawWeights.wait / totalWeightSum,
    charging: rawWeights.charging / totalWeightSum,
    risk: rawWeights.risk / totalWeightSum,
    reliability: rawWeights.reliability / totalWeightSum
  } : DEFAULT_ROUTE_COST_WEIGHTS;

  // Compute intermediate metrics for each candidate incorporating confidence & reliability
  const prepared = candidates.map((cand) => {
    const pred = sanitizePrediction(cand.prediction);

    const rawDrive = Math.max(0, cand.drivingDurationMinutes);
    const rawDetour = Math.max(0, cand.detourMinutes);

    // Predicted Wait influenced by confidence:
    // Low confidence increases wait uncertainty penalty.
    const confidence = pred.confidence;
    const adjustedWait = pred.expectedWaitMinutes * (1 + (1 - confidence)) + (1 - confidence) * 5;

    const rawCharging = Math.max(0, cand.chargingDurationMinutes);

    // Battery Risk:
    // If arrival SoC < buffer, risk score increases rapidly.
    // If arrival SoC >= buffer, risk is minimal based on remaining headroom.
    const buffer = cand.minSoCBufferPct > 0 ? cand.minSoCBufferPct : 20;
    let rawRisk: number;
    if (cand.arrivalSoCPct < buffer) {
      rawRisk = 0.5 + 0.5 * Math.max(0, (buffer - cand.arrivalSoCPct) / buffer);
    } else {
      rawRisk = (100 - Math.min(100, cand.arrivalSoCPct)) / 100 * 0.2;
    }

    // Reliability Penalty influenced by prediction confidence:
    const relScore = pred.reliabilityScore;
    const rawReliabilityPenalty = (1.0 - relScore) + (1.0 - confidence) * 0.5;

    return {
      cand,
      pred,
      rawDrive,
      rawDetour,
      adjustedWait,
      rawCharging,
      rawRisk,
      rawReliabilityPenalty
    };
  });

  const getMinMax = (fn: (item: (typeof prepared)[0]) => number, refScale: number) => {
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const item of prepared) {
      const val = fn(item);
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
    return { minVal, maxVal, refScale };
  };

  const driveStats = getMinMax((i) => i.rawDrive, 120);
  const detourStats = getMinMax((i) => i.rawDetour, 30);
  const waitStats = getMinMax((i) => i.adjustedWait, 30);
  const chargingStats = getMinMax((i) => i.rawCharging, 60);
  const riskStats = getMinMax((i) => i.rawRisk, 1.0);
  const relStats = getMinMax((i) => i.rawReliabilityPenalty, 1.0);

  const normalizeMetric = (val: number, stats: { minVal: number; maxVal: number; refScale: number }) => {
    const range = stats.maxVal - stats.minVal;
    if (range > 0.00001) {
      return Math.max(0, Math.min(1, (val - stats.minVal) / range));
    }
    return Math.max(0, Math.min(1, val / stats.refScale));
  };

  return prepared.map((item) => {
    const driveNorm = normalizeMetric(item.rawDrive, driveStats);
    const detourNorm = normalizeMetric(item.rawDetour, detourStats);
    const waitNorm = normalizeMetric(item.adjustedWait, waitStats);
    const chargingNorm = normalizeMetric(item.rawCharging, chargingStats);
    const riskNorm = normalizeMetric(item.rawRisk, riskStats);
    const reliabilityNorm = normalizeMetric(item.rawReliabilityPenalty, relStats);

    const weightedScores = {
      drive: weights.drive * driveNorm,
      detour: weights.detour * detourNorm,
      wait: weights.wait * waitNorm,
      charging: weights.charging * chargingNorm,
      risk: weights.risk * riskNorm,
      reliability: weights.reliability * reliabilityNorm
    };

    const totalCost =
      weightedScores.drive +
      weightedScores.detour +
      weightedScores.wait +
      weightedScores.charging +
      weightedScores.risk +
      weightedScores.reliability;

    return {
      chargerId: item.cand.chargerId,
      rawMetrics: {
        drivingDurationMinutes: item.cand.drivingDurationMinutes,
        detourMinutes: item.cand.detourMinutes,
        expectedWaitMinutes: item.cand.prediction.expectedWaitMinutes,
        chargingDurationMinutes: item.cand.chargingDurationMinutes,
        arrivalSoCPct: item.cand.arrivalSoCPct,
        reliabilityScore: item.pred.reliabilityScore,
        confidence: item.pred.confidence
      },
      normalizedMetrics: {
        driveNorm,
        detourNorm,
        waitNorm,
        chargingNorm,
        riskNorm,
        reliabilityNorm
      },
      weightedScores,
      totalCost
    };
  });
}
