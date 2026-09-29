# Research: Feature 007 — Upstream-Compatible Server Market Data Boundary

Date: 2026-09-29. Upstream reference: `TauricResearch/TradingAgents` @
`35543d0248bf89fcb92b17a15858ad0c0e940687` (v0.5.1). Source read from a local checkout whose `HEAD` is
exactly that commit with a clean working tree (`git status --porcelain` empty). File/line references
below are at that commit. Library behaviour that upstream does not pin exactly is marked with the
version resolved in that checkout's virtual environment (`stockstats 0.6.8`, `yfinance 1.7.0`;
upstream pins only `stockstats>=0.6.5`, `yfinance>=1.4.1`, `pyproject.toml` L25, L27).

No market-data endpoint, credential or provider account was used for this research.

---

## R0 Upstream audit (FR-001) — the blocking question

### R0.1 Market Analyst node and tool loop

Source: `tradingagents/agents/analysts/market_analyst.py`, `tradingagents/agents/tools.py`,
`tradingagents/graph/setup.py` (Feature 001 RD §4.1, §4.5, R1).

| Question | Finding (source) |
|---|---|
| Tools offered | `TOOLS = (get_stock_data, get_indicators, get_verified_market_snapshot)` (`market_analyst.py` L7–11) — confirms Feature 001 |
| Who chooses calls | the model: `prompt \| llm.bind_tools(TOOLS)` (L76); no fixed sequence in code |
| Call count | dynamic: loop analyst → `tools_market` → analyst until the reply has no `tool_calls` (L80–83; Feature 001 R1, `setup.py` L43–47, L115–119). Bounded only by the graph recursion limit (Feature 001 §5.4) |
| Intended sequence (prompt, not code) | call `get_stock_data` first, then `get_indicators` with **up to 8** indicators from a fixed list of 12, then `get_verified_market_snapshot` "before writing the final report", treated as "the source of truth for any exact OHLCV, price-level, or indicator-value claim" (L21, L45, L47) |
| Tool output → context | the ToolNode appends each tool result as a message to `messages`; the analyst is re-invoked on `state["messages"]` (L78). After the final report, Msg Clear removes the thread (Feature 001 §4.5a), so later roles see only `market_report` |
| Termination | `len(result.tool_calls) == 0` → `market_report = result.content` (L82–83) |
| Dates | `current_date = state["trade_date"]`, told to the model as "now" for all tool-call date ranges (L17, L64). Every tool also receives `trade_date` via `InjectedState` and clamps dates to it (`tools.py` L22, L44, L77; `as_of`, `as_of_window`, `dataflows/date_window.py` L72–95) |
| Symbol | the model passes `symbol`; vendors map it with `normalize_symbol` (`dataflows/symbols.py` L103–: aliases, crypto, forex, HK/SS suffixes; plain equities upper-cased) |
| Other inputs | `instrument_context` (company identity, resolved once at run start from a yfinance profile, `trading_graph.py` L117–128) is prompt context, not a tool |
| Fundamentals / news | **none** among the Market Analyst's tools. They belong to the News and Fundamentals analysts (`tools.py` L89–284). The Market Analyst's contract is price-derived only |

### R0.2 `get_stock_data`

`tools.py` L17–35 → `route_to_vendor("get_stock_data", symbol, start, end)` → default vendor
`yfinance` → `get_YFin_data_online` (`dataflows/vendors/yahoo/market.py` L22–70).

| Item | Finding |
|---|---|
| Inputs | `symbol`, `start_date`, `end_date` (`YYYY-MM-DD`), model-chosen; `trade_date` injected |
| Date cap | `as_of_window`: the end is clamped to `trade_date`; a window wholly after it keeps its length and moves back to end on `trade_date` (`date_window.py` L85–95) |
| Interval | daily (`Ticker.history(start, end)`, yfinance default `interval="1d"`) |
| Rows | every trading session in `[start, end]` (end made inclusive by `+1 day`, L35–39) |
| Adjustment | `Ticker.history` default `auto_adjust=True` (yfinance 1.7.0 `scrapers/history.py` L106–107): OHLC are split/dividend-adjusted; `actions=True` adds `Dividends`, `Stock Splits` columns |
| Output | text: `# Stock data for SYM from … to …`, `# Total records: N`, then the frame as CSV; prices rounded to 2 decimals (L56–68); the time zone is stripped from the index, keeping the exchange-local date (L47–49) |
| Non-trading days | simply absent (no rows) |
| Empty | typed `NoMarketDataError` (or rate-limit error if Yahoo is unreachable) → router returns the sentinel `NO_DATA_AVAILABLE: …` / `DATA_UNAVAILABLE: …` text to the model (`router.py` L243–280) |
| Stale | if the latest row is > 10 calendar days before `end_date` → `NoMarketDataError` (`ohlcv.py` L21, L142–176) |
| Retry / cache | 429 retried 3× with exponential backoff (`yf_retry`, `ohlcv.py` L41–57); no file cache on this path |

### R0.3 `get_indicators`

`tools.py` L38–67 → `route_to_vendor("get_indicators", …)` → default `yfinance` →
`get_stock_stats_indicators_window` (`market.py` L73–209).

