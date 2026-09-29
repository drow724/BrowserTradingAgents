# Verification: Feature 010 — Portfolio-Aware Analysis with Grounding Checks

## T001 — Baseline (Checkpoint A, 2026-09-29)

| Item | Value |
|---|---|
| Branch | `010-portfolio-grounded-analysis` |
| HEAD | `e9b24259c1d0254c529b684df696ef53bd2abcc3` (merge of PR #10); no code change since (`git diff e9b2425 -- src app components e2e test` empty) |
| `src/main.ts` sha256 | `bd34bf98e1e5d41fb7ee2227edf879e24ed905ebd05b98e0e90ab1a55032d4bf` (before this Feature; expected to change, FR-030) |
| `runGraph` section sha256 | `922db7527716b5f318776e6aea9fdc4c076c3385b65add03089cc72b89f38ec8` (before; expected to change) |
| Test counts | from Feature 009 T049 on this same tree: `npm test` 147 (146 pass, 1 skip); `test:browser` 64 passed, 1 skipped; native gate 2 passed, 1 skipped |

- P-1 (spec FR-010 runtime wording) and P-2 ("예시 포트폴리오" not in spec) were resolved by analyze C1 and C4.

## Checkpoints B/C — Foundational (T002–T008)

- `src/analysis/portfolio-fixture.ts` (fictional, 6 instruments: BTC, KRX-GOLD, KR:900001, KR:900006, US:ZZSP,
  US:ZZAP; one holding each), `src/analysis/facts.ts` (fact set with H/D/M/N ids; derived values by the app; a
  holding whose currency differs from the fixture's is treated as having no market data).
- Graph (A-010-1): optional `holdingFacts`, `question`; `readsFor`; Korean instruction on the final role only.
- `test/fixtures/grounding/demo-prompts@e9b2425.json`: the 8 prompts of the demo fixture and of a live-shaped
  input, captured from the unmodified `e9b2425` sources with a fake model (`test/demo-prompts.ts`), before T005.
- `test/analysis.test.ts` (5, PASS): facts; no-fixture → "Market data not available", no derived facts; input;
  **demo prompts byte-identical to e9b2425** (FR-007); portfolio prompts add holding facts to 5 roles, question and
  Korean instruction to the final role only.
- `src/main.ts`: `bta-analyze` / `bta-done`; portfolio branch (`dataSource.mode = 'portfolio-fixture'`, no
  `/api/market`); `analysis` block; `nodes[*].reads` from `readsFor` (identical for demo runs); full outputs kept
  for portfolio runs. The click listener now calls `run()` without the event argument.
- Test adjustment: `test/portfolio.test.ts` privacy check narrowed from "the word `portfolio` appears" to "a runtime
  import of `src/portfolio.ts`" — `src/main.ts` now handles holding facts passed by the shell (FR-025) but never
  imports the storage module.
- T008: `tsc` 0; `npm test` 152 (151 pass, 1 skip) after the adjustment; `test:browser` **64 passed, 1 skipped**
  (demo semantics unchanged).

## MVP — US2 and US5 (T009–T016)

- Shell: "이 종목 분석" per holding, "예시 포트폴리오" (confirmation when holdings exist), "분석 중: …" in the HUD,
  답변 window opened after each portfolio run; directory tickers passed to grounding in the event detail and kept
  out of the evidence (`knownTickers` stripped).
- `src/analysis/grounding.ts` + `test/fixtures/grounding/claims.json` (**56 cases, 71 labelled claims**) +
  `test/grounding.test.ts` (3, PASS): **100 % agreement** (SC-002), determinism, offsets, < 50 ms for 3,000
  characters with 13,000 known tickers.
  Rules fixed while labelling (each now covered by a case): a sentence comma after a number ("₩65,320, 즉");
  a unit-less claim against a fact with a unit must match exactly, without rounding ("2026년 11월" ≠ "11.2%").
- **F010-R1 (LOW, open)**: a claim with a unit can still be supported by a unit-less fact number through rounding
  ("20%" matches "20 sessions"). Documented in the labelled set as `supported` by the committed rules.
- `src/main.ts`: `analysis.grounding` and `analysis.answerLanguage` for portfolio runs.
- `components/Answer.tsx`: marks with visible labels "[근거 확인 안 됨]" / "[확인 불가 표기]", counts, the facts
  list, the analysis/no-order statement; the office dialog box shows "근거 확인 안 됨 N건" on its own line
  (a rolling narration line lost a race with the run-ended narration, so it is a separate line that clears on the
  next run).
- `e2e/analysis.spec.ts` (3, PASS): 4 asset classes each 8/0, settled, **0 requests during a portfolio run**;
  a holding without fixture facts → "Market data not available", no derived facts; a fabricated "99,000원" in the
  final answer is the only marked claim (SC-003), counts shown in the window and the dialog box.
- Regression after the MVP: `npm test` 155 (154 pass, 1 skip); `test:browser` **67 passed, 1 skipped**;
  SC-008 (Feature 009 office overhead) +1.33 pp.

## Adaptation A-010-1 (T037, Constitution XI)

- **Reference**: Feature 004 role prompts (`e9b2425`): each role's task plus the state keys it reads.
- **Adaptation**: portfolio runs add `Holding facts` to Market Analyst, Research Manager, Trader, Risk Reviewer and
  Final Decision, and `User question` plus the instruction "Answer the user's question in Korean, in at most three
  sentences, using only the facts given. If the facts do not contain the answer, say so." to the Final Decision only
  (MD-9). Evidence `nodes[*].reads` lists the keys actually read (`readsFor`).
- **Unchanged**: topology, role order, the other roles' language (English), every demo prompt (byte-identical to
  `e9b2425`, `test/analysis.test.ts`).
- **Reason**: ground the analysis in the user's position (FR-004) while keeping the demo reference path intact.

## US1, US3, US4, US6 (T017–T034)

- `src/analysis/resolve.ts` (longest match; directory-only not-held; picker otherwise); `test/fixtures/grounding/questions.json`
  (25 questions: 15 single, 4 multi, 6 trap) — every question resolves to its `expect` (L1).
- Shell: question box (질문 / 질문하기 / 전체 점검), holding picker (종목 선택), sequential runs via `bta-done` with
  "분석 중: name (k / N)", a failed run continues, Cancel stops the sequence; the 답변 window shows a summary for
  several holdings and the cancel latency; 모의 거래 window (`components/Ledger.tsx`, `src/ledger.ts`).
- Grounding decision during US6: **the question counts as given input** (FR-004 lists it among what the model is
  given). Found by the stand-in measurement: for "ZZSP와 ZZAP 둘 다 괜찮나요?" each run's echo named the other ticker
  from the question and was flagged; the question is now a `Q1` fact for grounding only (not added to evidence facts).
- `src/analysis/report.ts`: trap phrases (committed): 자료에 없, 정보가 없, 알 수 없, 확인할 수 없, 찾을 수 없, 제공되지 않,
  포함되어 있지 않, not available, no data, cannot determine, not provided, not contain; verdict per SC-007.
- `e2e/measurement.spec.ts` (stand-in, PASS): 33 runs, identical report on a second pass (SC-006), verdict
  `NOT_APPLICABLE`; aggregate zeroUnsupportedRate 1.0, trapHandledRate 1.0, koreanRate 0 — all artefacts of the echo
  (the echo repeats the instruction "…do not contain the answer…" and is English), not model evidence.
- **AkariSP observations (T027, stand-in)**: per run `runtimeCreateMs` 0–1, `shutdownMs` 0; cancel → sequence
  stopped in 2 ms; a `QuotaExceededError` from the provider surfaces as `TaskError('failed')` with the cause kept
  (`record.error` contains `QuotaExceededError`, `failure.kind = 'model'`): AkariSP does not distinguish a
  context-length failure from other model failures; the application can read the cause. No core change proposed
  (Constitution V): recorded as an observation for Feature 011.
- `e2e/analysis.spec.ts` (10) and `e2e/a11y.spec.ts` (+1): all PASS — SC-001 (15 single questions), not-held,
  picker, cancel with lifecycle intact, overview 6 in order, cancel during run 3 (2 success, 1 cancelled, 3 not run),
  failing holding continues, context-length typed, ledger (SC-009), privacy sentinel (SC-005: holding values,
  question text, answer text, ledger — 0 occurrences in requests, headers, bodies, console), keyboard only.

## Regression (T035, T036) and final record (T039, T040)

| Check | Result |
|---|---|
| `tsc --noEmit` | 0 |
| `npm test` | 162 tests: 161 pass, 1 skipped |
| `npm run test:browser` | **75 passed, 1 skipped** (real Yahoo L4); Feature 009 SC-008 office overhead +0.98 pp |
| Dev smoke (`BTA_DEV_SMOKE=1`) | 2 passed |
| Native gate (`npm run test:prompt-api`) | 2 passed, 2 skipped (real Yahoo L5, measurement — both opt-in): demo eight-role fixture graph in installed Chrome 154: success, 8 nodes, 8 logical / 0 fallback, settled `{ready,0,0}` before shutdown; `timing` graphMs 42,228, **runtimeCreateMs 14,689**, shutdownMs 1 (revision `e9b2425…+dirty`) |
| `src/main.ts` sha256 (new, FR-030) | `7a11e846b0b0abec01f168dd16b8c257a81b9f2e98d6fa966f94ee61c77279ac` |
| `runGraph` section sha256 (new) | `643f604a9695d1f8977a17ec2c688f993de803af5b7106c8ad325bc0a4f0e01a` |
| Graph topology | 0 changed `addNode` / `addEdge` lines vs `e9b2425` |
| AkariSP / `src/integration` / dependencies | 0 changes |
| Stand-in measurement (T040) | `evidence/measurement-standin-2026-09-29-e9b2425-dirty.json`: BROWSER_AUTOMATED, 33 runs, verdict NOT_APPLICABLE |

- **AkariSP observation (native, T027)**: creating a runtime (the warm base session) took **14.7 s** in installed Chrome
  154 for one run, against 42 s for the whole eight-role graph. With one runtime per run (R3), an overview pays this
  per holding (≈ 6 × 15 s for the example portfolio). Evidence for the Feature 011 runtime-reuse experiment; no
  core change (Constitution V).
- **Privacy split (analyze C11)**: Feature 009's sentinel test covers demo evidence (0 holding values); this
  Feature's T033 covers requests, headers, bodies and console for portfolio runs, whose local evidence deliberately
  contains the fact set (FR-025).

| SC | Evidence | Class | Result |
|---|---|---|---|
| SC-001 questions → expected holdings, answer with facts | `e2e/analysis.spec.ts` T020 (15 single + traps) | BROWSER_AUTOMATED | PASS |
| SC-002 ≥ 60 labelled claims, 100 % | `test/grounding.test.ts` (71 claims) | DETERMINISTIC_TEST | PASS |
| SC-003 unsupported flagged, supported not | T016 | BROWSER_AUTOMATED | PASS |
| SC-004 overview 5+ in order; cancel mid-run | T028 (6 holdings; cancel during 3) | BROWSER_AUTOMATED | PASS |
| SC-005 0 sentinel leaks | T033 | BROWSER_AUTOMATED | PASS |
| SC-006 stand-in report reproducible | T024 | BROWSER_AUTOMATED | PASS |
| SC-007 native measurement + verdict | T041 | REAL_BROWSER_PROMPT_API | recorded: rule verdict **NOT_YET**; hand-classified **LIMITED** (see T041 below) |
| SC-008 existing suites, native gate 8/8 | T035, T036 | all | PASS |
| SC-009 paper trade survives reload, labelled | T032 | BROWSER_AUTOMATED | PASS |
| SC-010 AkariSP 0, topology 0, prompt changes listed | T037, table above | STATIC_CODE_ANALYSIS | PASS |

- Findings: F010-R1 (LOW, open: unit claim supported by a unit-less fact through rounding); P-1, P-2 resolved;
  F008-L1 open. State: **IMPLEMENTATION_COMPLETE** (local/research); native measurement recorded (T041).

## T041 — Native measurement (REAL_BROWSER_PROMPT_API, 2026-09-29/30)

- Command: `BTA_MEASURE=1 npm run test:prompt-api -- -g measurement` on `main` at `59413a6`; installed Chrome
  154, Gemini Nano (Prompt API); 25 questions (6 traps), 3 repetitions, 99 runs; 1.5 h; exit 0.
- Report: `evidence/measurement-native-2026-09-29-59413a6.json` (`generatedAt` 2026-09-29T15:34:18Z), unedited.

### Rule result (as reported by `src/analysis/report.ts`, rules unchanged)

| Metric | Value |
|---|---|
| runs / completed / failed | 99 / 99 / 0 (no `QuotaExceededError`) |
| zeroUnsupportedRate | 0.859 |
| unsupportedPerAnswer / unrecognisedPerAnswer | 0.283 / 0.343 |
| trapHandledRate (18 trap runs) | 0.333 |
| koreanRate | 0.99 |
| mean run time | ≈ 52 s |
| **verdict** | **NOT_YET** |

### Hand classification (answers read one by one; rules NOT changed)

**Trap runs (18).** All 18 answers decline the missing fact ("제공된 정보에는 … 내용이 없습니다", "명시되어 있지
않습니다", "나와 있지 않습니다"). 12 were missed by `TRAP_PHRASES`, which lacks these phrasings (checker false
negatives). 2 runs (t03, repetitions 1 and 3) decline but add wrong BTC amounts (unsupported > 0), so they fail the
rule's own definition (decline **and** 0 unsupported). Hand-classified trap handling: **16/18 = 0.889**.

**Runs with unsupported claims (14).**

| Class | Runs | Examples |
|---|---|---|
| Real — Korean large-unit conversion (억/만) | 9 (all BTC; 9 of 15 BTC runs) | 95,000,000 → "9억 5천만 원"; 91,250,000 → "9억 1천 2백만 원" / "91억 2천 5백 만 원"; 22,812,500 → "2억 2천 8백만 원" (10× errors) |
| Real — other | 2 | "10주당 약 5,320원 정도의 손실" (q02, wrong arithmetic); "8.00원 하락" (q16, % stated as 원) |
| Checker false positive | 3 | "73만 8천원" / "73만 8천 원" = 738,000, correct (q03, q16: compound 만+천 not parsed); "2026년 11월" vs fact "November 2026" (q18) |

Hand-classified zero-unsupported rate: (99 − 11) / 99 = **0.889**.

| | zeroUnsupported | trapHandled | Verdict (SC-007 thresholds) |
|---|---|---|---|
| Rule (recorded) | 0.859 | 0.333 | **NOT_YET** |
| Hand-classified | 0.889 | 0.889 | **LIMITED** (≥ 0.7 / ≥ 0.5; USABLE needs ≥ 0.9 / ≥ 0.8) |

### Findings

- **F010-N1 (MEDIUM, model)**: Gemini Nano restates large KRW amounts in 억/만 units wrongly (order-of-magnitude
  errors); verbatim digits are reproduced correctly. Concentrated in BTC (large amounts): 9/15 BTC runs vs 2/84 other
  runs with real unsupported claims. Candidate mitigation (hypothesis, to be measured): instruct the final role to
  copy numbers exactly as written in the facts.
- **F010-N2 (MEDIUM, checker)**: `TRAP_PHRASES` misses common Korean refusals ("내용이 없", "명시되어 있지 않",
  "나와 있지 않") → trap handling under-counted (0.333 vs 0.889).
- **F010-N3 (LOW, checker)**: compound Korean amounts ("73만 8천 원") are not parsed as one number → false
  positives; plus the known "2026년 11월" vs "November 2026" date mismatch.
- Checker changes (N2, N3) change the verdict rule's inputs; per the measurement protocol they are made in a
  later Feature with before/after numbers on this same report. No rule was changed here.
- AkariSP: 99/99 runs completed with one runtime per run; 0 failures.
