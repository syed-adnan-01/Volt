// ──────────────────────────────────────────────
// Routing Service Client
// Communicates with Member 5's OSRM/Routing API.
// ──────────────────────────────────────────────

import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import type { RoutingResult } from '@volt/contracts';
import { getCachedJson, setCachedJson } from '../cache/redisCache.js';

export async function getRoutes(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RoutingResult[]> {
  // Check Redis routes cache first (TTL 1 hour = 3600 seconds)
  const cacheKey = `cache:routes:${originLat.toFixed(4)},${originLng.toFixed(4)}:${destLat.toFixed(4)},${destLng.toFixed(4)}`;
  const cachedRoutes = await getCachedJson<RoutingResult[]>(cacheKey);
  if (cachedRoutes && Array.isArray(cachedRoutes) && cachedRoutes.length > 0) {
    return cachedRoutes;
  }

  const url = `${env.OSRM_BASE_URL}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&alternatives=true`;
  
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

    const primaryDuration = data.routes[0].duration;
    const routes: RoutingResult[] = data.routes.map((route: any, index: number) => ({
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      detourMinutes: index === 0 ? 0 : Math.max(0, (route.duration - primaryDuration) / 60),
      geometry: (typeof route.geometry === 'string' ? route.geometry : (route.geometry || [])) as any,
    }));

    // Cache successful route results
    await setCachedJson(cacheKey, routes, 3600);

    return routes;
  } catch (error: any) {
    clearTimeout(timeout);
    
    console.warn('⚠️ Routing service failed, using mock data for development.', error.message);
    
    // For development (Phase 2), we gracefully fallback to mock candidate routes with valid GeoJSON geometry
    const distanceKm = Math.sqrt(Math.pow(destLat - originLat, 2) + Math.pow(destLng - originLng, 2)) * 111; // Rough Haversine

    const generateLinearCoordinates = (oLat: number, oLng: number, dLat: number, dLng: number, steps = 20): [number, number][] => {
      const coords: [number, number][] = [];
      for (let i = 0; i <= steps; i++) {
        const fraction = i / steps;
        coords.push([
          parseFloat((oLng + (dLng - oLng) * fraction).toFixed(6)),
          parseFloat((oLat + (dLat - oLat) * fraction).toFixed(6)),
        ]);
      }
      return coords;
    };

    const primaryCoords = generateLinearCoordinates(originLat, originLng, destLat, destLng);
    const primaryRoute: RoutingResult = {
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      durationMinutes: parseFloat((distanceKm / 1.5).toFixed(0)), // ~90km/h avg
      detourMinutes: 0,
      geometry: { type: 'LineString', coordinates: primaryCoords } as any,
    };

    const routes: RoutingResult[] = [primaryRoute];
    if (distanceKm > 20) {
      const midLat = (originLat + destLat) / 2 + 0.05;
      const midLng = (originLng + destLng) / 2 + 0.05;
      const altCoords = [
        ...generateLinearCoordinates(originLat, originLng, midLat, midLng, 10),
        ...generateLinearCoordinates(midLat, midLng, destLat, destLng, 10).slice(1),
      ];
      routes.push({
        distanceKm: parseFloat((distanceKm * 1.12).toFixed(2)),
        durationMinutes: parseFloat(((distanceKm * 1.12) / 1.4).toFixed(0)),
        detourMinutes: parseFloat((((distanceKm * 1.12) / 1.4) - (distanceKm / 1.5)).toFixed(0)),
        geometry: { type: 'LineString', coordinates: altCoords } as any,
      });
    }

    await setCachedJson(cacheKey, routes, 3600);

    return routes;
  }
}

export async function getRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RoutingResult> {
  const routes = await getRoutes(originLat, originLng, destLat, destLng);
  return routes[0];
}

