import cors from "cors";
import express from "express";
import morgan from "morgan";
import { config } from "./config.js";
import { connectDb } from "./db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { liveDataRouter } from "./routes/liveData.js";
import { safeRouteRouter } from "./routes/safeRoute.js";
import { userLocationRouter } from "./routes/userLocation.js";
import { zonesRouter } from "./routes/zones.js";
import { systemRouter } from "./routes/system.js";
import { seedZonesIfEmpty } from "./seed.js";

const app = express();
app.use(
  cors({
    origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(",").map((s) => s.trim()),
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "flood-backend", ts: new Date().toISOString() });
});

app.use("/api", liveDataRouter);
app.use("/api", zonesRouter);
app.use("/api", safeRouteRouter);
app.use("/api", userLocationRouter);
app.use("/api", dashboardRouter);
app.use("/api", systemRouter);

app.use(errorHandler);

async function main() {
  await connectDb();
  await seedZonesIfEmpty();
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Flood backend listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", err);
  process.exit(1);
});
