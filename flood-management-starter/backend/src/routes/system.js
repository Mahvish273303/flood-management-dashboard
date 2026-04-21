import { Router } from "express";

/**
 * Public system metadata for dashboards, demos, and documentation (viva / report).
 * No external services called — safe for frequent polling.
 */
export const systemRouter = Router();

systemRouter.get("/system", (_req, res) => {
  res.json({
    project: "Smart Flood Monitoring & Early Warning System",
    version: "1.0.0",
    blockchain: false,
    stack: {
      frontend: "React + Leaflet + Recharts",
      backend: "Node.js + Express + MongoDB",
      ml: "Python FastAPI + Random Forest / XGBoost",
    },
    capabilities: [
      "Real-time simulated rainfall and water level per zone",
      "MongoDB: zones, prediction history, user location logs",
      "ML risk classification: SAFE, WARNING, DANGER",
      "Risk-weighted evacuation path + OSRM driving comparison",
      "Alerts when any zone enters DANGER",
    ],
    dataFlow: [
      "Simulator updates zone telemetry on each /api/dashboard or /api/live-data call",
      "POST /api/zones/recompute invokes FastAPI /predict-risk per zone and stores results",
      "POST /api/safe-route returns geometry avoiding high-risk cells (grid A*)",
    ],
  });
});
