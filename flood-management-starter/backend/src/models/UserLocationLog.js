import mongoose from "mongoose";

const UserLocationLogSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracyM: { type: Number },
    source: { type: String, default: "browser" },
    sessionId: { type: String, index: true },
  },
  { timestamps: true }
);

export const UserLocationLog = mongoose.model("UserLocationLog", UserLocationLogSchema);
