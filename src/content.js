// CANA — long-form in-app content.
// Authored from docs/cana_foundation.md so the app and the research document
// stay consistent. Book titles use *italics* (rendered by RichText).

/* ── INTRODUCTION / METHODOLOGY PAGE ──────────────────────────────────── */

export const INTRO_SECTIONS = [
  {
    id: "what",
    title: "What CANA is",
    body: [
      "CANA is a structured-reflection tool for couples. Each partner answers independently across nine life domains; the app then turns two honest sets of answers into a single shared picture — a joint vision and mission, prioritized goals, the points where you most diverge, and the health of each domain.",
      "It is built on three commitments: determinism (identical answers always produce an identical result — the scoring is a pure function, with no randomness), scientific grounding (the domain weights, gap bands, and pattern flags are anchored to published research), and privacy by architecture (your answers never leave this device).",
      "It is a prompt for conversation and prayer — a place to notice and name things you may not yet have put into words. It is not a clinical instrument, a diagnosis, or a verdict on a marriage.",
    ],
  },
  {
    id: "baseline",
    title: "The baseline: what a healthy, biblical marriage is",
    body: [
      "Christian theology treats marriage not as a contract optimized for mutual benefit but as a covenant — a binding, self-giving union that images God's faithfulness to His people. A contract says \"I will, if you will\"; a covenant says \"I will, regardless.\" (Genesis 2:24; Matthew 19:5–6; Ephesians 5:31.)",
      "Ephesians 5:21–33 opens with mutual submission — \"submitting to one another out of reverence for Christ\" — before addressing husbands and wives, and calls for sacrificial, Christlike love. Forgiveness and bearing with one another are baseline competencies, not extras (Colossians 3:13).",
      "Remarkably, four decades of relationship science describe a healthy marriage in terms that rhyme with this. Stable couples maintain roughly five positive interactions for every negative one during conflict. The corrosive patterns — criticism, contempt, defensiveness, and stonewalling, what John Gottman calls the \"Four Horsemen\" — predict dissolution, with contempt the single strongest predictor. And the decisive protective skill is not the absence of conflict but the ability to repair after it.",
      "The convergence is the foundation's core thesis: the biblical prescription and the empirical description point the same direction.",
    ],
  },
  {
    id: "domains",
    title: "The nine chapters (domains)",
    body: [
      "Each domain exists because both a theological tradition and an empirical literature identify it as load-bearing for marital health. The weight reflects the strength of the combined evidence — Faith and Marriage carry the most, individual domains like Creative Life the least. During the assessment, each chapter's \"About this Chapter\" panel shows its biblical principle (with references), any source books, and the peer-reviewed science.",
    ],
    domains: true, // signal to render the per-domain about content here too
  },
  {
    id: "sources",
    title: "Theological sources",
    body: [
      "The empirical backbone is the Gottman and sanctification research. The theological depth draws on pastoral works in the Reformed-evangelical tradition. Where a book identified a dynamic not already captured — and that dynamic had independent support — it generated a question; otherwise it informed the framing.",
      "Timothy & Kathy Keller, *The Meaning of Marriage*, contributed two ideas strong enough to become questions: that the chief enemy of marriage is each spouse's own self-centeredness, and that marriage is a \"spiritual friendship\" in which each helps the other become who God is calling them to be.",
      "Paul David Tripp, *What Did You Expect?*, contributed the insight that marriages erode through unexamined, unspoken expectations and the slow accumulation of small offenses — answered by a discipline of confession and forgiveness.",
      "John Piper, *This Momentary Marriage*, deepens the framing of permanence and marriage's purpose as a parable pointing beyond itself. Dave Harvey, *When Sinners Say \"I Do\"*, grounds forgiveness in the gospel.",
      "One contested area — complementarian gender-role theology — was deliberately excluded, so the instrument never rates a marriage as healthier or less healthy based on a couple's view of gender roles, a point on which faithful Christians disagree. CANA stays role-neutral: it measures mutual self-giving, feeling known, and shared growth — commitments both complementarian and egalitarian Christians affirm.",
    ],
  },
  {
    id: "method",
    title: "How the scoring works",
    body: [
      "Answers use a 0–3 / 7–10 scale with no neutral middle, which gently forces a direction rather than letting everything sit at \"5.\" Questions that measure a problem (for example, \"Money is a source of recurring conflict\") are reverse-scored, so that after the math a higher number always means healthier.",
      "Each domain is normalized to a 0–10 average per partner. The gap between partners on the same questions is the most diagnostically rich signal — it is surfaced so it can be named, never labeled as pathology. Pattern flags fire on specific combinations (for instance, faith and marriage both low together) because risk is often interactive.",
      "All of this — scoring, gaps, weighting, flags, trends — is deterministic and runs on your device. A local AI model (Ollama), if you have it running, writes only the language of the vision, mission, and letter analysis; it never touches the numbers, and the app works fully without it.",
    ],
  },
  {
    id: "limits",
    title: "What this cannot do",
    body: [
      "This is the most important section. A self-report questionnaire captures perception, not behavior — Gottman's predictive power came from observing couples directly. CANA cannot detect the Four Horsemen in action, cannot see contempt the way an observer could, and cannot measure what actually happens between you.",
      "It is not a screening tool for abuse, coercion, or safety risk, and must never be used to assess whether a marriage with safety concerns is \"healthy.\" It does not diagnose depression, anxiety, trauma, addiction, or any clinical condition.",
      "It is a starting point for conversation and prayer — explicitly not a substitute for pastoral care, licensed couples therapy (such as Gottman Method or EFT), individual therapy, or immediate professional help where there is any abuse or safety concern. Its numbers are conversation-starters, not measurements; it surfaces patterns worth discussing, and it does not pronounce verdicts.",
    ],
  },
  {
    id: "refs",
    title: "Key references",
    refs: [
      "Gottman, J. (1994). What Predicts Divorce?",
      "Gottman, J. M., & Levenson, R. W. (2000). The timing of divorce. Journal of Marriage and Family, 62(3).",
      "Mahoney, A., Pargament, K. I., et al. (1999). Marriage and the spiritual realm. Journal of Family Psychology, 13(3).",
      "Mahoney, A. (2010). Religion in families, 1999–2009. Journal of Marriage and Family, 72(4).",
      "Kusner, K. G., Mahoney, A., Pargament, K. I., & DeMaris, A. (2014). Sanctification of marriage and spiritual intimacy across the transition to parenthood. Journal of Family Psychology, 28(5).",
      "Dew, J., Britt, S., & Huston, S. (2012). Financial issues and divorce. Family Relations, 61(4).",
      "Stanley, S. M., Markman, H. J., & Whitton, S. W. (2002). Communication, conflict, and commitment. Family Process, 41(4).",
      "Keller, T. & K. (2011). The Meaning of Marriage. Dutton.",
      "Tripp, P. D. (2010). What Did You Expect? Crossway.",
      "Piper, J. (2009). This Momentary Marriage. Crossway.",
      "Harvey, D. (2007). When Sinners Say \"I Do\". Shepherd Press.",
    ],
    footer: "Reported figures are sample-specific findings from the cited studies, not guarantees about any individual couple. The complete model is in the project's research foundation document.",
  },
];

