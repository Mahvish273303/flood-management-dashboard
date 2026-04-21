import { Zone } from "../models/Zone.js";
import { computeRiskFromTelemetryOnly } from "./riskEngine.js";

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Real-time simulation: rainfall (mm) + water level (m) as smooth oscillations over time,
 * persisted on each Zone for dashboard + ML recompute (no external IoT required for demos).
 * Returns compact readings for the UI.
 */
export async function simulateAndPersistLiveData() {
  const zones = await Zone.find();
  const now = Date.now() / 1000;
  const readings = [];

  for (const z of zones) {
    const phase = (z.zoneId || z.name).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rainfall = clamp(15 + 55 * Math.sin(now / 40 + phase * 0.01) + 20 * Math.sin(now / 17), 0, 220);
    const waterLevel = clamp(1.2 + 0.8 * Math.sin(now / 55 + phase * 0.02), 0.5, 4.5);

    z.rainfall = Number(rainfall.toFixed(1));
    z.waterLevelM = Number(waterLevel.toFixed(2));
    const { riskScore, risk } = computeRiskFromTelemetryOnly(z);
    z.riskScore = riskScore;
    z.risk = risk;
    await z.save();

    readings.push({
      zoneId: z.zoneId,
      name: z.name,
      rainfallMm: z.rainfall,
      waterLevelM: z.waterLevelM,
      ts: new Date().toISOString(),
    });
  }

  return readings;
}
