---
description: "Task list for Feature 017 — Semantic Grounding Precision"
---

# Tasks: Feature 017 — Semantic Grounding Precision

**Input**: Design documents from `specs/017-semantic-grounding-precision/`

**Prerequisites**: plan.md, spec.md, research.md (H1–H3, R1–R9), data-model.md, contracts/grounding-precision.md, quickstart.md

**Tests**: included — the rules are proven on frozen deterministic sets; the held-out native capture judges the threshold.

**Research discipline**: the development set and fixture D are written and hashed (T002–T004) before any checker
change and never edited after results; the blind audit sheet is hashed before scoring (T024); a case the rules cannot
express is a finding.

## Phase 1: Setup

- [X] T001 Record the baseline in specs/017-semantic-grounding-precision/verification.md: `main` `065711d`; `npm test` (231 tests, 230 pass, 1 skipped); fixtures A–C 26 / 26; the spec's Baseline table (23 audited mismatches: real 2, debatable 2, false 19; 24 interpretation sentences all supported); hypotheses H1–H3 of research.md copied verbatim

## Phase 2: Foundational — frozen sets (blocks every rule change)

- [X] T002 Write test/fixtures/grounding/precision-dev.json (FR-011a, data-model.md "Frozen case", `set: "dev"`): (a) the 23 distinct Feature 016 mismatches from specs/016-semantic-grounding-contract/evidence/rescore-013-native-*.json `changedRuns[].mismatchClaims` — sentence, holding, the fact set of that holding (`factSet` on `portfolio-fixture@1`), target span, the Feature 016 hand judgement (`real-error` for "52주 최저가가 65,320원" and "평가 손익 … 22,812,500원의 손실"; `debatable` for the two debatable cases of verification.md; else `correct`) and `expect.status` (`semantic-mismatch` for real errors, `supported` for correct; debatable: `expect` omitted, reported only); (b) the 24 interpretation sentences of the same re-score with a judgement written now (`supported` only for a restated news item; valuation and long-term judgements `unsupported`); (c) the 33 raw refs answers from specs/013-numbers-by-reference/evidence/spike-post-processing-rows.json (`raw`) with, per written number followed or preceded in its sentence by a reference, the expected citation fit (`right | wrong | id-only`) **judged now, before any rule change** (the spike file has no per-number fit; its `cited` / `real` fields are context only); each case with a one-line hypothesis
- [X] T003 Write test/fixtures/grounding/precision-d.json (FR-011b, `set: "D"`, held out from tuning) on the fictional fixture holdings (KR:900001, US:ZZAP with its P/E fact, BTC, US:ZZSP) — at least: comparison with no second value ("평단보다 낮은 65,320원" → supported D1), comparison with both values ("평단 71,000원 대비 현재가는 65,320원" → both supported), a comparison where the value side is wrong ("평단보다 낮은 현재가 71,000원" → mismatch), label after value (PER / 주가수익비율 / "recent decline"), subject cues that must stay mismatches (52-week low, position value as loss, unrealised return as a 20-session return), citations — right (`{D1}` after 65,320원), wrong (`{H3}` after the latest price), combined (`{D1, D3}`), id-only (`{M1}` for M1a/M1b), contradicting (right citation + wrong subject cue → mismatch), refs duplicate (written number + rendered reference of equal value → one claim); valuation judgement with and without the P/E fact (both unsupported; 24.3 supported); long-term outlook with a news fact present (unsupported); short-term 반등 without a long-term word (not an outlook claim); news restatement with a content key (supported) and a generic "뉴스에 따르면 긍정적" (unsupported); insufficient-evidence sentence (supported); each case with expectation and hypothesis
- [X] T004 Record sha256 of precision-dev.json and precision-d.json in verification.md; run the Feature 016 checker on the development set (via T005's runner with the current code) and paste the baseline table (fixture D is not run before T018, per the held-out rule)

**Checkpoint**: both sets frozen and hashed; baseline agreement recorded. No checker edit before this point.

## Phase 3: User Story 1 — A mismatch flag is usually a real error (P1) 🎯 MVP

**Goal**: comparisons and labels after values stop producing false mismatches; subject cues keep the real errors.

**Independent Test**: development numeric cases (variant `plain`) equal their expectations; fixtures A–C 26 / 26. Fixture D is not consulted until T018.

- [X] T005 [US1] test/precision.test.ts (new): load both sets; run each case through `claims()` (options `{ variant }`, rendered citations from `render(raw, refTable(facts))` when `raw` exists); print per set and variant a table (case → expected → actual → reason) and counts (true / false / debatable mismatches, real errors missed, interpretation agree / total); **development cases are asserted; fixture D cases are only scored and reported** (held out: never used to change a rule; D failures become findings at T018)
- [X] T006 [US1] src/analysis/semantics.ts: comparison markers (`보다`, `대비`, `에 비해`, `than`, `vs`, `versus`, `compared with`, `compared to`) → reference phrases (research R1); label-after-value cues (`주가수익비율`, `PER`, `P/E`, `배` after a number → `valuation_multiple`; English `decline | downturn | drop | gain` after a percentage → direction only) with the joiners of R2 (`의`, `인`, `짜리`, `of`, `in`, space, none)
- [X] T007 [US1] src/analysis/grounding.ts `semantic()`: anchor order of contracts/grounding-precision.md (horizon mention → label after value → reference-phrase restriction → nearest cue; direction excludes cues inside another value's reference phrase); `Claim.side = 'reference'` for values inside a reference phrase; fixtures A–C stay 26 / 26 (test/semantic.test.ts)
- [X] T008 [US1] Record the US1 results in verification.md: development false mismatches before → after (SC-001 target ≤ 5, both real errors flagged), every changed Feature 016 expectation with its reason (SC-006)

**Checkpoint**: SC-001 and SC-003 on the development set.

## Phase 4: User Story 2 — The model's own citations are used, and tested, as evidence (P1)

**Goal**: citations recorded with their fit; variant `cite` measured against `plain` and adopted only per FR-006.

**Independent Test**: citation cases of the development set under both variants; the comparison table.

- [X] T009 [US2] src/analysis/grounding.ts: `claims(text, facts, known, options?)` with `options.citations` (rendered spans `{ factId, start, end }`) and `options.variant: 'plain' | 'cite'`; written fact ids (`M1`, `(D2)`, `[H3]`, not inside a rendered span) as `source: 'written'` citations; per numeric claim `citation?: { factId, source: 'rendered' | 'written', fit: 'right' | 'wrong' | 'id-only' }` (data-model.md); a rendered span cites itself and one written number of equal value earlier in the same sentence (refs duplicate → one counted claim); `wrong` adds a reason and never changes the status by itself; combined / unknown references never evidence; `cite` narrows hits to the cited fact before the cue check (the cue check still decides, US2-3)
- [X] T010 [US2] src/analysis/grounding.ts `ground()`: pass the run's rendered reference spans (`numbers.refs`) as `options.citations`; its one caller src/main.ts (line ≈ 190, `ground(outputs, answer, given, known)`) passes the refs of the rendered answer
- [X] T011 [US2] Run T005 for both variants; record in verification.md the with/without table (true / false mismatches, missed real errors, wrong-citation count) on the **development set only** and the adoption decision per FR-006 (research R4); set the default variant accordingly in src/analysis/grounding.ts (SC-005); fixture D's with/without counts are added at T018 as a report, not a decision input

**Checkpoint**: SC-005 reported; default variant fixed.

## Phase 5: User Story 3 — An interpretation passes only on evidence about it (P1)

**Goal**: valuation and long-term judgements need `valuation_benchmark` / `fundamentals`; news restatements need content.

**Independent Test**: the 24 development interpretation sentences equal their expectations.

- [X] T012 [P] [US3] src/analysis/semantics.ts: valuation judgement lexicon, long-term outlook lexicon (`회복` / `반등` only with a long-term word), news words (`뉴스`, `news`, `소식`, `보도`) and per-news-line content keys for the six `portfolio-fixture@1` news lines (withdrawal halt ↔ 출금 중단; gold purchases ↔ 금 매입; operating profit guidance ↔ 영업이익 / 가이던스 / 전망; phase 2 trial ↔ 임상; mixed guidance ↔ 가이던스; share buyback ↔ 자사주 매입), per research R5
- [X] T013 [US3] src/analysis/grounding.ts `interpretations()`: valuation judgement → needs `valuation_benchmark` (none → UNSUPPORTED, reason "a multiple alone has no benchmark" when a `valuation_multiple` fact exists, else "no valuation evidence"); outlook → needs `fundamentals` (none → UNSUPPORTED, reason "no long-term fundamental evidence; news and price facts are not"); news restatement → SUPPORTED by a news fact sharing a number, date or content key, else UNSUPPORTED "news content not matched"; insufficient-evidence unchanged; fixture A interpretation cases unchanged
- [X] T014 [US3] Record in verification.md the interpretation results (SC-004): the 24 development sentences before → after with the hand judgement

**Checkpoint**: SC-004 on the development set.

## Phase 6: Freeze and regression before the held-out capture

- [X] T015 [P] e2e/measure.ts, src/analysis/report.ts: `MeasureRun.raw?: string` — the final role's output before rendering, recorded for refs runs (data-model.md); scripts/rescore-measurement.ts re-renders `raw` with the run holding's reference table when present and passes the citations
- [X] T016 Regression: `npm run typecheck`, `npm test`, `npm run test:browser`; results in verification.md; any changed existing expectation listed with its reason (SC-006)
- [X] T017 Re-score the recorded Feature 013 native reports with the frozen rules: `node scripts/rescore-measurement.ts specs/013-numbers-by-reference/evidence/measurement-native-{current,formatted,refs}.json specs/017-semantic-grounding-precision/evidence/rescore-013-native-{mode}.json`; record mismatches per answer and interpretation outcomes before (Feature 016) → after (FR-016)
- [X] T018 **Rules frozen**: record in verification.md the git state (branch HEAD, `git diff --stat` of the checker files, sha256 of src/analysis/grounding.ts and src/analysis/semantics.ts); then score fixture D once with both variants (first use of D) and record agreement, the with/without counts and every failing case as a finding (not fixed); no checker edit after this task until T026

## Phase 7: User Story 4 — The maintainer can decide on the verdict with evidence (P2)

**Goal**: held-out precision and recall on a blind audit, against the pre-registered threshold.

**Independent Test**: the precision report from the blind sheet and the frozen checker.

- [X] T019 [P] [US4] scripts/audit-sheet.ts (new): `node scripts/audit-sheet.ts <report.json> <sheet.json>` — per successful run, the facts shown to the model and items `{ id, type: 'number' | 'interpretation', text, sentence }` for every numeric claim span (from `extract()`) and every sentence with an interpretation-lexicon word; **no status, evidence, reason or citation** (data-model.md "Audit sheet"); failed runs listed with their error
- [X] T020 [P] [US4] scripts/precision.ts (new): `node scripts/precision.ts <report.json> <sheet.json> [out.json]` — refuses to run if any item lacks `judgement`; runs the frozen checker (both variants) and computes per mode, variant and total: `flagged`, `trueMismatch`, `falseMismatch`, `debatable`, `precision` (debatable counted as false), `realErrors`, `missed`, `recall`, interpretation agree / total, `failedRuns`, `threshold: met | not met` (precision ≥ 0.8, missed = 0; fixtures A–C 26 / 26 checked by `npm test`)
- [X] T021 [US4] test/precision.test.ts: a small synthetic report + sheet → the precision script's numbers (and its refusal on an unjudged item)
- [X] T022 [US4] **Maintainer**: run the held-out capture in installed Chrome with the Prompt API — `BTA_MEASURE=1 BTA_MEASURE_MODES=refs,current BTA_MEASURE_REPS=2 npm run test:prompt-api -- -g measurement` (≈ 2 h); copy the reports to specs/017-semantic-grounding-precision/evidence/heldout-{refs,current}.json; record the model, browser and commit; a failed or interrupted run may be repeated only with the same frozen commit, and failed runs stay counted as failures
- [X] T023 [US4] `node scripts/audit-sheet.ts` on both reports → evidence/heldout-audit-{refs,current}.json
- [X] T024 [US4] Blind audit: fill every item's `judgement` (numbers: `correct | real-error | debatable`; interpretations: `supported | unsupported` by the shown facts; `note` for every real error and debatable item) without running the checker on these answers; record the filled sheets' sha256 in verification.md
- [X] T025 [US4] `node scripts/precision.ts` on both → evidence/heldout-precision.json; record in verification.md the precision / recall table per mode and variant with counts, the threshold result (FR-012, SC-002), every false mismatch and missed real error with its sentence
- [X] T026 [US4] Findings (constitution XII format) for what the rules cannot read, and the research answers of FR-017 (citations help / hide errors; which rule removed which false positives; what remains; threshold met and what the verdict change would mean for the 013 verdicts) in verification.md; state that the verdict change is the maintainer's decision

**Checkpoint**: SC-002 answered; decision material ready.

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T027 [P] docs/testing.md: Feature 017 section (frozen sets, variants, audit-sheet and precision scripts, held-out capture command)
- [X] T028 [P] docs/roadmap.md: 017 row status with the held-out result
- [X] T029 Final regression (`npm run typecheck`, `npm test`, `npm run test:browser`) and SC-007 check (no data source, graph role, model, prompt or AkariSP change; shown answer text unchanged: `git diff main -- src/graph src/analysis/references.ts` shows no prompt or render change)

## Dependencies & Execution Order

- Phase 1 → Phase 2 (frozen sets) → US1 → US2 (needs US1's anchor order) → US3 (independent of US1/US2 code paths, but after Phase 2) → Phase 6 (freeze) → US4 → Polish.
- US3 may run in parallel with US1/US2 after Phase 2 (different functions), but both touch src/analysis/grounding.ts: sequence the edits.
- T022 needs the maintainer and ≈ 2 h; T019–T021 can be done before it.
- T024 must finish (hash recorded) before T025 runs.

## Parallel Opportunities

- T012 (lexicons in semantics.ts) alongside T009 (grounding.ts) once T007 is done.
- T015 alongside T013.
- T019, T020 alongside each other; T027, T028 alongside each other.

## Implementation Strategy

- MVP = US1 (comparisons and labels) — alone it answers H1 on the development set.
- Then US2 (citation variant decision), US3 (interpretations), freeze, and the held-out capture (US4) for the threshold.
- Each rule change is checked against fixtures A–C (26 / 26) before the next.
