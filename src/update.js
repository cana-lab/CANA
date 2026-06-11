// CANA — update checking
// ----------------------------------------------------------------------------
// Two code paths in one module:
//
//  - Electron (`window.cana.updater` present): we delegate to the native
//    electron-updater bridge wired up in main.cjs. Squirrel.Mac verifies the
//    downloaded .dmg's code signature against the running app's signature
//    before installing — i.e. only updates signed with the same Developer ID
//    can replace the current binary. This is the integrity check we did not
//    have with the old "open the GitHub page" flow.
//
//  - Web build (GitHub Pages demo, where no real install is possible): we
//    fetch /releases/latest and offer the manual download link.
export const GITHUB_REPO = "cana-lab/CANA"; // your GitHub owner/repo

// Optional hosted location of the update guide page (the web build deployed to
// GitHub Pages). When set, the desktop app opens THIS https URL in the browser
// — more reliable than a local file:// page for triggering the download. Leave
// as the Pages default; it only matters for the packaged desktop app.
export const GUIDE_BASE = "https://cana-lab.github.io/CANA/update-guide.html";

// The version baked in at build time (from package.json, via vite.config.js).
export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";

// Compare two semver-ish strings ("4.4.0" vs "4.3.0"). Returns 1, 0, or -1.
export function compareVersions(a, b) {
  const pa = String(a).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

// True if the electron-updater bridge is available (packaged Electron app).
export function hasNativeUpdater() {
  try {
    return typeof window !== "undefined" && window.cana && window.cana.updater &&
      typeof window.cana.updater.check === "function";
  } catch (e) { return false; }
}

// Trigger a native check. The actual state comes back asynchronously via
// `subscribeUpdateStatus`. Returns { ok: true } on success, { ok: false, error }
// otherwise (e.g. running in dev or unsigned).
export async function nativeCheck()    { return hasNativeUpdater() ? window.cana.updater.check()    : { ok: false }; }
export async function nativeDownload() { return hasNativeUpdater() ? window.cana.updater.download() : { ok: false }; }
export async function nativeInstall()  { return hasNativeUpdater() ? window.cana.updater.install()  : { ok: false }; }

// Subscribe to update lifecycle events. Returns an unsubscribe function (or
// a no-op if the bridge is absent). Payload states:
//   "checking" | "available" {version, notes}
//   "uptodate" {version}
//   "downloading" {percent}
//   "downloaded" {version}
//   "error" {message}
export function subscribeUpdateStatus(cb) {
  if (!hasNativeUpdater() || typeof window.cana.updater.onStatus !== "function") return () => {};
  return window.cana.updater.onStatus(cb);
}

// Web-only fallback: check GitHub for the latest release. Returns one of:
//   { state: "uptodate", current }
//   { state: "update", current, latest, url, dmgUrl, dmgName, notes }
//   { state: "unconfigured" }                      (repo not set yet)
//   { state: "error", message }                    (offline, rate-limited…)
export async function checkForUpdate() {
  if (!GITHUB_REPO || GITHUB_REPO.startsWith("REPLACE_WITH")) {
    return { state: "unconfigured" };
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) {
      if (res.status === 404) return { state: "error", message: "No published releases found yet." };
      return { state: "error", message: `GitHub returned ${res.status}.` };
    }
    const data = await res.json();
    const latest = (data.tag_name || data.name || "").replace(/^v/, "");
    if (!latest) return { state: "error", message: "Could not read the latest version." };
    const cmp = compareVersions(latest, APP_VERSION);
    if (cmp > 0) {
      // Releases ship one .dmg per architecture. Pick BOTH so the guide page
      // can offer the right one — `find()` alone would hand Intel users the
      // arm64 build (whichever was uploaded first).
      const assets = Array.isArray(data.assets) ? data.assets : [];
      const dmgs = assets.filter((a) => /\.dmg$/i.test(a.name || ""));
      const arm = dmgs.find((a) => /arm64/i.test(a.name));
      const x64 = dmgs.find((a) => !/arm64/i.test(a.name));
      const first = arm || x64 || null; // legacy single-link fallback
      return {
        state: "update",
        current: APP_VERSION,
        latest,
        url: data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
        dmgArm64Url: arm ? arm.browser_download_url : null,
        dmgX64Url: x64 ? x64.browser_download_url : null,
        dmgUrl: first ? first.browser_download_url : null,
        dmgName: first ? first.name : null,
        notes: data.body || "",
      };
    }
    return { state: "uptodate", current: APP_VERSION };
  } catch (e) {
    return { state: "error", message: "Couldn't reach GitHub (are you online?)." };
  }
}
