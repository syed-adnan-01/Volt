import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { optimizeSingleStop } from "../optimization/singleStopOptimizer.js";
import type { Location } from "../optimization/singleStopOptimizer.js";
import type { Charger } from "../chargers/chargerCandidates.js";
import type { StationPrediction } from "../models/predictionModel.js";
import { calculateRouteCosts } from "../scoring/routeCost.js";
import { DEFAULT_EV_VEHICLE } from "../models/evModel.js";

describe("Single-Stop Optimization & Scoring Tests", () => {
  const origin: Location = {
    name: "Bengaluru",
    lat: 12.9716,
    lon: 77.5946
  };

  const destination: Location = {
    name: "Mysuru",
    lat: 12.2958,
    lon: 76.6394
  };

  test("Candidate with shorter drive but high wait vs candidate with longer drive and low wait", async () => {
    // Bidadi is nearest (~32km), Maddur is further (~80km)
    // Bidadi predictions: 45 min wait time
    // Maddur predictions: 0 min wait time
    const predictions: Record<string, StationPrediction> = {
      C004: {
        stationId: "C004", // Bidadi Fast Charger (Nearest)
        availabilityProbability: 0.2,
        expectedWaitMinutes: 45,
        reliabilityScore: 0.5,
        confidence: 0.9
      },
      C005: {
        stationId: "C005", // Ramanagara Charger
        availabilityProbability: 0.2,
        expectedWaitMinutes: 50,
        reliabilityScore: 0.4,
        confidence: 0.9
      },
      C001: {
        stationId: "C001", // Maddur Charger (Further)
        availabilityProbability: 0.95,
        expectedWaitMinutes: 0,
        reliabilityScore: 0.95,
        confidence: 0.95
      },
      C002: {
        stationId: "C002", // Mandya Charger
        availabilityProbability: 0.8,
        expectedWaitMinutes: 15,
        reliabilityScore: 0.8,
        confidence: 0.9
      },
      C003: {
        stationId: "C003", // Mysuru Charger
        availabilityProbability: 0.3,
        expectedWaitMinutes: 60,
        reliabilityScore: 0.4,
        confidence: 0.8
      }
    };

    const result = await optimizeSingleStop({
      origin,
      destination,
      evProfile: {
        ...DEFAULT_EV_VEHICLE,
        initialSoCPct: 50
      },
      predictions
    });

    // Optimizer should pick Maddur (C001) over Bidadi (C004) because Maddur has 0 wait and high reliability
    assert.equal(result.selectedCharger.id, "C001");
    assert.ok(result.totalCost < result.rankedCandidates.find((c) => c.charger.id === "C004")!.costBreakdown.totalCost);
    assert.ok(result.reason.includes("Selected Maddur Charger"));
  });

  test("Selected candidate is NOT necessarily the nearest charger", async () => {
    // Bidadi (C004) is the nearest charger to Bengaluru along Mysuru road (~32km).
    // Set heavy wait penalty for Bidadi, while further chargers have great availability.
    const predictions: Record<string, StationPrediction> = {
      C004: {
        stationId: "C004", // Nearest
        availabilityProbability: 0.1,
        expectedWaitMinutes: 60,
        reliabilityScore: 0.4,
        confidence: 0.8
      },
      C005: {
        stationId: "C005",
        availabilityProbability: 0.1,
        expectedWaitMinutes: 55,
        reliabilityScore: 0.4,
        confidence: 0.8
      },
      C001: {
        stationId: "C001", // Further
        availabilityProbability: 0.9,
        expectedWaitMinutes: 1,
        reliabilityScore: 0.9,
        confidence: 0.9
      },
      C003: {
        stationId: "C003",
        availabilityProbability: 0.2,
        expectedWaitMinutes: 60,
        reliabilityScore: 0.4,
        confidence: 0.8
      }
    };

    const result = await optimizeSingleStop({
      origin,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 50 },
      predictions
    });

    // Verify nearest charger (C004) is NOT selected
    assert.notEqual(result.selectedCharger.id, "C004");
    assert.equal(result.selectedCharger.id, "C001");
  });

  test("Reliability penalty increases total cost when station reliability drops", () => {
    const candidateA = {
      chargerId: "CH_HIGH_REL",
      drivingDurationMinutes: 50,
      detourMinutes: 5,
      expectedWaitMinutes: 10,
      chargingDurationMinutes: 20,
      arrivalSoCPct: 30,
      minSoCBufferPct: 20,
      prediction: {
        stationId: "CH_HIGH_REL",
        availabilityProbability: 0.9,
        expectedWaitMinutes: 10,
        reliabilityScore: 0.95, // 95% reliable
        confidence: 1.0
      }
    };

    const candidateB = {
      chargerId: "CH_LOW_REL",
      drivingDurationMinutes: 50,
      detourMinutes: 5,
      expectedWaitMinutes: 10,
      chargingDurationMinutes: 20,
      arrivalSoCPct: 30,
      minSoCBufferPct: 20,
      prediction: {
        stationId: "CH_LOW_REL",
        availabilityProbability: 0.9,
        expectedWaitMinutes: 10,
        reliabilityScore: 0.20, // 20% reliable
        confidence: 1.0
      }
    };

    const costs = calculateRouteCosts([candidateA, candidateB]);

    const highRelCost = costs.find((c) => c.chargerId === "CH_HIGH_REL")!;
    const lowRelCost = costs.find((c) => c.chargerId === "CH_LOW_REL")!;

    assert.ok(lowRelCost.normalizedMetrics.reliabilityNorm > highRelCost.normalizedMetrics.reliabilityNorm);
    assert.ok(lowRelCost.totalCost > highRelCost.totalCost);
  });

  test("Prediction confidence influences prediction risk and scoring", () => {
    const candidateHighConf = {
      chargerId: "HIGH_CONF",
      drivingDurationMinutes: 40,
      detourMinutes: 2,
      expectedWaitMinutes: 5,
      chargingDurationMinutes: 15,
      arrivalSoCPct: 40,
      minSoCBufferPct: 20,
      prediction: {
        stationId: "HIGH_CONF",
        availabilityProbability: 0.8,
        expectedWaitMinutes: 5,
        reliabilityScore: 0.8,
        confidence: 0.95 // High confidence
      }
    };

    const candidateLowConf = {
      chargerId: "LOW_CONF",
      drivingDurationMinutes: 40,
      detourMinutes: 2,
      expectedWaitMinutes: 5,
      chargingDurationMinutes: 15,
      arrivalSoCPct: 40,
      minSoCBufferPct: 20,
      prediction: {
        stationId: "LOW_CONF",
        availabilityProbability: 0.8,
        expectedWaitMinutes: 5,
        reliabilityScore: 0.8,
        confidence: 0.15 // Very low confidence
      }
    };

    const costs = calculateRouteCosts([candidateHighConf, candidateLowConf]);

    const highConf = costs.find((c) => c.chargerId === "HIGH_CONF")!;
    const lowConf = costs.find((c) => c.chargerId === "LOW_CONF")!;

    assert.ok(lowConf.totalCost > highConf.totalCost);
  });

  test("Candidates are ranked in ascending order of total cost", async () => {
    const predictions: Record<string, StationPrediction> = {
      C001: { stationId: "C001", availabilityProbability: 0.9, expectedWaitMinutes: 5, reliabilityScore: 0.9, confidence: 0.9 },
      C002: { stationId: "C002", availabilityProbability: 0.5, expectedWaitMinutes: 25, reliabilityScore: 0.6, confidence: 0.8 },
      C004: { stationId: "C004", availabilityProbability: 0.3, expectedWaitMinutes: 50, reliabilityScore: 0.4, confidence: 0.7 },
      C005: { stationId: "C005", availabilityProbability: 0.3, expectedWaitMinutes: 55, reliabilityScore: 0.4, confidence: 0.7 },
      C003: { stationId: "C003", availabilityProbability: 0.2, expectedWaitMinutes: 60, reliabilityScore: 0.3, confidence: 0.7 }
    };

    const result = await optimizeSingleStop({
      origin,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 50 },
      predictions
    });

    assert.ok(result.rankedCandidates.length >= 2);
    for (let i = 0; i < result.rankedCandidates.length - 1; i++) {
      const current = result.rankedCandidates[i]!;
      const next = result.rankedCandidates[i + 1]!;
      assert.ok(current.costBreakdown.totalCost <= next.costBreakdown.totalCost);
      assert.equal(current.rank, i + 1);
    }
  });

  test("Throws error when no reachable candidate exists for battery level", async () => {
    const customFarChargers: Charger[] = [
      {
        id: "FAR_1",
        name: "Way Too Far Charger",
        lat: 16.0, // ~400 km away
        lon: 77.0,
        powerKw: 60,
        connectorType: "CCS2",
        network: "NetFar"
      }
    ];

    await assert.rejects(
      async () => {
        await optimizeSingleStop({
          origin,
          destination,
          evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 5 }, // Only 5% SoC (~13km range)
          candidateChargers: customFarChargers
        });
      },
      (err: Error) => {
        return err.message.includes("No reachable candidate");
      }
    );
  });
});
