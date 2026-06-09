// CANA — encrypted data transfer between devices (Mac ⇄ iPhone).
// -----------------------------------------------------------------------------
// Exports one profile's full data (names, in-progress answers, saved sessions,
// and the current report) into a single ENCRYPTED file, and imports it back on
// another device. This keeps CANA's "your words stay private" promise: the file
// the user carries (AirDrop / email / Files) is encrypted with a passphrase the
// user chooses, so a leaked file reveals nothing without it.
//
// Crypto: AES-GCM with a 256-bit key derived from the passphrase via PBKDF2-
// HMAC-SHA256 (210k iterations), random salt + IV per export. Same primitives
// as auth.js — Web Crypto, available on web, Electron, and iOS (WKWebView).
//
// This module is pure and has no React/DOM dependencies, so it is unit-testable.

const PBKDF2_ITERATIONS = 210000;
const MAGIC = "CANA-TRANSFER";
const FORMAT_VERSION = 1;

function getCrypto() { return globalThis.crypto || (typeof window !== "undefined" ? window.crypto : undefined); }

function toB64(bytes) {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  // btoa exists in browsers/WKWebView; Buffer fallback for Node tests.
  if (typeof btoa === "function") return btoa(bin);
  return Buffer.from(bin, "binary").toString("base64");
}

function fromB64(b64) {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function deriveKey(passphrase, salt) {
  const c = getCrypto();
  const keyMaterial = await c.subtle.importKey(
    "raw", new TextEncoder().encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return c.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt an arbitrary JSON-serialisable payload with a passphrase.
// Returns a string (the file contents) — a small JSON envelope with base64 fields.
export async function encryptPayload(payload, passphrase) {
  if (!passphrase || passphrase.length < 6) {
    throw new Error("Passphrase must be at least 6 characters.");
  }
  const c = getCrypto();
  const salt = c.getRandomValues(new Uint8Array(16));
  const iv = c.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = await c.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return JSON.stringify({
    magic: MAGIC,
    v: FORMAT_VERSION,
    alg: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iter: PBKDF2_ITERATIONS,
    salt: toB64(salt),
    iv: toB64(iv),
    data: toB64(cipher),
  });
}

// Decrypt a file produced by encryptPayload. Throws a friendly error if the
// passphrase is wrong or the file is not a CANA transfer file.
export async function decryptPayload(fileContents, passphrase) {
  let env;
  try {
    env = JSON.parse(fileContents);
  } catch (e) {
    throw new Error("This file isn't a valid CANA transfer file.");
  }
  if (!env || env.magic !== MAGIC) {
    throw new Error("This file isn't a CANA transfer file.");
  }
  if (env.v !== FORMAT_VERSION) {
    throw new Error(`This file was made by a different version (format ${env.v}).`);
  }
  const c = getCrypto();
  const salt = fromB64(env.salt);
  const iv = fromB64(env.iv);
  const key = await deriveKey(passphrase, salt);
  let plaintext;
  try {
    plaintext = await c.subtle.decrypt({ name: "AES-GCM", iv }, key, fromB64(env.data));
  } catch (e) {
    // AES-GCM authentication failure → wrong passphrase or corrupted file.
    throw new Error("Wrong passphrase, or the file is damaged.");
  }
  try {
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch (e) {
    throw new Error("The file decrypted but its contents were unreadable.");
  }
}

// Wrap a profile's data into the canonical transfer payload shape.
// `data` = { names, answers, sessions, results }. We tag it with metadata so an
// import can sanity-check and show the user what they're about to bring in.
// `account` (optional) is the full profile record (email, salt, hash, algo,
// names) so the receiving device can recreate the SAME login automatically —
// no need to manually create an account first. Credentials live only inside the
// AES-GCM-encrypted blob, never in cleartext.
export function buildTransferPayload({ names, answers, sessions, results }, meta = {}, account = null) {
  return {
    kind: "cana-profile-data",
    exportedAt: new Date().toISOString(),
    appVersion: meta.appVersion || null,
    platform: meta.platform || null,
    profileEmail: meta.profileEmail || null,
    counts: {
      sessions: Array.isArray(sessions) ? sessions.length : 0,
      reports: Array.isArray(sessions) ? sessions.filter((s) => s && s.report).length : 0,
    },
    account: account ? {
      email: account.email,
      nameA: account.nameA,
      nameB: account.nameB,
      salt: account.salt,
      hash: account.hash,
      algo: account.algo || "pbkdf2",
      createdAt: account.createdAt || null,
    } : null,
    payload: {
      names: names || { A: "", B: "" },
      answers: answers || {},
      sessions: Array.isArray(sessions) ? sessions : [],
      results: results || null,
    },
  };
}

// Validate a decrypted object is the shape we expect before importing.
export function validateTransfer(obj) {
  if (!obj || obj.kind !== "cana-profile-data" || !obj.payload) {
    throw new Error("This file doesn't contain CANA profile data.");
  }
  const p = obj.payload;
  if (typeof p !== "object") throw new Error("The data section is malformed.");
  // Be tolerant: missing pieces default to empty rather than failing.
  return {
    names: p.names && typeof p.names === "object" ? p.names : { A: "", B: "" },
    answers: p.answers && typeof p.answers === "object" ? p.answers : {},
    sessions: Array.isArray(p.sessions) ? p.sessions : [],
    results: p.results || null,
    account: (obj.account && obj.account.email && obj.account.hash && obj.account.salt) ? obj.account : null,
    meta: {
      exportedAt: obj.exportedAt || null,
      appVersion: obj.appVersion || null,
      platform: obj.platform || null,
      profileEmail: obj.profileEmail || null,
      counts: obj.counts || null,
    },
  };
}
