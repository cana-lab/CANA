// CANA — unified opt-in credential store ("Remember password").
// -----------------------------------------------------------------------------
// One JS surface over two native backends:
//   - Packaged Mac app: Electron safeStorage via the preload bridge
//     (window.cana.credentials) — encryption key lives in the macOS Keychain.
//   - Native iOS app: the Credentials Capacitor plugin
//     (ios-plugin/CredentialsPlugin.swift) — items live in the iOS Keychain,
//     device-only (WhenUnlockedThisDeviceOnly).
// On the plain web build neither backend exists and credAvailable() resolves
// false, so the UI never shows the option there.
//
// All functions are best-effort: failures resolve to "not available" / not-ok
// rather than throwing, because remembering a password is a convenience that
// must never block signing in.

import { Credentials as NativeCredentials, isNativeIOS } from "./nativePlugins.js";

function macBridge() {
  try {
    const c = typeof window !== "undefined" && window.cana && window.cana.credentials;
    return c && typeof c.get === "function" ? c : null;
  } catch (e) { return null; }
}

function iosPlugin() {
  // registerPlugin-backed proxy (Capacitor 3+ stopped exposing custom
  // plugins under Capacitor.Plugins — looking them up there yields
  // undefined and silently killed the iOS Keychain path).
  return isNativeIOS() ? NativeCredentials : null;
}

export async function credAvailable() {
  const mac = macBridge();
  if (mac) { try { return !!(await mac.available()); } catch (e) { return false; } }
  const ios = iosPlugin();
  if (ios) { try { const r = await ios.available(); return !!(r && r.available); } catch (e) { return false; } }
  return false;
}

export async function credSave(email, password) {
  const mac = macBridge();
  if (mac) { try { return await mac.save(email, password); } catch (e) { return { ok: false }; } }
  const ios = iosPlugin();
  if (ios) { try { return await ios.save({ email, password }); } catch (e) { return { ok: false }; } }
  return { ok: false };
}

export async function credGet(email) {
  const mac = macBridge();
  if (mac) { try { return await mac.get(email); } catch (e) { return { ok: false }; } }
  const ios = iosPlugin();
  if (ios) { try { return await ios.get({ email }); } catch (e) { return { ok: false }; } }
  return { ok: false };
}

export async function credRemove(email) {
  const mac = macBridge();
  if (mac) { try { return await mac.remove(email); } catch (e) { return { ok: false }; } }
  const ios = iosPlugin();
  if (ios) { try { return await ios.remove({ email }); } catch (e) { return { ok: false }; } }
  return { ok: false };
}
