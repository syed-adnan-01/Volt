export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometry: unknown;
}

export async function getRoute(
  startLon: number,
  startLat: number,
  endLon: number,
  endLat: number
): Promise<RouteResult> {

  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${startLon},${startLat};${endLon},${endLat}` +
    `?overview=full&geometries=geojson`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`OSRM request failed: ${response.status}`);
  }

  const data = await response.json();

  if (
    data.code !== "Ok" ||
    !data.routes ||
    data.routes.length === 0
  ) {
    throw new Error("OSRM could not find a route");
  }

  const route = data.routes[0];

  return {
    distanceKm: route.distance / 1000,
    durationMinutes: route.duration / 60,
    geometry: route.geometry
  };
}