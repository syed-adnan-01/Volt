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

/**
 * Finds charging stations along a given route.
 * Mock implementation for Phase 3 development.
 */
export async function findChargersAlongRoute(
  routeGeometry: [number, number][],
  searchRadiusKm: number = 5
): Promise<Charger[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 150));

  // For development (Phase 3), return mock stations with valid UUIDs
  return [
    {
      id: MOCK_STATION_ID_1,
      latitude: 34.0522,
      longitude: -118.2437,
      maxPowerKw: 150,
      plugCount: 4,
      operator: 'VoltCharge',
    },
    {
      id: MOCK_STATION_ID_2,
      latitude: 34.1522,
      longitude: -118.3437,
      maxPowerKw: 350,
      plugCount: 8,
      operator: 'HyperVolt',
    }
  ];
}
