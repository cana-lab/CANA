// CANA — JS registration of the app's custom native Capacitor plugins.
// -----------------------------------------------------------------------------
// Since Capacitor 3, custom native plugins (CAP_PLUGIN macro on iOS) are NOT
// auto-exposed under window.Capacitor.Plugins — they must be registered from
// JS with registerPlugin(). Looking them up via Capacitor.Plugins.X silently
// yields undefined, which made ShareFile/Credentials/FoundationAI dead on
// device while every guard fell back without an error.
//
// registerPlugin() is safe to call on every platform at module load: it
// returns a proxy whose methods reject with "not implemented" where no native
// implementation exists. All call sites additionally gate on
// Capacitor.getPlatform() === "ios" before invoking anything.

import { registerPlugin } from "@capacitor/core";

export const ShareFile = registerPlugin("ShareFile");
export const Credentials = registerPlugin("Credentials");
export const FoundationAI = registerPlugin("FoundationAI");

// True only inside the native iOS app.
export function isNativeIOS() {
  try {
    const cap = typeof window !== "undefined" && window.Capacitor;
    return !!(cap && typeof cap.getPlatform === "function" && cap.getPlatform() === "ios");
  } catch (e) {
    return false;
  }
}
