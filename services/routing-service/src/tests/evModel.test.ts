import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_EV_VEHICLE,
  calculateEnergyConsumed,
  calculateMaxRangeKm,
  calculateRemainingEnergy,
  calculateChargingTimeMinutes
} from "../models/evModel.js";

describe("EV Battery & Consumption Model Tests", () => {
  test("calculateEnergyConsumed returns correct kWh for distance", () => {
    const energy = calculateEnergyConsumed(100, 0.15);
    assert.equal(energy, 15);
  });

  test("calculateMaxRangeKm computes max drivable distance down to safety buffer", () => {
    const range = calculateMaxRangeKm(DEFAULT_EV_VEHICLE, 100, 20);
    assert.equal(range, 320);
  });

  test("calculateRemainingEnergy evaluates energy, SoC %, and safety status", () => {
    const status = calculateRemainingEnergy(100, 60, DEFAULT_EV_VEHICLE);
    assert.equal(status.energyConsumedKwh, 15);
    assert.equal(status.remainingEnergyKwh, 45);
    assert.equal(status.remainingSoCPct, 75);
    assert.equal(status.isSoCSafe, true);
  });

  test("calculateChargingTimeMinutes computes accurate charging duration in minutes", () => {
    const minutes = calculateChargingTimeMinutes(20, 80, DEFAULT_EV_VEHICLE, 60);
    assert.equal(minutes, 36);
  });

  test("calculateChargingTimeMinutes returns 0 if target SoC <= current SoC", () => {
    const minutes = calculateChargingTimeMinutes(80, 50, DEFAULT_EV_VEHICLE, 60);
    assert.equal(minutes, 0);
  });
});
