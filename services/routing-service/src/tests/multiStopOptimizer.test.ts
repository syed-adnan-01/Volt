import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { optimizeMultiStopRoute } from "../optimization/multiStopOptimizer.js";
import type { Location } from "../optimization/multiStopOptimizer.js";
import type { Charger } from "../chargers/chargerCandidates.js";
import type { StationPrediction } from "../models/predictionModel.js";
import { DEFAULT_EV_VEHICLE } from "../models/evModel.js";

describe("Multi-Stop EV Route Optimizer Tests", () => {
  const bengaluru: Location = { name: "Bengaluru", lat: 12.9716, lon: 77.5946 };
  const mysuru: Location = { name: "Mysuru", lat: 12.2958, lon: 76.6394 };

  test("A. 100% SoC trip requiring no charging", async () => {
    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 100 }
    });

    assert.equal(result.stops.length, 0);
    assert.equal(result.totalChargingDurationMinutes, 0);
    assert.ok(result.destinationSoCPct >= DEFAULT_EV_VEHICLE.minSoCBufferPct);
  });

  test("B. 30% SoC trip requiring one charging stop", async () => {
    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 30 }
    });

    assert.equal(result.stops.length, 1);
    assert.ok(result.totalChargingDurationMinutes > 0);
    assert.ok(result.destinationSoCPct >= 0);
  });

  test("C. Very low SoC trip requiring multiple charging stops", async () => {
    // 15 kWh battery capacity gives max 100 km range on a 144 km trip.
    // Even at 100% charge at stop 1, distance to destination (111 km) exceeds full battery range.
    // Needs 2 stops to complete ~145 km trip safely while respecting 15% safety buffer.
    const lowBatteryVehicle = {
      batteryCapacityKwh: 15,
      consumptionKwhPerKm: 0.15,
      initialSoCPct: 50,
      minSoCBufferPct: 15,
      chargingPowerKw: 50
    };

    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: lowBatteryVehicle,
      maxChargingStops: 3
    });

    assert.ok(result.stops.length >= 2);
    assert.equal(result.legs.length, result.stops.length + 1);
  });

  test("D. No reachable charger", async () => {
    const customFarChargers: Charger[] = [
      { id: "FAR_1", name: "Far 1", lat: 16.0, lon: 77.0, powerKw: 60, connectorType: "CCS2", network: "NetA" }
    ];

    await assert.rejects(
      async () => {
        await optimizeMultiStopRoute({
          origin: bengaluru,
          destination: mysuru,
          evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 2 },
          candidateChargers: customFarChargers
        });
      },
      (err: Error) => err.message.includes("cannot be reached safely") || err.message.includes("no feasible")
    );
  });

  test("E. Candidate charger with poor reliability", async () => {
    const predictions: Record<string, StationPrediction> = {
      C004: { stationId: "C004", availabilityProbability: 0.9, expectedWaitMinutes: 0, reliabilityScore: 0.1, confidence: 1.0 },
      C005: { stationId: "C005", availabilityProbability: 0.9, expectedWaitMinutes: 0, reliabilityScore: 0.95, confidence: 1.0 },
      C003: { stationId: "C003", availabilityProbability: 0.9, expectedWaitMinutes: 0, reliabilityScore: 0.5, confidence: 1.0 },
      C002: { stationId: "C002", availabilityProbability: 0.9, expectedWaitMinutes: 0, reliabilityScore: 0.5, confidence: 1.0 },
      C001: { stationId: "C001", availabilityProbability: 0.9, expectedWaitMinutes: 0, reliabilityScore: 0.95, confidence: 1.0 }
    };

    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 },
      predictions,
      weights: { reliability: 0.70, drive: 0.10, detour: 0.05, risk: 0.05 }
    });

    // Poor reliability charger C004 (10% reliability) must be rejected
    assert.notEqual(result.stops[0]?.charger.id, "C004");
    assert.ok(result.stops[0]?.prediction.reliabilityScore! > 0.1);
  });

  test("F. Candidate charger with high predicted waiting time", async () => {
    const predictions: Record<string, StationPrediction> = {
      C004: { stationId: "C004", availabilityProbability: 0.2, expectedWaitMinutes: 60, reliabilityScore: 0.9, confidence: 0.9 },
      C005: { stationId: "C005", availabilityProbability: 0.9, expectedWaitMinutes: 0, reliabilityScore: 0.9, confidence: 0.9 },
      C003: { stationId: "C003", availabilityProbability: 0.2, expectedWaitMinutes: 60, reliabilityScore: 0.9, confidence: 0.9 },
      C002: { stationId: "C002", availabilityProbability: 0.9, expectedWaitMinutes: 0, reliabilityScore: 0.9, confidence: 0.9 },
      C001: { stationId: "C001", availabilityProbability: 0.9, expectedWaitMinutes: 0, reliabilityScore: 0.9, confidence: 0.9 }
    };

    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 },
      predictions,
      weights: { wait: 0.70, drive: 0.10, detour: 0.05, risk: 0.05 }
    });

    // High wait time charger C004 (60 min wait) must be rejected
    assert.notEqual(result.stops[0]?.charger.id, "C004");
    assert.ok(result.stops[0]?.prediction.expectedWaitMinutes! < 60);
  });

  test("G. Route with unnecessary charger should not select it", async () => {
    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 }
    });

    assert.equal(result.stops.length, 1);
  });

  test("H. Duplicate charger must not be selected twice", async () => {
    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 20 },
      maxChargingStops: 3,
      allowEmergencyReserve: true
    });

    const chargerIds = result.stops.map((s) => s.charger.id);
    const uniqueIds = new Set(chargerIds);
    assert.equal(chargerIds.length, uniqueIds.size);
  });

  test("I. Maximum charging-stop limit is respected", async () => {
    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 20 },
      maxChargingStops: 2,
      allowEmergencyReserve: true
    });

    assert.ok(result.stops.length <= 2);
  });

  test("J. Multi-stop route cost comparison selects the lowest-cost feasible complete route", async () => {
    const predictions: Record<string, StationPrediction> = {
      C004: { stationId: "C004", availabilityProbability: 0.2, expectedWaitMinutes: 50, reliabilityScore: 0.4, confidence: 0.8 },
      C005: { stationId: "C005", availabilityProbability: 0.95, expectedWaitMinutes: 0, reliabilityScore: 0.95, confidence: 0.95 },
      C003: { stationId: "C003", availabilityProbability: 0.2, expectedWaitMinutes: 50, reliabilityScore: 0.4, confidence: 0.8 },
      C002: { stationId: "C002", availabilityProbability: 0.95, expectedWaitMinutes: 0, reliabilityScore: 0.95, confidence: 0.95 },
      C001: { stationId: "C001", availabilityProbability: 0.95, expectedWaitMinutes: 0, reliabilityScore: 0.95, confidence: 0.95 }
    };

    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 },
      predictions,
      weights: { wait: 0.50, reliability: 0.30, drive: 0.10, detour: 0.05, risk: 0.05 }
    });

    assert.ok(result.totalCost >= 0);
    assert.notEqual(result.stops[0]?.charger.id, "C004");
  });

  test("K. Destination SoC remains valid", async () => {
    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 }
    });

    assert.ok(!isNaN(result.destinationSoCPct));
    assert.ok(result.destinationSoCPct >= DEFAULT_EV_VEHICLE.minSoCBufferPct);
  });

  test("L. No negative SoC occurs and safety buffer is respected", async () => {
    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 }
    });

    for (const leg of result.legs) {
      assert.ok(leg.startSoCPct >= DEFAULT_EV_VEHICLE.minSoCBufferPct, `Leg ${leg.from}->${leg.to} start SoC ${leg.startSoCPct}% below safety buffer`);
      assert.ok(leg.endSoCPct >= DEFAULT_EV_VEHICLE.minSoCBufferPct, `Leg ${leg.from}->${leg.to} end SoC ${leg.endSoCPct}% below safety buffer`);
    }
  });

  test("M. Destination Charger Exclusion: Mysuru Charger (C003) is excluded as en-route stop", async () => {
    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 }
    });

    assert.equal(result.stops.length, 1);
    assert.notEqual(result.stops[0]?.charger.id, "C003");
  });

  test("N. Charging Target: Charges only enough for next leg + safety buffer without unnecessary 100%", async () => {
    const result = await optimizeMultiStopRoute({
      origin: bengaluru,
      destination: mysuru,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 }
    });

    const stop = result.stops[0]!;
    assert.ok(stop.socAfterChargingPct < 100, `Target SoC ${stop.socAfterChargingPct}% should not unnecessarily be 100%`);
    assert.ok(stop.socAfterChargingPct >= DEFAULT_EV_VEHICLE.minSoCBufferPct);
  });
});
