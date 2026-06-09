# CLAUDE.md — CANA — Covenant Life

Persistent project context for Claude Code. Read this first every session.

## What this is
A private, **local-first** biblical life-planning app for couples. A couple each
answer a guided self-assessment across 11 life domains, optionally write a
"letter from 10 years in the future", and get a deterministic plan plus optional
on-device AI enhancement. **No server, no cloud, no telemetry** — all data stays
on the user's device. This privacy promise is core; do not add network calls
that send user content anywhere.

Tone of the product: calm, pastoral, "a reflection tool, not a clinical
measurement". Reformed-evangelical framing. Domains carry biblical grounding +
peer-reviewed-style science framing ("associated with", never overclaimed).

## Platforms / targets
- **Web** (Vite, base `/CANA/`) — also the GitHub Pages demo.
- **macOS desktop** (Electron, universal .dmg, signed + notarized → GitHub release).
- **iOS** (Capacitor, bundle id `com.cana.covenantlife`), uses Apple's on-device
  Foundation Model when available, otherwise the deterministic engine.

Repo: `cana-lab/CANA` (public). In-app update check reads its GitHub releases.

## Build / run (scripts in package.json)
- `npm run dev` — web dev server.
- `npm run build` — web build (outDir `dist/`).
- `BUILD_TARGET=electron npm run build` — electron renderer (base `./`).
- `BUILD_TARGET=ios npm run build` — iOS web layer (outDir `dist-ios/`).
- `npm run pack:mac` — full electron build + sign + notarize + staple .dmg
  (needs Apple creds via the launcher; see SIGNING_AND_NOTARIZING.md).
- `npm run ios:sync` / `npm run ios:open` — Capacitor sync / open Xcode.
- `npm test` — Vitest unit suite over the pure modules (engine, auth, transfer).
- Double-click launchers (project root): "Build signed Mac app.command"
  (signed+notarized .dmg, stores Apple creds in Keychain on first run),
  "Build iOS and open Xcode.command", "Start/Stop CANA.command".

## Source map (src/)
- `App.jsx` (~2900 lines) — all UI. Screens are gated `if (screen==="x")`:
  login, welcome, intro, prepare, setup-wizard, settings, setup, assessment,
  review, letter, results, dashboard, conversation. Platform flags `isDesktop`
  / `isIOS` are declared at the TOP of the component (must stay there — they're
  used by effects before their old position; moving them down crashes all
  platforms). Chapter tiles are buttons opening a summary modal (`chapterInfo`).
- `engine.js` (~1200 lines) — DETERMINISTIC core. 11 domains, 113 questions,
  weighted scoring, health bands, flags (e.g. Contempt, Stonewalling). Each
  domain has `summary` (tile modal) + `about` {weight, biblical, books, science}.
  All scoring is guarded against div-by-zero / <2 domains / 0 answers. Pure ESM,
  unit-testable by direct import.
- `llm.js` — optional AI enhancement. Single `chat()` chokepoint: Apple model on
  iOS, Ollama (loopback only) on desktop. HARD-STOPS on iOS before any localhost
  fetch. AI always builds on the deterministic baseline, never replaces it.
- `auth.js` — local per-couple profiles. PBKDF2-HMAC-SHA256 @210k, salted.
  `registerProfileRecord` inserts an imported profile (with its own salt/hash)
  for cross-device transfer.
- `transfer.js` — encrypted device-to-device transfer (.cana file). AES-GCM,
  key from passphrase via PBKDF2. Carries answers + sessions + results + the
  account, so importing on a fresh device recreates the same login. One-time
  copy, NOT live sync (server was deliberately rejected for privacy).
- `foundationModel.js` — JS wrapper for the native Apple plugin (ios-plugin/).
- `update.js` — GitHub release update check (`cana-lab/CANA`, desktop only).
- `content.js`, `metrics.js`, `questionHelp.js`, `ErrorBoundary.jsx`,
  `logo.js` (brand mark — see note), `styles.css`, `main.jsx`, `index.html`.

## Conventions / non-negotiables
- After any substantial change: build the relevant targets; bump `version` in
  package.json; prepend a dated entry to CHANGELOG.md (newest on top).
- The single source of truth for the user-visible version is `package.json`.
  The Mac (electron-builder) and iOS (Xcode build) both pull from there via
  the prebuild scripts — never hand-edit `MARKETING_VERSION` / `CFBundleShortVersionString`.
- Privacy: never send user content off-device. AI is local only. iOS makes ZERO
  Ollama/localhost calls.
- Honesty in UI: scores are self-rated reflections, weights/bands are editorial
  (not clinically validated) and labeled as such; aspirational vision text is
  framed as hope/prayer, not fact.
- Child-safety / sensitive content: intimacy + faith-anxiety topics stay calm,
  non-clinical, never sexualized or clinical-diagnostic.
- Don't overclaim science. "Associated with" / "research suggests", with the
  source's actual support — no invented citations.

## Known constraints that can't be tested in a sandbox (verify on real machines)
- Real iOS device builds, Apple Foundation Model output, Xcode/Swift compile.
- macOS code-signing + notarization (needs Apple creds; runs via the launcher).
- Real file download / AirDrop / iOS file picker for the .cana transfer.
- Printed-PDF page fit, live Ollama output quality.
State clearly when something falls in this list.

## ⚠️ Logo / icon copyright (open issue)
`src/logo.js` `TREE_PATH` is artwork originally sourced from the internet and is
a PLACEHOLDER carrying copyright risk. It must be replaced by a graphic designer
with genuinely original artwork before any App Store submission. The icon is
full-bleed (macOS Tahoe masks corners itself); `public/AppIcon-1024.png` is the
opaque iOS icon. Editing the existing art "enough" does NOT clear the right —
only original artwork does.

## Distribution status
- Owner is now in the Apple Developer Program ($99/yr).
- macOS: signed+notarized .dmg via the launcher → upload to GitHub release.
  End users then open with a normal double-click (no Terminal).
- iOS: TestFlight for beta, then App Store. Deployment target 16.0 (set in
  `ios/App/App.xcodeproj`); automatic signing + team configured per-Mac.
- App Store review notes needed: frame as reflection tool (not clinical),
  honest age rating for mild mature themes, privacy label "Data Not Collected"
  (PrivacyInfo.xcprivacy reflects this in-source).

## iOS project layout (post-4.44 cleanup)
- The whole `ios/` Capacitor project IS committed (Info.plist, pbxproj,
  PrivacyInfo.xcprivacy, FoundationAIPlugin sources). `ios/App/Pods/` and
  Capacitor's generated `ios/App/App/public/` are gitignored — those are
  regenerated by `npm run ios:sync`.
- The plugin source-of-truth lives in `ios-plugin/`. The copies inside
  `ios/App/App/` are kept in sync (committed for reproducibility).
