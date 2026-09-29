# Contract: `GET /api/directory`

Same-origin, server-only acquisition (Feature 007 pattern). Browser never contacts a source (FR-014).

## Request

`GET /api/directory` — no parameters. Any query string is ignored (no base URL, key or source from the client).

## Response 200

`Content-Type: application/json`, `Cache-Control: no-store` (browser caching is the client's Cache Storage copy, R4).
Body: `Directory` (data-model.md). Returned whenever at least one source has entries (ok or stale).

## Response 503

`{ "kind": "unavailable", "sources": SourceStatus[] }` when no source has ever produced a good copy.
No raw source body, status text or key ever appears in any response.

## Server behaviour

| Condition | Source status | Upstream requests |
|---|---|---|
| first request of a Seoul day, cache from an earlier day | refresh once (single flight) | ≤ 1 refresh per source per day |
| refresh succeeds | `ok`, `asOf` = source date | — |
| refresh fails (network, timeout 20 s, non-2xx, unparsable, 0 rows) | `stale` if a last good copy exists, else `unavailable` | no retry until next day |
| `BTA_DATA_GO_KR_KEY` unset | KR `credential-missing` | 0 KR requests |
| concurrent requests during a refresh | await the same refresh | 0 extra |

A KR refresh = paged calls to `getItemInfo`, `getETFPriceInfo`, `getETNPriceInfo` (research R2); it succeeds
only if all three succeed. A US refresh = `nasdaqlisted.txt` + `otherlisted.txt`; succeeds only if both parse.

The server module takes its clock as a parameter (`now = () => new Date()`), so tests can move to the next
Seoul day without waiting (C12). If the browser has no `caches` (insecure context), the client keeps the
directory in memory for the page's lifetime only.

## Configuration (server-only env; never `NEXT_PUBLIC_*`)

| Env | Use |
|---|---|
| `BTA_DATA_GO_KR_KEY` | data.go.kr service key (secret; never logged or returned) |
| `BTA_DATA_GO_KR_BASE_URL` | test seam; default `https://apis.data.go.kr/1160100/service` (the value includes the path prefix; operations are appended as `/<Service>/<operation>`) |
| `BTA_NASDAQ_TRADER_BASE_URL` | test seam; default `https://www.nasdaqtrader.com/dynamic/SymDir` (files appended as `/<name>.txt`) |

## Compact entry rows

`[assetClass, productType, name, ticker, market]` — see data-model.md. Test issues and footer lines excluded.
