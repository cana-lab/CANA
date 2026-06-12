# Changelog

## 4.54.0
- iOS UI feedback round 2:
  - **Answer scale fully visible on phones**: the 0–4 / 6–10 halves now stack as two rows on narrow screens (CSS media query at ≤600px) instead of one 10-chip row that ran off the right edge — chips 6–10 were unreachable since 4.49.1 clipped horizontal overflow. Wide screens keep the side-by-side layout.
  - **"?" icon un-squeezed** on the About-this-Chapter button (fixed 20px circle, flexShrink 0 — long label text was compressing it).
- **Skip chapter**: a new subtle button in every assessment chapter marks all of that chapter's questions Not applicable for the current partner (with confirmation) and advances. N/A answers are excluded from scoring by the engine, so a skipped chapter never distorts results — it is simply absent. Works in full assessments and check-ins, per partner; the chapter pills allow returning later.
- **Native iOS share sheet for the encrypted transfer**: new ShareFilePlugin (UIActivityViewController). "Export to share" on iPhone now opens the system sheet — **AirDrop directly to the other iPhone**, save to Files, or send via Mail/Messages. The file is passphrase-encrypted before it reaches the plugin. This replaces the blob-anchor path that WKWebView silently swallowed, and completes the same-account-on-two-iPhones flow: export on phone 1 → AirDrop → import on phone 2 → sign in with the same credentials (the encrypted file carries the account).
- Architecture note (SwiftData/CoreData question): local persistence frameworks don't sync across devices by themselves; cross-device sync would mean CloudKit, which (a) only spans ONE Apple ID's devices — not two partners' iPhones — and (b) would put couple data in Apple's cloud, breaking CANA's core "no cloud" promise (privacy label, review notes, README). The encrypted device-to-device transfer IS the designed mechanism for this use case and is now genuinely usable on iOS.
- Verified: 41/41 tests; web/electron bundles build; Capacitor sync clean; full Xcode simulator build with the new Swift plugin SUCCEEDS. On-device: test export → AirDrop → import in TestFlight build 19.

## 4.53.0
- **Oxygen over time.** The trend dashboard now charts the oxygen telemetry across sessions: a solid green Supply line (time, rest, balance) against a dashed Demand line (vision, growth, calling) — breathing room is visibly the space between them. Data points are colored by that session's state (green/amber/red). Sessions store the telemetry from now on; older sessions are skipped on the chart, never faked.
- **Oxygen on the home screen.** The dashboard preview's tile row gains an Oxygen tile: current supply value, a miniature tank with the dashed demand mark, and the state label — the freshest reading from your latest session, visible the moment you open the app.
- Verified: 41/41 tests (new: snapshots carry rounded telemetry; trends chart exactly the sessions that have it, legacy sessions skipped); all three bundles build clean.

