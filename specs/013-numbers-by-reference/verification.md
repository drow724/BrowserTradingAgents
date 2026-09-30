# Verification: Feature 013 — Numbers by Reference

## T001 — Baseline (2026-09-30)

| Item | Value |
|---|---|
| Base | `main` `afa653e` (merge of PR #14), branch `013-numbers-by-reference` |
| AkariSP | `0.1.0-alpha.2`, public API boundary unchanged and not touched (`createRuntime`, `run`, `snapshot`, `shutdown`, `TaskError`) |
| sha256 `src/main.ts` / `runGraph` | `87a361f9b360018476063f62873ae64672fe44b32422eb0b1ae794822f432639` / `eec660c27b84e85c19c68b059c15ee71f478333b69f2908a6e0c71d626045118` |
| `npm run typecheck` / `npm test` | 0 / 166 tests: 165 pass, 1 skipped |
| `npm run test:browser` | 80 passed, 1 skipped (Feature 012 final run on the same code) |

## US1 — Checker (T002–T009)

- Labelled cases added first (10 claim cases + 6 refusal phrasings); they failed before the changes.
- Changes: Korean refusals in `TRAP_PHRASES` (FR-001); compound Korean amounts (FR-002); Korean/English months
  (FR-003); a claim with a unit is never supported by a unit-less fact (FR-004), except `주` = "week" when equal.
- **Existing labels changed (FR-005)** — each recorded in `claims.json` (`changed`):
  1. "실적은 2026년 11월 발표 예정입니다." — was `2026` + `11` unsupported; now one month claim `2026년 11월`, still
     unsupported (no November fact for that holding).
  2. "주가는 20% 올랐습니다." (KR:900001) — was supported only through the unit-less "20 sessions" (the F010-R1
     defect); now unsupported (the price fell 11.2%).
  3. "9천원" — was unrecognised; now read as 9,000 KRW, unsupported.
- Found during implementation: the first compound rule read two plain numbers separated by a space ("30 30") as one
  amount; fixed (a Korean unit is required) with a labelled case.
- The "52주" case (52-week low) kept its label via the `주` exception.

### T009 — Re-score of the Feature 010 native report (SC-001)

`evidence/rescore-010-native.json` (the recorded report is only read; known tickers = fixture + holding):

| | zero-unsupported | trap handled | verdict |
|---|---|---|---|
| Old rule (recorded) | 0.859 | 0.333 | NOT_YET |
| **New rule** | **0.889** | **0.889** | **LIMITED** |
| Hand classification (Feature 010) | 0.889 | 0.889 | LIMITED |

- **SC-001 PASS**: the corrected rule equals the hand classification (differences 0.000 / 0.000).
- 23 runs changed: 12 trap runs now handled (Korean refusals); 3 false positives gone (two "73만 8천 원", one "2026년
  11월"); unrecognised compound forms now read as values — the BTC 억/만 errors stay unsupported (real errors, as hand-
  classified). No run changed through ticker claims.

## US2 — Number modes (T010–T017)

- `src/analysis/format.ts` (Korean display), `src/analysis/references.ts` (names, annotation, render, violations),
  `toInput(…, mode)` sets `answerFacts`/`numberMode` for formatted/refs; the final role reads `answerFacts`; `refs`
  adds the reference instruction; `src/main.ts` renders and records `analysis.numbers`; answer window marks sources
  and "형식 위반".
- Every number of every fixture fact, formatted by the app, is read back by the checker as supported
  (`test/format.test.ts`).
- Deviation from research R3: numbers from the question are not named `Q1…`; they stay allowed as bare numbers.

### A-013-1 — Adaptation record (Constitution XI)

| Item | current (default) | formatted | refs |
|---|---|---|---|
| Seven non-final roles | Feature 010 prompts | identical | identical |
| Final role reads | `holdingFacts` + question | `answerFacts` = all facts (holding, derived, market, news) with the app's Korean reading after each KRW amount | `answerFacts` = all facts, each number followed by `{name}` |
| Final role instruction | Feature 010 `KOREAN_ANSWER` | same | same + "Never write a number yourself … e.g. {D2} …" |
| Reason | — | Test whether pre-formatted amounts alone remove 억/만 errors | Numbers come from facts by construction |

- Confound (stated in the report): current → formatted changes both which facts the final role sees and their
  format; formatted → refs changes only number handling.
- Demo prompts byte-identical to `e9b2425`; current mode prompts identical to Feature 010 (`test/analysis.test.ts`).

## US3 — Regression (T022, T023)

| Check | Result |
|---|---|
| `npm run typecheck` | 0 |
| `npm test` | 172 tests: 171 pass, 1 skipped |
| `npx next build` | 0 |
| `npm run test:browser` | **83 passed, 1 skipped** (+3: refs, formatted/current, three-mode measurement); SC-008 office overhead +1.20 pp |
| `npm run test:prompt-api` (native gate) | 2 passed, 3 skipped (opt-in) |
| Stand-in comparison | `evidence/measurement-standin-{current,formatted,refs,compare}.json`: each mode 33 runs, 0 failed, stable on a second pass, NOT_APPLICABLE |

- Note: one full `npm test` run showed the grounding speed check at 65 ms (> 50 ms) while all test files ran in
  parallel; alone it takes ~6 ms and three further full runs passed. This is likely also the unexplained single
  failure seen once in Feature 011.

## T024 — Native comparison, attempt 1 (aborted, 2026-09-30 02:23–05:36 KST)

- Two full repetitions of all three modes completed (6 × 33 runs, 0 failed); in repetition 3 (`refs` first) the
  overview question q16 ended after 3 of 6 holdings and the strict holding check stopped the whole test (3.2 h).
  Reports were written only at the end, so the answers of repetitions 1–2 were lost; only the per-repetition
  aggregates printed to the log remain (`evidence/native-attempt-1-aborted.log`). The cause of the early end is
  not recorded (most likely one run reached the 180 s page watchdog → `cancelled`, which stops a sequence).
- Aggregates from the log (rule values; not hand-audited; not used for conclusions):

| mode, repetition | zero-unsupported | trap handled | Korean | format violations |
|---|---|---|---|---|
| current 1 / 2 | 0.879 / 0.879 | 1.000 / 0.833 | 1.000 / 1.000 | – |
| formatted 1 / 2 | 0.848 / 0.939 | 1.000 / 1.000 | 0.909 / 0.970 | – |
| refs 1 / 2 | 0.970 / 1.000 | 0.833 / 0.833 | 0.848 / 1.000 | 0.758 / 0.636 |

- Driver fixed before attempt 2: each mode/repetition report is written at once; native runs are not strict — an
  early-ended sequence is recorded with each run's outcome and error, missing holdings as `not-run`.

## T024 — Native comparison, attempt 2 (2026-09-30 05:38–09:59 KST)

- `BTA_MEASURE=1 BTA_MEASURE_MODES=current,formatted,refs npm run test:prompt-api -- -g measurement`: 1 passed (4.3 h),
  Chrome Prompt API (Gemini Nano), mode order rotated per repetition. 3 modes × 3 repetitions × 33 runs = 297 runs,
  0 failed, 0 `not-run`. Reports copied unedited: `evidence/measurement-native-{current,formatted,refs}{,-rep1,-rep2,-rep3}.json`,
  `evidence/measurement-native-compare.json`.

| mode (99 runs each) | zero-unsupported | unsupported / answer | trap handled (18) | Korean | format violations | median run | rule verdict |
|---|---|---|---|---|---|---|---|
| current | 0.859 | 0.283 | 0.889 | 0.980 | – | 51.9 s | LIMITED |
| formatted | 0.909 | 0.111 | 1.000 | 0.919 | – | 52.0 s | USABLE |
| refs | 0.970 | 0.051 | 0.944 | 0.929 | **0.788** (78 / 99) | 51.8 s | USABLE |

- refs format violations per repetition: 0.818 / 0.697 / 0.848.
- current reproduces the Feature 010 native result under the corrected checker (0.859 / 0.889 vs re-scored 0.889 / 0.889).
- The rule verdicts are the Feature 010 rule applied to these runs; they are not a claim about trading quality
  (Constitution VIII), and refs is scored on the rendered answer (values substituted by code).

## T025 — Hand audit (FR-014; repetition 1: 6 trap + first 14 non-trap answers per mode)

`evidence/hand-audit-{current,formatted,refs}.json`; every row matches the copied repetition-1 report (question,
holding, rule counts).

| mode | zero-unsupported: hand / rule (of 20) | agreement | trap handled: hand / rule (of 6) | agreement |
|---|---|---|---|---|
| current | 18 / 18 | 20 / 20 | 5 / 5 | 6 / 6 |
| formatted | 19 / 17 | 18 / 20 | 6 / 6 | 6 / 6 |
| refs | 19 / 19 | 20 / 20 | 5 / 5 | 6 / 6 |

- formatted disagreements (rule stricter than hand): a correct difference computed by the model ("5,680원"), and
  "11월" without a year (finding candidate: a month without a year is not read as a month).
- Real errors in the audited answers:
  - current: Korean large-unit conversion errors in t03 and q06 (F010-N1 class, e.g. "9억 5천만").
  - formatted: a new mixed form in q06 ("95,000만 원", 10×).
  - refs: one wrong reference in t02 (`{M1b}` = 20 sessions used for the 27.4 % rise). No large-unit error.
- refs violation types seen in the audit: value and reference both written (most common; the values themselves
  correct, e.g. "6만 5,320원 65,320 KRW"), numbers written without a reference, combined references (`{M1a, D2}`).
- **SC-004 PASS**: every mode reports all five measures over 99 runs (≥ 75), with rule/hand agreement on 20 audited
  answers per mode.
- **SC-005 PASS**: 0 Korean large-unit errors among the 20 audited refs answers (current: 2 answers with them).

## T026 — F-A statement (FR-017, research R8)

- **F-A: supported.** With prompt instructions only, the refs format-violation rate is 78.8 % of answers
  (each repetition ≥ 69.7 %), far above the 10 % threshold fixed before measuring. Prompting alone does not hold
  the reference format on Gemini Nano; a per-call `responseConstraint` cannot be passed through AkariSP 0.1.0-alpha.2.
- Limits: one device, one model, one run of three repetitions. Part of the rate may come from this Feature's
  annotation ("91,250,000 KRW {D1b}" puts the value next to its reference), which likely invites the duplicates;
  that is a hypothesis, not tested. A constraint could block bare digits and combined references but not a wrong
  reference, which was the only real error in the audited refs answers.
- Relation to AkariSP Feature 013 (research R9): AkariSP's own regex experiment (synthetic two-value task) did not
  reproduce the failure in its control arm, so it stayed NO_CHANGE. This run is a real consumer workload whose
  control arm does fail. The hand-off for a `refs + constraint` experiment is `scripts/harness-prompts.ts` with the
  opt-in capture test `harness prompt capture (BTA_CAPTURE=1 only)` in `e2e/prompt-api.spec.ts`; the captured
  prompt set is recorded below when it exists.

### Hand-off prompt set (research R9)

- `HARNESS_PORT=5175 BTA_CAPTURE=1 npm run test:prompt-api -- -g "harness prompt capture"`: 1 passed (29.2 min,
  2026-09-30 10:00–10:29 KST, Chrome/154), 33 of 33 runs captured → `evidence/harness-outputs-refs.json`.
- `node scripts/harness-prompts.ts evidence/harness-prompts-refs.json evidence/harness-outputs-refs.json`: 33
  final-role prompts, all filled, with each run's reference table (name, fact id, value as shown).
- This is a separate fourth refs pass, not repetition 1 (the measurement did not keep upstream outputs). Its own
  final answers: 7 / 33 match the strict regex `^([^0-9{}]|\{[A-Z][0-9]+[a-z]?\})*$` (no digit outside a reference),
  i.e. 26 / 33 (78.8 %) would be blocked — in line with the measured rate. The regex is stricter than the app's
  check (the app allows question numbers and counts ≤ 10).

### AkariSP regex experiment on the hand-off set (2026-09-30, AkariSP `4dd2f52`, reported by the AkariSP session)

- Pre-registered arms on the 33 captured prompts: control (prompt only) 25 / 33 answers with violations, 8 / 33
  "unrecoverable" by its rule v1 (4 after its own review: 2 unknown labels, 2 wrong amounts); treatment
  (`responseConstraint` RegExp, no digit outside a reference) 0 / 33 violations, 0 errors; median latency 4.1 s vs
  4.5 s, maximum 5.7 s vs 73.7 s. Pre-registered outcome: condition 5, REQUIRES_REVIEW.
- Post-hoc review (one reviewer, criteria set after the results; not part of the verdict): 9 / 33 treatment answers
  collapsed (repetition loops, "₩ ₩ ₩" or "the information in braces" in place of numbers, a cut-off at "S&P ",
  an invented answer where a date was needed), vs 0 in control; numbers moved to forms the regex does not see
  (Hangul numerals with wrong amounts, circled digits); wrong-amount count unchanged; wrong references remain.
- AkariSP proposal: NO_CHANGE under its condition 6 (cost exceeds value) for this task type; the maintainer
  confirms it (2026-09-30).
- Consequence for F-A: the finding itself stands (prompting alone does not hold the format: 78.8 % here, 25 / 33
  there), but the tested remedy — a digit-ban `responseConstraint` — is not usable for Korean answers that need
  some digits (dates, codes, question numbers). This workload therefore gives **no evidence that AkariSP needs a
  per-task option path**. The regex was proposed from this side and was too blunt; a constraint that allows the
  needed numbers would need its own pre-registered experiment.
- Next step on this side: app-side post-processing of refs answers (collapse a written number next to an equal
  reference; split combined references), measured offline on the captured raw answers.

### Spike — app-side post-processing of refs answers (offline, 33 captured raw answers; throwaway code, not in the product)

- Observation: the model mostly uses `{ref}` as a **citation** — it writes the number (usually copied verbatim) and
  puts the reference after it, often at the end of the sentence ("11.2% 하락했습니다 {M1a}"). The "duplicates" are
  this pattern.
- Variant A (drop a written number next to an equal reference): answers with violations 26 → 21; it breaks
  sentences (values move to the sentence end, a stray "-" remains). Rejected.
- Variant C (a written number whose value equals a reference cited in the same sentence is replaced by that
  reference, so code formats it, and the citation is dropped; combined references split): 48 numbers replaced;
  answers with violations under the current strict rule 26 → 22. Shown text reads naturally, e.g.
  "평균 매입 가격은 {H3} 95,000,000 KRW" → "평균 매입 가격은 9,500만 원".
- If a written number that equals a fact value (checker: supported) counts as a copied number rather than a
  violation, violations fall to **3 / 33** answers, all fact-id citations of facts without a single named number
  (`{N1}` for a news fact with no number, `{M1}` for a fact with M1a/M1b). No written number outside the facts
  remained in these 33 answers; wrong-reference choices (type 4) are not addressed by any variant.
- Remaining strict-rule cases are copied values: window lengths ("20", "30", "50"), a loss written without its sign
  ("8.00% 낮은" for −8.00 %), holding quantities.
- Limits: 33 answers of one capture, offline, rule applied by its author; no native run; no hand audit of meaning
  changes beyond reading the rows (`evidence/spike-post-processing-rows.json`).
- Implication for T028 (not a decision): the 78.8 % format-violation rate mostly measures a strict rule against
  citation-style answers. A refs mode that accepts copied exact values, rewrites cited numbers into code-formatted
  values and treats fact-id citations as citations would keep refs' lower unsupported rate (0.051 vs 0.283 per
  answer) with few flags; it needs its own spec and native measurement.

## T028 — Default decision (FR-015)

- **Decision (maintainer, 2026-09-30): the default stays `current`.** `?numbers=formatted|refs` remain selectable.
- Reason: refs had the lowest unsupported rate but flags most answers under the strict rule; the spike shows the
  flags mostly come from citation-style answers. A citation-style refs mode is a roadmap candidate after Feature 014
  (live quotes), with its own spec and native measurement.
