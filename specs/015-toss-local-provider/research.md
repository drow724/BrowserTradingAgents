# Research: Feature 015 — Toss Securities as a Local Provider

Sources: Toss Securities OpenAPI overview (`https://openapi.tossinvest.com/openapi-docs/overview.md`, read
2026-09-30); detailed endpoint pages are not readable without login (403). Items marked **S1** are confirmed by the
spike (T-S1) with the maintainer's own key before the parts that depend on them are built.

## Known from the official overview

| Item | Value |
|---|---|
| Base URL | `https://openapi.tossinvest.com` |
| Token | `POST /oauth2/token`, `grant_type=client_credentials`, `client_id` + `client_secret`; lifetime not stated (**S1**) |
| Headers | `Authorization: Bearer <token>` on every call; `X-Tossinvest-Account: <accountSeq>` on account/asset/order calls |
| Account read | `GET /api/v1/accounts` (list), `GET /api/v1/holdings` (per-stock detail + totals) |
| Market data | `GET /api/v1/candles` (1-minute, daily), `GET /api/v1/prices`, `GET /api/v1/orderbook`, stock master, market hours |
| Orders (never used) | `POST /api/v1/orders`, `…/orders/{id}/modify`, `…/orders/{id}/cancel`, `GET /api/v1/orders[/{id}]`; conditional orders under `/api/v1/conditional-orders` (POST/DELETE/GET) |
| Limits | AUTH 5/s, ACCOUNT 1/s, ASSET 5/s, MARKET_DATA 15/s, ORDER 10/s; 429 with `Retry-After` |
| IP allowlist | calls from unregistered IPs → 403 |

## R1 — Decision record first (FR-001)

- Decision: `docs/adr/0002-toss-local-read-only.md` amends MD-1 for this Feature: Toss **account read and market
  data** allowed, locally, with the user's own key; orders, order modification/cancellation, conditional orders and
  order queries are never called; recorded as a scope decision, not a legal conclusion; Constitution IX is applied
  by this separate application Feature with the maintainer's approval. `docs/roadmap.md` MD-1 points to it.
- Rationale: the constitution and MD-1 forbid broker APIs unless a separate, approved Feature records the scope.

## R2 — Read-only by construction (FR-004)

