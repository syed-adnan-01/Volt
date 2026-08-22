// ──────────────────────────────────────────────
// Typed API Client
// Consumes the standard VOLT ApiResponse<T> envelope.
// Never hand-writes a response shape — imports from
// @volt/contracts (or mirrors the shape when the
// contracts package isn't directly linkable in RN).
// ──────────────────────────────────────────────

import { useAuthStore } from '@/state/authStore';

// ── API Response Envelope ────────────────────
// Mirrors @volt/contracts ApiResponse<T> exactly.
// We duplicate the type here because Expo's Metro
// bundler can't resolve the monorepo contracts
// package without extra config — but the shape is
// identical and any drift is caught in review.
// ──────────────────────────────────────────────

export interface ApiMeta {
  requestId: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta;
}

// ── Configuration ────────────────────────────
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000'
  : 'https://api.volt.app'; // production URL (placeholder)

// ── Client ───────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Core fetch wrapper. Returns typed `ApiResponse<T>`.
 * Automatically attaches the auth token from the store.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {} } = options;

  // Attach auth token if available
  const token = useAuthStore.getState().token;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, config);
    const json: ApiResponse<T> = await response.json();
    return json;
  } catch (error) {
    // Network error — return a synthetic error envelope
    return {
      success: false,
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
      meta: {
        requestId: 'local',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// ── Convenience methods ──────────────────────

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
