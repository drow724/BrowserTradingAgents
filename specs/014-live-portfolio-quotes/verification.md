# Verification: Feature 014 — Live Quotes for Portfolio Analysis

## T001 — Baseline (2026-09-30)

| Item | Value |
|---|---|
| Base | `main` `40fbdf2` (merge of Feature 013, PR #15); branch `014-live-portfolio-quotes` |
| AkariSP | 0.1.0-alpha.2, public API only, not touched |
| `npm run typecheck` / `npm test` | 0 / 172 tests: 171 pass, 1 skipped (Feature 013 commit `f6186d0`, same tree) |
| `npm run test:browser` | 83 passed, 1 skipped (Feature 013) |
| Fixture facts reference (SC-002) | 25 questions × expected holdings × 3 number modes = 99 inputs; sha256 of `[question, holding, mode, factSet(h), toInput(…)]` lines = `sha256:12e42276354494221a26f0fc1cb59c26698f8262bc2ecdb73ee3fa9e2586f66b` (asserted in `test/quotes.test.ts`) |

## A-014-1 — Adaptation record (Constitution XI, T014)

| | Upstream Market Analyst (yfinance) | Feature 014 portfolio facts |
|---|---|---|
| Data | Daily OHLCV + 12 indicators (stockstats) | Same daily bars (Feature 007 adapter), 3 derived measures |
| Measures | 10 EMA, 50/200 SMA, MACD ×3, RSI, Bollinger ×3, ATR, VWMA | 20-session change, position vs 50-day SMA, 52-week high/low |
| Reason | – | Keep the Feature 010 fact shape so the checker, number modes and measurement stay comparable (spec option A); fewer numbers, fewer chances for copy/conversion errors |

- The demo graph's live path (Feature 007, `?data=live`) still renders all 12 indicators; unchanged.

## Changes found during implementation

- **Cache scope**: the demo instrument (`IBM`) stays uncached — Feature 007's contract ("no caching") and its
  controlled scenario tests depend on one source request per demo run. Only holding symbols are cached (R7,
  contracts/quotes.md updated).
- **Cache location**: a Next.js route file may only export route fields, so the cache and `clearQuoteCache()` (for
  tests) live in `src/server/market-provider.ts` (`quote()`), not in the route.
- The Feature 007 route test "no caching" is kept for `IBM`; a new test covers the holding-symbol cache.
- The answer notice replaces the Feature 010 text "분석이며 투자 조언이 아닙니다…" with "연구용이며 투자 조언이 아닙니다. 실제
  주문은 하지 않습니다. 시세 조회를 위해 보유 종목 코드가 서버와 Yahoo로 전송됩니다." (FR-012, FR-018); one e2e text assertion updated.
- Existing e2e files that seed holdings directly now open `quotes=fixture` (T019): a11y, analysis, app, directory,
  office, onboarding, reuse, measurement, prompt-api (measurement, capture, reuse comparison).

## T023 — Regression (2026-09-30)

| Check | Result |
|---|---|
| `npm run typecheck` | 0 |
| `npm test` | 186 tests: 185 pass, 1 skipped (+14: symbol rules, range52w, route forms/cache/crypto/currency/privacy, live facts, quote phase, SC-002 digest, ledger) |
| `npm run test:browser` (includes `next build`) | **88 passed, 1 skipped** (+5: `e2e/live-quotes.spec.ts`) |
| `npm run test:prompt-api` (native gate) | 2 passed, 4 skipped (opt-in) |

| Criterion | Evidence | Result |
|---|---|---|
| SC-001 live facts equal values from the served sessions | `live-quotes.spec.ts` T013 (KR, US, BTC) | PASS (stand-in) |
| SC-002 fixture byte-identical, 0 requests | `test/quotes.test.ts` digest = T001 reference; T020 example: 0 stand-in requests | PASS |
| SC-003 failures visible, no fixture value | T016: not-quotable, provider-error, invalid-data; no example value in live records | PASS |
| SC-004 quote phase ≤ 5 s, cancel ≤ 1 s | T017 (click → run start), T016 cancel | PASS (stand-in) |
| SC-005 repeated question → 0 source requests | T017: `{ NVDA: 1 }` after two runs | PASS |
| SC-006 real source hand audit | T024 | pending (approval) |
| SC-007 notice and source line on every answer | T013, T016, T020 | PASS |
| FR-018 symbol never in server logs | `test/market-route.test.ts` privacy test | PASS |

## T024 — Real Yahoo check, run 1 (2026-09-30, maintainer approval; not committed: raw data, records)

- `BTA_REAL_YAHOO=1 npx playwright test --project=chromium -g "real Yahoo L6"`: 1 passed (9.6 s), stand-in model,
  Playwright Chromium 153; 5 server → Yahoo chart requests; 0 browser → Yahoo requests.
- Then, for diagnosis and the audit: 1 raw chart request for `005930.KS` and 3 for ORCL / AAPL / MSFT from this
  machine (the built-in browser was refused for finance.yahoo.com, so the audit recomputes each value from Yahoo's
  own raw chart response with separate code, not through the adapter).

| Holding | Result | Audit (independent recomputation from the raw response) |
|---|---|---|
| KR:005930 (`005930.KS`) | not available: `invalid-data` | Yahoo reports `KRW`, `Asia/Seoul` (R2 confirmed); cause: one bar on 2025-09-19 with **every** field null (OHLC, volume, adjclose) inside the 5-year history; Feature 007 step 5 rejects any null (no dropping) |
| KR:035720 (`035720.KQ`) | not available: `provider-error` | test-side mistake: Kakao has been listed on KOSPI since 2017; `.KQ` does not exist — the unavailable path behaved correctly |
| US:ORCL | 2026-09-29 close 137.79; 20-session −7.6 %; 50-day 142.70; 52-week 319.46 / 114.50 | all 5 values equal |
| US:AAPL | 329.40; +4.0 %; 321.90; 345.34 / 242.76 | all 5 values equal |
| US:MSFT | 508.96; +0.3 %; 479.88; 549.20 / 348.54 | all 5 values equal |

- 15 / 15 audited market numbers of the quoted holdings equal the independent recomputation (SC-006 for US).
- Rule/hand agreement on unsupported numbers: not meaningful here — the stand-in model echoes its prompt, so every
  answer is supported (0 unsupported, as the checker reports); a native model run would be needed for that part.

### Findings

- **F014-R1 (HIGH for KR)**: Yahoo's KR history can contain a bar with every field null on a trading day
  (`005930.KS`, 2025-09-19). Feature 007's rule (any null → `invalid-data`) then makes the whole holding unavailable.
  Candidate fix: drop a bar only when **all** its fields are null (no trade record at all); keep partial nulls
  invalid. Changes a Feature 007 rule → maintainer decision.
- **F014-R2 (MEDIUM)**: the 52-week range is computed from split- and dividend-adjusted highs/lows (the adapter's
  auto-adjust), while Yahoo's quote page and `meta.fiftyTwoWeekHigh/Low` show unadjusted values: ORCL high 319.46 vs
  322.54; MSFT 549.20 / 348.54 vs 553.72 / 349.20; AAPL low 242.76 vs 243.42. A user comparing with their broker
  sees different numbers. Candidate fix: 52-week range from unadjusted highs/lows (the usual convention); the
  20-session change and 50-day average stay on adjusted closes (upstream yfinance convention).
- R2 confirmed for KR (`KRW`, `Asia/Seoul`); `BTC-*` (`UTC`) not yet checked.

## T024 — Real Yahoo check, run 2 (2026-09-30 12:30 KST, after F014-R1/R2 fixes; maintainer approval)

- Fixes (maintainer: "추천대로"): F014-R1 — a bar with every field null is dropped (partly null stays invalid);
  F014-R2 — 52-week range from unadjusted highs/lows. While auditing run 2, the window itself was changed from "the
  last 252 sessions" to "sessions after the analysis date one year earlier", Yahoo's own window: with 252 sessions,
  the KR market's extra holidays reached back to 2025-09-30 (Samsung low 74,200 / 83,400 vs Yahoo 84,700).
- L6 with `BTA_L6_HOLDINGS=KR:005930:KOSPI,KR:035720:KOSPI,KR:247540:KOSDAQ,BTC:KRW,US:ORCL`: 1 passed (11.0 s);
  5 server → Yahoo requests. Then 4 raw chart requests (BTC-KRW, 005930.KS, 035720.KS, 247540.KQ) for diagnosis and
  the audit; the final adapter was replayed offline on the saved raw responses (no further requests).

| Holding | As of | Close | 20-session | 50-day avg | 52-week high / low | Audit vs independent recomputation and Yahoo `meta.fiftyTwoWeek*` |
|---|---|---|---|---|---|---|
| 005930.KS | 2026-09-29 | 272,500 | +6.0 % | 255,380 | 374,500 / 84,700 | equal (5/5) |
| 035720.KS | 2026-09-29 | 33,700 | −8.5 % | 36,273 | 69,700 / 32,250 | equal (5/5) |
| 247540.KQ | 2026-09-29 | 106,100 | −8.9 % | 108,238 | 260,000 / 88,300 | equal (5/5) |
| ORCL | 2026-09-29 | 137.79 | −7.6 % | 142.70 | 322.54 / 114.50 | equal (5/5) |
| AAPL | 2026-09-29 | 329.40 | +4.0 % | 321.90 | 345.34 / 243.42 | equal (5/5, replay) |
| MSFT | 2026-09-29 | 508.96 | +0.3 % | 479.88 | 553.72 / 349.20 | equal (5/5, replay) |
| BTC-KRW | – | – | – | – | – | not available: `invalid-data` (F014-R3) |

- **SC-006: 30 / 30** audited market numbers of six KR and US holdings equal the independent recomputation from Yahoo's
  raw response, and every 52-week figure equals Yahoo's own `fiftyTwoWeekHigh/Low`. KRX `.KS/.KQ` report `KRW`,
  `Asia/Seoul`; `BTC-KRW` reports `KRW`, `UTC` (R2 confirmed). The KR 16:00 cutoff held (12:30 KST → 2026-09-29).
- **F014-R3 (open)**: Yahoo's `BTC-KRW` daily bars are internally inconsistent — 142 of 1,825 bars have a low above
  the open/close or a high below them, including recent ones (2026-09-15 … 09-25), and the 2026-09-29 bar is empty.
  The bundle's session check rejects them, so BTC stays "not available" (the safe direction). Decision pending.

### F014-R3 decision and final regression

- **Decision (maintainer, 2026-09-30): option A** — BTC is not quotable in this Feature (like KRX gold spot); no
  request is made for it; exchange APIs are a later topic. The crypto session rule and the `BTC-*` symbol forms were
  removed (`symbolInstrument` accepts `.KS/.KQ` and US tickers only).
- Final regression after F014-R1/R2/R3: `npm run typecheck` 0; `npm test` 187 tests: 186 pass, 1 skipped;
  `npm run test:browser` **88 passed, 2 skipped** (the new opt-in L6 test is the second skip); the native gate was run
  before these changes (2 passed) and nothing on its path changed since.

## T026 — Summary for the maintainer

- Real holdings (KOSPI, KOSDAQ, US) are analysed on live Yahoo quotes in the fixture's fact shape; 30 / 30 audited
  market numbers equal Yahoo's own data. BTC, KRX gold spot and KONEX answer "시세 없음".
- Only the holding's symbol leaves the browser (FR-018); the notice says so; server logs never name it.
- Measurement, tests and the example stay on the fixture; Feature 013 facts are byte-identical.
- Yahoo Terms §2.4 (automated access) stays a recorded restriction accepted for personal research — not resolved,
  not a legal conclusion (FR-015). A public deployment needs a separately licensed source behind the same interface.