| Item | Finding |
|---|---|
| Inputs | `symbol`, `indicator` (one name; a comma list is split and each routed, L57–66), `curr_date` (clamped by `as_of`), `look_back_days` default **30** |
| Supported names (yfinance path) | 13: `close_50_sma`, `close_200_sma`, `close_10_ema`, `macd`, `macds`, `macdh`, `rsi`, `boll`, `boll_ub`, `boll_lb`, `atr`, `vwma`, `mfi` (L82–153). The prompt offers 12 (all but `mfi`, `market_analyst.py` L23–43) |
| Where computed | **locally**, with the `stockstats` library over the vendor's daily OHLCV (`_get_stock_stats_bulk`, L212–240). Not provider-computed on the default path |
| History used | `load_ohlcv(symbol, curr_date)` (`ohlcv.py` L194–288): downloads **5 years ending today** (`yf.download`, `auto_adjust=True`), caches it per symbol in a CSV (15-min TTL for the current day), keeps rows `≤ curr_date`, **forward/back-fills price gaps** (`fill_gaps=True`), rejects stale data (> 10 days) |
| Output | text: `## <name> values from <curr−look_back> to <curr>:` then **one line per calendar day, newest first**: `YYYY-MM-DD: <value>` (full float `str`), `N/A: Not a trading day (weekend or holiday)` for missing dates, `N/A` for NaN; then the indicator description (L160–207) |
| Unknown name | `ValueError` text returned to the model as that indicator's result (`tools.py` L65–66) |
| Alpha Vantage path | when configured: provider-computed via its indicator endpoints, 12 names (no `mfi`) (`vendors/alpha_vantage/indicator.py` L37–49) |

**Indicator definitions** (`stockstats 0.6.8`, the computation the default path performs; windows from
`_dft_windows`, L45–90):

| Name | Definition |
|---|---|
| `close_N_sma` | rolling mean of close, window N, `min_periods=1` (L1042, L1130) |
| `close_10_ema` | `ewm(span=10, adjust=True, min_periods=1)` of close (L1123–1126) |
| `macd`, `macds`, `macdh` | EMA12 − EMA26 of close; signal = EMA9 of `macd`; hist = `macd − macds` (L1227–1245; EMA as above) |
| `rsi` | 14; up/down moves smoothed with SMMA `ewm(alpha=1/14, adjust=True, min_periods=0)`; `100·up/(up+down)`, 50 when no change; first row 50 (L517–531, L588–591) |
| `boll`, `boll_ub`, `boll_lb` | 20-row SMA of close ± 2 × rolling std (pandas sample std), `min_periods=1` (L1207–1225, L1397) |
| `atr` | 14; SMMA of true range `max(h−l, |h−c₋₁|, |l−c₋₁|)` (L669, L815–830) |
| `vwma` | 14; rolling Σ(volume·typical price)/Σ volume, typical = (h+l+c)/3 (L1412–1422) |

Consequences:
- Values exist from the first row, with no warm-up N/A.
- EMA and SMMA values depend on the whole history length (`adjust=True`), so "5 years ending today"
  is part of the reference numbers.
- **Rounding point**: the reference computes indicators on the **unrounded** auto-adjusted floats of
  `load_ohlcv`. The 2-decimal rounding exists only in `get_stock_data`'s text output
  (`market.py` L56–60), and the snapshot formats with `.2f` only when rendering (`snapshot.py`
  L50–61). BrowserTradingAgents does the same:
  - indicator input and `MarketBundle` values are unrounded
  - decimal formatting happens only when `marketFacts` text is rendered
- **Causality** (checked 2026-09-29 offline in the frozen venv, `stockstats 0.6.8`, synthetic
  600-row series): all 12 indicators computed on the prefix `[0..N]` equal the full-series value
  at row N for N = 30, 250 and 599. The maximum relative difference is exactly 0, so a golden
  value at row N can be generated from the input slice up to N.

### R0.4 `get_verified_market_snapshot`

`tools.py` L70–86 → **directly** `build_verified_market_snapshot` in
`dataflows/vendors/yahoo/snapshot.py` (L64–125). **Not routed**: it always uses Yahoo, whatever
`data_vendors` says.

| Item | Finding |
|---|---|
| Purpose | anti-confabulation: a deterministic "source of truth" for exact numeric claims (module docstring L1–8) |
| Inputs | `symbol`, `curr_date` (clamped by `as_of`), `look_back_days` default 30 (capped to 1…30) |
| Data | `load_ohlcv(…, fill_gaps=False)`: the same 5-year history, but **unfilled** (reported values only), rows `≤ curr_date` re-applied defensively (L28–47) |
| Content | (1) requested date and the latest trading row used; (2) latest row `Open, High, Low, Close, Volume`; (3) 11 indicators at the latest row: `close_10_ema, close_50_sma, close_200_sma, rsi, boll, boll_ub, boll_lb, macd, macds, macdh, atr` (L21–25) — `vwma`/`mfi` not included; (4) the last `min(look_back_days, 30)` closes with dates; (5) a fixed instruction paragraph (L91–124) |
| Format | Markdown tables; numbers `.2f`, volume as integer string; failed indicator → `N/A (<Exception>)` (L50–84) |
| Failure | no rows → `ValueError` (raised to the ToolNode) |

### R0.5 Vendor routing

`dataflows/router.py`, `default_config.py` L138–149.

- Defaults: `core_stock_apis`, `technical_indicators`, `fundamental_data`, `news_data` = `yfinance`;
  `macro_data` = `fred`; `prediction_markets` = `polymarket`. Tool-level overrides via
  `tool_vendors` (empty by default).
- `get_stock_data`: `alpha_vantage` or `yfinance`; `get_indicators`: `alpha_vantage` or `yfinance`.
  The snapshot has no router entry (always Yahoo).
