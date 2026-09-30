# Research: Feature 014 — Live Quotes for Portfolio Analysis

All decisions below were taken from the code at `f6186d0` (Feature 013 branch) and the brainstorming decisions in
spec.md. Values marked *to confirm* are checked by the opt-in real Yahoo run; a wrong assumption fails visibly
(`invalid-data`), never silently.

## R1 — Source symbol from a holding

- Decision: `yahooSymbol(instrument, currency)`:
  - KR listing: `market` KOSPI → `<ticker>.KS`, KOSDAQ → `<ticker>.KQ`; KONEX or anything else → not quotable.
    ETF/ETN entries carry `KOSPI` in the directory (Feature 009 parse) → `.KS`.
  - US listing: ticker with `.` replaced by `-` (Yahoo writes class shares as `BRK-B`); must match
    `^[A-Z]{1,5}(-[A-Z]{1,2})?$`, else not quotable.
  - BTC: not quotable — the real check found Yahoo's `BTC-KRW` daily bars internally inconsistent (F014-R3,
    maintainer 2026-09-30); planned as `BTC-KRW/BTC-USD` by currency before that.
  - KRX gold spot: not quotable (no Yahoo symbol; spec Clarifications).
- Rationale: every input is already on the holding (Feature 009 stores `market`); no lookup service.
- Alternatives: search the Yahoo symbol endpoint (another unofficial call, rejected); map KONEX to `.KQ` (wrong
  market, rejected).

## R2 — What the route accepts

- Decision: `/api/market?symbol=` accepts exactly the forms of R1 (one regex per form) and derives the instrument
  configuration from the form: `.KS/.KQ` → KRW, `Asia/Seoul`; US → USD, `America/New_York`. Anything else → 400 `invalid-request` before any outbound call. `IBM` (the demo's
  `LIVE_INSTRUMENT`) matches the US form, so the demo path is unchanged.
- The adapter already rejects a bar set whose `meta.exchangeTimezoneName` differs from the expected zone; it also
  rejects a `meta.currency` that differs from the expected currency (new check) → `invalid-data`.
- Confirmed by the real check: Yahoo reports `KRW`, `Asia/Seoul` for KRX listings.
- Rationale: the server calls an external host with a request-supplied value; an allowlist is the trust boundary.

## R3 — Unfinished session per market

- Decision: Feature 007's rule for every accepted symbol (the analysis-date bar is dropped before 16:00 exchange time;
  KRX closes 15:30, so the rule holds for KRX). A crypto rule was planned and removed with BTC (F014-R3).

## R4 — Bundle additions

- Decision: the bundle gains `range52w: { high, low }` — the maximum **unadjusted** high and minimum unadjusted low
  over the sessions within one calendar year before the analysis date (Yahoo's own 52-week window), as quote pages and brokers show it (F014-R2, changed
  after the real check; the 20-session change and the 50-day average stay on adjusted closes). The 20-session change and the 50-day average come
  from existing fields (`recent` has 30 sessions; `indicators.close_50_sma`). `validateBundle` checks `range52w`
  (finite, low ≤ latest low, high ≥ latest high).
- Rationale: the server already holds ≥ 260 sessions but only exports 30; computing the range there keeps the
  bundle small.
- Alternatives: export all sessions (larger response, no need).

## R5 — Short history

- Decision: keep Feature 007's minimum of 260 sessions; below it the quote is `unavailable` (insufficient history)
  and the holding is analysed without market facts. Spec edge case updated accordingly.
- Rationale: one rule, no partial windows. Recently listed holdings are rare in the maintainer's portfolio.

## R6 — Live facts text

- Decision: `liveInstrumentFacts(bundle)` returns `InstrumentFacts` (fixture shape): `latestPrice` = latest close,
  `asOf` = `marketAsOf`, `currency` from the bundle, and market lines in the fixture's English style:
  - `The price rose|fell X.X% over the last 20 sessions.` (one decimal, as the fixture)
  - `The price is above|below its 50-day moving average of <money>.`
  - `The 52-week high is <money> and the 52-week low is <money>.`
  and news `['No news is supplied for this holding.']`. Money uses the existing `money()` (KRW whole units, USD two
  decimals). `factSet` then adds holding facts, latest price, unrealised change and position value as today.
