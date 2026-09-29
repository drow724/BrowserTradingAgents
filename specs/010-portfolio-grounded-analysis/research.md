# Research: Feature 010 — Portfolio-Aware Analysis with Grounding Checks

Sources: the local tree at `e9b2425` (`src/main.ts`, `src/graph/*`, `src/integration/*`, `test/standin.ts`,
Feature 004/007/008/009 specs), the constitution. No network research was needed; no external request made.

## R1 — Where portfolio input enters the graph

- **Finding**: the graph state input is `TradingFixture = { id, subject, marketFacts, newsFacts }`; each role's
  prompt is its `ask` plus one line per key in its static `reads` list (`promptFor`). Evidence records each
  role's `reads`.
- **Decision**: extend the input with two optional fields, `holdingFacts` and `question`. A role's prompt gets
  a line for an extra key only when the run's input has it (`readsFor(role, input)` = static `reads` + the
  portfolio extras below). Demo runs (fixture, live) have neither field, so **their prompts and evidence `reads`
  stay byte-identical** (FR-007).
  - Extras: `holdingFacts` → marketAnalyst, researchManager, trader, riskReviewer, finalDecisionMaker;
    `question` → finalDecisionMaker only.
  - The final role, when `question` is present, gets one more instruction: answer the user's question in
    Korean in at most three sentences, using only the facts given (MD-9). The other roles keep English.
- **Topology**: unchanged (FR-008). Prompt changes are recorded as adaptation A-010-1 (Constitution XI).
- **Alternatives**: packing holding facts and the question into `subject`/`marketFacts` strings (no graph
  file change) — rejected: hides the adaptation and cannot make only the final answer Korean.

## R2 — How the shell starts a portfolio run

- **Finding**: `src/main.ts` runs once per click on `#run`, writes the status surface, evidence and result; the
  shell (Feature 009) and view (Feature 008) only observe it.
- **Decision**: the shell dispatches a `bta-analyze` CustomEvent on `#run` with the analysis input; `src/main.ts`
  handles it with the same `run()` path, using that input instead of the demo input, and dispatches `bta-done`
  with the finished record. One run at a time, as today (Run is disabled while running).
- **Alternatives**: a global function on `window` (a production hook); moving orchestration into React
  (rewrites the lifecycle block) — rejected.

## R3 — Runtime per overview (spec FR-010) — finding P-1

- **Finding**: Feature 004's contract is "one graph run owns one AkariSP runtime", created after acquisition
  and shut down after settlement. An overview is N sequential runs; nothing is concurrent across holdings.
- **Decision**: keep one runtime per run. An overview is N ordinary runs driven by the shell. The dogfooding
  evidence recorded per overview: runtime create and shutdown time per run, settle-before-shutdown per run,
  cancellation latency (Cancel click → `done:`), and context-length failures.
- **P-1** (resolved by analyze C1, 2026-09-29): spec FR-010 said "through one model runtime per overview";
  it now says one runtime per run, with runtime reuse across runs left to Feature 011.
- **Honest limit**: sequential runs do not grow AkariSP's queue beyond the existing fan-out (active 1, queued 1).
  Queue depth and backpressure need concurrent callers — not in this Feature's user stories.

## R4 — Facts for a holding (MD-8)

- **Decision**: a committed fictional **portfolio fixture** (`portfolio-fixture@1`) holds market and news facts
  keyed by instrument identity for the fictional measurement portfolio (all four asset classes). A real user's
  holding without a fixture entry gets the explicit fact "시장 데이터 없음 (market data not available)"; no value
  is invented (FR-006). Consequence: until live data exists for more instruments, analysis of real holdings is
  limited to the user's own position facts. Stated in the UI.
- **Derived facts** (app-computed, FR-004): latest price (from the fixture), unrealised change in % vs. average
  price (2 decimals), position value (quantity × latest price, currency of the holding). Every fact line carries
  an id (`H1…` holding, `D1…` derived, `M1…` market, `N1…` news) for grounding and evidence.

## R5 — Grounding checker

- **Decision**: one pure module; the same extractor runs over the fact set (to build the supported set) and over
  each output. Claim types:
  - **number**: digits with optional thousand separators and decimals, with unit or currency: `%`, `원`, `₩`,
    `KRW`, `$`, `USD`, `g`, `BTC`, `주`, `shares`; Korean magnitude suffixes `만`, `억` (7.1만 → 71000).
  - **ticker**: tokens that are tickers in the fact set, the holdings or the directory (6-digit KR codes,
    upper-case US symbols).
  - **date**: `YYYY-MM-DD`, `YYYY.MM.DD`, `YYYY년 M월 D일`.
- **Supported**: equal to a fact value after normalisation, rounding the output value to the fact's shown
  precision. **Unrecognised**: Korean numeral words (e.g. "칠만"), ranges and ratios the rules do not parse.
  **Ignored** (committed rule): bare integers ≤ 10 with no unit (counts like "three reasons", "Step 2").
- Every rule is covered by the labelled claim set (SC-002, ≥ 60 claims).
- **Alternatives**: asking a model to judge grounding — rejected (not deterministic, FR-014).

## R6 — Measurement

- **Stand-in**: the stand-in echoes its prompt (`stand-in reply to: …`), so every stand-in output quotes the
  facts: the stand-in measurement proves the pipeline end-to-end and its determinism (SC-006), not model
  quality. Checker precision is proven by the labelled claims (SC-002).
- **Native**: an opt-in test (`BTA_MEASURE=1`, installed Chrome, fixture only, no network data) runs every
  question ≥ 3 times and writes the report; the committed evidence is the report of the fictional portfolio only.
- **Trap handled** (committed rule): the final answer contains one of the committed "not available" phrasings
  (`자료에 없`, `정보가 없`, `알 수 없`, `확인할 수 없`, `not available`, `no data`, `cannot determine`) and has zero
  unsupported claims. Borderline answers are listed for manual review in the report.
- **Budget**: about one minute per native run (Feature 004/008 evidence); 25 questions × 3 ≈ 75 runs ≈ 75–90 min.

## R7 — Holding resolution from a question

- **Decision**: deterministic matching, in order: "전체", "포트폴리오 전체", "모든 종목" → all holdings; holding
  names (case-insensitive, whitespace-normalised) and tickers found in the question → those holdings; else a
  directory entry name/ticker found → "보유하지 않은 종목" (no run); else ask the user to choose. Longest match
  wins so "삼성테스트전자우" does not match "삼성테스트전자".

## R8 — Paper-trade ledger

- **Decision**: `localStorage["bta.ledger"]`, `{ version: 1, entries[] }`, whole-document writes, same guards as
  the portfolio. Price basis = the latest fixture price when the run had one, else the average price, labelled
  which. No valuation, no PnL (Constitution VIII).

## R9 — Evidence and privacy

- A portfolio run records `analysis: { holding: identity, question, factSetId, facts[], grounding }` and keeps the
  full role outputs (FR-025: local only). It makes **no network request** (fixture facts; no `/api/market`).
- The committed native evidence uses the fictional portfolio only.
