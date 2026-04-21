import axios from "axios";
import { API_BASE } from "../config.js";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 20_000,
});

export async function fetchDashboard() {
  const { data } = await api.get("/dashboard");
  return data;
}

export async function fetchZones() {
  const { data } = await api.get("/zones");
  return data.zones;
}

export async function recomputeRisks() {
  const { data } = await api.post("/zones/recompute");
  return data;
}

export async function postSafeRoute(body) {
  const { data } = await api.post("/safe-route", body);
  return data;
}

export async function logUserLocation(body) {
  await api.post("/user-location", body);
}

export async function fetchSystemInfo() {
  const { data } = await api.get("/system");
  return data;
}