- Decision: one server module `src/server/toss.ts` with a frozen allowlist: `POST /oauth2/token`,
  `GET /api/v1/accounts`, `GET /api/v1/holdings`, `GET /api/v1/candles`. Every request goes through one function
  that rejects any other method/path before `fetch`. A unit test asserts the list and scans the module for
  `orders` / `conditional-orders` (0 occurrences outside the test's own forbidden list). Order queries are excluded
  too (not needed; keeps the rule "no order path at all").
- Alternatives: a generic client with a denylist (rejected: a missed path would be callable).

## R3 — Local only, secrets on the server (FR-002, FR-003)

- Decision: server environment only — `BTA_TOSS_CLIENT_ID`, `BTA_TOSS_CLIENT_SECRET`, optional
  `BTA_TOSS_ACCOUNT_SEQ` (else the single account from `/api/v1/accounts`; more than one → a reason asking the user
  to set it), `BTA_TOSS_BASE_URL` (tests only). The provider is available only when both credentials are set and
  `VERCEL` is not set. The user writes these into `.env.local` themselves; the implementer never reads or prints
  them.
- The token is cached in server memory until shortly before its expiry (**S1** lifetime); it never leaves the
  server. Logs keep `{ provider, ms, status, kind }` only. The account seq is never sent to the browser.

## R4 — Routes

- `GET /api/toss/status` → `{ available: boolean, reason? }` (no secret, no account data).
- `GET /api/toss/holdings` → Toss positions reduced to `{ code, market?, name, quantity, averagePrice, currency }`;
  the browser maps them with the directory it already has (R5). Not cached; `no-store`.
- Quotes: `/api/market?symbol=<yahoo-form>&source=toss` (default `yahoo`). The route maps the symbol form to a Toss
  code (**S1**), fetches daily candles and builds the same `MarketBundle` with the Feature 007/014 rules through a
  shared `bundleFrom(sessions, instrument, analysisDate)` extracted from the Yahoo adapter. Cache key adds the
  source. `source=toss` when unavailable → `503 not-configured`.

## R5 — Holdings mapping (FR-005)

- KR positions → `{ kind: 'listing', assetClass: 'KR', ticker: <6-digit>, market }` via the symbol directory
  (Feature 009); US → `{ assetClass: 'US', ticker }` via the directory. Not in the directory, other asset types,
  zero quantity → skipped with a reason. Currency from the market (KR → KRW, US → USD); average price and quantity
  as Toss reports them (**S1**: field names, fractional US quantities, average price currency for US).
- Import = replace after confirmation (FR-006): a preview window lists holdings and skipped entries; "가져오기" writes
  through the existing `persist()` and clears `quotes=fixture` (Feature 014 R8).

## R6 — Per-domain selection (FR-008)

- `localStorage['bta.sources'] = { holdings: 'manual' | 'toss', quotes: 'yahoo' | 'toss' }`, default manual/yahoo;
  read at run time; Toss options disabled with the status reason when unavailable. "holdings: toss" means the
  import button is offered (import is an explicit action, not a background sync).

## R7 — Toss quotes (FR-009, FR-010)

- Daily candles over ≥ 1 year + 50 sessions are needed for the fact shape (**S1**: request parameters, maximum count,
  history depth, whether prices are adjusted). If adjusted closes are not available, the 20-session change and the
  50-day average use Toss's closes as they are and the difference is recorded as adaptation A-015-1. Any missing
  measure → "not available" with the reason; no fallback to Yahoo (FR-010).

## R8 — Failures (FR-012)

- Typed kinds: `not-configured`, `unauthorized` (401), `forbidden-ip` (403), `rate-limited` (429), `provider-error`,
  `invalid-data`, `timeout`, `network`, `ambiguous-account`. Korean reasons, e.g. 403 → "등록된 IP가 아닙니다. 토스증권
  WTS의 Open API 설정에서 이 컴퓨터의 IP를 등록하세요." No retry loop; a 429 is shown with the wait time.

## R9 — Verification

- A Toss stand-in in `e2e/market-stub.mjs` (fictional account, positions and candles; records whether the
  Authorization header and account header were present, never their values) for unit and browser tests.
- Leak test: the stand-in's fake secret, token and account seq never appear in browser traffic, the answer window,
  evidence records or captured server logs (SC-003).
- Opt-in real check `BTA_REAL_TOSS=1` (maintainer approval, their key and IP): import count vs the account's KR/US
  stock positions and Toss quote numbers vs the Toss app for one date; recorded as counts and pass/fail only
  (FR-014).

## S1 — Spike before building (maintainer's key required)

With the maintainer's credentials in `.env.local` and the Mac's IP registered, one throwaway script calls the token,
accounts, holdings and one KR + one US daily-candle request and prints **only shapes and counts** (field names, value
types, number of candles, first/last dates, whether an adjusted field exists) — never values, account numbers or
tokens. Answers: token lifetime; accountSeq discovery; holdings field names and units; candle parameters, maximum
count and depth; symbol code format for KR/US; adjustment. The plan's R4/R5/R7 details are adjusted from it.

## S1 results (2026-09-30, maintainer's key, shapes and patterns only)

Requests: token ×3 (the first two before the IP was registered: 403 "IP address not allowed"; a JSON body gets 400 —
the token request is form-encoded), accounts ×2, holdings ×2, candles ×11. Nothing but shapes, counts and
digit/letter patterns was printed.

| Question | Answer |
|---|---|
| Token | `POST /oauth2/token`, form body `grant_type=client_credentials&client_id&client_secret` → `{ access_token, token_type, expires_in }`; `expires_in` = 86,399 s (24 h) |
| Accounts | `{ result: [{ accountNo, accountSeq (number), accountType }] }`; one account here; `accountSeq` goes into `X-Tossinvest-Account` |
| Holdings | `{ result: { totals…, items: [{ symbol, name, marketCountry ('KR' / 'US'), currency ('KRW' / 'USD'), quantity (string), lastPrice, averagePurchasePrice (string, US with up to 6 decimals), marketValue, profitLoss, dailyProfitLoss, cost }] } }`; KR `symbol` is the 6-digit code, US the ticker; no KOSPI/KOSDAQ market field |
| Candles | `GET /api/v1/candles?symbol=<6-digit or ticker>&interval=1d[&before=<ISO timestamp>]` → `{ result: { candles: [{ timestamp (ISO, +09:00), openPrice, highPrice, lowPrice, closePrice, volume (strings), currency }], nextBefore } }`; 100 per page, newest first; `nextBefore` pages further back; 4 pages reached Feb 2025 (≥ 400 sessions for both KR and US) |
| Session date | KR candles stamped `00:00+09:00` (Seoul date); US candles `13:00+09:00` / `14:00+09:00` (= 00:00 New York, EDT/EST) → the New York date; the current day's candle is present during the session (the 16:00 cutoff applies) |
| Adjustment | no adjusted field; prices are taken as reported (A-015-1) |
| Limits seen | AUTH 5/s, ACCOUNT 1/s, ASSET 5/s, candles 20/s |

Consequences for the design:

- R4/R7: three pages (300 sessions) cover the Feature 007 minimum (260) and one year + 50 sessions; the adapter pages
  with `before=nextBefore` up to 3 times (≤ 3 requests per symbol per trading day, cached).
- R5: holdings map by `marketCountry` + `symbol`; the KR market (KOSPI/KOSDAQ) and product type come from the
  directory; `quantity` and `averagePurchasePrice` are decimal strings → numbers; the holdings route returns only
  `{ code: symbol, country: marketCountry, name, quantity, averagePrice, currency }` — never `accountNo`, totals or
  profit/loss.
- A-015-1: Toss closes carry no separate adjusted series; the 20-session change and the 50-day average use them as
  reported (Yahoo uses split/dividend-adjusted closes). Whether Toss adjusts splits is unknown; recorded, not
  assumed.
