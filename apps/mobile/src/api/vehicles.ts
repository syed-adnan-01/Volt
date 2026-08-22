// ──────────────────────────────────────────────
// Vehicles API
// Typed against the Hono vehicles routes.
// ──────────────────────────────────────────────

import { api, type ApiResponse } from './client';

// ── Types (mirrors DB rows from vehicles route) ──
export interface Vehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  battery_capacity_kwh: number;
  usable_capacity_kwh: number;
  consumption_kwh_per_km: number;
  max_charging_power_kw: number;
  battery_health_percent: number;
  reserve_soc_percent: number;
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleInput {
  make: string;
  model: string;
  battery_capacity_kwh: number;
  usable_capacity_kwh: number;
  consumption_kwh_per_km: number;
  max_charging_power_kw: number;
  battery_health_percent?: number;
  reserve_soc_percent?: number;
}

// ── API calls ────────────────────────────────

export function getVehicles(): Promise<ApiResponse<Vehicle[]>> {
  return api.get<Vehicle[]>('/vehicles');
}

export function getVehicle(id: string): Promise<ApiResponse<Vehicle>> {
  return api.get<Vehicle>(`/vehicles/${id}`);
}

export function createVehicle(input: CreateVehicleInput): Promise<ApiResponse<Vehicle>> {
  return api.post<Vehicle>('/vehicles', input);
}

export function updateVehicle(
  id: string,
  input: Partial<CreateVehicleInput>,
): Promise<ApiResponse<Vehicle>> {
  return api.patch<Vehicle>(`/vehicles/${id}`, input);
}

export function deleteVehicle(id: string): Promise<ApiResponse<{ deleted: boolean; id: string }>> {
  return api.delete<{ deleted: boolean; id: string }>(`/vehicles/${id}`);
}
