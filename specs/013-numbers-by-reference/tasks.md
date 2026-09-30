---
description: "Task list for Feature 013 — Numbers by Reference"
---

# Tasks: Feature 013 — Numbers by Reference

**Input**: Design documents from `specs/013-numbers-by-reference/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/references.md, contracts/checker-changes.md, quickstart.md

**Tests**: included — SC-001–SC-006 are verified by labelled cases, unit tests, the stand-in suite and an opt-in native comparison.

**Gates**: the native comparison (T024) needs the maintainer's go-ahead (≈ 4.3 h); every commit needs approval.

## Phase 1: Setup

- [X] T001 Record the baseline in specs/013-numbers-by-reference/verification.md: `main` SHA, AkariSP 0.1.0-alpha.2 and its public API boundary (unchanged, not touched), sha256 of `src/main.ts` and the `runGraph` section, `npm run typecheck`, `npm test`, `npm run test:browser` results

## Phase 2: User Story 1 — Trustworthy checker first (P1) 🎯 MVP

**Goal**: corrected checker; recorded Feature 010 native report re-scored (old / new / hand).

**Independent Test**: `npm test` passes the new labelled cases; the re-score output meets SC-001.

- [X] T002 [US1] Add labelled cases first to test/fixtures/grounding/claims.json from Feature 010 native answers (contracts/checker-changes.md): compound amounts ("73만 8천 원" ✓ vs D3 738,000; "2억 2천 8백만 원" ✗ vs 22,812,500; "9억 5천만 원" ✗ vs 95,000,000; "9,500만 원" ✓; "2,281만 2,500원" ✓), months ("2026년 11월" ✓ vs "November 2026"; a wrong month ✗), unit rule ("20%" ✗ vs "20 sessions"; "20거래일" ✓); and trap cases in test/analysis.test.ts or test/grounding.test.ts for the six Korean refusal phrasings; confirm they fail before T003–T006
- [X] T003 [US1] FR-001: extend `TRAP_PHRASES` in src/analysis/report.ts with "내용이 없", "명시되어 있지 않", "나와 있지 않", "답변할 수 없", "답변을 드릴 수 없", "말씀드릴 수 없", "제공된 사실에 없", "제공된 정보에 없" (research R1)
- [X] T004 [US1] FR-002: in src/analysis/grounding.ts add a compound-amount pass before the plain-number pass — runs of `<digits><억|만|천|백|십>` (spaces allowed) read as one value (groups of 천/백/십 inside a 만/억 group × scale; step = smallest unit written); pure-Hangul numerals stay `unrecognised`
- [X] T005 [US1] FR-003: in src/analysis/grounding.ts extract month values `YYYY-MM` from "YYYY년 M월" (no day) and "Month YYYY"; a month claim is supported by a month fact or a full date in that month
- [X] T006 [US1] FR-004: in src/analysis/grounding.ts `check()` — a claim with a unit is supported by a unit-less fact value only when equal (no rounding across a unit mismatch)
- [X] T007 [US1] FR-005/SC-002: run `npm test`; every existing labelled case keeps its expected result, or the change is listed with its reason in verification.md; all new cases pass
- [X] T008 [US1] FR-006: write scripts/rescore-measurement.ts (Node, type stripping): read a recorded report, rebuild each run's facts with `factSet` from `portfolio-fixture@1` (+ the question as `Q1`; known tickers = fixture instruments + the holding's own ticker — the original runs also used the symbol directory, so list any run whose result changes only through ticker claims), re-run `claims()` on the recorded answer, recompute `trapHandled`, `aggregate`, `verdict`; write `{ report, checker: { before, after }, old, new, hand, changedRuns }` (data-model.md "Re-score record"); the input file is only read
- [X] T009 [US1] Run T008 on specs/010-portfolio-grounded-analysis/evidence/measurement-native-2026-09-29-59413a6.json → specs/013-numbers-by-reference/evidence/rescore-010-native.json; record old / new / hand in verification.md and check SC-001 (trap within 0.1 of 0.889; zero-unsupported within 0.05 of 0.889); any remaining gap is explained run by run

**Checkpoint**: the checker agrees with the Feature 010 hand audit; the new conditions can be judged.

## Phase 3: User Story 2 — Answers whose numbers come from the facts (P1)

**Goal**: `?numbers=formatted|refs` for the final role; values rendered by code; violations flagged.

**Independent Test**: `/?provider=standin&numbers=refs`, BTC question: every shown number equals a fact value, sources shown.

- [X] T010 [P] [US2] Write test/format.test.ts first, then src/analysis/format.ts: KRW < 10,000 → "9,500원"; ≥ 10,000 → 억/만 groups with digits (95,000,000 → "9,500만 원"; 22,812,500 → "2,281만 2,500원"; 950,000,000 → "9억 5,000만 원"); USD → "512.30달러"; percent as in the fact; g, kg, BTC, 주 → value + unit; dates → "2026년 9월 25일" (research R5); every formatted KRW value must be read back by the corrected checker as the same value
- [X] T011 [P] [US2] Write test/references.test.ts first, then src/analysis/references.ts: `table(facts)` names numbers per research R3 (`<factId>` for one number, `<factId><a|b…>` in reading order, dates included, question numbers as `Q1…`); `render(raw, table)` per research R4 (`\{\s*([A-Za-z]\d+[a-z]?)\s*\}` case-insensitive; unknown → `unknown-reference`; a table name without braces → `unbraced-reference`; remaining extracted numbers not from the question and > 10 → `bare-number`; returns `{ rendered, refs, violations }` with positions in `rendered`)
- [X] T012 [US2] src/analysis/facts.ts: fact text per mode — `formatted` appends the Korean reading after each KRW amount ("91,250,000 KRW (9,125만 원)"); `refs` appends `{name}` after each number; `toInput(s, h, question, mode = 'current')` sets `answerFacts` (all facts, mode text) only for `formatted`/`refs`; `current` output byte-identical to today
- [X] T013 [US2] src/graph/trading-graph.ts: the final role reads `answerFacts` instead of `holdingFacts` when present; `refs` appends the reference instruction (contracts/references.md) after `KOREAN_ANSWER`; the other seven roles and demo prompts unchanged; add `answerFacts` to `TradingFixture`/labels
- [X] T014 [US2] src/main.ts: read `?numbers=` (default `current`); for portfolio runs in `refs` mode render the final answer (T011) and run grounding on `rendered`; record `analysis.numbers` (data-model.md): the mode always, and raw/rendered/refs/violations in `refs` only; demo runs unchanged
- [X] T015 [US2] components/Shell.tsx: pass the page's mode into `toInput`; components/Answer.tsx: show the rendered answer, each substituted value's fact id (text label, not colour only), and "형식 위반" marks for violations; counts line adds violations
- [X] T016 [US2] Tests: extend test/trading-graph.test.ts (current = byte-identical Feature 010 prompts; seven roles identical across modes; final-role prompt per mode) and keep test/demo-prompts.ts passing; add e2e/analysis.spec.ts cases for `numbers=refs` with a **canned final answer** injected test-side for the final role only (the stand-in echoes its prompt, so its own answer cannot test rendering): `평균 매입가 {H3} 대비 {D2}…` → substituted values with fact-id labels; `{D9}` → `unknown-reference`; `D2` → `unbraced-reference`; `9억 원` → `bare-number`; and every shown number equals a fact value or is flagged (SC-003, stand-in side); plus a `numbers=formatted` case
- [X] T017 [US2] Adaptation record A-013-1 in verification.md (Constitution XI): final-role input and instruction per mode, reasons (research R6), the current↔formatted confound

**Checkpoint**: three modes selectable; current identical to Feature 010.

## Phase 4: User Story 3 — Measured comparison (P1)

**Goal**: one comparison report over the three modes; stand-in in the suite, native opt-in.

**Independent Test**: the stand-in measurement spec produces three stable reports.

- [X] T018 [US3] src/analysis/report.ts: `MeasureRun` gains `mode` and `violations`; `aggregate` adds `formatViolationRate` (share of completed answers with ≥ 1 violation; `null` outside `refs`); a `compare(reports)` summary per mode
- [X] T019 [US3] e2e/measure.ts: `loadExample(page, url)` with the mode in the URL; `measure(page, reps, meta, mode)` records `mode`, `violations` (from `analysis.numbers`), rendered answer
- [X] T020 [US3] e2e/measurement.spec.ts: stand-in run of all three modes, each stable on a second pass (SC-006 of Feature 010 kept), writes `measurement-standin-<mode>.json` and a comparison
- [X] T021 [US3] e2e/prompt-api.spec.ts: the native measurement takes `BTA_MEASURE_MODES` (default `current,formatted,refs`), rotates mode order per repetition, writes one report per mode and `measurement-native-compare.json`
- [X] T022 Run `npm run typecheck && npm test && npm run build && npm run test:browser` and the native gate `npm run test:prompt-api`; record in verification.md (SC-006)
- [X] T023 Copy the stand-in reports to specs/013-numbers-by-reference/evidence/

**Checkpoint**: everything automated passes; native comparison ready.

- [X] T024 [US3] **APPROVAL REQUIRED** Native comparison: `BTA_MEASURE=1 BTA_MEASURE_MODES=current,formatted,refs npm run test:prompt-api -- -g measurement` (≈ 4.3 h); copy the reports unedited to evidence/
- [X] T025 [US3] FR-014 hand audit per mode (all 6 trap answers + first 14 non-trap answers of repetition 1) into evidence/hand-audit-<mode>.json; record rule/hand agreement and the comparison table (SC-004, SC-005) in verification.md

## Phase 5: User Story 4 — Evidence for the model library (P3)

- [X] T026 [US4] FR-017: state F-A as supported (refs format-violation rate ≥ 10 %), not supported (< 2 %) or inconclusive, with the numbers (research R8); note the relation to AkariSP Feature 013 and the follow-up `refs + constraint` condition (research R9)

## Phase 6: Polish & Cross-Cutting

- [X] T027 [P] Update docs/testing.md (modes, re-score script, native comparison) and docs/roadmap.md (013 numbers by reference; Effectiveness Benchmark → 014)
- [X] T028 Present the comparison to the maintainer; record the default decision (FR-015) in verification.md; the default stays `current` unless the maintainer decides otherwise

## Dependencies & Execution Order

- T001 → US1 (T002 → T003–T006 → T007 → T008 → T009) → US2 (T010, T011 parallel → T012 → T013 → T014 → T015 → T016 → T017) → US3 (T018 → T019 → T020, T021 → T022 → T023 → T024 → T025) → US4 (T026) → T027, T028.
- US1 must finish before any mode is measured (checker first, spec US1).

## Parallel Example

```text
T010 format.ts | T011 references.ts   (different files; after US1)
```

## Implementation Strategy

- MVP: Phase 2 (checker + re-score) — useful on its own: it corrects the Feature 010 verdict.
- Then the modes (US2), the comparison (US3), the native run after approval, the F-A statement (US4).
