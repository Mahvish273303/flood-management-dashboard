/**
 * Grid A* routing with cost = geographic step distance + risk penalty from zone overlays.
 * Coarse grid suitable for research demos; snap-to-road can be added with OSRM / Mapbox.
 */

const RISK_WEIGHT = { SAFE: 0, WARNING: 2.5, DANGER: 25 };

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function cellRisk(lat, lng, zones) {
  let penalty = 0;
  for (const z of zones) {
    const d = haversineMeters(lat, lng, z.lat, z.lng);
    const r = z.radiusM || 2000;
    if (d <= r) {
      penalty = Math.max(penalty, RISK_WEIGHT[z.risk] ?? RISK_WEIGHT.WARNING);
    }
  }
  return penalty;
}

function latLngToIdx(lat, lng, bounds, step) {
  const col = Math.round((lng - bounds.minLng) / step);
  const row = Math.round((bounds.maxLat - lat) / step);
  return { row, col };
}

function idxToLatLng(row, col, bounds, step) {
  const lng = bounds.minLng + col * step;
  const lat = bounds.maxLat - row * step;
  return { lat, lng };
}

function buildGrid(bounds, step) {
  const cols = Math.ceil((bounds.maxLng - bounds.minLng) / step) + 1;
  const rows = Math.ceil((bounds.maxLat - bounds.minLat) / step) + 1;
  return { rows, cols };
}

function neighbors(row, col, rows, cols) {
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push({ row: nr, col: nc, dr, dc });
    }
  }
  return out;
}

function astar(start, goal, bounds, step, zones) {
  const { rows, cols } = buildGrid(bounds, step);
  const startIdx = latLngToIdx(start.lat, start.lng, bounds, step);
  const goalIdx = latLngToIdx(goal.lat, goal.lng, bounds, step);

  const inBounds = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols;
  if (!inBounds(startIdx.row, startIdx.col) || !inBounds(goalIdx.row, goalIdx.col)) {
    return null;
  }

  const key = (r, c) => `${r},${c}`;
  const open = new Map();
  const gScore = new Map();
  const fScore = new Map();
  const came = new Map();

  const h = (r, c) => {
    const { lat, lng } = idxToLatLng(r, c, bounds, step);
    return haversineMeters(lat, lng, goal.lat, goal.lng);
  };

  const startKey = key(startIdx.row, startIdx.col);
  gScore.set(startKey, 0);
  fScore.set(startKey, h(startIdx.row, startIdx.col));
  open.set(startKey, { row: startIdx.row, col: startIdx.col });

  while (open.size) {
    let currentKey = null;
    let bestF = Infinity;
    for (const [k, v] of open) {
      const f = fScore.get(k) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        currentKey = k;
      }
    }
    if (!currentKey) break;
    const cur = open.get(currentKey);
    open.delete(currentKey);
    const { row, col } = cur;

    if (row === goalIdx.row && col === goalIdx.col) {
      const path = [];
      let ck = currentKey;
      while (ck) {
        const [r, c] = ck.split(",").map(Number);
        const { lat, lng } = idxToLatLng(r, c, bounds, step);
        path.push([lat, lng]);
        ck = came.get(ck) || null;
      }
      path.reverse();
      return path;
    }

    for (const n of neighbors(row, col, rows, cols)) {
      const { lat: lat1, lng: lng1 } = idxToLatLng(row, col, bounds, step);
      const { lat: lat2, lng: lng2 } = idxToLatLng(n.row, n.col, bounds, step);
      const dist = haversineMeters(lat1, lng1, lat2, lng2);
      const midLat = (lat1 + lat2) / 2;
      const midLng = (lng1 + lng2) / 2;
      const riskPenalty = (cellRisk(midLat, midLng, zones) + cellRisk(lat2, lng2, zones)) / 2;
      const tentative = (gScore.get(currentKey) ?? Infinity) + dist + riskPenalty;
      const nk = key(n.row, n.col);
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        came.set(nk, currentKey);
        gScore.set(nk, tentative);
        fScore.set(nk, tentative + h(n.row, n.col));
        if (!open.has(nk)) open.set(nk, { row: n.row, col: n.col });
      }
    }
  }

  return null;
}

export function computeSafeRoute({ start, end, zones, stepDeg = 0.007 }) {
  const minLat = Math.min(start.lat, end.lat) - 0.06;
  const maxLat = Math.max(start.lat, end.lat) + 0.06;
  const minLng = Math.min(start.lng, end.lng) - 0.06;
  const maxLng = Math.max(start.lng, end.lng) + 0.06;
  const bounds = { minLat, maxLat, minLng, maxLng };

  let path = astar(start, end, bounds, stepDeg, zones);
  if (!path || path.length < 2) {
    return {
      geometry: [
        [start.lat, start.lng],
        [end.lat, end.lng],
      ],
      algorithm: "straight_fallback",
      warnings: ["A* did not converge; returned direct segment."],
    };
  }

  path = [[start.lat, start.lng], ...path.slice(1, -1), [end.lat, end.lng]];

  let distanceM = 0;
  for (let i = 1; i < path.length; i++) {
    distanceM += haversineMeters(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1]);
  }

  const riskSamples = path.map(([lat, lng]) => cellRisk(lat, lng, zones));
  const maxEdgeRisk = Math.max(...riskSamples);

  return {
    geometry: path,
    distanceM: Number(distanceM.toFixed(1)),
    algorithm: "weighted_grid_astar",
    maxEdgeRiskPenalty: maxEdgeRisk,
    warnings: maxEdgeRisk >= RISK_WEIGHT.DANGER ? ["Path may still touch DANGER cells; evacuate early."] : [],
  };
}
