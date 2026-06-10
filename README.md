# CANA — Covenant Life

A private, local-first, biblically-grounded life-planning tool for couples.
Two partners each complete a structured self-assessment across **eleven life
domains** (113 questions), optionally write a "letter from ten years in the
future", and receive a deterministic plan — joint vision & mission, prioritized
1/5/10-year goals, top tensions, and pattern-based flags — **computed entirely
on the device**. An optional, strictly local AI layer re-expresses the
deterministic text in warmer language; it never replaces the facts.

**Platforms:** macOS desktop app (Electron, signed + notarized `.dmg`),
iOS app (Capacitor, TestFlight/App Store), and a web build (GitHub Pages demo).
One shared codebase.

---

## The three commitments

1. **Determinism.** Identical answers always produce an identical plan.
   Scoring, weighting, gap analysis, and prioritization are pure functions in
   [`src/engine.js`](src/engine.js) — no randomness, no model variance. The AI
   layer (when present) only re-words the deterministic foundation.
   (See [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md).)
2. **Grounding.** Domain weights, gap-severity bands, reverse-scoring, and
   pattern flags are anchored to published relationship and survey-methodology
   research, cited inline — with honest "associated with" framing, never
   overclaimed. This is a structured conversation tool, **not a clinical
   instrument**. (See [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) and
   [`docs/cana_foundation.md`](docs/cana_foundation.md).)
3. **Privacy by architecture.** User content never leaves the device.
   - There is **no server, no analytics, no telemetry, no tracking SDK**.
   - The only network endpoints the desktop app can reach are a **local Ollama
     on `localhost`** (optional AI) and **`api.github.com`** (version check for
     updates — version numbers only, never user content), both enforced by the
     Content-Security-Policy in [`index.html`](index.html).
   - The **iOS app makes zero network calls**: the AI uses Apple's on-device
     Foundation Model via a native plugin, the update check is desktop-only,
     and `WKAppBoundDomains` locks the WebView to bundled content.
   - Cross-device transfer is a passphrase-encrypted file (AES-GCM, PBKDF2)
     the user carries themselves. (See [`docs/PRIVACY.md`](docs/PRIVACY.md).)

---

## The eleven domains

Faith & Calling · Marriage & Covenant · Intimacy & Sexual Union ·
Children & Family · In-Laws & Extended Family · Vocation & Work ·
Place & Home · Money & Stewardship · Body & Health ·
Creative Life & Craft · Community & Legacy

Each domain opens with a Scripture and contains typed questions (Agreement,
Satisfaction, Frequency, Clarity, Urgency, Importance, Concern, Peace, Pull,
Willingness) whose rating labels match the question's task. The 0–10 scale
omits the exact midpoint (5) to force a directional lean while still allowing
a mild one (4 or 6).

## What it produces

| Output | How it is derived |
| --- | --- |
| **Joint Vision & Mission** | Templates selected by overall weighted health + strongest/weakest domains; optionally re-worded by local AI on top of the deterministic text |
| **Individual Vision & Mission** (each partner) | Same mechanism, per-partner scores |
| **1 / 5 / 10-year goals** | One goal per domain, ordered by a deterministic priority rule per timeframe |
| **Top tensions** | Per-question score gaps, reverse-scoring corrected, ranked by `gap × domain-weight` |
| **Pattern flags** | Deterministic rules (e.g. Contempt Detected, Stonewalling Pattern, Sacred-Bond Buffer) |
| **Letter comparison** | "Future Perfect" letters analyzed for shared dreams and genuine differences |
| **Trends** | Every assessment is a timestamped local snapshot; the dashboard charts drift, alignment, and per-domain movement |

## Quick start (development)

```bash
npm install
npm run dev          # web dev server → http://localhost:5173/CANA/
npm test             # unit tests (engine, auth, transfer)
npm run build        # web build → dist/
```

## Building the apps

| Target | Command | Output |
| --- | --- | --- |
| macOS (signed + notarized) | double-click **`Build signed Mac app.command`** | `release/CANA-<v>-arm64.dmg` + `release/CANA-<v>.dmg` + `latest-mac.yml` |
| macOS (unsigned dev pack) | `npm run pack:mac` | same, unsigned — will not open on other Macs |
| iOS | double-click **`Build iOS and open Xcode.command`**, then Archive in Xcode | App Store / TestFlight build |
| Web | `npm run build` | static site in `dist/` (GitHub Pages deploys via Actions) |

The Mac launcher stores your Apple credentials in the macOS Keychain on first
run (never in the repo) — see
[`SIGNING_AND_NOTARIZING.md`](SIGNING_AND_NOTARIZING.md). Before each
TestFlight upload, bump the iOS build number once: `npm run ios:bump-build`.
The user-facing version lives **only** in `package.json`; the build scripts
sync it everywhere else (`scripts/sync-versions.cjs`).

For local development in a browser there are also **`Start CANA.command`** /
**`Stop CANA.command`** (dev server + auto-open, no Terminal typing). macOS
will ask you to right-click → Open the first time, since the scripts aren't
notarized.

## Updates

The packaged Mac app checks GitHub Releases via `electron-updater` and
installs updates only after user consent; Squirrel.Mac verifies the new
build's code signature against the running app before installing. The web
demo only shows a download link. iOS updates ship through the App Store.
(See [`docs/UPDATES.md`](docs/UPDATES.md).)

## Repository layout

```
CANA/
├─ src/                 # shared React app (all platforms)
│  ├─ engine.js         #   deterministic core: scoring, flags, language
│  ├─ App.jsx           #   UI (screens gated by `screen` state)
│  ├─ llm.js            #   optional AI: Apple model (iOS) / Ollama (desktop)
│  ├─ auth.js           #   local profiles (PBKDF2)
│  ├─ transfer.js       #   encrypted device-to-device transfer (.cana)
│  ├─ crashLog.js       #   local-only diagnostic log (no telemetry)
│  └─ *.test.js         #   Vitest unit tests
├─ electron/            # macOS main process + preload
├─ ios/                 # Capacitor Xcode project (committed)
├─ ios-plugin/          # Apple Foundation Model plugin source of truth
├─ public/              # icons + GitHub-Pages-only help pages
├─ scripts/             # build/version/notarization automation
├─ docs/                # methodology, privacy, assumptions, research
└─ .github/workflows/   # CI (tests + 3 builds) and Pages deploy
```

## Honesty about scope

The questions are not a validated psychometric scale and the domain weights
are a defensible editorial heuristic, not a calibrated model. Scores are
self-rated reflections. The app frames itself accordingly — a reflection
tool to provoke better conversations, not a diagnosis.

## License

MIT — see [`LICENSE`](LICENSE).

> ⚠️ **Known open issue:** the tree artwork in `src/logo.js` is a placeholder
> with unresolved copyright status and must be replaced with original artwork
> before App Store submission. See [`ICON_SETUP.md`](ICON_SETUP.md).
