# Contract: `GET /api/market`

Same-origin, server-side. The only market-data surface the browser uses in `live` mode.

## Request

```http
GET /api/market?symbol=IBM
```

- `symbol` must equal the configured live instrument; otherwise `400 invalid-request`.
- No date parameter: the server fixes `analysisDate` (research R2, A-M2).
- No credential, header or body from the browser. The browser passes its run `AbortSignal`.

## Success — `200`

Headers: `Content-Type: application/json`, `Cache-Control: no-store`.
Body: a `MarketBundle` ([data-model.md](../data-model.md)). Example with **fictional values**:

```json
{
  "symbol": "IBM", "currency": "USD", "provider": "yahoo-chart@1", "adjustment": "split-dividend",
  "analysisDate": "2026-01-09", "marketAsOf": "2026-01-08", "acquiredAt": "2026-01-09T15:00:00.000Z",
  "historySessions": 1256,
  "latest": { "date": "2026-01-08", "open": 101.2, "high": 102.9, "low": 100.8, "close": 102.5, "volume": 4100000 },
  "indicators": { "close_10_ema": 101.7, "close_50_sma": 99.3, "close_200_sma": 95.1, "macd": 0.84,
    "macds": 0.61, "macdh": 0.23, "rsi": 58.2, "boll": 100.9, "boll_ub": 104.1, "boll_lb": 97.7,
    "atr": 1.92, "vwma": 101.4 },
  "recent": [ { "date": "2026-01-07", "open": 100.9, "high": 101.8, "low": 100.1, "close": 101.3, "volume": 3900000 },
              { "date": "2026-01-08", "open": 101.2, "high": 102.9, "low": 100.8, "close": 102.5, "volume": 4100000 } ]
}
```

## Failure — non-2xx

Body: `{ "boundary": "market-data", "stage": "…", "kind": "…" }` only
([market-data-errors.md](market-data-errors.md)). Never a provider body, URL, header or key.

## Server behaviour (normative)

- Ownership: deterministic data preparation only (acquisition, normalization, indicators, snapshot);
  no inference (FR-006).
- `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`. Next 16 already
  leaves Route Handlers uncached; these declarations are explicit defense in depth.
- The route passes only `request.signal`. `acquireYahoo(…, { signal, limitMs = 20_000 })` owns the
  single time limit, and the provider `fetch` uses `cache: 'no-store'`.
- `period1`/`period2` are Unix epoch seconds; `period2` = analysis date + 1 day (00:00 UTC), treated
  as exclusive.
- Exactly one provider request per call; no retry, no cache, no fallback.
- Provider (hypothesis until C0 PASS: no cookie/crumb needed): Yahoo chart endpoint `GET {base}/v8/finance/chart/{symbol}?period1&period2&interval=1d&includePrePost=false&events=div,splits` with no credential, cookie or crumb (research R14). Adjusted OHLC = raw × (adjclose / close); volume unadjusted.
- Logs: adapter id, duration, provider status class, `kind`. Never the key, auth header, bodies or
  values.
- The provider base URL is server configuration (default `https://query2.finance.yahoo.com`); tests
  point it at a local stub (research R8). Nothing else is configurable.

## Browser behaviour (normative)

- Calls only this endpoint in `live` mode; no provider origin is ever contacted by the browser.
- Accepts the body only if it validates as `MarketBundle`; otherwise `invalid-data`.
- On a non-2xx response uses `kind`/`stage` if valid, else `network`.
- Keeps the 30 s page-protection limit (`timeout`) and maps its own abort to `cancelled`.
- Creates no runtime until the bundle is validated, rendered and the run is still not aborted.
