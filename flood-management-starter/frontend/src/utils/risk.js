export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** UI palette — DANGER red, WARNING yellow, SAFE blue */
export function riskColor(risk) {
  const r = String(risk || "").toUpperCase();
  if (r === "DANGER") return "#ef4444";
  if (r === "WARNING") return "#facc15";
  if (r === "SAFE") return "#3b82f6";
  return "#64748b";
}

export function riskChipClass(risk) {
  const r = String(risk || "").toUpperCase();
  if (r === "DANGER") return "risk-chip risk-chip--danger";
  if (r === "WARNING") return "risk-chip risk-chip--warning";
  return "risk-chip risk-chip--safe";
}

export function classifyFromScore(score) {
  const s = typeof score === "number" && !Number.isNaN(score) ? Math.min(1, Math.max(0, score)) : 0.5;
  if (s >= 0.7) return "DANGER";
  if (s >= 0.4) return "WARNING";
  return "SAFE";
}

function fallbackScoreFromRiskLabel(risk) {
  const r = String(risk || "").toUpperCase();
  if (r === "DANGER") return 0.85;
  if (r === "WARNING") return 0.5;
  if (r === "SAFE") return 0.18;
  return 0.45;
}

export function normalizeZone(z) {
  if (!z || typeof z !== "object") return null;
  const lat = z.lat;
  const lng = z.lng;
  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  const waterLevelM =
    typeof z.waterLevelM === "number"
      ? z.waterLevelM
      : typeof z.waterLevel === "number"
        ? z.waterLevel
        : undefined;

  const statusStr = z.status != null ? String(z.status).toUpperCase() : null;
  const rawRisk = z.risk;

  let risk;
  let riskScore;

  if (typeof rawRisk === "number" && !Number.isNaN(rawRisk) && rawRisk >= 0 && rawRisk <= 1) {
    riskScore = rawRisk;
    risk = statusStr && ["DANGER", "WARNING", "SAFE"].includes(statusStr) ? statusStr : classifyFromScore(rawRisk);
  } else {
    risk = String(statusStr || rawRisk || "WARNING").toUpperCase();
    riskScore =
      typeof z.riskScore === "number" && !Number.isNaN(z.riskScore) ? z.riskScore : fallbackScoreFromRiskLabel(risk);
  }

  return {
    ...z,
    id: z.zoneId || z.id,
    risk,
    riskScore,
    waterLevelM,
    radius: z.radiusM || z.radius || 2000,
  };
}
