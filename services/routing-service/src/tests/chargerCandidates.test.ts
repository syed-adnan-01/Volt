import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  findChargersAlongRoute
} from "../chargers/chargerCandidates.js";
import type { Charger } from "../chargers/chargerCandidates.js";


describe("Charger Corridor Candidate Search Tests", () => {
  const mockChargers: Charger[] = [
    {
      id: "C_NEAR_1",
      name: "Near Charger 1",
      lat: 12.5,
      lon: 77.0,
      powerKw: 60,
      connectorType: "CCS2",
      network: "NetA"
    },
    {
      id: "C_NEAR_2",
      name: "Near Charger 2",
      lat: 12.6,
      lon: 77.1,
      powerKw: 120,
      connectorType: "CCS2",
      network: "NetB"
    },
    {
      id: "C_FAR",
      name: "Far Away Charger",
      lat: 15.0, // ~280 km north
      lon: 77.0,
      powerKw: 30,
      connectorType: "CCS2",
      network: "NetC"
    }
  ];

  const mockRouteGeometry = {
    type: "LineString",
    coordinates: [
      [76.9, 12.4],
      [77.0, 12.5],
      [77.1, 12.6]
    ]
  };

  test("findChargersAlongRoute returns chargers within maxDetourKm", () => {
    const results = findChargersAlongRoute(mockRouteGeometry, 10, mockChargers);
    assert.equal(results.length, 2);
    assert.equal(results[0]?.id, "C_NEAR_1");
    assert.equal(results[1]?.id, "C_NEAR_2");
  });

  test("findChargersAlongRoute excludes chargers farther than maxDetourKm", () => {
    const results = findChargersAlongRoute(mockRouteGeometry, 10, mockChargers);
    const hasFar = results.some((c) => c.id === "C_FAR");
    assert.equal(hasFar, false);
  });

  test("findChargersAlongRoute handles empty or invalid geometry gracefully", () => {
    const results = findChargersAlongRoute(null, 10, mockChargers);
    assert.equal(results.length, 0);
  });
});
