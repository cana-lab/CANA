# Methodology

This document explains, step by step, exactly how raw answers become a finished plan. Every step is a pure, deterministic function in [`../src/engine.js`](../src/engine.js).

## 0. Response collection

Each partner answers every question on an 8-point scale: **0, 1, 2, 3** (low end) or **7, 8, 9, 10** (high end). The midpoints 4, 5, 6 are deliberately unavailable.

**Why omit the midpoint?** Forced-choice scales without a neutral category reduce two well-documented biases: *central-tendency bias* (clustering on the safe middle) and *acquiescence* (defaulting to mild agreement). Removing the midpoint requires the respondent to commit to a direction, which yields more diagnostic data for gap analysis (Garland, 1991; Nowlis, Kahn & Dhar, 2002). The tradeoff — loss of a genuine "neutral" — is acceptable here because the instrument's purpose is to surface direction and difference, not to estimate a population parameter.

## 1. Response-type labeling

Each question is tagged with a **response type** (Agreement, Satisfaction, Frequency, Clarity, Urgency, Importance, Concern, Peace, Pull, Willingness). The on-screen labels for 0–10 are drawn from that type's vocabulary, so a satisfaction question reads "Unsatisfied … Fully satisfied" while a frequency question reads "Never … Consistently."

**Why?** Survey-methodology best practice (Krosnick & Presser, 2010; Dillman et al., 2014) holds that response labels must match the cognitive task of the question. Mismatched labels (e.g. "agree/disagree" on a frequency question) introduce measurement error.

## 2. Reverse scoring

Some items measure a *negative* condition — e.g. "Money is a source of recurring conflict" or "Another place pulls me in a way I haven't resolved." For these, a high raw score indicates poor health. They are flagged `rev: true` and inverted before any aggregation:

```
normalized = 10 − raw
```

This is the standard reverse-coding transform on a 0–10 scale. After this step, **every** normalized score points the same direction: higher = healthier. Without this, domain averages would be incoherent (mixing "more is good" and "more is bad" items).

## 3. Per-question gap

For each question answered by both partners:

```
gap = |normA − normB|
```

The gap is classified into severity bands:

| Gap (0–10) | Band | Rationale |
| --- | --- | --- |
| ≥ 5 | Critical | ~half the scale apart — effectively different realities |
| 4 | High | Large effect, scaled from Cohen's d conventions |
| 3 | Moderate | Meaningful, worth explicit conversation |
| 2 | Notable | Real but minor |
| < 2 | Aligned | Within normal response noise |

These bands are interpretive aids adapted from effect-size conventions (Cohen, 1988) scaled to a 10-point metric. They are **not** clinical cutoffs.

## 4. Domain scores

For each domain:

```
avgNormA = mean of partner A's normalized scores in that domain
avgNormB = mean of partner B's normalized scores in that domain
avgNorm  = (avgNormA + avgNormB) / 2
domainGap = |avgNormA − avgNormB|
```

Each domain average is mapped to a **health band**: Thriving (≥8.0), Healthy (≥6.5), Developing (≥5.0), At Risk (≥3.5), Critical (<3.5).

## 5. Domain weighting and overall score

Each domain carries a weight reflecting its documented predictive power for long-term family stability (full citations in [`ASSUMPTIONS.md`](ASSUMPTIONS.md)):

```
Faith 1.30 · Marriage 1.25 · Children 1.10 · Money 1.10 · Place 1.05
Vocation 1.00 · Community 0.95 · Body 0.90 · Creative 0.85
```

The overall couple-health score is the weighted mean:

```
overall = Σ(avgNorm_d × weight_d) / Σ(weight_d)
```

## 6. Tension ranking

Every per-question gap is multiplied by its domain weight:

```
weightedGap = gap × domainWeight
```

Tensions are sorted by `weightedGap` descending. **Deterministic tie-breaking**: ties are broken first by domain weight, then by question id (alphabetical). This guarantees that identical inputs always produce identically-ordered tensions — there is no stable-sort ambiguity. The top 10 are surfaced.

## 7. Pattern flags

A fixed set of rules fires deterministically over the domain scores. Examples:

- **Core Instability** — fires if *both* Faith and Marriage average < 5.0 (the faith × marriage interaction is the strongest combined predictor in the literature).
- **Active Financial Conflict** — fires if either partner rates the financial-conflict item ≥ 7.
- **Geographic Unresolution** — fires if place-alignment is low or place-tension is high for either partner.
- **Parenting Vision Divergence** — fires if the Children domain gap ≥ 2.5.
- **Shared Foundations / Mutual Growth / Asymmetry** — quadrant-based flags from comparing the two partners' domain scores.

Each rule is a simple boolean over computed scores. No rule uses randomness or hidden state.

## 8. Goal prioritization

Goals are produced one per domain, but the **ordering differs by timeframe**, reflecting what each horizon should emphasize:

- **1-year** — sorted ascending by `avgNorm × weight`. The weakest, highest-impact domains come first: near-term effort goes to urgent deficits.
- **5-year** — sorted descending by `domainGap × weight`. The most systemic *disagreements* come first: the mid-term is about closing gaps between partners.
- **10-year** — sorted descending by `weight`. The highest-impact domains anchor the long-term vision.

Within each domain, the goal *text* is selected from a template pair (`low` vs `high` band) based on whether that domain's `avgNorm ≥ 6.5`. A low-scoring domain gets a deficit-addressing goal; a high-scoring domain gets a build-from-strength goal.

## 9. Vision & mission

Both are assembled from templates whose slots are filled by computed values: the two strongest and two weakest domains (by `avgNorm`), an overall-health framing phrase chosen by score band, and the partners' names. Because every input is deterministic, the output is reproducible.

---

## Determinism guarantee

The engine is covered by a determinism check (`computeAnalytics` + `generateLocalPlan` run twice on identical input must produce byte-identical JSON). There are no calls to `Math.random`, `Date.now`, locale-dependent formatting in the scoring path, or any network/model API. See the test in the repository's commit history / `engine.js` header.
