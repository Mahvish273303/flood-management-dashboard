/**
 * Lightweight evacuation helpers (planar distance for ordering nearest zone).
 * @param {{ lat: number, lng: number }} a
 * @param {{ lat: number, lng: number }} b
 */
export function getDistance(a, b) {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);
}

/** Supports `risk` (app) or `status` (raw data). */
export function isSafeZone(z) {
  if (!z || typeof z !== "object") return false;
  const s = String(z.risk || z.status || "").toUpperCase();
  return s === "SAFE";
}

/**
 * SAFE zones sorted by planar distance from start (ascending).
 * @param {{ lat: number, lng: number }} startPoint
 * @param {Array<object>} safeZones
 */
export function sortSafeZonesByDistance(startPoint, safeZones) {
  if (!safeZones?.length) return [];
  return [...safeZones].sort((a, b) => getDistance(startPoint, a) - getDistance(startPoint, b));
}

/**
 * Nearest SAFE zone by planar distance (same result as sortSafeZonesByDistance[0]).
 * @param {{ lat: number, lng: number }} startPoint
 * @param {Array<{ lat: number, lng: number }>} safeZones
 */
export function findNearestSafeZone(startPoint, safeZones) {
  const sorted = sortSafeZonesByDistance(startPoint, safeZones);
  return sorted[0] ?? null;
}

/**
 * Slightly bent path (not a single straight segment) for clearer evacuation visualization.
 * @param {{ lat: number, lng: number }} startPoint
 * @param {{ lat: number, lng: number }} endPoint
 * @returns {[number, number][]} Leaflet [lat, lng][] coordinates
 */
export function buildEvacuationRouteCoords(startPoint, endPoint) {
  return [
    [startPoint.lat, startPoint.lng],
    [(startPoint.lat + endPoint.lat) / 2, startPoint.lng],
    [(startPoint.lat + endPoint.lat) / 2, endPoint.lng],
    [endPoint.lat, endPoint.lng],
  ];
}
