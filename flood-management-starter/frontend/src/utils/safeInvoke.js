/**
 * Wraps click handlers so synchronous throws never escape to React / dev overlay.
 */
export function guardClick(fn) {
  return function guardedClick(event) {
    try {
      return fn(event);
    } catch (err) {
      console.warn("[flood-app] Click handler error (suppressed):", err);
    }
  };
}

/** For async handlers: rejections are caught so they never become unhandled. */
export function guardClickAsync(fn) {
  return function guardedAsyncClick(event) {
    try {
      return Promise.resolve(fn(event)).catch((err) => {
        console.warn("[flood-app] Async click error (suppressed):", err);
      });
    } catch (err) {
      console.warn("[flood-app] Async click sync error (suppressed):", err);
    }
  };
}
