# Contract: Feature 005 evidence record

Extends `specs/004-browser-tradingagents-fixture-graph/contracts/evidence.md`. Every Feature 004
field and rule applies unless changed here. The record is committed deliberately under
`specs/005-browser-market-data-boundary/evidence/` as `<layer>-<date>-<sha>.json`.

## Additions

```json
{
  "feature": "005-browser-market-data-boundary",
  "input": { "id": "live-market@1 | tradingagents-fixture@1", "news": "neutral-news@1 | tradingagents-fixture@1" },
  "dataSource": {
    "mode": "live",
    "source": "massive",
    "endpoint": "/v2/aggs/ticker/{symbol}/range/1/day/{from}/{to}",
    "symbol": "IBM", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD",
    "requestedAt": "ISO UTC", "receivedAt": "ISO UTC",
    "httpStatus": 200, "providerStatus": "OK", "requestId": "…", "bars": 7,
    "asOf": "YYYY-MM-DD", "ageHours": 0.0,
    "snapshotDigest": "sha256:…", "marketFactsDigest": "sha256:…"
  },
  "failure": { "boundary": "market-data | inference", "kind": "market-data: credential-missing | network | unauthorized | rate-limited | provider-error | timeout | unavailable | invalid-data | cancelled; inference: native-unavailable | runtime-create | model | graph | cancelled" },
  "timing": { "acquisitionMs": 0, "graphMs": 0 }
}
```

- **Base discriminator**: `dataSource.mode` is present in **every** record: success, failure,
  cancelled and BLOCKED.
- **Fixture mode**: `dataSource = { "mode": "fixture", "fixture": "tradingagents-fixture@1" }`. The
  rest of the record is Feature 004's.
- **BLOCKED** (native unavailable, either mode): `dataSource` may be `{ "mode": … }` only; no fetch
  happened.
- **Live-mode failure before the graph**:
  - `dataSource` has whatever was reached; the snapshot fields are absent.
  - `outcome` is `failed` or `cancelled`.
  - `failure.boundary` is `market-data`.
  - The Feature 004 `nodes` are all `waiting`, `counts.logicalRequests` is 0, and `lifecycle` is
    `null` because no runtime was created.

## Changes

- **Live mode `result`**: `{ "<field>": { "present": true, "length": 123 }, … }` for the eight role
  fields. No output text (provider terms, research R6).
- `fixture` (the Feature 004 top-level field) is kept in fixture mode, so Feature 004 assertions
  stay valid, and omitted in live mode. `input` is present in both modes.
- `graph.version` stays `tradingagents-fixture-graph@1`, because the graph is unchanged.

## Rules

- **Forbidden in any record**:
  - the key, or any substring of it
  - an `Authorization` value or a full request URL
  - snapshot values or `marketFacts` text in live mode
  - raw source bodies
- `evidenceClass` follows the provider exactly as in Feature 004: stand-in → `BROWSER_AUTOMATED`,
  native → `REAL_BROWSER_PROMPT_API`. `dataSource.mode` never changes it (FR-016).
- **Gate record for SC-016** requires prerequisite P-1 (F005-P1 resolved) before the run, and must
  have all of the following:
  - `REAL_BROWSER_PROMPT_API`, `provider: native`, `availability: MODEL_AVAILABLE`
  - `dataSource.mode: live`, `source: massive`, `httpStatus: 200`, `providerStatus: OK`, both digests
  - `outcome: success`, eight nodes `done`, 8/0 requests
  - `settledBeforeShutdown: true`, clean revision
- The owner saves the page's record unedited. It contains no secret and no market values by
  construction. The local replay artifact (contracts/market-data.md) is separate and never committed.
- SC-009 / FR-014 (successful live records): the record reproducibly identifies the snapshot and `marketFacts` through
  `snapshotDigest` and `marketFactsDigest`. The values live only in the local replay artifact
  (F005-P2 closed).
- Feature 001–004 records are never rewritten.
