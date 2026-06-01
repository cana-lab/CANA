# Covenant Life Plan

A private, offline-first, biblically-grounded life-planning tool for couples. Two partners each complete a structured assessment across nine life domains; the application then synthesizes a **joint vision, mission, prioritized goals (1 / 5 / 10 year), top tensions, and pattern-based insights** — entirely on-device, with no data ever leaving the browser.

A **desktop web app** with a refined, Apple-style interface. It runs in any modern browser on your Mac and connects **directly to a local Ollama model on the same machine** — so the AI features are free and fully private. Deployable locally or as a static site on **GitHub Pages**.

---

## Why this exists

Most "life planning" frameworks for couples are either (a) analog workbooks that leave all the synthesis to you, or (b) productivity apps that track tasks but never engage values, calling, or the differences between two people. Neither does the one thing a couple actually needs on a planning retreat: take two independent sets of honest answers and turn them into a single, shared, prioritized picture — including an honest map of where the partners *disagree*.

This tool was built to fill that gap, with three non-negotiable commitments:

1. **Determinism.** Identical answers always produce an identical plan. Scoring, weighting, gap analysis, and prioritization are pure functions — no randomness, no model variance. (See [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md).)
2. **Scientific grounding.** Domain weights, gap-severity bands, reverse-scoring, and pattern flags are anchored to published relationship and survey-methodology research, cited inline. (See [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md).)
3. **Privacy by architecture.** The answers a couple gives are among the most sensitive data imaginable. This app is built so that the data **cannot** leave the device — enforced by a Content-Security-Policy of `connect-src 'none'` and a build with zero network calls in the application bundle. (See [`docs/PRIVACY.md`](docs/PRIVACY.md).)

---

## What it produces

| Output | How it is derived |
| --- | --- |
| **Joint Vision** (1 sentence) | Template selected by overall weighted health score + the two strongest and two weakest domains |
| **Joint Mission** (1–2 sentences) | Template referencing strongest and weakest domains by name |
| **Top 10 goals** for 1 yr / 5 yr / 10 yr | One goal per domain, ordered by a different deterministic priority rule per timeframe; phrasing chosen by each domain's score band |
| **Top tensions** | Per-question score gaps, reverse-scoring corrected, ranked by `gap × domain-weight` |
| **Pattern flags** | Deterministic rules over domain scores (e.g. faith × marriage interaction, financial-conflict threshold) |
| **Domain health bars** | Normalized 0–10 averages per partner, with health band labels |



## Future Perfect exercise + LLM-written statements

The full assessment now includes a **Future Perfect** step: each partner writes a letter from ten years in the future and rates a set of structured "dream elements." The app extracts and compares them, surfacing the **top 5 shared dreams** and **top 5 differences** (differences are treated as potentially complementary, not automatic conflicts), and feeds them into the analysis.

From the questionnaire **and** the letters, the app generates each partner's **individual vision & mission** and then a compiled **joint vision & mission** — all **editable** by the user. This generation uses a language model running **locally on your own machine via Ollama** (free, private; see [`docs/LLM_SETUP.md`](docs/LLM_SETUP.md)). The LLM is optional: with it off, letter comparison uses the structured dream-ratings and statements come from a deterministic writer. All scoring is deterministic and local in every case.

## Re-testing & trend tracking

Beyond the one-time retreat assessment, the app supports a **9-question quick check-in** (one anchor question per domain) that couples can retake weekly or monthly. Every assessment — full or check-in — is saved as a timestamped snapshot, and a **trend dashboard** charts:

- **Mission drift** — how far the current life pattern has moved from the original baseline
- **Value alignment** — whether the two partners are converging or diverging over time
- **Overall health** and **per-domain movement** with up/down deltas

See [`docs/TREND_ANALYSIS.md`](docs/TREND_ANALYSIS.md). All history is device-local; nothing is uploaded.

---

## The nine domains

Faith & Calling · Marriage & Covenant · Children & Family · Vocation & Work · Place & Home · Money & Stewardship · Body & Health · Creative Life & Craft · Community & Legacy

Each opens with a Scripture and contains 7–14 questions. Each question is typed (Agreement, Satisfaction, Frequency, Clarity, Urgency, Importance, Concern, Peace, Pull, Willingness) and its rating labels are matched to that type. The scale omits 4/5/6 by design to force a directional commitment (see methodology).

