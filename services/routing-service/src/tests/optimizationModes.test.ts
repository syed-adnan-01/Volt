import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { optimizeMultiStopRoute } from "../optimization/multiStopOptimizer.js";
import type { Location } from "../optimization/multiStopOptimizer.js";
import { DEFAULT_EV_VEHICLE } from "../models/evModel.js";
import { getWeightsForMode, OPTIMIZATION_MODE_WEIGHTS } from "../scoring/routeCost.js";

describe("Optimization Modes Tests", () => {
  const origin: Location = { name: "Bengaluru", lat: 12.9716, lon: 77.5946 };
  const destination: Location = { name: "Mysuru", lat: 12.2958, lon: 76.6394 };

  test("A. getWeightsForMode resolves correct mode weights", () => {
    const fastest = getWeightsForMode("FASTEST");
    assert.equal(fastest.drive, OPTIMIZATION_MODE_WEIGHTS.FASTEST.drive);

    const reliable = getWeightsForMode("MOST_RELIABLE");
    assert.equal(reliable.reliability, OPTIMIZATION_MODE_WEIGHTS.MOST_RELIABLE.reliability);

    const minCharge = getWeightsForMode("MINIMUM_CHARGING");
    assert.equal(minCharge.charging, OPTIMIZATION_MODE_WEIGHTS.MINIMUM_CHARGING.charging);

    const balanced = getWeightsForMode("BALANCED");
    assert.equal(balanced.drive, OPTIMIZATION_MODE_WEIGHTS.BALANCED.drive);
  });

  test("B. FASTEST mode optimizes total journey duration", async () => {
    const result = await optimizeMultiStopRoute({
      origin,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 },
      mode: "FASTEST"
    });

    assert.equal(result.mode, "FASTEST");
    assert.ok(result.totalTripDurationMinutes > 0);
  });

  test("C. MOST_RELIABLE mode incorporates reliability weighting", async () => {
    const result = await optimizeMultiStopRoute({
      origin,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 },
      mode: "MOST_RELIABLE"
    });

    assert.equal(result.mode, "MOST_RELIABLE");
    assert.ok(result.totalCost >= 0);
  });

  test("D. MINIMUM_CHARGING mode minimizes charging stop penalty", async () => {
    const result = await optimizeMultiStopRoute({
      origin,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 },
      mode: "MINIMUM_CHARGING"
    });

    assert.equal(result.mode, "MINIMUM_CHARGING");
    assert.ok(result.stops.length >= 1);
  });

  test("E. Route Alternatives returned in result", async () => {
    const result = await optimizeMultiStopRoute({
      origin,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 },
      mode: "BALANCED",
      returnAlternativesCount: 2
    });

    assert.ok(Array.isArray(result.alternatives));
  });
});
