// ──────────────────────────────────────────────
// Routing Service Client
// Communicates with Member 5's OSRM/Routing API.
// ──────────────────────────────────────────────

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import type { RoutingResult } from '@volt/contracts';
import { getCachedJson, setCachedJson } from '../cache/redisCache.js';

export async function getRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RoutingResult> {
  // Check Redis route cache first (TTL 1 hour = 3600 seconds)
  const cacheKey = `cache:route:${originLat.toFixed(4)},${originLng.toFixed(4)}:${destLat.toFixed(4)},${destLng.toFixed(4)}`;
  const cachedRoute = await getCachedJson<RoutingResult>(cacheKey);
  if (cachedRoute) {
    return cachedRoute;
  }

  const url = `${env.OSRM_BASE_URL}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`OSRM API responded with status ${response.status}`);
    }

    const data = await response.json() as any;
    
    // OSRM response mapping
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found by OSRM');
    }

    const route = data.routes[0];

    const result: RoutingResult = {
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      detourMinutes: 0, // Direct route has 0 detour
      geometry: [], // In a real app we decode the polyline here, skipping for MVP simplicity
    };

    // Cache successful route result
    await setCachedJson(cacheKey, result, 3600);

    return result;
  } catch (error: any) {
    clearTimeout(timeout);
    
    console.warn('⚠️ Routing service failed, using mock data for development.', error.message);
    
    // For development (Phase 2), we gracefully fallback to a mock route so the API works independently
    const distanceKm = Math.sqrt(Math.pow(destLat - originLat, 2) + Math.pow(destLng - originLng, 2)) * 111; // Rough Haversine
    const result: RoutingResult = {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationMinutes: parseFloat((distanceKm / 1.5).toFixed(0)), // ~90km/h avg
      detourMinutes: 0,
      geometry: [],
    };

    await setCachedJson(cacheKey, result, 3600);

    return result;
  }
}
