#!/usr/bin/env node
// CANA — minimal App Store Connect API client (read-only usage).
// -----------------------------------------------------------------------------
// Mints a short-lived ES256 JWT and GETs an App Store Connect API path, e.g.:
//   node scripts/asc-api.cjs /v1/apps
//   node scripts/asc-api.cjs "/v1/builds?filter[app]=APPID&limit=5"
//
// Credentials (never in the repo):
//   - Key ID + Issuer ID: macOS Keychain, service "cana-asc-api",
//     accounts "key_id" / "issuer_id".
//   - Private key: ~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8
//     (Apple's standard search path; chmod 600).
// The JWT lives 15 minutes and is minted fresh per invocation.

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const https = require("https");

function keychain(account) {
  try {
    return execFileSync("security", ["find-generic-password", "-s", "cana-asc-api", "-a", account, "-w"], { encoding: "utf8" }).trim();
  } catch (e) {
    console.error(`✗ Keychain item missing: service=cana-asc-api account=${account}`);
    process.exit(1);
  }
}

const KEY_ID = keychain("key_id");
const ISSUER_ID = keychain("issuer_id");
const P8_PATH = path.join(os.homedir(), ".appstoreconnect", "private_keys", `AuthKey_${KEY_ID}.p8`);
if (!fs.existsSync(P8_PATH)) { console.error(`✗ Private key not found: ${P8_PATH}`); process.exit(1); }

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function mintJWT() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "ES256", kid: KEY_ID, typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 900, aud: "appstoreconnect-v1" }));
  const signingInput = `${header}.${payload}`;
  // ES256 needs the raw r||s signature ("ieee-p1363"), not ASN.1/DER.
  const sig = crypto.sign("sha256", Buffer.from(signingInput), {
    key: crypto.createPrivateKey(fs.readFileSync(P8_PATH, "utf8")),
    dsaEncoding: "ieee-p1363",
  });
  return `${signingInput}.${b64url(sig)}`;
}

const apiPath = process.argv[2];
if (!apiPath || !apiPath.startsWith("/")) {
  console.error('Usage: node scripts/asc-api.cjs "/v1/apps"');
  process.exit(1);
}

const req = https.request({
  hostname: "api.appstoreconnect.apple.com",
  path: apiPath,
  method: "GET",
  headers: { Authorization: `Bearer ${mintJWT()}` },
}, (res) => {
  let body = "";
  res.on("data", (c) => (body += c));
  res.on("end", () => {
    if (res.statusCode >= 400) {
      console.error(`HTTP ${res.statusCode}`);
      console.error(body.slice(0, 2000));
      process.exit(1);
    }
    console.log(body);
  });
});
req.on("error", (e) => { console.error(e.message); process.exit(1); });
req.end();
