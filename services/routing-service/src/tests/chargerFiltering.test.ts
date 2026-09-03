import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { filterCandidateChargers, chargers } from "../chargers/chargerCandidates.js";
import { optimizeMultiStopRoute } from "../optimization/multiStopOptimizer.js";
import type { Location } from "../optimization/multiStopOptimizer.js";
import { DEFAULT_EV_VEHICLE } from "../models/evModel.js";

describe("Charger Filtering & Compatibility Tests", () => {
  const origin: Location = { name: "Bengaluru", lat: 12.9716, lon: 77.5946 };
  const destination: Location = { name: "Mysuru", lat: 12.2958, lon: 76.6394 };

  test("A. filterCandidateChargers filters by connector type", () => {
    const filtered = filterCandidateChargers(chargers, { connectorTypes: ["CCS2"] });
    assert.ok(filtered.every((c) => c.connectorType === "CCS2"));

    const emptyFilter = filterCandidateChargers(chargers, { connectorTypes: ["TYPE1_INCOMPATIBLE"] });
    assert.equal(emptyFilter.length, 0);
  });

  test("B. filterCandidateChargers filters by minPowerKw", () => {
    const filtered = filterCandidateChargers(chargers, { minPowerKw: 60 });
    assert.ok(filtered.every((c) => c.powerKw >= 60));
  });

  test("C. filterCandidateChargers excludes blacklisted chargers", () => {
    const filtered = filterCandidateChargers(chargers, { blacklistedChargerIds: ["C004", "C005"] });
    assert.ok(!filtered.some((c) => c.id === "C004" || c.id === "C005"));
  });

  test("D. Routing optimizer respects connector filter", async () => {
    const result = await optimizeMultiStopRoute({
      origin,
      destination,
      evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 },
      connectorTypes: ["CCS2"]
    });

    assert.ok(result.stops.every((s) => s.charger.connectorType === "CCS2"));
  });

  test("E. Throws clear error when no candidate charger matches connector filter", async () => {
    await assert.rejects(
      async () => {
        await optimizeMultiStopRoute({
          origin,
          destination,
          evProfile: { ...DEFAULT_EV_VEHICLE, initialSoCPct: 40 },
          connectorTypes: ["CHADEMO_UNSUPPORTED"]
        });
      },
      (err: Error) => err.message.includes("No candidate charging stations match the specified filters")
    );
  });
});
