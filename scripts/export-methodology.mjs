#!/usr/bin/env node
// CANA — generate a single, self-contained methodology document.
// -----------------------------------------------------------------------------
// Intended for deep review in external tools (e.g. NotebookLM). Everything
// that defines the instrument is extracted LIVE from src/engine.js — domains,
// weights, scriptures, all questions with their response types and reverse
// flags, the scale vocabularies, and the classification thresholds — so the
// document can never drift from the shipped code. The canonical research
// prose (docs/cana_foundation.md, METHODOLOGY.md, ASSUMPTIONS.md,
// TREND_ANALYSIS.md) is appended verbatim, followed by the verbatim source of
// the scoring functions as the final ground truth.
//
// Usage: node scripts/export-methodology.mjs [outfile]
// Default outfile: ~/Desktop/CANA-Methodology-NotebookLM.md

import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const eng = await import(join(root, "src/engine.js"));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const out = [];
const P = (s = "") => out.push(s);

P(`# CANA — Covenant Life: Complete Methodology & Instrument Reference`);
P();
P(`Generated from the live engine of CANA v${pkg.version} on ${new Date().toISOString().slice(0, 10)}.`);
P(`Every domain, question, weight, scale and threshold below is extracted`);
P(`directly from \`src/engine.js\` — the deterministic core that computes all`);
P(`scores. Prose sections from the project's research documentation follow,`);
P(`and the verbatim source of the scoring functions closes the document.`);
P();
P(`**Honest framing (load-bearing):** CANA is a structured-reflection and`);
P(`conversation instrument for couples, not a validated psychometric scale`);
P(`and not a clinical assessment. Scores are self-rated perceptions. Domain`);
P(`weights and band thresholds are editorial judgements informed by the`);
P(`research cited in the foundation document, not calibrated parameters.`);
P();

// ── Response scales ─────────────────────────────────────────────────────────
P(`## 1. Response scales`);
P();
P(`Questions use one of ${Object.keys(eng.RESPONSE_TYPES).length} typed scales so the answer labels match each`);
P(`question's cognitive task (satisfaction wording for satisfaction questions,`);
P(`etc.). All scales run 0–10 **without the exact midpoint 5** — respondents`);
P(`must lean at least mildly one way (4 or 6 are the closest options).`);
P();
for (const [key, t] of Object.entries(eng.RESPONSE_TYPES)) {
  const low = t.low.map((o) => `${o.v}="${o.d}"`).join(", ");
  const high = t.high.map((o) => `${o.v}="${o.d}"`).join(", ");
  P(`### ${t.name} (${key})`);
  P(`- Low half: ${low}`);
  P(`- High half: ${high}`);
  P();
}

// ── Domains + questions ─────────────────────────────────────────────────────
const QTOTAL = eng.DOMAINS.reduce((s, d) => s + d.questions.length, 0);
P(`## 2. Domains and questions (${eng.DOMAINS.length} domains, ${QTOTAL} questions)`);
P();
P(`Weights reflect each domain's relative influence on the overall score`);
P(`(weighted mean). "Reversed" questions are phrased so that MORE of the`);
P(`described experience is WORSE; their raw answer is inverted (10 − raw)`);
P(`before any averaging. "Core" marks the single anchor question per domain`);
P(`used by the short check-in.`);
P();
for (const d of eng.DOMAINS) {
  const w = eng.DOMAIN_WEIGHTS[d.id];
  const scripture = eng.SCRIPTURES[d.id];
  P(`### ${d.label} (id: ${d.id}, weight ${w})`);
  if (scripture) P(`Scripture: ${scripture.ref} — “${scripture.text}”`);
  if (d.summary) P(`Summary: ${d.summary}`);
  if (d.about) {
    if (d.about.weight) P(`Weight rationale: ${d.about.weight}`);
    if (d.about.biblical) P(`Biblical grounding: ${d.about.biblical}`);
    if (d.about.books) P(`Drawn from: ${d.about.books}`);
    if (d.about.science) P(`Research basis: ${d.about.science}`);
  }
  P();
  P(`| # | id | Question | Scale | Reversed | Core |`);
  P(`|---|----|----------|-------|----------|------|`);
  d.questions.forEach((q, i) => {
    const typeName = q.type && q.type.name ? q.type.name : "Agreement";
    P(`| ${i + 1} | ${q.id} | ${q.text.replace(/\|/g, "\\|")} | ${typeName} | ${q.rev ? "yes" : ""} | ${q.core ? "yes" : ""} |`);
  });
  P();
}

