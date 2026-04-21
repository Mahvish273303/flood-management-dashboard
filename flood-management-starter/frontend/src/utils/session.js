export function getOrCreateSessionId() {
  const k = "flood_session_id";
  let v = localStorage.getItem(k);
  if (!v) {
    v = (globalThis.crypto && globalThis.crypto.randomUUID && globalThis.crypto.randomUUID()) || String(Date.now());
    localStorage.setItem(k, v);
  }
  return v;
}
