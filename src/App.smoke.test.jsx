// Render smoke test — mounts the REAL App in jsdom.
// This exists because this repo has twice shipped a render-time crash that
// type-checks fine ("Cannot access 'isIOS' before initialization", CHANGELOG
// 4.37.0). A plain mount catches that whole class of bug — module-level
// evaluation order, hooks order, first-paint effects — on every CI run.

import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

beforeEach(() => {
  globalThis.localStorage.clear();
  // jsdom doesn't implement scrolling; the app calls it on navigation.
  window.scrollTo = () => {};
});

describe("App render smoke", () => {
  it("mounts to the login screen with zero render errors", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const errors = [];
    const origError = console.error;
    console.error = (...a) => { errors.push(a.map(String).join(" ")); };

    try {
      const root = createRoot(container);
      await act(async () => {
        root.render(
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        );
      });

      // Fresh device, no profiles → the app must land on the sign-in screen,
      // not the error boundary.
      expect(container.textContent).not.toContain("Something went wrong");
      expect(container.textContent.length).toBeGreaterThan(50);

      // No React render errors were logged (boundary crashes log via console.error).
      const fatal = errors.filter((e) => /CANA render error|Error: Uncaught/.test(e));
      expect(fatal).toEqual([]);

      await act(async () => { root.unmount(); });
    } finally {
      console.error = origError;
      container.remove();
    }
  });
});
