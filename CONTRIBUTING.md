# Contributing

Contributions are welcome. A few principles keep this project coherent:

## Non-negotiables
1. **No network calls.** The app must never make outbound requests. Any PR introducing `fetch`/XHR/WebSocket/beacon or a third-party script/font/CDN will be declined. The `connect-src 'none'` CSP must remain.
2. **Determinism.** Scoring and synthesis must stay pure and reproducible. No `Math.random`, no time-dependent logic in the scoring path. Identical inputs must yield identical outputs.
3. **Engine/UI separation.** Keep all logic in `src/engine.js` as pure functions. `App.jsx` stays presentation-only.
4. **Cite your reasoning.** Changes to weights, bands, or flags must update `docs/ASSUMPTIONS.md` with rationale.

## Workflow
- Fork, branch, PR against `main`.
- Run `npm run build` and confirm the bundle has zero `fetch` (`grep -c "fetch(" dist/assets/index-*.js` → 0).
- Describe *why*, not just *what*.

## Good first contributions
- Additional reverse-scoring unit tests.
- Translations (the framework is bilingual-friendly by design).
- A non-Christian / worldview-neutral question set variant (kept as a separate domain file).
- Accessibility improvements (ARIA on the scale buttons, keyboard nav).
