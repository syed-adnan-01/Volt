import { startServer } from "./server.js";
import { optimizeMultiStopRoute } from "./optimization/multiStopOptimizer.js";
import { optimizeReroute } from "./optimization/rerouteOptimizer.js";
import { runStrategyBenchmark, printBenchmarkTable } from "./benchmark/strategyBenchmark.js";
import type { StationPrediction } from "./models/predictionModel.js";
import { DEFAULT_EV_VEHICLE } from "./models/evModel.js";

async function runMultiStopDemo() {
  console.log("==========================================================================");
  console.log("⚡ VOLT Routing Service - Member 5 Comprehensive Routing & Rerouting Demo");
  console.log("==========================================================================");

  const origin = { name: "Bengaluru", lat: 12.9716, lon: 77.5946 };
  const destination = { name: "Mysuru", lat: 12.2958, lon: 76.6394 };

  const initialPredictions: Record<string, StationPrediction> = {
    C004: { stationId: "C004", availabilityProbability: 0.9, expectedWaitMinutes: 10, reliabilityScore: 0.85, confidence: 0.9 },
    C005: { stationId: "C005", availabilityProbability: 0.8, expectedWaitMinutes: 20, reliabilityScore: 0.70, confidence: 0.85 },
    C001: { stationId: "C001", availabilityProbability: 0.95, expectedWaitMinutes: 0, reliabilityScore: 0.95, confidence: 0.95 }
  };

  // --- Scenario 1: 100% SoC (0 Charging Stops Expected) ---
  console.log("\n--------------------------------------------------------------------------");
  console.log("🔹 SCENARIO 1: Full Battery (100% SoC) -> Direct Route");
  console.log("--------------------------------------------------------------------------");
  try {
    const res1 = await optimizeMultiStopRoute({
      origin,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 100 },
      predictions: initialPredictions
    });

    console.log(`📍 Selected Route: ${res1.legs.map((l) => l.from).join(" ➡️ ")} ➡️ ${destination.name}`);
    console.log(`🔌 Charging Stops: ${res1.stops.length}`);
    res1.legs.forEach((leg, i) => {
      console.log(`  Leg ${i + 1}: ${leg.from} ➡️ ${leg.to} (${leg.distanceKm.toFixed(1)} km, ${leg.durationMinutes.toFixed(1)} mins, SoC: ${leg.startSoCPct.toFixed(1)}% ➡️ ${leg.endSoCPct.toFixed(1)}%)`);
    });
    console.log(`⏱️ Driving Time: ${res1.totalDrivingDurationMinutes.toFixed(1)} mins | Charging: ${res1.totalChargingDurationMinutes.toFixed(1)} mins | Wait: ${res1.totalPredictedWaitMinutes} mins`);
    console.log(`⏳ Total Trip Duration: ${res1.totalTripDurationMinutes.toFixed(1)} mins | Destination SoC: ${res1.destinationSoCPct.toFixed(1)}%`);
    console.log(`💰 Total Route Cost: ${res1.totalCost.toFixed(4)} | Mode: ${res1.mode}`);
    console.log(`📝 Explanation: "${res1.reason}"`);
  } catch (err: unknown) {
    console.error("Scenario 1 error:", err);
  }

  // --- Scenario 2: 40% SoC -> Single En-Route Charging Stop with Route Alternatives ---
  console.log("\n--------------------------------------------------------------------------");
  console.log("🔹 SCENARIO 2: Moderate Battery (40% SoC) -> Route Alternatives & Optimization Modes");
  console.log("--------------------------------------------------------------------------");
  try {
    const res2 = await optimizeMultiStopRoute({
      origin,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 },
      predictions: initialPredictions,
      mode: "BALANCED",
      returnAlternativesCount: 2
    });

    console.log(`📍 Selected Recommended Route (#1): ${res2.legs.map((l) => l.from).join(" ➡️ ")} ➡️ ${destination.name}`);
    console.log(`🔌 Primary Stop: ${res2.stops[0]?.charger.name} (SoC before: ${res2.stops[0]?.socBeforeChargingPct.toFixed(1)}%, after: ${res2.stops[0]?.socAfterChargingPct.toFixed(1)}%, Charge time: ${res2.stops[0]?.chargingTimeMinutes.toFixed(1)} mins)`);
    console.log(`⏱️ Total Trip Duration: ${res2.totalTripDurationMinutes.toFixed(1)} mins | Destination SoC: ${res2.destinationSoCPct.toFixed(1)}% | Cost: ${res2.totalCost.toFixed(4)}`);

    if (res2.alternatives.length > 0) {
      console.log(`\n🔀 Route Alternatives Returned (${res2.alternatives.length}):`);
      res2.alternatives.forEach((alt) => {
        console.log(`  - Alternative #${alt.rank}: Via ${alt.stops.map((s) => s.charger.name).join(" & ")} (${alt.totalTripDurationMinutes.toFixed(1)} mins, Cost: ${alt.totalCost.toFixed(4)})`);
      });
    }
  } catch (err: unknown) {
    console.error("Scenario 2 error:", err);
  }

  // --- Scenario 3: Real-Time Rerouting Trigger Demonstration ---
  console.log("\n--------------------------------------------------------------------------");
  console.log("🔹 SCENARIO 3: Real-Time Rerouting (Wait Time Spike on Planned Charger)");
  console.log("--------------------------------------------------------------------------");
  try {
    // Driver is at Ramanagara (12.7150, 77.2810) heading to Mysuru, previously planned stop was Bidadi (C004)
    const currentLoc = { name: "En-Route Ramanagara", lat: 12.7150, lon: 77.2810 };
    const updatedPredictions: Record<string, StationPrediction> = {
      C004: { stationId: "C004", availabilityProbability: 0.1, expectedWaitMinutes: 50, reliabilityScore: 0.3, confidence: 0.9 }, // C004 unavailable/high wait!
      C001: { stationId: "C001", availabilityProbability: 0.95, expectedWaitMinutes: 0, reliabilityScore: 0.95, confidence: 0.95 }
    };

    const rerouteRes = await optimizeReroute({
      currentLocation: currentLoc,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 30 },
      currentPlannedStops: ["C004"],
      predictions: updatedPredictions,
      mode: "BALANCED"
    });

    console.log(`🔔 Reroute Recommended: ${rerouteRes.rerouteRecommended ? "YES ✅" : "NO ❌"}`);
    console.log(`⚡ Trigger Event: "${rerouteRes.triggerEvent}"`);
    console.log(`📍 New Recommended Route: ${rerouteRes.optimizedRoute.legs.map((l) => l.from).join(" ➡️ ")} ➡️ ${destination.name}`);
    console.log(`🔌 New Charging Stop: ${rerouteRes.optimizedRoute.stops.map((s) => s.charger.name).join(", ")}`);
    console.log(`📝 Reroute Explanation: "${rerouteRes.rerouteReason}"`);
  } catch (err: unknown) {
    console.error("Scenario 3 error:", err);
  }

  // --- Scenario 4: Strategy Benchmark Comparison ---
  console.log("\n--------------------------------------------------------------------------");
  console.log("🔹 SCENARIO 4: Routing Strategy Benchmark & Performance Measurement");
  console.log("--------------------------------------------------------------------------");
  try {
    const benchmarkResult = await runStrategyBenchmark(origin, destination, { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 }, initialPredictions);
    printBenchmarkTable(benchmarkResult);
  } catch (err: unknown) {
    console.error("Scenario 4 error:", err);
  }

  console.log("==========================================================================\n");
}

async function main() {
  await runMultiStopDemo();

  const PORT = Number(process.env["PORT"]) || 3000;
  startServer(PORT);
}

main().catch((err) => console.error("Unhandled main error:", err));