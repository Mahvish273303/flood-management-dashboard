import React from "react";
import { createRoot } from "react-dom/client";
import { installGlobalHandlers } from "./installGlobalHandlers.js";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

installGlobalHandlers();

const el = document.getElementById("root");
if (el) {
  createRoot(el).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}