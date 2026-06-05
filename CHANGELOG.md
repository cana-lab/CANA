# Changelog

## 4.21.0
- Security hardening (from an adversarial review):
  - The local-AI endpoint is now hard-restricted to this computer (localhost/127.0.0.1). The app refuses to save or send to any other host, and sanitizes the stored value on read — so the couple's letters and answers can never be redirected off the device, even if the setting were tampered with. The CSP is no longer the only line of defense.
  - Passwords are now hashed with PBKDF2 (210k iterations) instead of plain SHA-256, making offline guessing far slower. Existing accounts are upgraded automatically and invisibly on next sign-in — no action needed, no lockout. Added constant-time hash comparison.
  - The desktop "open external" channel now permits file: links ONLY for the bundled update guide, blocking any attempt to open arbitrary local files or apps.
- No change to normal use. Note (unchanged, already shown at sign-in): the password is an on-device soft lock, not a vault; anyone with full access to the computer can reach the underlying data, so don't reuse an important password here.


## 4.20.1
- The radar/spider chart legend (icon → domain name + score) now also appears on the home-screen dashboard preview, not just the full dashboard. Gave the preview's chart column more room so the legend forms a clean grid.


## 4.20.0
- Added a legend (key) beneath the dashboard's radar/spider chart, mapping each domain icon to its full name and current score, in a clean responsive grid with color-matched icon chips. The radar's axis tips still show the icon; the legend now tells you what each one means. The compact home-screen preview links to the full dashboard for the key.


## 4.19.0
- Six fixes:
  1. Email report: a mailto link cannot carry an attachment, so the button now first saves the PDF (print dialog), then opens a SHORT email draft asking you to attach that PDF — instead of dumping the whole plan as plain text.
  2. PDF export now includes ALL goal horizons (1, 5, and 10 year), not just the tab currently shown on screen. The on-screen view stays tabbed.
  3. Print/PDF line breaks fixed: forced clean word-wrapping, smaller print type, and proper page margins so text no longer runs off or breaks badly.
  4. Dashboard metric info pop-ups now expand INLINE beneath each tile instead of floating (the card blur was trapping them behind other content); the full text is always readable now.
  5. The AI "tensions from your letters" analysis is now strict and literal: it only surfaces points explicitly written in both letters, never infers motives or feelings, treats different topics as different (not conflicts), and returns fewer/no items rather than forcing far-fetched connections.
  6. Every question now has a "Not applicable" toggle. Questions marked N/A (by either partner) are fully excluded from scoring, gaps, and the report; a domain whose questions are all N/A is dropped gracefully.


## 4.18.1
- Fixed the GitHub Pages base path: the web build now uses /CANA/ (matching the case-sensitive repo name) instead of /cana/. With the old value, the deployed Pages site and the in-app update-guide URL would have 404'd. The update guide URL (cana-lab.github.io/CANA/update-guide.html) now matches the deployed path exactly. (Electron build unaffected.)


## 4.18.0
- Added "Update repo from zip.command" — a double-click helper that safely syncs a freshly-unzipped new version into your GitHub repo folder. It mirrors the repo to the new version exactly (adds new files, updates changed ones, and removes files that were deleted between versions — the thing a Finder drag-and-replace can miss), while never touching .git, node_modules, dist, release, or your user data (which lives in the browser/app, not the repo). It picks the source folder via a dialog, asks for confirmation, stages the changes, and shows you exactly what changed before you commit — it never commits or pushes on its own.


## 4.17.0
- Reworked the update flow into a guided, browser-based installer:
  - "Check for updates" now finds the new version AND its .dmg download link directly.
  - "Download & install" opens a step-by-step guide page in your browser that AUTO-STARTS the download (no extra click), then walks you through: wait for download → open the .dmg → quit CANA → drag into Applications (Replace) → reopen. Each step is check-off-able.
  - Because the guide runs in your browser — a separate process from the app — it stays open the entire time CANA is quit and replaced. No more closing the app and losing your place.
- Honest limits (shown in the guide): updating never touches your saved data; the "drag to Applications" and the first-launch "unidentified developer" prompt are macOS security steps that remain until the app is code-signed/notarized. The guide is hosted at the GitHub Pages URL for the packaged app and ships alongside the web build too.


## 4.16.0
- Guaranteed navigation on every screen. Audited all pages an end user can reach and ensured each has a clear way out — a Home button always, plus Back where there is a parent screen. Closing and reopening the app is never required to get home.
- Specifically fixed the assessment "review" screen (the per-partner progress page), which previously had no Back or Home button and could strand the user. It now has Home (and the per-partner cards already provide the way forward).
- Added Home buttons to the assessment, letter, prepare, setup, settings, intro, and setup wizard screens for consistency.


## 4.15.0
- Brought the dashboard visuals onto the home screen. Once you have at least one completed assessment, the home screen now shows a rich "Your journey" preview card in the space below the chapters: the Overall-health ring gauge, the eleven-domain radar ("shape of your life together"), and Overall / Alignment / Drift tiles with sparklines and trend chips — all tapping through to the full dashboard.
- Replaced the thin fixed bottom strip with this larger, more inviting inline preview.


