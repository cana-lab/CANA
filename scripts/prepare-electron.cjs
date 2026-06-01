// CANA — copy the Vite production build into electron/renderer/
// so electron-builder bundles it and the app can load it via file://.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const dest = path.join(root, "electron", "renderer");

if (!fs.existsSync(dist)) {
  console.error("No dist/ folder found. Run `npm run build:electron` first.");
  process.exit(1);
}

// Clear any previous renderer copy.
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

// Recursive copy (Node 16.7+ has fs.cpSync).
fs.cpSync(dist, dest, { recursive: true });

// Sanity check: index.html must exist and reference assets relatively.
const indexPath = path.join(dest, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("Copied build is missing index.html.");
  process.exit(1);
}
const html = fs.readFileSync(indexPath, "utf8");
if (html.includes('src="/cana/') || html.includes('href="/cana/')) {
  console.error(
    "Build still has absolute /cana/ asset paths — it was not built with BUILD_TARGET=electron.\n" +
    "Run `npm run build:electron` (not the plain web build) before packaging."
  );
  process.exit(1);
}

console.log("✓ Renderer copied to electron/renderer/ (relative asset paths verified).");
