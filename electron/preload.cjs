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
});
