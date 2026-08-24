/**
 * Optimizer Integration Tests (Milestone 7 & Demo Scenarios 1-4)
 * Member 3 — Battery & EV Intelligence Subsystem
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createVehicleProfile,
  createBatteryState,
  evaluateRouteBattery,
  evaluateMultiStopRoute,
  rankChargerCandidates,
  BatteryValidationError,
} from '../src/index.js';

describe('Milestone 7: Optimizer Integration - Multi-Stop Route Evaluation', () => {
  const vehicle = createVehicleProfile({
    vehicleId: 'EV-OPT-01',
    batteryCapacityKWh: 60,
    usableBatteryCapacityKWh: 57,
    consumptionKWhPerKm: 0.15,
    reserveSoCPercent: 10,
    maxChargingPowerKW: 100,
  });

  it('should evaluate a multi-stop journey sequentially with charging stop', () => {
    // Journey: Origin (50% SoC) -> Station A (100 km) -> Charge to 80% at 50kW -> Destination (120 km)
    // Leg 1: 100 km * 0.15 = 15 kWh consumed. 50% = 28.5 kWh. Arrival SoC at Station A = ((28.5 - 15) / 57) * 100 = 23.68%
    // Charge at A: 23.68% to 80% target = 56.32% delta = 32.10 kWh net energy to add.
    // Leg 2: Starts at 80% (45.6 kWh), travels 120 km (18 kWh consumed) -> Arrival SoC = ((45.6 - 18) / 57) * 100 = 48.42%
    const legs = [
      {
        sequence: 1,
        distanceKm: 100,
        stationId: 'STATION_ALPHA',
        targetSoC: 80,
        chargingPowerKW: 50,
      },
      {
        sequence: 2,
        distanceKm: 120,
      },
    ];

    const result = evaluateMultiStopRoute(50, legs, vehicle);

    assert.equal(result.isEntireTripFeasible, true);
    assert.equal(result.legs.length, 2);

    // Check Leg 1
    assert.equal(result.legs[0].currentSoC, 50);
    assert.equal(result.legs[0].arrivalSoC, 23.68);
    assert.equal(result.legs[0].departureSoCPercent, 80);
    assert.ok(result.legs[0].chargingTimeResult !== undefined);
    assert.ok(result.legs[0].chargingTimeResult!.estimatedMinutes > 0);

    // Check Leg 2
    assert.equal(result.legs[1].currentSoC, 80);
    assert.equal(result.legs[1].arrivalSoC, 48.42);

    // Totals
    assert.equal(result.totalEnergyRequiredKWh, 33); // 15 + 18 kWh
    assert.equal(result.finalSoC, 48.42);
  });

  it('should mark entire journey as infeasible if any intermediate leg fails reachability', () => {
    // Starting SoC 20% (11.4 kWh), Leg 1 requires 200 km (30 kWh) -> impossible
    const legs = [
      {
        sequence: 1,
        distanceKm: 200,
        stationId: 'STATION_FAR',
        targetSoC: 80,
        chargingPowerKW: 50,
      },
      {
        sequence: 2,
        distanceKm: 20,
      },
    ];

    const result = evaluateMultiStopRoute(20, legs, vehicle);
    assert.equal(result.isEntireTripFeasible, false);
    assert.equal(result.legs[0].reachable, false);
  });

  it('should throw validation errors on invalid route or initial SoC', () => {
    assert.throws(
      () => evaluateMultiStopRoute(-5, [{ sequence: 1, distanceKm: 10 }], vehicle),
      (err: any) => err instanceof BatteryValidationError && err.code === 'INVALID_BATTERY_STATE'
    );
    assert.throws(
      () => evaluateMultiStopRoute(80, [], vehicle),
      (err: any) => err instanceof BatteryValidationError && err.code === 'INVALID_ROUTE_INPUT'
    );
  });
});

describe('Milestone 7: Candidate Charger Ranking for Member 5', () => {
  const vehicle = createVehicleProfile({
    vehicleId: 'EV-OPT-02',
    batteryCapacityKWh: 50,
    usableBatteryCapacityKWh: 48,
    consumptionKWhPerKm: 0.16,
    reserveSoCPercent: 10,
    maxChargingPowerKW: 80,
  });

  it('should filter, evaluate, and rank candidate stations accurately', () => {
    // Current SoC: 30% = 14.4 kWh. Usable capacity = 48 kWh.
    // Minimum safe reserve = 10% (4.8 kWh). Usable before buffer = 9.6 kWh = 60 km max range.
    const currentState = createBatteryState(vehicle.vehicleId, 30, 48, 0.16);

    const candidates = [
      { stationId: 'STATION_TOO_FAR', distanceKm: 75, chargingPowerKW: 100 }, // unreachable (>60 km)
      { stationId: 'STATION_NEAR_FAST', distanceKm: 20, chargingPowerKW: 100 }, // 3.2 kWh used, arrival 23.33%, fast
      { stationId: 'STATION_MID_SLOW', distanceKm: 40, chargingPowerKW: 25 }, // 6.4 kWh used, arrival 16.67%, slow
    ];

    const ranked = rankChargerCandidates(currentState, candidates, vehicle, 80);

    assert.equal(ranked.length, 3);
    // Reachable stations must come first
    assert.equal(ranked[0].stationId, 'STATION_NEAR_FAST');
    assert.equal(ranked[0].reachable, true);
    assert.ok(ranked[0].estimatedChargingMinutes! > 0);

    assert.equal(ranked[1].stationId, 'STATION_MID_SLOW');
    assert.equal(ranked[1].reachable, true);

    assert.equal(ranked[2].stationId, 'STATION_TOO_FAR');
    assert.equal(ranked[2].reachable, false);
  });
});

describe('Official Member 3 Demo Scenarios Verification', () => {
  const standardVehicle = createVehicleProfile({
    vehicleId: 'DEMO_VEHICLE',
    batteryCapacityKWh: 60,
    usableBatteryCapacityKWh: 57,
    consumptionKWhPerKm: 0.15,
    reserveSoCPercent: 10,
    batteryHealthPercent: 100,
  });

  it('Demo Scenario 1: Sufficient Battery (Starting SoC 80%, Destination reachable)', () => {
    // Starting SoC 80%, Route 171 km -> 25.65 kWh -> arrival SoC = ((45.6 - 25.65) / 57) * 100 = 35%
    const result = evaluateRouteBattery({
      distanceKm: 171,
      currentSoCPercent: 80,
      usableCapacityKWh: 57,
      consumptionKWhPerKm: 0.15,
      reserveSoCPercent: 10,
    });

    assert.equal(result.arrivalSoC, 35);
    assert.equal(result.reachable, true);
    assert.ok(result.safetyMarginPercent > 0);
    assert.ok(result.riskScore < 0.5);
  });

  it('Demo Scenario 2: Charging Required (Starting SoC 30%, Destination requires 35% energy)', () => {
    // Destination requires 35% SoC (19.95 kWh = 133 km). Starting with 30%, Reserve is 10%.
    // Arrival SoC would be -5% (or 30 - 35 = -5%) -> Unreachable!
    const result = evaluateRouteBattery({
      distanceKm: 133,
      currentSoCPercent: 30,
      usableCapacityKWh: 57,
      consumptionKWhPerKm: 0.15,
      reserveSoCPercent: 10,
    });

    assert.equal(result.reachable, false);
    assert.ok(result.arrivalSoC < 10);
    assert.equal(result.riskScore, 1.0);
  });

  it('Demo Scenario 3: Charger Reachability (Station A reachable, Station B unreachable)', () => {
    // Starting SoC 25% (14.25 kWh). Reserve 10% (5.7 kWh). Available before reserve = 8.55 kWh (~57 km).
    // Station A: 25 km (3.75 kWh) -> Arrival SoC = ((14.25 - 3.75) / 57) * 100 = 18.42% (> 10% reserve) -> Reachable
    // Station B: 70 km (10.5 kWh) -> Arrival SoC = ((14.25 - 10.5) / 57) * 100 = 6.58% (< 10% reserve) -> Unreachable
    const stationAResult = evaluateRouteBattery({
      distanceKm: 25,
      currentSoCPercent: 25,
      usableCapacityKWh: 57,
      consumptionKWhPerKm: 0.15,
      reserveSoCPercent: 10,
    });

    const stationBResult = evaluateRouteBattery({
      distanceKm: 70,
      currentSoCPercent: 25,
      usableCapacityKWh: 57,
      consumptionKWhPerKm: 0.15,
      reserveSoCPercent: 10,
    });

    assert.equal(stationAResult.reachable, true);
    assert.equal(stationBResult.reachable, false);
  });

  it('Demo Scenario 4: Battery Health Comparison (Healthy battery vs Degraded battery risk)', () => {
    // Both drive 100 km starting at 50% SoC
    const healthyResult = evaluateRouteBattery({
      distanceKm: 100,
      currentSoCPercent: 50,
      usableCapacityKWh: 57,
      consumptionKWhPerKm: 0.15,
      reserveSoCPercent: 10,
      batteryHealthPercent: 100,
    });

    const degradedResult = evaluateRouteBattery({
      distanceKm: 100,
      currentSoCPercent: 50,
      usableCapacityKWh: 57,
      consumptionKWhPerKm: 0.15,
      reserveSoCPercent: 10,
      batteryHealthPercent: 65,
    });

    // Both have the same arrival SoC
    assert.equal(healthyResult.arrivalSoC, degradedResult.arrivalSoC);
    // Degraded battery has higher risk score
    assert.ok(degradedResult.riskScore > healthyResult.riskScore);
  });
});
