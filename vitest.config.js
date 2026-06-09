import { defineConfig } from "vitest/config";

// CANA — Vitest configuration.
// jsdom is used so localStorage and WebCrypto (via Node's built-in subtle)
// behave the way they do in a real browser tab. The pure modules under test
// (engine, auth, transfer) don't need React/Vite, so we don't import the
// React plugin here.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
    setupFiles: ["src/test-setup.js"],
    globals: false,
    reporters: ["default"],
  },
});
