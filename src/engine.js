// ============================================================================
// COVENANT LIFE PLAN — DETERMINISTIC ENGINE
// ----------------------------------------------------------------------------
// This module contains ALL scoring, classification, pattern detection, and
// language generation. It is 100% deterministic: identical inputs always
// produce identical outputs. There are NO network calls anywhere in this file.
// All computation happens locally in the browser. No data ever leaves the
// device.
//
// Scientific basis is cited inline at each decision point.
// ============================================================================

// ─── RESPONSE-TYPE TAXONOMY ─────────────────────────────────────────────────
// Each question is one of several cognitive tasks. Best practice in survey
// methodology (Krosnick & Presser, 2010; Dillman, Smyth & Christian, 2014)
// requires response labels that match the question's task — a satisfaction
// question must use satisfaction language, not generic "agree/disagree".
//
// We deliberately omit the scale midpoint (4, 5, 6). Forced-choice without a
// neutral option reduces "central tendency bias" and acquiescence (Garland,
// 1991; Nowlis, Kahn & Dhar, 2002), pushing the respondent to commit to a
// directional judgment. This is intentional and matches the user's request.

export const RESPONSE_TYPES = {
  AGREEMENT: {
    name: "Agreement",
    low:  [{ v: 0, l: "0", d: "Not true" },     { v: 1, l: "1", d: "Rarely true" }, { v: 2, l: "2", d: "Seldom true" },  { v: 3, l: "3", d: "Partly true" }, { v: 4, l: "4", d: "Somewhat true" }],
    high: [{ v: 6, l: "6", d: "Fairly true" },   { v: 7, l: "7", d: "Mostly true" },   { v: 8, l: "8", d: "Often true" },  { v: 9, l: "9", d: "Very true" },    { v: 10, l: "10", d: "Fully true" }],
  },
  SATISFACTION: {
    name: "Satisfaction",
    low:  [{ v: 0, l: "0", d: "Deeply unsatisfied" }, { v: 1, l: "1", d: "Very unsatisfied" }, { v: 2, l: "2", d: "Unsatisfied" }, { v: 3, l: "3", d: "Slightly unsatisfied" }, { v: 4, l: "4", d: "Somewhat unsatisfied" }],
    high: [{ v: 6, l: "6", d: "Somewhat satisfied" }, { v: 7, l: "7", d: "Mostly satisfied" },   { v: 8, l: "8", d: "Satisfied" },        { v: 9, l: "9", d: "Very satisfied" }, { v: 10, l: "10", d: "Fully satisfied" }],
  },
  FREQUENCY: {
    name: "Frequency",
    low:  [{ v: 0, l: "0", d: "Never" },   { v: 1, l: "1", d: "Almost never" }, { v: 2, l: "2", d: "Rarely" },     { v: 3, l: "3", d: "Occasionally" }, { v: 4, l: "4", d: "Sometimes" }],
    high: [{ v: 6, l: "6", d: "Fairly often" }, { v: 7, l: "7", d: "Often" },   { v: 8, l: "8", d: "Regularly" },    { v: 9, l: "9", d: "Very often" }, { v: 10, l: "10", d: "Consistently" }],
  },
  CLARITY: {
    name: "Clarity",
    low:  [{ v: 0, l: "0", d: "No clarity" },     { v: 1, l: "1", d: "Very unclear" }, { v: 2, l: "2", d: "Unclear" },     { v: 3, l: "3", d: "Slightly clear" }, { v: 4, l: "4", d: "Somewhat clear" }],
    high: [{ v: 6, l: "6", d: "Mostly clear" },   { v: 7, l: "7", d: "Fairly clear" },   { v: 8, l: "8", d: "Clear" },        { v: 9, l: "9", d: "Very clear" },  { v: 10, l: "10", d: "Completely clear" }],
  },
  URGENCY: {
    name: "Urgency",
    low:  [{ v: 0, l: "0", d: "Not urgent" },     { v: 1, l: "1", d: "Very low" }, { v: 2, l: "2", d: "Low" },           { v: 3, l: "3", d: "Somewhat low" }, { v: 4, l: "4", d: "Mild" }],
    high: [{ v: 6, l: "6", d: "Moderate" },       { v: 7, l: "7", d: "Fairly urgent" },  { v: 8, l: "8", d: "Urgent" },   { v: 9, l: "9", d: "Very urgent" },   { v: 10, l: "10", d: "Critical" }],
  },
  IMPORTANCE: {
    name: "Importance",
    low:  [{ v: 0, l: "0", d: "Not important" },    { v: 1, l: "1", d: "Very minor" }, { v: 2, l: "2", d: "Minor" },        { v: 3, l: "3", d: "Somewhat minor" }, { v: 4, l: "4", d: "Mildly relevant" }],
    high: [{ v: 6, l: "6", d: "Moderately important" }, { v: 7, l: "7", d: "Fairly important" }, { v: 8, l: "8", d: "Important" },  { v: 9, l: "9", d: "Very important" }, { v: 10, l: "10", d: "Essential" }],
  },
  CONCERN: {
    name: "Concern",
    low:  [{ v: 0, l: "0", d: "No concern" },        { v: 1, l: "1", d: "Barely concerns" }, { v: 2, l: "2", d: "Minor concern" },    { v: 3, l: "3", d: "Somewhat concerns" }, { v: 4, l: "4", d: "Mild concern" }],
    high: [{ v: 6, l: "6", d: "Moderate concern" },  { v: 7, l: "7", d: "Fairly concerned" },  { v: 8, l: "8", d: "Concerned" },       { v: 9, l: "9", d: "Very concerned" },   { v: 10, l: "10", d: "Deeply troubled" }],
  },
  PEACE: {
    name: "Peace",
    low:  [{ v: 0, l: "0", d: "Deep unrest" },     { v: 1, l: "1", d: "Very unsettled" }, { v: 2, l: "2", d: "Unsettled" },       { v: 3, l: "3", d: "Some unrest" }, { v: 4, l: "4", d: "Slightly unsettled" }],
    high: [{ v: 6, l: "6", d: "Fairly settled" },  { v: 7, l: "7", d: "Mostly at peace" }, { v: 8, l: "8", d: "At peace" },       { v: 9, l: "9", d: "Very peaceful" },   { v: 10, l: "10", d: "Complete peace" }],
  },
  PULL: {
    name: "Pull",
    low:  [{ v: 0, l: "0", d: "No pull" },       { v: 1, l: "1", d: "Barely any" },   { v: 2, l: "2", d: "Slight pull" },     { v: 3, l: "3", d: "Some pull" }, { v: 4, l: "4", d: "Mild pull" }],
    high: [{ v: 6, l: "6", d: "Moderate pull" }, { v: 7, l: "7", d: "Notable pull" },  { v: 8, l: "8", d: "Strong pull" },  { v: 9, l: "9", d: "Very strong" },     { v: 10, l: "10", d: "Irresistible" }],
  },
  WILLINGNESS: {
    name: "Willingness",
    low:  [{ v: 0, l: "0", d: "Not willing" },     { v: 1, l: "1", d: "Very reluctant" }, { v: 2, l: "2", d: "Reluctant" },     { v: 3, l: "3", d: "Slightly open" }, { v: 4, l: "4", d: "Somewhat open" }],
    high: [{ v: 6, l: "6", d: "Fairly willing" },  { v: 7, l: "7", d: "Mostly willing" },  { v: 8, l: "8", d: "Willing" },        { v: 9, l: "9", d: "Very willing" },  { v: 10, l: "10", d: "Fully open" }],
  },
};

const T = RESPONSE_TYPES;

// ─── DOMAIN WEIGHTS ─────────────────────────────────────────────────────────
// Weights reflect each domain's documented predictive power for long-term
// marital and family stability. They are applied to the overall couple-health
// score and to goal/tension prioritization.
//
//   Faith     1.30 — Mahoney et al. (2001): sanctification of marriage and
//                     shared spiritual practice predict marital satisfaction.
//   Marriage  1.25 — Gottman (1999): relationship-quality dimensions are the
//                     proximate determinant of family stability.
//   Money     1.10 — Dew, Britt & Huston (2012); Stanley et al. (2002):
//                     financial conflict is among the strongest divorce
//                     predictors.
//   Children  1.10 — Cowan & Cowan (1992): parenting disagreement drives
//                     marital dissatisfaction in active parenting years.
//   Place     1.05 — Expat/bicultural literature: unresolved geographic
//                     identity is a chronic background stressor.
//   Vocation  1.00 — Baseline.
//   Community 0.95 — Important but less couple-systemic.
//   Body      0.90 — Individual health; lower couple-systemic weight.
//   Creative  0.85 — Personal-flourishing domain; lowest systemic weight.
//
// NOTE: These weights are a defensible heuristic, not a validated psychometric
// instrument. See ASSUMPTIONS.md. They are transparent and adjustable.

export const DOMAIN_WEIGHTS = {
  faith: 1.30, marriage: 1.25, intimacy: 1.20, children: 1.10, vocation: 1.00,
  place: 1.05, money: 1.10, body: 0.90, creative: 0.85, community: 0.95, inlaws: 1.00,
};

