import { Router } from "express";
import { simulateAndPersistLiveData } from "../services/liveDataSimulator.js";

export const liveDataRouter = Router();

liveDataRouter.get("/live-data", async (_req, res, next) => {
  try {
    const readings = await simulateAndPersistLiveData();
    res.json({ updatedAt: new Date().toISOString(), readings });
  } catch (e) {
    next(e);
  }
});
