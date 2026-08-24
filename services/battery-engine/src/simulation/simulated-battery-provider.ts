/**
 * Simulated Battery Provider Implementation
 * Member 3 — Battery & EV Intelligence Subsystem
 */

import { VehicleBatteryProfile } from '../models/vehicle.js';
import { BatteryState, createBatteryState } from '../models/battery-state.js';
import { BatteryStateProvider, BatteryStateListener } from './battery-state-provider.js';
import { DrainRateEvaluation, evaluateDrainRateRisk } from './drain-rate.js';
import { BatteryValidationError } from '../validation/battery-validation.js';

export interface DriveTickResult {
  /** Updated battery state after the tick */
  state: BatteryState;
  /** Energy consumed in this specific tick (kWh) */
  energyUsedKWh: number;
  /** Cumulative drain rate performance evaluation */
  drainEvaluation: DrainRateEvaluation;
}

export interface ChargingTickResult {
  /** Updated battery state after the tick */
  state: BatteryState;
  /** Energy added to battery during tick (kWh) */
  energyAddedKWh: number;
  /** Effective charging power utilized (kW) */
  effectivePowerKW: number;
}

/**
 * Stateful in-memory simulated battery state provider.
 */
export class SimulatedBatteryProvider implements BatteryStateProvider {
  private vehicle: VehicleBatteryProfile;
  private currentState: BatteryState;
  private listeners: Set<BatteryStateListener> = new Set();
  
  // Cumulative telemetry tracking
  private totalDistanceDrivenKm = 0;
  private totalEnergyConsumedKWh = 0;
  private totalEnergyChargedKWh = 0;
  private initialSoCPercent: number;

  constructor(vehicle: VehicleBatteryProfile, initialSoCPercent = 100) {
    this.vehicle = vehicle;
    this.initialSoCPercent = initialSoCPercent;
    this.currentState = createBatteryState(
      vehicle.vehicleId,
      initialSoCPercent,
      vehicle.usableBatteryCapacityKWh,
      vehicle.consumptionKWhPerKm,
      vehicle.batteryHealthPercent,
      'SIMULATION'
    );
  }

  /**
   * Returns current immutable battery state snapshot.
   */
  public getCurrentState(): BatteryState {
    return { ...this.currentState };
  }

  /**
   * Updates partial fields of current battery state and notifies subscribers.
   */
  public updateState(partial: Partial<BatteryState>): BatteryState {
    const updatedSoC = partial.socPercent ?? this.currentState.socPercent;
    const clampedSoC = Math.min(100, Math.max(0, updatedSoC));
    const energyRemainingKWh = Number(
      ((clampedSoC / 100.0) * this.vehicle.usableBatteryCapacityKWh).toFixed(3)
    );
    const estimatedRangeKm = Number(
      (this.vehicle.consumptionKWhPerKm > 0
        ? energyRemainingKWh / this.vehicle.consumptionKWhPerKm
        : 0
      ).toFixed(2)
    );

    this.currentState = {
      ...this.currentState,
      ...partial,
      socPercent: clampedSoC,
      energyRemainingKWh,
      estimatedRangeKm,
      timestamp: new Date().toISOString(),
    };

    this.notifyListeners();
    return this.getCurrentState();
  }

  /**
   * Simulates driving over a given distance tick.
   *
   * @param distanceKm Distance travelled in this tick (km)
   * @param actualConsumptionRate Optional consumption override (kWh/km)
   */
  public simulateDriveTick(distanceKm: number, actualConsumptionRate?: number): DriveTickResult {
    if (distanceKm < 0 || !Number.isFinite(distanceKm)) {
      throw new BatteryValidationError(
        `Invalid distance tick ${distanceKm} km`,
        'INVALID_DISTANCE'
      );
    }

    const consumptionRate = actualConsumptionRate ?? this.vehicle.consumptionKWhPerKm;
    if (consumptionRate <= 0 || !Number.isFinite(consumptionRate)) {
      throw new BatteryValidationError(
        `Invalid consumption rate ${consumptionRate} kWh/km`,
        'INVALID_CONSUMPTION_RATE'
      );
    }

    const energyUsedKWh = Number((distanceKm * consumptionRate).toFixed(4));
    const newEnergyRemaining = Math.max(0, this.currentState.energyRemainingKWh - energyUsedKWh);
    const newSoC = Number(((newEnergyRemaining / this.vehicle.usableBatteryCapacityKWh) * 100).toFixed(2));

    // Update cumulative stats
    this.totalDistanceDrivenKm += distanceKm;
    this.totalEnergyConsumedKWh += energyUsedKWh;

    // Update state
    this.currentState = {
      ...this.currentState,
      socPercent: newSoC,
      energyRemainingKWh: Number(newEnergyRemaining.toFixed(3)),
      estimatedRangeKm: Number((newEnergyRemaining / this.vehicle.consumptionKWhPerKm).toFixed(2)),
      timestamp: new Date().toISOString(),
    };

    const drainEvaluation = this.getDrainStats();
    this.notifyListeners();

    return {
      state: this.getCurrentState(),
      energyUsedKWh,
      drainEvaluation,
    };
  }