// ─── SCRIPTURES ─────────────────────────────────────────────────────────────
export const SCRIPTURES = {
  welcome:   { ref: "Jeremiah 29:11",      text: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope." },
  faith:     { ref: "Matthew 6:33",        text: "But seek first the kingdom of God and his righteousness, and all these things will be added to you." },
  marriage:  { ref: "Ecclesiastes 4:9-10", text: "Two are better than one, because they have a good reward for their toil. For if they fall, one will lift up his fellow." },
  children:  { ref: "Psalm 127:3",         text: "Children are a heritage from the Lord, offspring a reward from him." },
  vocation:  { ref: "Colossians 3:23",     text: "Whatever you do, work heartily, as for the Lord and not for men." },
  place:     { ref: "Acts 17:26",          text: "He made from one man every nation, having determined allotted periods and the boundaries of their dwelling place." },
  money:     { ref: "1 Timothy 6:17",      text: "Charge them not to set their hopes on the uncertainty of riches, but on God, who richly provides us with everything to enjoy." },
  body:      { ref: "1 Corinthians 6:19",  text: "Do you not know that your body is a temple of the Holy Spirit within you?" },
  creative:  { ref: "Exodus 35:31",        text: "He has filled him with the Spirit of God, with skill, with intelligence, with knowledge, and with all craftsmanship." },
  community: { ref: "Hebrews 10:24",       text: "And let us consider how to stir up one another to love and good works." },
  intimacy:  { ref: "1 Corinthians 7:3-4", text: "The husband should give to his wife her conjugal rights, and likewise the wife to her husband. For the wife does not have authority over her own body, but the husband does. Likewise the husband does not have authority over his own body, but the wife does." },
  inlaws:    { ref: "Genesis 2:24",        text: "Therefore a man shall leave his father and his mother and hold fast to his wife, and they shall become one flesh." },
  synthesis: { ref: "Proverbs 29:18",      text: "Where there is no prophetic vision the people cast off restraint, but blessed is he who keeps the law." },
};

// ─── DOMAINS & QUESTIONS ────────────────────────────────────────────────────
// `type` selects the response-label set. `rev: true` marks reverse-scored
// items (high raw value = unhealthy condition); these are inverted before any
// aggregation so that every domain average means "health/strength".

const DOMAINS_RAW = [
  {
    id: "faith", label: "Faith & Calling", icon: "✦", scripture: SCRIPTURES.faith,
    intro: "These questions examine your relationship with God, your sense of calling, and how faith consciously shapes your daily decisions and long-term direction.",
    summary: "How God and a shared sense of calling shape your direction together. Scripture treats the marriage itself as sacred (Matthew 6:33); research on \"sanctification\" finds couples who hold their marriage as sacred report less conflict and greater commitment — which is why this chapter carries the most weight.",
    about: {
      weight: "Highest weight (1.30)",
      biblical: "Christian theology treats marriage as a covenant that images God's faithfulness, and faith as the organizing center of a life (Matthew 6:33, \"seek first the kingdom\"). A shared spiritual orientation is integral, not peripheral, to a union (Ecclesiastes 4:12 — a threefold cord, read for centuries as the couple plus God).",
      books: "John Piper, *This Momentary Marriage*, frames marriage's permanence and its purpose as a parable pointing beyond itself to Christ and the church.",
      science: "The best-replicated faith-and-marriage finding is sanctification — perceiving the marriage itself as sacred (distinct from church attendance). In Mahoney et al. (1999), over 42% of the variance in marital satisfaction was tied to endorsing the marriage's \"Sacred Qualities.\" Across 17+ subsequent studies, greater perceived sanctity predicts less conflict, less stonewalling, more commitment, and higher satisfaction. This is why Faith carries the highest weight and a large faith-gap is flagged as a primary tension.",
    },
    questions: [
      { id: "f1",  text: "My daily life is consciously ordered around my faith in Christ.",                            type: T.AGREEMENT, core: true,
        info: "Measures whether faith is the organizing center of daily life, not just a stated belief. The Faith domain carries the highest weight because of the sanctification research: perceiving life and marriage as sacred is the single best-replicated faith-and-marriage finding." },
      { id: "f2",  text: "I have a clear sense of what God has called me to do in this season of life.",               type: T.CLARITY,
        info: "Sense of vocational calling (vocatio). Clarity about calling reduces low-grade existential drift that drains energy from the marriage." },
      { id: "f3",  text: "I am satisfied with the depth and consistency of my personal prayer and Scripture life.",    type: T.SATISFACTION,
        info: "The private disciplines (prayer, Scripture). Asked because personal spiritual vitality tends to precede relational spiritual health." },
      { id: "f4",  text: "My faith community (church, small group) is genuinely nourishing me right now.",             type: T.AGREEMENT,
        info: "Social embeddedness in a faith community — protective for both individual faith and marriage (the 'one another' commands; isolation is a spiritual risk)." },
      { id: "f5",  text: "I feel at peace about my eternal standing before God.",                                      type: T.PEACE,
        info: "Assurance and peace before God. A measure of settledness that affects how a person shows up in every other domain." },
      { id: "f6",  text: "I experience God's guidance in major life decisions.",                                        type: T.FREQUENCY,
        info: "Experienced divine guidance in decisions — a marker of an active, lived faith rather than a nominal one." },
      { id: "f7",  text: "I am actively growing in the character of Christ — patience, humility, sacrificial love.",   type: T.AGREEMENT,
        info: "Growth in Christlike character (patience, humility, sacrificial love) — the virtues that most directly translate into marital behavior." },
      { id: "f8",  text: "My spouse and I see our marriage as having a sacred, God-given character.",                  type: T.AGREEMENT,
        info: "Sanctification of marriage — viewing the marriage as sacred. In the research literature (Mahoney and colleagues) this perception is associated with higher reported marital satisfaction and commitment, though the relationship appears to run in both directions (satisfied couples also tend to view their marriage as sacred). A large gap between partners here is flagged as a tension." },
      { id: "f9",  text: "I am living out my faith in ways that are visible to my children.",                          type: T.FREQUENCY,
        info: "Whether faith is visibly modeled to children (Deuteronomy 6:6-7) — discipleship as a parenting responsibility." },
      { id: "f10", text: "I am using my spiritual gifts in service to others.",                                        type: T.FREQUENCY,
        info: "Use of spiritual gifts in service. Outward expression of faith, distinct from private devotion." },
      { id: "f11", text: "How urgent is deepening your personal faith life in the next 1–2 years?",                    type: T.URGENCY,
        info: "Urgency of deepening faith in the near term — surfaces felt priority, which helps rank goals." },
      { id: "f12", text: "I sense God is calling our family to something significant we have not yet fully embraced.", type: T.AGREEMENT,
        info: "Senses an unembraced calling for the family — designed to surface latent direction the couple may not have voiced." },
      { id: "f13", text: "I feel safe sharing my deepest spiritual doubts and struggles with my spouse, without fear of judgment.", type: T.AGREEMENT,
        info: "Spiritual intimacy — the freedom to be spiritually honest and vulnerable with one's spouse. Associated in the literature with closeness and relationship quality." },
      { id: "f14", text: "I sometimes fear that God would withdraw His love from me if I failed Him.",                 type: T.FREQUENCY, rev: true,
        info: "A gentle measure of anxious attachment to God (Kirkpatrick & Shaver; Rowatt & Kirkpatrick). Reverse-scored: a higher rating reflects more anxiety. This is a sensitive, personal item, intended for individual reflection rather than comparison or judgement; it is not a diagnosis." },
    ],
  },
  {
    id: "marriage", label: "Marriage & Covenant", icon: "◈", scripture: SCRIPTURES.marriage,
    intro: "These questions examine the health, depth, and trajectory of your marriage covenant — not just its present state but what it is becoming.",
    summary: "The friendship, conflict, and covenant at the core of your union. Built on Ephesians 5's mutual self-giving and on Gottman's four decades of research — the habits (turning toward each other, repair, avoiding contempt) that reliably distinguish marriages that last.",
    about: {
      weight: "Second-highest weight (1.25)",
      biblical: "Ephesians 5:21–33 opens with mutual submission (\"submitting to one another out of reverence for Christ\") before addressing husbands and wives, and charges sacrificial, Christlike love. Colossians 3:13 makes forgiveness and \"bearing with one another\" baseline competencies. Marriage is covenant — unconditional commitment — not contract (Genesis 2:24; Matthew 19:5–6).",
      books: "Timothy & Kathy Keller, *The Meaning of Marriage* (self-centeredness as the chief enemy; marriage as \"spiritual friendship\"); Paul Tripp, *What Did You Expect?* (unspoken expectations; the confession-forgiveness cycle); Dave Harvey, *When Sinners Say \"I Do\"* (gospel-grounded forgiveness).",
      science: "This domain operationalizes John Gottman's four decades of observational research: the 5:1 positivity ratio in conflict (≈20:1 outside it); the \"Four Horsemen\" (criticism, contempt, defensiveness, stonewalling), with contempt the single strongest divorce predictor; and the decisive role of repair attempts — 84% of high-conflict newlyweds who repaired effectively were stable six years later. Emotional disengagement predicts a later, drift-type divorce, so warmth and \"turning toward\" are measured, not just low conflict.",
    },
    questions: [
      { id: "m1",  text: "I could list my spouse's major hopes, dreams, and current worries.",                        type: T.AGREEMENT, core: true,
        info: "A concrete measure of Gottman's \"Love Maps\" — how well you know the details of your spouse's inner world. Knowing your partner's world is the foundation of the friendship system, which Gottman links to relationship stability. This is the domain's core question." },
      { id: "m2",  text: "We communicate openly about difficult topics without destructive conflict.",                 type: T.FREQUENCY,
        info: "Open communication without the 'Four Horsemen' (criticism, contempt, defensiveness, stonewalling). Contempt is the strongest single divorce predictor." },
      { id: "m3",  text: "Our physical and emotional intimacy is healthy and fulfilling.",                             type: T.AGREEMENT,
        info: "Physical and emotional intimacy — a composite health indicator that tends to track overall connection." },
      { id: "m4",  text: "I am satisfied with the quality and quantity of time we spend together.",                   type: T.SATISFACTION,
        info: "Quantity and quality of shared time — the raw material of the 'emotional bank account.'" },
      { id: "m5",  text: "We share a clear, agreed-upon vision for our marriage.",                                     type: T.CLARITY,
        info: "A shared, explicit vision for the marriage. Clarity here predicts aligned decision-making." },
      { id: "m6",  text: "My spouse understands and actively supports my deepest personal goals.",                     type: T.AGREEMENT,
        info: "Whether the spouse supports one's deepest goals — measures 'turning toward' versus 'turning away' from bids." },
      { id: "m7",  text: "We handle financial decisions as a genuine, equal team.",                                    type: T.FREQUENCY,
        info: "Financial teamwork. Money is among the most robust divorce predictors, so financial partnership is a key marital signal." },
      { id: "m8",  text: "We pray together.",                                                                          type: T.FREQUENCY,
        info: "Praying together — shared spiritual practice, empirically tied to lower conflict and higher commitment." },
      { id: "m9",  text: "I feel appreciated and respected by my spouse on a daily basis.",                            type: T.FREQUENCY,
        info: "Daily appreciation and respect — feeds the 5:1 (and ~20:1 outside conflict) positivity ratio Gottman found in stable couples." },
      { id: "m10", text: "We have reliable, healthy patterns for resolving conflict and restoring connection.",         type: T.AGREEMENT,
        info: "Reliable repair and reconnection. The decisive protective skill: 84% of high-conflict newlyweds who repaired well were stable six years later." },
      { id: "m11", text: "I am satisfied with how we divide responsibilities in the home.",                            type: T.SATISFACTION,
        info: "Satisfaction with the division of household responsibilities — a frequent, concrete friction point." },
      { id: "m12", text: "Our marriage is actively growing stronger — not merely stable.",                             type: T.AGREEMENT,
        info: "Whether the marriage is actively growing, not merely stable — guards against emotional disengagement, which predicts a later (drift-type) divorce." },
      { id: "m13", text: "I feel free to be fully and honestly myself within this marriage.",                          type: T.AGREEMENT,
        info: "Freedom to be authentically oneself — measures psychological safety within the covenant." },
      { id: "m14", text: "How much do unresolved tensions in our marriage concern you?",                               type: T.CONCERN, rev: true,
        info: "Concern about unresolved tensions. Reverse-scored: high concern is a negative signal, so it is inverted before scoring." },
      { id: "m15", text: "During conflict, I feel contempt, superiority, or the urge to mock my spouse.",              type: T.FREQUENCY, rev: true,
        info: "Contempt — sarcasm, mockery, eye-rolling, a sense of superiority. In Gottman's observational research, contempt was the single strongest predictor of divorce among the \"Four Horsemen.\" Reverse-scored: a higher rating is a negative signal. A high score here is flagged even when other scores look healthy." },
      { id: "m16", text: "We actively help each other grow into the people God is calling us to become.",              type: T.AGREEMENT,
        info: "Keller frames marriage as 'spiritual friendship' — the spouse as the person helping you become your 'future glory-self.' This is distinct from both romantic satisfaction and covenant commitment: it measures whether the marriage has a shared, forward-looking purpose of mutual sanctification." },
      { id: "m17", text: "I have clearly communicated my real expectations to my spouse — rather than assuming they should already know them.", type: T.AGREEMENT,
        info: "Drawn from Paul Tripp's 'What Did You Expect?' — marriages erode through unexamined, unspoken expectations and the slow accumulation of small unaddressed offenses. Unspoken expectations are independently one of the better-supported predictors of dissatisfaction in the secular literature. This measures whether expectations are made explicit, not merely held." },
      { id: "m18", text: "When we argue, I become so overwhelmed that I shut down or stop responding.",                 type: T.FREQUENCY, rev: true,
        info: "Stonewalling — withdrawing or shutting down during conflict, one of Gottman's \"Four Horsemen.\" It is often a response to physiological flooding (see Body & Health). Reverse-scored: a higher rating is a negative signal." },
    ],
  },
  {
    id: "children", label: "Children & Family", icon: "◇", scripture: SCRIPTURES.children,
    intro: "These questions examine your vision for your children's formation, your parenting partnership, and the culture you are building in your home.",
    summary: "Your shared vision for raising and discipling children, and the culture of your home. Children are framed as a heritage and a discipleship calling (Deuteronomy 6:6-7); the transition to parenthood is also one of the most documented strains on a marriage — naming it early helps.",
    about: {
      weight: "Above baseline (1.10)",
      biblical: "Children are framed as a heritage and a discipleship responsibility (Psalm 127:3; Deuteronomy 6:6–7 — teaching faith \"when you sit at home and when you walk along the road\").",
      science: "The transition to parenthood is among the most documented stressors on marital satisfaction (Cowan & Cowan, 1992), and disagreement on parenting philosophy is a recurring conflict driver. Research on sanctification across the transition to parenthood (Kusner, Mahoney, Pargament & DeMaris, 2014) suggests perceived sanctity helps first-time parents inhibit negativity and use positive conflict-management despite the stress.",
    },
    questions: [
      { id: "c1",  text: "I am satisfied with the quality and depth of my relationship with each of my children.",    type: T.SATISFACTION,
        info: "Satisfaction with the quality and depth of the relationship with one's children." },
      { id: "c2",  text: "We have a clear, shared vision for how we want to raise our children.",                      type: T.CLARITY,
        info: "Whether there is a clear, shared vision for how the couple wants to raise their children." },
      { id: "c3",  text: "Our home has a culture of faith, warmth, and emotional safety.",                             type: T.AGREEMENT, core: true,
        info: "Whether the home has a culture of faith, warmth, and emotional safety. The domain's core question." },
      { id: "c4",  text: "I am intentionally passing on my faith and values — not by proximity alone but by purpose.", type: T.FREQUENCY,
        info: "Intentionally passing on faith and values to children (Deuteronomy 6:6-7)." },
      { id: "c5",  text: "We are fully aligned on schooling, discipline, and parenting philosophy.",                   type: T.AGREEMENT,
        info: "Alignment between partners on schooling, discipline, and parenting approach — a recurring friction point." },
      { id: "c6",  text: "I am attentively present — not just physically — with my children.",                         type: T.FREQUENCY,
        info: "Attentive presence with children — not merely physical proximity but real engagement." },
      { id: "c7",  text: "I have a clear picture of the kind of adult I am trying to help each child become.",         type: T.CLARITY,
        info: "Clarity about the kind of adult one is trying to raise — long-range parenting vision." },
      { id: "c8",  text: "Parenting is not crowding out my marriage or my personal interior life.",                    type: T.AGREEMENT,
        info: "Whether parenting is crowding out the marriage or personal life — a key transition-to-parenthood risk." },
      { id: "c9",  text: "I feel equipped and confident in my role as a parent.",                                      type: T.AGREEMENT,
        info: "Feeling equipped and confident in the parenting role." },
      { id: "c10", text: "How important is deeper alignment on parenting in the next 1–2 years?",                      type: T.IMPORTANCE,
        info: "Felt importance of deeper alignment on parenting in the coming years." },
      { id: "c11", text: "I see parenting as a sacred calling through which God is also shaping me.",                  type: T.AGREEMENT,
        info: "Sanctification of parenting — viewing the parenting role as sacred. In the research literature this perception is associated with greater investment and more positive parenting; the transition to parenthood is also the single most common period for a decline in marital satisfaction (Cowan & Cowan), which this domain helps surface." },
    ],
  },
  {
    id: "vocation", label: "Vocation & Work", icon: "⬡", scripture: SCRIPTURES.vocation,
    intro: "These questions examine your sense of calling in work — paid, creative, or service — and whether your current activity reflects your deepest gifts and purpose.",
    summary: "Whether your work — paid, creative, or service — reflects your gifts and calling. The Reformation saw all honest work as vocation, done \"as for the Lord\" (Colossians 3:23); a sense of meaningful contribution supports well-being that spills into the marriage.",
    about: {
      weight: "Baseline weight (1.00)",
      biblical: "Work as calling (vocatio) is a core Reformation insight: \"Whatever you do, work heartily, as for the Lord and not for men\" (Colossians 3:23).",
      science: "Work-life balance and a sense of meaningful contribution affect individual well-being, which spills into the marriage. Weighted at baseline because the effect on marital outcomes is more mediated than direct.",
    },
    questions: [
      { id: "v1",  text: "My current work feels like a genuine calling, not merely obligation or habit.",             type: T.AGREEMENT, core: true,
        info: "Whether current work feels like a genuine calling rather than just a job (Colossians 3:23). The domain's core question." },
      { id: "v2",  text: "I am using my primary gifts and skills in my current work.",                                 type: T.AGREEMENT,
        info: "Whether one's primary gifts and skills are actually used in current work." },
      { id: "v3",  text: "I am satisfied with the balance between work and the rest of my life.",                     type: T.SATISFACTION,
        info: "Satisfaction with the balance between work and the rest of life." },
      { id: "v4",  text: "I have a clear sense of what my most meaningful contribution to the world is.",              type: T.CLARITY,
        info: "Clarity about one's most meaningful contribution." },
      { id: "v5",  text: "This season of transition is being used intentionally and well.",                            type: T.AGREEMENT,
        info: "Whether a season of transition is being used intentionally rather than drifting." },
      { id: "v6",  text: "My work gives me energy more than it depletes me.",                                          type: T.AGREEMENT,
        info: "Whether work gives energy more than it depletes — a marker of vocational fit." },
      { id: "v7",  text: "I have clarity about what I want my work life to look like in 5–10 years.",                  type: T.CLARITY,
        info: "Clarity about what one wants work life to look like going forward." },
      { id: "v8",  text: "I am financially free enough to pursue meaningful work rather than merely profitable work.", type: T.AGREEMENT,
        info: "Whether one is financially free enough to pursue meaningful work." },
      { id: "v9",  text: "I am actively investing in skills or craft that will matter in the next decade.",            type: T.FREQUENCY,
        info: "Active investment in skills or craft that will matter in the future." },
      { id: "v10", text: "How urgent is clarifying your vocational direction in the next 1–2 years?",                  type: T.URGENCY,
        info: "Felt urgency of clarifying vocational direction." },
    ],
  },
  {
    id: "place", label: "Place & Home", icon: "△", scripture: SCRIPTURES.place,
    intro: "Where we live is a theological question, not merely a logistical one. These questions surface your convictions and desires about home, roots, and belonging.",
    summary: "Where and how you live — home, roots, and belonging — treated as a spiritual question, not just logistics. Scripture says God sets \"the boundaries of their dwelling place\" (Acts 17:26); an unresolved sense of place is a quiet, chronic stressor on a couple.",
    about: {
      weight: "Slightly above baseline (1.05)",
      biblical: "Place and dwelling are not spiritually neutral: God \"determined allotted periods and the boundaries of their dwelling place\" (Acts 17:26).",
      science: "Drawn from acculturation and expatriate-adjustment literature: an unresolved geographic identity is a chronic, low-grade stressor that drains decision-making energy from growth domains. Weighted only slightly above baseline because the evidence base is thinner than for faith, marriage, or money.",
    },
    questions: [
      { id: "p1",  text: "I feel at home — rooted and settled — where we currently live.",                            type: T.AGREEMENT,
        info: "Feeling rooted and settled where one currently lives." },
      { id: "p2",  text: "Our current location is the right place for this season of our family's life.",              type: T.AGREEMENT,
        info: "Whether the current location is right for this season of life." },
      { id: "p3",  text: "I am at peace about remaining in our current country for the foreseeable future.",           type: T.PEACE,
        info: "Peace about remaining in the current country/region." },
      { id: "p4",  text: "Another place pulls me in a way I haven't fully resolved.",                                  type: T.PULL, rev: true,
        info: "An unresolved pull toward another place. Reverse-scored — a strong unresolved pull is a chronic low-grade stressor." },
      { id: "p5",  text: "We are fully aligned as a couple on where we want to live long-term.",                       type: T.AGREEMENT, core: true,
        info: "Whether the couple is aligned on where they want to be. The domain's core question." },
      { id: "p6",  text: "Our home environment actively supports the family life we are trying to build.",             type: T.AGREEMENT,
        info: "Whether the home environment actively supports the family's life." },
      { id: "p7",  text: "I feel genuinely connected to the local community where we live.",                           type: T.AGREEMENT,
        info: "Connection to the local community where one lives." },
      { id: "p8",  text: "The question of where to live is a source of unresolved tension or anxiety for me.",         type: T.CONCERN, rev: true,
        info: "Whether 'where to live' is a source of unresolved tension. Reverse-scored." },
      { id: "p9",  text: "I would be willing to make a significant geographic move if clearly called to it.",          type: T.WILLINGNESS,
        info: "Willingness to make a significant geographic move if needed." },
      { id: "p10", text: "How important is resolving the long-term place question in the next 2 years?",               type: T.IMPORTANCE,
        info: "Felt importance of resolving the long-term place question." },
    ],
  },
  {
    id: "money", label: "Money & Stewardship", icon: "◎", scripture: SCRIPTURES.money,
    intro: "Money reveals values. These questions examine how you relate to financial resources as a steward rather than an owner — and where alignment or tension exists between you.",
    summary: "How you handle money together — as stewards rather than owners. \"You cannot serve God and money\" (Matthew 6:24); financial conflict is among the most robust predictors of divorce, so alignment here protects far more than the budget.",
    about: {
      weight: "Above baseline (1.10)",
      biblical: "Money is a stewardship rather than an ownership question (1 Timothy 6:17–19; Matthew 6:24 — \"you cannot serve God and money\"). The biblical frame treats generosity as a spiritual-health indicator, not merely a budget line.",
      science: "Financial conflict is among the most robust divorce predictors in the family-studies literature (Dew, Britt & Huston, 2012; Stanley, Markman & Whitton, 2002). Recurring money conflict — captured by a reverse-scored item — is treated as a high-priority signal.",
    },
    questions: [
      { id: "mo1", text: "I feel financially secure and genuinely at peace about our current position.",              type: T.PEACE,
        info: "Financial security and peace — felt, not just numeric." },
      { id: "mo2", text: "We give generously and joyfully as a couple.",                                              type: T.FREQUENCY,
        info: "Generosity as a couple — the biblical frame treats giving as a spiritual-health indicator, not just a budget line." },
      { id: "mo3", text: "We are well-aligned on financial priorities and spending patterns.",                        type: T.AGREEMENT, core: true,
        info: "Alignment on financial priorities and spending. The domain's core question." },
      { id: "mo4", text: "I have a clear picture of what financial provision should look like for the next 10 years.", type: T.CLARITY,
        info: "Clarity about what financial provision should look like long-term." },
      { id: "mo5", text: "Money is a source of recurring conflict or unresolved tension in our marriage.",            type: T.CONCERN, rev: true,
        info: "Whether money is a source of recurring conflict. Reverse-scored — recurring money conflict is a robust divorce predictor." },
      { id: "mo6", text: "I am satisfied with how we are planning for retirement and long-term security.",            type: T.SATISFACTION,
        info: "Satisfaction with retirement and long-range financial planning." },
      { id: "mo7", text: "We share clear values about what money is fundamentally for in our family.",                 type: T.CLARITY,
        info: "Whether the couple shares clear values about what money is fundamentally for." },
      { id: "mo8", text: "I feel our standard of living is appropriate — neither excessive nor unnecessarily constrained.", type: T.AGREEMENT,
        info: "Whether the standard of living feels appropriate — stewardship rather than excess or anxiety." },
      { id: "mo9", text: "I am concerned about financial exposure or risk (health, currency, pension, etc.).",        type: T.CONCERN, rev: true,
        info: "Concern about financial exposure or risk. Reverse-scored." },
      { id: "mo10",text: "How urgently does our financial picture need intentional, structured attention?",            type: T.URGENCY,
        info: "Agreement on standard of living." },
    ],
  },
  {
    id: "body", label: "Body & Health", icon: "◉", scripture: SCRIPTURES.body,
    intro: "The body is not separate from vocation and spirit. These questions examine your stewardship of physical health — including what the next decade will require of you.",
    summary: "Stewardship of physical health, energy, and rest — including what the next decade will ask of you. The body is called a temple and Sabbath a command (1 Cor 6:19; Exodus 20:8-10); health and rest shape your very capacity to turn toward each other.",
    about: {
      weight: "Below baseline (0.90)",
      biblical: "The body is a temple of the Holy Spirit (1 Corinthians 6:19), and Sabbath rest is a command, not a luxury (Exodus 20:8–10).",
      science: "Physical health, stress regulation, and rest affect a person's capacity to \"turn toward\" a partner. Gottman documented the physiology of conflict — \"flooding,\" elevated heart rate, raised cortisol, fight-or-flight — that undermines communication. Weighted below baseline because it is an individual rather than dyadic variable.",
    },
    questions: [
      { id: "b1",  text: "I am satisfied with my current physical health and energy levels.",                         type: T.SATISFACTION,
        info: "Satisfaction with current physical health and energy." },
      { id: "b2",  text: "I have sustainable, consistent habits around sleep, exercise, and nutrition.",              type: T.FREQUENCY,
        info: "Sustainable, consistent habits around sleep, rest, and recovery." },
      { id: "b3",  text: "I am building physical capacity now that will matter in my 60s and 70s.",                   type: T.AGREEMENT,
        info: "Building physical capacity now that will matter later in life." },
      { id: "b4",  text: "During an argument, my heart races or I feel so worked up that it's hard to think clearly.", type: T.FREQUENCY, rev: true,
        info: "A concrete measure of \"flooding\" — the physiological fight-or-flight response Gottman documented in conflict, which makes calm problem-solving and repair very difficult. Reverse-scored: a higher rating is a negative signal. The research-supported response is a deliberate 20-minute self-soothing break before continuing." },
      { id: "b5",  text: "My physical health supports the life I want to live — it does not limit it.",               type: T.AGREEMENT, core: true,
        info: "Whether physical health supports the life one wants to live. The domain's core question; the body as a temple of the Spirit." },
      { id: "b6",  text: "How urgently does your physical health need intentional, sustained investment?",            type: T.URGENCY,
        info: "Felt urgency of giving physical health intentional attention." },
      { id: "b7",  text: "I take Sabbath, rest, and renewal seriously as spiritual and physical disciplines.",        type: T.FREQUENCY,
        info: "Taking Sabbath, rest, and renewal seriously as spiritual and physical disciplines — rest as a command, not a luxury." },
    ],
  },
  {
    id: "creative", label: "Creative Life & Craft", icon: "✧", scripture: SCRIPTURES.creative,
    intro: "Creativity is not peripheral — it is part of how God-given gifts find expression. These questions examine your creative life and whether it is being honored or quietly neglected.",
    summary: "The creative gifts and craft that easily get quietly neglected. Scripture says God fills people \"with skill... and all craftsmanship\" (Exodus 35:31); honoring these gifts guards against the slow self-erasure that can corrode a marriage.",
    about: {
      weight: "Lowest weight (0.85)",
      biblical: "God fills people \"with skill, with intelligence, with knowledge, and with all craftsmanship\" (Exodus 35:31) — creative gifts are part of how God-given ability finds expression.",
      science: "Individual flourishing and the use of one's gifts support personal well-being and guard against the self-erasure that can corrode a marriage over decades. Lowest weight because it is the most individual and least couple-systemic domain — but included because a life well-lived is more than the absence of marital conflict.",
    },
    questions: [
      { id: "cr1", text: "My creative life (sketching, photography, music, building, or other) is genuinely alive and active.", type: T.AGREEMENT, core: true,
        info: "Whether one's creative gifts are being used and developed. The domain's core question, drawn from the value of individual flourishing." },
      { id: "cr2", text: "I give my creative gifts the time and priority they deserve.",                              type: T.FREQUENCY,
        info: "Time and space for craft and creativity." },
      { id: "cr3", text: "I believe my creative work has value beyond personal enjoyment — for others or for God.",   type: T.AGREEMENT,
        info: "Whether the person believes their creative work has worth beyond personal enjoyment — for others or for God." },
      { id: "cr4", text: "I feel supported by my spouse in my creative pursuits.",                                    type: T.AGREEMENT,
        info: "Whether the spouse actively supports one's creative pursuits — turning toward, not dismissing, this part of the person." },
      { id: "cr5", text: "My creative work is, at least in part, an act of worship and gratitude.",                   type: T.AGREEMENT,
        info: "Creative work as an act of worship and gratitude — integrating craft with faith rather than compartmentalizing it." },
      { id: "cr6", text: "I would feel a real sense of loss if my creative life continued to diminish.",              type: T.AGREEMENT,
        info: "Creative expression as part of a whole, flourishing life." },
      { id: "cr7", text: "How much priority should creative life receive in the next 5 years of our family?",         type: T.IMPORTANCE,
        info: "Felt priority of creative life for the family over the next five years — surfaces how much weight to give this domain in planning." },
    ],
  },
  {
    id: "community", label: "Community & Legacy", icon: "❋", scripture: SCRIPTURES.community,
    intro: "What we leave behind — in people, in culture, in testimony — matters eternally. These questions examine your vision for legacy and your investment in community beyond your household.",
    summary: "Your life beyond the household — friendship, service, and the legacy you're building. The \"one another\" commands make isolation a real risk (Hebrews 10:24); socially supported couples measurably fare better over time.",
    about: {
      weight: "Slightly below baseline (0.95)",
      biblical: "The \"one another\" commands make isolation a spiritual risk and community a means of growth: \"let us consider how to stir up one another to love and good works\" (Hebrews 10:24–25).",
      science: "Social embeddedness is protective for marriages — couples with supportive social networks fare better. Weighted slightly below baseline as a couple-systemic rather than dyadic factor.",
    },
    questions: [
      { id: "co1", text: "I am investing in relationships beyond my immediate family that will matter in 20 years.",  type: T.FREQUENCY,
        info: "Investment in relationships beyond the immediate family that will still matter in 20 years — social embeddedness is protective for marriages." },
      { id: "co2", text: "I have a clear sense of the legacy I want to leave — in people, not just accomplishments.", type: T.CLARITY, core: true,
        info: "Clarity about the legacy one wants to leave in people, not just accomplishments. The domain's core question." },
      { id: "co3", text: "We are meaningfully and consistently connected to a local church community.",               type: T.FREQUENCY,
        info: "Consistent connection to a local church community — the 'one another' commands treat isolation as a spiritual risk." },
      { id: "co4", text: "I am actively mentoring, discipling, or investing in someone outside my family.",           type: T.FREQUENCY,
        info: "Active mentoring or discipling of someone outside the family — outward investment beyond the household." },
      { id: "co5", text: "I am satisfied with the depth and faithfulness of my friendships.",                         type: T.SATISFACTION,
        info: "Satisfaction with the depth and faithfulness of friendships — a felt measure of relational richness." },
      { id: "co6", text: "We give financially and practically to purposes beyond our own household.",                 type: T.FREQUENCY,
        info: "Financial and practical giving to purposes beyond one's own household — generosity as a spiritual-health indicator." },
      { id: "co7", text: "The community around us is genuinely better because of how we are living.",                 type: T.AGREEMENT,
        info: "Whether the surrounding community is genuinely better because of how the couple lives — outward fruit of the marriage." },
      { id: "co8", text: "How important is deepening your community investment and legacy in the next 5 years?",       type: T.IMPORTANCE,
        info: "Felt importance of deepening community investment and legacy over the next five years." },
    ],
  },
  {
    id: "intimacy", label: "Intimacy & Sexual Union", icon: "♥", scripture: SCRIPTURES.intimacy,
    intro: "These questions examine the physical and emotional intimacy of your marriage — closeness, desire, communication about sex, and how cherished and connected you feel. They are asked gently and answered privately; nothing here is shared between partners except, with your consent, the overall sense of where you align.",
    summary: "Physical and emotional closeness — desire, tenderness, and honesty about sex. Scripture treats sexual union as a good gift, not a concession (Genesis 2:24-25); studies show sexual and relationship satisfaction rise and fall together. Asked gently, answered privately.",
    about: {
      weight: "High weight (1.20)",
      biblical: "Scripture treats sexual union as a good and integral part of marriage, not a concession. Genesis 2:24–25 describes the couple becoming \"one flesh\" and being \"naked and not ashamed.\" Paul frames the marital sexual relationship as a mutual gift and a mutual responsibility, with each spouse entrusting their body to the other (1 Corinthians 7:3–5). The Song of Songs devotes an entire book to the delight of married love. Intimacy is thus understood as covenantal self-giving — a bodily expression of the whole-life union.",
      books: "Timothy & Kathy Keller, in *The Meaning of Marriage*, frame sex as a covenant renewal — a whole-self act of self-giving that belongs inside the safety of lifelong commitment, not a mere appetite. Paul David Tripp's emphasis on confession and tenderness applies directly to the vulnerability intimacy requires.",
      science: "Longitudinal research finds sexual satisfaction and relationship satisfaction are tightly and bidirectionally linked — and notably, within-person increases in sexual satisfaction predict later increases in overall relationship satisfaction, more strongly than the reverse (Park et al., 2023; Schoenfeld et al., 2017; Cao et al., 2019). A meta-analysis finds that the quality of a couple's sexual communication is robustly associated with both sexual and relationship satisfaction (Mallory et al., 2022). This is why intimacy carries a high weight and why a large gap between partners is treated as a tension worth naming, not ignoring.",
    },
    questions: [
      { id: "in1", text: "I am satisfied with the physical intimacy in our marriage.",                               type: T.SATISFACTION, core: true,
        info: "Overall satisfaction with physical intimacy. Longitudinal studies find sexual satisfaction predicts later relationship satisfaction, which is why this is the domain's core question." },
      { id: "in2", text: "I feel emotionally close and connected to my spouse during intimacy.",                      type: T.AGREEMENT,
        info: "Emotional connection during intimacy — intimacy as whole-person union (Genesis 2:24-25, 'one flesh'), not merely physical." },
      { id: "in3", text: "How satisfied are you with the degree of affection and caring in your marriage?",          type: T.SATISFACTION,
        info: "Affection and caring — phrasing adapted from the validated Couples Satisfaction Index (CSI-16). A meta-analysis (Mallory et al., 2022) also finds the quality of affectionate communication tied to both sexual and relationship satisfaction." },
      { id: "in4", text: "I feel desired and cherished by my spouse.",                                               type: T.AGREEMENT,
        info: "Feeling desired and cherished — the affirming, self-giving dimension of marital love (Song of Songs)." },
      { id: "in5", text: "Our level of sexual desire and frequency feels mutually comfortable.",                    type: T.AGREEMENT,
        info: "Mutual comfort with desire and frequency. Paul frames the sexual relationship as a mutual gift and responsibility (1 Corinthians 7:3-5); mismatch is a common, nameable tension." },
      { id: "in6", text: "Unresolved hurt or resentment gets in the way of our intimacy.",                          type: T.FREQUENCY, rev: true,
        info: "Whether unresolved hurt blocks intimacy. Reverse-scored: a high answer indicates a problem, so it lowers the score. Confession and forgiveness are the biblical remedy." },
      { id: "in7", text: "I am at peace with how we handle intimacy, including seasons of difficulty or change.",     type: T.PEACE,
        info: "Peace about how the couple navigates intimacy across changing seasons (illness, pregnancy, age, stress) — resilience rather than a snapshot." },
      { id: "in8", text: "How urgent is it to give attention to your intimacy in the next 1–2 years?",               type: T.URGENCY,
        info: "Felt urgency of tending intimacy in the near term — surfaces priority for goal-ranking." },
      { id: "in9", text: "I experience our sexual union as a renewal of our covenant and commitment to each other.",  type: T.AGREEMENT,
        info: "Sexual sanctification — viewing the sexual relationship as having sacred meaning. In the research literature this perception is associated with greater sexual and relationship satisfaction (Hernandez-Kane & Mahoney). An invitation to reflect on meaning, not a performance measure." },
    ],
  },
  {
    id: "inlaws", label: "In-Laws & Extended Family", icon: "⌂", scripture: SCRIPTURES.inlaws,
    intro: "These questions examine your relationships with parents, in-laws, and extended family — the boundaries around your marriage, how united you are as a couple, and whether wider family is a source of support or strain.",
    summary: "Boundaries with parents and extended family, and how united you stand as a couple. \"Leave and cleave\" (Genesis 2:24) sets the principle; a 16-year study found early disagreement about closeness to in-laws predicts higher divorce risk — a united front is protective.",
    about: {
      weight: "Baseline weight (1.00)",
      biblical: "Genesis 2:24 sets the founding principle: a man \"leaves\" his father and mother and \"holds fast\" to his wife. \"Leave and cleave\" establishes the married couple as a new primary unit — honoring parents (Exodus 20:12) while no longer being ruled by them. The order matters: the one-flesh union takes priority, and healthy boundaries protect it rather than dishonoring the wider family.",
      books: "Paul David Tripp's *What Did You Expect?* speaks directly to the unspoken expectations — often inherited from our families of origin — that quietly strain a marriage. The Kellers' theme of leaving self-centeredness behind extends to leaving the family-of-origin's claims behind in forming a new union.",
      science: "In the Early Years of Marriage project, a 16-year longitudinal study of 355 couples, spousal disagreement about closeness to in-laws early in marriage predicted later divorce — even after accounting for the actual closeness of those relationships (Fiori, Rauer, Birditt, Brown & Orbuch, 2021). The clinical literature similarly frames in-law difficulty largely as a boundary-regulation problem within the couple (Silverstein). Because what matters most is the couple's agreement and boundaries, CANA pays particular attention to the gap between partners here.",
    },
    questions: [
      { id: "il1", text: "My spouse and I are united as a team in how we relate to our extended families.",         type: T.AGREEMENT, core: true,
        info: "Whether the couple acts as a united team toward extended family — the 'leave and cleave' principle (Genesis 2:24). The domain's core question." },
      { id: "il2", text: "We agree on how close we want to be with our parents and in-laws.",                       type: T.AGREEMENT,
        info: "Agreement on desired closeness with parents/in-laws. Spousal disagreement about in-law closeness early in marriage predicted later divorce in a 16-year study (Fiori et al., 2021) — which is why partner agreement is weighted heavily here." },
      { id: "il3", text: "Our marriage comes first, ahead of either family of origin's expectations.",               type: T.AGREEMENT,
        info: "Whether the one-flesh union takes priority over family-of-origin claims (Genesis 2:24). Healthy boundaries protect the marriage while still honoring parents (Exodus 20:12)." },
      { id: "il4", text: "Time and commitments with extended family feel balanced, not a source of pressure.",       type: T.AGREEMENT,
        info: "Balance of extended-family time and obligations — boundary regulation, the dynamic the clinical literature identifies as central to in-law strain." },
      { id: "il5", text: "Extended family is a genuine source of support and blessing to us.",                      type: T.AGREEMENT,
        info: "Whether extended family functions as support rather than stress — in-laws can be either, depending largely on the couple's boundaries." },
      { id: "il6", text: "Conflict or tension with family members weighs on our marriage.",                         type: T.FREQUENCY, rev: true,
        info: "Whether family conflict burdens the marriage. Reverse-scored: a high answer indicates strain, so it lowers the score." },
      { id: "il7", text: "We can set and hold loving boundaries with family when we need to.",                      type: T.AGREEMENT,
        info: "Capacity to set loving boundaries — the practical skill that 'leave and cleave' requires, distinct from cutting family off." },
      { id: "il8", text: "How important is it to address extended-family dynamics in the next 1–2 years?",          type: T.IMPORTANCE,
        info: "Felt importance of addressing extended-family dynamics in the near term — surfaces priority for goal-ranking." },
      { id: "il9", text: "If my family of origin criticizes my spouse, I am quick to defend my spouse and our marriage.", type: T.AGREEMENT,
        info: "\"We-ness\" — prioritizing the marital unit over the family of origin. Spousal disagreement about closeness to in-laws early in marriage has been associated with higher divorce risk over time (Fiori et al., 2021); presenting a united front is the protective pattern." },
    ],
  },
];

// Display/assessment order. Intimacy sits right after Marriage (thematically
// adjacent, and answered while attention is freshest), and In-Laws follows the
// family-of-origin themes after Children. Scoring is order-independent.
const DOMAIN_ORDER = ["faith", "marriage", "intimacy", "children", "inlaws", "vocation", "place", "money", "body", "creative", "community"];
export const DOMAINS = DOMAIN_ORDER
  .map((id) => DOMAINS_RAW.find((d) => d.id === id))
  .filter(Boolean)
  .concat(DOMAINS_RAW.filter((d) => !DOMAIN_ORDER.includes(d.id))); // safety: any unlisted domain still included

// ─── SCORING PRIMITIVES ─────────────────────────────────────────────────────

// Reverse-coding: standard formula (max + min − raw) on a 0–10 scale → 10 − raw.
export const reverseScore = (raw) => 10 - raw;
export const normalize = (raw, isReversed) => (isReversed ? reverseScore(raw) : raw);

// Gap severity. Thresholds adapted from effect-size conventions (Cohen, 1988)
// scaled to a 10-point metric, and from Gottman's finding that large perceptual
// gaps predict deterioration. These are interpretive bands, not clinical cutoffs.
export function classifyGap(gap) {
  if (gap >= 5) return { level: "CRITICAL", label: "Critical", color: "#c04040" };
  if (gap >= 4) return { level: "HIGH",     label: "High",     color: "#b06030" };
  if (gap >= 3) return { level: "MODERATE", label: "Moderate", color: "#9a7030" };
  if (gap >= 2) return { level: "LOW",      label: "Notable",  color: "#7a7040" };
  return            { level: "MINIMAL",  label: "Aligned",  color: "#4a8060" };
}

// Domain health bands on the normalized 0–10 scale.
export function classifyHealth(score) {
  if (score >= 8.0) return { label: "Thriving",   color: "#4a8060" };
  if (score >= 6.5) return { label: "Healthy",    color: "#6a8850" };
  if (score >= 5.0) return { label: "Developing", color: "#9a8040" };
  if (score >= 3.5) return { label: "At Risk",    color: "#b06030" };
  return            { label: "Critical",    color: "#c04040" };
}

// Quadrant of a question/domain given both partners' normalized scores.
export function quadrant(normA, normB) {
  const aHigh = normA >= 5.5, bHigh = normB >= 5.5;
  if (aHigh && bHigh)   return "SHARED_STRENGTH";
  if (!aHigh && !bHigh) return "SHARED_GROWTH";
  if (aHigh && !bHigh)  return "A_LEADS";
  return "B_LEADS";
}

// ─── ANALYTICS ──────────────────────────────────────────────────────────────
// Pure function. Given both answer maps and names, returns the full analytic
// structure. Deterministic; no randomness, no I/O.

export function computeAnalytics(answersA, answersB, nameA, nameB, weights) {
  const W = weights || DOMAIN_WEIGHTS;
  // A question is scored only if BOTH partners gave a numeric answer. A value of
  // "NA" (Not Applicable, marked by either partner) or undefined excludes it.
  const isScorable = (v) => v !== undefined && v !== null && v !== "NA" && !isNaN(Number(v));
  const allQuestions = DOMAINS.flatMap((d) =>
    d.questions.map((q) => {
      const rawA = answersA[q.id];
      const rawB = answersB[q.id];
      if (!isScorable(rawA) || !isScorable(rawB)) return null;
      const normA = normalize(rawA, q.rev);
      const normB = normalize(rawB, q.rev);
      const gap = Math.abs(normA - normB);
      return {
        id: q.id, text: q.text, domain: d.id, domainLabel: d.label,
        rawA, rawB, normA, normB, gap,
        gapClass: classifyGap(gap), quad: quadrant(normA, normB),
        isReversed: !!q.rev,
        weightedGap: gap * (W[d.id] || 1),
      };
    }).filter(Boolean)
  );

  const domainScores = DOMAINS.map((d) => {
    const qs = allQuestions.filter((q) => q.domain === d.id);
    if (!qs.length) return null;
    const avgNormA = qs.reduce((s, q) => s + q.normA, 0) / qs.length;
    const avgNormB = qs.reduce((s, q) => s + q.normB, 0) / qs.length;
    const avgNorm = (avgNormA + avgNormB) / 2;
    const domainGap = Math.abs(avgNormA - avgNormB);
    const weight = W[d.id] || 1;
    // Per-question breakdown within this domain, sorted by gap (desc) then id
    // (asc) for deterministic ordering. Lets the UI name exactly which
    // questions a perception gap comes from, and who scored higher.
    const questionGaps = qs
      .map((q) => ({
        id: q.id, text: q.text, gap: q.gap,
        normA: q.normA, normB: q.normB,
        higher: q.normA > q.normB ? "A" : q.normB > q.normA ? "B" : "tie",
        gapClass: q.gapClass,
      }))
      .sort((a, b) => (b.gap - a.gap) || (a.id < b.id ? -1 : 1));
    return {
      id: d.id, label: d.label, icon: d.icon,
      avgNormA, avgNormB, avgNorm, domainGap, weight,
      weightedScore: avgNorm * weight,
      gapClass: classifyGap(domainGap),
      health: classifyHealth(avgNorm),
      quad: quadrant(avgNormA, avgNormB),
      questionGaps,
    };
  }).filter(Boolean);

  const totalWeight = domainScores.reduce((s, d) => s + d.weight, 0);
  const overallScore = totalWeight > 0
    ? domainScores.reduce((s, d) => s + d.weightedScore, 0) / totalWeight
    : 0; // no scorable domains (e.g. everything marked N/A) → neutral 0 rather than NaN

  // Deterministic tie-breaking: sort by weightedGap desc, then domain weight
  // desc, then question id asc — so identical inputs always yield identical order.
  const tensions = [...allQuestions].sort((a, b) =>
    b.weightedGap - a.weightedGap ||
    (W[b.domain] - W[a.domain]) ||
    a.id.localeCompare(b.id)
  ).slice(0, 10);

  const flags = detectFlags(domainScores, answersA, answersB, nameA, nameB);

  const goalPriority1yr = [...domainScores].sort((a, b) =>
    (a.avgNorm * a.weight) - (b.avgNorm * b.weight) || a.id.localeCompare(b.id));
  const goalPriority5yr = [...domainScores].sort((a, b) =>
    (b.domainGap * b.weight) - (a.domainGap * a.weight) || a.id.localeCompare(b.id));
  const goalPriority10yr = [...domainScores].sort((a, b) =>
    b.weight - a.weight || a.id.localeCompare(b.id));

  return {
    allQuestions, domainScores, overallScore, tensions, flags,
    goalPriority1yr, goalPriority5yr, goalPriority10yr, nameA, nameB,
  };
}

// ─── PATTERN FLAGS (deterministic rules) ────────────────────────────────────
function detectFlags(domainScores, answersA, answersB, nameA, nameB) {
  const flags = [];
  const ds = Object.fromEntries(domainScores.map((d) => [d.id, d]));

  if (ds.faith && ds.marriage) {
    if (ds.faith.avgNorm < 5 && ds.marriage.avgNorm < 5)
      flags.push({ type: "CRITICAL", label: "Core Instability",
        text: `Both faith alignment and marriage health score below 5.0. These two domains are mutually reinforcing (Mahoney et al., 2001); low scores in both compound the risk to long-term family stability. This is your most urgent combined priority.` });
    if (ds.faith.domainGap >= 3)
      flags.push({ type: "TENSION", label: "Spiritual Misalignment",
        text: `A ${ds.faith.domainGap.toFixed(1)}-point gap in Faith indicates meaningfully different spiritual experience between you. Shared spiritual practice is a documented predictor of marital satisfaction in faith-active couples.` });
  }

  const mo5A = answersA.mo5, mo5B = answersB.mo5;
  if ((mo5A >= 7) || (mo5B >= 7))
    flags.push({ type: "URGENT", label: "Active Financial Conflict",
      text: `At least one partner rates financial tension ≥7. Financial disagreement is among the strongest divorce predictors (Stanley et al., 2002; Dew et al., 2012). This warrants structured attention beyond a budgeting conversation.` });

  const placeMisaligned = (answersA.p5 <= 3) || (answersB.p5 <= 3);
  const placeTense = (answersA.p8 >= 7) || (answersB.p8 >= 7);
  if (placeMisaligned || placeTense)
    flags.push({ type: "TENSION", label: "Geographic Unresolution",
      text: `Unresolved geographic identity is a chronic background stressor in bicultural/expat families. The inability to commit to a place redirects energy away from growth domains and holds the family in a psychological holding pattern.` });

  if (ds.children && ds.children.domainGap >= 2.5)
    flags.push({ type: "TENSION", label: "Parenting Vision Divergence",
      text: `A ${ds.children.domainGap.toFixed(1)}-point gap in the Children domain suggests different pictures of parenting. Parenting disagreement is a primary driver of marital dissatisfaction in active parenting years (Cowan & Cowan, 1992).` });

  if (ds.intimacy && ds.intimacy.avgNorm < 5)
    flags.push({ type: "TENSION", label: "Intimacy Under Strain",
      text: `Intimacy scores below 5.0. Sexual and relationship satisfaction are tightly, bidirectionally linked, and declining intimacy tends to pull overall satisfaction down with it over time (Park et al., 2023; Schoenfeld et al., 2017). Worth gentle, honest attention rather than avoidance.` });
  if (ds.intimacy && ds.intimacy.domainGap >= 3)
    flags.push({ type: "TENSION", label: "Intimacy Mismatch",
      text: `A ${ds.intimacy.domainGap.toFixed(1)}-point gap in Intimacy means the two of you experience this area quite differently. The most protective step is open, kind communication about it — sexual communication quality is robustly tied to satisfaction (Mallory et al., 2022).` });

  if (ds.inlaws && ds.inlaws.domainGap >= 2.5)
    flags.push({ type: "TENSION", label: "Extended-Family Disagreement",
      text: `A ${ds.inlaws.domainGap.toFixed(1)}-point gap on extended family is worth naming: spousal disagreement about closeness to in-laws early in marriage predicted higher divorce risk over 16 years, even after accounting for the actual relationships (Fiori et al., 2021). Getting aligned as a couple is the high-leverage move.` });

  const strengths = domainScores.filter((d) => d.quad === "SHARED_STRENGTH" && d.avgNorm >= 7);
  if (strengths.length)
    flags.push({ type: "STRENGTH", label: "Shared Foundations",
      text: `Both partners score high in: ${strengths.map((d) => d.label).join(", ")}. These are buildable assets — plan from strength, not only from deficit.` });

  const growth = domainScores.filter((d) => d.quad === "SHARED_GROWTH" && d.avgNorm < 5);
  if (growth.length)
    flags.push({ type: "URGENT", label: "Mutual Growth Needed",
      text: `Both partners acknowledge significant gaps in: ${growth.map((d) => d.label).join(", ")}. Shared low scores mean agreed problems — both of you already see the need.` });

  const leaders = domainScores.filter((d) => (d.quad === "A_LEADS" || d.quad === "B_LEADS") && d.domainGap >= 2.5);
  leaders.forEach((d) => {
    const leadName = d.quad === "A_LEADS" ? nameA : nameB;
    const folName = d.quad === "A_LEADS" ? nameB : nameA;
    const leadV = (d.quad === "A_LEADS" ? d.avgNormA : d.avgNormB).toFixed(1);
    const folV = (d.quad === "A_LEADS" ? d.avgNormB : d.avgNormA).toFixed(1);
    flags.push({ type: "INSIGHT", label: `Asymmetry — ${d.label}`,
      text: `${leadName} (${leadV}) is notably further ahead than ${folName} (${folV}) in ${d.label}. Named directly, asymmetry can be a growth catalyst; ignored, it tends to breed resentment.` });
  });

  // ── Behavioral-marker flags (Gottman) ─────────────────────────────────────
  // m15 = contempt, m18 = stonewalling, b4 = flooding. All reverse-scored, so a
  // HIGH RAW answer means the harmful pattern is present. We surface these as
  // prominent flags (not as a mechanical score override) because a single
  // self-report item is not reliable enough to hard-cap a whole domain — but it
  // is well worth naming, especially contempt.
  const contemptPresent = (answersA.m15 >= 7) || (answersB.m15 >= 7);
  if (contemptPresent)
    flags.push({ type: "URGENT", label: "Contempt Detected",
      text: `At least one partner reports frequent contempt during conflict (sarcasm, mockery, a sense of superiority). In Gottman's research, contempt was the single strongest predictor of divorce. This is worth taking seriously now, even if other areas look healthy — the research-supported antidote is deliberately building a culture of appreciation and respect. This is a self-reported pattern, not a verdict on your marriage.` });

  const stonewallPresent = (answersA.m18 >= 7) || (answersB.m18 >= 7);
  if (stonewallPresent)
    flags.push({ type: "TENSION", label: "Stonewalling Pattern",
      text: `At least one partner tends to shut down or withdraw during conflict (stonewalling). This is often a response to feeling physiologically overwhelmed; a brief, agreed self-soothing break before continuing tends to help more than pushing through.` });

  // Physiological flooding: flooding present (b4 high raw) AND marriage strained.
  const floodingPresent = (answersA.b4 >= 7) || (answersB.b4 >= 7);
  if (floodingPresent && ds.marriage && ds.marriage.avgNorm < 5)
    flags.push({ type: "TENSION", label: "Physiological Flooding",
      text: `Conflict appears to trigger a strong fight-or-flight response (a racing heart, feeling overwhelmed) while the marriage is also under strain. When the body floods, the brain can't process repair attempts well. A deliberate 20-minute cooling-off period before resuming hard conversations is the commonly recommended step.` });

  // Core Attachment Insecurity: anxious toward God (f14 high raw) AND the
  // marriage shows strain. We deliberately do NOT claim a romantic-attachment
  // measure we don't have; we pair God-attachment anxiety with marital strain,
  // and we keep the language gentle and non-diagnostic.
  const godAnxious = (answersA.f14 >= 7) || (answersB.f14 >= 7);
  if (godAnxious && ds.marriage && ds.marriage.avgNorm < 5)
    flags.push({ type: "INSIGHT", label: "Felt Security",
      text: `At least one partner expresses some fear of being abandoned by God, alongside current marital strain. Research finds a modest link between anxiety toward God and anxiety in close relationships — a sense of a "secure base." This is a gentle observation for personal reflection and prayer, not a diagnosis; it may simply be worth noticing together.` });

  // Sanctification Buffer: marriage low but the marriage is held as sacred
  // (f8 high raw). A note of genuine hope grounded in the research.
  const sanctificationHigh = (answersA.f8 >= 8) || (answersB.f8 >= 8);
  if (ds.marriage && ds.marriage.avgNorm < 5 && sanctificationHigh)
    flags.push({ type: "STRENGTH", label: "Sacred-Bond Buffer",
      text: `Your marriage is under some strain right now, yet at least one of you strongly holds it as sacred and God-given. In the research literature, viewing a marriage as sacred is associated with greater motivation to protect and repair it. That shared sense of sacred purpose can be real fuel for the work ahead.` });

  return flags;
}

// ─── LOCAL LANGUAGE GENERATION (deterministic, template-driven) ─────────────
// Produces vision, mission, goals, and tension explanations entirely on-device.
// Phrasing is selected by score patterns — no randomness, no network.

const GOAL_TEMPLATES = {
  faith: {
    low:  { "1yr": "Establish a shared daily rhythm of Scripture and prayer — the foundation everything else rests on.",
            "5yr": "Build a home and marriage visibly centered on Christ, with spiritual practices that have become second nature.",
            "10yr": "Leave a multigenerational legacy of living faith — children and grandchildren who walk with God because they saw it modeled." },
    high: { "1yr": "Deepen and steward your existing faith life — move from consistency to intentional discipleship of others.",
            "5yr": "Lead others spiritually from the overflow of your own walk — mentoring, hosting, teaching.",
            "10yr": "Have spent the decade as spiritual anchors in your family and community, bearing visible fruit." },
  },
  marriage: {
    low:  { "1yr": "Establish a weekly marriage check-in and protected time together; name and begin addressing your top tensions, with help if needed.",
            "5yr": "Rebuild the marriage into a source of strength rather than strain — patterns of repair and connection that hold under pressure.",
            "10yr": "Have a marriage of deep covenant faithfulness that has weathered difficulty and grown through it." },
    high: { "1yr": "Protect and deepen what is already strong — guard your rhythms of connection against the pressures of this season.",
            "5yr": "Be a marriage that younger couples seek out as a model; invest your strength outward.",
            "10yr": "Celebrate decades of covenant love that has only deepened — a visible testimony." },
  },
  children: {
    low:  { "1yr": "Write a shared parenting philosophy and align on faith formation, discipline, and presence — close the gap between you.",
            "5yr": "Build a home culture your children will remember with warmth and that actively forms their faith.",
            "10yr": "Raise children who own a living, personal faith and know who they are before God." },
    high: { "1yr": "Maintain intentional one-on-one time with each child and keep refining your shared approach.",
            "5yr": "Disciple your children into maturity, adjusting as each one grows into their own person.",
            "10yr": "Have adult relationships with your children that are close, mutual, and grounded in shared faith." },
  },
  vocation: {
    low:  { "1yr": "Write a personal vocation statement for this season; resolve the identity question around work and contribution.",
            "5yr": "Be doing work — paid or unpaid — that genuinely uses your deepest gifts and that you are proud of.",
            "10yr": "Have built a coherent body of work that integrates all your gifts into a recognizable life's contribution." },
    high: { "1yr": "Channel your clear sense of calling into 2–3 concrete projects with visible output this year.",
            "5yr": "Be mentoring others in your field and producing work of lasting value.",
            "10yr": "Have left a mark in your area of calling and handed wisdom to the next generation." },
  },
  place: {
    low:  { "1yr": "Make a deliberate, prayerful decision about long-term geography — end the holding pattern.",
            "5yr": "Be rooted in a place you have chosen, with real community — church, friends, neighbors.",
            "10yr": "Live somewhere that is unambiguously home, with deep roots and a settled heart." },
    high: { "1yr": "Deepen your investment in the place you've chosen — hospitality, neighbors, local belonging.",
            "5yr": "Be a household known for welcome and presence in your community.",
            "10yr": "Have built a legacy of rootedness and hospitality in one place." },
  },
  money: {
    low:  { "1yr": "Build a complete financial picture (assets, liabilities, exposure) and align on a shared money philosophy and giving plan.",
            "5yr": "Have financial structure that funds both security and generosity, with risk well-managed.",
            "10yr": "Have legacy planning in place and be known as a genuinely generous family." },
    high: { "1yr": "Formalize your giving and long-term plan; steward your security into greater generosity.",
            "5yr": "Use financial strength deliberately for kingdom purposes, not merely comfort.",
            "10yr": "Have used money across the decade as a tool for blessing others and securing your family." },
  },
  body: {
    low:  { "1yr": "Establish one sustainable physical discipline (sleep, movement, or nutrition) that will compound over years.",
            "5yr": "Be measurably stronger and more capable than today, with chronic risks managed.",
            "10yr": "Have a body that can do what you want it to at 65+, having maintained vitality rather than declined." },
    high: { "1yr": "Maintain your strong habits and add Sabbath/rest as a deliberate discipline.",
            "5yr": "Be a model of physical stewardship for your children.",
            "10yr": "Enter your later years with the capacity your earlier discipline built." },
  },
  creative: {
    low:  { "1yr": "Protect non-negotiable weekly creative time and complete one significant project.",
            "5yr": "Build a body of creative work you are proud of, shared with others if called.",
            "10yr": "Leave a documented creative legacy and have mentored others in your craft." },
    high: { "1yr": "Sustain your active creative life and discern whether it carries a wider calling.",
            "5yr": "Share your creative gifts with a broader audience as worship and witness.",
            "10yr": "Have used your creativity across the decade as a sustained act of worship and contribution." },
  },
  community: {
    low:  { "1yr": "Identify 2–3 people to invest in deeply and connect consistently with a church community.",
            "5yr": "Be known as a family that gives generously of time, home, and resources.",
            "10yr": "Have left a mark on your community and raised children who are themselves givers." },
    high: { "1yr": "Deepen your existing investments — move from involvement to genuine discipleship.",
            "5yr": "Be a hub of community and mentorship, multiplying what you've built.",
            "10yr": "Leave a legacy of faithful presence and generosity that outlasts you." },
  },
  intimacy: {
    low:  { "1yr": "Reconnect intentionally — protect unhurried time together and begin honest, kind conversations about your intimacy.",
            "5yr": "Build a resilient, mutually satisfying intimacy that weathers the seasons of family life.",
            "10yr": "Enjoy a marriage marked by deep closeness, trust, and tenderness that has only grown." },
    high: { "1yr": "Keep tending what is strong — guard time together and stay openly communicative as life gets busy.",
            "5yr": "Let your strong intimacy anchor the marriage through demanding years of parenting and work.",
            "10yr": "Model and sustain a thriving, faithful intimacy across the decades." },
  },
  inlaws: {
    low:  { "1yr": "Get on the same page as a couple about boundaries and closeness with extended family.",
            "5yr": "Establish a united, peaceful pattern with both families that protects your marriage.",
            "10yr": "Enjoy healthy, honoring relationships with extended family without strain on your union." },
    high: { "1yr": "Maintain your united front and keep communicating openly about family dynamics.",
            "5yr": "Be a couple whose strong boundaries let you bless extended family generously.",
            "10yr": "Pass on a model of honoring parents while keeping the marriage first." },
  },
};

function pickGoal(domainId, band, timeframe) {
  const t = GOAL_TEMPLATES[domainId];
  if (!t) return "";
  return t[band][timeframe];
}

// Per-partner aspirational vision + mission, built deterministically from that
// partner's own domain scores. Aspirational in tone (a hope/prayer, not a claim
// about the present), matching the joint vision/mission. `which` is "A" or "B".
// Returns { vision, mission }. No randomness, no network.
function buildIndividualVM(analytics, which) {
  const { domainScores, nameA, nameB } = analytics;
  const name = which === "A" ? nameA : nameB;
  const score = (d) => (which === "A" ? d.avgNormA : d.avgNormB);
  const ranked = [...domainScores].sort((a, b) => score(b) - score(a));
  const strong = ranked.slice(0, 2);
  const weak = ranked.slice(-2);
  const lc = (d) => d.label.split(/[ &]/)[0].toLowerCase();

  // A short, domain-specific aspirational clause for a growth area.
  const GROWTH_CLAUSE = {
    faith: "let their walk with Christ set the rhythm of daily life",
    marriage: "turn toward their spouse with deliberate, patient love",
    intimacy: "grow in honest, tender closeness",
    children: "be a steady, present, faith-shaping parent",
    inlaws: "hold extended-family relationships with grace and clear boundaries",
    vocation: "do work that genuinely uses their gifts",
    place: "put down real roots and belong somewhere",
    money: "steward resources with both wisdom and open-handed generosity",
    body: "care for their body as a gift to be kept, not spent",
    creative: "make space for the creative gifts entrusted to them",
    community: "invest deeply in a few people and a church family",
  };
  const STRENGTH_CLAUSE = {
    faith: "a living faith",
    marriage: "a committed, attentive marriage",
    intimacy: "genuine closeness",
    children: "wholehearted parenting",
    inlaws: "healthy family relationships",
    vocation: "meaningful work",
    place: "a sense of rootedness",
    money: "faithful stewardship",
    body: "physical discipline",
    creative: "creative vitality",
    community: "a generous presence with others",
  };
  // Guard: with very few scored domains, strong/weak can overlap or be missing.
  // Fall back gracefully rather than indexing past the end of the array.
  const fallbackStrength = (d) => d ? (STRENGTH_CLAUSE[d.id] || d.label.toLowerCase()) : "the gifts God has given";
  const fallbackGrowth = (d) => d ? (GROWTH_CLAUSE[d.id] || `tend their ${lc(d)}`) : "keep growing in every area";
  const fallbackArea = (d) => d ? lc(d) : "every part of life";

  const g0 = fallbackGrowth(weak[0]);
  const g1 = weak[1] && weak[1].id !== weak[0].id ? fallbackGrowth(weak[1]) : null;
  const s0 = fallbackStrength(strong[0]);
  const s1 = strong[1] && strong[1].id !== strong[0].id ? fallbackStrength(strong[1]) : null;
  const w0 = fallbackArea(weak[0]);
  const w1 = weak[1] && weak[1].id !== weak[0].id ? fallbackArea(weak[1]) : null;

  const strengthsPhrase = s1 ? `${s0} and ${s1}` : s0;
  const growthAreas = w1 ? `${w0} and ${w1}` : w0;
  const growthActions = g1 ? `${g0} and ${g1}` : g0;

  const vision = `By God's grace, ${name} will grow into the person He is calling them to be — drawing on ${strengthsPhrase}, and giving prayerful attention to ${growthAreas} — so that their whole life, inside the marriage and beyond it, bears witness to Christ.`;
  const mission = `${name} will seek God daily, love and serve their spouse and family with intention, and steward their gifts faithfully. In this season they will protect their ${s0} while deliberately working to ${growthActions}.`;
  return { vision, mission };
}

export function generateLocalPlan(analytics) {
  const { domainScores, tensions, flags, goalPriority1yr, goalPriority5yr,
          goalPriority10yr, overallScore, nameA, nameB } = analytics;

  const ds = Object.fromEntries(domainScores.map((d) => [d.id, d]));
  const band = (id) => (ds[id] && ds[id].avgNorm >= 6.5 ? "high" : "low");

  // Guard: if nothing is scorable (e.g. every question was marked N/A, or the
  // assessment is empty), return a safe, honest minimal plan rather than
  // crashing on empty-array access below.
  if (!domainScores.length) {
    const emptyVM = {
      vision: `By God's grace, ${nameA} and ${nameB} will build a Christ-centered marriage and family.`,
      mission: `Once you have completed the assessment, this plan will reflect your actual answers. For now, there isn't enough information to generate a personalized vision.`,
    };
    return {
      vision: emptyVM.vision, mission: emptyVM.mission,
      goals1yr: [], goals5yr: [], goals10yr: [],
      indivA: { ...emptyVM }, indivB: { ...emptyVM },
      tensions: [], flags, domainScores, overallScore, nameA, nameB,
    };
  }

  // ── Vision ──────────────────────────────────────────────────────────────
  // Selected by overall health and the strongest/weakest domains.
  const sorted = [...domainScores].sort((a, b) => b.avgNorm - a.avgNorm);
  const lcLabel = (d) => d.label.split(" ")[0].toLowerCase();
  const topList = sorted.slice(0, 2).map(lcLabel);
  const botList = sorted.slice(-2).map(lcLabel);
  const strengthsText = topList.length > 1 ? `${topList[0]} and ${topList[1]}` : topList[0];
  const growthText = botList.length > 1 ? `${botList[0]} and ${botList[1]}` : botList[0];

  const healthFraming = overallScore >= 7
    ? "building on a genuinely strong foundation"
    : overallScore >= 5.5
    ? "with real strengths to build on and clear areas calling for growth"
    : "honestly naming the work ahead and trusting God to meet you in it";

  const vision = `By God's grace, ${nameA} and ${nameB} will build a Christ-centered family — drawing on their strength in ${strengthsText}, while intentionally tending ${growthText} — so that their marriage, their children, and their work all bear witness to the One who called them, ${healthFraming}.`;

  // ── Mission ─────────────────────────────────────────────────────────────
  const weakestLabel = sorted[sorted.length - 1].label;
  const strongestLabel = sorted[0].label;
  const mission = `We will seek God first together; love each other with deliberate, sacrificial attention; raise our children to know and follow Christ; and steward our gifts and resources generously. In this season we will protect what is strong in our ${strongestLabel.toLowerCase()} and give particular, prayerful effort to our ${weakestLabel.toLowerCase()} — holding this plan loosely enough to follow God where He leads.`;

  // ── Goals ───────────────────────────────────────────────────────────────
  const goals1yr = goalPriority1yr.map((d) => ({ domain: d.label, goal: pickGoal(d.id, band(d.id), "1yr") }));
  const goals5yr = goalPriority5yr.map((d) => ({ domain: d.label, goal: pickGoal(d.id, band(d.id), "5yr") }));
  const goals10yr = goalPriority10yr.map((d) => ({ domain: d.label, goal: pickGoal(d.id, band(d.id), "10yr") }));

  // ── Tension explanations (deterministic, pattern-based) ──────────────────
  const tensionItems = tensions.map((q) => {
    const dir = q.normA > q.normB ? `${nameA} rates this notably higher than ${nameB}` :
                q.normB > q.normA ? `${nameB} rates this notably higher than ${nameA}` :
                "you rate this identically";
    const sev = q.gapClass.level;
    const why = sev === "CRITICAL" || sev === "HIGH"
      ? "A gap this large means you are effectively experiencing two different realities here — this needs direct, honest conversation before it calcifies."
      : sev === "MODERATE"
      ? "A gap of this size is meaningful and worth naming explicitly rather than assuming you are aligned."
      : "A smaller but real difference — easy to overlook, worth a brief check-in.";
    return {
      title: q.text,
      explanation: `${dir} (${q.normA} vs ${q.normB}). ${why}`,
      domain: q.domainLabel,
      scoreA: q.normA, scoreB: q.normB, gap: q.gap, gapClass: q.gapClass,
    };
  });

  // ── Individual visions/missions (deterministic, per partner) ─────────────
  const indivA = buildIndividualVM(analytics, "A");
  const indivB = buildIndividualVM(analytics, "B");

  return {
    vision, mission, goals1yr, goals5yr, goals10yr,
    indivA, indivB,
    tensions: tensionItems, flags, domainScores, overallScore, nameA, nameB,
  };
}

// ============================================================================
// SHORT-FORM (CHECK-IN) & TREND ANALYSIS
// ----------------------------------------------------------------------------
// A "check-in" is a shortened re-test using only the core anchor question of
// each domain (one per domain). Full assessments and check-ins both produce a
// session snapshot. Trend analysis compares snapshots over time.
//
// All functions here are pure and deterministic. No network, no randomness.
// ============================================================================

// The core (short-form) questions: exactly one anchor per domain.
export const CORE_QUESTIONS = DOMAINS.map((d) => {
  const core = d.questions.find((q) => q.core) || d.questions[0];
  return { ...core, domain: d.id, domainLabel: d.label, icon: d.icon, scripture: d.scripture };
});

// Build a session snapshot from a completed analytics object.
// `kind` is "full" or "checkin". `ts` is an ISO timestamp.
// Deterministic "Start the Conversation" guide — used when the local AI is off
// or unavailable. Builds an honest summary and targeted open questions from the
// computed analytics, with no external dependency.
export function buildConversationGuide(analytics) {
  const { domainScores, tensions, overallScore, nameA, nameB } = analytics;
  const sorted = [...domainScores].sort((a, b) => b.avgNorm - a.avgNorm);
  const strong = sorted.slice(0, 2);
  const weak = sorted.slice(-2);
  const widestGaps = [...domainScores].sort((a, b) => b.domainGap - a.domainGap).slice(0, 2);
  const fmt = (d) => `${d.label} (${d.avgNorm.toFixed(1)})`;

  // Report ONLY what the numbers say. No characterization of the marriage, no
  // metaphors, no claims about strengths/foundations the data can't support.
  const positive = `Your highest-scoring areas were ${fmt(strong[0])} and ${fmt(strong[1])}.`;
  const growth = `Your lowest-scoring areas were ${fmt(weak[0])} and ${fmt(weak[1])}` +
    (widestGaps[0] ? `, and your widest difference in scores was in ${widestGaps[0].label} (gap ${widestGaps[0].domainGap.toFixed(1)})` : "") + `.`;
  const overall = `Overall score: ${overallScore.toFixed(1)} out of 10. The questions below focus on the areas where your scores differed most — they are starting points for conversation, not conclusions.`;

  // Questions from the widest-gap individual items, then weakest domains.
  const questions = [];
  (tensions || []).slice(0, 4).forEach((q) => {
    const qText = q.text || q.title || "this area";
    const higher = q.normA > q.normB ? nameA : q.normB > q.normA ? nameB : null;
    questions.push({
      area: q.domainLabel || "",
      prompt: higher
        ? `On "${qText}", ${higher} scored this higher. Can each of you describe what you're seeing that the other might not be?`
        : `You scored "${qText}" differently. What experiences are shaping how each of you sees it?`,
      why: "Relates to one of your widest individual score gaps.",
    });
  });
  weak.forEach((d) => {
    questions.push({
      area: d.label,
      prompt: `When you think about ${d.label.toLowerCase()}, what would "one step healthier, a year from now" actually look like for you two?`,
      why: `Relates to ${d.label}, one of your two lowest-scoring areas (${d.avgNorm.toFixed(1)}).`,
    });
  });
  return { summary: { positive, growth, overall }, questions: questions.slice(0, 7) };
}

export function buildSnapshot(analytics, kind, ts) {
  return {
    ts: ts || new Date().toISOString(),
    kind,
    overall: round1(analytics.overallScore),
    // Per-domain: store both partners' normalized averages.
    domains: Object.fromEntries(
      analytics.domainScores.map((d) => [
        d.id,
        { a: round1(d.avgNormA), b: round1(d.avgNormB), avg: round1(d.avgNorm), gap: round1(d.domainGap) },
      ])
    ),
    // Couple-level alignment = mean absolute domain gap (lower = more aligned).
    alignmentGap: round1(
      analytics.domainScores.reduce((s, d) => s + d.domainGap, 0) / analytics.domainScores.length
    ),
  };
}

const round1 = (x) => Math.round(x * 10) / 10;

// For a check-in we only have one question per domain. We still run it through
// the same scoring path by treating that single answer as the domain mean.
// computeAnalytics already averages whatever questions are present, so a
// check-in answer map (only core ids) yields a valid, comparable snapshot.

// ── TREND METRICS ───────────────────────────────────────────────────────────
// Given an ordered array of snapshots (oldest first), compute trend series.

export function computeTrends(sessions) {
  if (!sessions || sessions.length === 0) return null;
  const ordered = [...sessions].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const baseline = ordered[0];
  const latest = ordered[ordered.length - 1];

  const domainIds = DOMAINS.map((d) => d.id);

  // 1. MISSION DRIFT
  // Euclidean distance between each session's domain-average vector and the
  // BASELINE vector, normalized to 0–10. Rising drift = moving away from the
  // life you originally described. This is the "are we still on mission?" metric.
  const baselineVec = domainIds.map((id) => baseline.domains[id]?.avg ?? 0);
  const driftSeries = ordered.map((s) => {
    const vec = domainIds.map((id) => s.domains[id]?.avg ?? 0);
    const dist = Math.sqrt(vec.reduce((acc, v, i) => acc + (v - baselineVec[i]) ** 2, 0));
    // Normalize: max possible distance on 9 dims of range 10 is sqrt(9*100)=30.
    return { ts: s.ts, kind: s.kind, value: round1((dist / 30) * 10) };
  });

  // 2. VALUE ALIGNMENT (between partners)
  // Mean absolute domain gap per session. Lower = more aligned. We also expose
  // the inverse "alignment score" (10 − gap) for an intuitive "higher is better"
  // line on the dashboard.
  const alignmentSeries = ordered.map((s) => ({
    ts: s.ts,
    kind: s.kind,
    gap: s.alignmentGap,
    score: round1(10 - s.alignmentGap),
  }));

  // 3. PER-DOMAIN TREND (couple average over time) + slope direction
  const domainTrends = domainIds.map((id) => {
    const d = DOMAINS.find((x) => x.id === id);
    const series = ordered.map((s) => ({ ts: s.ts, value: s.domains[id]?.avg ?? null }));
    const first = series[0].value;
    const last = series[series.length - 1].value;
    const delta = first != null && last != null ? round1(last - first) : 0;
    return {
      id, label: d.label, icon: d.icon,
      series,
      first, last, delta,
      direction: delta > 0.3 ? "up" : delta < -0.3 ? "down" : "flat",
      latestGap: latest.domains[id]?.gap ?? 0,
    };
  });

  // 4. OVERALL HEALTH series
  const overallSeries = ordered.map((s) => ({ ts: s.ts, kind: s.kind, value: s.overall }));

  // 5. HEADLINE deltas (baseline → latest)
  const headline = {
    sessions: ordered.length,
    spanDays: Math.round((new Date(latest.ts) - new Date(baseline.ts)) / 86400000),
    overallDelta: round1(latest.overall - baseline.overall),
    driftNow: driftSeries[driftSeries.length - 1].value,
    alignmentNow: round1(10 - latest.alignmentGap),
    alignmentDelta: round1((10 - latest.alignmentGap) - (10 - baseline.alignmentGap)),
    // Biggest improver / decliner domains
    topImprover: [...domainTrends].sort((a, b) => b.delta - a.delta)[0],
    topDecliner: [...domainTrends].sort((a, b) => a.delta - b.delta)[0],
    // Domain with widest current partner gap
    widestGap: [...domainTrends].sort((a, b) => b.latestGap - a.latestGap)[0],
  };

  // 6. DRIFT / ALIGNMENT FLAGS (deterministic)
  const trendFlags = [];
  if (headline.driftNow >= 3)
    trendFlags.push({ type: "TENSION", label: "Mission Drift Detected",
      text: `Your current life pattern has moved ${headline.driftNow}/10 away from your baseline. Some change is healthy growth; revisit whether this drift is chosen or accidental.` });
  if (headline.alignmentDelta <= -1)
    trendFlags.push({ type: "URGENT", label: "Alignment Declining",
      text: `Value alignment between you has dropped ${Math.abs(headline.alignmentDelta)} points since baseline. The gap between how you each experience your shared life is widening.` });
  if (headline.alignmentDelta >= 1)
    trendFlags.push({ type: "STRENGTH", label: "Alignment Improving",
      text: `Value alignment has improved ${headline.alignmentDelta} points since baseline. You are converging — keep doing what is working.` });
  if (headline.topDecliner && headline.topDecliner.delta <= -1)
    trendFlags.push({ type: "TENSION", label: `Declining — ${headline.topDecliner.label}`,
      text: `${headline.topDecliner.label} has fallen ${Math.abs(headline.topDecliner.delta)} points since baseline. This domain is trending down and may need deliberate attention.` });
  if (headline.topImprover && headline.topImprover.delta >= 1)
    trendFlags.push({ type: "STRENGTH", label: `Growing — ${headline.topImprover.label}`,
      text: `${headline.topImprover.label} has risen ${headline.topImprover.delta} points since baseline — the strongest area of growth.` });

  return { ordered, baseline, latest, driftSeries, alignmentSeries, domainTrends, overallSeries, headline, trendFlags };
}

// ============================================================================
// FUTURE PERFECT — DETERMINISTIC LETTER ELEMENT CAPTURE & FALLBACK COMPARISON
// ----------------------------------------------------------------------------
// The letter itself is free text (analyzed by the LLM when available). To keep
// the overlap scoring meaningful EVEN WITHOUT an LLM, each partner also marks a
// small set of structured "dream elements" — 0–10 importance per element. These
// are exact and comparable. If the LLM is unavailable, comparison falls back to
// these structured marks; if it is available, the LLM enriches with free-text
// themes and the structured marks remain as a verifiable backbone.
// ============================================================================

// Structured future-dream elements. Each maps loosely to a domain so the
// letter exercise connects back to the main assessment.
export const DREAM_ELEMENTS = [
  { id: "de_faith",    label: "A deeper, central walk with God",            domain: "faith" },
  { id: "de_legacy",   label: "Leaving a lasting spiritual legacy",          domain: "community" },
  { id: "de_marriage", label: "A thriving, intimate marriage",               domain: "marriage" },
  { id: "de_children", label: "Children who flourish and keep the faith",    domain: "children" },
  { id: "de_place",    label: "Being settled and rooted in one place",       domain: "place" },
  { id: "de_move",     label: "Living somewhere new / a significant move",   domain: "place" },
  { id: "de_work",     label: "Meaningful work or a calling fulfilled",      domain: "vocation" },
  { id: "de_rest",     label: "More rest, simplicity, and margin",           domain: "body" },
  { id: "de_creative", label: "A flourishing creative life or craft",        domain: "creative" },
  { id: "de_security", label: "Financial security and freedom",              domain: "money" },
  { id: "de_generous", label: "Giving generously / serving others",          domain: "money" },
  { id: "de_community",label: "Deep friendships and community",              domain: "community" },
  { id: "de_health",   label: "Strong health and vitality",                  domain: "body" },
  { id: "de_adventure",label: "Adventure, travel, new experiences",          domain: "creative" },
];

// Deterministic comparison of two partners' structured dream marks.
// marksA/marksB: { de_id: 0..10 }. Returns top commonalities & differences.
export function compareDreamMarks(marksA, marksB, nameA, nameB) {
  const rows = DREAM_ELEMENTS.map((e) => {
    const a = marksA[e.id], b = marksB[e.id];
    if (a === undefined || b === undefined) return null;
    return {
      id: e.id, label: e.label, domain: e.domain,
      a, b,
      bothHigh: a >= 7 && b >= 7,
      bothLow: a <= 3 && b <= 3,
      gap: Math.abs(a - b),
      shared: (a + b) / 2,
    };
  }).filter(Boolean);

  // Commonalities: both rate high, ranked by combined strength.
  const commonalities = rows
    .filter((r) => r.bothHigh)
    .sort((a, b) => (b.a + b.b) - (a.a + a.b) || a.id.localeCompare(b.id))
    .slice(0, 5)
    .map((r) => ({ theme: r.label, detail: `Both rate this highly (${nameA} ${r.a}, ${nameB} ${r.b}).`, domain: r.domain }));

  // Differences: largest gaps, ranked by gap then combined importance.
  const differences = rows
    .filter((r) => r.gap >= 4)
    .sort((a, b) => b.gap - a.gap || (b.a + b.b) - (a.a + a.b) || a.id.localeCompare(b.id))
    .slice(0, 5)
    .map((r) => ({
      theme: r.label,
      a: `${nameA}: ${r.a}/10`, b: `${nameB}: ${r.b}/10`,
      tension: r.gap >= 7 ? "high" : r.gap >= 5 ? "medium" : "low",
      domain: r.domain,
    }));

  // Alignment score for the letters specifically: 10 − mean gap across elements.
  const meanGap = rows.length ? rows.reduce((s, r) => s + r.gap, 0) / rows.length : 0;
  const letterAlignment = round1(10 - meanGap);

  return { commonalities, differences, letterAlignment, source: "structured" };
}

// Merge LLM comparison (if present) with the deterministic structured one.
// The structured result is always the verifiable backbone; LLM enriches labels.
export function mergeComparisons(structured, llm) {
  if (!llm) return structured;
  return {
    commonalities: (llm.commonalities && llm.commonalities.length ? llm.commonalities : structured.commonalities).slice(0, 5),
    differences: (llm.differences && llm.differences.length ? llm.differences : structured.differences).slice(0, 5),
    letterAlignment: structured.letterAlignment, // always from exact marks
    source: "llm+structured",
  };
}
