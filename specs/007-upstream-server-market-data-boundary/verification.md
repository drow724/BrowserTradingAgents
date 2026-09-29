# Verification: Feature 007 — Upstream-Compatible Server Market Data Boundary

## Checkpoint A

### T001 Baseline (2026-09-29)

| Item | Value |
|---|---|
| branch | `007-upstream-server-market-data-boundary` |
| HEAD = origin/main | `f4d976c1cee1344cbcc15de128b6f3c44b817479` |
| git status | untracked only: `.claude/`, `.specify/*` tooling, `CLAUDE.md`, this feature directory |
| node / npm | v23.9.0 / 10.9.2 |
| `npm ls --depth=0` | @langchain/core@1.2.13, @langchain/langgraph@1.4.18, @playwright/test@1.63.0, @types/node@22.20.4, @types/react-dom@19.3.0, @types/react@19.3.0, akarisp@0.1.0-alpha.2, next@16.3.6, react-dom@19.3.0, react@19.3.0, typescript@5.9.3 |
| `npm test` | **62** (61 pass, 0 fail, 1 skip) — Feature 007 baseline |
| `npm run test:browser` | 28 passed |
| `npm run test:browser:dev` | not run: the webServer could not start because a maintainer `next dev` (PID 42581, started 14:18 local, port 3000) was already running in this checkout. Next 16 allows one dev server per project; the process was not touched. Re-run at T007 |

### T002 Protected hashes

78 files (`git ls-files specs/001-… specs/002-… specs/003-… specs/004-… specs/005-… specs/006-nextjs-application-shell src/graph src/integration harness test/standin.ts app/harness/page.tsx components/Boot.tsx | xargs shasum -a 256`).
`runGraph` section (`awk '/^async function runGraph/,0' src/main.ts | shasum -a 256`):
`922db7527716b5f318776e6aea9fdc4c076c3385b65add03089cc72b89f38ec8`.

