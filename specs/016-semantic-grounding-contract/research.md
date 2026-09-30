# Research: Feature 016 — Semantic Grounding Contract

Base: `main` `d51126f`. Checker: `src/analysis/grounding.ts` (extract → value/unit/rounding match against every
value the same extractor finds in the fact texts). Facts: `factSet()` builds H/D facts from the holding and
`InstrumentFacts` (fixture `portfolio-fixture@1` or live quotes, Features 014/015); market/news lines are strings.

Hypothesis (recorded before fixtures are run): the ORCL mismatch is prevented by adding, per fact value, a **metric**,
a **horizon/basis** and a **direction**, and by reading the same three cues from the clause around each numeric claim;
valuation and long-term outlook claims are caught by a finite lexicon plus the absence of any fact of the needed
evidence class.

## R1 — Where the semantics come from (FR-001, FR-016; research question 6)

- Decision: **the fact text stays the one canonical source; semantics are derived from it** by a single template
  table (`src/analysis/semantics.ts`): each template (regex over the sentences our own code produces) yields
  `{ metric, basis/horizon, unit, direction }` for each value it contains; subject and as-of come from the fact set
  (holding identity; the latest-price date).
- Rationale: fixture facts must stay byte-identical (Feature 014 SC-002 digest; measurement comparability); live and
  fixture market lines are produced by different code; a template table annotates both without a second, separately
  edited representation. Every template is a sentence our code (or the committed fixture) writes, so matching is
  deterministic and complete for current facts.
