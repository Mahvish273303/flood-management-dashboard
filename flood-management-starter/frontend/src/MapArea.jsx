// Optional map shell — matches main app tiles & India viewport when used standalone.
import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MAP_CENTER = [22.9734, 78.6569];
const MAP_ZOOM = 5;
const TILE_URL = "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";
const TILE_ATTRIB =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · HOT &copy; OSM France';

export default function MapArea({ zones = [], selected, setSelected }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      preferCanvas: true,
      zoomControl: false,
    });
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIB }).addTo(map);
    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    return () => {
      map.remove();
      mapInstance.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const g = layerGroupRef.current;
    if (!map || !g) return;
    g.clearLayers();

    const riskColor = (risk) => {
      const r = String(risk || "").toLowerCase();
      if (r === "danger" || r === "high") return "#e44444";
      if (r === "warning" || r === "moderate") return "#f5b90b";
      if (r === "safe" || r === "low") return "#1e88e5";
      return "#06b6d4";
    };

    zones.forEach((z) => {
      const risk = String(z.risk || "").toUpperCase();
      const color = riskColor(z.risk);
      const circle = L.circle([z.lat, z.lng], {
        radius: z.radiusM || z.radius || 2000,
        color,
        fillColor: color,
        fillOpacity: 0.2,
        weight: 2,
      });
      g.addLayer(circle);
      circle.on("click", () => setSelected && setSelected(z));

      const iconHtml = `<div class="zone-marker-dot" style="background:${color}"></div>`;
      const icon = L.divIcon({ className: "custom-div-icon", html: iconHtml, iconSize: [18, 18], iconAnchor: [9, 9] });
      const marker = L.marker([z.lat, z.lng], { icon });
      g.addLayer(marker);
      marker.bindPopup(`<strong>${z.name}</strong><br/>Risk: ${risk}`);
    });

    if (selected && selected.lat && selected.lng) {
      map.setView([selected.lat, selected.lng], 12, { animate: true });
    }
  }, [zones, selected, setSelected]);

  return <div ref={mapRef} id="map" style={{ width: "100%", height: "100vh" }} />;
}
