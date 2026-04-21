import { Router } from "express";
import { UserLocationLog } from "../models/UserLocationLog.js";

export const userLocationRouter = Router();

userLocationRouter.post("/user-location", async (req, res, next) => {
  try {
    const { lat, lng, accuracyM, sessionId } = req.body || {};
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "lat and lng are required numbers" });
    }
    const doc = await UserLocationLog.create({
      lat,
      lng,
      accuracyM,
      sessionId,
      source: "browser",
    });
    res.status(201).json({ id: doc.id });
  } catch (e) {
    next(e);
  }
});
