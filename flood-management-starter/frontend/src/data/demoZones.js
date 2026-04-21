import { classifyFromScore } from "../utils/risk.js";

/**
 * 20 dummy flood zones — Delhi (8), Haryana (6), Punjab (6).
 * `status` in source rows is informational; the map uses `classifyFromScore(risk)` for consistency.
 */
export const zonesData = [
  // Delhi (8)
  { id: 1, name: "Yamuna Bank", lat: 28.6139, lng: 77.209, risk: 0.9, rainfall: 140, waterLevel: 3.5, status: "DANGER" },
  { id: 2, name: "Laxmi Nagar", lat: 28.6304, lng: 77.2773, risk: 0.8, rainfall: 120, waterLevel: 3.1, status: "DANGER" },
  { id: 3, name: "Rohini", lat: 28.7041, lng: 77.1025, risk: 0.6, rainfall: 90, waterLevel: 2.2, status: "WARNING" },
  { id: 4, name: "Dwarka", lat: 28.5921, lng: 77.046, risk: 0.3, rainfall: 60, waterLevel: 1.5, status: "SAFE" },
  { id: 5, name: "Saket", lat: 28.5245, lng: 77.2066, risk: 0.5, rainfall: 85, waterLevel: 2.0, status: "WARNING" },
  { id: 6, name: "Karol Bagh", lat: 28.6519, lng: 77.1909, risk: 0.75, rainfall: 110, waterLevel: 2.8, status: "DANGER" },
  { id: 7, name: "Pitampura", lat: 28.6967, lng: 77.131, risk: 0.45, rainfall: 70, waterLevel: 1.9, status: "WARNING" },
  { id: 8, name: "Okhla", lat: 28.5355, lng: 77.2721, risk: 0.85, rainfall: 130, waterLevel: 3.3, status: "DANGER" },

  // Haryana (6)
  { id: 9, name: "Gurgaon", lat: 28.4595, lng: 77.0266, risk: 0.55, rainfall: 95, waterLevel: 2.1, status: "WARNING" },
  { id: 10, name: "Faridabad", lat: 28.4089, lng: 77.3178, risk: 0.7, rainfall: 105, waterLevel: 2.7, status: "DANGER" },
  { id: 11, name: "Panipat", lat: 29.3909, lng: 76.9635, risk: 0.4, rainfall: 80, waterLevel: 1.8, status: "WARNING" },
  { id: 12, name: "Karnal", lat: 29.6857, lng: 76.9905, risk: 0.25, rainfall: 50, waterLevel: 1.2, status: "SAFE" },
  { id: 13, name: "Sonipat", lat: 28.9931, lng: 77.0151, risk: 0.65, rainfall: 100, waterLevel: 2.4, status: "WARNING" },
  { id: 14, name: "Ambala", lat: 30.3752, lng: 76.7821, risk: 0.35, rainfall: 60, waterLevel: 1.6, status: "SAFE" },

  // Punjab (6)
  { id: 15, name: "Chandigarh", lat: 30.7333, lng: 76.7794, risk: 0.2, rainfall: 40, waterLevel: 1.0, status: "SAFE" },
  { id: 16, name: "Ludhiana", lat: 30.901, lng: 75.8573, risk: 0.6, rainfall: 90, waterLevel: 2.3, status: "WARNING" },
  { id: 17, name: "Amritsar", lat: 31.634, lng: 74.8723, risk: 0.45, rainfall: 70, waterLevel: 1.9, status: "WARNING" },
  { id: 18, name: "Jalandhar", lat: 31.326, lng: 75.5762, risk: 0.3, rainfall: 55, waterLevel: 1.4, status: "SAFE" },
  { id: 19, name: "Patiala", lat: 30.3398, lng: 76.3869, risk: 0.75, rainfall: 110, waterLevel: 2.9, status: "DANGER" },
  { id: 20, name: "Bathinda", lat: 30.211, lng: 74.9455, risk: 0.5, rainfall: 85, waterLevel: 2.0, status: "WARNING" },
];

function mapRowToZone(row) {
  const riskScore = row.risk;
  const risk = classifyFromScore(riskScore);
  return {
    zoneId: `zone-${row.id}`,
    id: `zone-${row.id}`,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    radiusM: 2200,
    riskScore,
    risk,
    rainfall: row.rainfall,
    waterLevelM: row.waterLevel,
    description: "",
  };
}

/** Initial Leaflet layers + app state — derived from `zonesData`. */
export function createDemoZones() {
  return zonesData.map(mapRowToZone);
}

export function buildLiveReadings(zones) {
  return (zones || []).map((z) => ({
    zoneId: z.zoneId || z.id,
    name: z.name,
    rainfallMm: z.rainfall ?? 0,
    waterLevelM: z.waterLevelM ?? 0,
    ts: new Date().toISOString(),
  }));
}