```text
1d945190f06f2fab75330f945b0ab7257e6d983a448cdbbd4fffdf37c63ca954  app/harness/page.tsx
1f1e9896186eab6a53a95790d12135b55b537b431fd9853891623696ebc05212  components/Boot.tsx
791971c27ab834f44075697eeae5af3a4997163f78e2cb6b4b219ec8b1ec67f0  harness/index.html
d9ec9319b249d39b6fb37c38f3be7dfebac0a7a92ce8b11df3bdcdff2a9651e6  harness/main.ts
1532dc6476e7abff69d1d7293ed6706012e26b5340e5be5004a350a896430703  specs/001-tradingagents-reference-analysis/checklists/requirements.md
714ec8e5ff479bd9d351ca637f8f052298f118bf762e6ca5bc24cf72714f0981  specs/001-tradingagents-reference-analysis/plan.md
324b1361ad829cc120e1d4c0424cdba58379a129b3f887c62d74ee9bd452ddea  specs/001-tradingagents-reference-analysis/research.md
3878b0af91dc8b2def895178895fb75b59be43bbf30061903e80684b4a35bdb8  specs/001-tradingagents-reference-analysis/spec.md
acd8ba84ced817211910af3ec38154c16e554ddd8fb5e130cd19b173359ee50b  specs/001-tradingagents-reference-analysis/tasks.md
d4bec122fb9207335858bad2399bd6ac64a6bd899fb6485e4194945d5c309b3d  specs/002-langchain-akarisp-integration-validation/checklists/requirements.md
87940542f59477aef2d08341b83d441b0ca97c9480d8ad5cd9578da5aa76babf  specs/002-langchain-akarisp-integration-validation/contracts/bridge.md
a355f02926cdd347fde02bc38d6bc8b31ff452cba8e559783df19b8ccf38aac6  specs/002-langchain-akarisp-integration-validation/contracts/evidence.md
4f52433f3d1ac403a1dddbddf766b4d6eb244b9d73a7a19a660bf6a8ea5cce48  specs/002-langchain-akarisp-integration-validation/data-model.md
7dd24a07d61a60608d9f48fb6e18cfc3cc07082242a4b6d9666820ab87a037e9  specs/002-langchain-akarisp-integration-validation/evidence/browser-automated-2026-09-28.json
8cbc3c573d48277bc9bcf89860a8c5d59e352cdabaa56efff49d402db042a292  specs/002-langchain-akarisp-integration-validation/evidence/real-browser-2026-09-28-ce3f946.json
e62c9a7d1daa055039759254279fba89ede46e693589f5551db633c7dc6225db  specs/002-langchain-akarisp-integration-validation/evidence/real-browser-2026-09-28.json
f2e8a366503840eac54c3bf8898d1a69560cb7c7806e65365f9541507ff1a949  specs/002-langchain-akarisp-integration-validation/plan.md
9ae780e47a9ff8d79ec07870aac6db716e555f274a377f479cd653071cba0bea  specs/002-langchain-akarisp-integration-validation/quickstart.md
9d95802b184ded45e464169643a85846a8095fd4e83666dde78933f5e23f7c96  specs/002-langchain-akarisp-integration-validation/research.md
a6a06bd042e8a42fa83771759ec8b7df915f8fedb393ba1af8b890369b5872df  specs/002-langchain-akarisp-integration-validation/spec.md
406c3ae54c0bc8711a9f1dc5dc01f4d3ea8f77146c1f90bfff581733afa88be5  specs/002-langchain-akarisp-integration-validation/tasks.md
80e396313a5f637002dc4787eaca358a57acc765630dc30cf6c9561fa5f77291  specs/002-langchain-akarisp-integration-validation/verification.md
0d14cfc25fb8eb805991d3d3d93f02b2164efe95014a87bab06bdbfd923723b4  specs/003-langgraph-akarisp-minimal-graph/checklists/requirements.md
4fabebf3b0d97d45c6de8258fc3e6cbfb0ffec951651683bdf0d613dd1fec8a9  specs/003-langgraph-akarisp-minimal-graph/contracts/evidence.md
f18ecc6a28387fcb39889b8e11ee2d4910cab5d75c4151a52a7c2664defef175  specs/003-langgraph-akarisp-minimal-graph/contracts/graph.md
d29e4634760eebc5f5605ce17056e0c07009b72406abe7b3bab33530d4c0e1f8  specs/003-langgraph-akarisp-minimal-graph/data-model.md
2c83260d0f1cff02edc9d45b554507969df59285ca5a087c4c363852ca4579ff  specs/003-langgraph-akarisp-minimal-graph/evidence/browser-automated-2026-09-28-4e64472.json
1c3306adc44aed0f6388a50491682ff42fa56477006df9cfb172c2896429cc67  specs/003-langgraph-akarisp-minimal-graph/evidence/browser-automated-2026-09-28.json
84ec0eb5818668d918730881766c48b61e7c95c202e5990ea0690c77747d00ab  specs/003-langgraph-akarisp-minimal-graph/evidence/real-browser-2026-09-28-4e64472.json
99949901743079a57c010e4d352b41782736f965c7518c5f5fce248dbbf6e11b  specs/003-langgraph-akarisp-minimal-graph/plan.md
bc3f94673136f7c33d00896e50760bb3d62dcbfb730f15753874adddb00f00f7  specs/003-langgraph-akarisp-minimal-graph/quickstart.md
bb9efa0b97ae6875153cdd6555d2391e4ae0fd6f892caed2e2517a7dc0029376  specs/003-langgraph-akarisp-minimal-graph/research.md
cc5a442da0c2aa0de0d67fab101cd9073d3ac6b3090659ffa65aa75c7065bc7a  specs/003-langgraph-akarisp-minimal-graph/spec.md
71e66b39b0d1d3c0c54921f854ac522d71e054fa5fddd23a127188e32b258017  specs/003-langgraph-akarisp-minimal-graph/tasks.md
035b02aefbe56658b81861f1863e23f14b6cb1dd7918e6ef137af4339654b7e7  specs/003-langgraph-akarisp-minimal-graph/verification.md
2a0e395c1703be7c964c5bd2d9fb802b6b80860efbaaf5583df594f7619e0245  specs/004-browser-tradingagents-fixture-graph/checklists/requirements.md
35b982ae35b4894d5bdd544f9c9bb58e5caebb4f5ad0440158d82a19966e15fa  specs/004-browser-tradingagents-fixture-graph/contracts/evidence.md
74309f4c8019e4ff0ba858828075dab21a0955fd463e3bd49e54469ec7a96d69  specs/004-browser-tradingagents-fixture-graph/contracts/graph.md
a159cf3d0ae1c0f7903a1eff74d9c73548fa0d180a8ea314486cf20e46c66f9d  specs/004-browser-tradingagents-fixture-graph/data-model.md
c6471f02773dfacaab6f5116de03b265ceb97bd49dc0dec92d1666d34d385c1f  specs/004-browser-tradingagents-fixture-graph/evidence/browser-automated-2026-09-28-a0584fd.json
d32ad68438b9bcd6388da8340b7230b7fa1ff4a1fbfcd3ab5837acd53c30c017  specs/004-browser-tradingagents-fixture-graph/evidence/real-browser-2026-09-28-a0584fd.json
dabe803f5bdaeb0be4881db4d5aae70ff9a73adf3bfcf81d62c4260728a1a5d2  specs/004-browser-tradingagents-fixture-graph/plan.md
e1f0cc58e72fb4bb8635d62fb2811d72f09762cbe38ff362e40a62cace005fa7  specs/004-browser-tradingagents-fixture-graph/quickstart.md
ee115463b5a908aaccd2e30024a572ac096c35ea69001983ed85c638bb1861c4  specs/004-browser-tradingagents-fixture-graph/research.md
8e1b732d1bf79355d2306c34e1c4f315daf6c1f5977fdf867cd64ec51c1a8d2b  specs/004-browser-tradingagents-fixture-graph/spec.md
67998c88b17f1ae8e220d560b6bbbdf63d5eaddbd960f39c866ca4a30309c4ec  specs/004-browser-tradingagents-fixture-graph/tasks.md
f8e7e7c13c66dfa82b2c0d038b6dcbf2e1510e69eec98d48d4d86e24f7a30d50  specs/004-browser-tradingagents-fixture-graph/verification.md
5dc4c1f84ee2c8bf3159991ba5aa9b6ba46576a1623288baa0107a65f9104d0b  specs/005-browser-market-data-boundary/checklists/requirements.md
111326ce2d54c4f8ff6b01e8509d937a4f9219cf4d576e4ad39c72833cb7fc8a  specs/005-browser-market-data-boundary/contracts/evidence.md
fea514154e79fd26c1e44c4dc9404e1d0d7a2a1a36cca1b723966f63f698f7ba  specs/005-browser-market-data-boundary/contracts/market-data.md
474e1face27980d255fc0de5f3febb50c484ddb4eb17443258a0ff03c790e8af  specs/005-browser-market-data-boundary/data-model.md
cc24472c650775c14cd6da76735c34acdf1f4f541ec713d2856af2d56f2c34c8  specs/005-browser-market-data-boundary/evidence/real-browser-fixture-2026-09-28-0543a69.json
2a89012e7cdc2fd92608e96f4c2d5e49645f798cfb01136d3e2fa3d255b879a7  specs/005-browser-market-data-boundary/plan.md
07acd6b3a3879b85a0f789fc286ec95ab99300a4ec743d124d069676fe94f661  specs/005-browser-market-data-boundary/quickstart.md
fd18720dfcdcd5494839b8a77eda442570eacdd58eb6d6fb21721c50ceee132f  specs/005-browser-market-data-boundary/research.md
d75a8feb138114f2b5517072bfd1f726ebb082f4ea46bc1b030dede066b680c5  specs/005-browser-market-data-boundary/spec.md
953a34c8253cff65b014024bc8f42884b88d4dc81a01667453fdddf45c10e3f5  specs/005-browser-market-data-boundary/tasks.md
083f0d708b5d186181fa3934f5bbf2482c3909960e9bccda20aeb6667d23bff8  specs/005-browser-market-data-boundary/verification.md
26c7ae2fe4ef393215308d74ed4b808bc28d0ae3d70d5f2d6c155b5c17df29b3  specs/006-nextjs-application-shell/checklists/requirements.md
7066560ea331851ddba9f71b1a6ea08464e58d9db301e42cdc3cfb0d3d3e466e  specs/006-nextjs-application-shell/contracts/evidence-equivalence.md
b5933d42b5c0962f636eb9d5bd1d2ed925eddc0ac8dcc6425ce974bed37990e7  specs/006-nextjs-application-shell/contracts/shell-boundary.md
520c64684cf217ec5f7b39c476b7e6c25190ad70beea215e35f08fa399b23f4d  specs/006-nextjs-application-shell/evidence/baseline-vite-harness-standin-2026-09-29-c64021e.json
dc526ff2de7d1a7d3d08f25f35643208ce63f6afcd74556a374b4382280ae22b  specs/006-nextjs-application-shell/evidence/baseline-vite-standin-fixture-2026-09-29-c64021e.json
2ae7155bcb2d98eda144e023a05bf5b4cee1a15a3ab8361d7a5f86764dd3762d  specs/006-nextjs-application-shell/evidence/next-harness-standin-2026-09-29-c64021e-dirty.json
5d7b2d3923f02ff041a0f89c89e26e602545baf7c5e542a3128e6006a89a8e4b  specs/006-nextjs-application-shell/evidence/next-standin-fixture-2026-09-29-c64021e-dirty.json
51afc3035aface8d6491be9d1889ec4bac94fac47a4bf40ec06097a7e6f38a2f  specs/006-nextjs-application-shell/evidence/real-browser-next-fixture-2026-09-29-a303192.json
1eeb468197ba564b959dd5655017dc86f286a06b282bc4ec92cf89714c202520  specs/006-nextjs-application-shell/evidence/real-browser-next-fixture-pre-retirement-2026-09-29-5eb4fc0.json
6b21e4a7ee7b1a69f2e2ea36d5331e6876c78b1127675b75c9a9b5a4f404d122  specs/006-nextjs-application-shell/plan.md
4fb25384c5ab08d9c08419438a48f90c848942cd619431ef131efefbf4f9f58f  specs/006-nextjs-application-shell/quickstart.md
f6c20a2191c6fca3b4f2bd66a69e94af7c80a2dba3c93dcc5aca6deeacf5a462  specs/006-nextjs-application-shell/research.md
707336b46e78dca153b29c362db86d48d6d359069603daf86c12a3de2d8970ff  specs/006-nextjs-application-shell/spec.md
9563e16f3eb52eff5191db4a0e7a53a06b76e2b22dddf7bd50ad540feddb1b16  specs/006-nextjs-application-shell/tasks.md
06d61ee7b0ff419ed6d96c13efadee85f04650ebe3bbd93c93a6add265acd8fe  specs/006-nextjs-application-shell/verification.md
e7a514d82cc55a24fa3d6cf73003bd5b499c689d7cd31c6ed1a5dd41d5bc4836  src/graph/trading-fixture.ts
69f3df1912f4c677145e3933328939510024f5fba258fb1be9b9ab9d9515598f  src/graph/trading-graph.ts
c243b34ab613a1fc53e3cd577dc72f80b04b9b6b37c5e448499368247509ad35  src/integration/akari-chat-model.ts
209ff6bb3ca3ac68aaee053a2f532b68e4247cdfeee0f6fe8243483566b0e013  src/integration/structured.ts
ba2beb00c405dcee61e0671f2aa9171b2e8d10203a8ab7515f887f7ae05a46ae  test/standin.ts
```

