import { Router } from "express";
import { Prediction } from "../models/Prediction.js";
import { Zone } from "../models/Zone.js";
import { predictRisk } from "../services/mlClient.js";
import { computeRiskFromTelemetryOnly, computeRiskWithMl } from "../services/riskEngine.js";

export const zonesRouter = Router();

zonesRouter.get("/zones", async (_req, res, next) => {
  try {
    const zones = await Zone.find().lean();
    res.json({ zones });
  } catch (e) {
    next(e);
  }
});

zonesRouter.post("/zones/recompute", async (_req, res, next) => {
  try {
    const zones = await Zone.find();
    const results = [];

    for (const z of zones) {
      const payload = {
        rainfall: z.rainfall,
        elevation: z.elevationM,
        distance_to_river: z.distanceToRiverKm,
        soil_type: z.soilType,
      };
      let ml = null;
      try {
        ml = await predictRisk(payload);
      } catch {
        ml = null;
      }

      let riskScore;
      let risk;
      let modelLabel;
      if (ml) {
        ({ riskScore, risk } = computeRiskWithMl(z, ml.probabilities));
        modelLabel = String(ml.model || "ml");
      } else {
        ({ riskScore, risk } = computeRiskFromTelemetryOnly(z));
        modelLabel = "mock-telemetry";
      }

      z.riskScore = riskScore;
      z.risk = risk;
      z.lastModel = modelLabel;
      await z.save();

      await Prediction.create({
        zoneId: z.zoneId,
        model: String(modelLabel),
        risk,
        riskScore,
        features: {
          rainfall: z.rainfall,
          elevation: z.elevationM,
          distanceToRiver: z.distanceToRiverKm,
          soilType: z.soilType,
        },
        probabilities: new Map(Object.entries(ml?.probabilities || {})),
      });

      results.push({ zoneId: z.zoneId, risk, riskScore, model: modelLabel });
    }

    res.json({ ok: true, results });
  } catch (e) {
    next(e);
  }
});

zonesRouter.get("/predictions/recent", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const items = await Prediction.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ items });
  } catch (e) {
    next(e);
  }
});