## 4.14.0
- Redesigned the dashboard with a modern health-app feel:
  - A circular "Overall health" ring gauge as the hero, color-coded by band (Flourishing → Needs care).
  - A radar/"shape of your life together" chart showing all eleven domains at a glance.
  - Stat tiles (Drift, Alignment, Overall) now carry inline sparklines and coloured ↑/↓ delta chips, so each shows its trend rather than just stating a number.
  - Domain Movement bars are now coloured by health band with smooth fill animation.
- Added one-click model download in Settings → Local AI. If Ollama is installed and running, CANA can pull the recommended model for you (with a live progress bar and cancel) — no Terminal required. Scoring still works fully without any of this.


## 4.13.0
- UX/UI and questionnaire-psychology improvements:
  - Removed the scale-type name (e.g. "AGREEMENT") shown above each question — the word labels under each option already convey the scale, and removing it reduces priming and visual noise.
  - Removed the inline "(reverse-scored)" tag from questions. Reverse-scoring is an internal mechanic; showing it invited answer-gaming. (Still explained in each question's info panel.)
  - Questions are now shown in smaller batches (up to 4 per screen) within each chapter, with "Part X of Y" markers. This reduces fatigue and stops earlier answers from visually anchoring later ones, for more honest, independent responses.
  - The progress indicator now reads "Chapter X of 11" alongside the count, framing progress as achievable chunks rather than a small fraction.
  - Moved the Intimacy & Sexual Union chapter to directly follow Marriage & Covenant (it is far more central to marital health than its previous late position, and is now answered while attention is freshest). In-Laws follows Children.
  - Added optional sentence-starter prompts to the Future Perfect letter, so a blank page is less intimidating — tap a starter to drop it in and finish the thought.
- Scoring, weights, and all results are unchanged; these are presentation and flow changes only.


## 4.12.0
- Added two new assessment chapters, each with biblical grounding and peer-reviewed research, plus plain-language help for every new question:
  - Intimacy & Sexual Union (1 Corinthians 7, Genesis 2:24-25, Song of Songs; Park et al. 2023, Schoenfeld et al. 2017, Mallory et al. 2022 meta-analysis). High weight (1.20); large partner gaps and low scores are flagged gently.
  - In-Laws & Extended Family (Genesis 2:24 "leave and cleave", Exodus 20:12; Fiori/Orbuch et al. 2021, 16-year Early Years of Marriage study). Baseline weight (1.00); spousal disagreement is flagged as the high-leverage issue.
  - Both chapters now contribute to scoring, gaps, flags, goals, and trends. The Introduction now describes eleven chapters and lists the new references.
- The Future Perfect letter can now be completed independently by each partner. Each partner does their own questions AND their own letter as one unit, in any order; your plan generates once both are done (previously the letters had to be written back-to-back after both questionnaires).
- Fixed: the "Back to home" button on the report-recovery screen no longer effectively logs you out. Your sign-in now persists for the browser session, so returning home (or an automatic recovery reload) keeps you logged in; a fresh launch still asks for sign-in.


## 4.11.1
- Fixed the blank, unexitable page reached via dashboard -> Open Report. The cause was an older saved report that lacks the full results data; opening it crashed the screen and took its exit button down with it. Opening such a report now shows a clear, recoverable message ("This report can't be opened") with working "Back to home" and "View past assessments" buttons. Newer reports are unaffected.
- Hardened the report screen so missing optional sections (letter comparison, goals) can never crash it.
- Added an app-wide safety net (error boundary): if any screen ever hits an unexpected error, you now get a "Return home" recovery page with your saved data intact, instead of a blank page.


## 4.11.0
- Added an automatic in-app safety backup. Whenever an assessment is completed, CANA quietly saves a safety copy of your reports and history (keeping the last 3). If a bug or accidental reset ever loses your data, you can bring it back with one click.
- Added "Restore from backup" in the check-for-updates area on the home screen, with a status line showing when the last backup was saved and how many reports it holds.
- Honest scope shown in the UI: this safety copy lives on this device only. It protects against in-app loss (bugs, resets), but NOT against clearing your browser data or moving to another computer — for that, "Save as PDF" on a report remains the durable backup.


## 4.10.1
- Fixed a serious bug where pressing "Quick Check-In" immediately erased your existing completed report. Starting any assessment now clears only the in-progress draft and never touches a previously completed report or the saved archive.
- A completed full assessment now never disappears: every completed assessment (full or check-in) stays in "Past Reports" on the dashboard, and a check-in only produces a new report once it is fully completed — starting one no longer changes the home screen or removes the last report.
- Fixed the blank, unexitable page reached via dashboard → open report in certain states. There is now always navigation: if a view has nothing to show, it offers "Back to home" and "View past assessments" instead of a dead end.
- A full data erase now correctly clears the saved report as well (since draft-reset no longer does).


## 4.10.0
- Every assessment question now has a plain-language explanation behind its info (ⓘ) button that answers, simply, "what is this question actually asking?" — written in everyday language, with the more academic rationale kept as secondary context. (All 91 questions covered.)
- The joint Vision and Mission now synthesize the actual evaluation, not just the letters: the local AI receives the couple's overall health, greatest strengths, areas most needing growth, widest gaps, and biggest tensions, and is instructed to weave them in — so the mission explicitly addresses real growth areas and tensions rather than staying generic. The deterministic fallback already reflects strongest/weakest areas.
- Continued the Introduction clarity pass: further smoothing for natural, coherent, easy-to-read language (e.g. framing partner differences as "where you see things most differently" rather than "disagree").


## 4.9.0
- Rewrote the entire Introduction for clarity and natural flow — every sentence reworked to be easier to read while keeping the same substance.
- Fact-checked every empirical claim in the Introduction against the published literature (Gottman's 5:1 ratio, the Four Horsemen and contempt as strongest predictor, repair as the key protective skill, and the Mahoney/Pargament sanctification research). All were verified as accurately stated; wording was adjusted to attribute the 5:1 ratio to Gottman's research generally and to scope it to conflict.
- Corrected an overstatement: the Introduction no longer says the domain weights, gap thresholds, and pattern flags are "anchored to published research." They are now described honestly as our own considered judgments, informed by the literature rather than taken directly from it (the research supports which areas matter, not the specific numbers chosen).
- Audited every assessment question's rating scale and reverse-scoring against its wording; all were found to fit correctly (no changes needed).


## 4.8.0
- Added an info (ⓘ) button to every headline metric in the dashboard (Overall Health, Value Alignment, Mission Drift), and to the new bottom strip. Each explains: what the metric means, exactly how it is computed (the real methodology), and an interpretive scale for what different values tend to indicate. The explanations are honest that these are self-rated reflections, not clinical measurements, and are NOT compared against other couples (no fabricated population norms).
- Added a persistent quick-overview strip at the bottom of the window showing Overall, Alignment, and Drift at a glance, with an "Open dashboard" shortcut. Shown once you have at least one saved assessment.
- New shared metric-explanation module (metrics.js) with interpretive score bands (Flourishing / Healthy / Mixed / Strained / Needs care) and gap bands (Aligned → Major difference) used consistently across the app.


## 4.7.0
- New "Start the conversation" button at the end of the report. It generates a guided discussion: a summary of strengths, honest growth areas, and what the overall picture means, followed by 5-7 targeted open questions aimed at the couple's biggest divergences and at moving toward greater alignment. Uses the local AI when available, with a full deterministic fallback when it isn't. The guide is printable as its own PDF.
- Fixed the "Email report" button: mailto links were being blocked by the desktop app's external-link handler, so nothing opened. The mail app now opens with the report prefilled.
- PDF export now keeps each chapter/section together on a page instead of splitting it across a page break (per-domain rows and conversation cards stay intact); headings are no longer stranded at the foot of a page.


## 4.6.0
- The local AI (Ollama) now also personalizes the 1/5/10-year goals — grounded in the couple's real scores and shared dreams — in addition to the vision and mission. If the AI is unavailable or returns anything malformed, the proven deterministic goals are kept unchanged.
- The report no longer silently falls back: when the AI was not used it shows a clear banner explaining exactly why (check-in mode, AI turned off, or Ollama not running) with "Set up the local AI" and "Regenerate with AI" actions. Generation now checks Ollama liveness directly at run time rather than relying on a possibly-stale status.
- Added "Email report" at the bottom of the report: opens your mail app with the full plan prefilled to your account email. A local app can't send mail itself, so you review and send it — nothing is transmitted by the app. If a mail client shortens a long report, "Save as PDF" and attach is suggested.
- Scores, gaps, pattern flags, and tensions remain fully deterministic and reproducible — the AI writes prose only, never the numbers.


## 4.5.0
- Added a local multi-profile login so multiple couples can share one device, each with their own private space. Create an account (both names, email, password) or sign in; login is required each launch. All data (draft, sessions, archived reports, results) is namespaced per profile, and a "Sign out" control returns to the login screen.
- Passwords are stored only as a salted SHA-256 hash (never plaintext). HONEST SCOPE, stated in-app: this is on-device privacy separation, not server-grade authentication — it keeps couples' data separate and gates access, but is not a secure vault and is not marketed as such.


## 4.4.0
- Every completed assessment is now permanently archived as a full, reviewable report — not just trend metrics. Each saved session stores the complete report (vision, mission, goals, tensions, per-chapter detail) plus the partners' names.
- New "Past Reports" list on the dashboard: every past assessment by date, each with "Open report" to reopen the full results window exactly as generated. Reports are never auto-deleted (only a full reset clears them).
- Reviewing a past report opens it read-only (vision/mission locked, weight adjustment hidden) with a "Done reviewing" exit, so history can't be accidentally altered.


## 4.3.4
- The generated results report now persists to disk (covenant_results_v1), so it survives quitting/reopening the app and upgrading versions. After a restart, "View latest results" (home screen) and "Results" (dashboard) reappear and open the saved report. Starting a fresh assessment or resetting clears the saved report. Also: macOS build is now arm64-only (fixes the hdiutil detach failure when building two architectures in one run).


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
