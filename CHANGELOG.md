# Changelog

## 4.3.3
- You can now return to your results after visiting the dashboard. The dashboard header has a "Results" button (when results exist), and the home screen has a "View latest results" button, so the generated plan is reachable again instead of being a dead end.


## 4.3.2
- Welcome screen: Introduction and "Set up the local AI" are now gray secondary buttons matching Quick Check-In (were text links).
- Fixed buggy window controls: removed the app's own drawn title-bar strip (duplicate traffic-light dots) and switched the desktop window to the standard macOS title bar, so the real close/minimize/full-screen buttons behave natively without overlap.
- "Check for updates" result message now auto-dismisses after 10 seconds (an available-update notice stays visible).
- App width now adapts to the screen/window size (grows up to a wider cap with viewport-based side padding) instead of a fixed narrow column.


## 4.3.1
- Added in-app version display (home screen) and a "Check for updates" button that queries the project's GitHub Releases and links to the download when a newer version exists. Version is read from package.json at build time (single source of truth). No auto-install (that needs Apple signing); the update repo is set via one line in src/update.js. See docs/UPDATES.md for the full GitHub repo + release setup guide.


## 4.3.0
- Added a first-launch Setup wizard for the local AI: detects Ollama, guides its install with a one-click download and live re-check, lets the user pick a model size, and downloads the model in-app with a progress bar (the model pull is fully automated via Ollama's API; the app config auto-points at it). Honest by design — macOS forbids silent installs, so system installs are guided and the whole AI layer is skippable (CANA works without it). Added a safe, read-only Electron bridge (binary detection + open-external) and docs/PACKAGING.md. Polished the .dmg drag-to-Applications window (size, icon size).


## 4.2.0
- Results screen: each chapter's score row now has its own info tag. It describes that chapter's two scores and, when answers diverged, names the specific question(s) the gap comes from and who answered more positively — including the case where the chapter average looks aligned but one question is sharply split. Strictly descriptive; it does not interpret the difference. Engine now attaches a per-question gap breakdown (questionGaps) to each domain score.


## 4.1.0
- Added an in-app Introduction page (linked from the home screen) detailing the biblical and literature background with references, the nine chapters, methodology, sources, and information limits — drawn from the research foundation.
- Added a "Before you begin" page after pressing Begin, explaining how to approach the assessment (answer honestly, for yourself, independently) for the most truthful result.
- Added a "What these numbers are" info tag on the results screen: a strictly descriptive explanation of the 0–10 scores, the gap (Δ), overall score, tensions, flags, and weights — describing what each figure is, without interpreting it.


## 4.0.1
- Setup screen now lets either partner begin first: separate "{A} — Begin" and "{B} — Begin" buttons instead of a single Partner-A-only start.


## 4.0.0
- Packaged CANA as a real macOS desktop app via Electron. Double-click "Build CANA app.command" to produce CANA.dmg (Apple Silicon + Intel); drag CANA into Applications for a true Dock/Launchpad app with no Terminal and no dev server. Renders identically to the browser; still talks only to local Ollama; localhost-only CSP preserved. App icon ships as build/icon.icns. Web/GitHub Pages build is unaffected (conditional Vite base).


## 3.4.0
- Renamed the app to "CANA - Covenant Life" across the interface (title bar, welcome hero, page title).
- Added a custom app icon: the oak-with-two-readers silhouette traced from the source artwork, set on a warm parchment squircle in the macOS icon language. Used as the favicon, apple-touch-icon, in-app title-bar mark, and welcome-screen logo; PNG exports (32-512px) included in public/.


## 3.3.0
- Added double-click launchers so the app runs without using Terminal: "Start CANA.command" installs dependencies the first time, starts the local server, and opens the browser automatically; "Stop CANA.command" shuts it down. README documents the one-time macOS security step for unsigned scripts.


## 3.2.0
- Added "Save & exit" during the assessment and letter screens — saves the draft to the device and returns to the welcome screen with a confirmation.
- Added a per-partner "Continue where you left off" card on the welcome screen: either partner can start, save, leave, and resume later from their first unfinished domain (partial progress within a domain is preserved).
- Starting a new assessment while a draft is in progress now asks for confirmation, so saved progress is never silently discarded.


## 3.1.0
- Added an "About this Chapter" panel to every domain in the assessment, presenting the biblical principle (with references), named source books, and the peer-reviewed science behind that domain's questions — sourced from docs/cana_foundation.md.
- UX/Apple-polish pass: refined scale input, answered-state checkmarks, per-domain progress counts, gap (Δ) indicators on domain health, editable-statement affordances, keyboard focus rings, reduced-motion support, native-styled sliders, improved print styles.


## 3.0.0
- Redesigned the entire interface in a refined Apple / macOS style (SF system font, vibrancy surfaces, spring motion, traffic-light status, segmented controls).
- Desktop-focused: removed the PWA/service-worker layer; the app is a clean static site.
- Local Ollama is now the direct, default LLM — auto-probed on launch, with a model dropdown populated from your installed models (/api/tags).
- Simplified setup: running locally needs zero Ollama configuration.
- Verified production render in a single-React environment (matches Vite/browser).


## 2.2.0
- Added Future Perfect exercise: per-partner 10-years-future letter + structured dream-element ratings.
- Added deterministic letter comparison (top-5 commonalities & differences, letter-alignment score) that works with or without an LLM.
- Added optional local LLM (Ollama) integration: letter theme extraction, individual vision/mission, and compiled joint vision/mission.
- All generated statements are user-editable.
- LLM is endpoint-configurable in a Settings screen; deterministic fallback if unreachable.
- CSP updated from connect-src 'none' to localhost-only (Ollama); all other connections still blocked.
- Added docs/LLM_SETUP.md.


## 2.1.0
- Added Quick Check-In mode: 9-question short form (one core anchor per domain) for frequent re-testing.
- Added session history: every assessment saved as a timestamped, device-local snapshot.
- Added Trend Dashboard: mission drift, value alignment, overall health, and per-domain movement charts (dependency-free SVG).
- Added deterministic trend flags (drift, alignment convergence/divergence, domain decline/growth).
- Tagged one `core` anchor question per domain in the engine.


## 2.0.0
- Rebuilt as offline-first PWA with zero network calls.
- Replaced hosted-AI synthesis with a local deterministic engine.
- Response labels now matched to each question's type (Satisfaction, Frequency, Clarity, etc.).
- Added reverse-scoring for negatively-valenced items.
- Added research-based domain weighting and deterministic tension/goal prioritization.
- Added strict Content-Security-Policy (`connect-src 'none'`) and local-only persistence.
- Added full documentation set (Architecture, Methodology, Assumptions, Privacy, Deployment).
