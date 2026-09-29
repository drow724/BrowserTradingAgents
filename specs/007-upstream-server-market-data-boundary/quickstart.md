# Quickstart: Feature 007 validation

> Canonical provider: Yahoo (yfinance-compatible), keyless (research R10, R14). Nothing below needs a
> credential, account or env file. Automated gates use the local stub; real Yahoo runs are the
> separate manual gates C0 (`LOCAL_NODE_REACHABILITY`, local only; not a Vercel proof) and G (on a
> clean committed SHA).

## Commands (after implementation)

```bash
npm test                 # L1 + L2: indicators vs golden values, validation, time zones, route vs local stub
npm run build            # /api/market listed as ƒ (dynamic)
npm run test:browser     # L3: Next production server + local provider stub; fixture tests unchanged
npm run test:browser:dev # Strict Mode smoke (unchanged)
npm run test:prompt-api -- -g "eight-role"   # native + fixture gate (no provider, no credential)
```

## Checks

| Check | Expected |
|---|---|
| fixture runs (stand-in, native) | 8/8, 8 logical / 0 fallback, no `/api/market` request, no provider request |
| live, stub valid response | browser requests only `/api/market` (0 to `*.yahoo.com`); stub sees 1 chart request with the expected symbol/`period1`/`period2`/`interval=1d`; 8/8 |
| live, each stub failure | typed `market-data` failure with the contract's `stage`/`kind`; creates 0; model requests 0; stub requests as in the contract table |
| live, Cancel during acquisition | `cancelled`; creates 0; stub observes its socket close |
| live, Cancel during the graph | `{ready,0,0}` before shutdown, `settledBeforeShutdown` true, `{closed,0,0}` after |
| two consecutive live calls | stub sees 2 requests (no caching) |
| no credential surface | no key field in the page; no `NEXT_PUBLIC_*`/provider env read; adapter imported only by the route |
| unsettled final bar (null close) | dropped; bundle ends at the previous completed session |
| historical null cell / array length mismatch / duplicate timestamp | `invalid-data` |
| adjustment | stub raw OHLC + adjclose → O/H/L × ratio, C = adjclose, volume unchanged |
| normalizer under `TZ=UTC` and `TZ=Asia/Seoul` | identical bundle and digests |
| Feature 001–006 hashes | unchanged |

Contracts: [market-data-api.md](contracts/market-data-api.md),
[market-data-errors.md](contracts/market-data-errors.md). Model: [data-model.md](data-model.md).
