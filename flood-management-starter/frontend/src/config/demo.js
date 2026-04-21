/**
 * Interactive demo mode: local dummy data (Delhi / Punjab / Haryana), no backend required.
 * Set to false to use the API at API_BASE (see src/config.js).
 */
export const DEMO_MODE =
  typeof process !== "undefined" && process.env.USE_DEMO_SERVER === "true" ? false : true;

/** Simulated user position — Delhi centre */
export const DEFAULT_USER_LOCATION = {
  lat: 28.61,
  lng: 77.2,
  accuracy: 150,
  simulated: true,
};
