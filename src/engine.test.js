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