  /**
   * Simulates a charging tick over a duration.
   *
   * @param durationMinutes Time spent charging in this tick (minutes)
   * @param chargingPowerKW Charger rate (kW)
   * @param efficiency Charging efficiency (default 0.95)
   */
  public simulateChargingTick(
    durationMinutes: number,
    chargingPowerKW: number,
    efficiency = 0.95
  ): ChargingTickResult {
    if (durationMinutes <= 0 || !Number.isFinite(durationMinutes)) {
      throw new BatteryValidationError(
        `Invalid charging duration ${durationMinutes} minutes`,
        'INVALID_CHARGING_PARAMETERS'
      );
    }

    if (chargingPowerKW <= 0 || !Number.isFinite(chargingPowerKW)) {
      throw new BatteryValidationError(
        `Invalid charging power ${chargingPowerKW} kW`,
        'INVALID_CHARGING_PARAMETERS'
      );
    }

    const effectivePowerKW = Math.min(chargingPowerKW, this.vehicle.maxChargingPowerKW);
    const energyDeliveredKWh = effectivePowerKW * (durationMinutes / 60.0);
    const energyAddedKWh = Number((energyDeliveredKWh * efficiency).toFixed(4));

    const maxEnergy = this.vehicle.usableBatteryCapacityKWh;
    const newEnergyRemaining = Math.min(maxEnergy, this.currentState.energyRemainingKWh + energyAddedKWh);
    const newSoC = Number(((newEnergyRemaining / maxEnergy) * 100).toFixed(2));

    this.totalEnergyChargedKWh += energyAddedKWh;

    this.currentState = {
      ...this.currentState,
      socPercent: newSoC,
      energyRemainingKWh: Number(newEnergyRemaining.toFixed(3)),
      estimatedRangeKm: Number((newEnergyRemaining / this.vehicle.consumptionKWhPerKm).toFixed(2)),
      timestamp: new Date().toISOString(),
    };

    this.notifyListeners();

    return {
      state: this.getCurrentState(),
      energyAddedKWh,
      effectivePowerKW,
    };
  }

  /**
   * Sets battery SoC directly (e.g. initial calibration or reset).
   */
  public setSoC(socPercent: number): BatteryState {
    return this.updateState({ socPercent });
  }

  /**
   * Evaluates cumulative drain rate versus baseline profile.
   */
  public getDrainStats(): DrainRateEvaluation {
    const observedRate =
      this.totalDistanceDrivenKm > 0
        ? this.totalEnergyConsumedKWh / this.totalDistanceDrivenKm
        : this.vehicle.consumptionKWhPerKm;

    return evaluateDrainRateRisk(observedRate, this.vehicle.consumptionKWhPerKm);
  }

  /**
   * Returns cumulative telemetry statistics for simulation.
   */
  public getTelemetryStats() {
    return {
      totalDistanceDrivenKm: Number(this.totalDistanceDrivenKm.toFixed(2)),
      totalEnergyConsumedKWh: Number(this.totalEnergyConsumedKWh.toFixed(3)),
      totalEnergyChargedKWh: Number(this.totalEnergyChargedKWh.toFixed(3)),
    };
  }

  /**
   * Resets provider state and statistics back to baseline.
   */
  public reset(initialSoCPercent = this.initialSoCPercent): void {
    this.totalDistanceDrivenKm = 0;
    this.totalEnergyConsumedKWh = 0;
    this.totalEnergyChargedKWh = 0;
    this.currentState = createBatteryState(
      this.vehicle.vehicleId,
      initialSoCPercent,
      this.vehicle.usableBatteryCapacityKWh,
      this.vehicle.consumptionKWhPerKm,
      this.vehicle.batteryHealthPercent,
      'SIMULATION'
    );
    this.notifyListeners();
  }

  /**
   * Subscribes a listener to state update notifications.
   */
  public subscribe(listener: BatteryStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getCurrentState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in battery state listener:', err);
      }
    }
  }
}