- Alternative (text generated from structured data): would change the fixture's free-text market lines or duplicate
  them; rejected for this Feature and recorded as the answer to question 6 ("possible for H/D and live lines, not
  without rewriting the fixture").
- A fact sentence no template matches keeps value-only grounding (as today) and is listed as a finding (not silently
  treated as semantic).

## R2 — Minimum metadata (research question 1)

- Per value: `metric` (price, quantity, cost_basis, unrealised_return, position_value, price_return, moving_average,
  range_high, range_low, volume_ratio, …), `basis` (the horizon or reference: `latest`, `since_average_purchase`,
  `sessions:20`, `days:50`, `weeks:52`, `days:7`, `days:30`), `unit`, `direction` (up/down/none, from the sign or the
  verb). Subject = the holding; as-of = the fact set's latest-price date.
- Hypothesis to test: `basis` + `direction` are the minimum for the ORCL case; `metric` separates same-basis values
  (52-week high vs low).

## R3 — Horizon: generic field (research question 3)

- Decision: one generic `basis` string with a small closed vocabulary (`sessions:N`, `days:N`, `weeks:N`, `latest`,
  `since_average_purchase`, `all_time`); claim cues map to the same vocabulary. Metric-specific structures are not
  needed for the current fact classes (finding recorded after the fixtures run).

## R4 — Claim cues (FR-003–FR-005)

- For each numeric claim, cues are read from its clause (the text between sentence ends, `,`, `;` and the Korean
  connectives `고 `, `며 `, `지만 `, `는데 `): basis cues (`20거래일`, `20일`, `지난 20`, `최근 20`, `20 sessions` →
  `sessions:20`; `평균 매수가`, `평단`, `매입가`, `average purchase` → `since_average_purchase`; `50일 이동평균`,
  `50-day` → `days:50` moving average; `52주`, `52-week` + 고가/최고/high or 저가/최저/low; `현재가`, `최신`, `latest` →
  `latest`), metric cues (`평가액`, `position value`; `보유`, `수량`), direction cues (`하락`, `떨어`, `감소`, `손실`,
  `fell`, `down` / `상승`, `올랐`, `증가`, `이익`, `rose`, `up`). The lists are finite and documented in the contract.
- A number that is itself part of a basis cue (the `20` in `20일`) is a horizon mention, checked by value as today.
- The connectives split only after a verb ending (e.g. `했고 `, `있으며 `, `했지만 `, `인데 `), so words such as
  `보고서` or `그리고` are not split points (analysis A1).
- Non-numeric comparisons outside the interpretation lexicon ("현재가가 평균 매수가보다 낮다") are not extracted; recorded as
  a finding (analysis I2).

## R5 — Classification (FR-003; research question 2)

1. No fact value matches (existing value/unit/rounding rules) → **UNSUPPORTED** (unchanged, fixture B).
2. Value matches and the clause has no semantic cue → **SUPPORTED** by the matching fact(s); several matches with
   different metrics are marked `ambiguous` (reported, not guessed).
3. Value matches and cues exist: a matching fact whose `basis`/`metric`/`direction` agree with every cue →
   **SUPPORTED**; otherwise → **SEMANTIC_MISMATCH**, with the value's fact (e.g. D2, `since_average_purchase`) and,
   when one exists, the fact that has the claimed basis (e.g. M1, −7.6 %) in the reason.
- Deterministic for the current fact classes (answer to question 2), by construction: templates and cue lists are
  closed; no model is involved (FR-015).

## R6 — Interpretation claims (FR-006, FR-007, FR-010; research question 4)

- A finite lexicon marks **valuation** claims (`저평가`, `고평가`, `싸다`, `저렴`, `밸류에이션`, `undervalued`,
  `overvalued`, `cheap`) and **long-term outlook** claims (`장기`, `잠재력`, `회복`, `성장성`, `upside`, `recover`,
  `long-term`, `potential`). Each needs evidence of its class (valuation metrics; fundamentals or news). No current
  fact class provides either — cost-basis, price, momentum and range facts are explicitly excluded — so such a clause
  is **UNSUPPORTED** with the reason "no valuation evidence" / "no fundamental or news evidence".
- **Insufficient-evidence statements** are allowed: a clause containing both a lexicon word and an insufficiency
  phrase (`근거가 부족`, `판단하기 어렵`, `정보가 없`, `알 수 없`, `not enough`, …, shared with the trap phrase list)
  is classified `insufficient-evidence`, counted as supported.
- Qualitative facts: `No news is supplied` is an **absence** fact (`metric: news, value: none`); it supports only
  absence statements and is never news evidence (answer to question 4).
- Not a general interpretation detector: out-of-lexicon interpretations stay unchecked (finding).

## R7 — Evidence mapping (FR-009; research questions 5 and 8)

- Every claim result carries `evidence: string[]` (the fact ids the checker used) and, for mismatch/unsupported, a
  `reason`. Evidence ids are **derived by the checker**, not required from the model: numeric claims inherit
  evidence from their value match; interpretation claims need a fact of their evidence class (none exist → none).
- Model-written references (Feature 013 refs mode, citation style) are not used as evidence in this Feature. Question
  8 is answered on the frozen fixtures by counting: detections with derived evidence only vs what a model citation
  could add (the ORCL mismatch is caught without citations) — recorded as a finding.

## R8 — Final-answer policy (FR-008) — adaptation A-016-1

- The final role's Korean-answer instruction gains one sentence (all number modes): "Report what the facts state; you
  may interpret them, but do not call the stock under- or overvalued or state a long-term outlook unless the facts
  contain such evidence — if they do not, say that the evidence is insufficient." Recorded as adaptation A-016-1
  (Constitution XI); the Feature 010/013 prompt-identity tests are updated with that one sentence and the reason.
- Not a guarantee of model behaviour; the checker is the guarantee. A native run is secondary validation only.

## R9 — Counts and measurement (FR-014)

- `Grounding.counts` gains `semanticMismatch`; interpretation claims are counted in `unsupported` (with their reason)
  or `supported` (insufficient-evidence). The answer window shows "일치 N건 · 의미 불일치 N건 · 근거 확인 안 됨 N건 ·
  확인 불가 표기 N건" and marks mismatches "의미 불일치".
- `aggregate()` keeps its fields and adds `semanticMismatchPerAnswer`; `zeroUnsupportedRate` counts an answer as clean
  only with 0 unsupported **and** 0 mismatches (a documented change). *Revised after F016-R3 (decision A): mismatches
  are reported separately and stay out of the clean rate and the verdict until their precision improves.* The recorded Feature 013 native reports are
  re-scored offline (as Feature 013 did for 010) to show before/after — secondary evidence, not the proof.

## R10 — Frozen fixtures (FR-013)

- `test/fixtures/grounding/semantic.json`: fixtures A (ORCL, fictional holding values per FR-019), B (QQQM) and C
  (synthetic: unrealised return +10.00 % and 20-session return +10.0 %), each claim with its expected class, evidence
  and a one-line hypothesis — written and committed before the checker changes; never edited after results.
