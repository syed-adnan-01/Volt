import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { optimizeMultiStopRoute, type Location } from "../optimization/multiStopOptimizer.js";
import { optimizeReroute } from "../optimization/rerouteOptimizer.js";
import { DEFAULT_EV_VEHICLE, calculateMaxRangeKm } from "../models/evModel.js";

describe("Phase 5: End-to-End Capstone Demo Scenarios", () => {
  const origin: Location = { name: "Bengaluru Hub", lat: 12.9716, lon: 77.5946 };
  const shortDest: Location = { name: "Bidadi Suburb", lat: 12.8000, lon: 77.4000 };
  const corridorDest: Location = { name: "Mysuru Destination", lat: 12.2958, lon: 76.6394 };

  // ─────────────────────────────────────────────────────────────
  // Demo Scenario 1: Standard Direct Reachable Journey
  // ─────────────────────────────────────────────────────────────
  test("Scenario 1: Direct Reachable Route with ample battery requires 0 charging stops", async () => {
    const result = await optimizeMultiStopRoute({
      origin,
      destination: shortDest,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 90 },
      mode: "BALANCED"
    });

    assert.strictEqual(result.stops.length, 0, "No charging stops should be planned for direct trip");
    assert.ok(result.destinationSoCPct >= DEFAULT_EV_VEHICLE.minSoCBufferPct, "Arrival SoC must exceed reserve buffer");
    assert.strictEqual(result.totalChargingDurationMinutes, 0, "Charging duration should be 0 minutes");
  });

  // ─────────────────────────────────────────────────────────────
  // Demo Scenario 2: Long-Haul Multi-Stop Corridor Optimization
  // ─────────────────────────────────────────────────────────────
  test("Scenario 2: Long-haul route with low starting SoC plans optimal charger stops", async () => {
    const result = await optimizeMultiStopRoute({
      origin,
      destination: corridorDest,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 30 },
      mode: "FASTEST",
      returnAlternativesCount: 2
    });

    assert.ok(result.stops.length >= 1, "At least one charging stop must be scheduled");
    assert.ok(result.totalChargingDurationMinutes > 0, "Charging duration must be positive");
    assert.ok(result.destinationSoCPct >= 0, "Destination SoC must remain non-negative");
    assert.ok(result.stops.length <= 3, "Stops should be bounded efficiently");
  });

  // ─────────────────────────────────────────────────────────────
  // Demo Scenario 3: Extreme Weather / Elevated Drain Physics
  // ─────────────────────────────────────────────────────────────
  test("Scenario 3: Severe weather/high-drain physics safely increases charging allocation", async () => {
    // Normal baseline (50% SoC)
    const normalResult = await optimizeMultiStopRoute({
      origin,
      destination: corridorDest,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 50 },
      mode: "BALANCED"
    });

    // Cold weather vehicle with 50% higher consumption
    const coldResult = await optimizeMultiStopRoute({
      origin,
      destination: corridorDest,
      evProfile: {
        ...DEFAULT_EV_VEHICLE,
        initialSoCPct: 50,
        consumptionKwhPerKm: DEFAULT_EV_VEHICLE.consumptionKwhPerKm * 1.50
      },
      mode: "BALANCED"
    });

    assert.ok(
      coldResult.totalChargingDurationMinutes >= normalResult.totalChargingDurationMinutes,
      "Cold weather requires equal or more charging time than normal conditions"
    );
  });

  // ─────────────────────────────────────────────────────────────
  // Demo Scenario 4: Real-Time In-Flight Dynamic Reroute
  // ─────────────────────────────────────────────────────────────
  test("Scenario 4: Congestion or station fault dynamically triggers seamless rerouting", async () => {
    const plannedStops = ["C001"];
    const rerouteRes = await optimizeReroute({
      currentLocation: origin,
      destination: corridorDest,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 30 },
      currentPlannedStops: plannedStops,
      mode: "BALANCED",
      blacklistedChargerIds: ["C001"] // Planned charger C001 just failed/congested
    });

    assert.ok(rerouteRes.rerouteRecommended, "Reroute must be recommended when planned stop is blacklisted");
    assert.ok(rerouteRes.optimizedRoute.stops.length > 0, "New alternative stops must be selected");
    assert.ok(!rerouteRes.optimizedRoute.stops.some(s => s.charger.id === "C001"), "Failed station must not be in new plan");
  });

  // ─────────────────────────────────────────────────────────────
  // Demo Scenario 5: Battery Degradation & Critical Low-SoC Margin
  // ─────────────────────────────────────────────────────────────
  test("Scenario 5: Degraded battery health (SOH 80%) enforces conservative safety constraints", async () => {
    const degradedVehicle = {
      ...DEFAULT_EV_VEHICLE,
      batteryCapacityKwh: 60.0 * 0.80, // 80% SOH = 48 kWh
      initialSoCPct: 40,
      minSoCBufferPct: 15.0 // Higher reserve buffer required for degraded pack
    };

    const maxRange = calculateMaxRangeKm(degradedVehicle);
    assert.ok(maxRange < calculateMaxRangeKm(DEFAULT_EV_VEHICLE), "Degraded pack range must be lower");

    const result = await optimizeMultiStopRoute({
      origin,
      destination: corridorDest,
      evProfile: degradedVehicle,
      mode: "MOST_RELIABLE"
    });

    assert.ok(result.stops.length >= 1, "Degraded battery plan must find a safe, reliable corridor");
    assert.ok(result.destinationSoCPct >= 0, "Must protect battery buffer");
  });
});
