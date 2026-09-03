import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { runStrategyBenchmark } from "../benchmark/strategyBenchmark.js";
import type { Location } from "../optimization/multiStopOptimizer.js";
import { DEFAULT_EV_VEHICLE } from "../models/evModel.js";

describe("Strategy Benchmark Tests", () => {
  const origin: Location = { name: "Bengaluru", lat: 12.9716, lon: 77.5946 };
  const destination: Location = { name: "Mysuru", lat: 12.2958, lon: 76.6394 };

  test("A. runStrategyBenchmark evaluates all 4 strategies successfully", async () => {
    const res = await runStrategyBenchmark(
      origin,
      destination,
      { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 }
    );

    assert.ok(res.benchmarkResults.length >= 4);
    assert.ok(res.summaryMessage.includes("Strategy Benchmark complete"));

    for (const b of res.benchmarkResults) {
      assert.ok(b.totalTripDurationMinutes > 0);
      assert.ok(b.destinationSoCPct >= 0);
    }
  });
});
