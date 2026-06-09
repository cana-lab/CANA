// CANA — local multi-profile "login".
// ----------------------------------------------------------------------------
// HONEST SCOPE: This is on-device profile separation, NOT server-grade
// authentication. There is no server; everything lives in this device's
// localStorage. Passwords are stored only as a salted PBKDF2 hash (never
// plaintext). PBKDF2 is a slow, brute-force-resistant key-derivation function,
// so even if someone reads the stored hash, guessing a password is expensive.
// It still cannot protect the DATA itself (which is readable by anyone with
// access to this machine) — it is a soft lock on the UI and a safeguard against
// password reuse being cracked, not a security vault.

const LS_PROFILES = "covenant_profiles_v1"; // registry of accounts (no plaintext passwords)
const PBKDF2_ITERATIONS = 210000;           // OWASP-aligned for PBKDF2-HMAC-SHA256
const PBKDF2_HASH = "SHA-256";

function toHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getCrypto() { return globalThis.crypto || window.crypto; }

function randomSalt() {
  const a = new Uint8Array(16);
  getCrypto().getRandomValues(a);
  return toHex(a.buffer);
}

// Legacy salted SHA-256 (used only to verify pre-existing profiles so they can
// be transparently upgraded to PBKDF2 on next sign-in). Returns hex string.
export async function hashPasswordLegacy(password, salt) {
  const enc = new TextEncoder().encode(`${salt}::${password}`);
  const digest = await getCrypto().subtle.digest("SHA-256", enc);
  return toHex(digest);
}

// Current: salted PBKDF2-HMAC-SHA256. Async (Web Crypto). Returns hex string.
export async function hashPassword(password, salt) {
  const c = getCrypto();
  const keyMaterial = await c.subtle.importKey(
    "raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const bits = await c.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    keyMaterial, 256
  );
  return toHex(bits);
}

// Constant-time-ish hex string comparison (avoids leaking match position via
// early-exit timing). Both are fixed-length hashes, so length is not secret.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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
  const profile = { id: profileId(e), nameA: nameA.trim(), nameB: nameB.trim(), email: e, salt, hash, algo: "pbkdf2", createdAt: new Date().toISOString() };
  const list = loadProfiles();
  list.push(profile);
  saveProfiles(list);
  return { ok: true, profile };
}

// Verify credentials. Returns { ok, error?, profile? }.
// Transparently upgrades legacy SHA-256 profiles to PBKDF2 on successful login,
// so existing users are never locked out and need take no action.
export async function signIn({ email, password }) {
  const id = profileId(email);
  const list = loadProfiles();
  const profile = list.find((p) => p.id === id);
  if (!profile) return { ok: false, error: "No account found with this email on this device." };

  const isLegacy = profile.algo !== "pbkdf2";
  const computed = isLegacy
    ? await hashPasswordLegacy(password, profile.salt)
    : await hashPassword(password, profile.salt);
  if (!safeEqual(computed, profile.hash)) return { ok: false, error: "Incorrect password." };

  // Correct password on a legacy profile → silently re-hash with PBKDF2.
  if (isLegacy) {
    try {
      const newSalt = randomSalt();
      profile.salt = newSalt;
      profile.hash = await hashPassword(password, newSalt);
      profile.algo = "pbkdf2";
      saveProfiles(list);
    } catch (e) { /* upgrade is best-effort; login still succeeds */ }
  }
  return { ok: true, profile };
}

// List existing profiles for a friendly picker (no secrets exposed).
export function listProfiles() {
  return loadProfiles().map((p) => ({ id: p.id, email: p.email, nameA: p.nameA, nameB: p.nameB }));
}

// Register a profile that already carries its own credentials (salt + hash),
// e.g. one brought over from another device via encrypted import. We DO NOT
// re-hash — the same email + password the user had on the original device will
// work here unchanged. If a profile with this email already exists on this
// device, we return it instead of overwriting (the caller decides what to do).
export function registerProfileRecord(rec) {
  if (!rec || !rec.email || !rec.hash || !rec.salt) {
    return { ok: false, error: "The file is missing account credentials." };
  }
  const e = String(rec.email).trim().toLowerCase();
  const id = profileId(e);
  const list = loadProfiles();
  const existing = list.find((p) => p.id === id);
  if (existing) return { ok: true, profile: existing, existed: true };
  const profile = {
    id,
    nameA: (rec.nameA || "").trim(),
    nameB: (rec.nameB || "").trim(),
    email: e,
    salt: rec.salt,
    hash: rec.hash,
    algo: rec.algo || "pbkdf2",
    createdAt: rec.createdAt || new Date().toISOString(),
    importedAt: new Date().toISOString(),
  };
  list.push(profile);
  saveProfiles(list);
  return { ok: true, profile, existed: false };
}
