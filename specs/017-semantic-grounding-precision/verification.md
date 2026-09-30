# Verification: Feature 017 — Semantic Grounding Precision

## T001 — Baseline

- Base `main` `065711d` (merge of Feature 016). `npm test`: 231 tests, 230 pass, 1 skipped. Fixtures A–C 26 / 26.
- Feature 016 on the recorded Feature 013 native answers: 23 audited distinct mismatches (real 2, debatable 2, false
  19; precision 9–17 %); 24 interpretation sentences, all supported.
- Hypotheses (research.md, recorded before any rule change):
  - H1: most false mismatches come from two structures — a comparison whose reference-side cue is nearest to the
    value, and a metric label written after the value — and fixing those two removes ≥ 14 of 19 development false
    positives without losing the 2 real errors.
  - H2: a model citation of a fact that holds the value identifies the meant fact; using it as evidence removes refs
    duplicates and wrong-side anchors, but, if trusted over the clause cues, would hide real mislabels (US2-3).
  - H3: interpretation over-acceptance is fixed by requiring evidence that could support the judgement; with current
    data no fact can, so valuation and long-term judgements become UNSUPPORTED, and news restatements stay SUPPORTED
    when they match the item's content.

## T002–T004 — Frozen sets

| File | sha256 | Content |
|---|---|---|
| `test/fixtures/grounding/precision-dev.json` | `b2003fd45e69384409350881a4ba32cb4ac9d792be8db0292accde18aacf1c5a` | (a) 24 mismatches, (b) 24 interpretation sentences, (c) 33 raw refs answers (42 written-number citations) |
| `test/fixtures/grounding/precision-d.json` | `a4f00c91d45e4990245f1b71bc0ee12f3727f100adb9b850b691c97c2a321d9c` | 32 held-out cases |

- (a) has 24 distinct sentence/target pairs (the Feature 016 audit merged two near-identical sentences into 23);
  judgements: real 2, debatable 2, correct 20 — the same named cases as the Feature 016 audit.
- (b) and (c) judgements were written 2026-09-30 before any rule change. (b): supported 2 (news restatements),
  unsupported 14, none 8 (lexicon fires, no interpretation claim: "potential losses", "장기 최고가", …). (c): one real
  error ("{M1b} %": the 20-session window cited for the 11.2 % fall), two debatable.
- Fixture D is not run with any checker before the rules are frozen (T018).

### Baseline on the development set (Feature 016 checker, `node --test test/precision.test.ts`)

| Part | Result |
|---|---|
| (a) mismatches | true 2, **false 20**, debatable 2, real errors missed 0 |
| (b) interpretations | **2 / 24** agree (every sentence "supported" via N1 or M2) |
| (c) raw refs answers | flagged: true 1 (unsupported "20 %"), false 6, debatable 2; citations recorded 0 / 42 (not implemented) |

## T006–T008 — US1: comparisons and labels after values

Rule (src/analysis/grounding.ts `owner()`; cues in src/analysis/semantics.ts): each basis/metric cue belongs to one
value of its clause, and a value is checked only against its own cues:

1. A label right after a value is that value's (English after a space; Korean after 의 / 인 / 짜리 / 배; `배` / `times`
   right after a number is a multiple — P/E or volume ratio).