- A configured comma list is a fallback chain; `"default"` means all available vendors. No silent
  fallback to unconfigured vendors (L195–209). Rate-limit and not-configured errors try the next
  vendor; "no data" becomes one sentinel string to the model; other errors are raised (core
  categories) (L211–291).
- Alpha Vantage sends its key as a URL query parameter (`apikey`, `vendors/alpha_vantage/common.py`
  L77–82) and uses `TIME_SERIES_DAILY_ADJUSTED` for stock data (`stock.py`).

### R0.6 Reference contract table (FR-001 → FR-002)

| Upstream tool | Inputs | Data needed | Output | Provider assumption | Used by Market Analyst | Decision |
|---|---|---|---|---|---|---|
| `get_stock_data` | symbol, start, end (model); `trade_date` cap | adjusted daily OHLCV for a model-chosen window | CSV text, 2-dp | yfinance (auto-adjusted) | yes, first per prompt | **ADAPT**: no model-chosen window (A4). The server acquires one adjusted daily history ending at the analysis date; the browser receives the most recent sessions |
| `get_indicators` | symbol, one indicator, curr_date, look_back 30 | same history, gap-filled; 12 offered names | per-calendar-day text series | computed locally (stockstats); provider only supplies OHLCV | yes, up to 8 names chosen by the model | **REPRODUCE** the computation (definitions R0.3) on the server; **ADAPT** the selection: all 12 offered indicators at the latest session, no per-day window (A-M3) |
| `get_verified_market_snapshot` | symbol, curr_date, look_back 30 | same history, unfilled | latest row, 11 indicators, 30 recent closes | Yahoo only | yes, "source of truth" | **REPRODUCE** its content as structured data (latest row, indicators, recent closes) |
| vendor router / fallback chain | config | — | — | yfinance default | indirectly | **DEFER**: one provider, no chain (FR-008) |
| per-symbol CSV cache (15-min TTL) | — | — | — | — | indirectly | **DEFER**: no cache (FR-022) |
| 429 retry ×3 with backoff | — | — | — | — | indirectly | **DEFER**: single request, typed `rate-limited` (FR-023) |
| `instrument_context` identity lookup | ticker | company profile | prompt text | yfinance profile | yes (prompt) | **DEFER**: the live instrument's name stays configured (as in Feature 005) |
| tool-result sentinel text (`NO_DATA_AVAILABLE`) | — | — | text to the model | — | yes | **ADAPT**: acquisition failures stop the run before any model (FR-014) instead of informing the model |

Indicator sets (source-checked):
- The prompt/tool universe has 12 names (`market_analyst.py` L23–43).
- The snapshot set has 11 names (`snapshot.py` L21–25): the 12 minus `vwma`.
- `vwma` is therefore only in the `get_indicators` universe.
- `mfi` is served by the yfinance path but not offered in the prompt.

Fundamentals and news: not Market Analyst requirements → out of Feature 007 (DEFER, spec Out of Scope).

### R0.7 Reference vs adaptation ledger (Feature 007 additions)

Existing adaptations stay: A1 (analyst fan-out), A3 (fixtures by default), A4 (no tool loop; data
in the prompt, one request per analyst).

| ID | Reference | BrowserTradingAgents | Reason | Fidelity gap |
|---|---|---|---|---|
| A-M1 | model-driven tool loop over three tools, N+1 calls | server pre-acquires one normalized bundle before any runtime; the Market Analyst gets it as `marketFacts` in one request | acquisition-before-runtime (FR-014); A4 already in force; no browser tool calling | the model cannot request other windows or retry a tool |
| A-M2 | `trade_date` from the run; model's dates clamped to it | analysis date = the current date in the instrument's exchange time zone, computed on the server; bars `≤` that date | `live` means "latest available at run time" (Feature 005 semantics) | no historical/backtest dates in live mode |
| A-M3 | model picks up to 8 of 12 indicators, 30-day per-day series each | all 12 offered indicators at the latest session, computed with the R0.3 definitions | deterministic single request; the snapshot already carries latest values | no 30-day indicator series; no model selection |
| A-M4 | indicators on gap-filled history; snapshot on unfilled history | one unfilled validated history; any missing value is a failure (FR-020) | no filled cells presented as data | identical unless the vendor has gaps (then the run fails instead of filling) |
| A-M5 | 5 years "ending today", cached per symbol | one request per run, ≥ 5 years requested ending at the analysis date, no cache | EMA/SMMA depend on history length; matches the reference window | none intended |
| A-M6 | text tool outputs (CSV, Markdown tables) with fixed instruction paragraphs | a provider-independent JSON contract; the browser renders `marketFacts` text from it | FR-003 narrow contract; role contract unchanged | the model sees a compact rendering, not the upstream tables/instructions |
| A-M7 | vendor chain with retry, cache, sentinel strings | one provider, no retry, no cache, typed failures before any model | FR-008, FR-022, FR-023, FR-014 | failures stop the run instead of being narrated |
| A-M8 | Yahoo (unofficial access) is the reference vendor | provider chosen from evidence (R10) | FR-009 | a different vendor's adjusted data can differ slightly |
| A-M11 | a trailing bar without a close is treated as an unsettled session and the last settled bar is used (`ohlcv.py` L263–277). Close-less bars elsewhere are also dropped (`_fill_price_gaps` L115–122; `dropna(subset=["Close"])` L282) | **REPRODUCE** the unfinished-latest-session drop: a bar dated `analysisDate` before 16:00 ET, then a final bar with a null close, are removed and the previous completed session is used. **ADAPT**: a null required cell in any remaining (historical) row is `invalid-data` instead of being dropped or filled | FR-020 for historical rows; availability for the current session | none for the latest session; historical gaps fail the run instead of being skipped |
| A-M12 | snapshot "recent" = the last ≤ 30 **closes** with dates | `recent` = the last ≤ 30 sessions with full OHLCV | lets `marketFacts` state a 30-session range and volume from one structure | wider than the reference snapshot (extra fields only) |

