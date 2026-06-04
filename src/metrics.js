// CANA — metric explanations.
// ----------------------------------------------------------------------------
// One honest source of truth for every score/metric shown in the report and the
// dashboard. Each entry answers three questions for the info button:
//   what   — what the metric means, in plain language
//   how    — exactly how it is computed (the real methodology, not hand-waving)
//   scale  — what different values tend to indicate, as an INTERPRETIVE guide
//
// IMPORTANT HONESTY NOTE: CANA's numbers are self-rated 0–10 averages with the
// couple's own (optionally adjusted) domain weights. They are NOT calibrated to
// any validated clinical instrument or normed population. So the "scale" text
// describes how to *interpret* a score for reflection — it deliberately makes
// NO claim like "healthier than X% of couples," because no such population
// comparison exists here. Saying otherwise would be fabricated and misleading.

export const SCORE_BANDS = [
  { min: 8.0, max: 10, label: "Flourishing", blurb: "A real area of strength. The work here is to protect and keep investing in it, not to fix it." },
  { min: 6.5, max: 7.9, label: "Healthy", blurb: "Solid and largely working. Worth occasional attention so it stays strong." },
  { min: 5.0, max: 6.4, label: "Mixed", blurb: "Some genuine strength alongside clear room to grow. A good place to focus gentle, deliberate effort." },
  { min: 3.5, max: 4.9, label: "Strained", blurb: "An area under real pressure. Honest, unhurried conversation here will likely do the most good." },
  { min: 0, max: 3.4, label: "Needs care", blurb: "A tender area that needs direct attention — and, if it persists, the help of a pastor or counselor." },
];

export function bandFor(score) {
  return SCORE_BANDS.find((b) => score >= b.min && score <= b.max) || SCORE_BANDS[SCORE_BANDS.length - 1];
}

// Gap interpretation (difference between partners on the same item/domain).
export const GAP_BANDS = [
  { min: 0, max: 1.4, label: "Aligned", blurb: "You see this similarly. Small differences are normal and healthy." },
  { min: 1.5, max: 2.4, label: "Noticeable difference", blurb: "A real difference worth naming out loud rather than assuming you agree." },
  { min: 2.5, max: 3.9, label: "Significant difference", blurb: "You are experiencing this fairly differently. This deserves a focused, curious conversation." },
  { min: 4.0, max: 10, label: "Major difference", blurb: "You are effectively living two different realities here. Address it directly before it hardens." },
];

export function gapBandFor(gap) {
  return GAP_BANDS.find((b) => gap >= b.min && gap <= b.max) || GAP_BANDS[GAP_BANDS.length - 1];
}

// Static explanations for the named metrics.
export const METRIC_INFO = {
  domainScore: {
    title: "Domain score",
    what: "How healthy one area of life (e.g. Faith, Money, Marriage) looks right now, on a 0–10 scale, shown for each partner.",
    how: "Within a domain, every question you answered is converted to a 0–10 value and averaged. The two bars are each partner's average for that domain; they are not weighted against each other. Higher means a healthier self-assessment of that area.",
    scale: "interpretive",
  },
  gap: {
    title: "Gap (Δ)",
    what: "How far apart the two of you scored — on a single question or across a domain.",
    how: "The absolute difference between the partners' values (|A − B|). For a domain it's the difference of the two domain averages. It says nothing about who is 'right'; it measures distance in perception.",
    scale: "gap",
  },
  overall: {
    title: "Overall health",
    what: "A single 0–10 summary of how the whole picture looks across all nine domains.",
    how: "Each domain's couple-average is combined using the domain weights (Faith and Marriage count for more by default; you can adjust these). It's a weighted average, so it reflects your priorities, not a neutral mean. Because the weights are yours, this number is for your own reflection — it is not comparable across different couples.",
    scale: "interpretive",
  },
  alignment: {
    title: "Alignment",
    what: "How closely the two of you see your life the same way, overall. Higher means more in step.",
    how: "Computed as 10 minus the average of the absolute domain gaps. If your domain averages are very close, alignment is near 10; if you diverge a lot across domains, it drops. It measures agreement between partners, separate from how healthy any area is.",
    scale: "alignmentScale",
  },
  drift: {
    title: "Mission drift",
    what: "How far your life has moved from the very first assessment you took (your baseline). Lower is closer to where you started.",
    how: "The straight-line (Euclidean) distance between this session's nine domain-averages and your baseline session's, scaled to 0–10. It only exists once you have more than one assessment. Rising drift isn't automatically bad — it can mean healthy change — but it's a prompt to ask whether you're still heading where you intended.",
    scale: "driftScale",
  },
};

// Build the human-readable band text for a given metric + value.
export function scaleText(metricKey, value) {
  if (value == null || isNaN(value)) return null;
  const info = METRIC_INFO[metricKey];
  if (!info) return null;
  if (info.scale === "interpretive") {
    const b = bandFor(value);
    return { band: b.label, blurb: b.blurb, bands: SCORE_BANDS };
  }
  if (info.scale === "gap") {
    const b = gapBandFor(value);
    return { band: b.label, blurb: b.blurb, bands: GAP_BANDS };
  }
  if (info.scale === "alignmentScale") {
    const b = value >= 8 ? "Strongly aligned" : value >= 6.5 ? "Mostly aligned" : value >= 5 ? "Partly aligned" : "Often out of step";
    const blurb = value >= 6.5 ? "You tend to see your shared life similarly — a strong base for decisions." : value >= 5 ? "You agree on some areas and diverge on others; the divergences are worth naming." : "You frequently see things differently. Use the conversation guide to understand why.";
    return { band: b, blurb };
  }
  if (info.scale === "driftScale") {
    const b = value <= 2 ? "Close to baseline" : value <= 4 ? "Some movement" : value <= 6 ? "Notable movement" : "Far from baseline";
    const blurb = value <= 2 ? "Your life looks much as it did at your first assessment." : value <= 4 ? "Some real change since baseline — worth reflecting on whether it's the change you wanted." : "Significant change since baseline. Revisit whether your current direction still matches your stated mission.";
    return { band: b, blurb };
  }
  return null;
}
