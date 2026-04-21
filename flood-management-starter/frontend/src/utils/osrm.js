/** Public OSRM demo — road-following driving routes (GET, browser CORS). */

export async function fetchOsrmDrivingRoute(startLat, startLng, endLat, endLng) {
  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route?.geometry?.coordinates?.length) throw new Error("No route geometry");
  const routeCoords = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
  if (routeCoords.length < 2) throw new Error("Route too short");
  return {
    routeCoords,
    distanceM: route.distance,
    durationSec: route.duration,
  };
}

export function formatRouteDuration(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return null;
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
