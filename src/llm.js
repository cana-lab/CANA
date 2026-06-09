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

// True only on the native iOS app (Capacitor). Synchronous + safe everywhere:
// on web/Electron, window.Capacitor is undefined, so this returns false and the
// normal Ollama path is used. On iOS it lets chat() hard-stop before any
// localhost network attempt.
function isIOSPlatform() {
  try {
    return typeof window !== "undefined" && window.Capacitor &&
      typeof window.Capacitor.getPlatform === "function" &&
      window.Capacitor.getPlatform() === "ios";
  } catch (e) {
    return false;
  }
}

// SECURITY: the couple's letters and answers are sent to this endpoint, so it
// MUST stay on this machine. We hard-restrict it to loopback (localhost /
// 127.0.0.1 / [::1]) regardless of what is stored or typed — defense in depth
// that does not rely on the CSP alone. Any other host is rejected and the
// default local endpoint is used instead.
function isLoopbackUrl(u) {
  try {
    const url = new URL(u);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const h = url.hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
  } catch (e) { return false; }
}

// Returns a safe base URL: the stored one if it is loopback, else the default.
function safeBase(stored) {
  return isLoopbackUrl(stored) ? stored : DEFAULT_BASE;
}

export function getLLMConfig() {
  try {
    const raw = localStorage.getItem("covenant_llm_config_v1");
    if (raw) {
      const cfg = JSON.parse(raw);
      // Never hand back a non-loopback endpoint, even if one was persisted.
      cfg.baseUrl = safeBase(cfg.baseUrl);
      return cfg;
    }
  } catch (e) {}
  return { baseUrl: DEFAULT_BASE, model: DEFAULT_MODEL, enabled: true };
}

// Returns { ok, error? }. Refuses to persist a non-loopback endpoint so the
// app can never be reconfigured to ship personal data off the device.
export function setLLMConfig(cfg) {
  const incoming = cfg || {};
  if (incoming.baseUrl !== undefined && !isLoopbackUrl(incoming.baseUrl)) {
    return { ok: false, error: "For privacy, the AI endpoint must be on this computer (localhost). Your letters never leave the device." };
  }
  try { localStorage.setItem("covenant_llm_config_v1", JSON.stringify(incoming)); } catch (e) {}
  return { ok: true };
}

// Validity check the UI can call before saving, to show inline feedback.
export function isValidEndpoint(u) { return isLoopbackUrl(u); }

