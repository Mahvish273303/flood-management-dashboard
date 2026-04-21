import React, { useState } from "react";
import { ChevronDown, ChevronUp, Target } from "lucide-react";

export function ProblemStatement() {
  const [open, setOpen] = useState(true);

  return (
    <section className="card card--project">
      <button type="button" className="project-card__toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="project-card__toggle-label">
          <Target size={16} aria-hidden />
          Problem statement
        </span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div className="project-card__body">
          <p className="project-lead">
            Floods cause loss of life, displacement, and infrastructure damage. Authorities need <strong>timely</strong>{" "}
            situational awareness, <strong>data-driven risk levels</strong>, and <strong>clear evacuation guidance</strong>{" "}
            — not only static maps.
          </p>
          <ul className="project-list">
            <li>Rainfall and river proximity change risk continuously; manual assessment does not scale.</li>
            <li>Drivers and responders require routes that <em>avoid</em> severely inundated areas, not only shortest paths.</li>
            <li>Stakeholders need a single dashboard: live telemetry, ML classification, routing, and alerts.</li>
          </ul>
          <p className="project-foot">
            This system addresses these gaps through <strong>simulated real-time inputs</strong>,{" "}
            <strong>machine-learned risk labels</strong>, <strong>risk-weighted routing</strong>, and an{" "}
            <strong>early-warning UI</strong> aligned with civil-protection workflows.
          </p>
        </div>
      )}
    </section>
  );
}
