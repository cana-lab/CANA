# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│ WebView / browser (no server — Electron on macOS,            │
│ Capacitor/WKWebView on iOS, plain browser on the web)        │
│                                                               │
│  index.html  ──► strict CSP (desktop: localhost Ollama +      │
│                  api.github.com only; iOS: 'self' only)       │
│      │                                                        │
│      ▼                                                        │
│  main.jsx ──► App.jsx  (React UI, all screens & state)        │
│      │                                                        │
│      ▼                                                        │
│  engine.js  (pure deterministic core)                         │
│   ├─ RESPONSE_TYPES   — label vocabularies per question type  │
│   ├─ DOMAINS          — questions, types, reverse-flags        │
│   ├─ DOMAIN_WEIGHTS   — research-based importance weights      │
│   ├─ computeAnalytics — scoring, gaps, flags, prioritization   │
│   └─ generateLocalPlan— vision/mission/goals/tension language  │
│                                                               │
│  llm.js  ──► optional re-wording: Ollama (desktop, loopback   │
│              only) / Apple Foundation Model (iOS, native)     │
│  auth.js / transfer.js / crashLog.js — local-only services    │
│  localStorage  ◄──► progress (device-only, never sent)        │
└─────────────────────────────────────────────────────────────┘
```

There is intentionally **no** backend and no API client for user content. The only network access is the pinned CSP allowlist above (see `PRIVACY.md`); the iOS build makes zero network calls.

## Separation of concerns

The single most important architectural decision: **all logic lives in `engine.js` as pure functions, and `App.jsx` is a thin presentation layer.**

- `engine.js` has no React, no DOM, no I/O. It can be unit-tested in plain Node (it was — determinism, reverse-scoring, and gap classification are verified). It could be reused in a CLI, a different UI, or a test harness unchanged.
- `App.jsx` holds only UI state (which screen, which domain, current answers) and renders. It calls `computeAnalytics()` then `generateLocalPlan()` once, at the moment the user clicks "Generate."

This boundary is why the scientific/deterministic claims are auditable: a reviewer reads one file, with no UI noise, to verify the math.

## Data model

```
answers = { A: { questionId: 0..10, ... }, B: { ... } }
done    = { A: [domainId, ...], B: [domainId, ...] }
names   = { A: string, B: string }
```

Each question carries `{ id, text, type, rev? }`. `type` selects label vocabulary and is metadata only — it does not affect scoring (a 7 means 7 regardless of type). `rev` triggers the `10 − raw` inversion in the engine.

## Rendering & state

Plain React with hooks (`useState`, `useEffect`, `useCallback`). No router (screens are state-driven), no global store (the tree is shallow). `localStorage` is synced on every answer change via an effect, enabling resume.

## Build

- **Vite** bundles the app once per platform target: web (`dist/`, base
  `/CANA/`), Electron renderer (`dist/`, relative base), iOS web layer
  (`dist-ios/`, relative base). See `vite.config.js`.
- `build.modulePreload.polyfill = false` removes the `fetch` call Vite would
  otherwise inject into the bundle.
- There is no service worker; offline capability comes from the apps being
  packaged (Electron/Capacitor bundle all assets locally).

## Why deterministic synthesis first, AI only on top

Earlier iterations called a hosted AI model to write the vision/mission/goal language. That was abandoned for three reasons, in priority order:

1. **Privacy.** A hosted call means the couple's answers leave the device. Incompatible with the core guarantee.
2. **Static hosting.** GitHub Pages cannot safely hold an API key; embedding one client-side exposes it to the world.
3. **Determinism.** Model output varies run-to-run; the user required consistent, reproducible results.

The template-driven generator in `generateLocalPlan()` trades some linguistic flair for total privacy, reproducibility, and zero-dependency hosting — the right trade for this artifact. The templates are still **data-driven**: which template fires, and the slots filled into it, are determined by the couple's actual scores.

Since then an **optional local AI layer** was added on top (`llm.js`): Ollama on the desktop (loopback only, enforced in code and CSP) or Apple's on-device Foundation Model on iOS. It is fed the deterministic text as a required foundation and may only re-express it — if it is unavailable or fails, the deterministic text ships as-is. The three reasons above still hold: nothing leaves the device, no hosted keys exist, and the substance of the plan remains deterministic.

## Extensibility

- **Add a question:** append to the relevant domain's `questions` array with a `type` and optional `rev`. No other change needed; scoring picks it up automatically.
- **Add a domain:** add to `DOMAINS`, add a weight to `DOMAIN_WEIGHTS`, add goal templates to `GOAL_TEMPLATES`.
- **Re-tune weights:** edit `DOMAIN_WEIGHTS` — one constant, fully documented.
- **Add a pattern flag:** add a rule in `detectFlags()`.
