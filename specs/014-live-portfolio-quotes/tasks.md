---
description: "Task list for Feature 014 — Live Quotes for Portfolio Analysis"
---

# Tasks: Feature 014 — Live Quotes for Portfolio Analysis

**Input**: Design documents from `specs/014-live-portfolio-quotes/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R11), data-model.md, contracts/quotes.md, quickstart.md

**Tests**: included — SC-001–SC-007 are verified by unit tests, stand-in browser tests and an opt-in real check.

**Gates**: the real Yahoo check (T024) needs the maintainer's approval; every commit needs approval.

## Phase 1: Setup

- [X] T001 Record the baseline in specs/014-live-portfolio-quotes/verification.md: branch base (`main` `40fbdf2`, merge of Feature 013 PR #15), AkariSP 0.1.0-alpha.2 untouched, `npm run typecheck`, `npm test`, `npm run test:browser` results, and the facts of the 25-question set under the fixture (sha256 of `toInput(…,'current')` for every question × holding) as the byte-identity reference for SC-002

## Phase 2: Foundational (blocks US1 and US2)

**Purpose**: the server can quote holding symbols; the stand-in can serve them.

- [X] T002 [P] Write tests first in test/market-bundle.test.ts: `yahooSymbol` per data-model.md "SourceSymbol" (KOSPI `005930` → `005930.KS`; KOSDAQ → `.KQ`; KONEX → null; ETF with market `KOSPI` → `.KS`; US `BRK.B` → `BRK-B`; US must match `^[A-Z]{1,5}(-[A-Z]{1,2})?$` else null; BTC KRW → `BTC-KRW`, USD → `BTC-USD`; `KRX-GOLD` → null); `symbolInstrument(symbol)` → currency and time zone (`.KS/.KQ` KRW Asia/Seoul; US USD America/New_York; `BTC-KRW` KRW UTC; `BTC-USD` USD UTC; anything else null; `IBM` accepted); `validateBundle` requires `range52w` with "finite, `low > 0`, `low ≤ latest.low`, `high ≥ latest.high`"
- [X] T003 [P] Write tests first in test/market-route.test.ts: a symbol outside the forms → 400 `invalid-request` and 0 outbound requests; KR and BTC symbols reach the adapter with their zone; `meta.currency` different from the form's currency → `invalid-data`; crypto drops the analysis-date (UTC) bar at any hour (R3); `range52w` = unadjusted max high / min low of the sessions within one calendar year before the analysis date (R4, F014-R2); second request for the same symbol and analysis date → 0 outbound requests, a failure is not cached (R7); the route's console output never contains the requested symbol (FR-018)
- [X] T004 src/market-bundle.ts: `yahooSymbol(instrument, currency)`, `symbolInstrument(symbol)` (R1, R2), `range52w` in `MarketBundle`, `validateBundle` and `canonicalBundle` (R4); `LIVE_INSTRUMENT` unchanged
- [X] T005 src/server/market-provider.ts: `meta.currency` check (R2), crypto unfinished-session rule (R3), `range52w` computed from the adjusted sessions (R4); Yahoo field names stay in this file
- [X] T006 app/api/market/route.ts: accept `symbolInstrument(symbol)` forms only (400 before any fetch), analysis date in the symbol's zone, module-level cache `<symbol>|<analysisDate>` of successful bundles, at most 256 entries, oldest dropped (R7, `ponytail:` comment); the log line stays `{ adapter, ms, status, kind }` without the symbol (FR-018)
- [X] T007 test/fixtures/market/stub-bodies.ts and e2e/market-stub.mjs: the chart reply takes its `exchangeTimezoneName`, `currency` and bar timestamps from the requested symbol's form (KR Asia/Seoul KRW, BTC UTC with weekend sessions, US as today); `/__stats` counts requests per symbol; scenarios can target one symbol (e.g. `{ name: 'fail', symbol: 'ZZ' }`)

**Checkpoint**: `npm test` passes T002/T003; the demo live path (IBM) is unchanged.

## Phase 3: User Story 1 — Answers about my holdings use real recent prices (P1) 🎯 MVP

**Goal**: real holdings get live facts in the fixture's shape; the answer names source and date.

**Independent Test**: stand-in serving known sessions for a KR, a US and a BTC holding; every market number in the
facts equals the value computed from the served sessions; the answer shows `시세 기준: <date> (Yahoo)`.

- [X] T008 [P] [US1] Write tests first in test/quotes.test.ts: `liveInstrumentFacts(bundle)` → `latestPrice` = latest close, `asOf` = `marketAsOf`, the three market lines of R6 exactly (20-session change with one decimal and rose/fell; above/below the 50-day average with `money()`; 52-week high and low with `money()`), news `['No news is supplied for this holding.']`; `liveFixture(quotes)` id `yahoo-live` and only quoted holdings; `factSet(h, liveFixture(…))` for a KR holding gives H1–H3, D1–D3, M1–M3, N1 with values from the bundle; `fetchQuotes` with a fake `fetch`: one request per distinct symbol, parallel, no request for a non-quotable holding, abort rejects
- [X] T009 [US1] src/quotes.ts: `liveInstrumentFacts`, `liveFixture`, `fetchQuotes(holdings, signal)` per contracts/quotes.md (validates each bundle with `validateBundle`; a bundle whose currency differs from the holding's → `currency-mismatch`)
- [X] T010 [US1] components/Shell.tsx: `quotesMode()` from `?quotes=` (default `live`); in `analyse()`, live mode fetches quotes first, then each run uses `factSet(h, liveFixture(quotes))`; the `bta-analyze` detail carries `dataSource` (data-model.md "Analysis dataSource", with `snapshotDigest` from `src/market-bundle.ts`)
- [X] T011 [US1] src/main.ts: record `analysis.dataSource` from the detail instead of the fixed `{ mode: 'portfolio-fixture', … }`; demo paths unchanged
- [X] T012 [US1] components/Answer.tsx: source line per answer — `시세 기준: <marketAsOf> (Yahoo)` for quoted runs (text, not colour only)
- [X] T013 [US1] e2e/live-quotes.spec.ts (new): seed a real-looking KR (KOSPI), US and BTC-in-KRW holding; ask about each with the stand-in model; assert the record's facts' market numbers equal those computed from `test/fixtures/market/stub-bodies.ts` for that symbol, `dataSource.mode === 'portfolio-live'` with provider and date, and the source line (SC-001); the record's input `marketFacts`, `newsFacts` and `holdingFacts` contain only the fact texts of `analysis.facts` (FR-007)
- [X] T014 [US1] Adaptation record A-014-1 in specs/014-live-portfolio-quotes/verification.md (Constitution XI): upstream Market Analyst's 12 indicators vs the three portfolio market measures (spec option A); demo live path still renders all 12

**Checkpoint**: MVP — a real holding is analysed on live facts end to end (stand-in).

## Phase 4: User Story 2 — Honest answers when a quote is unavailable (P1)

**Goal**: any unavailability → "market data not available", never fixture values; cancel stops the quote phase.

**Independent Test**: stand-in failure / invalid body / hang for one symbol; the run completes without market facts,
no fixture value appears, evidence names the kind.

- [X] T015 [US2] components/Shell.tsx and src/quotes.ts: non-quotable holdings make no request; a failed quote gives `dataSource: { mode: 'portfolio-live', symbol, unavailable: kind }` and the existing "Market data not available" facts; `#cancel` during the quote phase aborts `fetchQuotes`, starts no run and shows the answer window as cancelled; components/Answer.tsx shows `시세 없음: <reason>` (Korean reasons for not-quotable, network/timeout, invalid-data, currency-mismatch, unavailable)
- [X] T016 [US2] e2e/live-quotes.spec.ts: KRX gold → 0 stand-in requests for it and "시세 없음"; one symbol failing in a 3-holding overview → that holding without market facts, the others quoted; invalid body → `invalid-data`; hang + cancel → no run starts and the quote phase ends within 1 s; no fixture value (e.g. `91,250,000`) appears in any live record (SC-003, SC-004)
- [X] T017 [US2] e2e/live-quotes.spec.ts: the same holding asked twice → the second question makes 0 stand-in requests (SC-005); quote phase with a responding stand-in adds ≤ 5 s before the first run (SC-004)

