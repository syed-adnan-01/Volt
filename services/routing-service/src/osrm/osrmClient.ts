export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: unknown;
}

const routeCache = new Map<string, RouteResult>();

export function clearRouteCache(): void {
  routeCache.clear();
}

export async function getRoute(
  startLon: number,
  startLat: number,
  endLon: number,
  endLat: number
): Promise<RouteResult> {
  const cacheKey = `${startLon.toFixed(4)},${startLat.toFixed(4)};${endLon.toFixed(4)},${endLat.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${startLon},${startLat};${endLon},${endLat}` +
    `?overview=full&geometries=geojson`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`OSRM request failed: ${response.status}`);
      }

      const data = (await response.json()) as { code?: string; routes?: Array<{ distance: number; duration: number; geometry: unknown }> };

      if (
        data.code !== "Ok" ||
        !data.routes ||
        data.routes.length === 0
      ) {
        throw new Error("OSRM could not find a route");
      }

      const route = data.routes[0]!;

      const result: RouteResult = {
        distanceKm: route.distance / 1000,
        durationMinutes: route.duration / 60,
        geometry: route.geometry
      };

      routeCache.set(cacheKey, result);
      return result;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}