/**
 * Battery State Provider Interface & Types
 * Member 3 — Battery & EV Intelligence Subsystem
 */

import { BatteryState } from '../models/battery-state.js';

export type BatteryStateListener = (state: BatteryState) => void;

/**
 * Common abstraction for battery data providers (Simulation, OBD, Telematics).
 */
export interface BatteryStateProvider {
  /** Returns the latest immutable battery state snapshot */
  getCurrentState(): BatteryState;

  /** Updates or forces the battery state */
  updateState(state: Partial<BatteryState>): BatteryState;

  /** Resets provider state to vehicle profile baseline */
  reset(): void;

  /** Subscribes to battery state change events */
  subscribe(listener: BatteryStateListener): () => void;
}