**Checkpoint**: live mode fails visibly and safely.

## Phase 5: User Story 3 — Measurement and example stay reproducible (P1)

**Goal**: fixture everywhere it was before; no network in the existing suites.

**Independent Test**: existing browser suite and stand-in measurement pass unchanged with 0 market requests.

- [X] T018 [US3] components/Shell.tsx: loading the example portfolio sets `quotes=fixture` in the URL with `history.replaceState` (R8); saving holdings from the editor removes `quotes` (back to `live`, FR-002); `quotesMode()` reads it at run time
- [X] T019 [US3] Pin `quotes=fixture` where holdings are seeded without the example button: e2e/prompt-api.spec.ts (measurement and harness capture URLs), e2e/reuse.spec.ts, e2e/analysis.spec.ts, e2e/a11y.spec.ts, e2e/app.spec.ts, e2e/onboarding.spec.ts, e2e/directory.spec.ts — audit each portfolio run; e2e/measure.ts keeps using the example button
- [X] T020 [US3] e2e/live-quotes.spec.ts: with `quotes=fixture` every question of the measurement set yields facts whose sha256 equals the T001 reference and the stand-in counts 0 requests; the demo `?data=live` run still requests `IBM` only (SC-002); load the example, then add a real BTC holding through the editor → the run is `portfolio-live` and no fixture price appears (FR-002, analysis C2)

