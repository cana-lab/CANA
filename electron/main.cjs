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
  if (typeof url === "string" && /^https?:\/\//.test(url)) {
    await shell.openExternal(url);
    return true;
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
    // The app draws its own macOS-style title bar (traffic lights + title),
    // so we hide the native bar but keep the real traffic-light buttons,
    // inset to line up with the app's chrome.
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 17 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow the renderer to reach the local Ollama server (localhost).
      // No other network access is needed by the app.
      sandbox: false,
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
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Standard macOS behaviour: the app keeps running when all windows close,
// until the user quits with Cmd+Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