**Main fidelity gap**: A-M1 + A-M3. The reference Market Analyst is an agent that *chooses* its data;
Feature 007 gives it a fixed, verified bundle. Closing that gap is the tool-loop Feature (A4 removal),
not this one.

**Finding F007-R1** (recorded, no change needed): upstream does not pin `stockstats`/`yfinance`
versions, so the reference numbers are defined by R0.3 (resolved `stockstats 0.6.8`). The server
implementation reproduces those definitions and is checked against golden values computed offline
with that library (R8).

**Finding F007-R2** (fidelity): the current `marketFacts` content (Feature 004 fixture text;
Feature 005 five-session close/range/volume text) carries no indicators. Feature 007 widens the
*content* of live `marketFacts` (latest row, 12 indicators, recent closes). The role contract
(`reads: subject, marketFacts`; `writes: marketReport`; the `ask` text) is unchanged, and the
fixture stays byte-identical (FR-004, FR-013).

---

## R1 Fidelity target (decision)

Ownership (FR-006): the server performs deterministic data preparation, meaning acquisition,
provider-specific normalization, and indicator and snapshot computation. It performs no agent
reasoning. The browser renders `marketFacts` and runs the graph.

Server boundary acquires ≥ 5 years of adjusted daily OHLCV for the configured live instrument ending
at the analysis date, validates it, computes the 12 offered indicators at the latest session with
the reference definitions, and returns one normalized bundle:
- the latest session (date, OHLCV)
- the 12 indicator values
- the most recent 30 sessions (date, OHLCV)
- freshness metadata

The browser renders `marketFacts` from it and runs the unchanged graph. Rejected:
- sending 5 years of bars to the browser, which widens the contract and leaks more values
- provider-computed indicators, which is not the reference path and is provider-specific
- reproducing the tool loop (A4 stays)

## R2 Endpoint shape

**Decision**: `GET /api/market?symbol=<SYMBOL>`. The server accepts only the configured live
instrument; anything else returns `invalid-request`. The analysis date is not a parameter
(A-M2).

Rationale:
- It is a safe, idempotent read with no body.
- Cancellation works through `request.signal` (R5).
- There is nothing secret in the URL.
- It is easy to drive from tests.
- Future fields do not need a framework.

POST was rejected: nothing is sent, and it would imply mutation.

## R3 Caching (Next 16.3.6, installed docs + spike)

