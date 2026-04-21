/**
 * Hardens the app against noisy browser extensions (e.g. MetaMask injecting `window.ethereum`)
 * and reduces the chance their failed promises trigger the Parcel dev error overlay.
 */
const EXTENSION_NOISE =
  /metamask|ethereum|web3|walletconnect|coinbase wallet|failed to connect|extension context|inpage\.js|chrome-extension:/i;

function reasonToText(reason) {
  if (reason == null) return "";
  if (typeof reason === "string") return reason;
  if (typeof reason === "object" && reason !== null && "message" in reason) return String(reason.message);
  return String(reason);
}

function isLikelyExtensionNoise(text) {
  return EXTENSION_NOISE.test(String(text || ""));
}

export function installGlobalHandlers() {
  if (typeof window === "undefined") return;

  if (window.ethereum) {
    if (typeof console !== "undefined" && console.debug) {
      console.debug("[flood-app] Ethereum provider detected on window — app does not use it (ignored).");
    }
  }

  window.onerror = function (message, source, lineno, colno, error) {
    const msg = String(message || "");
    const fromErr = error && String(error.message || "");
    if (isLikelyExtensionNoise(msg) || isLikelyExtensionNoise(fromErr) || isLikelyExtensionNoise(String(source || ""))) {
      console.warn("[flood-app] Suppressed global error (likely browser extension):", msg);
      return true;
    }
    console.warn("[flood-app] Global error:", msg, source, lineno, colno);
    return true;
  };

  // Capture phase so extension-shaped rejections are handled before dev tooling
  window.addEventListener(
    "unhandledrejection",
    (event) => {
      const text = reasonToText(event.reason);
      if (isLikelyExtensionNoise(text)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn("[flood-app] Suppressed unhandled rejection (extension):", text);
        return;
      }
      console.warn("[flood-app] Unhandled rejection:", text);
    },
    true
  );

  window.addEventListener(
    "error",
    (event) => {
      const msg = String(event.message || "");
      const fn = String(event.filename || "");
      if (isLikelyExtensionNoise(msg) || isLikelyExtensionNoise(fn)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}
