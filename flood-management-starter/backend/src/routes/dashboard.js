import { Router } from "express";
import { Zone } from "../models/Zone.js";
import { simulateAndPersistLiveData } from "../services/liveDataSimulator.js";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const [zones, readings] = await Promise.all([Zone.find().lean(), simulateAndPersistLiveData()]);
    const danger = zones.some((z) => String(z.risk || "").toUpperCase() === "DANGER");
    res.json({
      updatedAt: new Date().toISOString(),
      zones,
      live: readings,
      alerts: danger ? [{ level: "DANGER", message: "One or more zones are in DANGER state." }] : [],
    });
  } catch (e) {
    next(e);
  }
});