- The installed docs (`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
  L49–51) say "Route Handlers are not cached by default". `GET` opts in only through
  `dynamic = 'force-static'` or Cache Components (not enabled here). `fetch` "requests are not
  cached" by default (`02-guides/caching-without-cache-components.md` L11).
- Spike (scratch Next 16.3.6 app): a `GET` handler that reads nothing from the request still builds
  as `ƒ (Dynamic)`, and two calls return different timestamps.
- **Decision**: rely on the default, and make it explicit and testable. The route declares
  `dynamic = 'force-dynamic'`, the provider `fetch` passes `cache: 'no-store'`, and the response
  carries `Cache-Control: no-store`. A test asserts that two consecutive calls reach the provider
  stub twice. No cache layer.

## R4 Time zone and session model

- Reference: yfinance timestamps are made time-zone-naive by keeping the exchange-local wall-clock
  date (`ohlcv.py` L75–98; `market.py` L47–49). Session = exchange-local calendar date.
- **Decision**:
  - Session dates are `YYYY-MM-DD` in the instrument's exchange time zone (`America/New_York` for
    the US live instrument), derived with `Intl.DateTimeFormat` from the provider's timestamps, as
    Feature 005 `etDate` does. That reuse is justified by R4 itself, not by Feature 005.
  - The analysis date is the current date in the same time zone, computed on the server.
  - Host time zones never matter; SC-011 runs the normalizer under two `TZ` values.
  - A partial daily candle is never presented as a close (A-M11). The fixed order is in R14
    "Session dating".
  - Weekends and holidays need no calendar: only sessions that Yahoo returns exist.
  - DST is handled by `Intl` with the named time zone.
  - No exchange calendar is implemented.
  - The stale rule is reproduced: latest session > 10 calendar days before the analysis date →
    `unavailable`.

## R5 Cancellation (spike, Next 16.3.6, `next start`)

Scratch route `GET /api/probe` fetches a never-responding local upstream with
`fetch(url, { signal: request.signal })`.
- **Node client abort at 700 ms**: the route logs `request.signal abort` about 700 ms after start.
  The upstream fetch rejects (`ResponseAborted`), and the upstream server sees its socket close
  about 1 ms later.
- **Browser (Playwright Chromium) `fetch` abort at 700 ms**: same sequence (route abort, then
  upstream socket closed, then fetch threw).
- **Decision**:
  - The route passes only `request.signal`.
  - The provider function `acquireYahoo(…, { signal, limitMs = 20_000 })` owns the single time limit
    and combines both signals with `AbortSignal.any([signal, AbortSignal.timeout(limitMs)])`. The
    route has no timer of its own.
  - 20 s is a provider-acquisition ceiling below the browser's 30 s page limit, so a slow provider
    ends as a server-side typed `timeout` before the browser gives up.
  - Tests inject a smaller `limitMs`. Browser Cancel then aborts the browser request, which aborts the route
  and the provider request. This is measured, not assumed.
- **Application guarantee**: independent of any socket, a cancelled run never creates a runtime
  (Feature 005 `prepareLive` checks `signal.aborted` after acquisition; kept).
- **Scope of the evidence**: the spike used a local never-responding upstream, not Yahoo. Yahoo's
  own behaviour on an aborted connection is not claimed.
- **Limitation**: if a provider SDK ignored the signal, provider work could continue. This is why
  raw `fetch` is preferred (R9).

## R6 Failure taxonomy and HTTP error contract

The Feature 005 kinds are kept.
- **Stage**:
  - `acquisition` covers the provider request.
  - `normalization` covers validation and indicators.
  - Model and graph stages keep their existing evidence fields.
- **Response shape**: `{ boundary: 'market-data', stage, kind }`. Messages are fixed per kind, and
  no provider body is ever included.

| Server condition | kind | HTTP |
|---|---|---|
| credential not configured — not reachable on the keyless Yahoo path; kept for future key providers | `credential-missing` | 503 |
| DNS / connect / reset | `network` | 502 |
| provider 401 / 403 (Yahoo refusal) | `unauthorized` | 502 |
| provider 429 | `rate-limited` | 503 |
| provider 5xx / other non-2xx / provider error payload | `provider-error` | 502 |
| server provider time limit (20 s) | `timeout` | 504 |
| no sessions, stale (> 10 days), too little history | `unavailable` | 502 |
| non-JSON, missing/invalid fields, non-monotonic dates, future session | `invalid-data` | 502 |
| symbol not the configured live instrument | `invalid-request` (new; stage `request`) | 400 |
| client aborted | `cancelled` (observed only by the browser; the server stops work) | — |

- The browser maps a non-JSON or unreachable boundary response to `network`, and keeps its own
  30 s page-protection limit (`timeout`).
- The browser trusts `kind` only when it is in the list.
- `invalid-request` is the one new kind. It covers a boundary misuse that Feature 005 could not
  have.

## R7 Feature 005 code (`src/market-data.ts`, `src/main.ts`) — reuse / retire

| Item | Decision |
|---|---|
| `Session`, `MarketSnapshot` types | REUSE WITH ADAPTATION (snapshot gains indicators, freshness, provider id) |
| `MarketDataFailure` kinds | REUSE AS-IS + `invalid-request`; stage added |
| `normalize` (Massive body) | RETIRE from the browser; provider-specific normalization moves to the server adapter (reused only if Massive is chosen) |
| `renderMarketFacts` | REUSE WITH ADAPTATION (renders latest row, indicators, recent range) |
| canonical JSON + `sha256` digests | REUSE AS-IS (canonical form extended to the new fields) |
| `replayArtifact` | REUSE WITH ADAPTATION (normalized bundle + marketFacts + digests; `.local/replay/`) |
| `etDate` | REUSE WITH ADAPTATION (server-side session dating, R4) |
| `ageHours` | RETIRE (replaced by explicit freshness fields, R11) |
| `acquireDailyBars` direct browser fetch with Bearer key | RETIRE after the server path is proven (R13) |
| `replyProvenance` (Massive `status`, `request_id`) | RETIRE from the browser |
| `#key-row` / `#key` password field | RETIRE after proof (R13) |
| `prepareLive` ordering (acquire → normalize → replay → abort check → input) | REUSE; only its acquisition call changes to `fetch('/api/market?…', { signal })` |
| `runGraph`, settle-before-shutdown | UNCHANGED (protected invariant) |

`src/main.ts` changes are allowed in this Feature, but only in the live acquisition step and the key
UI. The graph, `runGraph` and the lifecycle code stay byte-for-byte unchanged.

## R8 Controlled test strategy

- **Provider stub**:
  - The server reads the provider base URL from a server env var that defaults to the real
    provider.
  - Tests point it at a local stub HTTP server, a second Playwright `webServer` entry (L3) or one
    started in-process (L2).
  - The stub replays committed synthetic bodies per scenario and records every request: count,
    path/query (symbol, `period1`/`period2`, `interval=1d`).
  - Scenarios are selected by the symbol/query the stub sees, or by a stub control endpoint used
    only by tests.
  - This adds no production-only hook: the base URL is ordinary configuration.
- **Levels** (extends the Feature 005 ladder):

| Level | What | Where |
|---|---|---|
| L1 | indicators vs golden values; validation, normalization, date/time zone, digests, rendering | `node --test`, no network |
| L2 | route handler called directly with a `Request` against the in-process stub: success, every failure kind, credential-missing (0 stub requests), timeout, abort (stub sees socket close), `no-store` (2 calls → 2 stub requests) | `node --test` |
| L3 | browser → `/api/market` → stub on the Next production server: 8/8 live graph, failure matrix with creates 0 / model requests 0, cancel during acquisition, graph-stage cancel settlement, browser provider-origin requests 0 | Playwright `chromium` |
| L4 / L5 | real provider (stand-in / native), maintainer-approved, separate evidence | owner-run |

- **Golden indicator values**: computed once, offline, with `stockstats 0.6.8` in the frozen
  upstream venv, over a committed synthetic 5-year series. They are committed as a test fixture
  together with the generating command. No network is used.
- **Test count**: `npm test` baseline 62. It grows by the new L1/L2 tests, and the exact number is
  recorded at tasks time. The browser suite grows by the L3 cases, and existing assertions are
  kept.

## R9 Runtime, secret, dependency

- **Runtime**: Node.js, declared explicitly with `export const runtime = 'nodejs'`. It is the
  default already; the declaration makes the deployment target clear, matches the Node `fetch`
  that C0 tests, and prevents an accidental Edge migration. It supports `fetch` with `AbortSignal` (R5). This is also the
  Vercel default for Route Handlers. Edge was not chosen because nothing needs it.
- **Secret**: the canonical Yahoo path needs **no credential**. The Feature 007 server has no
  provider secret, no env var and no `.env` file. The retired Feature 005 browser key field
  disappears (R13), so the application holds no market credential at all.
- **Server-only boundary**:
  - The adapter module is imported only from `app/api/market/route.ts`, checked by a static import
    scan in the style of the Feature 006 T013 scan.
  - A browser test asserts that no request goes to `*.yahoo.com`.
  - `server-only` is not installed (it would also break the plain-Node L2 tests).
- **Dependency**: none. A raw `fetch` of the chart endpoint is used (R14).
- **Logging**:
  - Allowed: adapter id, duration, HTTP status class, `kind`.
  - Forbidden: response bodies and market values.
- **Future optional key providers** (Tiingo, Alpha Vantage, Massive) are separate Features. Their
  secrets would follow FR-024 (server env var, never `NEXT_PUBLIC_*`), for example
  `BTA_MARKET_PROVIDER=tiingo` with `BTA_TIINGO_API_KEY`. Nothing of this is built in Feature 007.

## R10 Provider candidates

Derived required capabilities (from R0/R1):
- split **and dividend** adjusted daily OHLCV (reference: yfinance `auto_adjust=True`)
- ≥ 5 years of history ending at the analysis date, in one request
- a server-side credential that is not placed in the URL
- plain HTTP `fetch` (abort support, R5)
- documented permitted use for a self-hosted personal app

Provider indicators are **not** required (R0.3: computed locally).

Method: documentation, pricing and terms pages only. No data endpoint was called and no key was
used. Quotes are under 15 words and the URLs are listed in the research log. Nothing below is a
legal conclusion.

| Candidate | Technical viability | Permitted use (documented) | Classification |
|---|---|---|---|
| **Tiingo** EOD (`/tiingo/daily/<t>/prices`) | Full `adjOpen/adjHigh/adjLow/adjClose/adjVolume`, adjusted for splits and dividends (CRSP method). Free tier lists "30+ Years". Auth: `Authorization: Token …` header. Free: 50 requests/hour, 1,000/day. `date` = the session date; data around 17:30 ET. Official API, plain HTTP | Own use appears compatible: "you may only use the data for your own personal use". **Restriction identified**: "may not display or share the data with another person" (tiingo.com/about/pricing). Terms page URLs returned 404, so the full terms were not read | **PREFERRED_CANDIDATE**, for self-hosted personal use with each user's own key. A hosted deployment for others needs a different licence |
| **Massive** aggregates | `adjusted` = splits per the docs; dividend adjustment not stated → **fidelity gap** vs the reference. Free tier: 2 years of history, 5 calls/min (5 years on the $29/month Starter). Official API, plain HTTP; Feature 005 used an `Authorization: Bearer` header | Individual, non-commercial use appears compatible (individuals ToS). Key sharing: restriction identified. Redistribution needs business products (secondary summary, not verified). Feature 005 P-1 still DEFERRED | **VIABLE_WITH_CAVEATS** (dividend-adjustment gap; history below 5 years on free tier) |
| **Alpha Vantage** | `TIME_SERIES_DAILY_ADJUSTED` is premium. Free `compact` = latest 100 points only (`full` is premium). Adjusted close only (OHLC would need local adjustment). Key in the URL query (`apikey`). Free tier 25 requests/day | ToS is a PDF whose text was not extractable → **unclear**. "Unlimited … for verified open-source or educational projects" has an unclear process | **NOT_SUITABLE** (free-tier history below the requirement; key in the URL) |
| **Yahoo** chart / `yahoo-finance2` | No official API ("Yahoo does not provide any official API"). Adjusted-field and rate-limit behaviour not documented. Server-only | **Restriction identified**: Yahoo Terms §2.4 prohibit collecting data by "automated means" | **NOT_SUITABLE** (unofficial; documented restriction), although it is the upstream reference vendor |

**Maintainer decision (2026-09-29)**: the canonical provider is **Yahoo, yfinance-compatible**.

Reasons:
- BrowserTradingAgents is a personal research tool.
- A Vercel deployment is the maintainer's personal access to that environment, not a multi-user
  service.
- The canonical path must keep TradingAgents' zero-config experience: end-user API keys 0, signup 0,
  browser credential input 0, deployment secrets 0.
- The upstream reference uses Yahoo (yfinance) for core stock and technical data.

This overrides the documentation-based classification above for canonical status:

| Provider | Feature 007 status |
|---|---|
| Yahoo (yfinance-compatible) | **DEFAULT / CANONICAL** (maintainer decision; R14) |
| Tiingo | FUTURE OPTIONAL PROVIDER (not built) |
| Alpha Vantage | FUTURE OPTIONAL PROVIDER (not built) |
| Massive | FUTURE OPTIONAL PROVIDER (not built; the Feature 005 experiment stays historical) |

- The documented restriction (Yahoo Terms §2.4, automated access) remains a recorded fact. The
  maintainer has accepted it for personal research use. This is a scope decision, not a legal
  conclusion.
- Documentation must not claim the boundary resolves it (FR-025).
- No registry, selection UI, fallback or provider chain is built (FR-008). Future providers would
  attach behind the same provider-independent `MarketBundle` and route.

Research log (URLs read): massive.com/docs/rest/stocks/aggregates/custom-bars, massive.com/pricing,
massive.com/legal/individuals-terms-of-service, alphavantage.co/documentation, alphavantage.co/premium,
alphavantage.co/support, tiingo.com/documentation/end-of-day,
tiingo.com/documentation/general/connecting, tiingo.com/about/pricing, github.com/gadicc/yahoo-finance2,
legal.yahoo.com/us/en/yahoo/terms/otos/index.html. Unread: the Alpha Vantage ToS text (PDF) and the
Tiingo terms pages (404).

## R14 Yahoo-compatible acquisition (Next.js / Node)

Source for the reference behaviour: `yfinance 1.7.0` in the frozen upstream venv. It is read as
code; nothing was executed against Yahoo.

| # | Question | Finding | Decision |
|---|---|---|---|
| 1 | Acquisition method | yfinance `Ticker.history` requests `GET {base}/v8/finance/chart/{ticker}` with `period1`, `period2` (Unix seconds), `interval=1d`, `includePrePost=false`, `events=div,splits,capitalGains`, where `_BASE_URL_ = https://query2.finance.yahoo.com` (`scrapers/history.py` L253–276, `const.py` L2) | **Raw `fetch` of the same chart endpoint** from the Route Handler; no dependency |
| 2 | Endpoint and params | as above; the response is `chart.result[0]` with `timestamp[]`, `indicators.quote[0].{open,high,low,close,volume}`, `indicators.adjclose[0].adjclose` and `meta` (exchange time zone, currency). Errors come as `chart.error.{code,description}` (L305–358; `utils.parse_quotes` L548–571) | adapter reads only these fields; any other shape → `invalid-data` / `provider-error` |
| 3 | Adjusted OHLCV | `auto_adjust`: `ratio = Adj Close / Close`; Open, High and Low are multiplied by `ratio`; Close becomes `Adj Close`; **Volume is not adjusted** (`utils.py` L506–523). If `adjclose` is absent, yfinance silently uses the raw close (L557–559) | reproduce the ratio formula exactly. A missing or non-finite `adjclose` → **`invalid-data`** (A-M9: no silent unadjusted data) |
| 4 | Split/dividend fidelity | `adjclose` is Yahoo's own split- and dividend-adjusted close; yfinance adds nothing on this path (`repair=False` by default) | fidelity = same Yahoo `adjclose` + same formula. The adjustment is not recomputed locally from events |
| 5 | Historical range | upstream `load_ohlcv`: 5 years ending tomorrow, because yfinance's `end` is exclusive (`ohlcv.py` L218–221) | `period1` and `period2` are **Unix epoch seconds** (the Yahoo chart convention). `period1` = 00:00 UTC of analysis date − 5 years; `period2` = 00:00 UTC of analysis date + 1 day. `period2` is treated as exclusive, so the next day guarantees that the `analysisDate` session is inside the range. Bars `≤ analysisDate`. **Five years are always requested**; 260 sessions is only the minimum below which the result is `unavailable` (it does not shorten the request) |
| 6 | Rate limits | undocumented (no official API). yfinance raises `YFRateLimitError` on 429 and the upstream wraps 3 retries with backoff (`ohlcv.py` L41–57) | HTTP 429 → `rate-limited`, **no retry** (FR-023, A-M7). Shared hosting egress (Vercel) may see more 429s: a known risk, surfaced as a typed failure |
| 7 | Cookie / crumb | yfinance mints a cookie+crumb for every request but continues without it when minting fails, commenting that the "target endpoint may not need a crumb (e.g. chart API)" (`data.py` L438–447). yfinance also depends on `curl_cffi`, a browser-TLS-fingerprint HTTP client (METADATA) | **hypothesis, not fact**: the chart endpoint accepts a plain Node `fetch` (non-browser TLS fingerprint) with no cookie or crumb. It is checked by manual approval gate **C0** (`LOCAL_NODE_REACHABILITY`, R14a) before the adapter is built. Any result other than PASS → STOP and a maintainer decision. No automatic crumb, cookie or TLS-fingerprint workaround is attempted |
| 8 | Cancellation | plain `fetch` with `request.signal` (spike R5 with a local upstream: the socket closes about 1 ms after a browser abort; not measured against Yahoo) | forward the signal; `acquireYahoo` owns the single 20 s limit (R5) |
| 9 | Vercel runtime | the Route Handler runs on the Node.js runtime with global `fetch`; no native module, no file system, no cache dir (upstream's CSV cache is not reproduced) | compatible by construction. Deployment is not a Feature gate |
| 10 | Terms | Yahoo Terms §2.4 restrict automated collection (R10) | maintainer-accepted scope: personal research, single user; recorded, not resolved |
| 11 | Response stability | unofficial and undocumented; the shape can change without notice | strict validation (an unexpected shape → typed failure, never partial data); stub tests pin the shape we rely on |
| 12 | Deterministic tests | — | a local stub serves committed synthetic chart JSON (success, `chart.error`, 401/403/429/5xx, non-JSON, missing `adjclose`, NaN/null cells, wrong time zone, stale, short history, hang). The base URL is server config (default `https://query2.finance.yahoo.com`); tests set it to the stub (R8) |

Normalization order (fixed; A-M11):
1. **Shape and alignment**:
   - `chart.result[0]` exists
   - the lengths of `timestamp`, `quote.open`, `quote.high`, `quote.low`, `quote.close`,
     `quote.volume` and `adjclose` are all equal
   - timestamps are strictly increasing: a duplicate or a decrease → `invalid-data`
   - `meta.exchangeTimezoneName` equals the configured `America/New_York`; otherwise `invalid-data`
2. **Date** each bar with `Intl` in that time zone.
3. **Drop the current unfinished session**: if the last bar is dated `analysisDate` and the server's
   current ET time is before 16:00, remove it.
   - `ponytail:` the fixed 16:00 ET cutoff ignores early-close days. Use
     `meta.currentTradingPeriod` if that matters.
4. **Drop an unsettled final bar**: if the last remaining bar's `close` is null, remove it. This
   reproduces upstream's "use the last settled bar".
5. **Historical nulls**: any null or non-finite required cell (OHLCV, `adjclose`) in the remaining
   rows → `invalid-data`.
6. **Adjust** (ratio formula, #3); no rounding (R0.3).
7. **Coverage**:
   - latest session > 10 calendar days before `analysisDate` → `unavailable` (strictly greater,
     like upstream `stale_days > max_stale_days`, `ohlcv.py` L169–170)
   - fewer than 260 sessions → `unavailable`

R14a — C0 outcome classes (`LOCAL_NODE_REACHABILITY`):
- The check is exactly one request from local Node `fetch`, with 0 retries, 0 fallbacks and 0
  credentials.
- It shows only that local Node `fetch` is accepted. It does **not** prove Vercel runtime
  compatibility, which stays an untested limitation.

| Class | Observation |
|---|---|
| PASS | 2xx and the expected chart shape (fields of #2) |
| BLOCKED_RAW_FETCH | 401/403, a consent or challenge page, or HTML / a non-API rejection |
| RATE_LIMITED_INCONCLUSIVE | 429 |
| ENVIRONMENT | DNS, network or connectivity failure |
| CONTRACT_INCOMPATIBLE | 2xx without the expected chart shape |

Ledger additions:
- **A-M9**: reference yfinance silently falls back to the unadjusted close when `adjclose` is
  missing. BrowserTradingAgents fails with `invalid-data`. Reason: FR-020.
- **A-M10**: reference = Python yfinance (curl_cffi session, cookie/crumb, retries, SQLite and CSV
  caches). BrowserTradingAgents = a Next.js server-side `fetch` of the same Yahoo chart endpoint
  with the same adjustment formula. It is **Yahoo-compatible, not an identical implementation**:
  different client, no crumb, no retry, no cache.

## R11 Evidence and replay

`dataSource` in the evidence record, extending the Feature 005 fields:
- `mode: 'live'`, `boundary: 'server'`, `endpoint: '/api/market'`, `provider: '<adapter id>'`
- `symbol`
- `analysisDate` (server), `marketAsOf` (latest session date), `acquiredAt` (server, provider
  response time), `receivedAt` (browser), `usedAt` (run start of the graph)
- `sessions` (count returned), `historySessions` (count used for indicators)
- `snapshotDigest`, `marketFactsDigest`

No market values, secret, provider body, request id with account data, or role text. This follows
the Feature 005 redaction policy.

Replay: `.local/replay/<name>.json` holds the normalized bundle, `marketFacts` and both digests. It
is never committed, and it is reproducible from its own content, not from the provider.

## R12 Checkpoints and states

| Checkpoint | Content | State |
|---|---|---|
| A | baseline; hashes of Feature 001–006 specs/evidence; upstream audit frozen (this file) | `UPSTREAM_CONTRACT_FROZEN` |
| B | contract types, validation, indicators vs golden values, rendering, digests (L1) | `SERVER_CONTRACT_DEFINED` |
| C0 (manual, approval) | one unauthenticated Yahoo chart request from local Node `fetch` (R14a) | `LOCAL_NODE_REACHABILITY` = PASS, else STOP |
| C | Yahoo adapter + stub + route (L2) | — |
| D | browser live path through `/api/market` (L3): success, failure matrix, cancellation, lifecycle | `CONTROLLED_BOUNDARY_VALIDATED` |
| E | security checks (no provider origin, no key field, import scan), evidence/replay; retire the direct path and key field (R13); default-skipped real-Yahoo tests; mutations A–C | `DIRECT_BROWSER_PATH_RETIRED` |
| F | full regression (`npm test`, browser, dev smoke) + native + fixture gate | `IMPLEMENTATION_COMPLETE` |
| G (manual, approval) | real Yahoo L4 (stand-in) / L5 (native) live runs on the exact clean F-commit SHA, no key | `REAL_PROVIDER_VALIDATED` / `BLOCKED` / `DEFERRED` |

`FEATURE_COMPLETE` requires F and a recorded G outcome (SC-017), never a G PASS.

## R13 Direct-browser path retirement

The Feature 005 direct path is retired, not kept as an experiment: two `live` paths would violate
SC-015, and the browser key field contradicts FR-024. Condition: D and E pass, meaning:
- L3 success 8/8
- browser provider-origin requests 0
- the full failure matrix with creates 0
- cancel during acquisition with creates 0
- graph-stage settlement
- no key field, no provider-origin request, adapter import scan clean
- evidence/replay checks

Then `acquireDailyBars`, `replyProvenance`, the Massive `normalize` in the browser, and
`#key-row`/`#key` are removed. The live test cases are rewritten to the server path, keeping every
assertion's meaning. Feature 005 specs and evidence stay untouched.
