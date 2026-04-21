import { Zone } from "./models/Zone.js";

const DEFAULT_ZONES = [
  {
    zoneId: "z-a",
    name: "Zone A",
    lat: 26.8,
    lng: 83.4,
    radiusM: 2200,
    description: "River overflow likely",
    elevationM: 45,
    distanceToRiverKm: 0.4,
    soilType: "clay",
    risk: "WARNING",
  },
  {
    zoneId: "z-b",
    name: "Zone B",
    lat: 26.4,
    lng: 82.9,
    radiusM: 2000,
    description: "Low-lying agricultural belt",
    elevationM: 95,
    distanceToRiverKm: 1.8,
    soilType: "loam",
    risk: "WARNING",
  },
  {
    zoneId: "z-c",
    name: "Zone C",
    lat: 26.2,
    lng: 82.2,
    radiusM: 2000,
    description: "Higher ground",
    elevationM: 165,
    distanceToRiverKm: 4.5,
    soilType: "sand",
    risk: "SAFE",
  },
];

export async function seedZonesIfEmpty() {
  const count = await Zone.countDocuments();
  if (count > 0) return;
  await Zone.insertMany(DEFAULT_ZONES);
}
