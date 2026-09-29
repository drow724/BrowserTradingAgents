# Research: Feature 005 — Browser Market Data Boundary

Date: 2026-09-28. Branch `005-browser-market-data-boundary` @ `cca9c9a`. Sources: official provider
documentation, pricing and terms pages (fetched 2026-09-28), plus keyless HTTP header probes run
from this machine. **No account was created and no personal API key was used.** One research agent
issued a single request with EODHD's documented public `demo` token against instructions; that
response is not used below. Header probes are `STATIC_CODE_ANALYSIS`-level facts (curl), not
browser evidence; browser confirmation is task R0 in [plan.md](plan.md).

## R0 Terminology: "live" means fetched at run time, not real-time

In this Feature, **live data mode = external market data fetched at execution time**. It does
**not** mean real-time market data. The selected source's free tier (Massive Stocks Basic) is
**end-of-day** data: a live-mode run sees the most recent completed session's daily bars. The
Feature name and spec terms are unchanged. `marketFacts` always name the session date ("as of the
<asOf> close").

## R1 Candidates and elimination

Ten US-equity sources were screened on the same criteria (FR-022, FR-023, FR-024, Constitution VI).

The CORS column is an **unauthenticated** probe: a preflight plus an error response. It shows that
error responses and the preflight admit a browser origin. It does **not** show the headers of an
authenticated success response.

| Source | Key needed | Browser key stance (official) | CORS probe (no key, `Origin: http://localhost:5173`) | Free tier | Free-tier recency | Public-repo use of data (terms) | Result |
|---|---|---|---|---|---|---|---|
| Alpha Vantage | yes (`apikey` query only) | not stated | 200 + `ACAO: *` (error body with HTTP 200) | 25 req/day | end of day | personal non-commercial; "others access information" = commercial (ToS §2.a.iii) | viable, weaker |
| Finnhub | yes | not stated | 401 + `ACAO: *` | 60/min | real-time quote | no redistribution of data or derived results | **out**: daily candles premium |
| Twelve Data | yes | "never expose it in client-side code or public repositories" (docs) | 401 + `ACAO: *` | 8/min, 800/day | real-time | internal, non-display; redistribution add-on | **out**: explicit client-side ban |
| Tiingo | yes | token "keep it safe like … your password" | 403, **no ACAO** | 50/h | EOD / IEX | Starter may not retain data | **out**: no CORS, retention ban |
| Massive (ex-Polygon.io, renamed 2025-10-30) | yes (`apiKey` query or `Authorization: Bearer`) | "Keep your API key secure and do not share it publicly" | 401 + ACAO echoes origin; preflight 204 allows `Authorization` | 5/min | end of day | individuals ToS: personal; no unauthorized copies (§6.1(d)(iii)) | **selected** |
| Alpaca | key id + **secret** | "never publicly expose your client secret" | 401 + `ACAO: *` | 200/min | IEX real-time | no republication/public display | **out**: secret pair in browser |
| FMP | yes | "Sharing your … API Key … strictly prohibited" | 401 + `ACAO: *` | 250/day | end of day | no display to third parties, no copying | **out**: display ban |
| Marketstack | yes (query only) | key "confidential" | 401 + `ACAO: *` | 100/month | end of day | non-commercial | **out**: 100 req/month |
| EODHD | yes | "treat it like a password" | 401, **no ACAO** | 20/day | end of day | no redistribution/display | **out**: no CORS |
| IEX Cloud | — | — | — | — | — | — | **out**: shut down 2024-08-31 (secondary sources) |
| Yahoo Finance | no official API | — | — (roadmap probe: no ACAO) | — | — | automated access prohibited without permission | **out** |

Primary URLs: alphavantage.co/documentation, /support, /terms_of_service; finnhub.io/docs/api,
/terms-of-service; twelvedata.com/docs, /pricing, /terms; tiingo.com/documentation,
app.tiingo.com/tos; massive.com/docs/rest/quickstart, /docs/rest/stocks/aggregates/custom-bars,
/pricing, /legal/individuals-terms-of-service, /blog/polygon-is-now-massive; docs.alpaca.markets;
site.financialmodelingprep.com/developer/docs, /terms-of-service; marketstack.com/pricing;
eodhd.com/pricing, /financial-apis/terms-conditions; legal.yahoo.com.

## R2 Decision: one source — Massive, daily aggregates

- **Decision**: Massive (`api.massive.com`), endpoint
  `GET /v2/aggs/ticker/{ticker}/range/1/day/{from}/{to}?adjusted=true&sort=asc`, key sent as
  `Authorization: Bearer <key>` (never in the URL). One request per run.
- **Rationale**:
  - CORS: the origin is echoed on the unauthenticated error path and the preflight allows
    `Authorization`. The success path is unproven until L4. The header keeps the key out of URLs,
    history and any recorded endpoint string.
  - Errors are HTTP-coded with a JSON body (`status`, `error`): 401 no key, 403 `NOT_AUTHORIZED`
    (plan window), 429 rate limit. Alpha Vantage returns HTTP 200 for errors, and its 25 req/day
    would be exhausted by development runs.
  - Timestamps are machine-readable: `t` is Unix ms at the start of the aggregate window in ET. The
    documented sample `t = 1577941200000` is 2020-01-02 00:00 ET, so a daily bar's `t` identifies
    its session date.
  - Free Basic tier: end-of-day data, 2 years, 5 calls/min. One call per run is enough.
  - Licensing is **not** a selection advantage. Massive's permitted use for this workload is
    unresolved (R12 F005-P1), and every other R1 source is personal/internal-only or stricter, so
    switching sources would not resolve it.
- **Alternatives**: Alpha Vantage is the fallback candidate. It is not implemented (FR-024 allows
  one source); switching sources would be a new decision recorded as a finding. All others are
  eliminated in R1.

## R3 Verdicts: technical viability and permitted use are separate

| Axis | Verdict |
|---|---|
| `TECHNICAL_PURE_BROWSER_VIABILITY` | **CONDITIONAL PASS**: the conditions below apply, and R0 browser confirmation of the error path is still pending |
| `PERMITTED_USE_VIABILITY` | **UNRESOLVED** (R12 F005-P1) |
| Server boundary | not required for technical reasons (below) |

**Technical verdict**
- The verdict applies to this Feature's run model, which is a local, personal page on
  `localhost`. The owner of a Massive key enters it at run time. The key lives only in page
  memory and goes only to `api.massive.com` over HTTPS in the `Authorization` header.
- **Why not THIN_SERVER_BOUNDARY_REQUIRED**:
  - The preflight and error responses admit a browser origin (R1 curl probe; browser confirmation
    by task R0). Success-path CORS is proven only by the authenticated L4 run.
  - No source in R1 offers a publishable or browser-safe credential, so a proxy would only move the
    same personal key to a server.
  - A proxy would not change what the terms allow to be displayed or published.
  - It would add a non-browser component that Constitution VI and FR-021 only permit when
    necessary.
- **Conditions** (a violation of any one makes the verdict invalid):
  1. No key in source, bundle, `.env*` files read by the bundler, URL, storage, evidence, console
     or test artifacts. A bundler environment variable is **not** secret protection: its value is
     inlined into the JavaScript bundle.
  2. The page is not deployed for other people. Serving other users would need their own keys or a
     licensed server-side boundary, which is a later Feature and a finding.
  3. Committed evidence carries provenance and a snapshot digest, never market values (R6).
- **Browser confirmation R0** (tasks, before implementation; no credential): in Playwright
  Chromium, at the canonical page origin, `fetch` the endpoint with a dummy bearer token.
  - Pass: the promise resolves with status 401 and a readable JSON body. Scope of the proof:
    **preflight + error-response** browser compatibility only.
  - `TypeError: Failed to fetch` means CORS is blocked. It is recorded as finding F005-001 and the
    verdict flips to `THIN_SERVER_BOUNDARY_REQUIRED`, which stops the Feature for re-planning.
  - **Authenticated success-response** CORS is a separate fact. It is proven only by L4 (real key,
    owner-run). If L4 fails with `Failed to fetch`, F005-001 applies there as well.

## R4 Normalized market snapshot (minimum)

- **What the Market Analyst needs**: the same kinds of facts as the Feature 004 fixture — recent
  price level and move, and a short trend with volume — tied to an explicit date. Fundamentals,
  indicators, intraday data, quotes and news are excluded.
- **Snapshot** (application-defined; provider field names do not leak past the normalizer):
  - `symbol`, `name` (committed constant for the one configured instrument), `currency` (`USD`,
    configured constant for a US listing; the source does not state it)
  - `sessions`: the last up to 5 daily sessions, ascending, each `{date, open, high, low, close,
    volume}`. `date` is the ET session date `YYYY-MM-DD` derived from `t` with
    `Intl.DateTimeFormat('en-CA', {timeZone: 'America/New_York'})`.
  - `asOf`: the last session's date, meaning "end-of-day data for this session".
- **Required**:
  - HTTP 200 and `status` exactly `OK` (the only value evidenced: the official Custom Bars sample.
    "End of Day" is the Basic plan's recency, not a response status)
  - `results` has ≥ 2 bars
  - each used bar has finite `o,h,l,c > 0`, finite `v ≥ 0` and an integer `t`
  - dates strictly increasing and not after `receivedAt`'s ET date

  Anything else → normalization failure, and no value is filled in. `vw`, `n`, `otc`, `ticker`,
  `queryCount`, `next_url` and `request_id` are ignored. `request_id` is recorded as provenance
  (it is not a secret).
- **Canonicalization**: prices rendered with 2 decimals, change percent with 2 decimals and a sign,
  volume as an integer with no separators. Dates are ISO `YYYY-MM-DD` in ET, and times in evidence
  are ISO UTC.
- **Staleness**: the free tier is end-of-day by design. `ageHours = receivedAt − (asOf 16:00 ET)`
  is recorded. `marketFacts` always state "as of the <asOf> close", so stale data can never read as
  current (spec edge case). A freshness threshold is **not** needed as a gate; a threshold would
  wrongly fail every weekend run. Rejected: future dates or no bars.
- **Determinism**: normalization and rendering are pure functions of (response body, symbol
  config). `receivedAt` affects only `ageHours`. The same body gives the same snapshot and the same
  `marketFacts` (FR-012). Deterministic tests use **synthetic** bodies in the documented shape, not
  captured market data (terms, R6).
- **Request window**: computed before the request from the page clock. `from` = ET date
  10 days before today, `to` = ET date today. That covers weekends and
  a 3-day holiday; keep the last 5 bars.

## R5 Live subject and news

- Live instrument: **IBM** (`International Business Machines Corp.`, NYSE, USD), a committed
  constant. Any liquid US listing would do; the choice is arbitrary and never evaluated.
- Live input = `{ id: 'live-market@1', subject: 'International Business Machines Corp. (IBM)',
  marketFacts: <rendered>, newsFacts: NEUTRAL_NEWS.text }`. It has the Feature 004
  `TradingFixture` shape, so `buildTradingGraph` and the role table are unchanged. All eight roles
  run, and the News Analyst reads the neutral fixture (FR-005, FR-005a).
- `NEUTRAL_NEWS` (`neutral-news@1`): "No company-specific news is supplied for this run (committed
  neutral fixture; no news source is connected)." It names no company. The News Analyst still
  makes its request, so there are 8 logical requests.

## R6 Evidence under provider terms: digest ≠ replay

- Committed evidence must not reproduce market data (Massive §6.1(d)(iii); every other R1 source
  is stricter).
- Live-mode records therefore carry:
  - provenance: source, endpoint template without key, symbol, request and receive times, `asOf`,
    `ageHours`, HTTP status, provider `status`, `request_id`, bar count
  - `snapshotDigest = sha256(canonical snapshot JSON)`
- Live-mode records never carry:
  - the snapshot values
  - `marketFacts`
  - role output text. In live mode `result` holds only `{field: {present, length}}`, because model
    output can quote prices.
- The page shows the snapshot and final decision to the local user, which is personal use.
- A digest gives **identity and integrity**, not **replayability**. The design separates two
  artifacts:

| Artifact | Contents | Location |
|---|---|---|
| committed evidence | provenance, `snapshotDigest`, `marketFactsDigest`; no market values, no secrets | `specs/005…/evidence/` |
| local replay artifact | the normalized snapshot and the generated `marketFacts`; no credential, no raw body | printed by the page in `#replay`, saved by the owner to the gitignored `.local/replay/`; never committed |

- Replay check (L1, runs only when a replay file exists locally): the digests of the replay file
  must equal the committed record's, and `renderMarketFacts(snapshot)` must equal the replay's
  `marketFacts`.
- FR-014 ("identify … the normalized snapshot") is met by the digest.
- SC-009 (amended after F005-P2) requires the record to reproducibly identify the snapshot and
  `marketFacts`, and the values to be kept in a local non-committed replay artifact. The digests plus
  the replay artifact satisfy it.
- Fixture-mode records keep the Feature 004 `result` unchanged.

## R7 Failure model

Every failure record states `failure.boundary` as `market-data` or `inference` (FR-017).

| Kind | Boundary | Trigger | Runtime created? | Model requests |
|---|---|---|---|---|
| `credential-missing` | market-data | live mode, no key entered | no | 0 |
| `network` | market-data | `fetch` rejects with a non-abort error (offline, DNS, CORS) | no | 0 |
| `unauthorized` | market-data | 401 / 403 | no | 0 |
| `rate-limited` | market-data | 429 | no | 0 |
| `provider-error` | market-data | other non-2xx, or `status` ≠ `OK` | no | 0 |
| `timeout` | market-data | acquisition page limit (30 s, page protection only) | no | 0 |
| `unavailable` | market-data | 200 with < 2 usable bars | no | 0 |
| `invalid-data` | market-data | body not JSON or a required field missing or invalid | no | 0 |
| cancelled during acquisition | market-data | user Cancel → `AbortError` | no | 0 |
| `native-unavailable` | inference | Feature 004 `BLOCKED`, checked before acquisition **only when provider = native** | no | 0 |
| `runtime-create` | inference | `createRuntime` rejects (Feature 004 (d)) | failed | 0 |
| `model` | inference | the graph rejects with an AkariSP `TaskError` | yes, settled before shutdown | as measured |
| `graph` | inference | any other graph rejection | yes, settled before shutdown | as measured |
| `cancelled` | inference | abort after the graph started | yes, settled before shutdown | as measured |

No retry, no cache and no fixture substitution (FR-009). Retrying a rate-limited free tier would
only spend quota.

## R8 Lifecycle

- One `AbortController` per click covers acquisition and graph (FR-019). Order inside `run()`:
  1. **only if provider = native**: native availability preflight. Anything but `MODEL_AVAILABLE`
     gives `BLOCKED`, no fetch and no runtime. With provider = stand-in, native Prompt API
     availability is never consulted as a gate, so stand-in + live runs in a browser without the
     Prompt API.
  2. **only if data = live**: acquire, then normalize and render. Fixture mode uses `FIXTURE`.
  3. `createRuntime` for the selected provider (native Prompt API, or the installed stand-in), then
     the Feature 004 `runGraph` unchanged in substance.
- Market fetch lifecycle ≠ AkariSP lifecycle:
  - no runtime or model exists until market data is ready
  - acquisition failure or cancel creates none (0 model requests)
  - after graph start, the Feature 004 invariants hold: caller rejection ≠ settlement; `ready 0/0`
    is observed before shutdown; `closed 0/0` is never proof
- The acquisition limit (30 s) and the graph watchdog (180 s) are both page protection only.

## R9 Mode axes

- `?provider=native|standin` (existing) and `?data=fixture|live` (new; default `fixture`, so the
  Feature 004 behaviour and every existing test URL are unchanged). The two are parsed
  independently; neither reads the other.
- The key input (`<input type="password" autocomplete="off">`) appears only when `data=live`. It is
  read at click time, never written anywhere.
- All four combinations are URLs: `/?provider=standin`, `/`, `/?provider=standin&data=live`,
  `/?data=live`. Evidence records `provider` and `dataSource.mode` separately. The evidence class
  follows the provider only (FR-016).

## R10 Evidence ladder

| Layer | Class | Data | What it proves | Who runs |
|---|---|---|---|---|
| L1 | `DETERMINISTIC_TEST` | synthetic bodies | normalize/render determinism, rejection cases, provider fields absent from `marketFacts`, live input construction (real subject, neutral news). Role provenance is input-independent and already proven by Feature 004 G2–G9 | automated |
| L2 | `DETERMINISTIC_TEST` / `NODE_INTEGRATION` | fixture | Feature 004 suites unchanged | automated |
| L3 | `BROWSER_AUTOMATED` | live mode, **controlled** responses (Playwright `page.route`), dummy key | success with 8 roles and 8/0 requests, each failure kind, cancel during acquisition, key absent from evidence/console, 4 mode URLs | automated |
| L4 | `BROWSER_AUTOMATED` (stand-in) | live, **real Massive** | real CORS on the success path, real payload normalizes | **owner** (key entry) |
| L5 | `REAL_BROWSER_PROMPT_API` | live, real Massive | SC-016 | **owner**, clean revision |

- The agent cannot enter the key (credentials are the owner's). L4 and L5 are MANUAL: the owner
  runs `npm run dev` or the Playwright native runner with the key typed into the page.
- **Prerequisite P-1 before L4/L5** (any authenticated request): resolve F005-P1. Resolution means
  written confirmation from Massive, or a licence, that personal local LLM-assisted analysis of Stocks
  Basic data is permitted. L1–L3 use only synthetic bodies and are not affected.
- If the source, key or model is unavailable, L4/L5 record `BLOCKED` and the Feature stays
  incomplete. Lower layers never substitute for them.

## R11 Unknowns carried to implementation (not blocking)

- `status` values other than `OK`: none are evidenced. Anything else is `provider-error`. Accepting a
  new value needs official or observed evidence and a recorded decision.
- Success-path CORS headers with a real key (L4).
- Time of day when the Basic tier publishes the latest session (observation only).
- Error body for an unknown ticker (the ticker is a constant; treated as `unavailable` or
  `provider-error` by status).

## R12 Plan findings

```text
Finding ID: F005-P1
Feature: 005-browser-market-data-boundary
Scenario: permitted use of Massive Stocks Basic data for personal, local LLM-assisted analysis
Observed:
  - KB "Which plan do I need to show Massive data in my own app?": an individual plan covers
    "your own research, your own scripts, your own trading"; Business is required once data
    reaches "another person's screen", including testers and staging.
  - Market Data Terms §1: licence "exclusively for your personal, non-business, and
    non-commercial purposes".
  - Market Data Terms §5(d) restricts use "for non-display use or to create derivative works"
    (without the applicable licence).
  - Market Data Terms §2: no application "intended for use by end users other than you".
  - None of these documents addresses LLM, AI or automated analysis.
Expected: an unambiguous permission for this workload
Reproduction: massive.com/knowledge-base/article/which-plan-do-i-need-to-show-massive-data-in-my-app,
  massive.com/legal/market-data-terms-of-service, massive.com/pricing (fetched 2026-09-28)
Evidence class: STATIC_CODE_ANALYSIS (documentation review)
Market-data source involved: Massive
Application workaround possible?: partly. The design keeps data on the owner's machine: on-device
  model, no display to others, no values in committed evidence. Whether LLM processing counts as
  "non-display use" is a licensing question the application cannot settle.
Core change required?: NO
Confidence: HIGH that the question is open; no legal conclusion drawn
Status: UNRESOLVED. Blocks L4/L5 (authenticated requests). Does not block L1–L3 or implementation
  on synthetic data. The selection stays valid because no R1 alternative is less restrictive.
```

```text
Finding ID: F005-P2
Feature: 005-browser-market-data-boundary
Scenario: SC-009 wording vs provider terms
Observed: SC-009 requires every live-mode record to state "… and the normalized snapshot". Terms
  (R6, F005-P1) make committing snapshot values to a public repository a redistribution risk. The
  plan's record holds `snapshotDigest` + `marketFactsDigest`, with values in a local replay artifact.
Expected: a spec criterion that is satisfiable without publishing market data
Reproduction: spec.md SC-009; research R6
Evidence class: STATIC_CODE_ANALYSIS
Application workaround possible?: yes, in design (digest + local replay). But it does not
  literally meet SC-009, so it needs a spec decision.
Core change required?: NO
Confidence: HIGH
Status: CLOSED 2026-09-28. Option (a) chosen by the maintainer. SC-009 and FR-014 now require the
  record to reproducibly identify the snapshot and `marketFacts` (mechanism: digests, a plan
  decision) with the values in a local non-committed replay artifact (spec Clarifications).
```
