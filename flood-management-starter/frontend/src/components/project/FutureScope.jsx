import React, { useState } from "react";
import { ChevronDown, ChevronUp, Rocket } from "lucide-react";

export function FutureScope() {
  const [open, setOpen] = useState(false);

  return (
    <section className="card card--project">
      <button type="button" className="project-card__toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="project-card__toggle-label">
          <Rocket size={16} aria-hidden />
          Future scope
        </span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div className="project-card__body">
          <ul className="project-list">
            <li>Integrate IMD / GHCN weather APIs and river-gauge telemetry for production-grade inputs.</li>
            <li>Deploy LSTM or transformer models on longer rainfall sequences; automate retraining pipelines.</li>
            <li>Snap evacuation polylines to OSM road graphs (Valhalla / OSRM custom costs) with dynamic road closures.</li>
            <li>Role-based auth, SMS / WhatsApp / FCM alerts, and multilingual public portals.</li>
            <li>Digital twin mesh (hydraulic + DEM) for sub-zone inundation depth, not only circular buffers.</li>
          </ul>
          <p className="project-foot muted small" style={{ marginBottom: 0 }}>
            This repository intentionally avoids Web3 / blockchain: flood operations require auditable, low-latency
            conventional infrastructure.
          </p>
        </div>
      )}
    </section>
  );
}
