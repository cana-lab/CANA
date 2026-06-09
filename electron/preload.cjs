// CANA — Electron preload
//
// Exposes a deliberately tiny, safe API to the renderer for first-launch setup.
// Nothing here can install software silently; it can only (a) report whether a
// known binary exists on disk, and (b) open an external page in the real
// browser. The actual installs are performed by the user, as macOS requires.
// contextIsolation stays ON; nodeIntegration stays OFF.

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cana", {
  // True if running inside the packaged desktop app (vs. a plain browser).
  isDesktop: true,
  // Ask the main process whether a binary is present on the system PATH.
  // name is one of "node" | "ollama". Returns { found: boolean, path?: string }.
  whichBinary: (name) => ipcRenderer.invoke("cana:which", name),
  // Open a URL in the user's default browser (for download pages).
  openExternal: (url) => ipcRenderer.invoke("cana:open-external", url),
  // Auto-update (electron-updater). All three are best-effort; they resolve
  // to { ok: false } in dev or when the updater isn't initialized.
  updater: {
    check:    () => ipcRenderer.invoke("cana:update-check"),
    download: () => ipcRenderer.invoke("cana:update-download"),
    install:  () => ipcRenderer.invoke("cana:update-install"),
    // Subscribe to lifecycle events. Returns an unsubscribe function.
    onStatus: (cb) => {
      const handler = (_e, payload) => { try { cb(payload); } catch (e) {} };
      ipcRenderer.on("cana:update-status", handler);
      return () => ipcRenderer.removeListener("cana:update-status", handler);
    },
  },
});