- Rationale: same shape → Feature 013's references, formats and checker apply unchanged (FR-007); every number any
  role sees is in the facts (the Market Analyst reads `marketFacts`, which are these lines).
- Adaptation A-014-1 (Constitution XI): upstream's Market Analyst reads 12 indicators; here the portfolio facts keep
  three market measures (spec option A). The demo graph's live path (Feature 007) still renders all 12.

## R7 — Cache

- Decision: a module-level `Map` in the route, key `<symbol>|<analysisDate>`, successful bundles only, at most 256
  entries (oldest dropped). Failures are never cached.
- The demo instrument (`IBM`, Feature 005/007) stays uncached: Feature 007's contract and its controlled
  scenario tests rely on one source request per demo run (found during implementation).
- Rationale: FR-010 per server instance; serverless instances each keep their own (acceptable; SC-005 is measured on
  one instance).
- ponytail: in-memory, per instance; a shared store only if a public deployment makes source calls matter.

## R8 — Selecting the source

- Decision: `quotes=live|fixture` read from the URL at run time (like `numbers`), default `live`. Loading the example
  portfolio sets `quotes=fixture` in the URL (`history.replaceState`), so the example keeps fictional facts until the
  user leaves it. Tests that seed holdings directly (not via the button) add `quotes=fixture`; the native
  measurement URL adds it too.
- Saving holdings from the editor (`persist` not called by the example button) removes `quotes` from the URL, so
  a real holding entered after the example never gets fixture prices (analysis C2).
- Rationale: BTC and KRX gold ids are shared between the example and real holdings, so the holdings alone cannot
  decide the source.
- Alternatives: decide by fictional tickers (fails for BTC/KRX gold, rejected); a stored flag (more state, rejected).

## R12 — Privacy of the symbol (spec FR-018)

- Decision: only the source symbol leaves the browser, in the same-origin request; the server forwards it to the
  source. The route log line stays `{ adapter, ms, status, kind }`. The answer notice adds that holding symbols are
  sent for quote lookup. Feature 010 FR-025 is re-specified for this one purpose.
- Rationale: a quote cannot be fetched without naming the instrument; everything else stays in the browser.

## R9 — Quote phase and cancel

- Decision: `analyse()` in the Shell, in `live` mode, first calls `fetchQuotes(holdings, signal)`: one request per
  distinct quotable symbol, all in parallel, each with the existing 20 s adapter limit on the server and a browser
  `AbortController`; `#cancel` aborts it and no run starts (the answer window says it was cancelled). Then every run
  uses `factSet(h, liveFixture(quotes))`.
- Record: the `bta-analyze` detail gains `dataSource`; `src/main.ts` records it instead of the fixed
  `portfolio-fixture` entry: `{ mode: 'portfolio-live', provider, symbol, marketAsOf, snapshotDigest }` or
  `{ mode: 'portfolio-live', unavailable: <kind> }`; fixture runs stay `{ mode: 'portfolio-fixture', fixture }`.

## R10 — Answer window and ledger

- Decision: each answer shows `시세 기준: <date> (Yahoo)`, `시세 없음: <reason>` or `가상 예시 데이터` and one notice
  `연구용이며 투자 조언이 아닙니다.` A paper trade from a live answer uses that run's latest price
  (`source: 'latest-live'`), else the average price; a fixture price is used only for fixture runs.

## R11 — Verification

- Automated: unit tests with the controlled chart bodies (R1–R7); Playwright with the market stand-in serving
  per-symbol zones and currencies (KR, US, BTC and gold not requested, failure, invalid body, hang + cancel, cache,
  fixture byte-identical to Feature 013).
- Real: `BTA_REAL_YAHOO=1` opt-in run on ≥ 5 real holdings (KR and US) with maintainer approval; each market number
  compared by hand with Yahoo's own chart for the quote date; rule/hand agreement on unsupported numbers reported;
  no verdict. *To confirm* items of R2 are recorded there.
