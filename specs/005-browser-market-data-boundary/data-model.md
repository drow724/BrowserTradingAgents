# Data Model: Feature 005 — Browser Market Data Boundary

Every entity below is application-local. None of them crosses into AkariSP or `AkariChatModel`.

## DataMode

`'fixture' | 'live'`. "live" means fetched at execution time. With the Massive Basic tier the data is
end-of-day; it is not real-time.

- Parsed from `?data`; the default is `fixture`.
- Independent of `provider: 'native' | 'standin'`.

## LiveInstrument (committed constant)

| Field | Value |
|---|---|
| `symbol` | `IBM` |
| `name` | `International Business Machines Corp.` |
| `currency` | `USD` (configured; the source does not state it) |
| `timeZone` | `America/New_York` |

## SourceResponse (Massive daily aggregates, input only)

- Consumed fields: `status`, `request_id`, `resultsCount`, and `results[].{o,h,l,c,v,t}`.
- Ignored fields: all others (`ticker`, `adjusted`, `queryCount`, `next_url`, `vw`, `n`, `otc`).
- It never enters graph state, role requests or evidence. Only `request_id`, the HTTP status and
  `status` are recorded, as provenance.

## MarketSnapshot (normalized)

| Field | Type | Rule |
|---|---|---|
| `symbol` | string | from `LiveInstrument` |
| `currency` | string | from `LiveInstrument` |
| `sessions` | `{date, open, high, low, close, volume}[]` | 2–5 items, ascending, from the last bars |
| `sessions[].date` | `YYYY-MM-DD` | ET date of `t` |
| `sessions[].open/high/low/close` | number | finite and > 0 |
| `sessions[].volume` | number | integer ≥ 0 |
| `asOf` | `YYYY-MM-DD` | `sessions.at(-1).date` |

**Validation**: see the reject rules in [contracts/market-data.md](contracts/market-data.md). There
are no optional fields: a snapshot is complete or it is not produced.

## MarketProvenance (per live run, recorded)

| Field | Meaning |
|---|---|
| `source` | `massive` |
| `endpoint` | path template without the key: `/v2/aggs/ticker/{symbol}/range/1/day/{from}/{to}` |
| `symbol`, `from`, `to` | request window (ET dates) |
| `requestedAt`, `receivedAt` | ISO UTC timestamps from the page clock |
| `httpStatus`, `providerStatus`, `requestId` | source reply metadata |
| `bars` | number of bars returned |
| `asOf` | snapshot `asOf` |
| `ageHours` | `(receivedAt − asOf 16:00 ET) / 3600 s`, one decimal (observation only) |
| `snapshotDigest` | `sha256:` + hex of the canonical snapshot JSON (keys in the table order), identity only |
| `marketFactsDigest` | `sha256:` + hex of the rendered `marketFacts`, identity only |

## GraphInput (unchanged `TradingFixture` shape)

| Mode | `id` | `subject` | `marketFacts` | `newsFacts` |
|---|---|---|---|---|
| fixture | `tradingagents-fixture@1` | Feature 004 | Feature 004 | Feature 004 |
| live | `live-market@1` | `International Business Machines Corp. (IBM)` | `renderMarketFacts(snapshot)` | `NEUTRAL_NEWS.text` (`neutral-news@1`) |

## MarketDataFailure

- `{ boundary: 'market-data', kind }`
- `kind` ∈ `credential-missing`, `network`, `unauthorized`, `rate-limited`, `provider-error`,
  `timeout`, `unavailable`, `invalid-data`.
- Cancel during acquisition is outcome `cancelled` with `boundary: 'market-data'`.
- Inference-side records keep their Feature 004 form and add `{ boundary: 'inference', kind }` with
  `kind` ∈ `native-unavailable`, `runtime-create`, `model`, `graph`, `cancelled`.

## ReplayArtifact (local only, gitignored `.local/replay/`)

`{ snapshot, marketFacts, snapshotDigest, marketFactsDigest }`. There is no credential and no raw
body. It is never committed.

## Run state transitions

```text
idle → [provider = native and not MODEL_AVAILABLE] → BLOCKED(not-run)   (stand-in skips this check)
idle → acquiring (live) → normalizing → running graph → success | failed(inference) | cancelled
          │                   │
          └→ failed(market-data) / cancelled(market-data)   (no runtime created)
idle → running graph (fixture) → Feature 004 transitions
```