### T003 Upstream audit basis

`~/git/TradingAgents` HEAD `35543d0248bf89fcb92b17a15858ad0c0e940687`, `status --porcelain` empty.
Observed venv versions (not upstream pins; upstream declares `>=`): `stockstats 0.6.8`,
`yfinance 1.7.0`.

**Checkpoint A: UPSTREAM_CONTRACT_FROZEN.**

## Checkpoint B

- **T004** `test/fixtures/market/generate-golden.py`, run once offline:
  `~/git/TradingAgents/.venv/bin/python test/fixtures/market/generate-golden.py`
  (Python 3.13.2, observed `stockstats 0.6.8`, `pandas 3.0.6`; no network).
  - Input: 1,300 synthetic weekday sessions from 2021-01-04, smooth deterministic functions,
    unrounded, integer volume.
  - Golden rows 30, 250 and 1299 (last), each computed on the prefix slice `[0..N]`. The script
    asserts prefix value == full-series value for every indicator (causality; research R0.3 also
    checked N = 30/250/599 on a 600-row series, max difference 0).
  - Outputs (sha256): `history.json` `0d0e4cec…0222`, `golden.json` `3aa61f03…e1e1`; script
    `76c4ab87…2a4b`. `golden.json` records the library versions. Tests do not need Python.
