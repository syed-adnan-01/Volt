// ──────────────────────────────────────────────
// Trips API
// Typed against the Hono trips route response.
// ──────────────────────────────────────────────

import { api, type ApiResponse } from './client';

// ── Types (mirrors the POST /trips response) ──

export interface BatteryResult {
  currentSoC: number;
  arrivalSoC: number;
  energyRequiredKWh: number;
  reachable: boolean;
  riskScore: number;
}

export interface TripStop {
  stationId: string;
  sequence: number;
  arrivalSoc: number;
  departureSoc: number;
  expectedWaitMinutes: number;
  chargingMinutes: number;
}

export interface OptimizerData {
  totalWaitMinutes: number;
  totalChargingMinutes: number;
  finalSoc: number;
}

export interface TripPlan {
  tripId: string;
  distanceKm: number;
  durationMinutes: number;
  battery: BatteryResult;
  geometry: Array<[number, number]>;
  stops: TripStop[];
  optimizerData: OptimizerData | null;
}

export interface PlanTripInput {
  vehicle_id: string;
  current_soc: number;
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
}

// ── API calls ────────────────────────────────

export function planTrip(input: PlanTripInput): Promise<ApiResponse<TripPlan>> {
  return api.post<TripPlan>('/trips', input);
}
