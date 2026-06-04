// ============================================================================
// LLM CLIENT — Ollama (local, OpenAI-compatible)
// ----------------------------------------------------------------------------
// This is the ONLY module in the app that makes a network request, and it goes
// exclusively to the user-configured local Ollama endpoint (default
// http://localhost:11434). The deterministic engine never calls this.
//
// Design rules:
//  - Every call is best-effort. If Ollama is unreachable, each function returns
//    null and the app falls back to its deterministic/local output. The LLM is
//    an ENHANCEMENT layer, never a hard dependency.
//  - Determinism is approximated by temperature: 0 (the closest an LLM offers).
//  - JSON is requested explicitly and parsed defensively (fenced-code stripped).
// ============================================================================

const DEFAULT_BASE = "http://localhost:11434/v1";
const DEFAULT_MODEL = "llama3.1:8b";

export function getLLMConfig() {
  try {
    const raw = localStorage.getItem("covenant_llm_config_v1");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { baseUrl: DEFAULT_BASE, model: DEFAULT_MODEL, enabled: true };
}

export function setLLMConfig(cfg) {
  try { localStorage.setItem("covenant_llm_config_v1", JSON.stringify(cfg)); } catch (e) {}
}

// Low-level call. Returns the assistant message string, or throws.
async function chat(messages, { json = false } = {}) {
  const cfg = getLLMConfig();
  const url = cfg.baseUrl.replace(/\/+$/, "") + "/chat/completions";
  const body = {
    model: cfg.model || DEFAULT_MODEL,
    messages,
    temperature: 0,            // closest to deterministic the model allows
    stream: false,
  };
  if (json) body.response_format = { type: "json_object" }; // honored by Ollama for many models
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer ollama" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// Connectivity probe used by the settings screen.
export async function testConnection() {
  try {
    const out = await chat([{ role: "user", content: "Reply with the single word: ok" }]);
    return { ok: true, sample: (out || "").trim().slice(0, 40) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// List installed Ollama models via the native /api/tags endpoint so the user
// can pick from a dropdown instead of typing a model name.
export async function listModels() {
  const cfg = getLLMConfig();
  // /api/tags lives at the server root, not under /v1
  const root = cfg.baseUrl.replace(/\/v1\/?$/, "").replace(/\/+$/, "");
  try {
    const res = await fetch(root + "/api/tags", { method: "GET" });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, models: [] };
    const data = await res.json();
    const models = (data?.models || []).map((m) => m.name).filter(Boolean);
    return { ok: true, models };
  } catch (e) {
    return { ok: false, error: e.message, models: [] };
  }
}

function parseJSON(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  // Grab the outermost JSON object if the model added prose around it.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try { return JSON.parse(slice); } catch (e) { return null; }
}

// ── 1. Extract structured elements from ONE letter ──────────────────────────
// Returns { dreams:[], achievements:[], values:[], themes:[] } or null.
export async function extractLetter(letterText, authorName) {
  if (!letterText || letterText.trim().length < 20) return null;
  try {
    const sys = "You extract structured themes from a personal letter. Respond ONLY with valid JSON. No prose, no markdown.";
    const user = `This is a letter ${authorName} wrote from 10 years in the future, describing life as if it went well. Extract the key elements.

LETTER:
"""${letterText.slice(0, 6000)}"""

Return JSON with these arrays of short phrases (3-8 words each), each item a distinct idea:
{
  "dreams": ["fulfilled dreams / hopes described"],
  "achievements": ["concrete accomplishments described"],
  "values": ["underlying values evident in the letter"],
  "themes": ["recurring themes / motifs"]
}
Keep each array to at most 8 items. Use the author's own concepts, lightly normalized.`;
    const out = await chat([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
    const parsed = parseJSON(out);
    if (!parsed) return null;
    return {
      dreams: arr(parsed.dreams), achievements: arr(parsed.achievements),
      values: arr(parsed.values), themes: arr(parsed.themes),
    };
  } catch (e) { return null; }
}

// ── 2. Compare two letters → top commonalities & differences ────────────────
// Returns { commonalities:[{theme,detail}], differences:[{theme,a,b}] } or null.
export async function compareLetters(extractA, extractB, nameA, nameB) {
  if (!extractA || !extractB) return null;
  try {
    const sys = "You compare two people's future-vision letters with care and nuance. Differences are not automatically conflicts. Respond ONLY with valid JSON.";
    const user = `Two partners each wrote a letter from 10 years in the future. Their extracted elements:

${nameA}: ${JSON.stringify(extractA)}
${nameB}: ${JSON.stringify(extractB)}

Identify where their visions genuinely overlap and where they meaningfully differ. Treat semantically equivalent ideas as overlaps even if worded differently (e.g. "our own studio" and "building something of our own"). A difference is only worth listing if it is substantive — not mere wording.

Return JSON:
{
  "commonalities": [{"theme":"short label","detail":"one sentence on the shared dream"}],
  "differences": [{"theme":"short label","a":"what ${nameA} envisions","b":"what ${nameB} envisions","tension":"low|medium|high"}]
}
Give the TOP 5 commonalities and TOP 5 differences, most significant first. Rate each difference's tension honestly: low = complementary/easily reconciled, high = genuinely competing visions.`;
    const out = await chat([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
    const parsed = parseJSON(out);
    if (!parsed) return null;
    return {
      commonalities: arr(parsed.commonalities).slice(0, 5),
      differences: arr(parsed.differences).slice(0, 5),
    };
  } catch (e) { return null; }
}

// ── 3. Individual vision + mission for ONE partner ──────────────────────────
// Uses that partner's domain scores + their letter extract. Returns {vision,mission} or null.
export async function individualVisionMission(name, domainSummary, letterExtract) {
  try {
    const sys = "You are a Christian pastoral writer. You write a personal vision and mission for one individual, grounded in their actual data. Respond ONLY with valid JSON.";
    const user = `Write a personal VISION and MISSION statement for ${name}, grounded in Scripture and their real data.

THEIR DOMAIN SCORES (0-10, higher = healthier):
${domainSummary}

ELEMENTS FROM THEIR 10-YEAR FUTURE LETTER:
${letterExtract ? JSON.stringify(letterExtract) : "(no letter provided)"}

Rules:
- Vision: ONE sentence — who ${name} is called by God to become, reflecting their letter's dreams and their score pattern (name a strength and a growth area).
- Mission: ONE or TWO sentences — how ${name} will live toward that vision.
- Christ-centered, specific, honest. No generic filler.

Return JSON: {"vision":"...","mission":"..."}`;
    const out = await chat([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
    return parseJSON(out);
  } catch (e) { return null; }
}

// ── 4. Joint vision + mission, compiled from both ───────────────────────────
// Returns {vision,mission} or null.
export async function jointVisionMission(nameA, nameB, indivA, indivB, comparison, overallSummary, evalSynthesis) {
  try {
    const sys = "You are a Christian pastoral writer compiling a COUPLE's shared vision and mission. You ground every line in the couple's actual assessment data — their strengths, their weak areas, and where they most diverge — so the result reads as unmistakably theirs. Respond ONLY with valid JSON.";
    const ev = evalSynthesis || {};
    const user = `Compile a JOINT vision and mission for ${nameA} and ${nameB}, synthesizing BOTH their letters AND their assessment evaluation.

${nameA}'s individual vision: ${indivA?.vision || "(n/a)"}
${nameA}'s individual mission: ${indivA?.mission || "(n/a)"}
${nameB}'s individual vision: ${indivB?.vision || "(n/a)"}
${nameB}'s individual mission: ${indivB?.mission || "(n/a)"}

Shared dreams (from their letters): ${comparison ? JSON.stringify(comparison.commonalities) : "(n/a)"}
Divergent dreams: ${comparison ? JSON.stringify(comparison.differences) : "(n/a)"}

ASSESSMENT EVALUATION (use this — it is the core of the synthesis):
- Overall health: ${ev.overall || "(n/a)"}/10
- Greatest strengths: ${ev.strongest ? ev.strongest.join("; ") : "(n/a)"}
- Areas most needing growth: ${ev.weakest ? ev.weakest.join("; ") : "(n/a)"}
- Widest gaps between the two of them: ${ev.widestGaps ? ev.widestGaps.join("; ") : "(n/a)"}
- Biggest tensions to navigate: ${ev.topTensions && ev.topTensions.length ? ev.topTensions.join("; ") : "(none surfaced)"}
- Warning flags: ${ev.flags && ev.flags.length ? ev.flags.join("; ") : "(none)"}

Per-domain summary: ${overallSummary}

Rules:
- Joint Vision: ONE sentence on who they are called to become TOGETHER. It must draw on their genuine shared dreams AND lean on their real strengths (named above), while honoring their differences.
- Joint Mission: TWO or THREE sentences on how they will pursue it — and it MUST explicitly address their areas most needing growth and their biggest tension, turning the evaluation into concrete shared intent. Name the actual areas; do not be generic.
- Christ-centered, covenantal, warm, hopeful, specific to THEIR data. No filler.

Return JSON: {"vision":"...","mission":"..."}`;
    const out = await chat([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
    return parseJSON(out);
  } catch (e) { return null; }
}

function arr(x) { return Array.isArray(x) ? x.filter(Boolean) : []; }

// ── 5. Personalize the goals from the couple's real data ────────────────────
// Takes the deterministic goals (per horizon) and rewrites them grounded in the
// couple's actual scores, tensions, and shared dreams. Returns the same shape
// { goals1yr, goals5yr, goals10yr } where each item is { domain, goal }, or
// null on any failure (caller keeps the deterministic goals).
export async function personalizeGoals(nameA, nameB, overallSummary, comparison, baseGoals) {
  try {
    const sys = "You are a Christian pastoral coach writing concrete, actionable couple goals grounded in real data. You keep each goal to ONE specific sentence. Respond ONLY with valid JSON.";
    const horizonText = (g) => g.map((x) => `- [${x.domain}] ${x.goal}`).join("\n");
    const user = `Rewrite these draft goals for ${nameA} and ${nameB} so each is specific, warm, and actionable — grounded in their real situation. Keep the SAME domains and the SAME number of goals per horizon. Improve the wording; do not invent new domains.

COUPLE DOMAIN SUMMARY (0-10, higher=healthier; gaps shown): ${overallSummary}
SHARED DREAMS: ${comparison ? JSON.stringify(comparison.commonalities) : "(n/a)"}
DIVERGENT DREAMS: ${comparison ? JSON.stringify(comparison.differences) : "(n/a)"}

DRAFT 1-YEAR GOALS:
${horizonText(baseGoals.goals1yr)}

DRAFT 5-YEAR GOALS:
${horizonText(baseGoals.goals5yr)}

DRAFT 10-YEAR GOALS:
${horizonText(baseGoals.goals10yr)}

Rules:
- Each goal: ONE concrete sentence, Christ-centered, specific to THIS couple, no generic filler.
- Preserve each goal's domain label exactly.
- Return JSON: {"goals1yr":[{"domain":"...","goal":"..."}],"goals5yr":[...],"goals10yr":[...]}`;
    const out = await chat([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
    const parsed = parseJSON(out);
    if (!parsed) return null;
    // Validate shape: each horizon must be a non-empty array with domain+goal.
    const ok = ["goals1yr", "goals5yr", "goals10yr"].every(
      (k) => Array.isArray(parsed[k]) && parsed[k].length && parsed[k].every((g) => g && g.domain && g.goal)
    );
    return ok ? { goals1yr: parsed.goals1yr, goals5yr: parsed.goals5yr, goals10yr: parsed.goals10yr } : null;
  } catch (e) { return null; }
}

// ── 6. "Start the Conversation" — deeper questions + framing summary ────────
// Produces a guided conversation aimed at moving the couple toward greater
// alignment ("upward drift"): an honest summary of strengths and growth areas,
// what the overall picture means, and targeted open questions for their biggest
// divergences. Returns { summary:{positive,growth,overall}, questions:[{area,
// prompt, why}] } or null on failure (caller uses a deterministic fallback).
export async function conversationGuide(nameA, nameB, overallSummary, topGaps, comparison) {
  try {
    const sys = "You are a wise, warm Christian marriage mentor preparing a couple to talk through their differences constructively. You are honest about hard things but always point toward hope and growth. Respond ONLY with valid JSON.";
    const gapsText = (topGaps || []).map((g) => `- ${g.domain} / "${g.question}": ${nameA} ${g.scoreA}, ${nameB} ${g.scoreB} (gap ${g.gap})`).join("\n") || "(no large gaps)";
    const user = `Prepare a "Start the Conversation" guide for ${nameA} and ${nameB}.

DOMAIN PICTURE (0-10, higher=healthier; gap = how far apart they scored): ${overallSummary}
BIGGEST DIVERGENCES:
${gapsText}
SHARED DREAMS: ${comparison ? JSON.stringify(comparison.commonalities) : "(n/a)"}

Produce JSON with this exact shape:
{
  "summary": {
    "positive": "2-3 sentences naming their genuine strengths, specific to the data.",
    "growth": "2-3 sentences honestly naming where they are most out of step or weakest, without shaming.",
    "overall": "2-3 sentences on what the overall picture means and where they stand in the bigger journey of a marriage."
  },
  "questions": [
    { "area": "domain or theme", "prompt": "an open, non-accusatory question they can discuss together", "why": "one sentence on what this surfaces and how it helps them move toward alignment" }
  ]
}
Rules:
- 5 to 7 questions, prioritizing their biggest divergences.
- Questions must be open-ended, gentle, and specific to THIS couple — never yes/no, never blaming.
- Christ-centered and hopeful in tone; aim at growth and unity.`;
    const out = await chat([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
    const p = parseJSON(out);
    if (!p || !p.summary || !Array.isArray(p.questions) || !p.questions.length) return null;
    if (!p.summary.positive || !p.summary.growth || !p.summary.overall) return null;
    const questions = p.questions.filter((q) => q && q.prompt).map((q) => ({ area: q.area || "", prompt: q.prompt, why: q.why || "" }));
    if (!questions.length) return null;
    return { summary: p.summary, questions };
  } catch (e) { return null; }
}

// ----------------------------------------------------------------------------
// Used by the in-app setup wizard. All Ollama calls go to the local server.
// macOS will not let the app install Ollama silently; these helpers DETECT
// state and (once Ollama is installed) drive the model download with progress.
// ============================================================================

const OLLAMA_ROOT = "http://localhost:11434";

// Is the local Ollama server reachable right now?
export async function ollamaRunning() {
  try {
    const res = await fetch(`${OLLAMA_ROOT}/api/tags`, { method: "GET" });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// Which models are already pulled? Returns array of names (e.g. ["llama3.1:8b"]).
export async function installedModels() {
  try {
    const res = await fetch(`${OLLAMA_ROOT}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m) => m.name);
  } catch (e) {
    return [];
  }
}

// Pull a model with streamed progress. onProgress receives { percent, status }.
// Returns true on success. Ollama's /api/pull streams newline-delimited JSON
// objects with `total` and `completed` byte counts.
export async function pullModel(model, onProgress, signal) {
  try {
    const res = await fetch(`${OLLAMA_ROOT}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: true }),
      signal,
    });
    if (!res.ok || !res.body) return false;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let lastPct = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let obj;
        try { obj = JSON.parse(line); } catch { continue; }
        if (obj.error) { onProgress && onProgress({ percent: lastPct, status: obj.error, error: true }); return false; }
        if (obj.total && obj.completed != null) {
          lastPct = Math.min(100, Math.round((obj.completed / obj.total) * 100));
        }
        onProgress && onProgress({ percent: lastPct, status: obj.status || "" });
        if (obj.status === "success") { onProgress && onProgress({ percent: 100, status: "success" }); return true; }
      }
    }
    return true;
  } catch (e) {
    if (e.name === "AbortError") return false;
    onProgress && onProgress({ percent: 0, status: e.message, error: true });
    return false;
  }
}