/* ── HOW TO APPROACH THIS (shown after pressing Begin) ────────────────── */

export const PREPARE = {
  title: "Before you begin",
  lead: "How you answer matters more than how fast you finish. A few minutes of honest reflection gives a far more useful result than quick guesses.",
  points: [
    { h: "Answer for yourself", t: "Give your own honest perspective — not what you think your partner wants to hear, not what you think you should feel, and not a negotiated middle. The tool's value comes from two genuine, independent viewpoints." },
    { h: "Don't discuss first", t: "Answer separately, before comparing. If you align your answers in advance, the gaps that would have been worth talking about quietly disappear — and those gaps are the point." },
    { h: "Be truthful, not aspirational", t: "Answer how things actually are right now, not how you hope they'll be. An honest low score is more useful than a hopeful high one; it's what makes the result trustworthy." },
    { h: "There are no wrong answers", t: "A large difference between you is not a failure — most lasting conflicts are perpetual and normal. A gap simply marks a conversation worth having, not a problem with your marriage." },
    { h: "It's a starting point", t: "This is a prompt for conversation and prayer, not a verdict. Take your time, and hold the results lightly." },
  ],
};

/* ── SCORE EXPLANATIONS (info tag on the results screen) ──────────────── */
/* Strictly descriptive — explains WHAT each number is, not what it means
   for a given couple. */

