// CANA — Electron main process
//
// Creates the application window and loads the production build of the
// React app from the local filesystem. The app talks to a locally-running
// Ollama server exactly as the web version does; nothing else leaves the machine.

const { app, BrowserWindow, shell, Menu, ipcMain } = require("electron");
const path = require("path");
const { execFile } = require("child_process");
const fs = require("fs");

const isDev = !app.isPackaged;

// ── Auto-update (electron-updater + Squirrel.Mac) ──────────────────────────
// electron-updater fetches `latest-mac.yml` (and the .dmg) from this repo's
// GitHub Releases (configured in package.json → build.publish). Squirrel.Mac
// then verifies the downloaded .dmg's code signature against the signature
// of the running app — i.e. only updates produced by the same Developer ID
// will install. That is the integrity check the old fetch-and-prompt flow
// did not have.
let autoUpdater = null;
try {
  ({ autoUpdater } = require("electron-updater"));
  autoUpdater.autoDownload = false;       // ask the user first
  autoUpdater.autoInstallOnAppQuit = true; // but install on next quit once they consented
  autoUpdater.logger = { info: () => {}, warn: () => {}, error: console.error, debug: () => {} };
} catch (e) {
  // In `electron .` dev runs without the dependency installed, fall back gracefully.
  autoUpdater = null;
}

// Forward update lifecycle to whichever renderer is open, so the UI can show
// "downloading…" / "ready to install" without polling.
function broadcastUpdate(payload) {
  for (const w of BrowserWindow.getAllWindows()) {
    try { w.webContents.send("cana:update-status", payload); } catch (e) { /* ignore closed wins */ }
  }
}

function wireAutoUpdater() {
  if (!autoUpdater || isDev) return;
  autoUpdater.on("checking-for-update", () => broadcastUpdate({ state: "checking" }));
  autoUpdater.on("update-available",   (info) => broadcastUpdate({ state: "available", version: info.version, notes: info.releaseNotes || "" }));
  autoUpdater.on("update-not-available", (info) => broadcastUpdate({ state: "uptodate", version: info.version }));
  autoUpdater.on("download-progress",  (p) => broadcastUpdate({ state: "downloading", percent: Math.round(p.percent || 0) }));
  autoUpdater.on("update-downloaded",  (info) => broadcastUpdate({ state: "downloaded", version: info.version }));
  autoUpdater.on("error",              (err) => broadcastUpdate({ state: "error", message: String(err && err.message || err) }));
}

// IPC: renderer can ask "check now", "start the download", "restart and install".
// All three are no-ops in dev / when the updater isn't loaded — the UI's old
// manual-link fallback still works in that case.
ipcMain.handle("cana:update-check",   async () => { if (autoUpdater && !isDev) { try { await autoUpdater.checkForUpdates(); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } } return { ok: false, error: "Updater unavailable in dev." }; });
ipcMain.handle("cana:update-download", async () => { if (autoUpdater && !isDev) { try { await autoUpdater.downloadUpdate(); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } } return { ok: false }; });
ipcMain.handle("cana:update-install",  async () => { if (autoUpdater && !isDev) { setImmediate(() => autoUpdater.quitAndInstall()); return { ok: true }; } return { ok: false }; });

// ── First-launch setup IPC ────────────────────────────────────────────────
// whichBinary: report whether "node" or "ollama" is present. We check the
// PATH via `command -v` and also a few well-known install locations, because
// a GUI-launched app on macOS often has a minimal PATH that misses Homebrew
// and the Ollama.app binary. This only REPORTS presence; it never installs.
ipcMain.handle("cana:which", async (_e, name) => {
  const safe = name === "node" ? "node" : name === "ollama" ? "ollama" : null;
  if (!safe) return { found: false };
  const knownPaths = {
    node: ["/usr/local/bin/node", "/opt/homebrew/bin/node", "/usr/bin/node"],
    ollama: ["/usr/local/bin/ollama", "/opt/homebrew/bin/ollama", "/Applications/Ollama.app/Contents/Resources/ollama"],
  }[safe];
  for (const p of knownPaths) {
    try { if (fs.existsSync(p)) return { found: true, path: p }; } catch (e) {}
  }
  // Fall back to a login shell so the user's real PATH is consulted.
  return await new Promise((resolve) => {
    execFile("/bin/bash", ["-lc", `command -v ${safe}`], { timeout: 4000 }, (err, stdout) => {
      const out = (stdout || "").trim();
      resolve(out ? { found: true, path: out } : { found: false });
    });
  });
});

ipcMain.handle("cana:open-external", async (_e, url) => {
  if (typeof url !== "string") return false;
  // Web links and mailto: (e.g. the report's "Email report" button) are allowed.
  if (/^(https?|mailto):/.test(url)) {
    await shell.openExternal(url);
    return true;
  }
  // file: is allowed ONLY for the bundled update guide page (opened in the
  // default browser so it survives the app being replaced). Any other local
  // file path is rejected, so this IPC channel can't be abused to open
  // arbitrary files or applications on the user's machine.
  if (/^file:/.test(url)) {
    try {
      const u = new URL(url);
      const p = decodeURIComponent(u.pathname);
      if (/\/update-guide\.html$/.test(p)) {
        await shell.openExternal(url);
        return true;
      }
    } catch (e) { /* fall through to reject */ }
    return false;
  }
  return false;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 860,
    minWidth: 720,
    minHeight: 600,
    title: "CANA — Covenant Life",
    backgroundColor: "#f5f5f7",
    // Use the standard macOS title bar. The app no longer draws its own
    // chrome strip, so the real traffic-light buttons and full-screen behave
    // natively without overlapping the app's content.
    titleBarStyle: "default",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // Chromium sandbox stays ON. The renderer talks to localhost:11434
      // (Ollama) via the regular network stack, which is unaffected by the
      // sandbox — the sandbox restricts filesystem/native API access, not
      // outgoing HTTP. The preload uses only the `electron` module (allowed
      // in sandboxed preloads); no Node built-ins are imported in the renderer.
      sandbox: true,
    },
    show: false,
  });

  // Show only once the content is painted — avoids a white flash on launch.
  win.once("ready-to-show", () => win.show());

  if (isDev && process.env.CANA_DEV_URL) {
    // Optional: load the Vite dev server when iterating on the UI.
    win.loadURL(process.env.CANA_DEV_URL);
  } else {
    // Load the production build copied in next to this file at package time.
    win.loadFile(path.join(__dirname, "renderer", "index.html"));
  }

  // Any external link (e.g. nodejs.org, ollama.com, the docs) opens in the
  // user's real browser instead of inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    const isLocal = url.startsWith("file://") || url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1");
    if (!isLocal) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
}

// A minimal, native macOS menu (so standard shortcuts like Cmd+Q, Cmd+C,
// Cmd+V, and the Quit item all behave as expected).
function buildMenu() {
  const template = [
    {
      label: "CANA",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" }, { role: "redo" }, { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" }, { role: "togglefullscreen" },
        ...(isDev ? [{ role: "toggleDevTools" }] : []),
      ],
    },
    { label: "Window", submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "close" }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  wireAutoUpdater();
  // A single silent check on launch. The renderer shows a banner when
  // something is available; we never download or install without consent.
  if (autoUpdater && !isDev) {
    setTimeout(() => { try { autoUpdater.checkForUpdates(); } catch (e) {} }, 5000);
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Standard macOS behaviour: the app keeps running when all windows close,
// until the user quits with Cmd+Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
