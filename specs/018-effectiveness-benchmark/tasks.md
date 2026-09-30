---
description: "Task list for Feature 018 — Effectiveness Benchmark (single-role baseline)"
---

# Tasks: Feature 018 — Effectiveness Benchmark (single-role baseline)

**Input**: Design documents from `specs/018-effectiveness-benchmark/`

**Prerequisites**: plan.md, spec.md (with pre-registration), research.md (R1–R7), data-model.md,
contracts/structure-benchmark.md, quickstart.md

**Tests**: included. The single-role path, the report fields, the blind sheet, the reliability agreement and the
decision rule are proven on stand-in and synthetic data before the native capture.

**Research discipline (Principle XV)**:
- The pre-registration, frozen checker hashes and seeds are recorded (T010) before the first native answer.
- The judged sheet is hashed (T015) before the key or the checker results are joined.
- No checker, prompt, metric or rule change after T010.

## Phase 1: Setup

- [X] T001 Record the baseline in specs/018-effectiveness-benchmark/verification.md: `main` `4b027df`; the checker hashes (grounding.ts `896f5f7e2e1b5da835bef0ec70b05a2dde1c24b39b9accc02c6d8cf6558f60d9`, semantics.ts `a159800465eccc964569d70845d66e47ad30b093c0b82da6ed4699b69647568f`); `npm test` result; the spec's Baseline table

---

## Phase 2: Foundational

- [X] T002 Add `structure?: 'eight-role' | 'single-role'` and `calls?: number` to `MeasureRun` in src/analysis/report.ts (absent `structure` = eight-role in older reports)

**Checkpoint**: shared record shape ready.

---

## Phase 3: User Story 1 - Compare role separation against one role on the same facts (Priority: P1) 🎯 MVP

**Goal**: a measurement run can answer with the single role (all facts, one call), recorded as such; the default run is unchanged.

**Independent Test**: stand-in run with `?roles=single` → one node, one model call, `structure: 'single-role'`, grounded answer; without `roles` the eight-role prompts are byte-identical to `main`.

- [X] T003 [US1] Unit tests in test/structures.test.ts: the single-role prompt (research R2) reads `subject`, `answerFacts`, `question` in refs mode and `subject`, `holdingFacts`, `marketFacts`, `newsFacts`, `question` in current mode, ends with the Korean answer policy (and the refs instruction in refs mode) verbatim, and never mentions the risk review; the eight-role prompts for a fixed input (both modes) equal a snapshot generated from `git show 4b027df:src/graph/trading-graph.ts` and committed as test/fixtures/prompts-4b027df.json before T004 edits the file
- [X] T004 [US1] Implement `SINGLE_ROLE` and `buildSingleRoleGraph(model, onNode)` in src/graph/trading-graph.ts: one node `finalDecisionMaker` (START → finalDecisionMaker → END) writing `finalDecision`, task line "Give the final decision from these facts.", same return shape `{ graph, modelRequests }`; documented as adaptation A-018-1 (measurement baseline, not TradingAgents semantics)
- [X] T005 [US1] In src/main.ts read `?roles=single` with the other run parameters; `runGraph` uses `buildSingleRoleGraph` when set; the record gets `structure` and, for the single role, `graph: { version: 'single-role-baseline@1', topology: 'START→finalDecisionMaker→END' }`; the other seven nodes stay `waiting`; grounding and the refs rendering run as before on `finalDecision`
- [X] T006 [US1] In e2e/measure.ts record `structure` (from the record) and `calls` (`counts.logicalRequests`) on every answer; the report header takes `structure` from its runs
- [X] T007 [US1] Stand-in browser test in e2e/analysis.spec.ts: `?roles=single&provider=standin` gives one executed node, `counts.logicalRequests` 1, `structure: 'single-role'`, grounding present; the other seven nodes are `waiting` with 0 executions (the office view derives from this, spec edge case); a default run still executes 8 nodes

**Checkpoint**: both structures run and are recorded; normal use unchanged.

---

## Phase 4: User Story 2 - A result that holds only if it was fixed in advance (Priority: P1)

**Goal**: the capture loop and the decision rule exist and are frozen before any native answer.

**Independent Test**: the decision-rule tests pass on synthetic repetitions; verification.md holds the pre-registration, the hashes and the seeds before the capture's date.

