import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { installCrashListeners } from "./crashLog.js";

// Catch window.onerror / unhandledrejection into a local-only buffer, alongside
// the React-render errors that ErrorBoundary catches. Nothing is uploaded.
installCrashListeners();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
