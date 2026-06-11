// Smoke tests for the deterministic engine.
// These exist to lock down the edge cases that the CHANGELOG (4.32.0) claimed
// were hardened — so a future regression can't quietly undo them.

import { describe, it, expect } from "vitest";
import {
  DOMAINS,
  reverseScore,
  normalize,
  classifyGap,
  classifyHealth,
  computeAnalytics,
  generateLocalPlan,
} from "./engine.js";

function emptyAnswers() {
  // Build an answers map where every question id is set to "NA". Mirrors a
  // couple who started the assessment but marked every item not-applicable.
  const out = {};
  for (const d of DOMAINS) for (const q of d.questions) out[q.id] = "NA";
  return out;
}

function uniformAnswers(value) {
  // Same value for every question, for both partners. Useful for sanity checks.
  const out = {};
  for (const d of DOMAINS) for (const q of d.questions) out[q.id] = value;
  return out;
}

describe("scoring primitives", () => {
  it("reverseScore mirrors around 5", () => {
    expect(reverseScore(0)).toBe(10);
    expect(reverseScore(10)).toBe(0);
    expect(reverseScore(3)).toBe(7);
    expect(reverseScore(7)).toBe(3);
  });

  it("normalize passes through forward items and reverses flagged items", () => {
    expect(normalize(4, false)).toBe(4);
    expect(normalize(4, true)).toBe(6);
  });

  it("classifyGap returns a {level,label,color} object", () => {
    const lo = classifyGap(0);
    const hi = classifyGap(10);
    expect(lo.label).toBe("Aligned");
    expect(hi.label).toBe("Critical");
    expect(lo.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("classifyHealth returns a {label,color} object across all bands", () => {
    expect(classifyHealth(9).label).toBe("Thriving");
    expect(classifyHealth(7).label).toBe("Healthy");
    expect(classifyHealth(5.5).label).toBe("Developing");
    expect(classifyHealth(4).label).toBe("At Risk");
    expect(classifyHealth(1).label).toBe("Critical");
  });
});

describe("computeAnalytics edge cases (CHANGELOG 4.32.0 hardening)", () => {
  it("empty answers produce zero scorable domains and overallScore=0, not NaN", () => {
    const a = emptyAnswers();
    const r = computeAnalytics(a, a, "Alex", "Bo");
    expect(r.domainScores.length).toBe(0);
    expect(Number.isFinite(r.overallScore)).toBe(true);
    expect(r.overallScore).toBe(0);
  });

  it("uniform mid answers produce all domains scored and a finite overall", () => {
    const a = uniformAnswers(6);
    const r = computeAnalytics(a, a, "Alex", "Bo");
    expect(r.domainScores.length).toBeGreaterThan(0);
    expect(Number.isFinite(r.overallScore)).toBe(true);
    expect(r.overallScore).toBeGreaterThan(0);
  });

  it("single-domain answers don't crash and produce finite scores", () => {
    const a = emptyAnswers();
    // Answer just the first domain's questions.
    const firstDomain = DOMAINS[0];
    for (const q of firstDomain.questions) a[q.id] = 7;
    const r = computeAnalytics(a, a, "Alex", "Bo");
    expect(r.domainScores.length).toBe(1);
    expect(Number.isFinite(r.overallScore)).toBe(true);
  });
});

describe("generateLocalPlan edge cases", () => {
  it("returns a safe placeholder plan when nothing is scorable (no crash)", () => {
    const a = emptyAnswers();
    const analytics = computeAnalytics(a, a, "Alex", "Bo");
    const plan = generateLocalPlan(analytics);
    expect(plan).toBeTruthy();
    expect(typeof plan.vision).toBe("string");
    expect(typeof plan.mission).toBe("string");
    expect(plan.indivA).toBeTruthy();
    expect(plan.indivB).toBeTruthy();
    // No "undefined" should ever leak into user-visible text.
    expect(plan.vision).not.toMatch(/undefined/i);
    expect(plan.mission).not.toMatch(/undefined/i);
    expect(plan.indivA.vision).not.toMatch(/undefined/i);
    expect(plan.indivB.vision).not.toMatch(/undefined/i);
  });

  it("single-domain plan does not print undefined (CHANGELOG 4.32.0)", () => {
    const a = emptyAnswers();
    const firstDomain = DOMAINS[0];
    for (const q of firstDomain.questions) a[q.id] = 7;
    const analytics = computeAnalytics(a, a, "Alex", "Bo");
    const plan = generateLocalPlan(analytics);
    expect(plan.vision).not.toMatch(/undefined/i);
    expect(plan.mission).not.toMatch(/undefined/i);
    expect(plan.indivA.vision).not.toMatch(/undefined/i);
    expect(plan.indivB.vision).not.toMatch(/undefined/i);
  });

  it("includes both partner names verbatim in the joint vision", () => {
    const a = uniformAnswers(7);
    const analytics = computeAnalytics(a, a, "Alex", "Bo");
    const plan = generateLocalPlan(analytics);
    expect(plan.vision).toMatch(/Alex/);
    expect(plan.vision).toMatch(/Bo/);
  });
});

// Healthy-direction answers that respect reverse-scored items: a "good"
// couple answers rev items LOW. value = the normalized health level.
function goodAnswers(v) {
  const out = {};
  for (const d of DOMAINS) for (const q of d.questions) out[q.id] = q.rev ? 10 - v : v;
  return out;
}

describe("v4.50 calibrations", () => {
  it("instrument now has 115 questions (m19/m20 added)", () => {
    expect(DOMAINS.flatMap((d) => d.questions).length).toBe(115);
  });

  it("per-item weights: appreciation (m9, w=2) moves Marriage more than a w=1 item", () => {
    const base = uniformAnswers(6);
    const viaM9 = { ...base, m9: 10 };
    const viaM10 = { ...base, m10: 10 };
    const m = (ans) => computeAnalytics(ans, ans, "A", "B").domainScores.find((d) => d.id === "marriage").avgNorm;
    expect(m(viaM9)).toBeGreaterThan(m(viaM10));
  });

  it("Threefold Cord: joint f8+m8 ≥ 7.5 boosts Marriage ×1.2 (capped), transparently", () => {
    const a = goodAnswers(7); // f8/m8 couple mean 7 → below trigger
    const r1 = computeAnalytics(a, a, "A", "B");
    expect(r1.domainScores.find((d) => d.id === "marriage").cordMultiplier).toBeUndefined();

    const b = { ...goodAnswers(7), f8: 9, m8: 9 };
    const r2 = computeAnalytics(b, b, "A", "B");
    const mar = r2.domainScores.find((d) => d.id === "marriage");
    expect(mar.cordMultiplier).toBe(true);
    expect(mar.avgNorm).toBeGreaterThan(mar.avgNormUnadjusted);
    expect(mar.avgNorm).toBeLessThanOrEqual(10);
    expect(r2.flags.some((f) => f.label === "Threefold Cord")).toBe(true);
  });

  it("Faith divergence: gap ≥ 3.0 applies a disclosed 15% calibration", () => {
    const A = uniformAnswers(6), B = uniformAnswers(6);
    for (const q of DOMAINS.find((d) => d.id === "faith").questions) { A[q.id] = 9; B[q.id] = 3; }
    const r = computeAnalytics(A, B, "A", "B");
    const faith = r.domainScores.find((d) => d.id === "faith");
    expect(faith.divergencePenalty).toBe(true);
    expect(faith.avgNorm).toBeCloseTo(faith.avgNormUnadjusted * 0.85, 6);
    const flag = r.flags.find((f) => f.label === "Spiritual Misalignment");
    expect(flag).toBeTruthy();
    expect(flag.text).toMatch(/15%/);
  });

  it("Oxygen Check: high expectations + depleted resources fires the imbalance flag", () => {
    const a = { ...uniformAnswers(6), f12: 9, m16: 9, m5: 9, v3: 2, b7: 2, m4: 2 };
    const r = computeAnalytics(a, a, "A", "B");
    expect(r.flags.some((f) => f.label === "Resource/Expectation Imbalance")).toBe(true);
    // and NOT with balanced answers
    const r2 = computeAnalytics(uniformAnswers(6), uniformAnswers(6), "A", "B");
    expect(r2.flags.some((f) => f.label === "Resource/Expectation Imbalance")).toBe(false);
  });

  it("practice recommendation follows the band", () => {
    const thriving = generateLocalPlan(computeAnalytics(goodAnswers(9), goodAnswers(9), "A", "B"));
    expect(thriving.recommendedPractice.id).toBe("reappraisal");

    const developing = generateLocalPlan(computeAnalytics(uniformAnswers(6), uniformAnswers(6), "A", "B"));
    expect(developing.recommendedPractice.id).toBe("novelty-prayer");

    const atRisk = generateLocalPlan(computeAnalytics(goodAnswers(4), goodAnswers(4), "A", "B"));
    expect(atRisk.recommendedPractice.id).toBe("watch-talk");
  });

  it("safety trigger: severe contempt (raw m15 ≥ 7) overrides self-help with referral", () => {
    const a = { ...goodAnswers(8), m15: 8 }; // otherwise-healthy couple, severe contempt
    const plan = generateLocalPlan(computeAnalytics(a, goodAnswers(8), "A", "B"));
    expect(plan.recommendedPractice.id).toBe("referral");
    expect(plan.recommendedPractice.body).toMatch(/pastor|counselor/i);
  });
});
