// ──────────────────────────────────────────────
// Stations & Feedback API
// Typed against Hono stations & feedback routes.
// ──────────────────────────────────────────────

import { api, type ApiResponse } from './client';

// ── Types ────────────────────────────────────

export interface ChargingStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  operator_name: string;
  max_power_kw: number;
  plug_count?: number;
  created_at?: string;
}

export interface StationStatus {
  stationId: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY';
  available_plugs: number;
}

export interface StationPrediction {
  stationId: string;
  predictedAvailable: boolean;
  expectedWaitMinutes: number;
  queueLength: number;
  reliabilityScore: number;
  confidenceScore: number;
  stale?: boolean;
}

export interface SubmitFeedbackInput {
  rating: number; // 1 to 5
  comments?: string;
  broken_plugs?: number;
}

export interface SearchStationsParams {
  lat: number;
  lng: number;
  radiusKm?: number;
}

// ── API Calls ────────────────────────────────

export function searchStations(params: SearchStationsParams): Promise<ApiResponse<ChargingStation[]>> {
  const query = new URLSearchParams({
    lat: params.lat.toString(),
    lng: params.lng.toString(),
    radiusKm: (params.radiusKm || 5).toString(),
  }).toString();
  return api.get<ChargingStation[]>(`/stations?${query}`);
}

export function getStation(id: string): Promise<ApiResponse<ChargingStation>> {
  return api.get<ChargingStation>(`/stations/${id}`);
}

export function getStationStatus(id: string): Promise<ApiResponse<StationStatus>> {
  return api.get<StationStatus>(`/stations/${id}/status`);
}

export function getStationPredictions(id: string): Promise<ApiResponse<StationPrediction>> {
  return api.get<StationPrediction>(`/stations/${id}/predictions`);
}

export function submitStationFeedback(
  stationId: string,
  input: SubmitFeedbackInput,
): Promise<ApiResponse<{ message: string }>> {
  return api.post<{ message: string }>(`/stations/${stationId}/feedback`, input);
}
