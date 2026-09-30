# Verification: Feature 015 — Toss Securities as a Local Provider

## T001 — Decision record and baseline (2026-09-30)

- `docs/adr/0002-toss-local-read-only.md` accepted by the maintainer ("전부 승인", 2026-09-30); roadmap MD-1 points to it.
- Base: `main` `9cfad0a` (Feature 014 merged); baseline checks as recorded for Feature 014 (typecheck 0; `npm test`
  187 tests, 186 pass, 1 skipped; `npm run test:browser` 88 passed, 2 skipped).
- `.env.local` created by the maintainer (existence checked only; contents never read or printed by the implementer).

## T002 — Spike S1

Recorded in research.md ("S1 results"): token form body and 24 h lifetime, one account, holdings fields, candles
(100 per page, newest first, `nextBefore`, ≥ 400 daily sessions for KR and US), session-date stamps, no adjusted
series. Only shapes, counts and digit/letter patterns were printed.

## Implementation notes

- `bundleFrom()` was extracted from the Yahoo adapter (steps 3–7 and the bundle) and is shared by both sources;
  Yahoo tests pass unchanged.
- Toss quote failures map onto the existing market-data kinds (`not-configured` → `credential-missing`,
  `forbidden-ip` → `unauthorized`), so the Feature 014 route contract gains no new kind.
- "토스에서 가져오기" stays disabled until the symbol directory is loaded (found by the browser tests: mapping without
  the directory would skip every position).
- The playwright config always gives the app server fake Toss credentials and the stand-in (process env wins over
  `.env.local`), except under `BTA_REAL_TOSS=1`.

## A-015-1 — Adaptation record (Constitution XI)

| | Yahoo (Feature 014) | Toss (Feature 015) |
|---|---|---|
| Closes for the 20-session change and the 50-day average | split- and dividend-adjusted | as Toss reports them (no separate adjusted series; whether splits are adjusted is unknown) |
| 52-week range | unadjusted highs/lows, one year before the analysis date | same rule on Toss highs/lows |
| History | 5 years requested | 3 pages = 300 sessions (≥ Feature 007's 260) |

## T021 — Regression (2026-09-30)

| Check | Result |
|---|---|
| `npm run typecheck` | 0 |
| `npm test` | 199 tests: 198 pass, 1 skipped (+12: allowlist and no order path, token/account/holdings, not configured, typed failures, candles paging, log privacy, mapping, `source=toss` route and cache, no fallback, quote source) |
| `npm run test:browser` | **93 passed, 2 skipped** (+5: `e2e/toss.spec.ts`; the opt-in L6/L7 are skipped) |
| `npm run test:prompt-api` (native gate) | 2 passed, 4 skipped |

| Criterion | Evidence | Result |
|---|---|---|
| SC-001 import exact, unsupported skipped | `toss.spec.ts` T012; `toss.test.ts` mapping | PASS (stand-in) |
| SC-002 Toss facts from the candles | T018 (KR, US), route test (range, cache) | PASS (stand-in) |
| SC-003 no order path, no secret anywhere | allowlist + source scan; log test; traffic, records and page checks in T012/T018 | PASS |
| SC-004 unconfigured → no option, no request | T020; route test (503, 0 requests) | PASS |
| SC-005 actionable reasons, portfolio unchanged | T012 failures (forbidden-ip, unauthorized, several accounts) | PASS |
| SC-006 real check | T023 below | PASS with findings |

## T023 — Real check L7 (2026-09-30 13:25 KST, maintainer approval; `BTA_REAL_TOSS=1 BTA_REAL_YAHOO=1`)

- Real Toss requests: token, accounts, holdings, candles for 005930 and AAPL (3 pages each); real directory
  sources (Nasdaq Trader; data.go.kr without a key). Then 1 token + 6 candle requests for the audit. A first run
  failed on a test bug (a text read on a missing element waited for the whole timeout); its Playwright
  `error-context.md` contained the page snapshot with a holding name — it was deleted at once and never committed.
- **Import**: 5 account positions → 4 imported, 1 skipped ("목록에 없는 종목"); no error. Recorded as counts only.
- **Quotes via Toss (public tickers)** — every value equals the independent recomputation from Toss's raw candles:

| Ticker | As of | Close | 20-session | 50-day avg | 52-week high / low | Audit |
|---|---|---|---|---|---|---|
| 005930 (KRW) | 2026-09-29 | 274,500 | +7.0 % | 255,680 | 380,000 / 84,100 | 5/5 equal |
| AAPL (USD) | 2026-09-29 | 329.40 | +4.0 % | 321.98 | 345.34 / 243.42 | 5/5 equal |

### Findings

- **F015-R1 (MEDIUM)**: a KR holding cannot be imported while the KR part of the symbol directory is empty — in the
  maintainer's environment the data.go.kr key (Feature 009, `BTA_DATA_GO_KR_KEY`) is not set, so the KR list is
  unavailable and the KR position is skipped as "목록에 없는 종목". Fix without code: the maintainer sets the
  data.go.kr key. Alternative (a later decision): derive the KR market from another source.
- **F015-R2 (observation)**: Toss and Yahoo report different KR daily data for the same date — 005930 on 2026-09-29:
  close 274,500 (Toss) vs 272,500 (Yahoo); 52-week 380,000 / 84,100 vs 374,500 / 84,700. US (AAPL) closes and ranges
  are equal; the 50-day average differs slightly (321.98 vs 321.90) because Yahoo's closes are dividend-adjusted
  (A-015-1). The cause of the KR difference is not established (hypothesis: Toss includes the alternative trading
  venue's session in its KR candles). The answer window always names the source used.

## T024 — Summary for the maintainer

- Toss holdings import and Toss quotes work locally with the maintainer's key; no order path exists; secrets stay on
  the server. KR import needs the KR directory (F015-R1). Toss and Yahoo KR prices can differ (F015-R2).