- **T005** `src/market-bundle.ts`:
  - types (`Session`, `Indicators`, `MarketBundle`, `MarketDataFailure` with `stage`),
    `INDICATOR_NAMES` (12; comment names the snapshot's 11 = all but `vwma`)
  - `computeIndicators` (stockstats definitions: SMA/rolling sums `min_periods=1`, EWM
    `adjust=True` as num/den recursion, RSI first row 50, Bollinger sample std ×2, TR with the first
    previous close = own close as in stockstats `_shift_arr`, ATR SMMA 14, VWMA 14 typical price with
    unadjusted volume, MACD 12/26/9)
  - `sessionDate`, `validateBundle` (data-model rules; returns the canonical key order)
  - `renderMarketFacts` (only place with `toFixed(2)`), digests, `replayArtifact`
  - No Node-only import, no dependency, no provider field name.
- **T006** `test/market-bundle.test.ts`: 34 tests.
  - 1 name-set check, 7 golden family tests (SMA, EMA, MACD, RSI, Bollinger, ATR, VWMA), 1
    no-warm-up check.
  - 1 fixture sanity, 1 valid/canonical, 18 invalid-data rules.
  - render, digests, replay.
  - time zone (child processes `TZ=UTC` vs `TZ=Asia/Seoul`: identical dates + digest), 1
    sessionDate.
  - Tolerance `|a−b| ≤ 1e-9·max(1,|b|)` after rejecting non-finite values. Observed worst relative
    difference: 5.9e-14 (`boll_lb` at row 1299).
- **T007 gate**:
  - `npm run typecheck` rc 0
  - `npm test` **96** = baseline 62 + 34 new (95 pass, 0 fail, 1 skip — the existing
    local-replay skip)
  - pre/post digest equal for typecheck and test (`diff=da39a3ee…` empty tracked diff)
  - protected hashes 78/78 OK; `runGraph` section hash unchanged (`922db752…`)
  - Yahoo requests 0; credentials 0; dependencies unchanged
  - `test:browser:dev` still not runnable while the maintainer's `next dev` (PID 42581) is up; to
    be re-run at the next browser gate

**Checkpoint B: SERVER_CONTRACT_DEFINED.** Next: T008 (APPROVAL REQUIRED), not executed.

## Checkpoint C0

- **T008** `LOCAL_NODE_REACHABILITY` (maintainer approved). A scratch script outside the repo made
  **exactly one** `fetch`: local Node v23.9.0, `redirect: 'manual'` so that a redirect cannot turn
  into a second request, no custom header, cookie, crumb or credential, 0 retries, 0 fallbacks.
  - executed 2026-09-29T06:00:40.048Z; analysis date (ET) 2026-09-29
  - URL: `https://query2.finance.yahoo.com/v8/finance/chart/IBM?period1=1632873600&period2=1790726400&interval=1d&includePrePost=false&events=div,splits`
    (epoch seconds: 2021-09-29 00:00 UTC and 2026-09-30 00:00 UTC)
  - HTTP 200, `content-type: application/json;charset=utf-8`
  - shape: JSON; `chart` present; `chart.result` array; `chart.error` null; `result[0].timestamp`,
    `indicators.quote[0].{open,high,low,close,volume}`, `indicators.adjclose[0].adjclose` and
    `meta` present; all seven arrays have equal length
  - `meta.exchangeTimezoneName` = `America/New_York`; `meta.currency` = `USD`; rows = 1254
  - No prices, body, cookie or token recorded.
  - **Classification: PASS**, which means only this: in this local environment, an ordinary Node
    `fetch` without a crumb or cookie received the expected chart response shape. It does not
    prove Vercel compatibility, endpoint stability, rate-limit behaviour or production viability.
  - Yahoo requests so far: 1.

## Checkpoint C

- **T009** `src/server/market-provider.ts` (`acquireYahoo`, `normalize`, `YAHOO_ORIGIN`,
  `ADAPTER_ID = 'yahoo-chart@1'`):
  - one `fetch` with `cache: 'no-store'` and `redirect: 'manual'` (a 3xx maps to
    `provider-error`; no second request)
  - signal `AbortSignal.any([signal, AbortSignal.timeout(limitMs)])`, `limitMs` default 20 000:
    the only timer. Caller abort → `cancelled`, limit → `timeout`, other rejection → `network`
  - 401/403 → `unauthorized`; 429 → `rate-limited`; other non-2xx or `chart.error` →
    `provider-error`; non-JSON → `invalid-data`
  - normalization in the fixed R14 order:
    1. shape, 7-array alignment, strictly increasing integer timestamps, exchange time zone
    2. dating
    3. drop the analysis-date bar before 16:00 New York (`ponytail:` early-close ceiling)
    4. drop a final bar with a null close
    5. remaining null/invalid or future row → `invalid-data`
    6. ratio adjustment, volume raw, no rounding
    7. stale (> 10 days) or < 260 sessions → `unavailable`

    Then indicators, `recent` = last 30, `validateBundle`.
  - no retry, cookie, crumb, fallback or dependency; Yahoo field names stay in this file
- **T010** `app/api/market/route.ts`:
  - `export const runtime = 'nodejs'`, `export const dynamic = 'force-dynamic'`
  - `symbol` must equal `LIVE_INSTRUMENT.symbol`, else 400 `request/invalid-request`
  - `analysisDate` = today in `America/New_York` (server)
  - passes only `request.signal`
  - base URL = `process.env.BTA_YAHOO_BASE_URL ?? YAHOO_ORIGIN` (server env only; any request
    parameter is ignored)
  - HTTP map per contract (`cancelled` → 499, observed only by a disconnected client)
  - body is the bundle or `{boundary, stage, kind}` only; `Cache-Control: no-store`
  - one log line `{adapter, ms, status class, kind}`
- **T011** `test/fixtures/market/stub-bodies.ts`: synthetic Yahoo chart JSON from
  `history.json`, with `adjclose = close × 0.97` except the last 10 bars.
  - Scenarios: valid, valid-unadjusted, unsettled-final, historical-null, length-mismatch,
    duplicate-timestamp, non-monotonic, wrong-time-zone, missing-adjclose, future-bar, short,
    chart-error (404), chart-error-200, unauthorized (401), forbidden (403), rate-limited (429),
    server-error (500), non-json, hang, network (socket destroyed).
  - Error bodies carry a leak marker.
  - **Deviation**: `.ts` instead of the task's `.mjs`, so the L2 tests type-check it. Node ≥ 22.18
    strips types, so `e2e/market-stub.mjs` (T014) can import it.
- **T012** `test/market-route.test.ts`: 28 tests. It runs an in-process `node:http` stub;
  `fetch` is wrapped to throw on any `yahoo.com` host.
  - valid: 200, no-store, exactly 1 request, path `/v8/finance/chart/IBM`, query = `period1`,
    `period2` (epoch seconds of analysis date − 5y / + 1d, 00:00 UTC), `interval=1d`,
    `includePrePost=false`, `events=div,splits` and nothing else
  - adjustment exact on the 30 recent rows, some adjusted; golden parity through the route
    (unadjusted history → stockstats values at row 1299, tolerance 1e-9 relative)
  - unsettled final bar → 200 ending at the previous session; analysis-date bar dropped at
    15:00 ET, kept at 16:30 ET (injected clock)
  - failure matrix (17 cases): each yields the contract status, stage and kind, exactly 1 stub
    request (no retry), `no-store`, and no leak marker
  - stale 11 days → `unavailable`; exactly 10 days → 200
  - invalid symbol (`AAPL`, missing, path-like plus a `base=` parameter) → 400 with 0 stub
    requests
  - two calls → 2 stub requests (no caching)
  - cancellation: abort while the stub hangs → `cancelled`, and the stub sees its socket close
  - timeout (`limitMs` 50) → `timeout`, and the socket closes
  - `credential-missing` is never produced
- **L1 addition**: `validateBundle` compares the OHLC ordering with a relative tolerance of 1e-9,
  because adjusted O/H/L are raw × ratio while close is `adjclose` itself (float rounding).
  data-model.md is updated, and 1 L1 test is added (`market-bundle.test.ts` now 35).
- **T013 gate** (pre/post digest equal for every command; tracked diff empty):
  - `npm run typecheck` rc 0
  - `npm run build` rc 0, listing `ƒ /api/market` (dynamic)
  - `npm test` **125** = baseline 62 + L1 35 + L2 28 (124 pass, 0 fail, 1 skip — the existing
    local-replay skip)
  - server-only scan:
    - `server/market-provider` is imported only by `app/api/market/route.ts`
    - `NEXT_PUBLIC_` 0
    - `BTA_YAHOO_BASE_URL` is read only in the route
  - `.next/static` contains 0 files with `finance.yahoo.com`, `yahoo-chart@1`,
    `v8/finance/chart`, `market-provider` or `acquireYahoo`
  - protected hashes 78/78; `runGraph` section hash unchanged
  - `package.json` and lock unchanged (dependencies 0); AkariSP 0
  - real Yahoo requests: still **1** (T008 only)
  - State: **Checkpoint C complete** (server boundary implemented against the stub).

## Checkpoint D

- **T014** `e2e/market-stub.mjs`: a local Yahoo stand-in on `127.0.0.1:${STUB_PORT}` serving the
  `stub-bodies.ts` scenarios.
  - `POST /__scenario {name, endDate?}`, `POST /__reset`, `GET /__stats`
    `{requests, lastPath, lastQuery, closedSockets}`
  - Test-only; not imported by `app/` or `src/`.
- **T015** `playwright.config.ts`:
  - `webServer` is now an array: the unchanged app server (prod `next build && next start`, or
    `next dev` only under `BTA_DEV_SMOKE=1`) with `env.BTA_YAHOO_BASE_URL` pointing at the stub,
    plus the stub itself
  - `stubPort = STUB_PORT ?? app port + 24` (5198 by default)
  - Projects and the dev/prod split are unchanged; one app server per invocation.
- **T016** `src/main.ts`, live acquisition only:
  - `prepareLive` → `acquireFromServer`: one same-origin `fetch('/api/market?symbol=IBM', {signal})`
    under the unchanged 30 s page limit (`setTimeout`, drivable by the page clock)
    - 200 → `validateBundle` (else `normalization/invalid-data`)
    - non-2xx → the server's `{stage, kind}` if valid, else `acquisition/network`
    - rejection → `cancelled` / `timeout` / `network`
  - then `replayArtifact` (bundle, marketFacts, digests), the abort check, and
    `dataSource {mode, boundary: 'server', endpoint, symbol, provider, analysisDate, marketAsOf,
    acquiredAt, receivedAt, sessions, historySessions, snapshotDigest, marketFactsDigest}`
  - `usedAt` is set in `run()` immediately before `runGraph` is called
  - the input is `{id: 'live-market@2', subject, marketFacts: rendered text, newsFacts: neutral
    fixture}`; the graph state gets `marketFacts` text only, never the bundle
  - The Massive imports are removed from `src/main.ts`; the old functions remain unused in
    `src/market-data.ts` until T021. Transitional: `#key-row` still renders in live mode and is not
    read.
  - `runGraph` section hash unchanged (`922db752…`).
- **T017** `e2e/app.spec.ts` live section, rewritten for the server path (25 live tests; guard
  aborts every non-localhost request; stub `/__stats` read by the test runner). Replacements for
  the removed Feature 005 Massive cases:

| Feature 005 case (removed) | Feature 007 replacement |
|---|---|
| controlled Massive success (request URL, Bearer header, values not in record, replay) | `/api/market` success: 1 browser `/api/market` call, 0 external, 0 `Authorization`, 1 stub request (path, `interval`, `includePrePost`, `events`), 8/8, 8/0, creates 1, lifecycle `{ready,0,0}` → `{closed,0,0}`, new `dataSource` keys exactly, `acquiredAt ≤ receivedAt ≤ usedAt`, replay/digest identity, no price/indicator values in evidence, neutral news |
| 11-case failure matrix (network, 401, 403, 429, 500, status ERROR/DELAYED, invalid price, one bar, non-JSON, empty key) | 15-case matrix through the stub: network, 401, 403, 429, 500, chart.error, non-JSON, missing adjclose, historical null, length mismatch, duplicate timestamp, wrong time zone, future bar, short history, stale; each `{boundary, stage, kind}`, creates 0, logicalRequests 0, graphRuns 0, lifecycle null, empty result/replay/market, 1 stub request (no retry). `credential-missing` has no keyless equivalent |
| acquisition limit (page clock +30 s) | same, plus the stub sees its socket close |
| Cancel during acquisition | same, plus the abort reaches the stub (`closedSockets` 1) |
| Cancel during the graph | same, with `snapshotAfterShutdown` `{closed,0,0}` |
| native + live BLOCKED | same, with 0 `/api/market` calls and 0 stub requests |
| four mode URLs | same; fixture modes make 0 `/api/market` calls |
| dummy key leakage | replaced by: 0 `Authorization` headers from the browser (success test); the key-field checks move to T021 |
| — | new: two consecutive live runs → 2 `/api/market` calls, 2 stub requests, creates 2 |

  - Test (a) now asserts 0 `/api/market` calls in fixture mode.
- **T018 gate** (pre/post digest equal for every command):
  - `npm run typecheck` rc 0
  - `npm test` 125 (124 pass, 0 fail, 1 skip)
  - `npm run test:browser` (production `next build && next start` + stub) **32 passed** = 28 − 21
    Feature 005 live cases + 25 Feature 007 live cases
  - `npm run test:browser:dev` **1 passed**: the maintainer's `next dev` was no longer running, and
    only `next dev` + stub were started
  - `.next/static`: 0 files contain `finance.yahoo.com`, `yahoo-chart@1`, `v8/finance/chart`,
    `market-provider`, `acquireYahoo` or `api.massive.com`; `/api/market` appears (the browser's
    own call)
  - protected hashes 78/78; `runGraph` hash unchanged; `package.json` and lock unchanged; AkariSP 0
  - real Yahoo requests: still **1**
  - State: **CONTROLLED_BOUNDARY_VALIDATED**.

## Checkpoint E

- **T019** security boundary (import paths checked, not bare strings):
  - `src/server/market-provider.ts` is imported only by `app/api/market/route.ts`. It is a server
    Route Handler; the browser entry `src/main.ts` imports only `src/market-bundle.ts`, which
    imports nothing of the adapter. No barrel file; no `import(` of the adapter.
  - `BTA_YAHOO_BASE_URL` is read only in the route (server env). The request's query and body
    never select a URL. L2 shows a `base=` parameter is ignored and gives 400 with 0 stub requests.
  - `NEXT_PUBLIC_` 0.
  - `.next/static`: 0 files with `finance.yahoo.com`, `yahoo-chart@1`, `v8/finance/chart`,
    `market-provider`, `acquireYahoo`, `api.massive.com` or `BTA_YAHOO`.
  - Failure bodies are `{boundary, stage, kind}` only (L2 leak-marker checks).
  - Client `provider ===` checks refer only to the LLM provider axis (`standin`/`native`);
    `bundle.provider` is only copied into evidence.
  - L3 success asserts: 0 external browser requests; 0 `Authorization` headers; 0
    password/`#key`/`#key-row` elements; `localStorage` and `sessionStorage` both empty
    (market-provider credential scope).
- **T020** evidence and replay:
  - L3 success asserts the exact `dataSource` key set, `acquiredAt ≤ receivedAt ≤ usedAt`, the
    replay digest = the evidence digest = SHA-256 of the replay content, and no price/indicator
    values in `#evidence`. It now writes `evidence.json`.
  - Saved unedited: `evidence/controlled-live-standin-2026-09-29-f4d976c-dirty.json` (sha256
    `cb65aca9…d9b7`; stand-in + controlled Yahoo stand-in; `+dirty` because Feature 007 is
    uncommitted). Contents:
    - `feature: 007-upstream-server-market-data-boundary`, outcome `success`, 8/0
    - `{ready,0,0}` → `{closed,0,0}`, `settledBeforeShutdown` true
    - `dataSource` = mode/boundary/endpoint/symbol/provider/analysisDate/marketAsOf/acquiredAt/
      receivedAt/usedAt/sessions/historySessions/two digests
    - role outputs presence + length only; no market values (synthetic anyway)
  - `test/market-bundle.test.ts` +1: local `.local/replay/*.json` bundle artifacts re-render and
    re-digest without network (skipped when none).
- **T021** retirement (after T018–T020 passed):
  - Deleted `src/market-data.ts` (Massive acquisition, `replyProvenance`, Massive `normalize`,
    `ageHours`, `buildLiveInput`, ET helpers). `LIVE_INSTRUMENT` moved to `src/market-bundle.ts`.
  - `#key-row`/`#key` removed from `app/page.tsx` and `src/main.ts`. The page's data paragraph
    now says live data is fetched by the app's own server from Yahoo at run time with no key.
  - `src/main.ts` evidence `feature` → `007-upstream-server-market-data-boundary` (the live
    evidence contract changed).
  - `e2e/prompt-api.spec.ts`: the Feature 005 owner-run Massive L5 test (`BTA_MASSIVE_KEY`, key
    typed into the page) was removed; the Yahoo L5 of T023 replaces it.
  - `specs/005-browser-market-data-boundary/` unchanged (`git diff --quiet HEAD`); protected
    hashes 78/78.
  - Deleted `test/market-data.test.ts` (19 tests), mapping:

| Retired (Massive-specific) | Feature 007 coverage |
|---|---|
| normalize ×6 (last 5 bars, 2–3 bars, determinism, status≠OK, missing results/too few, invalid values, descending/duplicate/future dates) | L2 `market-route.test.ts` matrix (invalid-data/unavailable/provider-error rows), L1 validation rules |
| ET dates across DST, host TZ irrelevant | L1 `sessionDate` tests + TZ=UTC/Asia/Seoul child-process test |
| ageHours / replyProvenance | retired (replaced by explicit `acquiredAt`/`receivedAt`/`usedAt`; no provider fields leave the server) |
| renderMarketFacts ×2, digests | L1 render/digest tests on the bundle |
| buildLiveInput (subject, neutral news, FIXTURE unchanged) | L3 success (subject, neutral news); fixture unchanged via test (a) and the graph tests |
| acquire ×4 (credential-missing, request/header, status map, network/cancel/timeout) | L2 request shape, status map, cancellation, timeout; `credential-missing` has no keyless equivalent |
| replay synthetic + local Feature 005 artifacts | L1 replay round-trip + local bundle-artifact check |

- **T022** `docs/testing.md`:
  - command table updated
  - live = `/api/market` → Yahoo-compatible server path, no key, Massive path retired; personal
    research scope, unofficial endpoint risk, §2.4 restriction recorded, no Vercel claim from T008
  - fixture stays canonical; native gate = native + fixture
  - future providers not built
  - replay; approval-gated real-Yahoo runs
  - The Massive key sections are removed (kept in Feature 005 history).
- **T023** `e2e/real-yahoo.ts` + `real Yahoo L4` (`app.spec.ts`) + `real Yahoo L5`
  (`prompt-api.spec.ts`), both `test.skip` unless `BTA_REAL_YAHOO=1`.
  - Under `BTA_REAL_YAHOO=1`, `playwright.config.ts` drops the stand-in and `BTA_YAHOO_BASE_URL`
    and greps projects to `/real Yahoo/` only, so no controlled test can reach Yahoo.
  - Evidence block:
    - tested revision + clean flag
    - Node/Next/Chrome versions
    - `environment: local`, `provider: yahoo-compatible`, path
    - browser→Yahoo count (measured); server→Yahoo "not directly instrumented"
    - classification PASS / BLOCKED(stage/kind) / FAIL, timestamp
  - Default runs report it as skipped (`test:browser`: 32 passed, 1 skipped). Not executed.
- **T024** mutations (each: copy → apply → designated test → restore from copy → `cmp` identical →
  test passes again):
  - **A** `src/server/market-provider.ts`: no adjustment (ratio 1, close = raw close).
    - The designated L2 adjustment test failed on the adjusted open: actual 128.0677 (raw) vs
      expected 124.2256 (raw × 0.97).
    - First attempt (ratio 1 but close = adjclose) was rejected as the proof: it made the bundle
      invalid (OHLC order) and the test failed on a missing body, not on adjustment. The
      designated test now also asserts status 200 first.
    - Restored `897c1756…`; re-pass.
  - **B** `app/api/market/route.ts`: `signal: new AbortController().signal` (caller signal not
    forwarded; type-safe).
    - The designated L2 cancellation test failed: kind `network` instead of `cancelled` (the
      caller's abort was not observed as a cancellation).
    - The provider request ended on its own about 1.2 s later; that cause was not investigated,
      since the designated invariant failed as intended.
    - Restored `d010f87a…`; re-pass.
  - **C** `src/main.ts`: `await createRuntime(RUNTIME_OPTIONS)` before `prepareLive`.
    - The designated L3 test (`unauthorized → market-data`) failed at `expect(await
      creates(page)).toBe(0)`, received 1.
    - Restored `bd34bf98…`; `runGraph` hash unchanged.
  - Residue: `grep -rn MUTATION src app e2e test` → 0; all three files `cmp`-identical to their
    copies.
- **T025 gate** (pre/post digest equal for every command):
  - `npm run typecheck` rc 0; `npm run build` rc 0 (`ƒ /api/market`)
  - `npm test` **107** (106 pass, 0 fail, 1 skip = the local bundle-replay check) = 125 − 19
    retired + 1 new
  - `npm run test:browser` **32 passed, 1 skipped** (real Yahoo L4)
  - `npm run test:browser:dev` 1 passed
  - protected hashes 78/78; `runGraph` `922db752…`; `specs/005-…` unchanged; `package.json`/lock
    unchanged; AkariSP 0
  - one canonical live path (`/api/market`); no key UI
  - real Yahoo requests: still **1**
  - State: **DIRECT_BROWSER_PATH_RETIRED**.

## Checkpoint F

- **T026 full automatic gate** (no real Yahoo, no commit, no native run; `BTA_REAL_YAHOO` unset;
  no user `next dev` running). The pre/post digest was equal for all 7 commands
  (`diff=e6a8ca2d… untracked=344339e7…`); no command rewrote a tracked file.

| # | Command | Result |
|---|---|---|
| 1 | `npm run typecheck` | rc 0 |
| 2 | `npm run build` | rc 0, `ƒ /api/market` |
| 3 | `npm test` | **107** (106 pass, 0 fail, 1 skip = the local bundle-replay check; no artifact present) — baseline 62 + L1 35 + L2 28 − 19 retired Feature 005 + 1 replay = 107 |
| 4–6 | `npm run test:browser` ×3 | 32 passed, 1 skipped each; the skip is `real Yahoo L4` (opt-in) |
| 7 | `npm run test:browser:dev` | 1 passed (Strict Mode: creates 1, 8 logical, each role once) |

  - The 32 production tests cover:
    - fixture test (a), with 0 `/api/market` calls
    - lifecycle (b)–(e)
    - controlled live success: 8/8, 8/0, `/api/market` 1, external 0, `Authorization` 0, stub 1
    - 15-row failure matrix: creates 0, logicalRequests 0, graphRuns 0, no fixture
    - page timeout
    - acquisition cancel, with the stub socket closed and creates 0
    - graph-stage cancel: `{ready,0,0}` → `{closed,0,0}`, settled true
    - native + live BLOCKED
    - two runs → 2 stub requests
    - four mode URLs
    - evidence key set, time order and digest/replay linkage; no key/password input; empty
      storage
    - harness ×2
  - Scans:
    - the adapter is imported only by the route
    - `BTA_YAHOO_BASE_URL` is read only in the route
    - `NEXT_PUBLIC_` 0
    - `.next/static` provider strings 0
    - `MUTATION` markers 0
  - The mutated files keep their pre-mutation hashes (`897c1756…`, `d010f87a…`, `bd34bf98…`).
  - Protected hashes 78/78; `runGraph` `922db752…`; specs 001–006 unchanged; `package.json` and
    lock unchanged; AkariSP 0; no server process left running.
  - Real Yahoo requests: **1** (T008 only).
- **T027** (maintainer approved): commit `4b4925f4a589d7e9712c32f4dc1c979991be8310` (not pushed).
  - 30 files: 6 modified, 2 deleted (`src/market-data.ts`, `test/market-data.test.ts`), 22 added
    (route, adapter, bundle, stubs, fixtures, tests, the Feature 007 spec directory including the
    controlled-live evidence).
  - Excluded: `.claude/`, `.specify/*`, `CLAUDE.md` and generated output.
  - The staged review found no 001–006 file, package file or AkariSP change. The two `MUTATION`
    matches in the staged diff are sentences in this file.
  - The evidence has no Bearer/Authorization/cookie/Yahoo URL/OHLC field; role outputs are
    presence + length.
  - After the commit: code paths clean; protected 78/78; `runGraph` `922db752…`; `package.json`
    and lock unchanged since `f4d976c`; real Yahoo requests 1.
- **T028** native + fixture gate (maintainer approved), at clean `4b4925f4a589d7e9712c32f4dc1c979991be8310`:
  - `npm run test:prompt-api -- -g "eight-role"`, 2026-09-29T06:37:58Z–06:39:18Z; production server;
    installed Google Chrome **154.0.8037.58** (`--version`; the record's reduced user agent reads
    `HeadlessChrome/154.0.0.0`), `channel: 'chrome'`, headless; `BTA_REAL_YAHOO` unset.
  - 1 passed (1.2 m). Evidence saved unedited (`cmp` identical):
    `evidence/real-browser-next-fixture-2026-09-29-4b4925f.json` (sha256 `09df8dab…0574281`).
  - Validation, all PASS:
    - `REAL_BROWSER_PROMPT_API`, runner `playwright`, provider `native`, `MODEL_AVAILABLE`
    - revision = the T027 SHA without `+dirty`; `feature` 007
    - `dataSource {fixture, tradingagents-fixture@1}`; outcome `success`
    - 8/8 `done` with executions 1 / modelRequests 1; graphRuns 1, logicalRequests 8,
      fallbackRequests 0
    - `{ready,0,0}` before shutdown, `settledBeforeShutdown` true, `{closed,0,0}` after
    - no stand-in text; graphMs 46442 (operational only)
  - Network: fixture mode does not use the live acquisition path. Browser and server market
    requests were not separately instrumented in this run. The cumulative real-Yahoo count stays
    **1** per this record (only T008 sent one; no real-Yahoo test was enabled).
  - After the run: code paths clean (digest pre = post, empty diff); protected 78/78; `runGraph`
    unchanged; no server left running.
  - State: **IMPLEMENTATION_COMPLETE**.

## Checkpoint G

- **T029** real Yahoo (maintainer approved), sequentially at clean `4b4925f4a589d7e9712c32f4dc1c979991be8310`.
  `BTA_REAL_YAHOO=1` removes the stand-in and selects only the "real Yahoo" tests. Code paths
  were clean before and after each run (digest pre = post, empty diff).
  - **Request accounting**:
    - The webServer log (`DEBUG=pw:webserver`) shows exactly **one** `/api/market` acquisition
      log line per run (`{"adapter":"yahoo-chart@1","status":"2xx"}`).
    - Each acquisition is one provider `fetch` with `redirect: 'manual'` and no retry.
    - The Yahoo network request itself was not packet-instrumented: the evidence states
      server → Yahoo as "not directly instrumented".
    - Cumulative real Yahoo requests: T008 1 + L4 1 + L5 1 = **3**.
  - **L4** `BTA_REAL_YAHOO=1 npx playwright test --project=chromium -g "real Yahoo"`
    (2026-09-29T06:44:23Z–06:44:30Z): 1 passed.
    - Browser: Playwright Chromium 153.0.8010.12; stand-in model.
    - Browser direct Yahoo requests 0 (every non-local request aborted and recorded: none);
      `/api/market` 1.
    - `dataSource` live/server/`yahoo-chart@1`, `analysisDate` 2026-09-29, `marketAsOf`
      2026-09-28, `historySessions` 1254, `sessions` 30.
    - 8/8, 8/0, `{ready,0,0}` → `{closed,0,0}`.
    - Evidence `evidence/real-yahoo-standin-2026-09-29-4b4925f.json` (sha256 `8ff6e53b…67e4`),
      classification PASS.
  - **L5** `BTA_REAL_YAHOO=1 npm run test:prompt-api -- -g "real Yahoo"`
    (06:44:48Z–06:45:54Z), run after L4 PASS: 1 passed.
    - Installed Google Chrome 154.0.8037.58; `REAL_BROWSER_PROMPT_API`, native,
      `MODEL_AVAILABLE`.
    - Live/server/`yahoo-chart@1`, `analysisDate` 2026-09-29, `marketAsOf` 2026-09-28,
      `historySessions` 1254.
    - 8/8 `done` (executions 1, modelRequests 1); logicalRequests 8, fallbackRequests 0.
    - `{ready,0,0}` before shutdown, `settledBeforeShutdown` true, `{closed,0,0}` after.
    - No stand-in; `acquiredAt ≤ receivedAt ≤ usedAt`; browser direct Yahoo 0.
    - Evidence `evidence/real-yahoo-native-2026-09-29-4b4925f.json` (sha256 `0b046cf2…d6b`),
      classification PASS.
  - Both evidence files were copied unedited (`cmp`). They hold metadata and digests only: no
    OHLCV fields, `adjclose`, `marketFacts` text, cookie, crumb or auth header; role outputs are
    presence + length.
  - After both runs: protected 78/78; `runGraph` `922db752…`; `package.json` and lock unchanged;
    AkariSP 0.
  - **T029 status: PASS** → `REAL_PROVIDER_VALIDATED`. This means that, in this local environment
    on 2026-09-29, browser → Next server → real Yahoo → MarketBundle → the eight-role graph (stand-in
    and native) succeeded. It does not show Vercel compatibility, endpoint stability, absence of
    rate limits, official API support or public-service suitability, and it says nothing about
    trading quality.

## T030 Final audit

Implementation revision: `4b4925f4a589d7e9712c32f4dc1c979991be8310` (base `f4d976c`). Only
closeout documentation and evidence are uncommitted (outside the revision code paths). `npm test`
re-run at HEAD: 107 (106 pass, 0 fail, 1 skip).

### Functional requirements

| FR | Implementation | Verification | Status |
|---|---|---|---|
| 001 | research R0 (tools, params, dates, indicators, snapshot, router, prompt entry, file/line at `35543d0`) | T003 basis; source re-read at T009/T024 | PASS |
| 002 | R0.6 table (REPRODUCE/ADAPT/DEFER) + ledger A-M1…A-M12 | ledger audit below | PASS |
| 003 | `src/market-bundle.ts` types + `validateBundle`; no provider field names | L1 (18 invalid rules), L2 matrix | PASS |
| 004 | role contract untouched (`src/graph/*` hashed); only `marketFacts` content | 78/78; L3 input id/subject/neutral news | PASS |
| 005 | `/api/market`; browser `fetch` same-origin only | L3: external 0, `/api/market` 1; L4/L5 browser→Yahoo 0 | PASS |
| 006 | server = acquisition, normalization, indicators, snapshot, bundle, error translation; graph/AkariSP/Prompt API in browser | route/adapter code; L3 graph runs in page; T028/T029 L5 native in browser | PASS |
| 007 | browser imports only `market-bundle.ts` | import scan; `.next/static` provider strings 0 | PASS |
| 008 | one adapter, no registry/selection/fallback | code review; scan | PASS |
| 009–011 | provider decision recorded (R10: Yahoo canonical, others future) | T008 PASS; T029 PASS | PASS |
| 012 | axes independent; `live` = server path | L3 four mode URLs; native+live BLOCKED | PASS |
| 013 | fixture never calls `/api/market` | test (a) `/api/market` 0; T028 native+fixture | PASS |
| 014 | `prepareLive` acquires/validates before `runGraph` | L3 15-row matrix creates 0; mutation C | PASS |
| 015 | failures return typed record, no fixture | L3: empty result/replay/market, no Northwind | PASS |
| 016 | route passes `request.signal`; adapter forwards | L2 abort; L3 cancel (stub socket closed); mutation B | PASS |
| 017 | `runGraph` untouched | L3 graph-stage cancel; hash `922db752…` | PASS |
| 018 | kinds + `stage`; `invalid-request` added | L2/L3 exact `{boundary, stage, kind}` | PASS |
| 019 | market-data vs inference boundaries | L3 (market-data) vs graph cancel (inference) | PASS |
| 020 | no filling/defaulting; ratio or invalid | L2 null/length/duplicate/missing adjclose; mutation A | PASS |
| 021 | `Intl` exchange-zone dating | L1 TZ=UTC vs Asia/Seoul identical | PASS |
| 022 | `force-dynamic`, `no-store` fetch + header | L2 two calls → 2; L3 two runs → 2 | PASS |
| 023 | single fetch, no retry, `redirect: 'manual'` | L2/L3 stub count 1; T029 one acquisition log line per run | PASS |
| 024 | no provider secret; key UI retired | L3 0 password/key inputs, empty storage, 0 Authorization | PASS |
| 025 | docs state the boundary does not resolve terms | `docs/testing.md` data-modes section | PASS |
| 026 | Massive path retired after D/E proofs | T021 after T018–T020; one live path | PASS |
| 027 | `dataSource` provenance + freshness + digests | L3 key set + time order; T029 evidence | PASS |
| 028 | replay = bundle + marketFacts + digests | L1 round-trip + local artifact check; L3 digest linkage | PASS |
| 029 | L1/L2/L3 controlled suites | 107 unit; 32 browser | PASS |
| 030 | browser vs server evidence separated | L3 guard vs stub stats; T029 "not directly instrumented" | PASS |
| 031 | opt-in real tests, separate evidence | default skipped; T029 L4/L5 files | PASS |
| 032 | graph/prompts/AkariChatModel/AkariSP unchanged | 78/78; deps unchanged | PASS |
| 033 | Feature 001–006 untouched | `git diff f4d976c 4b4925f -- specs/00[1-6]*` empty | PASS |

**33/33 PASS.**

### Success criteria

| SC | Evidence | Status |
|---|---|---|
| 001 | R0 answers every FR-001 question with file/line or "not present" | PASS |
| 002 | every bundle field traces to R0.6/ledger (data-model sources column) | PASS |
| 003 | fixture: test (a) + T028 native+fixture 8/8, 8/0, no credential | PASS |
| 004 | L3 provider-origin browser requests 0 | PASS |
| 005 | L3 controlled success 8/8, 8/0 | PASS |
| 006 | 15 failure rows + cancel: creates 0, model requests 0 | PASS |
| 007 | silent fallback 0 (L3 failure assertions) | PASS |
| 008 | graph-stage cancel `{ready,0,0}`, settled, `{closed,0,0}` | PASS |
| 009 | provider secret occurrences 0 (no secret exists; no key UI; bundle/evidence/storage checks) | PASS |
| 010 | provider fields in the browser contract 0 | PASS |
| 011 | TZ=UTC vs Asia/Seoul identical | PASS |
| 012 | server-side claims are stub-measured (L2/L3) or stated "not directly instrumented" (T029) | PASS |
| 013 | 78/78 hashes; specs 001–006 diff empty | PASS |
| 014 | AkariSP/deps unchanged; topology/provenance/prompts unchanged | PASS |
| 015 | one canonical live path (`/api/market`) | PASS |
| 016 | R10: candidates with separate technical/permitted-use findings; maintainer decision Yahoo canonical | PASS |
| 017 | real-provider result recorded: PASS (T029 L4 + L5), separate from SC-001–015 | PASS |

**17/17 PASS.** SC-001–015 are the controlled completion criteria; SC-016–017 are the provider
decision and the real-provider result.

### User stories

- **US1** fixture: test (a); T028 native+fixture.
- **US2** live through the server: L3 success; T029 L4/L5.
- **US3** upstream-derived contract: R0 + golden parity.
- **US4** failure/cancel before runtime: L3 matrix + cancel, mutation C.
- **US5** controlled validation: L1/L2/L3 offline.
- **US6** evidence layers: L3 guard vs stub stats; stage provenance.
- **US7** real provider: T029 PASS.

All 7 are observable.

### Ledger audit (A-M1…A-M12 vs code)

| Entry | Checked against | Result |
|---|---|---|
| A-M1 | no tool loop: one bundle before the runtime (`prepareLive`) | matches |
| A-M2 | `analysisDate` from the server ET clock (route) | matches |
| A-M3 | all 12 indicators at the latest session (`computeIndicators`) | matches |
| A-M4 | unfilled history; nulls fail except A-M11 | matches |
| A-M5 | 5-year request per call, no cache (L2 query + two-call test) | matches |
| A-M6 | JSON contract, browser renders `marketFacts` | matches |
| A-M7 | no retry/chain/cache; typed failures before any model | matches |
| A-M8 | provider by recorded decision (R10) | matches |
| A-M9 | missing `adjclose` → `invalid-data` (L2) | matches |
| A-M10 | raw `fetch`, no crumb/cookie/retry/cache; "Yahoo-compatible, not identical" in docs | matches |
| A-M11 | analysis-date bar before 16:00 and unsettled final bar dropped; historical nulls fail (L2) | matches |
| A-M12 | `recent` = 30 sessions with full OHLCV | matches |

Hidden drift: none found. Recorded implementation details:
- the OHLC ordering tolerance of 1e-9 (data-model)
- `cancelled` → HTTP 499 at the route (only seen by a disconnected client)

### Upstream fidelity

The following reproduce the reference, with every difference in the ledger:
- adjusted daily OHLCV via the yfinance formula; 5-year request; no future rows
- unfinished/unsettled latest session dropped; stale `> 10` days
- 12-indicator universe with stockstats formulas (golden ≤ 5.9e-14 relative); the snapshot's 11
  (no `vwma`) are a subset
- 30 recent sessions; latest row as the verified source of truth

### Evidence inventory

| File | sha256 | Purpose | Tested SHA |
|---|---|---|---|
| `controlled-live-standin-2026-09-29-f4d976c-dirty.json` | `cb65aca976de579b…` | L3 controlled live (stand-in + Yahoo stand-in) | pre-commit working tree (`f4d976c+dirty`) |
| `real-browser-next-fixture-2026-09-29-4b4925f.json` | `09df8daba9a33dca…` | **canonical native inference regression** (native + fixture) | `4b4925f…` clean |
| `real-yahoo-standin-2026-09-29-4b4925f.json` | `8ff6e53b12fc73b7…` | real Yahoo L4 (stand-in model, Playwright Chromium 153) | `4b4925f…` clean |
| `real-yahoo-native-2026-09-29-4b4925f.json` | `0b046cf2868bcb33…` | real Yahoo L5 (native, Chrome 154) | `4b4925f…` clean |

- The L5 real-Yahoo run does not replace the native + fixture gate; the two answer different
  questions.
- All four files contain 0 of: Bearer, Authorization, cookie, crumb, `open`/`high`/`low`/`close`,
  `adjclose`, `timestamp`, `market fact`.
- Role outputs are presence + length. Synthetic prices exist only in `test/fixtures/market/`.

### Network accounting

| Stage | What was observed |
|---|---|
| T008 | local Node reachability, 1 request |
| L2/L3 | the stand-in counted every server request directly |
| T029 L4/L5 | one acquisition log line per run; the Yahoo network request itself not packet-instrumented |

Cumulative real Yahoo acquisition attempts: **3** (T008 1, L4 1, L5 1), with 0 retries, 0
redirects followed and 0 fallbacks.

### Other audits

- **Feature 005 retirement**:
  - `src/market-data.ts` and its 19 tests removed (mapping in Checkpoint E)
  - key input and browser `Authorization` gone; storage empty
  - live = `/api/market`
  - `specs/005-…` unchanged
- **Security**: adapter and `BTA_YAHOO_BASE_URL` server-only; no user-controlled URL; no
  credential UI or secret; failure bodies without Yahoo text; `.next/static` provider strings 0.
- **Dependencies**: `package.json` and lock unchanged vs `f4d976c` (no `yahoo-finance2`,
  stockstats port, TA library, `server-only` or SDK).
- **AkariSP**: unchanged; fetch, cancellation and provider logic live in the app route/adapter.
- **Graph/lifecycle**: `runGraph` `922db752…`; topology and provenance unchanged.
- **Mutations**: A, B and C each failed their designated test for the intended reason and were
  restored exactly (`cmp`, hashes). Code residue 0; the "MUTATION" matches are sentences in this
  file.
- **Diff scope** `f4d976c..4b4925f`: 30 files, all in `src/`, `app/api/`, `app/page.tsx`,
  `e2e/`, `test/`, `docs/testing.md`, `playwright.config.ts`, `specs/007-…`. No change to
  `next.config.ts`, `tsconfig.json`, `components/`, `harness/`, `src/graph`, `src/integration`,
  specs 001–006 or package files.
- **Deterministic results**:
  - unit 107 (106/0/1 skip = local bundle replay)
  - production browser 32 passed + 1 skipped (opt-in real Yahoo) ×3
  - dev smoke 1/1

### Remaining limitations (non-blocking)

- The Yahoo endpoint is unofficial and unsupported, and its rate limits are undocumented.
- T008 is a local Node result, not a Vercel proof. Vercel/shared-IP behaviour is unproven.
- The 16:00 ET cutoff does not model early-close days.
- Public multi-user service suitability was not evaluated. Yahoo Terms §2.4 is recorded, not
  resolved.
- Trading quality was not evaluated.
- Numeric identity with Python yfinance/Yahoo over time is not guaranteed (A-M10).
- Constitution IX "initial phase" wording remains a LOW documentation ambiguity. No patch was made
  here; the interpretation rests on the Feature 005 precedent and on this Feature being separately
  scoped.
- `docs/roadmap.md` still lists Feature 007 as "next candidate (not started)". No task in this
  Feature updates it; it is proposed for the closeout commit.

### Completion record

UPSTREAM_CONTRACT_FROZEN (T003) → SERVER_CONTRACT_DEFINED (T007) → LOCAL_NODE_REACHABILITY = PASS
(T008) → CONTROLLED_BOUNDARY_VALIDATED (T018) → DIRECT_BROWSER_PATH_RETIRED (T025) →
IMPLEMENTATION_COMPLETE (T028) → **FEATURE_COMPLETE** (T030).
- FEATURE_COMPLETE means the deterministic controlled implementation and the native + fixture
  regression are complete, and a real-provider result is recorded.
- Separately: **REAL_PROVIDER_VALIDATED** (T029 L4 + L5 PASS on the actual Yahoo path).
- **T031** closeout commit (maintainer approved): documentation and evidence only.
  - Contents: `tasks.md`, `verification.md`, the T028/T029 evidence files, and the
    `docs/roadmap.md` update (Feature 007 complete; next candidate 008 Pixel Agents Execution
    Visualization; then 009 Effectiveness Benchmark).
  - The implementation revision remains `4b4925f4a589d7e9712c32f4dc1c979991be8310`. This commit
    changes no code path.

### Post-closeout ponytail cleanup

- `src/server/market-provider.ts`: the single-use `aborted` helper is inlined into the fetch `catch`
  (same order: caller abort → `cancelled`, limit → `timeout`, else `network`), and `normalize` is no
  longer exported (no importer outside the module). Behavior unchanged.
- Re-run after the change: `npx tsc --noEmit` rc 0; `npm test` 107 (106 pass, 0 fail, 1 skip);
  `npm run test:browser` 32 passed, 1 skipped (opt-in real Yahoo). `/speckit-converge`: converged.
- This commit moves HEAD past the evidence revision `4b4925f`; the native and real-Yahoo evidence
  files keep that revision. No new real Yahoo request (cumulative 3).