- [X] T008 [P] [US2] Unit tests in test/structures.test.ts for the decision rule (research R7): ≥ 4 of 5 pairs better **and** pooled difference > the largest same-structure repetition difference → better; otherwise "no difference"; ties are not better; primary verdict "not established" when the reliability bar is not met; H1 "holds" only if eight-role is better on the primary metric in both modes
- [X] T009 [US2] Implement scripts/compare-structures.ts (`<judged-sheet> <key> <agreement.json> <out.json>`, contracts/structure-benchmark.md): refuse unjudged items; per repetition, structure and mode compute real errors per answer (number `real-error` + interpretation `unsupported`), the frozen checker's clean-answer rate and unsupported numeric claims per answer (as recorded in the capture reports; the page ran the frozen checker), trap handling, and the context metrics (median time, calls, Korean rate, format violations, mismatches, unsupported interpretation claims); apply the rule; write the comparison report of data-model.md
- [X] T010 [US2] Extend the measurement loop in e2e/prompt-api.spec.ts: `BTA_MEASURE_STRUCTURES=eight,single` × `BTA_MEASURE_MODES` × `BTA_MEASURE_REPS`, cells in the base order (eight, refs), (single, refs), (eight, current), (single, current) rotated by the repetition index (research R4); page URL adds `&roles=single` for the single role; write `measurement-native-<structure>-<mode>-rep<n>.json` at once, pooled `measurement-native-<structure>-<mode>.json` and `measurement-native-structures-compare.json`; without `BTA_MEASURE_STRUCTURES` the Feature 013/017 loop is unchanged
- [X] T011 [US2] **Freeze**: record in specs/018-effectiveness-benchmark/verification.md the git revision, the sha256 of src/analysis/grounding.ts, src/analysis/semantics.ts and src/graph/trading-graph.ts, the pre-registration section copied verbatim from spec.md, and the shuffle and sample seeds; no checker, prompt, metric or rule edit after this task
- [X] T012 [US2] **Maintainer**: native capture in installed Chrome — `BTA_MEASURE=1 BTA_MEASURE_STRUCTURES=eight,single BTA_MEASURE_MODES=refs,current BTA_MEASURE_REPS=5 npm run test:prompt-api -- -g measurement` (≈ 5.5–6 h); copy the 20 per-repetition reports, 4 pooled reports and the comparison to specs/018-effectiveness-benchmark/evidence/; record model, browser, dates and hashes; verify `calls` is 1 or 8 on every successful answer; failed runs stay counted

**Checkpoint**: 660 answers captured under a frozen, pre-registered setup.

---

## Phase 5: User Story 3 - Real errors counted by a blind hand audit (Priority: P2)

**Goal**: every item judged without knowing the structure; the judgement checked by the maintainer on a sample.

**Independent Test**: on a synthetic two-report input the sheet has opaque ids, no mode/structure/question/holding/checker fields, a seed-stable order, and a key covering exactly the sheet's entries; the agreement script reproduces a hand-computed agreement.

- [X] T013 [P] [US3] Unit tests in test/structures.test.ts: blind multi-report sheet (same seed → same order, different seed → different order; no forbidden fields; key ↔ sheet one-to-one) and the reliability agreement (real error = number `real-error` or interpretation `unsupported`; bar 0.95 / 0.70)
- [X] T014 [US3] Extend scripts/audit-sheet.ts with `--seed <n> <sheet> <key> <report>...` (research R5): entries per successful answer, seeded shuffle, ids `e001…`, items as in Feature 017, key written apart; the single-report form unchanged. Implement scripts/reliability-sample.ts `sample` and `agree` (research R6)
- [X] T015 [US3] Generate evidence/structures-sheet.json and evidence/structures-key.json from the T012 reports (seed from T011); record the unjudged sheet hash; judge every item blind (Feature 017 rules, notes on every real error, debatable item and interpretation) without opening the key or running the checker on these answers; record the judged sheet's sha256 in verification.md
- [X] T016 [US3] `reliability-sample.ts sample` (seed from T011) → evidence/reliability-sample.json; **maintainer** judges it blind; `agree` → evidence/reliability-agreement.json; record the agreement against the bar in verification.md

**Checkpoint**: judged sheet hashed; reliability known.

---

## Phase 6: User Story 4 - Cost and behaviour beside grounding (Priority: P3)

**Goal**: the verdicts and the context measures reported together.

**Independent Test**: the comparison report lists every pre-registered metric per mode with the rule verdict and counts, and the context metrics per structure.

- [X] T017 [US4] Run scripts/compare-structures.ts on the judged sheet, key and agreement → evidence/structures-comparison.json; record in verification.md the table per metric and mode (values per repetition, pooled, pairs better, max within-structure spread, verdict), the H1 result, and the context metrics (median time, calls, Korean rate, trap handling, format violations, mismatches, unsupported interpretation claims)
- [X] T018 [US4] Findings (Principle XII) and the research answers of FR-013 in verification.md: (1) does role separation reduce real errors, (2) does it change which kinds of errors occur (examples by structure), (3) cost in time and calls; state "no difference" or "not established" plainly where they apply

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T019 [P] docs/testing.md: Feature 018 section (roles parameter, measurement command, blind multi-report sheet, reliability sample, comparison)
- [X] T020 [P] docs/roadmap.md: 018 row status with the H1 result
- [X] T021 Final regression (`npm run typecheck`, `npm test`, `npm run test:browser`) and SC-005/SC-006 check: `git diff main -- src/analysis/grounding.ts src/analysis/semantics.ts` empty; eight-role prompt snapshot test passes; no AkariSP, model or data-source change

---

## Dependencies & Execution Order

- T003 (snapshot from `4b027df`) before T004.
- T001 → T002 → US1 (T003–T007) → US2 (T008–T012) → US3 (T013–T016) → US4 (T017–T018) → Polish.
- T012 needs the maintainer and ≈ 6 h; T013–T014 (tooling) can be done before or during it.
- T015 must be hashed before T016's `agree` and before T017.
- The checker and prompts are frozen from T011 to the end.

## Parallel Opportunities

- T008 with T009; T013 with T014.
- T013–T014 during the T012 capture.
- T019 with T020.

## Implementation Strategy

1. MVP = US1: the baseline structure runs and is recorded, and the default is unchanged.
2. US2 freezes everything and captures. Nothing after it may change the rules.
3. US3–US4 produce the evidence and the verdict. A "no difference" or "not established" result is a complete
   outcome, not a failure.
