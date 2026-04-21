import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/flood_monitor",
  mlServiceUrl: (process.env.ML_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/$/, ""),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  /** Flood risk score thresholds (0–1). Override via env for quick UI tests, e.g. RISK_DANGER_THRESHOLD=0.55 */
  riskDangerThreshold: Number(process.env.RISK_DANGER_THRESHOLD ?? 0.7),
  riskWarningThreshold: Number(process.env.RISK_WARNING_THRESHOLD ?? 0.4),
};
