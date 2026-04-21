import { config } from "../config.js";

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Combined risk score in [0, 1] from live telemetry (rainfall, water level, terrain).
 * Aligns with dashboard thresholds: > danger => DANGER, > warning => WARNING, else SAFE.
 */
export function telemetryRiskScore(zone) {
  const rain = typeof zone.rainfall === "number" ? zone.rainfall : 0;
  const water = typeof zone.waterLevelM === "number" ? zone.waterLevelM : 0;
  const elev = typeof zone.elevationM === "number" ? zone.elevationM : 100;
  const dist = typeof zone.distanceToRiverKm === "number" ? zone.distanceToRiverKm : 2;
  const soil = zone.soilType || "loam";

  const rainN = clamp(rain / 175, 0, 1);
  const waterN = clamp(water / 4.6, 0, 1);
  const elevN = 1 - clamp(elev / 220, 0, 1);
  const distN = 1 - clamp(dist / 10, 0, 1);
  const soilBoost = soil === "clay" || soil === "silt" ? 0.11 : soil === "sand" ? -0.04 : 0;

  const raw =
    0.34 * rainN + 0.3 * waterN + 0.22 * elevN + 0.14 * distN + Math.max(-0.06, Math.min(0.12, soilBoost));
  return clamp(raw, 0, 1);
}

/** Map classifier output probabilities to a scalar in [0, 1]. */
export function scoreFromMlProbabilities(probs) {
  if (!probs || typeof probs !== "object") return null;
  const pick = (keys) => {
    for (const k of keys) {
      if (probs[k] != null && typeof probs[k] === "number" && !Number.isNaN(probs[k])) return probs[k];
    }
    return 0;
  };
  const d = pick(["DANGER"]);
  const w = pick(["WARNING"]);
  const s = pick(["SAFE"]);
  if (d + w + s < 1e-6) return null;
  return clamp(d * 1 + w * 0.52 + s * 0.08, 0, 1);
}

export function classifyRisk(score) {
  if (score > config.riskDangerThreshold) return "DANGER";
  if (score > config.riskWarningThreshold) return "WARNING";
  return "SAFE";
}

export function computeRiskFromTelemetryOnly(zone) {
  const riskScore = telemetryRiskScore(zone);
  return { riskScore, risk: classifyRisk(riskScore) };
}

/**
 * Blend telemetry with ML class probabilities (when ML is reachable).
 */
export function computeRiskWithMl(zone, mlProbabilities) {
  const t = telemetryRiskScore(zone);
  const ml = scoreFromMlProbabilities(mlProbabilities);
  if (ml == null) {
    return { riskScore: t, risk: classifyRisk(t) };
  }
  const blended = 0.42 * t + 0.58 * ml;
  const riskScore = clamp(blended, 0, 1);
  return { riskScore, risk: classifyRisk(riskScore) };
}
