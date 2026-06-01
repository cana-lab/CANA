import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

// App version, read from package.json so it is always in sync (single source
// of truth). Exposed to the app as __APP_VERSION__.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));

// `base` differs by target:
//   - Electron desktop app: assets load over file://, so base must be "./" (relative).
//     Set by the Electron build script via BUILD_TARGET=electron.
//   - GitHub Pages project site https://USER.github.io/cana/  → "/cana/"
//   - Running locally with `npm run dev`                       → "/cana/" is fine
const isElectron = process.env.BUILD_TARGET === "electron";

export default defineConfig({
  base: isElectron ? "./" : "/cana/",
  build: { modulePreload: { polyfill: false } },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react()],
});