2. A cue followed by a comparison marker (보다, 대비, 에 비해, than, vs, compared) names the other side — unless a
   percentage follows it (then it is that change's basis: "평균 매수가 대비 8.00% 하락").
3. Otherwise the cue labels the next value, except (a) a value that is itself the other side of a comparison unless
   it sits right after the cue ("현재 주가가 201.00 USD보다" vs "평단 71,000원 대비"), and (b) a percentage measured
   against something else ("현재 주가는 구입 가격보다 6.27% 감소"); with no later value, the one before.
4. "현재 가격으로 / 현재가 기준" is a basis (latest) without the price metric.
5. A number right before an equal one ("24.3 24.3배", refs duplicates) takes that one's result.

Iterations on the development set (all recorded; fixtures A–C checked at each step): nearest-value ownership +
comparison + label rules → false 20 → 1; the bare-space Korean label ("-3.95% 현재 가격은") was wrongly read as a label
→ Korean labels need 의 / 인 / 짜리 / 배; that change dropped `배` right after a number → allowed explicitly; the
subject of a relative change → rule 3b.

| Development set (plain) | Before | After |
|---|---|---|
| (a) true / false / debatable mismatches | 2 / 20 / 2 | **2 / 0 / 1** |
| (a) real errors missed | 0 | 0 |
| (c) raw refs answers: true / false / debatable | 1 / 6 / 2 | 1 / 0 / 1 |

- SC-001 on the development set: met (false 0 ≤ 5, both real errors flagged). Tuned data: not evidence of
  generalisation.
- Fixtures A–C: 26 / 26. Existing tests: all pass except the SC-004 assertion (US3 not yet done); no existing
  expectation changed (SC-006).

## T009–T011 — US2: citations

- `claims(text, facts, known, { citations, variant })`; `ground()` passes the rendered refs of a refs answer
  (src/main.ts). Every numeric claim may carry `citation { factId, source, fit }`.
- Association (research R4, as implemented): a rendered reference pairs with the nearest written number or date **of
  the same value** in its sentence (or, when the reference opens a sentence, in the sentence before: "…달러입니다.
  {N1a}"); the pair is one claim (the rendered copy is dropped). A written fact id pairs with the nearest equal number;
  an id without a letter for a multi-number fact is `id-only`. `wrong` = a citation right after a number of another
  value — for a rendered reference only when it closes the sentence.
- Iterations on the development raws (recorded): pairing by fact id matched M1b (20) with 1.8 % (M1a) → paired by the
  reference's own value; a rendered reference used as a value ("매수 가격 {H3}보다 8.00%") was marked `wrong` →
  `wrong` only for a sentence-closing reference; dates can be cited ("2026년 11월 … {N1}").
- Scoring normalisation in the test only (fixture unchanged): the set names references (`M1b`), the checker records
  facts (`M1`); "3.2배" / "-3.95%" are read as "3.2" / "3.95%".

| Development set | plain | cite |
|---|---|---|
| (a) true / false / debatable mismatches | 2 / 0 / 1 | 2 / 0 / 1 |
| (a) real errors missed | 0 | 0 |
| (c) true / false / debatable mismatches | 1 / 0 / 1 | 1 / 0 / 1 |
| (c) citations recorded as judged | 42 / 42 | 42 / 42 |

- **Decision (FR-006): `plain` stays the default.** `cite` (narrowing the value's facts to the cited one before the cue
  check) removes no false mismatch and adds no real error on the development set — after US1 there is nothing left for
  it to fix. Citations are still recorded in both variants (evidence mapping, wrong-citation reasons, refs duplicates
  counted once). Fixture D's plain/cite counts are reported at T018.

## T012–T014 — US3: interpretation evidence

- Per sentence (src/analysis/grounding.ts `interpretations()`; lexicons in src/analysis/semantics.ts):
  insufficient-evidence → supported (unchanged); valuation **judgement** (저평가, undervalued, "high valuation", a
  valuation noun with 높은/낮은 편·수준) → UNSUPPORTED, "a valuation multiple alone has no benchmark" when a P/E fact
  exists; long-term outlook (장기 except 장기 최고/최저, long-term, 펀더멘털, 근본, 잠재력, 성장 가능성, upside,
  recover/회복/반등/rebound unless the sentence says 단기/short-term) → UNSUPPORTED; news restatement → SUPPORTED by
  the news item whose content key or number/date it shares, UNSUPPORTED when the restatement carries a value no fact
  holds ("영업이익이 25% 감소" vs 18 %) or when it names news without content; "potential" alone, "장기 최고가", a
  valuation mention without a judgement → no claim.
- Deviations from research R5, recorded: `반등`/`rebound` count as outlook unless the sentence says short-term (R5 said
  "only with a long-term word"; development sentence di06 "anticipating a potential rebound" is a forward-looking claim);
  the wrong-value rule for news restatements was added after the existing labelled claims showed "영업이익이 25% 감소"
  would otherwise be a supported restatement.

| Development set (b) | Feature 016 | Feature 017 |
|---|---|---|
| interpretation sentences agreeing with the hand judgement | 2 / 24 | **24 / 24** |

- SC-004 on the development set: met (every valuation and long-term judgement unsupported; the two real news
  restatements supported).
- Changed existing expectations (SC-006), `test/fixtures/grounding/claims.json`, each with a `changed` reason: five
  news-restatement sentences now carry a news claim — supported for "3분기 영업이익이 18% 감소할 전망", "자사주 매입
  규모는 15,000,000,000 USD", "임상 결과는 2026년 11월"; unsupported for "영업이익이 25% 감소", "임상 결과는 2026년
  12월" (value the facts do not hold). Numeric expectations unchanged.
- `npm test`: 235 tests, 233 pass, 0 fail, 2 skipped (fixture D report, opt-in; the existing skip).

## T015–T017 — Measurement record and re-score

- `MeasureRun.raw` (e2e/measure.ts, src/analysis/report.ts): the refs answer before rendering; scripts/rescore-measurement.ts
  re-renders it and passes the citations (absent in the Feature 013 reports, so those re-score with rendered text only),
  and reports interpretation outcomes.
- Regression (T016): `npm run typecheck` 0; `npm test` 235 tests, 233 pass, 0 fail, 2 skipped; `npm run test:browser`
  94 passed, 3 skipped.
- Re-score of the Feature 013 native reports (`evidence/rescore-013-native-{mode}.json`, 99 answers per mode):

| Mode | mismatches / answer (016 → 017) | unsupported / answer (016 → 017) | zero-unsupported (016 → 017) | trap handled | rule verdict (016 → 017) | interpretation claims supported / unsupported |
|---|---|---|---|---|---|---|
| current | 0.051 → **0.020** | 0.283 → 0.374 | 0.859 → 0.808 | 0.889 → 0.889 | LIMITED → LIMITED | 15 / 9 |
| formatted | 0.061 → **0** | 0.111 → 0.222 | 0.909 → 0.869 | 1 → 0.944 | USABLE → **LIMITED** | 40 / 11 |
| refs | 0.162 → **0.010** | 0.051 → 0.101 | 0.970 → 0.919 | 0.944 → 0.944 | USABLE → USABLE | 32 / 5 |

- The remaining mismatches are the two real errors (current) and the debatable refs case. The unsupported rise is
  entirely interpretation claims that are now unsupported (25 in total; each hand-judged unsupported in the development
  set (b)) — Feature 016 already counted interpretation claims in `unsupported` (research R9), but its rule marked them
  all supported. **F017-R1 (decision for the maintainer)** below.

## T018 — Rules frozen

- Branch `017-semantic-grounding-precision` at base `065711d` + working tree; `git diff --stat` of the checker files:
  3 files, 169 insertions, 32 deletions (grounding.ts 158 lines, semantics.ts 38, main.ts 5); sha256:
  - src/analysis/grounding.ts `22b92e0083ea06d72c1c8c983661ac8637729f3abcafbbe956c0a36a23ef8b5a`
  - src/analysis/semantics.ts `a159800465eccc964569d70845d66e47ad30b093c0b82da6ed4699b69647568f`
- No checker edit after this point until T026.

### Fixture D — first and only run (held out; `BTA_SCORE_D=1 node --test test/precision.test.ts`)

| Variant | Agreement | Flagged mismatches: true / false | Real errors caught |
|---|---|---|---|
| plain | **29 / 32** | 5 / 0 (precision 5 / 5) | 5 / 6 |
| cite | 29 / 32 | 5 / 0 | 5 / 6 |

- Citations: all five citation cases right (right, wrong, id-only, bracketed id, after the sentence end); the refs
  duplicate counted once; the combined reference never evidence. `cite` = `plain` on D as well.
- Failing cases (findings, not fixed):
  - D08 "평가 손실은 22,812,500원입니다" — real error missed: "평가 손실" is not a cue (only 평가 손익). → F017-R2
  - D23 "뉴스에 따르면 회사 전망이 긍정적입니다" — supported by the content key although the guidance news is negative;
    content matching does not read direction or sentiment. → F017-R3
  - D26 "PER 24.3배는 높은 편입니다" — no claim: the sentence trigger list lacks PER / "높은 편", so the judgement rule
    is never reached. → F017-R4

## T019–T021 — Blind audit tooling

- `scripts/audit-sheet.ts`: per successful run the facts, the answer as shown (refs re-rendered from `raw`), and items
  for every number/date and every sentence with an interpretation word — no status, evidence, reason or citation.
- `scripts/precision.ts`: refuses an unjudged sheet; per variant and mode: flagged, true / false / debatable
  mismatches, real errors and missed, precision (debatable = not real), recall, interpretation agreement, threshold.
- `test/precision.test.ts` checks both on a synthetic report (no checker output in the sheet; refusal; one real error
  flagged → precision 1, recall 1, threshold met).

## T022 — Held-out native capture (maintainer, 2026-09-30)

- Command: `BTA_MEASURE=1 BTA_MEASURE_MODES=refs,current BTA_MEASURE_REPS=2 npm run test:prompt-api -- -g measurement`;
  order refs, current, current, refs; 1 passed in 2.0 h.
- Model: Gemini Nano (Chrome Prompt API); browser Chrome/154.0.0.0; evidence class REAL_BROWSER_PROMPT_API.
- Commit: HEAD 065711d plus the uncommitted Feature 017 working tree; checker hashes equal the T018 freeze
  (grounding.ts `22b92e0083ea06d72c1c8c983661ac8637729f3abcafbbe956c0a36a23ef8b5a`, semantics.ts `a159800465eccc964569d70845d66e47ad30b093c0b82da6ed4699b69647568f`) — no checker change between freeze and capture.
- Runs: refs 66/66, current 66/66 completed, 0 failed; refs runs all carry `raw` (citations re-scorable).
- Reports: evidence/heldout-refs.json (`427edaf200f6b410a66946d2fdf50f857a323063dc3c7a1f87dc8531486e4a15`), evidence/heldout-current.json (`92a4c1949efcfc9801cbaef50b28e1436f2454c8eed0a84fb03efca8939b7810`),
  evidence/heldout-compare.json (`e4af2eebeaf547228e8a8b122924d3325c94666e53e37c206df69f52424fd133`).

## T023 — Audit sheets

- `node scripts/audit-sheet.ts` → evidence/heldout-audit-refs.json (387 items: 361 number, 26 interpretation),
  evidence/heldout-audit-current.json (222 items: 210 number, 12 interpretation); 0 failed runs.
- Unjudged sheet hashes: refs `2df623d616ff5ef516f6f8aa5b337f13a69fcb0194f4fdd9c2944b2d648cdec0`, current `1feb6d5fb001449b0be6b5756ed99dc211506a39987cf558c950e858dbcf7f92`.

## T024 — Blind audit (judged before the checker was run on these answers)

- Judged by Claude (maintainer's request, 2026-09-30) from the sheet's facts and answer only; the checker's claims on
  these answers were not computed or viewed before the hashes below were recorded. Numbers not listed with a note are
  `correct`; every real error, debatable number and interpretation carries a note.
- Rules used: a value with a wrong fact behind it or a wrong meaning (e.g. the unrealised change called the recent
  move, P/E called price vs par) is a real error; a right value under a garbled or loose label (실현 for unrealised,
  평일 for the 20-day average, a stray duplicate such as "이동평균선 50 69,800") is debatable; an interpretation is
  `supported` when it restates the news or facts correctly, `unsupported` when it forecasts or judges beyond the facts
  or denies a fact that is given (e.g. "the trial date is not provided"), `none` when it states no claim.
- refs (387): correct 328, real-error 9, debatable 24; interpretations supported 18, unsupported 4, none 4.
- current (222): correct 193, real-error 14, debatable 3; interpretations supported 1, unsupported 9, none 2.
- Notable: current mode wrote the Bitcoin prices 10x (9억 5천만 원 for 95,000,000 KRW) in 5 answers.
- Judged sheets: evidence/heldout-audit-refs.judged.json `7fa381ed32394b02e0927de829c5586e41d678b980a6187938e346a7c5553696`,
  evidence/heldout-audit-current.judged.json `9dbbe03687cbed1ace3b49b8519cc5981f0b042d65651c9926538fb31f66feb3`.

## T025 — Precision on the held-out capture (`node scripts/precision.ts`, run after the T024 hashes)

evidence/heldout-precision.json. `plain` and `cite` give identical counts on both modes.

| Mode | Flagged mismatches | True / false / debatable | Precision | Real errors | Missed | Recall | Interpretation agreement | Threshold |
|---|---|---|---|---|---|---|---|---|
| refs | 1 | 0 / 1 / 0 | 0 % | 9 | 8 | 11 % | 19 / 26 | not met |
| current | 4 | 1 / 2 / 1 | 25 % | 14 | 0 | 100 % | 2 / 12 | not met |

**Threshold (FR-012, SC-002): not met** on either mode — precision below 80 % and, in refs, 8 real errors missed.
Flagged mismatches are few (5 in 132 answers; Feature 016 flagged 23 distinct in 99), so the precision figures rest on
5 flags and are not stable; the missed real errors are the stronger result.

False mismatches (checker said mismatch, audit said correct):
- refs 38:6 "30일 최고가인 9,840만 원 98,400,000 KRW에 비해 현재 가격은 더 낮습니다" — the comparison "에 비해" follows
  the written copy, not the value, so the 30-day-high label went to the latest-price cue.
- current 24:0 "최신 주가는 65,320 KRW로 52주 최저가 근처에 있습니다" — "52주 최저가" after "로" read as the label of
  65,320 ("near" is a comparison the rules do not know).
- current 57:1 "구입 가격이 71,000원이었으므로 현재 주가는 …" — the next sentence part's "현재 주가" owned 71,000.

Real errors missed (refs; each value exists in the facts, the meaning is wrong):
- 0:3 "50일 이동평균 50" — the 50 of "50-day" given as the average's value.
- 3:0, 3:1 "최근 주가 상승률은 +23.00%" — the unrealised change called the recent rise (27.4 %).
- 11:0, 11:1 "주당 액면가 대비 24.3배" — the P/E called price vs par value.
- 20:5 "5개년 최저가인 6만 1,500원 보다 낮고" — the 52-week low called five-year, and the price is above it.
- 56:2, 56:3 "최근 주가 변동은 -6.27%" — the unrealised change called the recent move (6.5 %).
The one caught (20:3 "20일 동안 20 % 하락") was unsupported, not a mismatch. All 14 current-mode real errors (10x
Bitcoin prices, position value as price) are wrong values and were caught as unsupported.

Interpretation disagreements (checker vs audit), refs 7, current 10:
- Denying a given fact ("임상 결과 발표 시기는 … 명시되어 있지 않습니다", "자사주 매입 규모 … 찾을 수 없습니다"):
  audit unsupported, checker supported (insufficient-evidence sentences pass) — current 25:0, 25:1, 26:1, 58:3, 59:3.
- Claims beyond the news without a long-term or valuation trigger ("delayed Phase 2 trial", "지속적인 수익성이 없으며",
  "기업의 자신감", "bullish outlook", "긍정적인 신호로 간주되고 있다는 분석", "임상 시험 지연"): audit unsupported,
  checker supported — refs 10:3, 13:7, 35:9; current 26:2, 58:4, 61:3.
- "높은 기업 가치 24.3" (refs 43:3): audit unsupported (a valuation judgement), checker supported (news restated).
- Wording without a claim, checker stricter: refs 12:10, 44:2; current 10:4 (audit supported/none, checker unsupported).
- Insufficient-evidence and no-claim sentences: refs 59:5, current 6:4 (audit none, checker supported) — a label
  difference, not a disagreement on the answer.

### Same held-out answers with the Feature 016 checker (base 065711d, temporary worktree; for FR-017 (2))

| Mode | Checker | Flagged | True / false / debatable | Precision | Real errors caught (mismatch or unsupported) |
|---|---|---|---|---|---|
| refs | 016 | 9 | 2 / 6 / 1 | 22 % | 3 / 9 |
| refs | 017 | 1 | 0 / 1 / 0 | 0 % | 1 / 9 |
| current | 016 | 7 | 1 / 5 / 1 | 14 % | 14 / 14 |
| current | 017 | 4 | 1 / 2 / 1 | 25 % | 14 / 14 |

- False mismatches 11 → 3. Removed by 017: comparison after the value (refs 17:2, 17:3 "구매 평균 가격보다 6.27%
  낮습니다"), the duplicate written copy (refs 34:3, 38:5), the label after the value (refs 44:0 "24.3배의 주가수익률";
  current 19:4 "12.50%의 수익", 37:1 "4.1% 하락과"), cue ownership across clauses (current 11:0).
- True mismatches 3 → 1: refs 11:0, 11:1 ("주당 액면가 대비 24.3배") were flagged by 016 only by accident (its nearest
  cue "주가" gave metric price); 017 reads "24.3배" as a multiple, which the P/E is, and does not read the wrong basis.

## T026 — Findings

- **F017-R1 (decision for the maintainer)**: interpretation claims judged unsupported count in `unsupported` (as in
  Feature 016, research R9); with 017's rules that turns 25 re-scored 013 answers unclean and moves formatted from
  USABLE to LIMITED (T017). On the held-out audit the checker agrees with the auditor on 21 of 38 interpretation
  items, and most disagreements are the checker passing claims the auditor judged unsupported (F017-R8, R9) — the
  interpretation rule is stricter than 016 but still lenient.
- **F017-R2**: "평가 손실" is not a cue (fixture D08, real error missed).
- **F017-R3**: news matching reads content, not direction or sentiment (fixture D23).
- **F017-R4**: PER / "높은 편" does not trigger the interpretation rule (fixture D26; the same sentence type in the
  held-out refs 11 and current 11, 44 produced no interpretation item).
- **F017-R5 (HIGH)**: in refs mode, 8 of 9 real errors were missed. Each uses a value that exists in the facts under
  a wrong meaning the cue lexicon does not know: the unrealised change called "최근 주가 상승률 / 최근 주가 변동"
  (refs 3, 56), the P/E called "주당 액면가 대비" (11), the 52-week low called "5개년 최저가" plus a false "낮다"
  (20:5), the "50" of "50일" given as the moving average's value (0:3). A rendered or cited value always exists in the
  facts, so in refs mode meaning is the only line of defence, and a fixed lexicon did not generalise to the model's
  paraphrases — F016-R1's generalisation gap, now on recall.
- **F017-R6**: a label after the value ("24.3배") settles the metric and hides a wrong basis in the same phrase
  ("액면가 대비"); 016 caught refs 11:0/11:1 only by accident.
- **F017-R7**: three false mismatches remain: a comparison marker after the written copy rather than the value
  (refs 38:6 "9,840만 원 98,400,000 KRW에 비해"), "근처" as an unrecognised comparison (current 24:0), and a cue
  owned across a clause boundary (current 57:1 "구입 가격이 71,000원이었으므로 현재 주가는 …").
- **F017-R8**: denying a given fact passes as an insufficient-evidence sentence (current 25:0, 25:1, 26:1, 58:3,
  59:3: "임상 결과 발표 시기는 명시되어 있지 않습니다" while N1 gives November 2026).
- **F017-R9**: claims beyond the facts without a valuation or long-term trigger pass as a news restatement ("the
  delayed Phase 2 trial", "지속적인 수익성이 없으며", "기업의 자신감", "a bullish outlook", "임상 시험 지연"; refs 10:3,
  13:7, 35:9; current 26:2, 58:4, 61:3).
- **F017-R10 (model behaviour)**: current mode wrote Bitcoin amounts in 억 units at 10x (9억 5천만 원 for 95,000,000 KRW)
  in 6 answers; refs mode, where the values are rendered, had none. Caught as unsupported.

Finding detail (constitution XII) for F017-R5, the one that decides the Feature:

```text
Finding ID: F017-R5
Feature: 017 Semantic Grounding Precision
Workload: held-out native capture, refs mode, 66 answers (evidence/heldout-refs.json)
Observed: 8 of 9 hand-judged real errors not flagged (neither mismatch nor unsupported)
Expected: every hand-identified real error caught (FR-012)
Reproduction: node scripts/precision.ts evidence/heldout-refs.json evidence/heldout-audit-refs.judged.json
Evidence: evidence/heldout-precision.json; T025 list of missed items
AkariSP contract involved: none
Application workaround possible?: yes — checker rules or a different claim reading; not attempted (rules frozen)
Core change required?: NO
Confidence: medium — one auditor (Claude); 4 of the 8 misses (refs 3:0, 3:1, 56:2, 56:3) could be judged debatable,
  which still leaves 4 missed
```

## T026 — Research answers (FR-017)

1. **Citations**: `plain` and `cite` give identical counts on the held-out capture (both modes) and on fixture D;
   on the development set every written citation resolved (42 / 42). Citations neither raised precision nor hid a
   real error here: the missed errors are missed with and without narrowing, rendered and written copies alike; the
   cause is the meaning rules (F017-R5), not the citation.
2. **Structural rules**: against the 016 checker on the same held-out answers, false mismatches fell 11 → 3
   (comparison-after, duplicate copies, label-after, clause ownership; table above). The cost: two accidental true
   flags lost (F017-R6), refs recall 3 / 9 → 1 / 9.
3. **What remains**: meaning paraphrases outside the lexicon (F017-R5, R2), a label hiding a wrong basis (R6),
   comparisons and clause boundaries (R7), denial of given facts (R8), claims beyond the facts without trigger words
   (R9), sentiment (R3), missing triggers (R4). R5, R8 and R9 are open-vocabulary problems; more lexicon would repeat
   F016-R1 / F017-R5 on the next held-out set.
4. **Threshold**: **not met** (T025). Mismatches stay outside the verdict (F016-R3 unchanged): they flag few false
   alarms now but miss most meaning errors in refs mode, so they are not a reliable verdict input. The 013 verdicts
   change only through F017-R1 (interpretations in `unsupported`); on the held-out capture (with F017-R1 applied) refs is USABLE and current
   LIMITED. Keeping the 017 rules (fewer false alarms, lower refs recall) or reverting them, and F017-R1,
   are the maintainer's decisions.

## T029 — Final regression and SC-007

- `npm run typecheck` 0; `npm test` 236 tests, 234 pass, 0 fail, 2 skipped; `npm run test:browser` 94 passed, 3 skipped.
- SC-007: `git diff main -- src/graph src/analysis/references.ts` is empty (no prompt, role or render change); `src`
  changes are grounding.ts, semantics.ts, main.ts (citations passed to the checker) and report.ts (`raw`); no data
  source, model or AkariSP change.

## Maintainer decisions (2026-09-30)

- **Keep the 017 rules** (recommended option): mismatches are outside the verdict (F016-R3), the rules cut false
  mismatches 11 → 3 on the held-out capture, and the two true flags lost (F017-R6) were accidental hits of the 016 rule.
- **F017-R1 → interpretations reported separately** (recommended option): the interpretation rule agrees with the
  blind audit on 21 of 38 held-out items, too weak for a verdict input — the same reasoning as F016-R3 for mismatches.
  `ground()` counts (`unsupported`, `supported`, …) now cover numeric claims only; unsupported interpretation claims
  are `counts.interpretationUnsupported`, recorded per run as `interpretation` and aggregated as
  `interpretationUnsupportedPerAnswer`. The checker's rules are unchanged (the classification of each claim is the same;
  only the counting moved). grounding.ts sha256 after the change: `896f5f7e2e1b5da835bef0ec70b05a2dde1c24b39b9accc02c6d8cf6558f60d9`.
  Re-score with the split (evidence/rescore-013-native-*.json regenerated, evidence/heldout-rescore-*.json new):

| Report | unsupported / answer | zero-unsupported | trap handled | interpretation unsupported / answer | verdict |
|---|---|---|---|---|---|
| 013 current | 0.283 (016: 0.283) | 0.859 | 0.889 | 0.091 | LIMITED (unchanged) |
| 013 formatted | 0.111 (016: 0.111) | 0.909 | 1 | 0.111 | USABLE (unchanged) |
| 013 refs | 0.051 (016: 0.051) | 0.970 | 0.944 | 0.051 | USABLE (unchanged) |
| held-out refs | 0.061 → 0.030 | 0.939 → 0.970 | 1 | 0.030 | USABLE |
| held-out current | 0.273 → 0.242 | 0.864 → 0.879 | 0.917 | 0.030 | LIMITED |

  The 013 numeric counts equal Feature 016's: 017's rules changed the verdict input only through interpretations,
  which are now outside it. The T017 table above is the record before this decision.
- Regression after the F017-R1 change: `npm run typecheck` 0; `npm test` 237 tests, 235 pass, 0 fail, 2 skipped (new:
  test/analysis.test.ts "Feature 017 F017-R1"); `npm run test:browser` 94 passed, 3 skipped.
