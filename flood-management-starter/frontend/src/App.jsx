import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "./styles.css";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Droplets,
  Layers,
  ListTree,
  LocateFixed,
  Map as MapIcon,
  Navigation,
  RefreshCw,
  Route,
  ShieldAlert,
  Trash2,
  Waves,
} from "lucide-react";
import { fetchDashboard, logUserLocation, recomputeRisks } from "./api/client.js";
import { RiskDistributionChart, RainfallSparkline } from "./components/RiskCharts.jsx";
import { FutureScope } from "./components/project/FutureScope.jsx";
import { ProblemStatement } from "./components/project/ProblemStatement.jsx";
import { SystemOverviewModal } from "./components/project/SystemOverviewModal.jsx";
import { DEFAULT_USER_LOCATION, DEMO_MODE } from "./config/demo.js";
import { MAP_CENTER, MAP_ZOOM, TILE_ATTRIB, TILE_URL } from "./config/map.js";
import { createDemoZones, buildLiveReadings } from "./data/demoZones.js";
import { haversineKm } from "./utils/geo.js";
import { fetchOsrmDrivingRoute, formatRouteDuration } from "./utils/osrm.js";
import {
  buildEvacuationRouteCoords,
  getDistance,
  isSafeZone,
  sortSafeZonesByDistance,
} from "./utils/routing.js";
import { classifyFromScore, escapeHtml, normalizeZone, riskChipClass, riskColor } from "./utils/risk.js";
import { guardClick, guardClickAsync } from "./utils/safeInvoke.js";
import { getOrCreateSessionId } from "./utils/session.js";

