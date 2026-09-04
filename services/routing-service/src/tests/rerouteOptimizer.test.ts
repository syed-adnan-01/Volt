import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { optimizeReroute } from "../optimization/rerouteOptimizer.js";
import type { Location } from "../optimization/multiStopOptimizer.js";
import { DEFAULT_EV_VEHICLE } from "../models/evModel.js";
import type { StationPrediction } from "../models/predictionModel.js";
import { createServer } from "../server.js";

describe("Real-Time Rerouting Tests", () => {
  const currentLocation: Location = { name: "En-Route Ramanagara", lat: 12.7150, lon: 77.2810 };
  const destination: Location = { name: "Mysuru", lat: 12.2958, lon: 76.6394 };

  test("A. Rerouting triggered when planned charger becomes unavailable", async () => {
    const predictions: Record<string, StationPrediction> = {
      C004: { stationId: "C004", availabilityProbability: 0.05, expectedWaitMinutes: 60, reliabilityScore: 0.2, confidence: 0.9 },
      C001: { stationId: "C001", availabilityProbability: 0.95, expectedWaitMinutes: 0, reliabilityScore: 0.95, confidence: 0.95 }
    };

    const result = await optimizeReroute({
      currentLocation,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 30 },
      currentPlannedStops: ["C004"],
      predictions
    });

    assert.equal(result.rerouteRecommended, true);
    assert.ok(result.triggerEvent?.includes("PLANNED_CHARGER_UNAVAILABLE"));
    assert.notEqual(result.optimizedRoute.stops[0]?.charger.id, "C004");
  });

  test("B. Rerouting triggered when predicted wait time increases significantly", async () => {
    const predictions: Record<string, StationPrediction> = {
      C004: { stationId: "C004", availabilityProbability: 0.9, expectedWaitMinutes: 45, reliabilityScore: 0.9, confidence: 0.9 },
      C001: { stationId: "C001", availabilityProbability: 0.95, expectedWaitMinutes: 0, reliabilityScore: 0.95, confidence: 0.95 }
    };

    const result = await optimizeReroute({
      currentLocation,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 35 },
      currentPlannedStops: ["C004"],
      predictions
    });

    assert.equal(result.rerouteRecommended, true);
    assert.ok(result.triggerEvent?.includes("PLANNED_CHARGER_WAIT_TIME_SPIKE"));
  });

  test("C. Rerouting triggered when charger reliability drops", async () => {
    const predictions: Record<string, StationPrediction> = {
      C004: { stationId: "C004", availabilityProbability: 0.9, expectedWaitMinutes: 5, reliabilityScore: 0.2, confidence: 0.9 },
      C001: { stationId: "C001", availabilityProbability: 0.95, expectedWaitMinutes: 0, reliabilityScore: 0.95, confidence: 0.95 }
    };

    const result = await optimizeReroute({
      currentLocation,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 35 },
      currentPlannedStops: ["C004"],
      predictions
    });

    assert.equal(result.rerouteRecommended, true);
    assert.ok(result.triggerEvent?.includes("PLANNED_CHARGER_RELIABILITY_DROP"));
  });

  test("D. Rerouting triggered on driver route deviation", async () => {
    const result = await optimizeReroute({
      currentLocation,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 },
      currentPlannedStops: ["C004"],
      driverDeviated: true
    });

    assert.equal(result.rerouteRecommended, true);
    assert.equal(result.triggerEvent, "DRIVER_ROUTE_DEVIATION");
  });

  test("E. Hysteresis prevents unnecessary route oscillation when cost improvement is minimal", async () => {
    const result = await optimizeReroute({
      currentLocation,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 },
      currentPlannedStops: ["C001"],
      previousRouteCost: 0.100,
      previousTripDurationMinutes: 89.0, // Comparable duration
      minCostImprovementPct: 15.0, // Strict threshold
      minEtaImprovementMinutes: 10.0
    });

    assert.equal(result.rerouteRecommended, false);
    assert.ok(result.rerouteReason.includes("hysteresis threshold"));
  });

  test("F. POST /api/route/reroute returns 200 for valid request", async () => {
    const app = createServer();
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address !== null ? address.port : 3000;

    try {
      const response = await fetch(`http://localhost:${port}/api/route/reroute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentLocation: { name: "Ramanagara", lat: 12.7150, lon: 77.2810 },
          destination: { name: "Mysuru", lat: 12.2958, lon: 76.6394 },
          ev: { initialSoCPct: 35 },
          driverDeviated: true
        })
      });

      assert.equal(response.status, 200);
      const data = await response.json() as { rerouteRecommended: boolean };
      assert.equal(data.rerouteRecommended, true);
    } finally {
      server.close();
    }
  });

  test("G. POST /api/route/reroute returns 400 for invalid coordinates", async () => {
    const app = createServer();
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === "object" && address !== null ? address.port : 3000;

    try {
      const response = await fetch(`http://localhost:${port}/api/route/reroute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentLocation: { lat: 999, lon: 77.2810 },
          destination: { lat: 12.2958, lon: 76.6394 }
        })
      });

      assert.equal(response.status, 400);
      const data = await response.json() as { error: string };
      assert.ok(data.error.includes("Invalid currentLocation latitude"));
    } finally {
      server.close();
    }
  });

  test("H. Rerouting triggered on meaningful SoC change", async () => {
    const result = await optimizeReroute({
      currentLocation,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 25 },
      previousSoCPct: 45, // 20% SoC drop (>= 10% threshold)
      currentPlannedStops: ["C001"]
    });

    assert.equal(result.rerouteRecommended, true);
    assert.ok(result.triggerEvent?.includes("MEANINGFUL_SOC_CHANGE"));
  });

  test("I. Reroute cooldown suppresses non-critical route oscillation", async () => {
    const result = await optimizeReroute({
      currentLocation,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 35 },
      lastReroutedTimestampMs: Date.now() - 10000, // Rerouted 10 seconds ago (< 60s cooldown)
      cooldownMs: 60000
    });

    assert.equal(result.rerouteRecommended, false);
    assert.ok(result.rerouteReason.includes("active cooldown period"));
  });
});
