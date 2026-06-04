// CANA — long-form in-app content.
// Authored from docs/cana_foundation.md so the app and the research document
// stay consistent. Book titles use *italics* (rendered by RichText).

/* ── INTRODUCTION / METHODOLOGY PAGE ──────────────────────────────────── */

export const INTRO_SECTIONS = [
  {
    id: "what",
    title: "What CANA is",
    body: [
      "CANA is a structured-reflection tool for couples. Each partner answers a set of questions on their own, across eleven areas of life. The app then takes both sets of honest answers and turns them into a single shared picture: a joint vision and mission, a short list of priorities, the places where the two of you see things most differently, and a sense of how healthy each area is right now.",
      "It rests on three commitments. First, it is consistent: the same answers always produce the same result, because the scoring is fixed math with nothing random in it. Second, it is grounded: the questions and the way results are framed draw on established relationship research and on the Christian understanding of marriage. Third, it is private by design: your answers never leave this device.",
      "Above all, CANA is a starting point for conversation and prayer — a way to notice and put words to things you may not have named yet. It is not a clinical test, a diagnosis, or a verdict on your marriage.",
    ],
  },
  {
    id: "baseline",
    title: "The baseline: what a healthy, biblical marriage is",
    body: [
      "Christian theology treats marriage not as a contract built for mutual advantage but as a covenant — a binding, self-giving union that reflects God's faithfulness to His people. A contract says, \"I will, if you will.\" A covenant says, \"I will, regardless.\" (Genesis 2:24; Matthew 19:5–6; Ephesians 5:31.)",
      "Ephesians 5:21–33 begins with mutual submission — \"submitting to one another out of reverence for Christ\" — before it speaks to husbands and wives, and it calls for the kind of sacrificial love modeled by Christ. Forgiveness and patience with each other are treated as basic competencies, not optional extras (Colossians 3:13).",
      "Strikingly, decades of relationship research describe a healthy marriage in terms that echo this. The psychologist John Gottman found that stable, happy couples tend to maintain about five positive interactions for every negative one during conflict. He also identified four corrosive patterns — criticism, contempt, defensiveness, and stonewalling, which he calls the \"Four Horsemen\" — that strongly predict divorce, with contempt being the single strongest predictor. And the skill that most protects a marriage is not avoiding conflict altogether, but being able to repair things afterward.",
      "That convergence is the heart of the matter: the biblical picture of marriage and the research findings point in the same direction.",
    ],
  },
  {
    id: "domains",
    title: "The eleven chapters (domains)",
    body: [
      "Each of the eleven areas is here because both the Christian tradition and the research literature treat it as important to a marriage's health. Some areas carry more weight in the overall score than others — Faith and Marriage count for the most, an area like Creative Life for less. Those weights reflect our own considered judgment about what matters most, informed by the research; they are not themselves figures taken from any single study. During the assessment, each chapter's \"About this Chapter\" panel shows the biblical principle behind it (with references), any books that shaped it, and the related research.",
    ],
    domains: true, // signal to render the per-domain about content here too
  },
  {
    id: "sources",
    title: "Sources",
    body: [
      "The research backbone is John Gottman's work on what predicts marital stability, together with studies on the role of faith in marriage (notably Annette Mahoney and Kenneth Pargament's research on couples who regard their marriage as sacred). The theological depth comes from pastoral writers in the Reformed-evangelical tradition. Where one of these books named a dynamic the research also supported, it often became a question; otherwise it shaped how results are framed.",
      "Timothy and Kathy Keller, in *The Meaning of Marriage*, contributed two ideas strong enough to become questions: that the deepest threat to a marriage is each spouse's own self-centeredness, and that marriage is a \"spiritual friendship\" in which each helps the other become who God is calling them to be.",
      "Paul David Tripp, in *What Did You Expect?*, contributed the insight that marriages wear down through unspoken expectations and the slow buildup of small, unaddressed offenses — and that the remedy is a steady practice of confession and forgiveness.",
      "John Piper's *This Momentary Marriage* deepens the themes of permanence and of marriage as a picture pointing beyond itself to Christ. Dave Harvey's *When Sinners Say \"I Do\"* roots forgiveness in the gospel.",
      "One contested area — complementarian gender-role theology — was deliberately left out, so that CANA never rates a marriage as healthier or less healthy based on a couple's view of gender roles, a question on which faithful Christians genuinely differ. Instead it stays role-neutral, measuring mutual self-giving, feeling truly known, and shared growth — commitments that both complementarian and egalitarian Christians affirm.",
    ],
  },
  {
    id: "method",
    title: "How the scoring works",
    body: [
      "Answers use a 0–3 and 7–10 scale with no neutral middle, which gently nudges you toward a direction rather than letting everything settle at a noncommittal \"5.\" Questions that describe a problem (for example, \"Money is a source of recurring conflict\") are scored in reverse, so that once the math is done, a higher number always means healthier.",
      "Each area is then converted to a 0–10 average for each partner. The gap between the two of you on the same questions is often the most revealing signal of all, so it is shown plainly — never labeled as something wrong with you, just surfaced so you can talk about it. Some warning flags appear only when certain answers combine (for instance, faith and marriage both scoring low at the same time), because difficulties often compound one another.",
      "All of this — the scoring, the gaps, the weighting, the flags, and the trends over time — is fixed, repeatable math that runs entirely on your device. If you have a local AI model (Ollama) running, it writes only the wording of the vision, mission, and letter analysis; it never changes any of the numbers, and the app works fully without it.",
    ],
  },
  {
    id: "limits",
    title: "What this cannot do",
    body: [
      "This is the most important section. A self-report questionnaire captures how things feel to you, not what actually happens between you — and Gottman's predictive accuracy came from directly observing couples, not from surveys. CANA cannot watch the Four Horsemen in action, cannot see contempt the way a trained observer could, and cannot measure your actual behavior together.",
      "It is not a screening tool for abuse, coercion, or safety, and it must never be used to judge whether a marriage where there are safety concerns is \"healthy.\" It does not diagnose depression, anxiety, trauma, addiction, or any other clinical condition.",
      "It is a starting point for conversation and prayer — explicitly not a substitute for pastoral care, licensed couples therapy (such as the Gottman Method or Emotionally Focused Therapy), individual therapy, or immediate professional help wherever there is any abuse or safety concern. Its numbers are conversation-starters, not measurements. It surfaces patterns worth discussing; it does not hand down verdicts.",
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
      "Park, H. G., Leonhardt, N. D., Johnson, M. D., et al. (2023). Sexual satisfaction predicts future changes in relationship satisfaction and sexual frequency. Personality Science, 4.",
      "Schoenfeld, E. A., et al. (2017). Longitudinal associations among relationship satisfaction, sexual satisfaction, and frequency of sex in early marriage. Archives of Sexual Behavior, 46(8).",
      "Mallory, A. B., et al. (2022). Dimensions of couples' sexual communication, relationship satisfaction, and sexual satisfaction: a meta-analysis. Journal of Family Psychology, 36(3).",
      "Fiori, K. L., Rauer, A. J., Birditt, K. S., Brown, E., & Orbuch, T. L. (2021). \"You aren't as close to my family as you think\": Discordant perceptions about in-laws and risk of divorce. Research in Human Development, 18(1–2).",
      "Keller, T. & K. (2011). The Meaning of Marriage. Dutton.",
      "Tripp, P. D. (2010). What Did You Expect? Crossway.",
      "Piper, J. (2009). This Momentary Marriage. Crossway.",
      "Harvey, D. (2007). When Sinners Say \"I Do\". Shepherd Press.",
    ],
    footer: "The research figures above are findings from specific studies and samples, not promises about any individual couple. The domain weights and thresholds used in CANA are our own considered judgments, informed by this literature rather than taken directly from it. The complete model is described in the project's research foundation document.",
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
