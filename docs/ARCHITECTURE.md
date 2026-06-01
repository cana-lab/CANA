# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (the only runtime — there is no server)              │
│                                                               │
│  index.html  ──► strict CSP (connect-src 'none')              │
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
│  localStorage  ◄──► progress (device-only, never sent)        │
│  Service Worker (Workbox) ──► offline app-shell cache          │
└─────────────────────────────────────────────────────────────┘
```

There is intentionally **no** network layer, API client, or backend. This is a design constraint, not an omission (see `PRIVACY.md`).

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

## Build & PWA

- **Vite** bundles the app. `base` is set for the GitHub Pages sub-path.
- **vite-plugin-pwa** (Workbox) generates the manifest and a service worker that precaches the app shell, making the app fully installable and usable offline.
- `build.modulePreload.polyfill = false` removes the only `fetch` call Vite would otherwise inject, so the app bundle has provably zero network calls.

## Why local-only synthesis instead of an AI model

Earlier iterations called a hosted AI model to write the vision/mission/goal language. That was abandoned for three reasons, in priority order:

1. **Privacy.** A hosted call means the couple's answers leave the device. Incompatible with the core guarantee.
2. **Static hosting.** GitHub Pages cannot safely hold an API key; embedding one client-side exposes it to the world.
3. **Determinism.** Model output varies run-to-run; the user required consistent, reproducible results.

The template-driven generator in `generateLocalPlan()` trades some linguistic flair for total privacy, reproducibility, and zero-dependency hosting — the right trade for this artifact. The templates are still **data-driven**: which template fires, and the slots filled into it, are determined by the couple's actual scores.

## Extensibility

- **Add a question:** append to the relevant domain's `questions` array with a `type` and optional `rev`. No other change needed; scoring picks it up automatically.
- **Add a domain:** add to `DOMAINS`, add a weight to `DOMAIN_WEIGHTS`, add goal templates to `GOAL_TEMPLATES`.
- **Re-tune weights:** edit `DOMAIN_WEIGHTS` — one constant, fully documented.
- **Add a pattern flag:** add a rule in `detectFlags()`.
