// CANA — local multi-profile "login".
// ----------------------------------------------------------------------------
// HONEST SCOPE: This is on-device profile separation, NOT server-grade
// authentication. There is no server; everything lives in this device's
// localStorage. Passwords are stored only as a salted SHA-256 hash (never
// plaintext), which prevents casual reading, but a determined person with
// access to this machine could bypass it. It keeps couples' data separate by
// convention and gates access with a password — it is not a security vault and
// must not be described as "secure accounts" or guaranteed data protection.

const LS_PROFILES = "covenant_profiles_v1"; // registry of accounts (no plaintext passwords)

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomSalt() {
  const a = new Uint8Array(16);
  (globalThis.crypto || window.crypto).getRandomValues(a);
  return toHex(a.buffer);
}

// Salted SHA-256. Async (Web Crypto). Returns hex string.
export async function hashPassword(password, salt) {
  const enc = new TextEncoder().encode(`${salt}::${password}`);
  const digest = await (globalThis.crypto || window.crypto).subtle.digest("SHA-256", enc);
  return toHex(digest);
}

export function loadProfiles() {
  try {
    const raw = localStorage.getItem(LS_PROFILES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveProfiles(list) {
  try { localStorage.setItem(LS_PROFILES, JSON.stringify(list)); } catch (e) {}
}

// A profile id is derived from the email (lowercased) — stable, and used to
// namespace that profile's data keys.
export function profileId(email) {
  return "p_" + (email || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
}

export function emailExists(email) {
  const id = profileId(email);
  return loadProfiles().some((p) => p.id === id);
}

// Create a profile. Returns { ok, error?, profile? }.
export async function createProfile({ nameA, nameB, email, password }) {
  const e = (email || "").trim().toLowerCase();
  if (!nameA || !nameB) return { ok: false, error: "Please enter both partners' names." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, error: "Please enter a valid email address." };
  if (!password || password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (emailExists(e)) return { ok: false, error: "An account with this email already exists on this device. Try signing in." };
  const salt = randomSalt();
  const hash = await hashPassword(password, salt);
  const profile = { id: profileId(e), nameA: nameA.trim(), nameB: nameB.trim(), email: e, salt, hash, createdAt: new Date().toISOString() };
  const list = loadProfiles();
  list.push(profile);
  saveProfiles(list);
  return { ok: true, profile };
}

// Verify credentials. Returns { ok, error?, profile? }.
export async function signIn({ email, password }) {
  const id = profileId(email);
  const profile = loadProfiles().find((p) => p.id === id);
  if (!profile) return { ok: false, error: "No account found with this email on this device." };
  const hash = await hashPassword(password, profile.salt);
  if (hash !== profile.hash) return { ok: false, error: "Incorrect password." };
  return { ok: true, profile };
}

// List existing profiles for a friendly picker (no secrets exposed).
export function listProfiles() {
  return loadProfiles().map((p) => ({ id: p.id, email: p.email, nameA: p.nameA, nameB: p.nameB }));
}
