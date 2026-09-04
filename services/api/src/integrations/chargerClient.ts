// ──────────────────────────────────────────────
// Charger Client (Integration with Member 1 / 4)
// ──────────────────────────────────────────────

export interface Charger {
  id: string;
  latitude: number;
  longitude: number;
  maxPowerKw: number;
  plugCount: number;
  operator: string;
}

export const MOCK_STATION_ID_1 = '11111111-1111-1111-1111-111111111111';
export const MOCK_STATION_ID_2 = '22222222-2222-2222-2222-222222222222';

const REAL_CORRIDOR_STATIONS: Charger[] = [
  // Bengaluru ➔ Mangaluru (NH 75)
  { id: '33333333-1111-0000-0000-000000000001', latitude: 12.9868, longitude: 76.8835, maxPowerKw: 60, plugCount: 2, operator: 'Tata Power' },
  { id: '33333333-1111-0000-0000-000000000002', latitude: 12.9056, longitude: 76.3912, maxPowerKw: 120, plugCount: 4, operator: 'Zeon Charging' },
  { id: '33333333-1111-0000-0000-000000000003', latitude: 13.0033, longitude: 76.1004, maxPowerKw: 60, plugCount: 2, operator: 'Jio-bp pulse' },
  { id: '33333333-1111-0000-0000-000000000004', latitude: 12.9431, longitude: 75.7865, maxPowerKw: 60, plugCount: 2, operator: 'Relux Electric' },
  { id: '33333333-1111-0000-0000-000000000005', latitude: 12.8530, longitude: 75.2514, maxPowerKw: 60, plugCount: 2, operator: 'ChargeZone' },
  { id: '33333333-1111-0000-0000-000000000006', latitude: 12.8698, longitude: 74.8430, maxPowerKw: 120, plugCount: 4, operator: 'Zeon Charging' },

  // Bengaluru ➔ Mysuru (NH 275)
  { id: '33333333-2222-0000-0000-000000000001', latitude: 12.7984, longitude: 77.3828, maxPowerKw: 60, plugCount: 2, operator: 'Zeon Charging' },
  { id: '33333333-2222-0000-0000-000000000002', latitude: 12.7150, longitude: 77.2810, maxPowerKw: 50, plugCount: 2, operator: 'BESCOM' },
  { id: '33333333-2222-0000-0000-000000000003', latitude: 12.5828, longitude: 77.0447, maxPowerKw: 60, plugCount: 2, operator: 'Zeon Charging' },
  { id: '33333333-2222-0000-0000-000000000004', latitude: 12.5218, longitude: 76.8951, maxPowerKw: 50, plugCount: 2, operator: 'Tata Power' },
  { id: '33333333-2222-0000-0000-000000000005', latitude: 12.4180, longitude: 76.6947, maxPowerKw: 120, plugCount: 4, operator: 'Jio-bp pulse' },

  // Mumbai ➔ Pune (Expressway)
  { id: '33333333-3333-0000-0000-000000000001', latitude: 19.0435, longitude: 73.0685, maxPowerKw: 60, plugCount: 2, operator: 'Tata Power' },
  { id: '33333333-3333-0000-0000-000000000002', latitude: 18.7915, longitude: 73.2842, maxPowerKw: 120, plugCount: 4, operator: 'Zeon Charging' },
  { id: '33333333-3333-0000-0000-000000000003', latitude: 18.7557, longitude: 73.4091, maxPowerKw: 120, plugCount: 4, operator: 'Jio-bp pulse' },
  { id: '33333333-3333-0000-0000-000000000004', latitude: 18.7300, longitude: 73.6750, maxPowerKw: 60, plugCount: 2, operator: 'Statiq' },
  { id: '33333333-3333-0000-0000-000000000005', latitude: 18.5987, longitude: 73.7634, maxPowerKw: 150, plugCount: 6, operator: 'Tata Power' },

  // US California
  { id: MOCK_STATION_ID_1, latitude: 37.7749, longitude: -122.4194, maxPowerKw: 150, plugCount: 4, operator: 'VoltCharge' },
  { id: MOCK_STATION_ID_2, latitude: 38.5449, longitude: -121.7405, maxPowerKw: 350, plugCount: 8, operator: 'Electrify America' },
];

/**
 * Finds charging stations along a given route.
 */
export async function findChargersAlongRoute(
  routeGeometry: any,
  searchRadiusKm: number = 30
): Promise<Charger[]> {
  await new Promise(resolve => setTimeout(resolve, 50));

  let coords: [number, number][] = [];
  if (Array.isArray(routeGeometry)) {
    coords = routeGeometry;
  } else if (routeGeometry && Array.isArray(routeGeometry.coordinates)) {
    coords = routeGeometry.coordinates;
  }

  if (coords.length === 0) {
    return REAL_CORRIDOR_STATIONS.slice(0, 3);
  }

  // Filter stations that lie within reasonable proximity to any route coordinate
  const matched = REAL_CORRIDOR_STATIONS.filter(st => {
    return coords.some(coord => {
      // GeoJSON is [lon, lat]
      const lon = coord[0];
      const lat = coord[1];
      const dLat = Math.abs(st.latitude - lat);
      const dLon = Math.abs(st.longitude - lon);
      return dLat < 0.45 && dLon < 0.45; // ~45 km bounding box
    });
  });

  return matched.length > 0 ? matched : REAL_CORRIDOR_STATIONS.slice(0, 3);
}
