// ──────────────────────────────────────────────
// Auth API
// Typed against the Hono users routes.
// ──────────────────────────────────────────────

import { api, type ApiResponse } from './client';

// ── Types ────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
}

// ── API calls ────────────────────────────────

export function getCurrentUser(): Promise<ApiResponse<UserProfile>> {
  return api.get<UserProfile>('/users/me');
}

export function updateProfile(input: UpdateProfileInput): Promise<ApiResponse<UserProfile>> {
  return api.patch<UserProfile>('/users/me', input);
}
