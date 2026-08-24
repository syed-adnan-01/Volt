/**
 * Optimizer Integration Layer (Member 5 Contract Support)
 * Member 3 — Battery & EV Intelligence Subsystem
 */

import { MultiStopLegInput, MultiStopBatteryResult } from '@volt/contracts';
import { VehicleBatteryProfile } from '../models/vehicle.js';
import { BatteryState } from '../models/battery-state.js';
import { BatteryRouteResult } from '../models/battery-result.js';
import { evaluateRouteBattery } from '../reachability/reachability.js';
import { estimateChargingTime, ChargingTimeResult } from '../charging/charging.js';
import { validateVehicleProfile, BatteryValidationError } from '../validation/battery-validation.js';

export interface MultiStopLegDetailResult extends BatteryRouteResult {
  /** Order in trip sequence */
  sequence: number;
  /** Station ID if this stop includes charging */
  stationId?: string;
  /** SoC after charging at this stop before departure for next leg (%) */
  departureSoCPercent: number;
  /** Detailed charging time estimation if charged at this stop */
  chargingTimeResult?: ChargingTimeResult;
}

export interface MultiStopRouteDetailResult extends MultiStopBatteryResult {
  legs: MultiStopLegDetailResult[];
  /** Average risk score across all route legs */
  averageRiskScore: number;
}

export interface ChargerCandidateInput {
  /** Station identifier */
  stationId: string;
  /** Route distance to charger (km) */
  distanceKm: number;
  /** Charger rated power output (kW) */
  chargingPowerKW: number;
  /** Target SoC to charge up to (defaults to 80% if omitted) */
  targetSoCPercent?: number;
}

export interface ChargerCandidateEvaluation {
  stationId: string;
  distanceKm: number;
  arrivalSoCPercent: number;
  energyRequiredKWh: number;
  reachable: boolean;
  safetyMarginPercent: number;
  riskScore: number;
  chargingPowerKW: number;
  estimatedChargingMinutes?: number;
  departureSoCPercent?: number;
}

/**
 * Evaluates battery feasibility sequentially across a multi-stop route journey.
 *
 * Implements Section 39:
 * Origin SoC -> Leg 1 Arrival SoC -> Charge -> Departure SoC -> Leg 2 Arrival SoC -> ...
 */
export function evaluateMultiStopRoute(
  initialSoCPercent: number,
  legs: MultiStopLegInput[],
  vehicle: VehicleBatteryProfile,
  chargingEfficiency = 0.95
): MultiStopRouteDetailResult {
  validateVehicleProfile(vehicle);

  if (initialSoCPercent < 0 || initialSoCPercent > 100 || !Number.isFinite(initialSoCPercent)) {
    throw new BatteryValidationError(
      `Invalid initial SoC ${initialSoCPercent}%`,
      'INVALID_BATTERY_STATE'
    );
  }

  if (!legs || legs.length === 0) {
    throw new BatteryValidationError(
      'At least one route leg must be provided for multi-stop evaluation',
      'INVALID_ROUTE_INPUT'
    );
  }

  let runningSoC = initialSoCPercent;
  let totalEnergyRequiredKWh = 0;
  let totalChargingMinutes = 0;
  let isEntireTripFeasible = true;
  let maxRiskScore = 0;
  let totalRiskScore = 0;

  const legResults: MultiStopLegDetailResult[] = [];

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const isLastLeg = i === legs.length - 1;

    // 1. Evaluate battery consumption and arrival SoC for this leg
    const legBattery = evaluateRouteBattery({
      distanceKm: leg.distanceKm,
      currentSoCPercent: runningSoC,
      usableCapacityKWh: vehicle.usableBatteryCapacityKWh,
      consumptionKWhPerKm: vehicle.consumptionKWhPerKm,
      reserveSoCPercent: vehicle.reserveSoCPercent,
      batteryHealthPercent: vehicle.batteryHealthPercent,
    });

    totalEnergyRequiredKWh += legBattery.energyRequiredKWh;
    if (!legBattery.reachable) {
      isEntireTripFeasible = false;
    }

    if (legBattery.riskScore > maxRiskScore) {
      maxRiskScore = legBattery.riskScore;
    }
    totalRiskScore += legBattery.riskScore;

    let chargingResult: ChargingTimeResult | undefined;
    let departureSoC = legBattery.arrivalSoC;

    // 2. If intermediate stop specifies charging target, compute charging time & departure SoC
    if (!isLastLeg && leg.targetSoC !== undefined && leg.chargingPowerKW !== undefined) {
      const target = Math.min(100, Math.max(legBattery.arrivalSoC, leg.targetSoC));
      if (target > legBattery.arrivalSoC && legBattery.arrivalSoC >= 0) {
        chargingResult = estimateChargingTime({
          currentSoCPercent: Math.max(0, legBattery.arrivalSoC),
          targetSoCPercent: target,
          usableCapacityKWh: vehicle.usableBatteryCapacityKWh,
          chargingPowerKW: leg.chargingPowerKW,
          maxVehicleChargingPowerKW: vehicle.maxChargingPowerKW,
          efficiency: chargingEfficiency,
        });

        totalChargingMinutes += chargingResult.estimatedMinutes;
        departureSoC = target;
      }
    }

    legResults.push({
      ...legBattery,
      sequence: leg.sequence ?? i + 1,
      stationId: leg.stationId,
      departureSoCPercent: Number(departureSoC.toFixed(2)),
      chargingTimeResult: chargingResult,
    });

    // Advance running SoC to departure SoC of this stop for next leg (clamped to 0-100)
    runningSoC = Math.min(100, Math.max(0, departureSoC));
  }

  const finalArrivalSoC = legResults[legResults.length - 1].arrivalSoC;
  const averageRiskScore = Number((totalRiskScore / legs.length).toFixed(3));

  return {
    legs: legResults,
    totalEnergyRequiredKWh: Number(totalEnergyRequiredKWh.toFixed(3)),
    totalChargingMinutes: Number(totalChargingMinutes.toFixed(2)),
    isEntireTripFeasible,
    finalSoC: finalArrivalSoC,
    maxRiskScore: Number(maxRiskScore.toFixed(3)),
    averageRiskScore,
  };
}

