export interface Charger {
  id: string;
  name: string;
  lat: number;
  lon: number;
  powerKw: number;
  connectorType: string;
  network: string;
}

export const chargers: Charger[] = [
  {
    id: "C001",
    name: "Maddur Charger",
    lat: 12.5828,
    lon: 77.0447,
    powerKw: 60,
    connectorType: "CCS2",
    network: "Zeon Charging"
  },
  {
    id: "C002",
    name: "Mandya Charger",
    lat: 12.5218,
    lon: 76.8951,
    powerKw: 50,
    connectorType: "CCS2",
    network: "Tata Power"
  },
  {
    id: "C003",
    name: "Mysuru Charger",
    lat: 12.2958,
    lon: 76.6394,
    powerKw: 120,
    connectorType: "CCS2",
    network: "Jio-bp"
  },
  {
    id: "C004",
    name: "Bidadi Fast Charger",
    lat: 12.7984,
    lon: 77.3828,
    powerKw: 60,
    connectorType: "CCS2",
    network: "Zeon Charging"
  },
  {
    id: "C005",
    name: "Ramanagara Charger",
    lat: 12.7150,
    lon: 77.2810,
    powerKw: 30,
    connectorType: "CCS2",
    network: "BESCOM"
  }
];

export interface ChargerFilterOptions {
  connectorTypes?: string[];
  minPowerKw?: number;
  blacklistedChargerIds?: string[];
}

/**
 * Filters charger list by connector compatibility, minimum power, and blacklist.
 */
export function filterCandidateChargers(
  chargerList: Charger[] = chargers,
  options?: ChargerFilterOptions
): Charger[] {
  if (!options) return chargerList;

  const { connectorTypes, minPowerKw, blacklistedChargerIds } = options;

  return chargerList.filter((charger) => {
    // 1. Blacklist check
    if (blacklistedChargerIds && blacklistedChargerIds.includes(charger.id)) {
      return false;
    }

    // 2. Connector type check (case-insensitive)
    if (connectorTypes && connectorTypes.length > 0) {
      const match = connectorTypes.some(
        (type) => type.trim().toUpperCase() === charger.connectorType.trim().toUpperCase()
      );
      if (!match) return false;
    }

    // 3. Minimum power kW check
    if (minPowerKw !== undefined && charger.powerKw < minPowerKw) {
      return false;
    }

    return true;
  });
}

export function getCandidateChargers(
  chargers: Charger[],
  routeLat: number,
  routeLon: number,
  maxDistanceKm: number
): Charger[] {
  return chargers.filter((charger) => {
    const distance = calculateDistance(
      routeLat,
      routeLon,
      charger.lat,
      charger.lon
    );

    return distance <= maxDistanceKm;
  });
}

/**
 * Extracts [lon, lat] coordinates array from GeoJSON LineString geometry or raw coordinate array.
 */
export function extractCoordinatesFromGeometry(geometry: unknown): [number, number][] {
  if (!geometry) return [];
  if (Array.isArray(geometry)) {
    return geometry as [number, number][];
  }
  if (typeof geometry === "object" && geometry !== null && "coordinates" in geometry) {
    const geoObj = geometry as { coordinates?: unknown };
    if (Array.isArray(geoObj.coordinates)) {
      return geoObj.coordinates as [number, number][];
    }
  }
  return [];
}

/**
 * Finds all candidate chargers along a complete route geometry within a maximum detour distance (in km).
 */
export function findChargersAlongRoute(
  routeGeometry: unknown,
  maxDetourKm: number,
  chargerList: Charger[] = chargers,
  filterOptions?: ChargerFilterOptions
): Charger[] {
  const filteredList = filterCandidateChargers(chargerList, filterOptions);

  const coordinates = extractCoordinatesFromGeometry(routeGeometry);
  if (coordinates.length === 0) {
    return [];
  }

  const candidateChargers: Charger[] = [];

  for (const charger of filteredList) {
    let isWithinDetour = false;

    for (const point of coordinates) {
      const [lon, lat] = point;
      if (lat === undefined || lon === undefined) continue;

      const distance = calculateDistance(lat, lon, charger.lat, charger.lon);
      if (distance <= maxDetourKm) {
        isWithinDetour = true;
        break;
      }
    }

    if (isWithinDetour) {
      candidateChargers.push(charger);
    }
  }

  return candidateChargers;
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );

  return earthRadiusKm * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}