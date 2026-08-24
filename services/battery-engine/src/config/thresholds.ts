/**
 * Battery Engine Configuration & Thresholds
 * Member 3 — Battery & EV Intelligence Subsystem
 */

export interface BatteryConfig {
  /** Default reserve SoC buffer percentage (e.g. 10%) */
  defaultReserveSoCPercent: number;
  /** Route uncertainty margin buffer percentage (e.g. 5%) */
  defaultUncertaintyMarginPercent: number;
  /** Threshold below which battery is considered low (e.g. 20%) */
  lowBatteryThresholdPercent: number;
  /** Safety margin below which risk is considered high (e.g. 5%) */
  highRiskMarginPercent: number;
  /** Tolerance threshold for drain rate deviations (e.g. 15%) */
  drainDeviationTolerancePercent: number;
}

export const batteryConfig: BatteryConfig = {
  defaultReserveSoCPercent: 10,
  defaultUncertaintyMarginPercent: 5,
  lowBatteryThresholdPercent: 20,
  highRiskMarginPercent: 5,
  drainDeviationTolerancePercent: 15,
};
