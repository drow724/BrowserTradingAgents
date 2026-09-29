---

description: "Task list for Feature 010 — Portfolio-Aware Analysis with Grounding Checks"
---

# Tasks: Feature 010 — Portfolio-Aware Analysis with Grounding Checks

**Input**: `specs/010-portfolio-grounded-analysis/`: spec.md (US1–US6, FR-001…FR-030, SC-001…SC-010, MD-8, MD-9),
plan.md (D1–D9, checkpoints A–I), research.md (R1–R9, P-1), data-model.md, contracts/analysis-events.md,
contracts/grounding.md, contracts/measurement.md, quickstart.md.

**Baseline**: branch `010-portfolio-grounded-analysis` @ `e9b2425` (merge of PR #10). Untracked tooling
(`.claude/`, `.specify/*`, `CLAUDE.md`, `.impeccable/`) — never staged.

**Frozen decisions**:

| Item | Decision |
|---|---|
| Data | committed fictional `portfolio-fixture@1` for all asset classes (MD-8); portfolio runs make no network request |
| Language | roles 1–7 English; final answer requested in Korean (MD-9) |
| Graph | topology unchanged; optional input `holdingFacts`, `question`; `readsFor` adds extras only for portfolio runs; demo prompts/evidence byte-identical |
| Runs | one run = one holding = one runtime (R3, P-1); overview = shell-driven sequence; `bta-analyze` / `bta-done` events |
| Grounding | pure, deterministic, research R5 rules; ≥ 60 labelled claims |
| Measurement | stand-in automated (verdict NOT_APPLICABLE); native opt-in `BTA_MEASURE=1`, ≥ 3 × every question |
| Protected | `src/main.ts` / `runGraph` hashes change by design (FR-030) — new values recorded; AkariSP 0; new deps 0 |
| Approval gates | T041 (native measurement run, ~75–90 min of the maintainer's machine), every commit |

**Tests**: required (SC-001…SC-010).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Checkpoint A)

- [X] T001 Record baseline in `specs/010-portfolio-grounded-analysis/verification.md` (new): branch, HEAD, `git status`, `src/main.ts` and `runGraph` sha256 (`awk '/^async function runGraph/,0' src/main.ts | shasum -a 256`), `npm test` and `npm run test:browser` counts; record P-1 (spec FR-010 "one runtime per overview" vs Feature 004 one runtime per run) and P-2 (quickstart "예시 포트폴리오" button not in the spec) for the analyze step

---

## Phase 2: Foundational (Checkpoint B + C) — blocks every story

- [X] T002 [P] Create `src/analysis/portfolio-fixture.ts`: `PORTFOLIO_FIXTURE = { id: 'portfolio-fixture@1', instruments, portfolio }` — fictional tickers only; instruments for `BTC`, `KRX-GOLD`, ≥ 2 `KR:*`, ≥ 2 `US:*`, each `{ latestPrice, currency, asOf, market: string[] (2–3), news: string[] (1–2) }`; one fictional holding per instrument (quantity, average price, currency per Feature 009 rules); a header comment: fictional, runtime input per MD-8
- [X] T003 [P] Create `src/analysis/facts.ts`: `factSet(holding, fixture) → FactSet` per data-model.md — holding facts `H1…` (name, ticker, asset class, quantity + unit, average price + currency), derived `D1…` only when a latest price exists ("latest price", "unrealised change %" rounded to 2 decimals, "position value"), market `M1…`, news `N1…`; no fixture entry → single market fact "시장 데이터 없음 (market data not available)" and no derived facts; `toInput(factSet, question) → TradingFixture` rendering `text (fact Xn)` lines into `holdingFacts`, `marketFacts`, `newsFacts`, `subject` = "name (ticker)"
- [X] T004 [P] L1 `test/analysis.test.ts` for T002–T003: every asset class; derived values exact (e.g. avg 71000, latest 65320 → −8.00 %); missing fixture → no derived facts; ids unique; no invented values
- [X] T005 Graph input (D1, R1) in `src/graph/trading-fixture.ts` (`holdingFacts?`, `question?`) and `src/graph/trading-graph.ts`: `LABELS` for the two keys; `PORTFOLIO_READS` extras (`holdingFacts` → marketAnalyst, researchManager, trader, riskReviewer, finalDecisionMaker; `question` → finalDecisionMaker); exported `readsFor(role, input)`; `promptFor` uses `readsFor` and, when `question` is present, appends to the final role only: "Answer the user's question in Korean, in at most three sentences, using only the facts given. If the facts do not contain the answer, say so." Topology untouched
- [X] T006 L1 in `test/analysis.test.ts`: the demo fixture's eight prompts are byte-identical to the committed Feature 004 prompts (snapshot generated from the `e9b2425` sources via `git show e9b2425:src/graph/trading-graph.ts` and `…/trading-fixture.ts`, independent of task order, committed as `test/fixtures/grounding/demo-prompts@e9b2425.json`); a portfolio input adds exactly the planned lines; only the final prompt has the Korean instruction
- [X] T007 `src/main.ts` (D2, contracts/analysis-events.md): `run(analysis?)`; `#run` listens for `bta-analyze` (ignored while running) and runs with `detail.input` and `dataSource: { mode: 'portfolio-fixture', fixture: 'portfolio-fixture@1' }` (no `/api/market`); record gains `analysis: { holding, question, factSetId, facts }`; `nodes[*].reads` from `readsFor`; full role outputs kept for portfolio runs (FR-025); after writing the record dispatch `bta-done` with it. Demo click path unchanged. Record the new `src/main.ts` and `runGraph` hashes in verification.md
- [X] T008 Checkpoint C regression: `npm run typecheck`, `npm test`, `npm run test:browser` unchanged-green (demo evidence semantics preserved, FR-007)

---

## Phase 3: User Story 2 — Analyse one holding (P1) 🎯 MVP part 1

**Goal**: a chosen holding runs through the team with its facts. **Independent test**: each asset class from the fixture runs with the stand-in; evidence shows its facts; 8 logical requests; 0 network requests.

- [X] T009 [US2] Shell action "이 종목 분석" in the 포트폴리오 window (`components/Shell.tsx`): builds the fact set (T003) and dispatches `bta-analyze`; the HUD shows the holding being analysed; a "예시 포트폴리오" button loads `PORTFOLIO_FIXTURE.portfolio`, with a confirmation when holdings exist (FR-007a, P-2)
- [X] T010 [US2] e2e `e2e/analysis.spec.ts`: for one holding per asset class (stand-in) — record `dataSource.mode === 'portfolio-fixture'`, `analysis.facts` = the fact set, counts 8/0, settled before shutdown, 0 requests other than page assets; a real (non-fixture) holding → facts contain "시장 데이터 없음" and no derived facts (FR-006)

---

## Phase 4: User Story 5 — See unsupported claims (P1) 🎯 MVP part 2

**Goal**: deterministic grounding with visible flags. **Independent test**: labelled claims 100 % agreement; flags shown for unsupported only.

- [X] T011 [P] [US5] Create `test/fixtures/grounding/claims.json`: ≥ 60 labelled claims `{ text, facts, expect: [{ text, status }] }` covering every rule in research R5 (separators, decimals, `%`, 원/₩/KRW, $/USD, g, BTC, 주/shares, 만/억, rounding to shown precision, dates in 3 forms, KR 6-digit and US tickers, Korean numeral words → unrecognised, bare integers ≤ 10 → ignored, English and Korean sentences)
- [X] T012 [US5] Create `src/analysis/grounding.ts` per contracts/grounding.md: `extract(text, known)`, `ground(outputs, answer, facts, known) → Grounding` with `start/end` offsets; pure
- [X] T013 [US5] L1 `test/grounding.test.ts`: 100 % agreement on `claims.json` (SC-002); determinism (same input twice → deep-equal); < 50 ms for a 3,000-character output
- [X] T014 [US5] `src/main.ts`: after a portfolio run, `analysis.grounding = ground(role outputs, finalDecision, facts, { tickers: holding + fixture tickers + loaded directory tickers })` (the shell passes the directory tickers in the `bta-analyze` detail when loaded; analyze C2) and `analysis.answerLanguage` (Hangul share > 50 % → `ko`, < 10 % → `en`, else `mixed`)
- [X] T015 [US5] Create `components/Answer.tsx`: answer text with `<mark>` spans for unsupported ("근거 확인 안 됨") and unrecognised ("확인 불가 표기") claims (visible text label, not colour only), counts line, facts list (id + text), "분석이며 투자 조언이 아닙니다. 실제 주문은 하지 않습니다." (FR-029); shown in a new 답변 window in `components/Shell.tsx`; the dialog box shows "근거 확인 안 됨 N건" after the run
- [X] T016 [US5] e2e in `e2e/analysis.spec.ts`: inject a stand-in reply containing a fabricated price for the final role (test-side `LanguageModel.create` wrapper, as Feature 008 `failRole`) → exactly that number marked; supported numbers unmarked (SC-003)

---

## Phase 5: User Story 1 — Ask about my portfolio (P1)

**Goal**: Korean question → holdings → runs → answer. **Independent test**: committed single-holding questions resolve and answer correctly with the stand-in.

- [X] T017 [P] [US1] Create `src/analysis/resolve.ts` per research R7: "전체", "포트폴리오 전체", "모든 종목" → all; longest-match holding names (case-insensitive, whitespace-normalised) and tickers → those; directory name/ticker not held → `not-held` (only when the directory is loaded; otherwise `choose`, FR-003); else `choose`
- [X] T018 [P] [US1] L1 in `test/analysis.test.ts` for T017: longest match ("삼성테스트전자우" ≠ "삼성테스트전자"), two holdings, ticker only, not held, none, "전체"
- [X] T019 [US1] Question input in the HUD (`components/Shell.tsx`, keyboard operable, label "질문"): resolution → one run per holding (sequential via `bta-done`), `not-held` message "보유하지 않은 종목", `choose` → holding picker (checkboxes + "전체") before any run, empty portfolio → "먼저 보유 자산을 추가하세요"
- [X] T020 [US1] e2e in `e2e/analysis.spec.ts`: every `single` question in `questions.json` resolves to its `expect` and shows an answer with facts (SC-001); not-held → no run; none → picker, no run until chosen; Cancel during a run → cancelled with lifecycle intact and no answer recorded

---

## Phase 6: User Story 6 — Measure hallucination (P1)

**Goal**: committed set, deterministic stand-in report, native opt-in report with verdict.

- [X] T021 [P] [US6] Create `test/fixtures/grounding/questions.json`: 20–30 Korean questions over `portfolio-fixture@1` — `single`, `multi`, ≥ 5 `trap` (answer not in the facts), each `{ id, text, kind, expect }`
- [X] T022 [P] [US6] Create `src/analysis/report.ts`: `aggregate(runs) → MeasureReport['aggregate']`, `trapHandled(answer, grounding)` with the committed phrase list (research R6), `verdict(aggregate, evidenceClass)` per SC-007 (`NOT_APPLICABLE` for stand-in)
- [X] T023 [P] [US6] L1 in `test/grounding.test.ts` for T022: verdict boundaries (0.90/0.80, 0.70/0.50), trap rule, failed runs excluded from rates and counted
- [X] T024 [US6] e2e `e2e/measurement.spec.ts` (stand-in): run every question once through the UI, build the report twice, assert equality apart from timestamps (SC-006), verdict `NOT_APPLICABLE`; write the report to `test-results/`
- [X] T025 [US6] Opt-in native measurement in `e2e/prompt-api.spec.ts`: title contains "measurement", `test.skip(!process.env.BTA_MEASURE)`; installed Chrome with the seeded example portfolio; every question × `BTA_MEASURE_REPS` (default 3); writes the report JSON to the test output

---

## Phase 7: User Story 3 — Portfolio overview (P2)

- [X] T026 [US3] Overview in `components/Shell.tsx`: "전체" → sequential runs in portfolio order via `bta-done`; HUD "k / N · {holding}"; a failed run continues to the next; Cancel sets the overview flag and clicks `#cancel`; summary window (holding, final decision, grounding counts)
- [X] T027 [US3] Dogfooding instrumentation: per run `runtimeCreateMs`, `shutdownMs` in the record's `timing` (added in `runGraph`, measured around `createRuntime` and `shutdown`; an additive operational field for demo runs too, FR-007), and per overview the cancel latency (Cancel → `done:`) in the shell; record context-length failures (TaskError codes) as they appear
- [X] T028 [US3] e2e in `e2e/analysis.spec.ts`: 5 fixture holdings; completes 5 runs in order; cancel during run 3 → 2 answered, 1 cancelled, 2 not run; each run settled before shutdown (SC-004); one holding made to fail (stand-in `STANDIN_FAIL` in its facts via a test-side wrapper) → that holding failed, the overview continues and the summary shows it (FR-013, analyze C3); a stand-in reply rejected as a context-length error (test-side `LanguageModel` wrapper throwing the provider's error for one prompt) → the run's failure is typed and recorded, not truncated (Edge Case, analyze C5)

---

## Phase 8: User Story 4 — Paper-trade ledger (P2)

- [X] T029 [P] [US4] Create `src/ledger.ts`: `localStorage["bta.ledger"]` `{ version: 1, entries }`, guarded like `src/portfolio.ts`; `PaperTrade` per data-model.md ("quantity > 0 for buy/sell (0 allowed for hold)"; `priceBasis.source` `latest-fixture` | `average`)
- [X] T030 [P] [US4] L1 `test/ledger.test.ts`: validation, storage throwing, delete, never touches `bta.portfolio`
- [X] T031 [US4] "모의 거래로 기록" in the answer window and a 모의 거래 window in `components/Shell.tsx` (list, delete); "모의 거래 (실제 주문 아님)" on every view (FR-023, FR-029)
- [X] T032 [US4] e2e in `e2e/analysis.spec.ts`: record after a run, reload, visible and labelled; delete; portfolio unchanged (SC-009)

---

## Phase 9: Polish & Cross-Cutting (Checkpoints G, H, I)

- [X] T033 Privacy sentinel e2e in `e2e/analysis.spec.ts`: holding values, a question sentinel, the answer and a ledger entry never appear in any request URL, header, body or console line during questions, overview and ledger use (SC-005, FR-024)
- [X] T034 Accessibility: question input, picker, answer window and ledger keyboard operable; marks carry text; extend `e2e/a11y.spec.ts`
- [X] T035 Full regression: typecheck, build, `npm test`, `npm run test:browser`, dev smoke (`BTA_DEV_SMOKE=1`), AkariSP / topology 0 changes (SC-008, SC-010)
- [X] T036 Native fixture gate: `npm run test:prompt-api` (demo 8/8 unchanged)
- [X] T037 Adaptation record A-010-1 (prompt additions, Korean final answer, `readsFor`) in `specs/010-portfolio-grounded-analysis/verification.md`
- [X] T038 [P] Docs: `docs/roadmap.md` (010 status, P-1 runtime decision, 011 reuse of the set and checker), `docs/testing.md` (analysis suites, `BTA_MEASURE`)
- [X] T039 Verification record: SC table with evidence classes; AkariSP observations; findings; note the privacy split (analyze C11): Feature 009's sentinel test covers demo evidence (0 holding values), this Feature's T033 covers requests, headers, bodies and logs for portfolio runs, whose local evidence deliberately contains the fact set (FR-025)
- [X] T040 Stand-in measurement report committed as `specs/010-portfolio-grounded-analysis/evidence/measurement-standin-<date>-<sha>.json`
- [X] T041 **APPROVAL REQUIRED** Native measurement: `BTA_MEASURE=1 npm run test:prompt-api -- -g measurement` (~75–90 min); commit the report under `specs/010-portfolio-grounded-analysis/evidence/`; record the verdict; not required for IMPLEMENTATION_COMPLETE
- [X] T042 **APPROVAL REQUIRED** Commit (feature dir, source, tests, docs; never tooling, `.env*.local`, `.next/`, `public/office-art/`, `test-results/`)

---

## Dependencies & Execution Order

```text
A → B/C (T002–T008) → US2 (T009–T010) → US5 (T011–T016) → US1 (T017–T020) → US6 (T021–T025)
  → US3 (T026–T028) → US4 (T029–T032) → Polish (T033–T042)
```

- US1 depends on US2 (runs) and US5 (answer window). US3 depends on US1's sequencing. US6 needs US1 (UI runs).
- US4 depends on the answer window (T015) only.

## Parallel Opportunities

- T002, T003, T004 together; T011 with T012 drafting; T017/T018 with T021/T022/T023; T029/T030 any time after Phase 2.

## Implementation Strategy

1. **MVP**: A → B/C → US2 → US5 — one holding analysed, answer with grounding flags. Stop and show it.
2. US1 (questions) and US6 (stand-in measurement).
3. US3 (overview) and US4 (ledger).
4. Regression, docs; native measurement on approval; commit on approval.
