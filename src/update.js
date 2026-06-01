// CANA — update checking
// ----------------------------------------------------------------------------
// Checks GitHub Releases for a newer version. No auto-install (that would
// require Apple code-signing); this only DETECTS and links to the download.
//
//  >>> EDIT THIS ONE LINE once your GitHub repo exists: <<<
//      Set it to "owner/repo", e.g. "dasachs/cana".
export const GITHUB_REPO = "Cana-lab/CANA"; // e.g. "dasachs/cana"

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

// Check GitHub for the latest release. Returns one of:
//   { state: "uptodate", current }
//   { state: "update", current, latest, url }
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
      return { state: "update", current: APP_VERSION, latest, url: data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest` };
    }
    return { state: "uptodate", current: APP_VERSION };
  } catch (e) {
    return { state: "error", message: "Couldn't reach GitHub (are you online?)." };
  }
}
