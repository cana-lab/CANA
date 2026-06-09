import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

// App version, read from package.json so it is always in sync (single source
// of truth). Exposed to the app as __APP_VERSION__.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));

// `base` differs by target:
//   - Electron desktop app: assets load over file://, so base must be "./" (relative).
//     Set by the Electron build script via BUILD_TARGET=electron.
//   - iOS (Capacitor): assets load from the local app bundle, so base must be "./"
//     too. Set via BUILD_TARGET=ios. Output goes to dist/ which Capacitor copies.
//   - GitHub Pages project site https://cana-lab.github.io/CANA/  → "/CANA/"
//   - Running locally with `npm run dev`                       → "/CANA/" is fine
const isElectron = process.env.BUILD_TARGET === "electron";
const isIOS = process.env.BUILD_TARGET === "ios";
const relativeBase = isElectron || isIOS;

export default defineConfig({
  base: relativeBase ? "./" : "/CANA/",
  build: {
    modulePreload: { polyfill: false },
    // Separate output folders per platform so Mac and iOS packages never share
    // or overwrite each other's build artifacts:
    //   - default / web / electron → dist/
    //   - iOS (Capacitor)          → dist-ios/  (Capacitor reads this; see capacitor.config.json)
    outDir: isIOS ? "dist-ios" : "dist",
  },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react()],
});
