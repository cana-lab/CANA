#!/usr/bin/env node
// CANA — single-source-of-truth version sync.
// ----------------------------------------------------------------------------
// `version` in package.json is the only place a human edits the app version.
// This script pushes that version into all platform-specific files that need
// to match it, so the user never sees "iOS Settings says 1.0 but the app says
// 4.43.0" again.
//
// Targets:
//   - ios/App/App.xcodeproj/project.pbxproj
//       MARKETING_VERSION         ← package.json version (e.g. "4.44.0")
//       CURRENT_PROJECT_VERSION   ← incremented per build (monotonic; see below)
//
// CFBundleShortVersionString in ios/App/App/Info.plist already references
// $(MARKETING_VERSION), and electron-builder reads `version` from package.json
// directly — so this script only has to patch the Xcode project file.
//
// Usage:
//   node scripts/sync-versions.cjs              → patch versions, keep build #
//   node scripts/sync-versions.cjs --bump-build → patch versions and bump build #
//   node scripts/sync-versions.cjs --check      → fail if anything is out of sync
//
// The npm prebuild hooks call this automatically; you rarely run it by hand.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PKG_PATH = path.join(ROOT, "package.json");
const PBXPROJ = path.join(ROOT, "ios/App/App.xcodeproj/project.pbxproj");

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has("--check");
const BUMP_BUILD = args.has("--bump-build");

const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
const targetVersion = String(pkg.version || "").trim();
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(targetVersion)) {
  console.error(`✗ package.json "version" is not semver-shaped: ${targetVersion || "(empty)"}`);
  process.exit(1);
}

if (!fs.existsSync(PBXPROJ)) {
  // No iOS project in this checkout. That's fine on CI for web-only builds.
  console.log(`• No iOS project at ${path.relative(ROOT, PBXPROJ)} — skipping iOS version sync.`);
  process.exit(0);
}

const original = fs.readFileSync(PBXPROJ, "utf8");
let next = original;

// Patch every MARKETING_VERSION = X.Y.Z; line. There are usually two
// (Debug + Release configurations).
next = next.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${targetVersion};`);

if (BUMP_BUILD) {
  // Apple requires the CFBundleVersion (CURRENT_PROJECT_VERSION) to strictly
  // increase across TestFlight / App Store uploads. We treat it as a plain
  // integer counter, independent of MARKETING_VERSION. Reading the highest
  // value currently in the file (across Debug+Release), then incrementing.
  const matches = [...next.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)];
  let current = 0;
  for (const m of matches) current = Math.max(current, parseInt(m[1], 10) || 0);
  const nextBuild = current + 1;
  next = next.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${nextBuild};`);
  console.log(`• Build number bumped: ${current} → ${nextBuild}`);
}

if (CHECK_ONLY) {
  if (next !== original) {
    console.error("✗ Version drift between package.json and ios/App/App.xcodeproj/project.pbxproj");
    console.error(`  package.json says ${targetVersion}; the Xcode project does not match.`);
    console.error('  Run `node scripts/sync-versions.cjs` (or any npm build target) to fix.');
    process.exit(1);
  }
  console.log(`✓ Versions in sync (package.json ${targetVersion} = pbxproj MARKETING_VERSION).`);
  process.exit(0);
}

if (next === original) {
  console.log(`✓ Versions already in sync (${targetVersion}).`);
  process.exit(0);
}

fs.writeFileSync(PBXPROJ, next, "utf8");
console.log(`✓ iOS project MARKETING_VERSION patched to ${targetVersion}.`);
