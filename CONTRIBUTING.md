# Contributing

Contributions are welcome. A few principles keep this project coherent:

## Non-negotiables
1. **User content never leaves the device.** The only permitted endpoints are
   a local Ollama on `localhost` (optional AI, desktop only) and
   `api.github.com` (update version check, desktop only — version numbers,
   never user content). Both are pinned in the CSP in `index.html`. The iOS
   build makes **zero** network calls. Any PR adding a third-party script,
   font, CDN, analytics, or telemetry will be declined.
2. **Determinism.** Scoring and synthesis must stay pure and reproducible. No `Math.random`, no time-dependent logic in the scoring path. Identical inputs must yield identical outputs. AI output may only re-word the deterministic foundation, never replace it.
3. **Engine/UI separation.** Keep all logic in `src/engine.js` as pure functions. `App.jsx` stays presentation-only.
4. **Cite your reasoning.** Changes to weights, bands, or flags must update `docs/ASSUMPTIONS.md` with rationale. No invented citations — "associated with", not "proves".

## Workflow
- Fork, branch, PR against `main`.
- Run `npm test` (engine/auth/transfer unit suite) and `npm run build`; CI runs the same plus the electron and iOS bundles.
- Describe *why*, not just *what*.

## Good first contributions
- Additional reverse-scoring unit tests.
- Translations (the framework is bilingual-friendly by design).
- A non-Christian / worldview-neutral question set variant (kept as a separate domain file).
- Accessibility improvements (ARIA on the scale buttons, keyboard nav).
