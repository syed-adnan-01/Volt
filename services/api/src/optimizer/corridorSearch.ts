// ──────────────────────────────────────────────
// Spatial Route Corridor Search
// Finds candidate charging stations along a route.
// ──────────────────────────────────────────────

export interface StationLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  maxPowerKw: number;
  plugCount: number;
  operator: string;
  connectorTypes?: string[];
}

/**
 * Calculates Haversine distance in kilometres between two coordinates.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates minimum distance in km from a point to a line segment.
 */
export function distanceToSegmentKm(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const l2 =
    Math.pow(bLat - aLat, 2) + Math.pow(bLng - aLng, 2);
  if (l2 === 0) return haversineDistanceKm(pLat, pLng, aLat, aLng);

  // Consider the line extending the segment, parameterized as a + t (b - a).
  // We find projection of point p onto the line.
  let t =
    ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return haversineDistanceKm(pLat, pLng, projLat, projLng);
}

/**
 * Filters charging stations that lie within a corridor radius along a route geometry.
 */
export function filterStationsInCorridor(
  routeGeometry: Array<[number, number]>,
  stations: StationLocation[],
  maxCorridorKm: number = 10,
  minPowerKw: number = 50
): StationLocation[] {
  if (!routeGeometry || routeGeometry.length === 0) {
    return stations.filter((s) => s.maxPowerKw >= minPowerKw);
  }

  const candidates: StationLocation[] = [];

  for (const station of stations) {
    if (station.maxPowerKw < minPowerKw) continue;

    let minDistance = Infinity;

    if (routeGeometry.length === 1) {
      minDistance = haversineDistanceKm(
        station.latitude,
        station.longitude,
        routeGeometry[0][0],
        routeGeometry[0][1]
      );
    } else {
      for (let i = 0; i < routeGeometry.length - 1; i++) {
        const segDist = distanceToSegmentKm(
          station.latitude,
          station.longitude,
          routeGeometry[i][0],
          routeGeometry[i][1],
          routeGeometry[i + 1][0],
          routeGeometry[i + 1][1]
        );
        if (segDist < minDistance) {
          minDistance = segDist;
        }
        if (minDistance <= maxCorridorKm) break;
      }
    }

    if (minDistance <= maxCorridorKm) {
      candidates.push(station);
    }
  }

  return candidates;
}
