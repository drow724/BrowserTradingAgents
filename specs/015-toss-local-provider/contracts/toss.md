# Contract: Toss local provider

## Outbound (server → Toss), the complete allowlist

| Method | Path | Header `X-Tossinvest-Account` |
|---|---|---|
| POST | `/oauth2/token` | no |
| GET | `/api/v1/accounts` | no |
| GET | `/api/v1/holdings` | yes |
| GET | `/api/v1/candles` | no (`symbol`, `interval=1d`, `before` for older pages; ≤ 3 pages) |

Any other method or path is rejected before `fetch` (test-enforced). No order, conditional-order or WebSocket path
exists in the code.

## GET /api/toss/status

`200 { available: true }` or `200 { available: false, reason: '<Korean reason>' }`. No secret, token or account data.

## GET /api/toss/holdings

- `200 { positions: TossPosition[] }` (data-model.md: `code, country, name, quantity, averagePrice, currency`),
  `Cache-Control: no-store`.
- Failures: `{ boundary: 'toss', kind }` with 503 `not-configured`, 502 `unauthorized` / `forbidden-ip` /
  `provider-error` / `invalid-data` / `ambiguous-account`, 503 `rate-limited`, 504 `timeout`.
- Server log line: `{ provider: 'toss', ms, status, kind }` — never positions, codes, account data or secrets.

## GET /api/market?symbol=<form>&source=toss

- Same symbol forms and bundle as Feature 014; `source` defaults to `yahoo`; `source=toss` with the provider
  unavailable → `503 { boundary: 'market-data', stage: 'request', kind: 'not-configured' }`.
- The bundle's `provider` is `toss-candles@1`; the cache key includes the source.

## Browser

- `loadSources() / saveSources()` (`src/sources.ts`); `mapPositions(positions, directory)` → import result
  (`src/toss-import.ts`); `fetchQuotes(holdings, signal, get, source)`.
