# Data Model: Feature 007 — normalized market bundle

Derived from the upstream audit (research R0–R1).
- Field names are BrowserTradingAgents names; no provider field name appears here.
- All numbers are **unrounded** JSON numbers. Decimal formatting happens only when `marketFacts`
  text is rendered (research R0.3).
- Dates are `YYYY-MM-DD` session dates in the instrument's exchange time zone (R4).
- The server computes the bundle (FR-006: deterministic data preparation, no inference).

## MarketBundle (browser-facing success body of `GET /api/market`)

| Field | Type | Req | Meaning | Source | Freshness |
|---|---|---|---|---|---|
| `symbol` | string | yes | the configured live instrument (e.g. `IBM`) | server config | — |
| `currency` | string | yes | configured listing currency (`USD`) | server config (not from provider) | — |
| `provider` | string | yes | adapter id `yahoo-chart@1`: provenance metadata only, no URL. Client application logic MUST NOT branch on it; provider-specific behaviour exists only in the server adapter | server | — |
| `adjustment` | `'split-dividend'` | yes | O/H/L/C = raw × (Yahoo adjclose / close), volume unadjusted — yfinance `auto_adjust` formula | adapter | — |
| `analysisDate` | date | yes | "today" in the exchange time zone when the server handled the request; upper bound for sessions (A-M2) | server clock | request time |
| `marketAsOf` | date | yes | date of the latest settled session used | provider data | the data applies to this session's close |
| `acquiredAt` | ISO-8601 UTC | yes | when the server received the provider response | server clock | acquisition time |
| `historySessions` | integer ≥ 260 | yes | sessions used to compute indicators. Five years are always requested; 260 is only the minimum-validity threshold (fewer → `unavailable`), never a target length | provider data | — |
| `latest` | Session | yes | the `marketAsOf` session (snapshot "latest verified OHLCV row") | provider data | as `marketAsOf` |
| `indicators` | Indicators | yes | the 12 offered indicators at `marketAsOf` (R0.3 definitions) | computed on the server | as `marketAsOf` |
| `recent` | Session[] (1…30, ascending) | yes | the last ≤ 30 sessions ending at `marketAsOf` (snapshot "recent closes", with full OHLCV) | provider data | — |

### Session

| Field | Type | Req | Rule |
|---|---|---|---|
| `date` | date | yes | strictly increasing; `≤ analysisDate`; not the current session while it is open (R4) |
| `open`, `high`, `low`, `close` | number | yes | finite, `> 0`, `low ≤ min(open, close)`, `high ≥ max(open, close)` (compared with a relative tolerance of 1e-9, because adjusted O/H/L are raw × ratio while close is Yahoo's adjclose itself) |
| `volume` | integer | yes | `≥ 0` |

### Indicators

Exactly these keys, each a finite number (never defaulted; a non-finite result is `invalid-data`):
`close_10_ema`, `close_50_sma`, `close_200_sma`, `macd`, `macds`, `macdh`, `rsi`, `boll`,
`boll_ub`, `boll_lb`, `atr`, `vwma`.
- These are the 12 names the reference prompt offers (the `get_indicators` universe). `mfi` is not
  offered there and is omitted.
- The reference verified snapshot uses 11 of them, all but `vwma` (`snapshot.py` L21–25).
- The bundle carries all 12 (research A-M3).

## MarketDataFailure (browser-facing error body)

| Field | Type | Values |
|---|---|---|
| `boundary` | const | `'market-data'` |
| `stage` | enum | `request`, `acquisition`, `normalization` |
| `kind` | enum | `credential-missing`, `network`, `unauthorized`, `rate-limited`, `provider-error`, `timeout`, `unavailable`, `invalid-data`, `cancelled`, `invalid-request` |

Mapping and HTTP status: [contracts/market-data-errors.md](contracts/market-data-errors.md).
`cancelled` and browser-side `network`/`timeout` are produced by the browser, not returned by the
server.

## Graph input (unchanged type `TradingFixture`)

`{ id: 'live-market@2', subject: '<name> (<symbol>)', marketFacts: renderMarketFacts(bundle),
newsFacts: NEUTRAL_NEWS.text }`. `marketFacts` is plain text rendered in the browser from the bundle:
latest session (date, OHLCV, change vs previous close), the 12 indicator values, the 30-session
range and average volume, each sentence tagged (`market fact L1…`) for provenance tests. The Market
Analyst's `reads`/`writes`/`ask` do not change (FR-004).

## Time fields

| Field | Producer | Meaning |
|---|---|---|
| `analysisDate` | server | "today" in the exchange time zone when the request was handled |
| `marketAsOf` | provider data | date of the latest completed session in the bundle |
| `acquiredAt` | server | when the provider response was received |
| `receivedAt` | browser | when the bundle response was received |
| `usedAt` | browser | recorded in the `prepareLive` path **immediately before `runGraph` is invoked** with the validated bundle's `marketFacts`. The protected `runGraph` block is not changed |

## Evidence `dataSource` (live)

`{ mode: 'live', boundary: 'server', endpoint: '/api/market', provider, symbol, analysisDate,
marketAsOf, acquiredAt, receivedAt, usedAt, sessions, historySessions, snapshotDigest,
marketFactsDigest }` on success; on failure `{ mode, boundary, endpoint, symbol }` plus
`failure: { boundary, stage, kind }`. No prices, indicator values, secret or provider body
(Feature 005 redaction policy).

## Digests and replay

- `snapshotDigest` = `sha256` of the canonical JSON of the bundle with keys in the order of this
  document (built explicitly, as Feature 005 does).
- `marketFactsDigest` = `sha256` of the rendered text.
- Replay artifact (local only, `.local/replay/`): `{ bundle, marketFacts, snapshotDigest,
  marketFactsDigest }`; `npm test` re-renders and re-digests it when present.

## State transitions (live run)

```text
idle → acquiring (browser fetch /api/market) ──failure/cancel──► done (market-data failure; creates 0)
          │ 200 + valid bundle
          ▼
     rendering (marketFacts, digests, replay; abort check) ──cancel──► done (cancelled; creates 0)
          ▼
     graph (runtime created only now) → settle → shutdown → done
```
