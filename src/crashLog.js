// CANA — local crash / error log.
// ----------------------------------------------------------------------------
// Privacy stance: CANA promises "no telemetry, no server". This module honors
// that. Crash entries are written to *localStorage on the user's device* and
// NEVER transmitted anywhere. The user, and only the user, can export them as
// a JSON file from the Settings screen to share with the developer if they
// choose to. No background upload, no Sentry, no PostHog, no fetch.
//
// What we capture:
//   - React render errors (via ErrorBoundary.componentDidCatch)
//   - window.onerror     (uncaught JS errors)
//   - window.onunhandledrejection (uncaught promise rejections)
//
// We keep a rolling buffer of the last N entries to bound storage. Each entry
// is small (timestamp, message, stack head). No user content is captured.

const LS_KEY = "cana_crash_log_v1";
const MAX_ENTRIES = 25;

function safeGet() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function safeSet(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch (e) {}
}

// Trim a stack trace to a useful size — full stacks can be 5+ KB and bloat
// the buffer fast. The top 12 frames are enough to identify a bug.
function trimStack(stack) {
  if (!stack || typeof stack !== "string") return "";
  return stack.split("\n").slice(0, 12).join("\n");
}

function appVersion() {
  try { return typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0"; } catch (e) { return "0.0.0"; }
}

function platform() {
  try {
    if (typeof window === "undefined") return "unknown";
    if (window.Capacitor && typeof window.Capacitor.getPlatform === "function") {
      const p = window.Capacitor.getPlatform();
      if (p === "ios") return "ios";
    }
    if (window.cana && window.cana.isDesktop) return "desktop";
    return "web";
  } catch (e) { return "unknown"; }
}

// Append a single entry to the rolling buffer.
export function recordCrash({ kind, message, stack, extra }) {
  const entry = {
    ts: new Date().toISOString(),
    kind: String(kind || "error"),
    version: appVersion(),
    platform: platform(),
    message: String(message || "").slice(0, 600),
    stack: trimStack(stack),
    ...(extra && typeof extra === "object" ? { extra: JSON.parse(JSON.stringify(extra)) } : {}),
  };
  const arr = safeGet();
  arr.push(entry);
  // Keep only the last MAX_ENTRIES — drop the oldest if over.
  if (arr.length > MAX_ENTRIES) arr.splice(0, arr.length - MAX_ENTRIES);
  safeSet(arr);
  return entry;
}

export function readCrashLog() { return safeGet(); }

export function clearCrashLog() { safeSet([]); }

// Build a downloadable JSON document and trigger a browser download. The file
// stays on the user's machine. They choose whether to share it.
export function exportCrashLog() {
  const doc = {
    kind: "cana-crash-log",
    exportedAt: new Date().toISOString(),
    appVersion: appVersion(),
    platform: platform(),
    entries: readCrashLog(),
  };
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `cana-diagnostic-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (e) {} }, 100);
  return doc.entries.length;
}

// Install global error listeners. Safe to call multiple times — idempotent.
let _installed = false;
export function installCrashListeners() {
  if (_installed) return;
  _installed = true;
  if (typeof window === "undefined") return;
  window.addEventListener("error", (event) => {
    try {
      recordCrash({
        kind: "window.error",
        message: event && event.message,
        stack: event && event.error && event.error.stack,
        extra: event && event.filename ? { filename: event.filename, lineno: event.lineno, colno: event.colno } : null,
      });
    } catch (e) {}
  });
  window.addEventListener("unhandledrejection", (event) => {
    try {
      const reason = event && event.reason;
      recordCrash({
        kind: "unhandledrejection",
        message: reason && (reason.message || String(reason)),
        stack: reason && reason.stack,
      });
    } catch (e) {}
  });
}
