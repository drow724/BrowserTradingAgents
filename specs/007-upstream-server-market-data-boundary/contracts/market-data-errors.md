# Contract: market-data failures

Shape: `{ boundary: 'market-data', stage: 'request' | 'acquisition' | 'normalization', kind }`.
Messages shown to the user are fixed per `kind` (no provider text).

| Condition (server unless noted) | stage | kind | HTTP | Provider requests |
|---|---|---|---|---|
| `symbol` ≠ configured instrument | request | `invalid-request` | 400 | 0 |
| server credential not configured (future key providers only; never emitted on the keyless Yahoo path) | acquisition | `credential-missing` | 503 | 0 |
| DNS / connect / reset to provider | acquisition | `network` | 502 | 1 |
| provider 401 / 403 | acquisition | `unauthorized` | 502 | 1 |
| provider 429 | acquisition | `rate-limited` | 503 | 1 |
| provider 5xx, other non-2xx, `chart.error` payload | acquisition | `provider-error` | 502 | 1 |
| provider limit (`limitMs`, default 20 s, owned by `acquireYahoo`) exceeded | acquisition | `timeout` | 504 | 1 (aborted) |
| body not JSON | normalization | `invalid-data` | 502 | 1 |
| array length mismatch, duplicate or non-increasing timestamp, null cell in a historical row (after the unfinished/unsettled final bar is dropped, research R14 order), missing/invalid field, missing `adjclose`, null cell, exchange time zone ≠ configured, non-increasing or future date, OHLC inconsistency, non-finite indicator | normalization | `invalid-data` | 502 | 1 |
| no sessions, latest > 10 days before `analysisDate`, < 260 sessions | normalization | `unavailable` | 502 | 1 |
| browser: boundary unreachable / non-JSON error body | acquisition | `network` | — | unknown to the browser |
| browser: 30 s page limit | acquisition | `timeout` | — | — |
| browser: user Cancel (request aborted; route `request.signal` aborts the provider fetch, research R5) | acquisition | `cancelled` | — | — |

In every row: AkariSP runtime creations 0, model requests 0, no fixture substituted (FR-014, FR-015).
Model/graph failures keep their existing evidence fields and are never reported with
`boundary: 'market-data'` (FR-019).
