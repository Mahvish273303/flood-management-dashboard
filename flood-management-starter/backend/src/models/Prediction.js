import mongoose from "mongoose";

const PredictionSchema = new mongoose.Schema(
  {
    zoneId: { type: String, required: true, index: true },
    model: { type: String, required: true },
    risk: { type: String, enum: ["SAFE", "WARNING", "DANGER"], required: true },
    riskScore: { type: Number },
    features: {
      rainfall: Number,
      elevation: Number,
      distanceToRiver: Number,
      soilType: String,
    },
    probabilities: { type: Map, of: Number },
  },
  { timestamps: true }
);

export const Prediction = mongoose.model("Prediction", PredictionSchema);
