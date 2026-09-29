# Feature Specification: Feature 010 — Portfolio-Aware Analysis with Grounding Checks

**Feature Branch**: `010-portfolio-grounded-analysis`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "Ask questions about my portfolio in Korean from the office; the eight-role team
analyses the relevant holdings (one at a time, queued through the one runtime); record the final decision as a
paper trade; check every number, ticker and date in the answers against the facts the model was given; and
measure how often the in-browser model hallucinates, with a committed question set. Paper trading only.
Specify only."

## Purpose

Core question: **Does the in-browser model (Gemini Nano through the Chrome Prompt API) answer questions about a
user's own holdings well enough — using only the facts it was given — to be useful, and can the app tell the
user when it did not?**

This Feature turns the Feature 009 portfolio into analysis input, and it measures grounding. It does not judge
whether any investment decision is right (Constitution VIII).

```text
question (Korean) ─► holdings it concerns ─► per holding: facts (holding + market + news) ─► 8-role run
                                                                                     │
          dialog / results ◄── grounding check (deterministic) ◄── answer + role outputs
                                                                                     │
                                                                 optional paper trade ─► browser-only ledger
```

## Maintainer decisions (2026-09-29)

| ID | Decision |
|---|---|
| MD-8 | Market and news facts for portfolio analysis are committed fictional fixtures for all asset classes; live data stays the existing demo path only (clarification Q1 = A). |
| MD-9 | Intermediate roles answer in English; only the final answer is requested in Korean (clarification Q2 = B). |

## Clarifications

### Session 2026-09-29

- Q: Which market/news data is in scope for non-US holdings? → A: fictional fixtures only, for all asset classes; live data stays the demo path (MD-8).
- Q: In which language does the model answer? → A: intermediate roles English, final answer Korean (MD-9).

## Baseline

Verified at specification time (2026-09-29):

| Item | Value |
|---|---|
| Branch | `010-portfolio-grounded-analysis`, created from `main` |
| Base | `e9b2425` — merge of PR #10 (Feature 009) |
| Graph | 8 roles, Feature 004 topology; each role's prompt contains its task and the state keys it reads (`subject`, `marketFacts`, `newsFacts` and earlier role outputs) |
| Input | one run = one subject; fixture `tradingagents-fixture@1` (fictional company) or live US daily bars for one instrument via `/api/market` (Feature 007) with committed neutral news |
| Models | stand-in (deterministic, BROWSER_AUTOMATED) and native Chrome Prompt API (REAL_BROWSER_PROMPT_API), through AkariChatModel → AkariSP (`limit 1`, `queueCapacity 32`) |
| Per run | runtime created after acquisition, 8 logical requests, settlement before shutdown (Features 004, 007) |
| Portfolio | Feature 009: browser-only holdings (BTC KRW/USD, KRX gold spot g/KRW, KR listings KRW, US listings USD) with quantity and average price; not used by any run yet |
| Shell | Feature 009 JRPG shell (Korean UI), office drawn from the Feature 008 view state, Korean dialog narration |
| Protected | `src/main.ts` sha256 `bd34bf98…32d4bf`; `runGraph` section `922db752…f38ec8` — **expected to change in this Feature** (FR-030) |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Ask about my portfolio (Priority: P1)

From the office, the user types a question in Korean, for example "삼성전자가 계속 하락 중인데 괜찮은 건가요?".
The app works out which holding(s) the question is about, the agent team analyses them, and the answer
appears in the JRPG dialog box and the answer window (답변 창) together with the facts that were used.

**Why this priority**: This is the product the portfolio expansion exists for.

**Independent Test**: With the committed fictional portfolio and facts and the stand-in model, ask a question
naming one holding; a run happens for that holding only, the answer and its facts are shown, and the evidence
records which holding and which facts were used.

**Acceptance Scenarios**:

1. **Given** a portfolio with a holding named in the question, **When** the user asks, **Then** exactly that
   holding is analysed and the answer names it.
2. **Given** a question that names no holding, **When** the user asks, **Then** the user is asked to pick the
   holding(s) (or "전체"), and nothing runs until they do.
