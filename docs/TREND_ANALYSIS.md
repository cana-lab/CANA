# Re-Testing & Trend Analysis

The app supports two assessment modes and tracks results over time so a couple can see how their shared life is developing.

## Two modes

| Mode | Length | When to use |
| --- | --- | --- |
| **Full Assessment** | 115 questions across 11 domains | Initial baseline (the retreat), and occasional deep re-checks (e.g. annually) |
| **Quick Check-In** | 17 questions — one anchor per domain plus the six Oxygen-check items | Frequent re-tests (weekly / monthly) to track movement, including a fresh oxygen reading |

Every completed assessment of either mode saves a timestamped **snapshot** to device-local storage and becomes a point on the trend charts.

## The check-in (short form)

Each domain has exactly one question flagged `core: true` in `engine.js` — chosen as the single best summary indicator for that domain (e.g. Faith → "My daily life is consciously ordered around my faith in Christ"; Marriage → "I feel deeply known and loved by my spouse"). The check-in presents those eleven plus the six Oxygen-check items (f12, m16, m5, v3, b7, m4), so every check-in also yields a current supply/demand reading. Because the scoring engine simply averages whatever questions are present, a check-in produces a snapshot that is directly comparable to a full assessment on the same 0–10 normalized scale.

> Note: a check-in is a lower-resolution probe by design. It tracks the *anchor* of each domain, not the full domain. Use occasional full assessments for depth.

## Dashboard metrics

All metrics are computed deterministically in `computeTrends()` from the ordered snapshot history.

### Mission Drift (0–10)
The Euclidean distance between the current session's 9-domain score vector and the **baseline** (first) session's vector, normalized to 0–10 (max possible distance √(9×10²)=30 maps to 10).

- **0** = identical to where you started.
- **Rising** = your life pattern is moving away from your original baseline.

Drift is value-neutral: growth *should* move you. The metric exists to make movement **visible and discussable** — is this drift chosen, or accidental? A flag fires at drift ≥ 3.

### Value Alignment (0–10)
`10 − (mean absolute domain gap between partners)`.

- **Higher** = the two partners experience their shared life more similarly.
- **Falling** = the gap between how each partner sees things is widening.

Flags fire when alignment improves ≥ 1 point (converging) or declines ≥ 1 point (diverging) versus baseline. This is the headline relationship-health trend.

### Overall Health (0–10)
The weighted-mean couple-health score (same weights as the main plan) plotted per session.

### Per-Domain Movement
Each domain's couple-average over time, with a baseline→now delta and an up/down/flat direction (threshold ±0.3). Surfaces the biggest improver and biggest decliner.

### Trend flags
Deterministic rules fire on the history: *Mission Drift Detected*, *Alignment Declining/Improving*, *Declining — {domain}*, *Growing — {domain}*.

## Charts

Rendered as inline SVG (no charting library, no network). Full assessments appear as larger gold dots; check-ins as smaller dots, so you can see at a glance which points are deep vs. quick.

## Privacy

Session history lives only in `localStorage` under `covenant_life_plan_sessions_v1`. Like all data in this app, it never leaves the device and is wiped by "Erase all device data."
