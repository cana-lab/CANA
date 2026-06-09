// CANA — JavaScript wrapper around the native Apple Foundation Model plugin.
// -----------------------------------------------------------------------------
// On iOS (Capacitor), this talks to the on-device Apple Foundation Model via the
// native Swift plugin (ios-plugin/FoundationAIPlugin.swift). On every other
// platform (web, Electron desktop) the plugin isn't present, so isAppleAIAvailable()
// returns false and the app uses Ollama (desktop) or the deterministic text.
//
// This module deliberately mirrors the shape used by llm.js so the orchestration
// code can treat "Apple model" and "Ollama" as interchangeable AI backends, both
// of which sit ON TOP of the deterministic foundation (they only re-express it).
//
// IMPORTANT: like all AI here, output is treated as optional polish. Every caller
// must fall back to the deterministic text if this returns null.

let _plugin = null;
let _checked = false;
let _available = false;

// Lazily resolve the Capacitor plugin. Safe to call on any platform: if Capacitor
// or the plugin isn't present (web/desktop), we just return null.
function getPlugin() {
  if (_plugin) return _plugin;
  try {
    const cap = window.Capacitor;
    if (!cap || !cap.Plugins || !cap.Plugins.FoundationAI) return null;
    // Only use it on a native iOS platform.
    if (typeof cap.getPlatform === "function" && cap.getPlatform() !== "ios") return null;
    _plugin = cap.Plugins.FoundationAI;
    return _plugin;
  } catch (e) {
    return null;
  }
}

// True only on iOS where the on-device model is actually ready (iOS 26+, Apple
// Intelligence enabled, supported device). Cached after first check.
export async function isAppleAIAvailable() {
  if (_checked) return _available;
  _checked = true;
  const p = getPlugin();
  if (!p) { _available = false; return false; }
  try {
    const res = await p.isAvailable();
    _available = !!(res && res.available);
    return _available;
  } catch (e) {
    _available = false;
    return false;
  }
}

// Run a single generation. Returns the raw string, or null on any failure.
// `system` is the system/instructions prompt; `prompt` the user content.
export async function appleGenerate(prompt, system) {
  const p = getPlugin();
  if (!p) return null;
  try {
    const res = await p.generate({ prompt: String(prompt || ""), system: String(system || "") });
    return res && typeof res.text === "string" ? res.text : null;
  } catch (e) {
    return null;
  }
}

// Run a generation that expects a JSON object back. Mirrors llm.js's defensive
// JSON parsing: strips code fences and extracts the first {...} block, so a
// chatty model response still parses. Returns the parsed object or null.
export async function appleGenerateJSON(prompt, system) {
  const raw = await appleGenerate(prompt, (system || "") + " Respond ONLY with valid JSON, no preamble, no code fences.");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    try {
      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start >= 0 && end > start) {
        return JSON.parse(cleaned.slice(start, end + 1));
      }
    } catch (e2) { /* fall through */ }
    return null;
  }
}