export default function App() {
  const [zones, setZones] = useState(() => (DEMO_MODE ? createDemoZones() : []));
  const [live, setLive] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [recomputing, setRecomputing] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(!DEMO_MODE);

  const [userLocation, setUserLocation] = useState(() => (DEMO_MODE ? { ...DEFAULT_USER_LOCATION } : null));
  const [locating, setLocating] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [lastRoutingError, setLastRoutingError] = useState(null);
  const [routeMeta, setRouteMeta] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [overviewOpen, setOverviewOpen] = useState(false);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const featuresLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userAccuracyRef = useRef(null);
  const heatLayerRef = useRef(null);
  const prevDangerRef = useRef(false);
  const dashboardLoadedOnceRef = useRef(false);

  const filteredZones = useMemo(() => {
    const list = (zones || []).map(normalizeZone).filter(Boolean);
    if (!highRiskOnly) return list;
    return list.filter((z) => z.risk === "DANGER");
  }, [zones, highRiskOnly]);

  const anyDanger = useMemo(() => (zones || []).some((z) => String(z.risk).toUpperCase() === "DANGER"), [zones]);

  useEffect(() => {
    if (DEMO_MODE) {
      setLive(buildLiveReadings(zones));
    }
  }, [zones]);

  const refreshDashboard = useCallback(async () => {
    if (DEMO_MODE) {
      setApiError(null);
      setDashboardLoading(false);
      dashboardLoadedOnceRef.current = true;
      return;
    }
    if (!dashboardLoadedOnceRef.current) setDashboardLoading(true);
    try {
      const data = await fetchDashboard();
      setApiError(null);
      const nextZones = data.zones || [];
      setZones(nextZones);
      setLive(data.live || []);
    } catch (e) {
      setApiError(e?.message || String(e));
    } finally {
      setDashboardLoading(false);
      dashboardLoadedOnceRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (DEMO_MODE) {
      refreshDashboard();
      return;
    }
    refreshDashboard();
    const t = setInterval(refreshDashboard, 15_000);
    return () => clearInterval(t);
  }, [refreshDashboard]);

  useEffect(() => {
    if (!selected) return;
    const id = selected.zoneId || selected.id;
    const still = (zones || []).find((z) => (z.zoneId || z.id) === id);
    if (!still) {
      setSelected(null);
      return;
    }
    const next = normalizeZone(still);
    if (!next) {
      setSelected(null);
      return;
    }
    if (
      next.risk !== selected.risk ||
      next.riskScore !== selected.riskScore ||
      next.rainfall !== selected.rainfall ||
      next.waterLevelM !== selected.waterLevelM ||
      next.lastModel !== selected.lastModel
    ) {
      setSelected(next);
    }
  }, [zones, selected]);

  useEffect(() => {
    if (!anyDanger) {
      prevDangerRef.current = false;
      return;
    }
    if (!prevDangerRef.current) {
      prevDangerRef.current = true;
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          // eslint-disable-next-line no-new
          new Notification("Flood alert", { body: "At least one zone is in DANGER state." });
        } else if (typeof Notification !== "undefined" && Notification.permission === "default") {
          Notification.requestPermission();
        }
      } catch {
        /* ignore */
      }
    }
  }, [anyDanger]);

  useEffect(() => {
    if (document.getElementById("user-marker-style")) return;
    const s = document.createElement("style");
    s.id = "user-marker-style";
    s.innerHTML = `
      .user-pulse-demo { width:20px; height:20px; border-radius:999px; background:#22c55e; box-shadow:0 0 12px rgba(34,197,94,0.85); position:relative; border:3px solid rgba(255,255,255,0.95); }
      .user-pulse-demo::after { content:""; position:absolute; left:50%; top:50%; width:20px; height:20px; border-radius:999px; transform:translate(-50%,-50%); background:rgba(34,197,94,0.25); animation:pulse 1.8s infinite; }
      @keyframes pulse { 0% { transform:translate(-50%,-50%) scale(1); opacity:0.9 } 70% { transform:translate(-50%,-50%) scale(2.4); opacity:0.02 } 100% { transform:translate(-50%,-50%) scale(2.8); opacity:0 } }
    `;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (mapInstance.current) return;
    try {
      const el = mapRef.current;
      if (!el) return;
      const map = L.map(el, {
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        preferCanvas: true,
        zoomControl: false,
      });
      L.control.zoom({ position: "topright" }).addTo(map);
      L.tileLayer(TILE_URL, {
        maxZoom: 19,
        attribution: TILE_ATTRIB,
      }).addTo(map);
      featuresLayerRef.current = L.layerGroup().addTo(map);
      mapInstance.current = map;
    } catch (err) {
      console.warn("[flood-app] Map init failed (suppressed):", err);
    }
    return () => {
      const m = mapInstance.current;
      if (m) {
        try {
          m.remove();
        } catch {
          /* ignore */
        }
      }
      mapInstance.current = null;
      featuresLayerRef.current = null;
    };
  }, []);

  const selectZone = useCallback((z) => {
    const nz = normalizeZone(z);
    if (nz) setSelected(nz);
  }, []);

  function simulateFlood() {
    setZones((prev) =>
      (prev || []).map((z) => {
        const bump = 0.06 + Math.random() * 0.14;
        const jitter = Math.random() * 0.06;
        const base = typeof z.riskScore === "number" ? z.riskScore : 0.45;
        const nextScore = Math.min(1, Math.max(0, base + bump - jitter));
        const risk = classifyFromScore(nextScore);
        const rain = typeof z.rainfall === "number" ? z.rainfall : 40;
        const water = typeof z.waterLevelM === "number" ? z.waterLevelM : 1;
        return {
          ...z,
          riskScore: nextScore,
          risk,
          rainfall: Math.round(Math.min(220, rain + 8 + Math.random() * 35)),
          waterLevelM: Math.round((Math.min(4.5, water + 0.1 + Math.random() * 0.55)) * 100) / 100,
        };
      })
    );
  }

  useEffect(() => {
    const map = mapInstance.current;
    const layerGroup = featuresLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    if (heatLayerRef.current) {
      try {
        map.removeLayer(heatLayerRef.current);
      } catch {
        /* ignore */
      }
      heatLayerRef.current = null;
    }

    if (showHeatmap && filteredZones.length) {
      const pts = filteredZones
        .filter((z) => z && typeof z.lat === "number" && typeof z.lng === "number")
        .map((z) => {
          const score =
            typeof z.riskScore === "number" && !Number.isNaN(z.riskScore)
              ? Math.min(1, Math.max(0, z.riskScore))
              : z.risk === "DANGER"
                ? 0.92
                : z.risk === "WARNING"
                  ? 0.55
                  : 0.22;
          const rain = typeof z.rainfall === "number" ? z.rainfall : 0;
          const rainBoost = 0.35 + Math.min(0.85, rain / 160);
          return [z.lat, z.lng, score * rainBoost];
        })
        .filter((row) => row.every((v) => typeof v === "number" && !Number.isNaN(v)));
      if (pts.length) {
        heatLayerRef.current = L.heatLayer(pts, {
          radius: 38,
          blur: 22,
          maxZoom: 13,
          gradient: { 0.2: "#3b82f6", 0.55: "#facc15", 0.92: "#ef4444" },
        });
        layerGroup.addLayer(heatLayerRef.current);
        const canvas = heatLayerRef.current._canvas || heatLayerRef.current.getElement?.();
        if (canvas && canvas.style) canvas.style.pointerEvents = "none";
      }
    }

    const selectedId = selected ? selected.zoneId || selected.id : null;

    filteredZones.forEach((z) => {
      if (!z || typeof z.lat !== "number" || typeof z.lng !== "number") return;
      const hex = riskColor(z.risk);
      const isSel = selectedId != null && selectedId === (z.zoneId || z.id);

      const circle = L.circle([z.lat, z.lng], {
        radius: z.radius || 2000,
        color: hex,
        fillColor: hex,
        fillOpacity: z.risk === "DANGER" ? 0.32 : z.risk === "WARNING" ? 0.24 : 0.18,
        weight: isSel ? 4 : z.risk === "DANGER" ? 3 : 2,
        opacity: 0.98,
      });
      layerGroup.addLayer(circle);
      circle.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        selectZone(z);
      });

      if (isSel) {
        const ring = L.circle([z.lat, z.lng], {
          radius: (z.radius || 2000) + 450,
          color: "#ffffff",
          fillOpacity: 0,
          weight: 2,
          opacity: 0.85,
          dashArray: "8 10",
        });
        layerGroup.addLayer(ring);
      }

      const scoreTxt = typeof z.riskScore === "number" && !Number.isNaN(z.riskScore) ? z.riskScore.toFixed(2) : "—";
      const iconHtml = `<div class="zone-marker-pin" title="${escapeHtml(z.name)} · ${escapeHtml(scoreTxt)}">
        <div class="zone-marker-dot" style="background:${hex}"></div>
        <div class="zone-marker-score">${escapeHtml(scoreTxt)}</div>
      </div>`;
      const icon = L.divIcon({ className: "custom-div-icon", html: iconHtml, iconSize: [40, 36], iconAnchor: [20, 34] });
      const marker = L.marker([z.lat, z.lng], { icon });
      layerGroup.addLayer(marker);
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        selectZone(z);
      });

      const name = escapeHtml(z.name);
      const desc = escapeHtml(z.description || "");
      const popupHtml = `
        <div class="map-popup-card">
          <div class="map-popup-title">${name}</div>
          <div class="map-popup-line">Risk: <strong style="color:${hex}">${escapeHtml(z.risk)}</strong> · score <strong>${escapeHtml(scoreTxt)}</strong></div>
          <div class="map-popup-line">Rainfall: ${z.rainfall ?? "—"} mm · Water: ${z.waterLevelM ?? "—"} m</div>
          <div class="map-popup-desc">${desc}</div>
          <div class="map-popup-actions">
            <button type="button" class="popup-safe popup-evacuate">Safe route</button>
            <button type="button" class="popup-details">Details</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: "map-popup-wrap",
        maxWidth: 280,
        closeButton: true,
      });
      marker.on("popupopen", (ev) => {
        const el = ev.popup.getElement();
        if (!el) return;
        el.querySelectorAll(".popup-evacuate").forEach((btn) => {
          btn.onclick = (e2) => {
            try {
              e2.preventDefault();
              requestSafeRoute(z);
            } catch (err) {
              console.warn("[flood-app] Popup safe route (suppressed):", err);
            }
          };
        });
        el.querySelectorAll(".popup-details").forEach((btn) => {
          btn.onclick = (e2) => {
            try {
              e2.preventDefault();
              selectZone(z);
              ev.popup.close();
            } catch (err) {
              console.warn("[flood-app] Popup details (suppressed):", err);
            }
          };
        });
      });
    });

    if (userLocation) {
      addOrUpdateUserMarker(userLocation, false, layerGroup);
    }

    if (routeGeometry && routeGeometry.length > 1) {
      const algo = routeMeta?.algorithm;
      const isEvacuation =
        algo === "evacuation_osrm" ||
        algo === "evacuation_nearest_safe" ||
        algo === "demo_nearest_safe";
      const isSafe = algo === "weighted_grid_astar";
      const isDashFallback = algo === "straight_fallback";
      const isSimplifiedEvac = Boolean(routeMeta?.fallbackSimplified);
      const poly = L.polyline(routeGeometry, {
        color: isEvacuation ? "#22c55e" : isSafe ? "#22d3ee" : isDashFallback ? "#f87171" : "#94a3b8",
        weight: isEvacuation ? 5 : isSafe ? 5 : 4,
        opacity: 0.95,
        ...(isDashFallback ? { dashArray: "8 6" } : {}),
        ...(isEvacuation && isSimplifiedEvac ? { dashArray: "8 10" } : {}),
      });
      layerGroup.addLayer(poly);

      if (isEvacuation && routeMeta?.evacuationStart && routeMeta?.evacuationEnd) {
        const s = routeMeta.evacuationStart;
        const e = routeMeta.evacuationEnd;
        const startIcon = L.divIcon({
          className: "evac-route-icon",
          html: '<div style="width:14px;height:14px;background:#ef4444;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);" title="Evacuation start"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const endIcon = L.divIcon({
          className: "evac-route-icon",
          html: '<div style="width:14px;height:14px;background:#22c55e;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);" title="Safe zone"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        layerGroup.addLayer(L.marker([s.lat, s.lng], { icon: startIcon, zIndexOffset: 600 }));
        layerGroup.addLayer(L.marker([e.lat, e.lng], { icon: endIcon, zIndexOffset: 600 }));
      }
    }
  }, [filteredZones, selected, userLocation, showHeatmap, routeGeometry, routeMeta, selectZone]);

  function addOrUpdateUserMarker(loc, pan = true, layerGroup = null) {
    if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number" || Number.isNaN(loc.lat) || Number.isNaN(loc.lng)) {
      return;
    }
    const map = mapInstance.current;
    const target = layerGroup || featuresLayerRef.current;
    if (!map || !target) return;

    if (userMarkerRef.current) {
      try {
        target.removeLayer(userMarkerRef.current);
      } catch {
        /* ignore */
      }
      userMarkerRef.current = null;
    }
    if (userAccuracyRef.current) {
      try {
        target.removeLayer(userAccuracyRef.current);
      } catch {
        /* ignore */
      }
      userAccuracyRef.current = null;
    }

    const label = loc.simulated ? "Demo location (Delhi)" : "Your location";
    const userIcon = L.divIcon({
      className: "user-marker-icon",
      html: `<div class="user-pulse-demo" title="${escapeHtml(label)}"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const marker = L.marker([loc.lat, loc.lng], { icon: userIcon });
    target.addLayer(marker);
    marker.bindPopup(`<strong>${escapeHtml(label)}</strong><br/>${loc.simulated ? "Simulated for demo" : `Accuracy: ${Math.round(loc.accuracy || 0)} m`}`);

    const accuracyCircle = L.circle([loc.lat, loc.lng], {
      radius: loc.accuracy || 80,
      color: "#22c55e",
      fillOpacity: 0.06,
      weight: 1,
    });
    target.addLayer(accuracyCircle);

    userMarkerRef.current = marker;
    userAccuracyRef.current = accuracyCircle;

    if (pan) {
      map.flyTo([loc.lat, loc.lng], 11, { duration: 0.75 });
      setTimeout(() => marker.openPopup(), 400);
    }
  }

  async function locateMe() {
    if (DEMO_MODE) {
      const loc = { ...DEFAULT_USER_LOCATION };
      setUserLocation(loc);
      addOrUpdateUserMarker(loc, true, featuresLayerRef.current);
      return;
    }
    if (!navigator.geolocation) {
      alert("Geolocation is not available in your browser.");
      return;
    }
    setLocating(true);
    setLastRoutingError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setUserLocation(loc);
        addOrUpdateUserMarker(loc, true, featuresLayerRef.current);
        setLocating(false);
        try {
          await logUserLocation({
            lat: loc.lat,
            lng: loc.lng,
            accuracyM: loc.accuracy,
            sessionId: getOrCreateSessionId(),
          });
        } catch {
          /* optional */
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          alert("Location permission denied. Allow location access in your browser settings.");
        } else {
          alert("Could not determine your location: " + (err.message || err.code));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function clearNavPolyline() {
    setRouteGeometry(null);
    setNavigating(false);
    setRouteMeta(null);
    setLastRoutingError(null);
  }

  /**
   * Evacuation route: start = user location if present, else selected / optional zone.
   * Nearest SAFE zone via planar distance; OSRM driving geometry when available, else bent polyline fallback.
   */
  async function runEvacuationRouting(optionalTargetZone) {
    clearNavPolyline();
    setNavigating(true);
    try {
      let startPoint = null;
      let startZoneKey = null;

      /** Prefer a concrete zone as origin (popup → selected → user), so different danger picks → different nearest SAFE. */
      const zoneForStart = normalizeZone(optionalTargetZone || selected);
      if (zoneForStart && typeof zoneForStart.lat === "number" && typeof zoneForStart.lng === "number") {
        startPoint = { lat: zoneForStart.lat, lng: zoneForStart.lng };
        startZoneKey = zoneForStart.zoneId || zoneForStart.id;
      } else if (userLocation && typeof userLocation.lat === "number" && typeof userLocation.lng === "number") {
        startPoint = { lat: userLocation.lat, lng: userLocation.lng };
      }

      if (!startPoint) {
        alert("Select a zone on the map, or use Locate to set your position.");
        return;
      }

      const all = (zones || []).map(normalizeZone).filter(Boolean);
      let safeZones = all.filter(isSafeZone);
      if (startZoneKey != null) {
        safeZones = safeZones.filter((z) => String(z.zoneId || z.id) !== String(startZoneKey));
      }

      if (!safeZones.length) {
        setLastRoutingError("No safe zones available");
        // eslint-disable-next-line no-console
        console.warn("[evacuation] No SAFE zones available.", { startPoint, startZoneKey });
        return;
      }

      const sortedByDistance = sortSafeZonesByDistance(startPoint, safeZones);
      const nearestSafeZone = sortedByDistance[0];
      const nearestThree = sortedByDistance.slice(0, Math.min(3, sortedByDistance.length));

      // eslint-disable-next-line no-console
      console.log("Start:", startPoint);
      // eslint-disable-next-line no-console
      console.log(
        "All Safe Zones:",
        safeZones.map((z) => ({ name: z.name, lat: z.lat, lng: z.lng }))
      );
      // eslint-disable-next-line no-console
      console.log("Nearest Safe Zone:", nearestSafeZone);
      // eslint-disable-next-line no-console
      console.log(
        "Top 3 nearest safe:",
        nearestThree.map((z) => ({ name: z.name, d: getDistance(startPoint, z) }))
      );

      if (!nearestSafeZone) {
        setLastRoutingError("No safe zones available");
        return;
      }

      const endLat = nearestSafeZone.lat;
      const endLng = nearestSafeZone.lng;
      const distanceKmStraight = haversineKm(
        { lat: startPoint.lat, lng: startPoint.lng },
        { lat: endLat, lng: endLng }
      );

      const baseMeta = {
        destinationName: nearestSafeZone.name,
        evacuationMessage: `Evacuate to nearest safe zone: ${nearestSafeZone.name}. Closest SAFE by distance: ${nearestThree.map((z) => z.name).join(", ")}.`,
        evacuationStart: { lat: startPoint.lat, lng: startPoint.lng },
        evacuationEnd: { lat: endLat, lng: endLng },
      };

      let routeCoords;
      let nextMeta;

      try {
        const osrm = await fetchOsrmDrivingRoute(startPoint.lat, startPoint.lng, endLat, endLng);
        routeCoords = osrm.routeCoords;
        // eslint-disable-next-line no-console
        console.log("Route:", routeCoords);
        // eslint-disable-next-line no-console
        console.log("[evacuation]", { startPoint, nearestSafeZone, osrm: true });
        nextMeta = {
          ...baseMeta,
          algorithm: "evacuation_osrm",
          distanceM: Math.round(osrm.distanceM),
          durationSec: osrm.durationSec,
          warnings: [],
          fallbackSimplified: false,
        };
      } catch (osrmErr) {
        // eslint-disable-next-line no-console
        console.warn("[evacuation] OSRM failed, using simplified path", osrmErr);
        routeCoords = buildEvacuationRouteCoords(startPoint, { lat: endLat, lng: endLng });
        // eslint-disable-next-line no-console
        console.log("Route:", routeCoords);
        // eslint-disable-next-line no-console
        console.log("[evacuation]", { startPoint, nearestSafeZone, osrm: false, fallback: true });
        nextMeta = {
          ...baseMeta,
          algorithm: "evacuation_nearest_safe",
          distanceM: Math.round(distanceKmStraight * 1000),
          durationSec: null,
          warnings: ["Using simplified route"],
          fallbackSimplified: true,
        };
      }

      setRouteGeometry(routeCoords);
      setRouteMeta(nextMeta);

      const map = mapInstance.current;
      if (map && routeCoords.length > 1) {
        map.fitBounds(L.polyline(routeCoords).getBounds(), { padding: [56, 56] });
      }
    } catch (err) {
      setLastRoutingError(err?.message || String(err));
    } finally {
      setNavigating(false);
    }
  }

  async function requestSafeRoute(targetZone) {
    await runEvacuationRouting(targetZone);
  }

  async function navigateOsrm() {
    await runEvacuationRouting(null);
  }

  async function onRecompute() {
    if (DEMO_MODE) return;
    setRecomputing(true);
    try {
      await recomputeRisks();
      await refreshDashboard();
    } catch (e) {
      setApiError(e?.message || String(e));
    } finally {
      setRecomputing(false);
    }
  }

  const selectedId = selected ? selected.zoneId || selected.id : null;
  const riskPct = selected && typeof selected.riskScore === "number" ? Math.round(selected.riskScore * 100) : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-stack">
          <header className="app-header">
            <div className="app-header__top">
              <div className="app-brand">
                <div className="app-brand__icon" aria-hidden>
                  <Waves size={26} strokeWidth={2} />
                </div>
                <div>
                  <h1 className="app-title">Flood Command</h1>
                  <p className="app-sub">
                    {DEMO_MODE
                      ? "Interactive demo — North India scenario (Delhi, Haryana, Punjab)."
                      : "Live risk monitoring, ML classification, and evacuation routing for India."}
                  </p>
                </div>
              </div>
            </div>

            {dashboardLoading && zones.length === 0 && !apiError && (
              <div className="sidebar-loading">
                <RefreshCw className="spin" size={16} aria-hidden />
                Loading dashboard…
              </div>
            )}

            <div className="header-actions">
              <button type="button" className="btn btn--secondary" onClick={guardClick(() => setOverviewOpen(true))}>
                <BookOpen size={16} />
                System overview
              </button>
            </div>

            <div className="controls-grid controls-grid--wide">
              <button
                type="button"
                className="btn btn--icon btn--secondary"
                onClick={guardClickAsync(() => locateMe())}
                title={DEMO_MODE ? "Reset demo location (Delhi)" : "Locate me"}
                disabled={locating}
              >
                {locating ? <RefreshCw className="spin" size={20} /> : <LocateFixed size={20} />}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={guardClickAsync(() => navigateOsrm())}
                disabled={navigating}
              >
                <Navigation size={16} />
                {navigating ? "Routing…" : "Drive route"}
              </button>
              <button type="button" className="btn" onClick={guardClickAsync(() => requestSafeRoute())} disabled={navigating}>
                <Route size={16} />
                {navigating ? "Routing…" : "Safe route"}
              </button>
              <button type="button" className="btn btn--ghost" onClick={guardClick(() => clearNavPolyline())}>
                <Trash2 size={16} />
                Clear
              </button>
            </div>
          </header>

          <ProblemStatement />

          {anyDanger && (
            <div className="alert-panel danger" role="alert">
              <div className="alert-title">
                <ShieldAlert size={18} />
                DANGER advisory
              </div>
              <p className="alert-body">
                One or more zones are in DANGER. Follow official guidance and avoid inundated areas.
              </p>
            </div>
          )}

          {apiError && (
            <div className="alert-panel warn" role="status">
              <div className="alert-title">
                <AlertTriangle size={18} />
                Connection issue
              </div>
              <p className="alert-body">{apiError}</p>
            </div>
          )}

          <section className="card">
            <h2 className="card-title">Map & layers</h2>
            <div className="card-body">
              <label className="row-check">
                <input type="checkbox" checked={showHeatmap} onChange={(e) => setShowHeatmap(e.target.checked)} />
                <Layers size={16} style={{ opacity: 0.85 }} />
                Risk heatmap
              </label>
              <label className="row-check">
                <input type="checkbox" checked={highRiskOnly} onChange={(e) => setHighRiskOnly(e.target.checked)} />
                <AlertTriangle size={16} style={{ opacity: 0.85 }} />
                Show only DANGER zones
              </label>
              {DEMO_MODE ? (
                <button type="button" className="btn" onClick={guardClick(() => simulateFlood())}>
                  <Droplets size={16} />
                  Simulate flood
                </button>
              ) : (
                <button type="button" className="btn" disabled={recomputing} onClick={guardClickAsync(() => onRecompute())}>
                  <RefreshCw size={16} className={recomputing ? "spin" : ""} />
                  {recomputing ? "Recomputing…" : "Recompute risk (ML)"}
                </button>
              )}
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Selected zone</h2>
            <div className="card-body">
              {selected ? (
                <>
                  <div className="selected-name">{selected.name}</div>
                  <div className="selected-desc">{selected.description || "No description."}</div>
                  <div className="meta-row">
                    <span className={riskChipClass(selected.risk)}>{selected.risk}</span>
                    {riskPct != null && (
                      <span style={{ marginLeft: 8 }}>
                        Risk: <strong>{riskPct}%</strong>
                      </span>
                    )}
                  </div>
                  <div className="meta-row">
                    Rainfall: <strong>{selected.rainfall ?? "—"}</strong> mm · Water level:{" "}
                    <strong>{selected.waterLevelM ?? "—"}</strong> m
                  </div>
                  {!DEMO_MODE && (
                    <div className="meta-row">
                      Model: {selected.lastModel || "—"} · Score:{" "}
                      {typeof selected.riskScore === "number" ? selected.riskScore.toFixed(3) : "—"}
                    </div>
                  )}
                  {DEMO_MODE && (
                    <div className="meta-row muted small">
                      Demo data — scores are synthetic. Safe route targets the nearest SAFE zone (e.g. Noida, Chandigarh).
                    </div>
                  )}
                  <div className="action-row">
                    <button type="button" className="btn" onClick={guardClickAsync(() => requestSafeRoute())} disabled={navigating}>
                      <Route size={16} />
                      {navigating ? "Routing…" : "Safe route"}
                    </button>
                    <button type="button" className="btn btn--secondary" onClick={guardClickAsync(() => navigateOsrm())} disabled={navigating}>
                      <Navigation size={16} />
                      {navigating ? "Routing…" : "Drive"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted small" style={{ margin: 0 }}>
                  Click a zone on the map or pick one from the list.
                </p>
              )}
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <ListTree size={14} />
                Monitored zones
              </span>
            </h2>
            <div className="zone-list">
              {filteredZones.length === 0 && !dashboardLoading && (
                <p className="muted small" style={{ margin: "0.25rem 0.5rem" }}>
                  No zones match the current filter.
                </p>
              )}
              {filteredZones.map((z) => {
                const id = z.zoneId || z.id;
                const active = selectedId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`zone-btn${active ? " zone-btn--active" : ""}`}
                    onClick={guardClick(() => selectZone(z))}
                  >
                    <span className="zone-name">{z.name}</span>
                    <span className={riskChipClass(z.risk)}>{z.risk}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <BarChart3 size={14} />
                Analytics
              </span>
            </h2>
            <div className="analytics-block">
              <div className="analytics-label">Risk distribution</div>
              <div className="chart-shell">
                <RiskDistributionChart zones={zones} />
              </div>
            </div>
            <div className="analytics-block">
              <div className="analytics-label">Rainfall by zone (mm)</div>
              <div className="chart-shell">
                <RainfallSparkline zones={zones} selectedZoneId={selectedId} />
              </div>
            </div>
          </section>

          <FutureScope />

          {showLegend && (
            <section className="card">
              <h2 className="card-title">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <MapIcon size={14} />
                  Legend & routing
                </span>
              </h2>
              <div className="legend">
                <div className="legend-item">
                  <span className="legend-dot low" />
                  <span>
                    <span className="legend-label-main">SAFE</span>
                    <span className="legend-label-sub">Lower pressure (#3b82f6)</span>
                  </span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot mod" />
                  <span>
                    <span className="legend-label-main">WARNING</span>
                    <span className="legend-label-sub">Elevated (#facc15)</span>
                  </span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot high" />
                  <span>
                    <span className="legend-label-main">DANGER</span>
                    <span className="legend-label-sub">Critical (#ef4444)</span>
                  </span>
                </div>
              </div>

              {navigating && !routeMeta && (
                <div className="route-note" role="status" aria-live="polite">
                  Calculating route…
                </div>
              )}

              {routeMeta && (
                <div className="route-note">
                  {routeMeta.evacuationMessage != null && (
                    <div className="route-note route-note--warn">{routeMeta.evacuationMessage}</div>
                  )}
                  <strong>Last route:</strong> {routeMeta.algorithm}
                  {routeMeta.distanceM != null ? ` · ${routeMeta.distanceM} m` : ""}
                  {routeMeta.durationSec != null ? ` · ${formatRouteDuration(routeMeta.durationSec)}` : ""}
                  {routeMeta.destinationName != null ? ` → ${routeMeta.destinationName}` : ""}
                  {(routeMeta.warnings || []).map((w) => (
                    <div key={w} className="route-note route-note--warn">
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {lastRoutingError && <div className="route-note route-note--err">Note: {lastRoutingError}</div>}
            </section>
          )}
        </div>
      </aside>

      <main className="main">
        <div className="map-wrap">
          <div ref={mapRef} id="map" />
          {dashboardLoading && (
            <div className="map-loading" aria-busy="true">
              <div className="map-loading__inner">
                <Activity className="spin" size={18} />
                Loading map data…
              </div>
            </div>
          )}
          <div className="map-float-actions">
            <button type="button" className="btn btn--secondary" onClick={guardClick(() => setShowLegend((s) => !s))}>
              {showLegend ? "Hide legend" : "Show legend"}
            </button>
          </div>
        </div>
      </main>

      <SystemOverviewModal open={overviewOpen} onClose={() => setOverviewOpen(false)} />
    </div>
  );
}
