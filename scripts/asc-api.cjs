#!/usr/bin/env node
// CANA — minimal App Store Connect API client.
// -----------------------------------------------------------------------------
// Mints a short-lived ES256 JWT and calls an App Store Connect API path, e.g.:
//   node scripts/asc-api.cjs /v1/apps
//   node scripts/asc-api.cjs "/v1/builds?filter[app]=APPID&limit=5"
//   node scripts/asc-api.cjs POST /v1/ciBuildRuns '{"data":{...}}'
// (POST exists to restart Xcode Cloud builds; everything else stays read-only.)
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

let method = "GET";
let argIdx = 2;
if (["GET", "POST"].includes(String(process.argv[2]).toUpperCase())) {
  method = process.argv[2].toUpperCase();
  argIdx = 3;
}
const apiPath = process.argv[argIdx];
const reqBody = process.argv[argIdx + 1] || null;
if (!apiPath || !apiPath.startsWith("/")) {
  console.error('Usage: node scripts/asc-api.cjs [GET|POST] "/v1/apps" [json-body]');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${mintJWT()}` };
if (reqBody) headers["Content-Type"] = "application/json";

const req = https.request({
  hostname: "api.appstoreconnect.apple.com",
  path: apiPath,
  method,
  headers,
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
if (reqBody) req.write(reqBody);
req.end();