---

## Build a real Mac app (CANA.app)

CANA can be packaged into a genuine macOS application — an icon in your Applications folder and Dock, launched like any other app, with no Terminal and no dev server. It uses **Electron**, so the app renders pixel-identically to what you see in the browser.

**To build it:** double-click **`Build CANA app.command`**. It installs the build tools (the first run downloads Electron, ~150MB, so allow a few minutes), then produces installer disk images in a new `release/` folder:

- `CANA-<version>-arm64.dmg` — Apple Silicon (M1/M2/M3…)
- `CANA-<version>.dmg` — Intel Macs

Open the `.dmg` for your Mac and drag **CANA** into Applications. Done — launch it from Launchpad or Applications from then on.

**First-launch security step (one time).** Because the app is not signed with a paid Apple Developer certificate, the first launch shows "CANA can't be opened because Apple cannot check it for malicious software." This is expected for a self-built app. To allow it: **right-click** CANA in Applications → **Open** → **Open**. After that first time, it opens normally. (Signing it to remove this step entirely requires a paid Apple Developer account — out of scope here.)

**The AI features are unchanged:** the packaged app talks to your local Ollama exactly as the browser version does, so make sure Ollama is running for the AI parts. Everything still stays on your machine.

> Prefer not to build anything? The double-click **`Start CANA.command`** launcher (below) runs the app in your browser with no packaging step. The packaged app is purely a convenience upgrade — same app, nicer launch.

## Quick start — the easy way (no Terminal typing)

Two double-click launchers are included in the project folder:

- **`Start CANA.command`** — installs everything the first time (if needed), starts the local server, and opens CANA in your browser automatically. Leave the window it opens running while you use the app.
- **`Stop CANA.command`** — shuts the server down. (Closing the "Start CANA" window does the same thing.)

**First time only — macOS security step.** Because these scripts are not signed by a registered developer, the first time you run one macOS will refuse with "cannot be opened because it is from an unidentified developer." This is expected. To allow it: **right-click** (or Control-click) `Start CANA.command` → **Open** → **Open** in the dialog. After that first time, a normal double-click works.

If a double-click ever does nothing, the file may have lost its executable bit during download. Fix it once by running this in Terminal (drag the file in after typing `chmod +x `):

```bash
chmod +x "Start CANA.command" "Stop CANA.command"
```

You still need **Node.js** installed once (the launcher will tell you and link to nodejs.org if it is missing), and **Ollama** running if you want the AI features.

## Quick start (manual / local development)

```bash
npm install
npm run dev          # http://localhost:5173/cana/
npm run build        # produces dist/
npm run preview      # serve the production build locally
```

## Deploying to GitHub Pages

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full step-by-step. In short: set `base` in `vite.config.js` to match your repo name, push to `main`, and the included GitHub Actions workflow builds and publishes automatically.

---

## Repository layout

```
covenant-life-plan/
├─ src/
│  ├─ engine.js        # Deterministic core: taxonomy, scoring, flags, language
│  ├─ App.jsx          # React UI (assessment flow, results)
│  └─ main.jsx         # Entry point
├─ public/             # Icons, favicon, robots.txt
├─ docs/
│  ├─ ARCHITECTURE.md  # How the system is structured
│  ├─ METHODOLOGY.md   # How scoring & synthesis work, step by step
│  ├─ ASSUMPTIONS.md   # Every assumption + its scientific basis & limits
│  ├─ PRIVACY.md       # The data-never-leaves guarantee, explained
│  └─ DEPLOYMENT.md    # GitHub Pages setup
├─ .github/workflows/deploy.yml
├─ index.html          # Contains the strict CSP
├─ vite.config.js
└─ package.json
```

---

## A word of honesty about scope

This is a **structured conversation tool**, not a clinical instrument. The questions are not a validated psychometric scale, and the domain weights are a defensible heuristic, not a calibrated model. It is designed to provoke better, more honest conversations between two people — not to diagnose a relationship. [`docs/ASSUMPTIONS.md`](docs/ASSUMPTIONS.md) is candid about every limitation.

## License

MIT — see [`LICENSE`](LICENSE).
