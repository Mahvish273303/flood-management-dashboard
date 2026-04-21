import { Router } from "express";
import { Zone } from "../models/Zone.js";
import { computeSafeRoute } from "../services/safeRouteService.js";

export const safeRouteRouter = Router();

safeRouteRouter.post("/safe-route", async (req, res, next) => {
  try {
    const { startLat, startLng, endLat, endLng } = req.body || {};
    if ([startLat, startLng, endLat, endLng].some((v) => typeof v !== "number")) {
      return res.status(400).json({ error: "startLat, startLng, endLat, endLng (numbers) are required" });
    }

    const zones = await Zone.find().lean();
    const route = computeSafeRoute({
      start: { lat: startLat, lng: startLng },
      end: { lat: endLat, lng: endLng },
      zones,
    });

    res.json(route);
  } catch (e) {
    next(e);
  }
});
