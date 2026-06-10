import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, rmSync } from "fs";
import { join } from "path";

// App version, read from package.json so it is always in sync (single source
// of truth). Exposed to the app as __APP_VERSION__.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));

// `base` differs by target:
//   - Electron desktop app: assets load over file://, so base must be "./" (relative).
//     Set by the Electron build script via BUILD_TARGET=electron.
//   - iOS (Capacitor): assets load from the local app bundle, so base must be "./"
//     too. Set via BUILD_TARGET=ios. Output goes to dist-ios/ (see capacitor.config.json).
//   - GitHub Pages project site https://cana-lab.github.io/CANA/  → "/CANA/"
//   - Running locally with `npm run dev`                       → "/CANA/" is fine
const isElectron = process.env.BUILD_TARGET === "electron";
const isIOS = process.env.BUILD_TARGET === "ios";
const relativeBase = isElectron || isIOS;

// Per-target bundle adjustments:
//  - iOS gets a STRICTER CSP: connect-src 'self' only. On iOS the AI runs
//    through Apple's native Foundation Model plugin (not HTTP) and updates
//    come from the App Store, so the WebView never needs localhost:11434 or
//    api.github.com. Shipping the desktop allowlist there would be a wider
//    surface than the platform uses. docs/PRIVACY.md documents this split.
//  - iOS and Electron bundles drop the GitHub-Pages-only help pages
//    (guide.html, update-guide.html — "download the .dmg" instructions that
//    make no sense inside a packaged app, and guide.html loads Google Fonts,
//    which only the public website should do).
function canaPerTargetPlugin() {
  return {
    name: "cana-per-target",
    transformIndexHtml(html) {
      if (!isIOS) return html;
      return html.replace(
        /connect-src[^;]*;/,
        "connect-src 'self';"
      );
    },
    closeBundle() {
      if (!(isIOS || isElectron)) return;
      const outDir = isIOS ? "dist-ios" : "dist";
      for (const f of ["guide.html", "update-guide.html"]) {
        try { rmSync(join(outDir, f), { force: true }); } catch (e) { /* best-effort */ }
      }
    },
  };
}

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
  plugins: [react(), canaPerTargetPlugin()],
});
