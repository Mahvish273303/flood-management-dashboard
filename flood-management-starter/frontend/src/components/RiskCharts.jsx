import React, { useId, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { normalizeZone, riskColor } from "../utils/risk.js";

const tooltipStyle = {
  background: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  fontSize: "12px",
};

export function RiskDistributionChart({ zones }) {
  const gradId = `riskBarGrad-${useId().replace(/:/g, "")}`;
  const data = useMemo(() => {
    const counts = { SAFE: 0, WARNING: 0, DANGER: 0 };
    for (const z of zones || []) {
      if (!z || typeof z !== "object") continue;
      const k = String(z.risk || "").toUpperCase();
      if (counts[k] !== undefined) counts[k] += 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [zones]);

  return (
    <div className="chart-inner" style={{ width: "100%", height: 168 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
            formatter={(v) => [`${v} zones`, "Count"]}
            labelFormatter={(l) => `Level: ${l}`}
          />
          <Bar dataKey="value" fill={`url(#${gradId})`} radius={[8, 8, 0, 0]} maxBarSize={48} />
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Short label for dense X-axis (first word before dash/paren, capped). */
function shortZoneLabel(name) {
  if (!name || typeof name !== "string") return "—";
  const segment = name.split(/[—\-(\|]/)[0].trim();
  const w = segment.split(/\s+/).filter(Boolean);
  if (!w.length) return "—";
  return w[0].length > 12 ? `${w[0].slice(0, 10)}…` : w[0];
}

function RainfallTooltipBody({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={tooltipStyle}>
      <div style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 4 }}>{d.fullName}</div>
      <div style={{ color: "#cbd5e1" }}>Rainfall: {d.mm} mm</div>
      <div style={{ color: riskColor(d.risk), fontWeight: 600 }}>Status: {d.risk}</div>
    </div>
  );
}

const RAINFALL_BAR_MAX = 8;

/**
 * Rainfall by zone — top zones by mm, risk-colored bars, selected zone highlighted.
 * @param {{ zones?: object[], selectedZoneId?: string | number | null }} props
 */
export function RainfallSparkline({ zones, selectedZoneId }) {
  const { chartRows, highestName } = useMemo(() => {
    const normalized = (zones || []).map(normalizeZone).filter((z) => z && typeof z.rainfall === "number");
    const sorted = [...normalized].sort((a, b) => (b.rainfall ?? 0) - (a.rainfall ?? 0));
    let slice = sorted.slice(0, RAINFALL_BAR_MAX);
    const sid = selectedZoneId != null ? String(selectedZoneId) : null;
    if (sid && sorted.length) {
      const selected = sorted.find((z) => String(z.zoneId || z.id) === sid);
      const inSlice = slice.some((z) => String(z.zoneId || z.id) === sid);
      if (selected && !inSlice) {
        slice = [...sorted.slice(0, RAINFALL_BAR_MAX - 1), selected].sort((a, b) => (b.rainfall ?? 0) - (a.rainfall ?? 0));
      }
    }
    const rows = slice
      .map((z) => {
        const key = String(z.zoneId || z.id);
        const risk = String(z.risk || "").toUpperCase();
        return {
          key,
          shortLabel: shortZoneLabel(z.name),
          fullName: z.name || key,
          mm: z.rainfall ?? 0,
          risk,
          isSelected: sid != null && key === sid,
        };
      })
      .sort((a, b) => b.mm - a.mm);
    const highestName = rows.length ? rows[0].fullName : null;
    return { chartRows: rows, highestName };
  }, [zones, selectedZoneId]);

  return (
    <div className="chart-inner" style={{ width: "100%", height: 152 }}>
      <ResponsiveContainer>
        <BarChart data={chartRows} margin={{ top: 8, right: 8, left: -8, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis
            dataKey="shortLabel"
            stroke="#64748b"
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            interval={0}
            angle={-22}
            textAnchor="end"
            height={46}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            label={{ value: "mm", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }}
          />
          <Tooltip content={<RainfallTooltipBody />} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
          <Bar dataKey="mm" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {chartRows.map((entry) => (
              <Cell
                key={entry.key}
                fill={riskColor(entry.risk)}
                stroke={entry.isSelected ? "#f8fafc" : "transparent"}
                strokeWidth={entry.isSelected ? 2 : 0}
                style={{
                  filter: entry.isSelected ? "brightness(1.12)" : undefined,
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {highestName != null && (
        <p className="muted small" style={{ margin: "0.35rem 0 0", fontSize: "0.7rem" }}>
          Highest rainfall: <strong style={{ color: "#e2e8f0" }}>{highestName}</strong>
        </p>
      )}
    </div>
  );
}