// ── Scoring mathematics ─────────────────────────────────────────────────────
P(`## 3. Scoring mathematics (step by step)`);
P();
P(`1. **Scorability.** A question enters scoring only if BOTH partners gave a`);
P(`   numeric answer. "N/A" or unanswered on either side excludes it for both.`);
P(`2. **Normalization.** normA = rev ? (10 − rawA) : rawA, same for B. After`);
P(`   this step, higher always means healthier.`);
P(`3. **Per-question gap.** gap = |normA − normB|; weightedGap = gap × domain`);
P(`   weight. Gap classes: ≥5 Critical, ≥4 High, ≥3 Moderate, ≥2 Notable,`);
P(`   else Aligned ("Minimal").`);
P(`4. **Quadrant.** With threshold 5.5: both high → Shared Strength; both low`);
P(`   → Shared Growth; one high one low → A-leads / B-leads.`);
P(`5. **Domain scores.** avgNormA = mean of partner A's normalized answers in`);
P(`   the domain (likewise B); avgNorm = (avgNormA + avgNormB)/2; domainGap =`);
P(`   |avgNormA − avgNormB|.`);
P(`6. **Health bands** on avgNorm: ≥8.0 Thriving, ≥6.5 Healthy, ≥5.0`);
P(`   Developing, ≥3.5 At Risk, else Critical.`);
P(`7. **Overall score** = Σ(avgNorm × weight) / Σ(weight) over scorable`);
P(`   domains only; 0 when nothing is scorable (never NaN).`);
P(`8. **Tensions** = per-question gaps ranked by weightedGap (descending).`);
P(`9. **Goals** (1/5/10-year) = one per domain from templates, phrased by the`);
P(`   domain's band and ordered by a deterministic priority rule per horizon.`);
P(`10. **Determinism.** Identical inputs always produce identical output —`);
P(`    no randomness, no model variance, no network.`);
P();
P(`The optional AI layer (local Ollama on desktop, Apple's on-device model on`);
P(`iOS) only re-words the deterministic vision/mission text. It never changes`);
P(`scores, goals, tensions, or flags, and the app is complete without it.`);
P();

// ── Appendices: canonical docs verbatim ─────────────────────────────────────
const docs = [
  ["docs/cana_foundation.md", "APPENDIX A — Research Foundation (canonical)"],
  ["docs/METHODOLOGY.md", "APPENDIX B — Methodology notes"],
  ["docs/ASSUMPTIONS.md", "APPENDIX C — Assumptions & limits"],
  ["docs/TREND_ANALYSIS.md", "APPENDIX D — Re-testing & trends"],
];
for (const [file, title] of docs) {
  P(`\n---\n\n# ${title}\n`);
  P(readFileSync(join(root, file), "utf8"));
}

// ── Appendix E: scoring source verbatim ─────────────────────────────────────
P(`\n---\n\n# APPENDIX E — Scoring source code (ground truth)\n`);
P(`Verbatim from src/engine.js v${pkg.version}: the classification helpers,`);
P(`the analytics pipeline, flag detection, and trend computation.\n`);
const src = readFileSync(join(root, "src/engine.js"), "utf8");
const slice = (startRe, endRe) => {
  const s = src.search(startRe);
  const rest = src.slice(s);
  const e = endRe ? rest.search(endRe) : rest.length;
  return s >= 0 ? rest.slice(0, e > 0 ? e : undefined) : "";
};
P("```js");
P(slice(/export const reverseScore/, /\/\/ ─── ANALYTICS/));
P(slice(/export function computeAnalytics/, /^export function generateLocalPlan/m));
P(slice(/function detectFlags|const detectFlags/, /\n(export )?function (?!detectFlags)/));
P(slice(/export function computeTrends/, /^export const DREAM_ELEMENTS/m));
P("```");

const outfile = process.argv[2] || join(homedir(), "Desktop", "CANA-Methodology-NotebookLM.md");
writeFileSync(outfile, out.join("\n"), "utf8");
const kb = Math.round(Buffer.byteLength(out.join("\n")) / 1024);
console.log(`✓ ${outfile} (${kb} KB, ${eng.DOMAINS.length} Domains, ${QTOTAL} Fragen)`);
