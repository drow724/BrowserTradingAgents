---
description: "Task list for Feature 016 — Semantic Grounding Contract"
---

# Tasks: Feature 016 — Semantic Grounding Contract

**Input**: Design documents from `specs/016-semantic-grounding-contract/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R10), data-model.md, contracts/semantic-grounding.md, quickstart.md

**Tests**: included — the Feature is proven by frozen deterministic fixtures (SC-011); a native run is secondary only.

**Research discipline**: fixtures, expected classes and hypotheses are committed-ready (T002) before any checker change;
they are never edited after results; a case the design cannot express is recorded as a finding.

## Phase 1: Setup

- [X] T001 Record the baseline in specs/016-semantic-grounding-contract/verification.md: `main` `d51126f`; `npm test` (199 tests, 198 pass, 1 skipped) and `npm run test:browser` (93 passed, 2 skipped) from Feature 015; the current checker's result on every frozen claim (the spec's Baseline table, re-run and pasted), and the hypothesis of research.md
- [X] T002 Write test/fixtures/grounding/semantic.json (FR-013, data-model.md "Frozen fixture"): fixture A — ORCL with FICTIONAL holding values per spec FR-019 (H1 `Holding: Oracle Corporation Common Stock (ORCL), US listing.`, H2 `Quantity held: 12 shares.`, H3 `Average purchase price: 172.40 USD.`, D1 `Latest price (2026-09-29): 137.79 USD.`, D2 `Unrealised change vs. average purchase price: -20.08%.`, D3 `Position value at the latest price: 1,653.48 USD.`, M1 `The price fell 7.6% over the last 20 sessions.`, M2 `The price is below its 50-day moving average of 142.70 USD.`, M3 `The 52-week high is 322.54 USD and the 52-week low is 114.50 USD.`, N1 `No news is supplied for this holding.`) with claims and expected `{ status, evidence }`: SUPPORTED — current price 137.79 USD (D1), quantity 12 (H2), position value 1,653.48 USD (D3), "평균 매수가 대비 20.08% 하락" (D2), "최근 20거래일 동안 7.6% 하락" (M1), "50일 이동평균 142.70 USD 아래" (M2), the insufficient-evidence sentence of spec US4; SEMANTIC_MISMATCH — "20일 동안 20.08% 하락했다", "ORCL fell 20.08% over the last 20 sessions" (value of D2); UNSUPPORTED — "저평가", "ORCL is undervalued", "장기 상승 잠재력", "long-term recovery is likely"; fixture B — QQQM with `The price rose 3.0% over the last 20 sessions.`: "20일 동안 20% 상승" UNSUPPORTED; fixture C — synthetic, D2 `Unrealised change vs. average purchase price: +10.00%.` and M1 `The price rose 10.0% over the last 20 sessions.`: "평균 매수가 대비 10% 상승" → D2, "최근 20거래일 동안 10% 상승" → M1, "30일 동안 10% 상승" SEMANTIC_MISMATCH, "10% 상승" SUPPORTED with evidence [D2, M1] and `ambiguous`; each claim with a one-line hypothesis. **Each claim names its evaluated span** (`target`, e.g. `"20.08%"`) and lists the expected class of every other span the checker extracts from the sentence (`spans`, e.g. `20` SUPPORTED by M1 as a horizon mention; `30` in "30일 동안 10% 상승" UNSUPPORTED). Add the edge cases of spec.md: "뉴스 정보가 없다" → SUPPORTED by N1 (absence statement); "약 20% 하락했다" with the cost-basis cue → SUPPORTED by D2 (rounded within the matched metric); "평균 매수가 대비 7.6% 하락" → SEMANTIC_MISMATCH (value of M1 with the D2 basis); a sentence stating another subject's value ("QQQM은 20거래일 동안 7.6% 하락") inside fixture A → SEMANTIC_MISMATCH (subject)

## Phase 2: Foundational — fact semantics (blocks US1–US4)

**Purpose**: every fact value the code produces carries metric, basis, unit, direction; text stays the source.

- [X] T003 [P] Write tests first in test/semantic.test.ts: `factSemantics(fact)` for each template of contracts/semantic-grounding.md (fixture A facts → D2 `{ metric: 'unrealised_return', basis: 'since_average_purchase', unit: 'pct', direction: 'down', value: -20.08 }`, M1 `{ metric: 'price_return', basis: 'sessions:20', direction: 'down', value: -7.6 }`, M3 two values `range_high` / `range_low` with `weeks:52`, N1 `{ metric: 'news', value: 'none' }`); clause split — the US4 sentence "최근 20거래일에는 7.6% 하락했고 현재가는 50일 이동평균 아래에 있습니다" splits after "하락했고" (the 20-session cue stays with 7.6 %, the 50-day cue with the second clause) and "보고서" / "그리고" are not split points; coverage — every sentence `factSet` produces for all `portfolio-fixture@1` instruments and for `liveInstrumentFacts` output either matches a template or is in an explicit, asserted list of value-only sentences (recorded as a finding)
- [X] T004 src/analysis/semantics.ts (new): the template table (`metric` closed set: "holding | quantity | cost_basis | price | unrealised_return | position_value | price_return | moving_average | range_high | range_low | volume | volume_ratio | valuation_multiple | news"; `basis` closed vocabulary: "latest | since_average_purchase | sessions:N | days:N | weeks:N | all_time"; `direction`: "up | down | none"), `factSemantics(fact)`, and the claim cue lists (basis, metric, direction; Korean and English) and the interpretation lexicon of research R4/R6; subject from the holding, as-of from D1

**Checkpoint**: `node --test test/semantic.test.ts` shows full template coverage (or the listed value-only sentences).

## Phase 3: User Story 1 — A right number with the wrong meaning is caught (P1) 🎯 MVP

**Goal**: SUPPORTED / SEMANTIC_MISMATCH by metric, basis and direction, with evidence and reason.

**Independent Test**: fixtures A and C: every numeric claim's actual class and evidence equal the frozen expectation.

- [X] T005 [US1] test/semantic.test.ts: run every numeric claim of fixtures A and C through `claims()`; assert status and evidence equal `semantic.json`; print the mapping (claim → evidence → class → reason) and the counts (claims, SUPPORTED, UNSUPPORTED, SEMANTIC_MISMATCH, expected-vs-actual agreement) (SC-001–SC-003, SC-007, SC-012)
- [X] T006 [US1] src/analysis/grounding.ts: claim clause split (sentence ends, `,`, `;`, and the connectives `고 `, `며 `, `지만 `, `는데 ` only after a verb ending — tested in T003); cues per clause; classification per research R5 (no cue → value match as today, `ambiguous` when matching facts differ in metric; cues → a matching fact agreeing with every cue is SUPPORTED, else `semantic-mismatch` with reason naming the value's fact and the fact that has the claimed basis); numbers inside a basis cue (the `20` of `20일`) stay value-checked; `Claim` gains `evidence: string[]`, `reason?`, `ambiguous?`; `status` gains `'semantic-mismatch'`; counts gain `semanticMismatch` (data-model.md)
- [X] T007 [US1] Record the per-claim mapping and agreement of fixtures A and C in verification.md (hypothesis → expected → actual → finding → decision)

**Checkpoint**: SC-001–SC-003 and SC-007 pass on frozen fixtures.

## Phase 4: User Story 2 — Unsupported interpretations are not counted as grounded (P1)

**Goal**: valuation and long-term outlook claims without evidence are UNSUPPORTED; insufficient-evidence statements pass.

**Independent Test**: fixture A interpretation claims and the US4 insufficient-evidence sentence match their frozen classes.

- [X] T008 [US2] test/semantic.test.ts: fixture A interpretation claims (Korean and English) → UNSUPPORTED with reasons "no valuation evidence" / "no fundamental or news evidence"; the insufficient-evidence sentence → SUPPORTED as `insufficient-evidence` (SC-004, SC-005, FR-010); non-numeric comparisons outside the lexicon ("현재가가 평균 매수가보다 낮다") are not extracted — recorded as a finding, not a test expectation
- [X] T009 [US2] src/analysis/grounding.ts: interpretation claims (`type: 'interpretation'`, `kind: valuation | outlook | insufficient-evidence`) from the lexicon per clause; no current fact class is valuation or fundamental/news evidence (cost basis, price, momentum, range and the no-news absence fact are excluded), so valuation/outlook clauses are UNSUPPORTED unless the clause holds an insufficiency phrase (shared with `TRAP_PHRASES` in src/analysis/report.ts)

## Phase 5: User Story 3 — Value-level detection stays (P1)

**Goal**: no regression of numbers, units, dates, rounding.

**Independent Test**: fixture B and the existing labelled claims pass unchanged.

- [X] T010 [US3] test/semantic.test.ts: fixture B "20일 동안 20% 상승" → UNSUPPORTED (SC-006); run `npm test`: test/grounding.test.ts, test/analysis.test.ts and test/fixtures/grounding/claims.json unchanged, or each changed expectation listed with its reason in verification.md (SC-008, FR-012)
- [X] T011 [US3] Check the grounding speed test (< 50 ms) still passes; record

## Phase 6: User Story 4 — Answers may say where the evidence stops (P2)

**Goal**: the final role may state insufficient evidence; mismatches are visible in the research view.

**Independent Test**: a canned ORCL answer following the policy passes; one with "저평가" is flagged; the answer window shows the mismatch count.

- [X] T012 [US4] src/graph/trading-graph.ts: add the policy sentence of research R8 to the final role's Korean-answer instruction (all number modes); update test/trading-graph.test.ts and test/analysis.test.ts prompt expectations with that sentence only; record adaptation A-016-1 in verification.md (Constitution XI)
- [X] T013 [US4] components/Answer.tsx: counts line "근거 확인: 일치 N건 · 의미 불일치 N건 · 근거 확인 안 됨 N건 · 확인 불가 표기 N건"; mismatch marks "[의미 불일치]" with the reason as the title; interpretation marks "[근거 없음]"; src/main.ts records `semanticMismatch` in the grounding counts (FR-014)
- [X] T014 [US4] src/analysis/report.ts: `aggregate()` adds `semanticMismatchPerAnswer`; `zeroUnsupportedRate` counts an answer as clean only with 0 unsupported and 0 semantic mismatches (FR-020, documented change; later revised by decision A on F016-R3: mismatches reported separately, not in the verdict); test/analysis.test.ts covers it
- [X] T015 [US4] e2e/analysis.spec.ts: canned final answer for an ORCL-shaped holding (fixture-facts mode with test-side answer injection, as Feature 010 T016): "20일 동안 … 하락" with the D2 value → one "[의미 불일치]" mark and "의미 불일치 1건"; "저평가" → "[근거 없음]"; the insufficient-evidence sentence → no mark

## Phase 7: Polish & Cross-Cutting

- [X] T016 Offline re-score of the recorded Feature 013 native reports (specs/013-numbers-by-reference/evidence/measurement-native-*-rep*.json) with scripts/rescore-measurement.ts and the new checker → specs/016-semantic-grounding-contract/evidence/rescore-013-native.json; record before/after counts of unsupported and semantic mismatches (secondary evidence, not the proof)
- [X] T017 Answer the research questions of FR-018 with evidence in verification.md (minimum metadata; determinism; generic basis; qualitative facts; evidence ids — derived vs model-cited, counted on fixtures; text from metadata; checker findings obsolete/open/clearer; does an evidence reference add detection beyond metadata)
- [X] T018 Run `npm run typecheck && npm test && npm run test:browser` and the native gate; record (SC-008–SC-011)
- [X] T019 [P] docs/testing.md (frozen semantic fixtures, classes, counts) and docs/roadmap.md (016 semantic grounding; Benchmark → 017)
- [X] T020 Present results to the maintainer

## Dependencies & Execution Order

- T001 → T002 (fixtures frozen) → Phase 2 (T003 → T004) → US1 (T005 → T006 → T007) → US2 (T008 → T009) → US3 (T010, T011) → US4 (T012 → T013 → T014 → T015) → T016 → T017 → T018 → T019 → T020.
- T002 must be finished before T004/T006 are started (research discipline); later fixture edits are forbidden — failures become findings.

## Parallel Example

```text
T003 test/semantic.test.ts (templates)  |  T001 baseline record
T019 docs                              |  T017 findings (after T016)
```

## Implementation Strategy

- MVP: T001–T007 (frozen fixtures, fact semantics, semantic mismatch for numbers).
- Then interpretations (US2), the regression guard (US3), the answer policy and display (US4).
- Re-score and findings close the Feature; a native run, if any, is a separate, secondary step.