export const SCORE_INFO = {
  title: "What these numbers are",
  items: [
    { h: "The 0–10 scores", t: "Each partner's answers in a domain are converted to a single average on a 0–10 scale, where higher always means a healthier self-report (problem-focused questions are reverse-scored first, so the direction is consistent everywhere)." },
    { h: "Per-partner bars", t: "The two bars in each domain are each partner's own average for that domain — they show how each of you answered, side by side." },
    { h: "The gap (Δ)", t: "The Δ is simply the distance between your two scores in that domain — how differently the two of you answered the same questions. It is a measure of difference, not of right or wrong." },
    { h: "The overall score", t: "A single weighted average across all domains, with the more heavily-weighted domains (such as Faith and Marriage) counting for more. It summarizes the self-reports into one number." },
    { h: "Tensions", t: "The specific questions where your answers diverged most, ranked by the size of the gap multiplied by the domain's weight." },
    { h: "Pattern flags", t: "Notices that fire when particular combinations of scores cross set thresholds. They mark combinations the methodology treats as worth attention." },
    { h: "Weights", t: "Each domain's contribution to the overall score. They are a research-informed default, adjustable with the sliders; changing them re-weights the summary but never changes your answers." },
  ],
  footer: "These describe what the figures are. They are self-reported conversation-starters, not clinical measurements, and the app does not interpret them for you.",
};

/* ── SETUP WIZARD — model choices ─────────────────────────────────────── */
/* Sizes are approximate download sizes; smaller = faster to download and run
   on modest hardware, larger = somewhat better writing in the vision/mission. */

export const MODEL_CHOICES = [
  { id: "llama3.2:3b", label: "Small — Llama 3.2 3B", size: "~2 GB", note: "Fastest to download and run. Good on any modern Mac." },
  { id: "llama3.1:8b", label: "Standard — Llama 3.1 8B", size: "~4.7 GB", note: "The default. Better writing; needs a bit more memory and time." },
  { id: "gemma2:2b",   label: "Tiny — Gemma 2 2B",       size: "~1.6 GB", note: "Smallest option. Quickest, with simpler phrasing." },
];

export const SETUP = {
  title: "Set up CANA",
  lead: "CANA runs entirely on your Mac. The AI that writes your vision and mission uses a local model called Ollama — nothing is ever sent online. This quick setup gets it ready. You can also skip it: CANA works fully without AI, using its built-in text.",
  // macOS does not allow an app to install other software silently, so the two
  // system installs below are one-click-guided, not automatic. The model
  // download IS automated by CANA once Ollama is running.
  steps: {
    node: {
      title: "Node.js",
      installedText: "Installed.",
      missingText: "Only needed if you plan to rebuild CANA yourself. Not required just to use the app.",
    },
    ollama: {
      title: "Ollama (the local AI engine)",
      installedNotRunning: "Installed, but not running. Open the Ollama app once (it lives in your Applications folder); its icon appears in the menu bar.",
      missingText: "Not installed yet. Download it (free), open the downloaded file, and drag Ollama into Applications. Then come back here.",
      running: "Running.",
      url: "https://ollama.com/download/mac",
    },
    model: {
      title: "AI model",
      missingText: "Choose a size and CANA will download it for you with a progress bar.",
      ready: "Ready.",
    },
  },
};
