import mongoose from "mongoose";

const ZoneSchema = new mongoose.Schema(
  {
    zoneId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    radiusM: { type: Number, default: 2000 },
    description: { type: String, default: "" },
    risk: { type: String, enum: ["SAFE", "WARNING", "DANGER"], default: "WARNING" },
    /** Continuous score in [0, 1]; used for thresholds and heatmap intensity */
    riskScore: { type: Number, default: 0.5 },
    rainfall: { type: Number, default: 0 },
    waterLevelM: { type: Number, default: 0 },
    elevationM: { type: Number, default: 100 },
    distanceToRiverKm: { type: Number, default: 2 },
    soilType: {
      type: String,
      enum: ["clay", "loam", "sand", "silt", "rocky"],
      default: "loam",
    },
    lastModel: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Zone = mongoose.model("Zone", ZoneSchema);
