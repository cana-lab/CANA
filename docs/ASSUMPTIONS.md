# Assumptions & Scientific Basis

This document is deliberately candid. Every modeling choice in this tool rests on an assumption, and every assumption has limits. A professional artifact names them rather than hiding them.

## What this tool *is*

A **structured conversation instrument**. It takes two people's independent, honest self-ratings and turns them into a shared, prioritized, difference-aware picture to discuss together.

## What this tool is *not*

- It is **not** a validated psychometric scale. The items have not undergone factor analysis, reliability testing (Cronbach's α), or norming against a population.
- It is **not** a diagnostic or clinical instrument. It cannot assess relationship pathology, predict divorce for an individual couple, or substitute for counseling.
- The domain weights are **not** a calibrated statistical model. They are a transparent, defensible heuristic.

If those caveats matter to your use case, treat the numeric outputs as conversation prompts, not measurements.

---

## Assumption 1 — Self-report is informative

**Claim:** A person's self-rating of, say, marital satisfaction carries real signal.

**Basis:** Self-report is the dominant and well-validated method in relationship science (e.g. the Dyadic Adjustment Scale, Spanier 1976; the Couples Satisfaction Index, Funk & Rogge 2007). Self-reported relationship satisfaction predicts outcomes.

**Limit:** Self-report is subject to social desirability, mood at time of answering, and self-deception. Mitigated here by (a) independent answering, (b) the no-midpoint forced choice, and (c) surfacing *gaps between partners* rather than treating either person's score as ground truth.

## Assumption 2 — The chosen domains cover what matters

**Claim:** Nine domains adequately span a couple's shared life.

**Basis:** The domains were selected to align with areas repeatedly identified as predictors of marital quality and stability: financial agreement, communication and intimacy, parenting consensus, shared values/spirituality, and individual well-being (Larson & Holman, 1994, meta-analysis of premarital predictors).

**Limit:** Domain selection is a judgment. Some couples will have salient issues (extended family, health crises, addiction, trauma) not cleanly captured. The framework is explicitly Christian, which shapes both domains and framing; it is not worldview-neutral.

## Assumption 3 — Domain weights reflect relative importance

**Claim:** Faith and Marriage should weigh more than Creative Life in an overall health score.

**Basis:**
- **Faith (1.30):** Mahoney, Pargament, et al. (2001), *"Religion in the home in the 1980s and 1990s,"* and related work find that the *sanctification* of marriage and shared spiritual activity are associated with higher marital satisfaction and commitment, beyond mere church attendance.
- **Marriage (1.25):** Gottman (1999), *The Marriage Clinic* — relationship-process variables (the "Four Horsemen," repair attempts, positive-to-negative ratio) are the proximate predictors of dissolution.
- **Money (1.10):** Dew, Britt & Huston (2012), *"Examining the relationship between financial issues and divorce,"* Family Relations; Stanley, Markman & Whitton (2002) — financial disagreement is among the strongest and most robust divorce predictors.
- **Children (1.10):** Cowan & Cowan (1992), *When Partners Become Parents* — the transition to parenthood and parenting disagreement drive declines in marital satisfaction.
- **Place (1.05):** Drawn from acculturation / expatriate-adjustment literature (e.g. Berry's acculturation framework) indicating that unresolved belonging is a chronic stressor; weaker evidentiary base than the above, hence only slightly elevated.
- **Vocation 1.00 / Community 0.95 / Body 0.90 / Creative 0.85:** ordered by estimated couple-systemic impact, with individual-flourishing domains weighted below relational ones.

**Limit:** These are **point estimates of relative importance, not coefficients from a fitted model on this instrument's data.** Different couples and different research traditions would weight differently. The weights are centralized in one constant (`DOMAIN_WEIGHTS`) precisely so they can be inspected and changed. Treat the overall score as an ordinal summary, not a precise metric.

## Assumption 4 — Gap size maps to conversation priority

**Claim:** A larger difference between partners' answers indicates a more important conversation.

**Basis:** Gottman's research repeatedly shows that *perceptual discrepancy* — partners experiencing the relationship differently — is associated with distress. Surfacing the largest discrepancies first is a reasonable triage heuristic.

**Limit:** A large gap is not automatically a problem (partners can legitimately differ on, e.g., creative-life priority). The tool flags gaps for *discussion*, not as verdicts. Severity bands (Cohen, 1988, effect-size conventions scaled to 10 points) are interpretive, not diagnostic thresholds.

## Assumption 5 — Forced-choice (no 4/5/6) improves data

**Claim:** Removing the scale midpoint yields more useful answers.

**Basis:** Garland (1991); Nowlis, Kahn & Dhar (2002) — eliminating the neutral option reduces central-tendency and acquiescence bias.

**Limit:** It also forces respondents who are *genuinely* neutral to mis-state a direction. For a planning conversation this is an acceptable, even useful, provocation; for precise measurement it would be a flaw.

## Assumption 6 — Reverse-coding is correctly applied

**Claim:** Negatively-valenced items are inverted so all scores mean "health."

**Basis:** Standard practice in scale construction. Implemented as `10 − raw` and unit-tested.

**Limit:** Reverse-coded items are known to sometimes load differently than expected in factor analysis (the "method effect" of negatively-worded items). Not a concern for this tool's descriptive use, but noted.

---

## Theological framing

The instrument is grounded in a Christian understanding of marriage as covenant, work as vocation, and resources as stewardship. Scripture references (ESV) open each domain. This framing is intentional and central, not decorative. Couples outside this framework can still use the structure, but the language assumes it.

---

## References

- Cohen, J. (1988). *Statistical Power Analysis for the Behavioral Sciences* (2nd ed.).
- Cowan, C. P., & Cowan, P. A. (1992). *When Partners Become Parents.*
- Dew, J., Britt, S., & Huston, S. (2012). Examining the relationship between financial issues and divorce. *Family Relations, 61*(4).
- Dillman, D., Smyth, J., & Christian, L. (2014). *Internet, Phone, Mail, and Mixed-Mode Surveys: The Tailored Design Method.*
- Funk, J. L., & Rogge, R. D. (2007). Testing the ruler with item response theory: the Couples Satisfaction Index. *Journal of Family Psychology, 21*(4).
- Garland, R. (1991). The mid-point on a rating scale: Is it desirable? *Marketing Bulletin, 2.*
- Gottman, J. (1999). *The Marriage Clinic.*
- Krosnick, J. A., & Presser, S. (2010). Question and questionnaire design. In *Handbook of Survey Research.*
- Larson, J. H., & Holman, T. B. (1994). Predictors of marital quality and stability. *Family Relations, 43*(2).
- Mahoney, A., Pargament, K. I., et al. (2001). Religion in the home. *Journal of Family Psychology, 15*(4).
- Nowlis, S., Kahn, B., & Dhar, R. (2002). Coping with ambivalence. *Journal of Consumer Research, 29*(3).
- Spanier, G. B. (1976). Measuring dyadic adjustment. *Journal of Marriage and Family, 38*(1).
- Stanley, S. M., Markman, H. J., & Whitton, S. W. (2002). Communication, conflict, and commitment. *Family Process, 41*(4).

*Citations are provided for the constructs and conventions the design draws on. They support the* reasonableness *of the heuristics; they do not constitute validation of this specific instrument.*