**Checkpoint**: Feature 013 results remain comparable.

## Phase 6: User Story 4 — Research use is clear (P2)

**Goal**: notice and source line on every answer; no fixture price in a live paper trade.

**Independent Test**: answers from a live and a fixture run both carry the notice; the fixture one says `가상 예시 데이터`.

- [X] T021 [US4] components/Answer.tsx: one notice `연구용이며 투자 조언이 아닙니다. 시세 조회를 위해 보유 종목 코드가 서버와 Yahoo로 전송됩니다.` (FR-012, FR-018) in the answer window; fixture runs' source line `가상 예시 데이터`; e2e/live-quotes.spec.ts asserts both on live and fixture answers (SC-007)
- [X] T022 [US4] FR-017: src/ledger.ts `source: 'latest-fixture' | 'latest-live' | 'average'`; components/Shell.tsx `recordTrade` uses the run's live latest price for live runs (from its facts' D1), the fixture price only for fixture runs, else the average; components/Ledger.tsx label `최신 시세`; test/ledger.test.ts accepts the new source

## Phase 7: Polish & Cross-Cutting

- [X] T023 Run `npm run typecheck && npm test && npx next build && npm run test:browser` and the native gate `npm run test:prompt-api`; record in verification.md
- [X] T024 **APPROVAL REQUIRED** Real Yahoo check (FR-016, SC-006): opt-in test `real Yahoo L6: live portfolio quotes (BTA_REAL_YAHOO=1 only)` in e2e/app.spec.ts (stand-in model, real `/api/market`) over ≥ 5 real KR and US holdings supplied at run time (never committed); hand-compare every market number with Yahoo's chart for the quote date; confirm R2's time zones and currencies; report rule/hand agreement on unsupported numbers; no verdict; record in verification.md without committing any real quote
- [X] T025 [P] Update docs/testing.md (quotes mode, stand-in per-symbol replies, L6 check) and docs/roadmap.md (014 status)
- [X] T026 Present results to the maintainer; note Yahoo Terms §2.4 stays recorded, not resolved (FR-015)

**Changed after the real check (T024)**: BTC is not quotable (F014-R3) and the crypto session rule was removed —
the BTC parts of T002, T003, T007 and T013 now assert "not quotable"; the 52-week range is unadjusted over one
calendar year before the analysis date (F014-R2); all-null bars are dropped (F014-R1). See verification.md.

## Dependencies & Execution Order

- T001 → Phase 2 (T002, T003 parallel → T004 → T005 → T006; T007 after T004) → US1 (T008 → T009 → T010 → T011 → T012 → T013; T014 any time) → US2 (T015 → T016 → T017) → US3 (T018 → T019 → T020) → US4 (T021, T022) → T023 → T024 (approval) → T025, T026.
- **Run T018 and T019 immediately after T010** (before any `npm run test:browser`): T010 makes `live` the default, and the existing suites seed holdings directly.

## Parallel Example

```text
T002 test/market-bundle.test.ts | T003 test/market-route.test.ts
T008 test/quotes.test.ts        (after T004)
T025 docs                       (after T023)
```

## Implementation Strategy

- MVP: Phase 2 + US1 (a real holding answered on live facts with the stand-in).
- Then US2 (safe failures) and US3 (fixture pinning) — both required before the default `live` ships.
- US4 and the approval-gated real check close the Feature.