3. **Given** an answer, **Then** the answer window (답변 창; separate from the evidence 결과 window) lists the
   facts given to the model (holding facts, market facts, news facts) next to the answer.
4. **Given** a run in progress, **When** the user cancels, **Then** the run is cancelled with the Feature 004
   lifecycle guarantees and no answer is recorded.
5. **Given** any answer, **Then** it is labelled as analysis, not investment advice.

---

### User Story 2 — Analyse one holding (Priority: P1)

The user picks a holding (instead of today's fixed demo instrument) and runs the team on it. The run uses
that holding's instrument, quantity and average purchase price, plus market and news facts for it.

**Why this priority**: Every other story is built from single-holding runs.

**Independent Test**: Pick each asset class from the fictional portfolio and run with the stand-in; each run's
evidence shows the holding facts and the market/news facts supplied, and 8 logical requests.

**Acceptance Scenarios**:

1. **Given** a holding, **When** it is analysed, **Then** the facts given to the model include its name,
   ticker, quantity, unit, average price and currency, and facts derived by the app (e.g. the latest price
   and the unrealised change against the average price when a latest price exists).
2. **Given** a holding with no available market facts, **Then** the run says so in the facts ("시장 데이터
   없음") rather than inventing any, and still runs or is skipped as the user chooses.
3. **Given** the existing demo modes (`?data=fixture`, `?data=live` for the demo instrument), **Then** they
   keep working unchanged.
4. **Given** the 포트폴리오 window, **When** the user chooses "예시 포트폴리오", **Then** the fictional measurement
   portfolio (all four asset classes, with fixture facts) is loaded, after a confirmation if holdings exist.

---

### User Story 3 — Portfolio overview (Priority: P2)

The user asks about the whole portfolio ("전체 포트폴리오 점검"). Each holding is analysed in its own run, one
after another through the one model runtime; the office shows which holding is being analysed and how many
remain; the user can cancel the rest at any time.

**Why this priority**: Real value of a portfolio view, and the main load on AkariSP (queueing, cancellation,
runtime reuse) — the dogfooding this project exists for.

**Independent Test**: With five fictional holdings and the stand-in, start an overview; five runs complete in
order with per-holding answers; cancelling during the third leaves holdings 1–2 answered, 3 cancelled, 4–5
not run.

**Acceptance Scenarios**:

1. **Given** N holdings, **When** an overview starts, **Then** N single-holding runs happen in portfolio
   order, each with the Feature 004 guarantees, and the office shows "k / N" and the current holding.
2. **Given** an overview in progress, **When** the user cancels, **Then** the current run is cancelled, no
   further run starts, and finished answers are kept.
3. **Given** an overview, **Then** a summary lists each holding with its final decision and its grounding
   status.

---

### User Story 4 — Paper-trade ledger (Priority: P2)

After an answer, the user may record the final decision as a paper trade: a hypothetical buy, sell or hold,
with a quantity and the price basis the analysis used. The ledger lives only in this browser and is always
labelled "모의 거래 (실제 주문 아님)".

**Why this priority**: Lets the user keep a record of what the team suggested, without any order path.

**Independent Test**: Record a paper trade after a stand-in run, reload, and see it in the ledger; confirm no
request carries it.

**Acceptance Scenarios**:

1. **Given** an answer with a final decision, **When** the user records it, **Then** the ledger entry stores
   date, holding, action, quantity, price basis and currency, the question, and a reference to the run.
2. **Given** a ledger entry, **Then** it never changes the portfolio automatically and never triggers any
   request.
3. **Given** the ledger window, **Then** entries can be deleted, and every screen showing them says they are
   simulated.

---

### User Story 5 — See unsupported claims (Priority: P1)

Every number, ticker and date in an answer (and in each role's output) is checked against the facts that
were given to the model. Anything not found there is flagged in the UI as "근거 확인 안 됨", so the user does
not take it at face value.

**Why this priority**: The model can invent figures; the user must be able to see which parts are grounded.

**Independent Test**: Feed the checker committed answers with known supported and unsupported claims; every
unsupported one is flagged, no supported one is flagged.

**Acceptance Scenarios**:

1. **Given** an answer quoting "평단 71,000원" and the facts contain 71000 KRW, **Then** it is not flagged.
2. **Given** an answer quoting a price, percentage, ticker or date absent from the facts, **Then** it is
   flagged, and the dialog box shows how many claims were flagged.
3. **Given** the same answer and facts, **Then** the check gives the same result every time (deterministic).

---

### User Story 6 — Measure hallucination (Priority: P1)

A committed measurement set — a fictional portfolio, fictional prices and news, and 20–30 Korean questions,
including trap questions whose answer is not in the data — is run with the stand-in (deterministic) and with
the native model (repeated runs). A report gives grounding and trap-handling rates, and a verdict for the
maintainer.

**Why this priority**: The maintainer's question for this Feature is whether the in-browser model is usable.

**Independent Test**: Run the measurement with the stand-in: the report is produced and identical on a second
run. Run it natively (manual, installed Chrome): the report records every run and its rates.

**Acceptance Scenarios**:

1. **Given** the measurement set, **When** it runs with the stand-in, **Then** the report is reproducible
   byte-for-byte apart from timestamps.
2. **Given** a native measurement, **Then** the report states the model/browser, the number of repetitions,
   per-question results and the aggregate rates, and never mixes stand-in and native results.
3. **Given** a trap question, **Then** the answer counts as handled only if it says the data is not
   available (by the committed rule) and contains no unsupported claim.

### Edge Cases

- Question names a ticker the user does not hold: answer that it is not in the portfolio; no run.
- Question names two holdings: both are analysed, one run each, answers shown together.
- Empty portfolio: the question box explains that holdings must be added first.
- A run fails mid-overview: that holding shows failed; the overview continues unless the user cancels.
- The model returns non-Korean or mixed-language text: shown as returned; the language is recorded in the
  measurement.
- Numbers written differently (71,000 / 71000 / 7.1만 / ₩71,000 / "칠만 천원"): the checker's committed
  normalisation rules decide; forms it does not recognise are reported, not silently accepted.
- Facts too long for the model's context: the run records a context failure (typed) rather than truncating
  silently.
- Page reload during an overview: nothing resumes automatically; finished answers are not persisted unless
  recorded in the ledger.
- Storage unavailable: questions and analysis work; the ledger explains it cannot save.

## Requirements *(mandatory)*

### Functional Requirements

**Questions and holding selection**

- **FR-001**: The office MUST offer a Korean question input (keyboard operable) that starts analysis.
- **FR-002**: The app MUST determine the holdings a question concerns by deterministic matching of holding
  names and tickers in the question; if none match, the user MUST choose holding(s) or "전체" before any run.
- **FR-003**: A question naming an instrument the user does not hold MUST be answered with "보유하지 않은
  종목" and MUST NOT start a run. When the symbol directory is not available, not-held instruments cannot be
  recognised and such questions fall back to the holding picker (FR-002) (analyze C10).

**Single-holding analysis**

- **FR-004**: Each analysis run MUST concern exactly one holding and MUST give the model: the question, the
  holding facts (name, ticker, asset class, quantity, unit, average price, currency), market facts, news
  facts, and app-derived facts (latest price and unrealised change vs. average price when a latest price
  exists). Derived facts MUST be computed by the app, not by the model.
- **FR-005**: Market and news facts for portfolio analysis MUST come from committed fictional fixtures only,
  keyed by instrument, for all four asset classes (MD-8). A holding with no fixture entry has no market facts
  (FR-006). No new live data source is added; the existing demo live path (one US instrument via
  `/api/market`, FR-007) is unchanged.
- **FR-006**: When no market facts exist for a holding, the facts MUST say so explicitly; the model MUST NOT
  be given invented placeholder values.
- **FR-007**: The existing demo input (fixture and `?data=live` for the demo instrument) MUST keep working with
  unchanged evidence semantics; purely operational additions to `timing` (runtime create/shutdown times) are
  allowed (analyze C6).
- **FR-007a**: The 포트폴리오 window MUST offer "예시 포트폴리오", which replaces the holdings with the fictional
  measurement portfolio after an explicit confirmation when holdings exist (analyze C4).
- **FR-008**: The eight roles and their order MUST NOT change (no topology change). Role prompts MAY gain the
  question and holding facts; every prompt change MUST be recorded as an intentional adaptation of the
  Feature 004 prompts (Constitution XI).
- **FR-009**: The seven non-final roles MUST keep answering in English as today; the final answer shown to the
  user MUST be requested in Korean (MD-9). The answer's actual language MUST be recorded per run, and the
  measurement reports it (FR-019).

**Portfolio overview**

- **FR-010**: An overview MUST run one single-holding analysis per holding, sequentially, in portfolio order.
  Each run owns its own model runtime, as in Feature 004 (create after acquisition, shut down after
  settlement); reusing one runtime across runs is a Feature 011 experiment (analyze C1, research R3).
- **FR-011**: The office MUST show overview progress ("k / N", current holding) and per-holding state.
- **FR-012**: Cancel MUST stop the current run with the Feature 004 lifecycle guarantees and prevent further
  runs; finished answers stay.
- **FR-013**: A failed holding run MUST NOT stop the overview; its failure is shown in the summary.

**Grounding check**

- **FR-014**: A deterministic grounding checker MUST extract every number (with unit/currency/percent),
  ticker and date from each role output and from the final answer, and classify each as supported (present in
  the facts given to that run, after committed normalisation rules) or unsupported. Known tickers for extraction
  are the run's facts, the holdings and, when loaded, the symbol directory (analyze C2).
- **FR-015**: Unsupported claims MUST be flagged in the UI ("근거 확인 안 됨") on the answer, with a count in
  the dialog box; supported claims MUST NOT be flagged.
- **FR-016**: The checker MUST treat a number as supported only if it equals a fact value after normalisation
  (thousand separators, 만/억 units, currency symbols, % signs, rounding to the precision shown in the facts);
  forms it cannot parse MUST be reported as "unrecognised", never as supported.
- **FR-017**: Grounding results MUST be part of the run's evidence record.

**Hallucination measurement**

- **FR-018**: A committed measurement set MUST contain a fictional portfolio covering all four asset classes,
  fictional market and news facts, and 20–30 Korean questions: answerable single-holding, multi-holding, and
  at least 5 trap questions whose answer is not in the data, each with its expected handling.
- **FR-019**: A measurement run MUST produce a report per question and aggregate: runs completed, answers with
  zero unsupported claims, unsupported claims per answer, unrecognised claims, trap questions handled, answer
  language, run time; evidence class stated; stand-in and native never mixed.
- **FR-020**: The stand-in measurement MUST be deterministic and part of the automated suite; the native
  measurement MUST be a manual, documented run in installed Chrome with at least 3 repetitions per question.
- **FR-021**: The report MUST give a verdict for the maintainer using the rule in SC-007 and MUST NOT claim
  trading quality.

**Paper-trade ledger**

- **FR-022**: Users MUST be able to record a final decision as a paper trade (date, holding, action buy/sell/
  hold, quantity, price basis and currency, question, run reference). A recorded entry cannot be edited; it
  can only be deleted (analyze C9).
- **FR-023**: The ledger MUST be stored only in this browser, labelled simulated everywhere it appears, and
  MUST NOT change the portfolio or trigger any request.

**Privacy, evidence and lifecycle**

- **FR-024**: Holdings, questions, answers and the ledger MUST NOT be sent to any server; the only request per
  run remains the market-data request for a symbol (live mode), carrying the symbol only.
- **FR-025**: This re-specifies Feature 009 FR-012 for analysis: holding facts used by a run MAY appear in that
  run's local evidence record and replay text (they are the model's input); they MUST NOT appear in any
  request or log; committed evidence MUST use only the fictional measurement portfolio.
- **FR-026**: Per run, acquisition before runtime creation, 8 logical requests, cancellation and settlement
  before shutdown MUST hold as in Features 004 and 007.
- **FR-027**: AkariSP observations during overviews (queue depth, admission, cancellation latency, runtime
  reuse, context-length failures) MUST be recorded as dogfooding evidence; AkariSP changes MUST be 0 unless a
  finding with evidence (Constitution V).
- **FR-028**: The office MUST show which holding a run concerns; narration and role states keep the Feature
  008/009 rules (no role-level inference/queue claims).
- **FR-029**: Every answer, overview summary and ledger view MUST state that it is analysis, not investment
  advice, and that no order is placed.
- **FR-030**: Changes to `src/main.ts` and `runGraph` MUST be limited to the analysis input and multi-run
  orchestration, with the new hashes recorded and the Feature 004/007 lifecycle tests passing unchanged.

### Key Entities

- **Question**: Korean text, time, the holdings it resolved to.
- **Holding facts**: the Feature 009 holding plus app-derived values for one run.
- **Fact set**: every fact given to one run (holding, market, news, derived), each with a stable id.
- **Analysis run**: one holding, its fact set, role outputs, final answer, grounding result, evidence.
- **Overview**: an ordered list of analysis runs with progress and a summary.
- **Claim**: a number, ticker or date found in an output, with its status (supported, unsupported,
  unrecognised) and matching fact id.
- **Paper trade**: date, holding, action, quantity, price basis, currency, question, run reference; simulated.
- **Measurement set / report**: committed questions with expected handling; per-question and aggregate
  results for one evidence class.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every committed single-holding question, the stand-in run analyses exactly the expected
  holding(s) and shows the answer with its facts (100 %).
- **SC-002**: The grounding checker classifies a committed set of at least 60 labelled claims (supported,
  unsupported, unrecognised, across all normalisation forms) with 100 % agreement with the labels.
- **SC-003**: Every unsupported claim in a displayed answer is visibly flagged; 0 supported claims are flagged
  (committed examples).
- **SC-004**: An overview of 5 fictional holdings with the stand-in completes 5 runs in order; cancelling
  during run 3 leaves 2 answered, 1 cancelled, 2 not run, with settlement before shutdown each time.
- **SC-005**: 0 requests, headers or logs contain holding values, question text, answers or ledger entries
  (sentinel test, as Feature 009 SC-005).
- **SC-006**: The stand-in measurement report is identical across two runs apart from timestamps.
- **SC-007**: A native measurement (≥ 3 repetitions × every question) is recorded with the verdict rule:
  **USABLE** if ≥ 90 % of completed answers have zero unsupported claims and ≥ 80 % of trap questions are
  handled; **LIMITED** if ≥ 70 % and ≥ 50 %; otherwise **NOT_YET**. The verdict informs the maintainer; it does
  not gate implementation completion.
- **SC-008**: Existing deterministic, browser and native suites pass; the demo fixture and live modes keep
  their evidence semantics; the native fixture gate still completes 8/8.
- **SC-009**: A paper trade recorded after a run survives reload and is shown as simulated on every screen
  (100 %).
- **SC-010**: AkariSP changes 0; graph topology changes 0; every prompt change listed as an adaptation.

## Constraints

- Constitution VIII: no success criterion concerns decision correctness, returns or PnL. The ledger has no
  valuation or PnL in this Feature.
- Constitution IX: no broker or order path; any new live data source needs research and maintainer approval
  before a real request (Feature 007/009 practice).
- Constitution VI: stand-in and native evidence are reported separately; native claims need native runs.
- Constitution XI: prompt and input changes are adaptations of the Feature 004 reference and are recorded.

## Assumptions

- Holding selection from question text is deterministic string matching on names and tickers; no model call
  decides which holdings to analyse.
- Answers are not persisted except through the ledger (and local evidence/replay text).
- Native measurement runs are long (about a minute per holding run); it is a manual job, not CI.
- Gemini Nano's context limit is small; the fact set per run is kept short, and one run concerns one holding.
- The trap-question "handled" rule is a committed list of Korean and English "not available" phrasings plus
  zero unsupported claims; borderline cases are reviewed by hand and recorded.

## Non-Goals

- Continuous or background monitoring; alerts.
- Valuation, PnL, performance of the portfolio or the ledger.
- Any real or simulated order placement, broker or exchange integration.
- Large-scale benchmark across models, prompts or settings (Feature 011 reuses this Feature's set and checker).
- New AkariSP APIs.

## Roadmap context

- Feature 009 delivered the shell, portfolio and directory. This Feature makes analysis portfolio-aware and
  measures grounding. Feature 011 (Effectiveness Benchmark) reuses the measurement set and checker.