/**
 * Evaluates and ranks candidate charging stations by battery reachability, charging time, and risk.
 * Feeds candidate scoring directly to Member 5's Route Optimizer.
 */
export function rankChargerCandidates(
  currentState: BatteryState,
  candidates: ChargerCandidateInput[],
  vehicle: VehicleBatteryProfile,
  defaultTargetSoCPercent = 80
): ChargerCandidateEvaluation[] {
  validateVehicleProfile(vehicle);

  const evaluations: ChargerCandidateEvaluation[] = candidates.map((candidate) => {
    const routeResult = evaluateRouteBattery({
      distanceKm: candidate.distanceKm,
      currentSoCPercent: currentState.socPercent,
      usableCapacityKWh: vehicle.usableBatteryCapacityKWh,
      consumptionKWhPerKm: vehicle.consumptionKWhPerKm,
      reserveSoCPercent: vehicle.reserveSoCPercent,
      batteryHealthPercent: vehicle.batteryHealthPercent,
    });

    const targetSoC = candidate.targetSoCPercent ?? defaultTargetSoCPercent;
    let estimatedChargingMinutes: number | undefined;
    let departureSoCPercent: number | undefined;

    if (routeResult.reachable && targetSoC > routeResult.arrivalSoC) {
      const chargeTime = estimateChargingTime({
        currentSoCPercent: Math.max(0, routeResult.arrivalSoC),
        targetSoCPercent: Math.min(100, targetSoC),
        usableCapacityKWh: vehicle.usableBatteryCapacityKWh,
        chargingPowerKW: candidate.chargingPowerKW,
        maxVehicleChargingPowerKW: vehicle.maxChargingPowerKW,
      });

      estimatedChargingMinutes = chargeTime.estimatedMinutes;
      departureSoCPercent = Math.min(100, targetSoC);
    }

    return {
      stationId: candidate.stationId,
      distanceKm: candidate.distanceKm,
      arrivalSoCPercent: routeResult.arrivalSoC,
      energyRequiredKWh: routeResult.energyRequiredKWh,
      reachable: routeResult.reachable,
      safetyMarginPercent: routeResult.safetyMarginPercent,
      riskScore: routeResult.riskScore,
      chargingPowerKW: candidate.chargingPowerKW,
      estimatedChargingMinutes,
      departureSoCPercent,
    };
  });

  // Rank: Reachable candidates first, then sort by riskScore ascending, then distance ascending
  return evaluations.sort((a, b) => {
    if (a.reachable !== b.reachable) {
      return a.reachable ? -1 : 1;
    }
    if (a.riskScore !== b.riskScore) {
      return a.riskScore - b.riskScore;
    }
    return a.distanceKm - b.distanceKm;
  });
}
