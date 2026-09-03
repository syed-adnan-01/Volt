import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { planEVRoute } from "../routePlanner.js";
import type { Location } from "../routePlanner.js";
import { DEFAULT_EV_VEHICLE } from "../models/evModel.js";

describe("EV Route Planner Integration Tests", () => {
  const bengaluru: Location = {
    name: "Bengaluru",
    lat: 12.9716,
    lon: 77.5946
  };

  const mysuru: Location = {
    name: "Mysuru",
    lat: 12.2958,
    lon: 76.6394
  };

  test("100% initial SoC completes trip without unnecessary charging stops", async () => {
    const result = await planEVRoute(bengaluru, mysuru, {
      ...DEFAULT_EV_VEHICLE,
      initialSoCPct: 100
    });

    assert.equal(result.stops.length, 0);
    assert.equal(result.totalChargingDurationMinutes, 0);
    assert.equal(result.destinationSoCPct >= DEFAULT_EV_VEHICLE.minSoCBufferPct, true);
  });

  test("Low initial SoC (30%) triggers a charging stop", async () => {
    const result = await planEVRoute(bengaluru, mysuru, {
      ...DEFAULT_EV_VEHICLE,
      initialSoCPct: 30
    });

    assert.equal(result.stops.length > 0, true);
    assert.equal(result.totalChargingDurationMinutes > 0, true);

    const firstStop = result.stops[0];
    assert.ok(firstStop);
    assert.equal(firstStop.socBeforeChargingPct >= 0, true);
    assert.equal(result.destinationSoCPct >= DEFAULT_EV_VEHICLE.minSoCBufferPct, true);
  });

  test("Throws clear error when no reachable charger exists for low battery", async () => {
    const unreachableProfile = {
      ...DEFAULT_EV_VEHICLE,
      initialSoCPct: 2, // Only 2% battery (1.2 kWh = ~8 km range)
      minSoCBufferPct: 20
    };

    await assert.rejects(
      async () => {
        await planEVRoute(bengaluru, mysuru, unreachableProfile);
      },
      (err: Error) => {
        return err.message.includes("cannot be reached");
      }
    );
  });
});
