/**
 * Optional Firebase Cloud Messaging (FCM) hook-up.
 * 1) Create a Firebase web app, enable Cloud Messaging, download config.
 * 2) npm install firebase
 * 3) Set window.__FIREBASE_CONFIG__ before app load, or import config here.
 * 4) Call initializeFirebaseMessaging() once after user gesture.
 */
export async function initializeFirebaseMessaging() {
  if (typeof window === "undefined") return { ok: false, reason: "no-window" };
  const cfg = window.__FIREBASE_CONFIG__;
  if (!cfg) return { ok: false, reason: "missing window.__FIREBASE_CONFIG__" };
  try {
    const { initializeApp } = await import("firebase/app");
    const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) return { ok: false, reason: "messaging-not-supported" };
    const app = initializeApp(cfg);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: cfg.vapidKey });
    return { ok: true, token };
  } catch (e) {
    return { ok: false, reason: e?.message || String(e) };
  }
}