## 4.52.0
- Quick Check-In now includes the six Oxygen-check items (f12 family calling, m16 mutual growth, m5 shared vision · v3 work-life balance, b7 rest/sabbath, m4 time together) alongside the 11 per-domain anchors — 17 questions total, still a five-minute format. Every check-in report therefore carries a **fresh Oxygen-check card**: the supply side (time, rest, balance) is exactly what shifts week to week, while demand moves slowly — which makes the check-in the natural place to read the tank.
- Implementation: the six items carry a `checkin` flag in the engine; the check-in filter is `core || checkin`. Anchor logic (CORE_QUESTIONS) untouched; full assessment unchanged.
- Docs updated (TREND_ANALYSIS: 17 questions; methodology export now marks each question's check-in role as "anchor" / "oxygen").
- Verified: 40/40 tests (new: check-in set is exactly 11+6, and answering only those 17 yields a complete oxygen reading); all three bundles build clean.

## 4.51.0
- New "Oxygen check" card on the report (Apple/SpaceX-instrument style): a vertical tank whose fill level is the couple's **Supply** (couple-mean of time together m4, rest/sabbath b7, work-life balance v3) with a **dashed marker line showing where the oxygen level needs to be** — the **Demand** (couple-mean of shared vision m5, mutual growth m16, family calling f12). Telemetry row shows Supply / Demand / signed Margin plus a state pill: Breathable (green), Narrow margin (amber, demand exceeds supply by ≥ 3), Thin air (red — exactly the 4.50 imbalance-flag threshold). State color appears only in the fill and the pill; the rest of the instrument stays quiet.
- Engine: new exported `computeOxygen(answersA, answersB)` — ONE source of truth for both the card and the "Resource/Expectation Imbalance" flag (the flag's previous inline computation was refactored onto it; thresholds unchanged and covered by the existing tests). The oxygen telemetry is part of analytics and of the saved report, so archived reports render their own historical state; pre-4.51 archives simply omit the card.
- The card renders whenever all six items were answered by both partners (always-on instrument, not only an alarm) — calm confirmation is also information.
- Verified: 39/39 tests (5 new: thin-air exactly at threshold, narrow/nominal boundaries, incomplete-data handling, analytics→plan flow equals flag data); all three bundles build clean.

## 4.50.0
- Core-engine calibration: research-anchored weighting and pattern logic (Investment Model, suffocation model, sanctification research). Every adjustment is TRANSPARENT — unadjusted values are kept and a report flag discloses each application. Per-partner views and gaps always stay raw.
- New scoring mechanics:
  - **Per-item weights** inside domain means. Appreciation (m9) carries w=2 in Marriage (top-tier predictor: Gottman positivity ratio, gratitude research). Faith is tilted **70/30 toward proximal sanctification**: the three couple-level items (f8 sacred marriage, f12 family calling, f13 spiritual intimacy) carry 70% of the domain's internal mass vs. the eleven individual/congregational items (Mahoney: marriage-specific religiousness outpredicts distal markers like attendance). NOTE — the instruction listed m8/m16 as faith-proximal items; they live in Marriage and already feed it (and the Cord trigger), so counting them in Faith too would double-count. The faith-internal trio is the faithful implementation.
  - **"Threefold Cord" bonus** (Eccl. 4:12): couple-mean of f8+m8 ≥ 7.5 → Marriage score ×1.2, capped at 10, disclosed via a STRENGTH flag carrying the unadjusted value.
  - **Spiritual-divergence calibration**: Faith gap ≥ 3.0 → 15% adjustment to the shared Faith score, disclosed inside the existing "Spiritual Misalignment" flag ("the gap itself is the finding — an invitation to a conversation, not a verdict").
  - **"Oxygen Check"** (Finkel's suffocation model): couple-mean expectations (f12, m16, m5) ≥ 8.0 AND couple-mean resources (v3, b7, m4) ≤ 4.0 → new "Resource/Expectation Imbalance" flag. Flag only, no score impact.
- **"A practice for this season"** — one deterministic, band-based recommendation on the report:
  - Thriving (≥8.0): the 7-minute conflict-reappraisal writing exercise, three times a year (Finkel et al. 2013).
  - Healthy/Developing (5.0–7.9): ~90 min/week of genuinely novel shared activity (Aron's self-expansion research) plus daily benevolent prayer for the partner (Fincham & Beach).
  - At-Risk (<5.0): relationship-movie-and-talk, 1–2×/month (Rogge et al. 2013 RCT — halved early divorce/separation rates, on par with intensive programs).
  - **Safety trigger**: severe self-reported contempt (raw m15 ≥ 7, either partner) REPLACES all self-help with a calm pastor/licensed-counselor referral recommendation. Correction to the instruction: m15 measures *expressed* contempt by self-report ("I feel contempt…"), not received contempt; the trigger fires on either partner's report.
- **Investment Model coverage — with one deliberate deviation**: two new Marriage items, m19 (investment size: "We have built so much together…") and m20 (commitment/future we-ness: "I cannot imagine my future apart from my spouse"). A direct "quality of alternatives" item was **NOT** added: asking partners to rate the attractiveness of alternatives primes exactly the contract-thinking the instruction's own guardrail #4 (covenant over contract) forbids, and Rusbult's commitment construct carries the same predictive content positively framed. 113 → 115 questions; plain-language help added for both.
- Honest-framing guardrail on the report: "CANA measures your *perception* of the relationship, not necessarily your behavior. Gaps are an invitation to a conversation, not a verdict."
- Methodology export updated (weight column, calibration steps 11–16) and regenerated.
- Verified: 34/34 tests (8 new calibration tests: weight effects, cord trigger+cap+disclosure, divergence penalty math+disclosure, oxygen on/off, band→practice mapping, contempt referral override); all three bundles build clean. Old archived reports without the new fields render unchanged (practice card simply absent).

## 4.49.1
- iOS polish round from first on-device TestFlight feedback:
  - **Sign out is now visible**: a header button on the home screen (it previously existed only as a 12.5px text link buried at the very bottom of the page — technically present, practically undiscoverable on a phone).
  - **No more sideways wiggle**: the app could be dragged slightly left/right (an off-screen overflow let WKWebView pan horizontally). `overflow-x: hidden` + `overscroll-behavior-x: none` on html/body kill horizontal panning on every platform.
  - **No pinch-zoom rubber-banding**: the iOS bundle now ships a fixed viewport (`maximum-scale=1, user-scalable=no`) for a native-app feel. Deliberately iOS-only via the per-target build transform — the web build keeps a zoomable viewport for accessibility.
  - **Top spacing fixed**: the gap between the status-bar header and the headline was the desktop padding (60px) on a phone; iOS now uses 20px.
  - **Diagnostic log card hidden on iOS**: a save-a-file flow has no natural home on iPhone and TestFlight carries its own crash reporting. The local log still records silently (support can still ask for it later); Mac/web keep the card.
- New scripts/export-methodology.mjs: generates a single self-contained methodology reference (all 113 questions, 10 response scales, weights, scripture anchors, scoring math step by step, the four research docs verbatim, and the scoring source as ground truth) — extracted LIVE from engine.js so it cannot drift from shipped code. Written for external deep-review tools (NotebookLM).
- Verified: 27/27 tests; web/iOS bundles build; per-target checks pass (iOS bundle has fixed viewport + connect-src 'self'; web bundle unchanged). On-device verification of the four UI fixes: TestFlight build 14.

## 4.49.0
- iOS: "Remember password" now works on the iPhone, stored in the **iOS Keychain**.
  - Honest background: WKWebView apps never get Safari's "save this password?" sheet — the app runs on capacitor://localhost, not a real domain, so iCloud-Keychain autofill cannot attach. The only proper way is native Keychain storage, which this release adds via a small Capacitor plugin (ios-plugin/CredentialsPlugin.swift): kSecClassGenericPassword, WhenUnlockedThisDeviceOnly (device-only, never synced — matching the app's "stays on this device" model).
  - Same UX as the Mac: checkbox on the sign-in screen, autofill with a "✓ Filled from your iOS Keychain" note, stale entries discarded on failed sign-in, unchecking forgets. **Defaults ON on iOS** (a phone is a personal device) and stays OFF by default on the Mac (possibly a shared family machine).
  - New src/credentials.js unifies the two backends (Electron safeStorage on Mac, the native plugin on iOS); the web build shows no option since neither exists there. Sign-in screen copy is now platform-aware.
- Verified: 27/27 tests pass; web + electron bundles build; Capacitor sync clean; **full Xcode simulator build of the new Swift plugin succeeds** (registered in the pbxproj alongside FoundationAIPlugin). NOT verified from this environment: the actual Keychain round-trip on a physical iPhone — test in TestFlight build 12: sign in with the box checked, kill the app, reopen → the password field should fill itself.

## 4.48.2
- Export/import, third and final round. 4.48.1's passphrase dialog was correct but mounted on the wrong screens: it rendered on the sign-in and Settings screens, while the "Move your data to another device" card (with the Export/Import buttons) lives in the WELCOME screen's footer. Clicking Export set the dialog state and then waited forever for a dialog that was never rendered — silently, with zero errors (which is exactly what the user's empty diagnostic log showed: the 4.48.1 fix had stopped the throwing, but nothing appeared). The dialog is now mounted on all three screens that can trigger a transfer: welcome, sign-in, Settings.
- Verified: 27/27 tests, all three bundles build clean. The remaining proof is the human click test on this build.

## 4.48.1
- The REAL fix for "Export to share" doing nothing on Mac. 4.47.3 fixed the file-save layer, but execution never got there: both transfer flows started with `window.prompt()` for the passphrase — **and Electron does not implement `window.prompt`** (it throws immediately; the throw happened outside the try/catch, so the button appeared dead). The diagnostic log's recorded entries on the affected Mac were exactly these throws — the local crash log did its job.
- Export AND import now use a proper in-app passphrase dialog (modal, masked input, Enter/Escape, Cancel) on every platform — web, Mac, iOS behave identically, and the modal replaces the ugly native prompt on the web too.
- Settings screen now renders toasts. Previously the success/error toasts after export/import were only mounted on the welcome screen, so even a working export gave no feedback where you clicked it.
- Verified: 27/27 tests pass; all three bundles build clean. The dialog + native save panel round-trip needs the human click test in the packaged app (this build).

## 4.48.0
- Mac: optional "Remember password in this Mac's Keychain" on the sign-in screen.
  - Opt-in checkbox (deliberately unchecked by default — CANA is a couples' product that may live on a shared Mac). When checked, the profile password is encrypted with Electron's safeStorage, whose key lives in the **macOS Keychain** — only this macOS user session can decrypt it. Unchecking the box and signing in removes the stored password again.
  - When a known email is entered (or there is exactly one account on the device), the password field fills itself from the Keychain, marked with "✓ Filled from your macOS Keychain".
  - A remembered password that no longer matches (e.g. changed via transfer/import on another device) is discarded automatically on the failed attempt, with a clear message — no dead end.
  - The honest-scope note on the sign-in screen now states the consequence: with a remembered password, anyone in this macOS session can open CANA without typing it.
  - Storage: encrypted blobs in the app's user-data folder (mode 0600), keyed per account email; never in the repo, never synced, never transmitted. The PBKDF2 verification hash in localStorage is unchanged and unrelated.
- Web and iOS are unchanged (the checkbox appears only where the Keychain-backed store exists — the packaged Mac app). iOS gets its native equivalent together with the planned share-sheet export fix, pending TestFlight verification.
- Verified: 27/27 tests pass; web + electron + iOS bundles build clean; main/preload parse clean. NOT verified from this environment: the actual Keychain round-trip in the packaged app (needs a human: tick the box, quit, relaunch, see the field fill itself).

## 4.47.3
- Fixed "Export to share" doing nothing in the packaged Mac app. The export (and the diagnostic-log save) used the browser's invisible-`<a download>` blob trick, which a packaged, file://-loaded Electron window silently swallows. Both now use a **native macOS save panel** (new `cana:save-file` IPC: main process shows `dialog.showSaveDialog` and writes the file; renderer falls back to the blob anchor on the web). Cancelling the dialog is treated as a no-op, success shows the usual toast.
- Honest scope note: the same `<a download>` mechanism is what the iOS app uses for "Export to share" — it is likely equally inert inside WKWebView on a real iPhone (listed since 4.37 as "not verifiable in sandbox"). To be verified in TestFlight; if confirmed, the iOS fix is a native share-sheet via the Capacitor Filesystem/Share plugins, tracked as the next iOS item.
- Verified: 27/27 tests pass; electron renderer + main/preload build and parse clean. NOT verified from this environment: the actual save dialog interaction (needs a human click in the packaged app — please test after updating).

## 4.47.2
- Ollama / AI setup documentation pass (the in-app wizard was already current; the written guides around it were not):
  - docs/LLM_SETUP.md: removed an outdated claim that pointing the app at a non-localhost endpoint merely requires editing the CSP — in reality `src/llm.js` hard-refuses any non-loopback endpoint and there is no supported way to use a remote AI service. The privacy note now describes both enforcement layers (code + CSP, incl. the stricter iOS CSP). Model recommendations now match the in-app wizard (llama3.1:8b / llama3.2:3b / gemma2:2b instead of stale qwen suggestions); pointed readers to the no-Terminal in-app wizard first; added the iOS note (Apple on-device model, nothing to set up).
  - public/guide.html (the "How to install & use" page on the website):
    - Download section rebuilt: two direct download buttons (Apple Silicon / Intel) that resolve the latest .dmg from the GitHub API — replacing the manual "open releases page, find Assets, look for .dmg" walkthrough, its stale 4.23.0 example filename, and the WRONG claim that CANA only ships for Apple Silicon ("if you have an Intel Mac, let the developer know" — Intel builds ship since 4.46.1). Buttons fall back to the releases page if GitHub is unreachable.
    - Removed all 19 "📷 Screenshot needed" placeholder boxes — an unfinished look on a public page. (Real screenshots can be added later; the steps stand on their own.)
    - Removed the Google Fonts embed (the only third-party request on a page whose core message is "nothing leaves your device"); typography falls back to the system serif stack.
    - Added a "signed & notarized" note in the download section. The Ollama part (Part Six) was checked and left as-is — it matches the current in-app flow.
- Verified: 27/27 tests pass; web build clean; guide.html ships in the web build with both buttons and zero placeholders/Google-Fonts references. Live Pages deployment verified after push.

## 4.47.1
- Update guide page (the one the in-app "Download & install →" opens in the browser) rebuilt:
  - Two explicit download buttons — **Apple Silicon** and **Intel** — instead of one generic link, with an "About This Mac" hint for choosing. Clicking a button starts the download directly.
  - The page is now self-sufficient: if it isn't handed download links by the app, it looks up the latest release on the GitHub API itself. Previously it depended entirely on query parameters; opened without them it showed "Couldn't find a direct download link" and the "releases page" link pointed at `#` (a dead link). The releases link is now hardcoded as a real URL and always works.
  - Copy updated for the app's signed + notarized status: the old "macOS may say it's from an unidentified developer — right-click → Open" instructions are gone (that flow no longer happens); replaced with a "signed and notarized — opens with a normal double-click" note.
- update.js: a release now ships one .dmg per architecture, but the update check picked the FIRST .dmg it found — handing Intel users the arm64 build. It now extracts both (`dmgArm64Url` / `dmgX64Url`) and the app passes both to the guide page (`arm` / `x64` params; the legacy `dmg` param remains for older deployed pages).
- GitHub repository cleanup:
  - Deleted the 8 obsolete releases from the ZIP-development era (v4.3.2 … v4.26.0) and their tags — they carried unsigned .dmgs that would not open on other Macs and predate the signed release line. The repo now shows exactly one release: v4.47.0 (signed + notarized). Code history is untouched.
  - Deleted the stray typo tag `Type_V4.3.2`.
  - Repo profile: description updated, homepage set to the GitHub Pages demo, unused Projects tab disabled.
  - README: CI / latest-release / license badges added.
- Verified: all unit tests pass; web build clean and the rebuilt guide page ships in it (app bundles continue to exclude it). NOT verified from here: the live GitHub Pages deployment (happens via Actions on push — checked after pushing).

## 4.47.0
- Pre-release audit pass: repository cleanup, security hardening, documentation truth-pass, and a render smoke test. No user-visible feature changes.
- Removed (redundant/outdated):
  - "Build CANA app.command" — the old UNSIGNED build launcher, superseded by "Build signed Mac app.command". Keeping both was a trap: running the old one produced .dmgs that won't open on other Macs (and it was the launcher behind the recent failed-build report).
  - "Update repo from zip.command" — belonged to the abandoned chat/ZIP development workflow.
  - A stray empty package-lock.json one folder above the repo, and local .DS_Store noise.
- Security hardening:
  - iOS bundle now ships a stricter CSP: `connect-src 'self'` only (desktop keeps localhost-Ollama + api.github.com). On iOS the AI is a native Apple-model call and updates come from the App Store, so the WebView needs no network origin at all. Implemented as a Vite per-target transform; verified in the built dist-ios/index.html.
  - The remaining three unguarded Ollama fetchers in llm.js (listModels, installedModels, pullModel) now hard-stop on iOS, same as chat()/ollamaRunning(). "iOS makes zero localhost calls" no longer depends on UI gating — every network function in the module enforces it.
  - Electron: window.open is now denied unconditionally (web links open in the system browser); previously popups to localhost were allowed, which nothing used. Top-level navigation is blocked except file:// (and the Vite dev server in dev runs).
  - GitHub-Pages-only help pages (guide.html, update-guide.html) are no longer shipped inside the Electron and iOS app bundles — update instructions about downloading .dmgs don't belong in a packaged app, and guide.html loads Google Fonts, which only the public website should do.
  - Audit greps came back clean: no hardcoded secrets, no eval/dangerouslySetInnerHTML/innerHTML in app code, no console.log leftovers, no non-localhost http:// references, no unsafe target="_blank", no postMessage surface. Import path reviewed: no deep-merge (no prototype-pollution vector), imported data lands only in namespaced localStorage keys, React escapes all rendered values.
- Documentation truth-pass (docs previously described an older product):
  - README.md rewritten: 11 domains (was "nine"), real network posture (the old text claimed `connect-src 'none'`), current platforms/launchers/build matrix, current scale design, honest-scope section retained.
  - CONTRIBUTING.md: network non-negotiable updated to the real allowlist policy.
  - docs/PRIVACY.md + ARCHITECTURE.md: CSP sections now show the actual policy incl. the stricter iOS variant; removed a service-worker/PWA description for a service worker that does not exist; documented the local-AI layer.
  - docs/TREND_ANALYSIS.md (113 questions / 11 domains), docs/cana_foundation.md (eleven domains), docs/PACKAGING.md (signed launcher + latest-mac.yml), docs/UPDATES.md (electron-updater mechanism with Squirrel.Mac signature verification).
- package.json: added author/homepage/repository (electron-builder warned "author is missed"); description updated to cover all three platforms.
- V&V:
  - New App render smoke test mounts the real App in jsdom — the class of render-order crash this repo shipped twice (CHANGELOG 4.37.0) is now caught by CI. Suite: 27/27 green.
  - All three bundles build clean; verified in the artifacts: iOS CSP is 'self'-only, web CSP unchanged, guide pages present in web build and absent from iOS/Electron bundles; plugin copies (ios-plugin/ vs ios/App/App/) verified identical.
- Not verifiable here (unchanged list): real notarized build, Squirrel.Mac update handoff, Xcode device build, App Store review outcome.

## 4.46.1
- Mac packaging: switched from a single "universal" .dmg to two per-architecture .dmgs (arm64 + x64). The universal target was failing in `@electron/universal` with "Can't reconcile two non-macho files package.json" — a known mergeASARs limitation. The split also halves the download size for users (a Mac downloads only the .dmg for its CPU). `latest-mac.yml` lists both, so electron-updater on Apple Silicon picks `-arm64.dmg` and on Intel picks the unsuffixed `.dmg` automatically. Verified locally with an unsigned packaging run: both .dmgs build cleanly and `latest-mac.yml` is correctly populated with sha512 hashes for both files.
- Welcome screen: the lead text said "Everything runs on your Mac" even when running as the iOS app. Now reads "your iPhone" on iOS and "your Mac" on desktop. (Settings, methodology, and the Ollama-setup screen were already platform-gated; this was the only Mac-specific line still showing on iOS.)

## 4.46.0
- Electron upgraded from 32 → 42 (current stable). With this bump all 17 Electron-specific advisories that npm audit had flagged are gone — the remaining 8 advisories are entirely in dev-only build tooling (electron-builder transitive tar, vite/esbuild dev server), nothing that ships in the user-facing binary. The main.cjs / preload.cjs APIs we use (BrowserWindow, ipcMain.handle, Menu.buildFromTemplate, shell.openExternal, app lifecycle) are unchanged across this range, so no application code had to move.
- Settings → update banner: native UX redesign for the electron-updater flow.
  - **Checking**: small inline status while the GitHub release index is fetched.
  - **Update available**: app name + version + optional collapsed release notes; primary "Download update" button triggers the background download.
  - **Downloading**: live progress bar with percent, with a note that the app keeps working.
  - **Ready to install**: "Restart & install" + a "Install on next quit" deferral, with explicit copy that Apple has verified the new version's signature (Squirrel.Mac signature check).
  - **Up to date / error / unconfigured** states keep the previous one-line treatment.
  - The web-fallback "Download & install →" path (used by the GitHub Pages demo where no native installer exists) is preserved unchanged.
- Verified: 26 unit tests pass; web + electron + iOS web builds clean; `electron --version` reports 42.4.0; all Node-side scripts parse clean. NOT verified: real Squirrel.Mac install handoff (needs a signed/notarized previous version on disk and a new release in `cana-lab/CANA`), iOS device build.

## 4.45.0
- Auto-update (macOS): integrated electron-updater with Squirrel.Mac. The packaged Mac app now silently checks GitHub Releases for a new version 5s after launch and surfaces a banner in Settings if one is available. Downloads happen in the background only after the user clicks "Download & install"; **Squirrel.Mac verifies the new .dmg's code signature against the running app's signature before installing**, so only updates signed with the same Developer ID can replace the current binary. That signature check is the integrity guarantee the old open-the-GitHub-page flow did not have.
  - New IPC channels (`cana:update-check / -download / -install`) and a JS subscription (`subscribeUpdateStatus`) push lifecycle events (`checking / available / downloading / downloaded / error`) into the UI live.
  - electron-builder publish config now points at the `cana-lab/CANA` GitHub repo, so `pack:mac` produces both the `.dmg` and the `latest-mac.yml` the updater reads.
- Electron upgraded from 31 → 32 (latest in the 32.x line). Resolves the Electron ASAR-integrity-bypass advisory and several other moderate-severity issues. *Honest scope*: Electron 42 is the current stable; 11 further advisories require additional major bumps and are tracked as an open item for the post-beta hardening pass. With sandbox:true + contextIsolation:true (already in place), the actual exploitability of the remaining issues against CANA is small.
- Local crash diagnostics (no telemetry):
  - New `src/crashLog.js` writes the last 25 React render errors and uncaught JS errors/promise rejections to localStorage, with timestamps, version, and platform. **Nothing leaves the device.** No Sentry, no PostHog, no fetch.
  - ErrorBoundary now offers "Save diagnostic log" alongside "Return home" — saves a JSON file the user can email to support if they choose.
  - Settings → new "Diagnostic log" card exposes Save / Clear and the entry count. Privacy promise explicit in the UI copy.
- App.jsx split: **bewusst aufgeschoben.** The file is 2872 lines as a single component. Splitting it without UI tests in place is the kind of refactor that has crashed all platforms before in this repo (CHANGELOG 4.37.0). The right sequence is (a) Playwright or Vitest-browser tests for the main flows first, then (b) screen-by-screen extraction. Tracked as a post-beta task.
- Verified: all 26 unit tests pass; web + electron + iOS web builds clean. NOT verified (out of this environment's reach): real Squirrel.Mac update flow with a signed/notarized build, electron-updater behavior on first install vs. update, real iOS device build with the updated bundle.

## 4.44.0
- Release-readiness pass for App Store / TestFlight, plus the project hygiene the chat-based workflow had left half-finished. Code behavior is unchanged for end users; what shifted is *how the app is built, signed, tested, and released*.
- iOS — App Store blockers fixed in source:
  - `UIRequiredDeviceCapabilities = ["arm64"]` (was `["armv7"]`, a leftover from the Capacitor template that contradicted iOS 16 and would trip the validator).
  - Added `PrivacyInfo.xcprivacy` (Apple privacy manifest, required for new submissions since May 2024): declares no tracking, no data collected, only the Required-Reason API UserDefaults under CA92.1 (app's own data).
  - Declared `ITSAppUsesNonExemptEncryption=false` in Info.plist (standard auth crypto exempt under EAR §740.17(b)(1)) — Apple no longer asks at upload time.
  - Declared `WKAppBoundDomains=[]` to make the existing `limitsNavigationsToAppBoundDomains` setting explicit.
  - Normalized `IPHONEOS_DEPLOYMENT_TARGET` to 16.0 across all configurations (the file had a stale 13.0 at project level and 16.6 at target level).
- Versioning is now a single source of truth: `package.json` `version` is the only place a human edits it. A new `scripts/sync-versions.cjs` patches `MARKETING_VERSION` (and bumps `CURRENT_PROJECT_VERSION` on iOS builds) before each platform build. Mac users will no longer see "Version 1.0" in iOS Settings while the web layer says 4.44.
- iOS project layout: the entire `ios/` folder is now committed (Info.plist, pbxproj, PrivacyInfo, plugin sources). Only `ios/App/Pods/`, `ios/App/App/public/` (cap-sync output), and `xcuserdata` remain ignored. Previously the whole `ios/` directory lived only on the developer's Mac, with one stray plugin file accidentally force-committed.
- macOS — Electron security hardening:
  - Renderer now runs with the Chromium sandbox ON (`sandbox: true`). The previous `sandbox: false` was justified with "needs localhost reach", which was incorrect — the sandbox does not block outgoing HTTP. With contextIsolation + nodeIntegration off, sandbox-on is the documented best practice.
  - Removed `com.apple.security.cs.allow-unsigned-executable-memory` from the hardened-runtime entitlements. Modern Electron only needs `allow-jit`; the extra entitlement was a common audit finding.
- Tests + CI:
  - Added Vitest with 26 smoke tests covering the pure modules: `engine.js` (edge cases the 4.32.0 hardening was claimed to fix — empty/all-NA, 1-domain, NaN-overall), `auth.js` (PBKDF2 round-trip, wrong-password rejection, cross-device import non-duplication), `transfer.js` (AES-GCM round-trip, wrong-passphrase, tamper, foreign-file rejection). These pin claims that previously lived only in the CHANGELOG.
  - Added `.github/workflows/ci.yml`: on every push and PR, runs `versions:check` + tests + all three platform bundles + an unsigned electron-builder pack on macOS-runner. A fresh checkout on someone else's machine now has to actually work.
- Source hygiene:
  - `CLAUDE.md` added to the repo root so future Claude Code sessions inherit the project rules without a re-paste.
  - CHANGELOG had two separate `## 4.33.0` entries; merged them.
- Not in this release (open items): `electron-updater` with signature verification (separate, ~half-day), Electron 32 major bump, App.jsx code-splitting, opt-in crash reporting. Each is its own decision.
- Verified: all 26 unit tests pass; web + electron + iOS web builds clean; `plutil -lint` passes for Info.plist + PrivacyInfo.xcprivacy. NOT verified (out of this environment's reach): real Xcode compile of the iOS project with the new pbxproj entries, real Apple notarization run, real iOS device build.

## 4.43.0
- Chapter tiles are now uniform height across the grid, so one-line and two-line titles ("Faith & Calling" vs "Intimacy & Sexual Union") line up evenly. Icon sits top, title aligns to the bottom. macOS, web, and iOS.
- Mac distribution is now signing- and notarization-ready, so a GitHub-released .dmg opens on any Mac with a normal double-click (no "app is damaged", no Terminal for end users):
  - Hardened runtime + entitlements (build/entitlements.mac.plist), universal binary (Apple Silicon + Intel), afterSign notarization hook (scripts/notarize.cjs via @electron/notarize).
  - New double-click launcher "Build signed Mac app.command": on first run it stores your Apple ID, Team ID, and app-specific password in the macOS Keychain (never in the repo), then builds + signs + notarizes + staples in one step. Later releases are one double-click.
  - One-time setup documented in SIGNING_AND_NOTARIZING.md (certificate, app-specific password, Team ID, GitHub release steps).
- Note: signing/notarization runs on your Mac with your Apple credentials and could not be executed in this build environment — the config, hook, and launcher are verified for syntax and the web/iOS/electron bundles build clean, but the actual signed .dmg must be produced on your Mac via the launcher.

## 4.42.0
- iOS: the top header now respects the status bar (safe-area inset + viewport-fit=cover), so the time, Wi-Fi and battery stay readable instead of being overlapped by app content.
- Chapter tiles: removed the visible button frame that appeared when the tiles became tappable. The tiles look exactly like the original cards again (no outline/background box) while still opening the summary on tap. Applies to macOS, web and iOS.
- Verified: all 3 builds clean; web + iOS render clean; safe-area + button reset present in the iOS bundle.

## 4.41.0
- Reverted to the original tree artwork (the geometric placeholder was removed) and fixed only the icon sizing: the app icon is now full-bleed for recent macOS (Tahoe / 26), filling the whole square instead of sitting in a smaller rounded inset. Regenerated build/icon.icns and all public/icon-*.png plus an opaque public/AppIcon-1024.png for iOS.
- Note: the original tree was sourced from the internet and remains a copyright risk; it is a placeholder until a graphic designer supplies original artwork. See ICON_SETUP.md. Do not submit to the App Store with this artwork as-is.
- Verified: all 3 builds clean; web + iOS render clean; icon opaque (no alpha).

## 4.40.0
- New, original app icon and brand mark. The previous oak was traced from an image found online (a copyright risk); the new oak is generated geometrically from code — recursive branches, an organic crown of merged circles, and roots — and is not derived from any external image. The old traced path was removed from the source.
- Full-bleed icon for the new macOS (Tahoe / 26), which applies the rounded-corner mask itself and expects the artwork to fill the whole square. The icon now fills edge to edge instead of sitting in a smaller rounded inset. Regenerated build/icon.icns and all public/icon-*.png, plus an opaque, no-transparency public/AppIcon-1024.png for the iOS App Store icon. See ICON_SETUP.md for the one-time Xcode step.
- Verified: all 3 builds clean; web + iOS render clean; icon is fully opaque (no alpha); old traced artwork fully removed.

## 4.39.0
- Chapter tiles on the welcome screen are now buttons: tapping one opens a summary window for that chapter (concise overview + biblical grounding, further reading, what the research says, and the anchor verse). Tiles themselves stay clean (icon + title + an ⓘ hint).
- Direct device switch without pre-creating an account: the encrypted export now also carries your account (email + password credentials, inside the encrypted blob — never in cleartext). On a fresh device, "Coming from another device? Import your data" on the login screen recreates the same account automatically and signs you in — same email and password as before. If you're already signed in, import still just replaces the current profile's data.
  - Honest scope: this is still a one-time copy, not live sync. Changes made afterward on one device don't appear on the other until you export/import again. Re-importing an existing account doesn't duplicate it.
- Verified: full account export->import->sign-in flow incl. wrong-password rejection and no-duplicate on re-import (11 checks); web + iOS render clean; login import entry present; all 3 builds clean.

## 4.38.0
- Each chapter on the welcome screen now shows a concise summary of what it covers — rooted in both its biblical anchor and the key scientific finding behind it (e.g. Faith: sanctification research + Matthew 6:33; Money: financial-conflict divorce data + Matthew 6:24; Marriage: Gottman + Ephesians 5). The fuller per-chapter background (weight, biblical grounding, supporting books, and the science) remains available on the Introduction screen and when answering each chapter.
- Same content on Mac, web, and iOS.

## 4.37.0
- Added encrypted device-to-device data transfer (Mac <-> iPhone). In Settings, "Export to share" writes a single passphrase-encrypted .cana file containing your names, in-progress answers, saved sessions, and current report; carry it over (AirDrop / email / Files) and use "Import from Mac" / "Import from iPhone" on the other device to bring your CANA account's data with you.
  - Encryption: AES-GCM with a 256-bit key derived from your passphrase via PBKDF2-HMAC-SHA256 (210k iterations); random salt + IV per export. Without the passphrase the file reveals nothing — preserving CANA's privacy promise (no server, no cloud). Wrong passphrase and tampered/foreign files are detected and rejected with clear messages.
  - Import shows how many reports/sessions the file holds and the export date, and asks for confirmation before replacing the current profile's data.
- Fixed a render-time crash ("Cannot access 'isIOS' before initialization") introduced when the AI badge effect referenced the platform flags before they were defined; platform flags are now declared at the top of the component. This affected all platforms.
- Verified: transfer crypto round-trip + wrong-passphrase/tamper/foreign-file rejection (14 checks); full Mac->iOS data-fidelity round-trip (9 checks); web + iOS render clean; all 3 builds clean.

## 4.36.0
- Fixed the header AI status badge on iOS. It previously showed "Ollama offline" on iPhone, which was wrong (iOS uses the on-device Apple model, never Ollama). Now on iOS the badge shows "On-device AI" when the Apple model is available, and is hidden entirely when the device/OS doesn't support it — no Ollama wording ever appears on iOS. Desktop/web behavior is unchanged.

## 4.35.0
- Hardened the iOS Apple Foundation Model plugin so it compiles on ANY Xcode version. Previously it failed to build on Xcode without the iOS 26 SDK ("Cannot find 'SystemLanguageModel' / 'LanguageModelSession'"). Now gated on `#if compiler(>=6.2) && canImport(FoundationModels)`: older Xcode skips the Apple-model code entirely and reports it unavailable (app uses deterministic text); a current Xcode with the iOS 26 SDK compiles it and the on-device AI activates automatically — no code change needed later.

## 4.34.0
- iOS now makes ZERO calls to a local Ollama server — not even a liveness check. Previously the Ollama code was hidden in the UI but two network paths could still fire on iOS (chat() falling through after the Apple model, and the ollamaRunning liveness probe). Both are now hard-stopped on iOS:
  - chat() throws immediately on iOS if the Apple on-device model is unavailable, so the couple's letters/answers are never sent to localhost; the deterministic fallback is used instead.
  - ollamaRunning() returns false on iOS without probing localhost.
- The Ollama code still exists in the shared codebase (used on desktop) but is now provably unreachable on iOS. Desktop/web behavior is unchanged.
- Verified: chat() and ollamaRunning make 0 network calls on simulated iOS (5/5 checks); desktop AI still uses Ollama correctly; all 3 builds clean; render smoke clean.

## 4.33.0
- iOS App Store readiness: desktop-only features are now hidden when running as the native iOS app, so the iOS build contains nothing that would be non-functional or against App Store rules.
  - Hidden on iOS: the "Check for updates" button (GitHub/.dmg update checks aren't allowed on iOS), the entire Ollama setup wizard and "Set up the local AI" buttons, and the Ollama/Mac-install settings section.
  - On iOS, Settings now shows a short, honest "On-device AI" note (Apple's on-device model, nothing to configure) instead of the Ollama panel.
  - On iOS the AI enhancement uses Apple's on-device model automatically (no Ollama "enable" toggle needed); all skip/alert messages are platform-aware and no longer mention Ollama.
- Added a double-click launcher "Build iOS and open Xcode.command" that: checks Node/Xcode/CocoaPods, builds the web app for iOS, creates the native iOS project on first run (or syncs it on later runs), and opens it in Xcode. The final native build (the ▶ Run step) still happens in Xcode, as it must.
- No change to the desktop or web experience. Verified: all 3 builds clean; web and simulated-iOS both mount with zero runtime errors; all gates confirmed in source.
- Editorial: a previous edit accidentally created two separate ## 4.33.0 entries; they have been merged here. No code change.


## 4.32.0
- Release-hardening review fixes:
  - Fixed a crash in plan generation when zero domains are scorable (e.g. every question marked N/A, or an empty/abandoned assessment). The engine now returns a safe "complete the assessment" placeholder instead of throwing.
  - Fixed overall-score becoming NaN when no domains are scorable (0/0); it now returns 0 cleanly.
  - Hardened individual and joint vision/mission text against the 1-domain case so they never print "undefined".
  - Memoized the live trends computation so it only recomputes when sessions change, not on every render.
- No functional change to normal assessments; all existing behavior, scores, and outputs are unchanged. Verified: all 3 builds clean, engine regression green, edge cases (all-NA / empty / 1-domain / 2-domain) all pass, 0 dependency vulnerabilities, render smoke clean.


## 4.31.0
- Scale change: removed the exact midpoint (5) and added 4 and 6 as options, so the scale is now 0,1,2,3,4,6,7,8,9,10. This keeps people from sitting exactly on the fence while still allowing a "mild" lean. Reverse-scoring stays mathematically clean (4<->6, symmetric around 5). New intermediate labels added for 4 and 6 across all 10 scale types.
- Question refactoring toward evidence-based behavioral markers (research-checked against primary literature, with honest "associated with" language rather than overstated "predicts"):
  - m1 -> Love Maps (knowing your spouse's hopes/dreams/worries), m15 -> Contempt (Gottman's strongest divorce predictor), added m18 Stonewalling, b4 -> Flooding (physiological), f8 -> Sanctification (sacred view of marriage), in3 -> affection/caring (CSI-16 phrasing).
  - Added: f13 spiritual intimacy, f14 God-attachment anxiety (sensitive, reflective, reverse-scored), in9 covenant-renewal view of intimacy, c11 sanctification of parenting, il9 "we-ness" defense of spouse. Now 113 questions.
- New rule-based flags: Contempt Detected, Stonewalling Pattern, Physiological Flooding, Felt Security (God-attachment), Sacred-Bond Buffer (sanctification as a source of repair motivation).
- Deliberately NOT implemented: the proposed hard-cap that would force the Marriage score to 3.4 from a single item. A single self-report item is too unreliable to override a whole domain's score; contempt/stonewalling are surfaced as prominent flags instead. Weights and band thresholds left unchanged (those are editorial judgements, not "right/wrong").
- Updated both reference PDFs (Assessment Questions; How the Evaluation Works) to match.
- All plain-language help entries updated for changed questions and added for new ones (113/113 covered).

## 4.30.0
- Mac and iOS now build and package as separate, independent packages from the same single codebase:
  - Mac (Electron) builds to dist/ and packages a .dmg (npm run pack:mac) → GitHub Releases.
  - iOS (Capacitor) builds to its own dist-ios/ folder and packages via Xcode (npm run ios:sync) → App Store.
  - The two build outputs no longer share a folder, so building or releasing one never disturbs the other.
- Same shared source (src/) and same app identity (com.cana.covenantlife, same version) across both — a fix or new feature lands in both with no code duplication.
- Setup guide (ios-plugin/IOS_SETUP.md) updated with the separate-packaging model and a Mac-vs-iOS reference table.


## 4.29.0
- Added the foundation for a native iOS app via Capacitor — the SAME tested React app, wrapped as a native iOS build (not a rewrite). New: capacitor.config.json, an "ios" Vite build target (relative asset paths), and npm scripts (build:ios, ios:sync, ios:open).
- Added a native Swift plugin (ios-plugin/) bridging Apple's on-device Foundation Model (Apple Intelligence, iOS 26+). On iOS the AI enhancement runs fully on-device; on older devices and on web/desktop the app uses the deterministic text or Ollama exactly as before.
- The AI backend is now selected automatically: Apple Foundation Model on capable iOS, Ollama on desktop, deterministic everywhere else. All of it still sits ON TOP of the deterministic foundation (re-wording only, never replacing the facts).
- Full setup instructions in ios-plugin/IOS_SETUP.md. The native Xcode project is generated on the Mac (gitignored); the reusable plugin sources are committed.
- Desktop and web behavior is unchanged. Verified: web/electron/ios builds all clean; JS bridge correct across web/iOS/failure (8/8); desktop AI fallback intact (4/4).


## 4.28.0
- When the local AI is used, it now BUILDS ON the deterministic foundation rather than replacing it. The built-in (fact-based) vision and mission are passed to the AI as a required foundation, and the AI's only job is to re-express them in warmer, more personal language — it is explicitly instructed not to add new claims or drop any of the foundation's facts. This applies to the joint vision/mission and both individual vision/missions.
- If the AI returns nothing usable, the deterministic foundation is kept as-is (unchanged behavior, now also the literal basis the AI works from).
- Net effect: the deterministic engine is always the substance; the AI only refines the wording on top of it. This also reduces the chance of the model inventing claims, since it is anchored to the foundation instead of writing freely.


## 4.27.0
- The built-in (deterministic) engine now produces a COMPLETE report on its own — no AI required. This makes the app fully functional offline and on any device (important for the upcoming iOS version, where the local desktop AI can't run).
  - Added deterministic individual Vision & Mission statements for each partner, built from their own domain scores (previously only the AI produced these; without AI those sections were blank).
  - The report now defaults to these built-in individual visions, and the AI (when available) overwrites them — so the report is never missing sections.
  - Joint vision/mission, all goals, tensions, flags, the letter/dream comparison (Future Perfect & Top Differences), and the Start-the-Conversation guide were already fully deterministic and remain so.
- Fixed the AI-used indicator so it reflects only genuine AI output, not the deterministic defaults.
- Note: built-in text is template-based and varies less than AI-written text, but it is complete, accurate to your scores, and fully private. Individual statements use neutral "they" since the app doesn't ask each partner's gender.


## 4.26.0
- The "Start the Conversation" guide is now SAVED into the report once generated. Reopening it shows the same guide instead of regenerating it each time, so it stays consistent.
- Added a "↻ Refresh AI output" button on the Start the Conversation page (live report only), to redo the guide with the local AI — e.g. after the model improves.
- All PDF exports now have precise filenames using the pattern "<Label> DDMMYYYY Name1 Name2":
  - Report → "Report Summary 05062026 David Abby"
  - Conversation guide → "Start the Conversation 05062026 David Abby"
  - History view → "CANA History 05062026 David Abby"
- Rebuilt the Start the Conversation PDF as a clean 3-page layout: page 1 = title + Where you stand; page 2 = Questions to explore together (shrunk to fit one page); page 3 = Final comments.


## 4.25.0
- "Start the Conversation" guide: removed invented claims about the marriage. The "Where you stand" summary now states ONLY what the scores show (your highest- and lowest-scoring areas and your widest gaps, with the numbers) and never characterizes the relationship (no more phrasing like "at a crossroads" or "strong foundation"). This was fixed in both the AI prompt (now strict and literal, forbidden from diagnosing or using metaphors) and the built-in deterministic text. Aspirational Vision & Mission statements are unchanged by design — they are stated as hopes/prayers, not factual assessments.
- Fixed a bug where a conversation-guide question could show "undefined" instead of the actual question text.
- AI generation and "Refresh AI output" now show a real progress bar (with step label and percentage), not just a spinner, so you can see how far along the local model is.


## 4.24.0
- Added a complete, beginner-friendly "Getting started with CANA" guide (public/guide.html), designed for non-technical users and ready to publish on GitHub Pages. It covers downloading, installing, first launch, using the app together, the optional local AI, saving a PDF, updates, and troubleshooting. Written for a clean (notarized) install — no scary warnings. Includes 19 clearly-labeled screenshot slots for real captures to be dropped in. Once deployed it will be reachable at the Pages URL /guide.html.


## 4.23.0
- Added a "↻ Refresh AI output" button to the report screen. It re-runs only the AI-written parts (joint & individual vision/mission, personalized goals, and the letter comparison) using your local model, while keeping all deterministic scores, gaps, and flags exactly the same. Use it when your local model has improved, or when Ollama wasn't running the first time — so a report can be upgraded without redoing the assessment. Falls back gracefully (your existing report is left unchanged) if the AI isn't reachable or returns nothing usable.
- Note: refresh works on the current/live report (its original answers and letters are still in memory). Archived past reports can't be refreshed because the raw inputs aren't stored with them.


## 4.22.0
- Removed the radar chart legend (it looked cluttered). Each axis is now labeled directly on the chart with a short domain name, so points are still identifiable.
- Completely rebuilt the PDF export with a clean, fixed one-section-per-page layout, independent of the on-screen view:
  - Page 1: Joint Vision, Joint Mission, Individual Visions
  - Page 2: Future Perfect (shared dreams)
  - Page 3: Top Differences
  - Page 4: Domain Health
  - Page 5: Shared Goals — 1 Year (fit to page)
  - Page 6: Shared Goals — 5 Years (fit to page)
  - Page 7: Shared Goals — 10 Years (fit to page)
  - Page 8: Top Tensions (fit to page)
  - Page 9: Insights
  The previous PDF reused the interactive screen layout and broke awkwardly across pages; the new one is purpose-built for print with proper page breaks and print-safe colors.


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