// Low-level call. Returns the assistant message string, or throws.
// Backend selection:
//   - iOS (Capacitor) with Apple Foundation Model available → on-device Apple model.
//   - Everywhere else → local Ollama (unchanged).
// Both are mere ENHANCEMENT layers over the deterministic foundation; callers
// fall back to deterministic output if this throws or returns empty.
async function chat(messages, { json = false } = {}) {
  // Try the on-device Apple model first when on iOS. We import lazily so web /
  // Electron builds never touch Capacitor.
  try {
    const fm = await import("./foundationModel.js");
    if (await fm.isAppleAIAvailable()) {
      // Flatten the OpenAI-style messages into a system instruction + user prompt.
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
      const userPrompt = messages.filter((m) => m.role !== "system").map((m) => m.content).join("\n\n");
      if (json) {
        const obj = await fm.appleGenerateJSON(userPrompt, system);
        if (obj == null) throw new Error("Apple model returned no JSON");
        return JSON.stringify(obj);
      }
      const text = await fm.appleGenerate(userPrompt, system);
      if (text == null) throw new Error("Apple model returned nothing");
      return text;
    }
  } catch (e) {
    // The Apple path errored. On non-iOS this just means the plugin isn't there
    // (expected) and we fall through to Ollama below. On iOS we must NOT fall
    // through to a localhost Ollama fetch — see the hard stop right after.
  }

  // Hard stop on iOS: never attempt an Ollama (localhost:11434) fetch on the
  // native iOS app. If the Apple model was unavailable or failed above, we throw
  // here so the caller uses its deterministic fallback — with no network attempt.
  if (isIOSPlatform()) {
    throw new Error("On-device AI unavailable on iOS; using deterministic output");
  }

  const cfg = getLLMConfig();
  const base = safeBase(cfg.baseUrl); // hard stop: never POST personal data off-device
  const url = base.replace(/\/+$/, "") + "/chat/completions";
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
    const sys = "You extract ONLY what is explicitly written in a personal letter. You do not infer, interpret, or add anything not literally stated. Respond ONLY with valid JSON. No prose, no markdown.";
    const user = `This is a letter ${authorName} wrote from 10 years in the future, describing life as if it went well. Extract ONLY what is explicitly written — do not infer or invent.

LETTER:
"""${letterText.slice(0, 6000)}"""

Return JSON with these arrays of short phrases (3-8 words each), each a distinct idea taken directly from the text:
{
  "dreams": ["hopes/dreams the letter explicitly describes"],
  "achievements": ["concrete accomplishments explicitly described"],
  "values": ["values the letter EXPLICITLY states (only if literally named — otherwise leave empty)"],
  "themes": ["topics the letter actually returns to (only if clearly repeated — otherwise leave empty)"]
}
Rules: Use only the author's own stated content. Do NOT infer unstated values or motives. If a category isn't clearly supported by the text, return an empty array for it. At most 8 items per array.`;
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
    const sys = "You are a careful, literal analyst. You ONLY report what is explicitly present in two people's letter extracts. You never infer motives, never psychologize, never speculate about feelings or causes, and never connect ideas that aren't directly stated. If something is not clearly written in the text, it does not exist for your purposes. Differences are not conflicts unless the texts plainly contradict each other. Respond ONLY with valid JSON.";
    const user = `Two partners each wrote a letter from 10 years in the future. Here are the elements extracted from each letter:

${nameA}: ${JSON.stringify(extractA)}
${nameB}: ${JSON.stringify(extractB)}

Your task is STRICT and LITERAL. Follow these rules exactly:
- Only list a COMMONALITY if BOTH letters explicitly mention the same concrete dream or value. Treat clearly equivalent wording as the same (e.g. "our own studio" ≈ "building something of our own"). Do NOT stretch loose thematic similarity into a commonality.
- Only list a DIFFERENCE if the two letters make statements that plainly CONFLICT or point in clearly different directions on the SAME topic. Two people simply writing about different topics is NOT a difference — it is just two topics. Do NOT manufacture tension from absence or silence.
- NEVER infer emotions, intentions, fears, or root causes. NEVER add interpretation beyond the literal words.
- It is correct and expected to return FEW items, or even an empty list, if the letters don't explicitly support more. Quality over quantity. Do not pad.
- Rate "tension" conservatively: "low" by default; "medium" or "high" ONLY when the texts directly and unambiguously conflict.

Return JSON:
{
  "commonalities": [{"theme":"short label","detail":"one sentence quoting or closely paraphrasing what BOTH explicitly wrote"}],
  "differences": [{"theme":"short label","a":"what ${nameA} explicitly wrote","b":"what ${nameB} explicitly wrote","tension":"low|medium|high"}]
}
Up to 5 of each, but ONLY those directly supported by the text. Fewer is better than forced.`;
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
// The deterministic statement is the FOUNDATION. The AI only re-expresses it in
// warmer, more personal language — it may not add facts or remove any.
// `baseVM` = { vision, mission } from the deterministic engine (required anchor).
// Returns {vision,mission} or null.
export async function individualVisionMission(name, domainSummary, letterExtract, baseVM) {
  try {
    const sys = "You are a Christian pastoral writer. You are given a factual, deterministically-generated vision and mission as the FOUNDATION. Your only job is to re-express that same foundation in warmer, more personal, more natural language. You must NOT introduce any new facts, claims, dreams, strengths, or weaknesses that are not already in the foundation (you may draw on the letter only to choose warmer wording, never to add new claims). You must NOT remove any substantive point from the foundation. You never invent assessments of the person. Respond ONLY with valid JSON.";
    const user = `Re-express ${name}'s vision and mission below in warmer, more personal language.

FOUNDATION — this is the factual basis you must preserve (rephrase, do not add or drop facts):
Vision: ${baseVM?.vision || "(none)"}
Mission: ${baseVM?.mission || "(none)"}

CONTEXT (for choosing warmer wording ONLY — do not introduce new claims from this):
Their domain scores (0-10): ${domainSummary}
Elements from their 10-year letter: ${letterExtract ? JSON.stringify(letterExtract) : "(no letter provided)"}

Rules:
- Keep every concrete point from the FOUNDATION (the named strengths and growth areas must remain).
- Do NOT add new strengths, weaknesses, dreams, or any claim not in the foundation.
- Vision: ONE sentence. Mission: ONE or TWO sentences. Christ-centered, warm, specific, no generic filler.
- If you cannot improve on the foundation without inventing, return the foundation essentially as-is.

Return JSON: {"vision":"...","mission":"..."}`;
    const out = await chat([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
    const p = parseJSON(out);
    if (!p || !p.vision || !p.mission) return null;
    return { vision: p.vision, mission: p.mission };
  } catch (e) { return null; }
}

// ── 4. Joint vision + mission, compiled from both ───────────────────────────
// The deterministic joint statement is the FOUNDATION; the AI re-expresses it
// warmly using the couple's context, without adding or dropping facts.
// `baseVM` = { vision, mission } from the deterministic engine (required anchor).
// Returns {vision,mission} or null.
export async function jointVisionMission(nameA, nameB, indivA, indivB, comparison, overallSummary, evalSynthesis, baseVM) {
  try {
    const sys = "You are a Christian pastoral writer. You are given a factual, deterministically-generated JOINT vision and mission as the FOUNDATION. Your only job is to re-express that same foundation in warmer, more covenantal, more natural language that reads as unmistakably this couple's. You must NOT introduce new facts, strengths, weaknesses, tensions, or claims beyond the foundation and the explicit data given. You must NOT drop any substantive point from the foundation (the named strengths, growth areas, and tension must remain). You never invent an assessment of the marriage. Respond ONLY with valid JSON.";
    const ev = evalSynthesis || {};
    const user = `Re-express the couple's JOINT vision and mission below in warmer, more personal language for ${nameA} and ${nameB}.

FOUNDATION — the factual basis you must preserve (rephrase; do not add or drop facts):
Vision: ${baseVM?.vision || "(none)"}
Mission: ${baseVM?.mission || "(none)"}

CONTEXT (to choose warmer wording and keep it specific — do NOT add claims not supported here):
- ${nameA}'s vision: ${indivA?.vision || "(n/a)"}
- ${nameB}'s vision: ${indivB?.vision || "(n/a)"}
- Shared dreams: ${comparison ? JSON.stringify(comparison.commonalities) : "(n/a)"}
- Divergent dreams: ${comparison ? JSON.stringify(comparison.differences) : "(n/a)"}
- Overall health: ${ev.overall || "(n/a)"}/10
- Greatest strengths: ${ev.strongest ? ev.strongest.join("; ") : "(n/a)"}
- Areas most needing growth: ${ev.weakest ? ev.weakest.join("; ") : "(n/a)"}
- Widest gaps: ${ev.widestGaps ? ev.widestGaps.join("; ") : "(n/a)"}
- Biggest tensions: ${ev.topTensions && ev.topTensions.length ? ev.topTensions.join("; ") : "(none surfaced)"}
- Per-domain summary: ${overallSummary}

Rules:
- Keep every concrete point from the FOUNDATION — the named strengths, the named growth areas, and the tension it addresses must all still be present.
- Do NOT add new strengths, weaknesses, tensions, or any assessment not already in the foundation or the explicit context above.
- Joint Vision: ONE sentence. Joint Mission: TWO or THREE sentences. Christ-centered, covenantal, warm, specific. No filler.
- If you cannot improve on the foundation without inventing, return it essentially as-is.

Return JSON: {"vision":"...","mission":"..."}`;
    const out = await chat([{ role: "system", content: sys }, { role: "user", content: user }], { json: true });
    const p = parseJSON(out);
    if (!p || !p.vision || !p.mission) return null;
    return { vision: p.vision, mission: p.mission };
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
    const sys = "You write a discussion guide for a couple based ONLY on their self-rated scores. You are STRICT and LITERAL. You describe what the NUMBERS show and nothing else. You NEVER diagnose the marriage, NEVER use dramatic metaphors, and NEVER invent a narrative. Respond ONLY with valid JSON.";
    const gapsText = (topGaps || []).map((g) => `- ${g.domain} / "${g.question}": ${nameA} ${g.scoreA}, ${nameB} ${g.scoreB} (gap ${g.gap})`).join("\n") || "(no large gaps)";
    const user = `Prepare a "Start the Conversation" guide for ${nameA} and ${nameB}, using ONLY the data below.

DOMAIN SCORES (0-10, higher=healthier; gap = how far apart they scored): ${overallSummary}
BIGGEST SCORE DIVERGENCES:
${gapsText}
SHARED DREAMS THEY BOTH WROTE: ${comparison ? JSON.stringify(comparison.commonalities) : "(none recorded)"}

Produce JSON with this exact shape:
{
  "summary": {
    "positive": "1-2 sentences naming ONLY the domains with the highest scores, quoting the numbers. Example form: 'Your highest-scoring areas were Children & Family (7.8) and Faith (7.1).' Do not characterize the marriage.",
    "growth": "1-2 sentences naming ONLY the lowest-scoring domains and the largest gaps, quoting the numbers. Example form: 'Your lowest scores were in Vocation & Work (3.9), and your widest difference was in Faith & Calling (gap 1.5).' Do not interpret why.",
    "overall": "1 neutral sentence that ONLY restates what the guide is for. Example: 'The questions below focus on the areas where your scores differed most.' Do NOT assess the state or trajectory of the marriage."
  },
  "questions": [
    { "area": "domain name from the data", "prompt": "an open, non-accusatory question about that specific area", "why": "one factual sentence: which scores/gap this question relates to" }
  ]
}
STRICT RULES — these override tone:
- Use ONLY the domains, numbers, and gaps given above. If a number isn't above, don't state it.
- NEVER use phrases like "at a crossroads", "strong foundation", "must navigate", "deeper understanding", or any assessment of how the marriage is doing.
- NEVER claim how they "experience" anything or attribute feelings/causes. You only have numbers, not reasons.
- Do not say a score is "high" or "low" in absolute terms beyond ranking within THIS couple's own data.
- 5 to 7 questions, prioritizing the biggest divergences. Questions open-ended, gentle, specific to the named area, never yes/no, never blaming.
- If you are unsure whether something is supported by the data, leave it out. Fewer claims is better.`;
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
// Is an AI backend live right now? On iOS this is the on-device Apple model;
// everywhere else it's the local Ollama server. The app's orchestration uses
// this single check to decide whether to enhance the deterministic foundation.
export async function ollamaRunning() {
  try {
    const fm = await import("./foundationModel.js");
    if (await fm.isAppleAIAvailable()) return true;
  } catch (e) { /* not iOS / no plugin → fall through to Ollama check */ }
  // On iOS, never probe localhost — Ollama can't run there. If the Apple model
  // wasn't available above, report no AI backend (the app uses deterministic text).
  if (isIOSPlatform()) return false;
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
