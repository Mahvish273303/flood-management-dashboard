import React, { useEffect, useState } from "react";
import { BookOpen, Cpu, Database, Layers, Map, Server, X } from "lucide-react";
import { fetchSystemInfo } from "../../api/client.js";

const FALLBACK = {
  project: "Smart Flood Monitoring & Early Warning System",
  version: "1.0.0",
  stack: {
    frontend: "React 18 + Leaflet + Recharts",
    backend: "Node.js + Express + MongoDB (Mongoose)",
    ml: "Python FastAPI + Random Forest / XGBoost",
  },
  capabilities: [
    "Simulated rainfall & water level → zone telemetry",
    "POST /predict-risk (ML) + Mongo prediction history",
    "Risk-aware A* routing + OSRM driving comparison",
    "DANGER banners + optional browser notifications",
  ],
  blockchain: false,
};

export function SystemOverviewModal({ open, onClose }) {
  const [info, setInfo] = useState(FALLBACK);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSystemInfo();
        if (!cancelled && data) setInfo({ ...FALLBACK, ...data });
      } catch {
        if (!cancelled) setInfo(FALLBACK);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-root" role="dialog" aria-modal="true" aria-labelledby="overview-title">
      <button type="button" className="modal-backdrop" aria-label="Close overview" onClick={onClose} />
      <div className="modal-panel glass">
        <header className="modal-header">
          <div className="modal-header__title" id="overview-title">
            <BookOpen size={22} aria-hidden />
            System overview
          </div>
          <button type="button" className="modal-close btn btn--icon btn--ghost" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="modal-body">
          <p className="modal-lead">
            End-to-end <strong>decision-support</strong> for flood monitoring: ingest (simulated), model, store, visualize,
            route, and alert — <strong>no blockchain dependency</strong>.
          </p>

          <h3 className="modal-h3">Architecture</h3>
          <ol className="modal-steps">
            <li>
              <Map size={16} /> <strong>Frontend</strong> — {info.stack?.frontend}
            </li>
            <li>
              <Server size={16} /> <strong>API layer</strong> — {info.stack?.backend}
            </li>
            <li>
              <Cpu size={16} /> <strong>ML service</strong> — {info.stack?.ml}
            </li>
            <li>
              <Database size={16} /> <strong>Persistence</strong> — zones, predictions, anonymized location logs
            </li>
            <li>
              <Layers size={16} /> <strong>Live loop</strong> — dashboard poll + optional “Recompute ML risks”
            </li>
          </ol>

          <h3 className="modal-h3">Key capabilities</h3>
          <ul className="project-list">
            {(Array.isArray(info.capabilities) && info.capabilities.length ? info.capabilities : FALLBACK.capabilities).map(
              (c) => (
                <li key={c}>{c}</li>
              )
            )}
          </ul>

          <p className="modal-meta">
            Release <code>{info.version}</code> · {info.project}
          </p>
        </div>
      </div>
    </div>
  );
}
