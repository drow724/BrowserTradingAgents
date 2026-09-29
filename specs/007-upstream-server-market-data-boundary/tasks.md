---

description: "Task list for Feature 007 — Upstream-Compatible Server Market Data Boundary"
---

# Tasks: Feature 007 — Upstream-Compatible Server Market Data Boundary

**Input**: `specs/007-upstream-server-market-data-boundary/`: spec.md, plan.md, research.md
(R0–R14a), data-model.md, contracts/market-data-api.md, contracts/market-data-errors.md,
quickstart.md.

**Baseline**: branch `007-upstream-server-market-data-boundary` @ `f4d976c` (= `origin/main`, PR #7
merge). Untracked: this feature directory and unrelated Spec Kit/Claude tooling (leave untouched).

**Frozen decisions** (plan; not reopened here):

| Item | Decision |
|---|---|
| Provider | Yahoo, yfinance-compatible (not an identical implementation, A-M10), keyless. Raw `fetch` of `GET {base}/v8/finance/chart/{symbol}` (R14). No cookie, crumb, key, SDK or dependency. "No crumb needed" is a **hypothesis** checked by C0 |
| Base URL | `process.env.BTA_YAHOO_BASE_URL ?? 'https://query2.finance.yahoo.com'`, read from the server environment only, never from the request (no SSRF surface). It exists only so tests can point at the stub; it is not a provider selector |
| Adjustment | `ratio = adjclose / close`; O, H, L × ratio; C = adjclose; volume unchanged. A missing or non-finite `adjclose` is `invalid-data` (A-M9) |
| Precision | indicator input and bundle values are unrounded. Formatting happens only when `marketFacts` is rendered (R0.3) |
| Contract | `GET /api/market?symbol=IBM` → `MarketBundle` (data-model.md) or `{boundary:'market-data', stage, kind}` (contracts) |
| Ownership | the server does deterministic data preparation: acquisition, normalization, 12 indicators, snapshot (FR-006). The browser renders `marketFacts` and runs the graph |
| Indicators | 12 names with the stockstats definitions of research R0.3 (the version observed in the frozen checkout's venv, not an upstream pin) |
| Route | `export const runtime = 'nodejs'`, `export const dynamic = 'force-dynamic'`. It passes only `request.signal`. Provider `fetch` uses `cache: 'no-store'`; the response sends `Cache-Control: no-store` |
| Timeout | exactly one server timer: `acquireYahoo(…, { signal, limitMs = 20_000 })` via `AbortSignal.any([signal, AbortSignal.timeout(limitMs)])`. The browser keeps its existing 30 s page limit |
| Browser | calls only `/api/market` in `live` mode. It validates the bundle and creates the runtime only after the bundle is ready and the run was not aborted |
| Not added | provider registry, selector, fallback, retry, cache, env secret, key-provider code, `server-only`, `.env` files, `NEXT_PUBLIC_*` |

**Tests**:
- Tests are required (spec FR-029, SC-001–SC-015).
- `npm test` starts at the T001 baseline (62) and grows by the new L1/L2 tests. The Feature 006
  count is not an invariant here.
- Tests of retired Feature 005 browser-Massive code are retired with that code (T021), and every
  count is recorded.
- The browser suite keeps every guarantee; its live cases move to the server path (T017).
- Real-Yahoo tests are default-skipped and send no network request unless `BTA_REAL_YAHOO=1`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different file, no dependency on an incomplete task.
- **[USn]**: the spec's user stories.
  - US1 fixture unchanged
  - US2 live through the server
  - US3 upstream-derived contract
  - US4 failure/cancel before runtime
  - US5 controlled validation
  - US6 evidence layers
  - US7 real provider
- **APPROVAL REQUIRED / MANUAL**: ask in chat and wait for an explicit yes; never run automatically.

## Invariants

> **INV-1**: Feature 001–006 specs, verification and evidence stay byte-identical to their T002
> hashes.
>
> **INV-2**: unchanged: `src/graph/*`, `src/integration/*`, `harness/*`, `test/standin.ts`,
> `app/harness/page.tsx`, `components/Boot.tsx`, AkariSP (no dependency change), and the
> `runGraph` section of `src/main.ts` (T002 section hash).
>
> **INV-3**: live acquisition happens before runtime creation. Every market-data failure or cancel
> has creates 0 and model requests 0.
>
> **INV-4**: no silent fallback. A live failure never shows or records fixture data.
>
> **INV-5**: the browser contacts no provider origin; no provider field reaches the browser.
>
> **INV-6**: build, test and dev commands never modify tracked files. Pre/post
> `git diff -- <code paths> | shasum` must be equal. Code paths: `src test harness e2e app
> components package.json package-lock.json next.config.ts tsconfig.json playwright.config.ts`.

## Stop conditions (finding first, no workaround)

- a change to an INV-2 file, the prompts, the graph, `AkariChatModel` or AkariSP appears necessary
- a golden indicator value cannot be matched with the research R0.3 definitions
- C0 returns anything other than PASS
- the two-call test shows cached `/api/market` responses
- an acquisition-stage cancel or failure creates a runtime
- the browser contacts a provider origin
- a protected hash changes
- a mutation does not fail its designated test

---

## Checkpoint A — Baseline and protection (Phase 1: Setup)

- [X] T001 Create `specs/007-upstream-server-market-data-boundary/verification.md` with the baseline:
  - branch, `git rev-parse HEAD origin/main`, `git status --short`
  - `node --version`, `npm --version`, `npm ls --depth=0`
  - `npm test` (expect 62: 61 pass, 1 skip), `npm run test:browser` (expect 28),
    `npm run test:browser:dev` (expect 1)
- [X] T002 Record protected hashes in `verification.md`:
  - `git ls-files specs/001-tradingagents-reference-analysis specs/002-langchain-akarisp-integration-validation specs/003-langgraph-akarisp-minimal-graph specs/004-browser-tradingagents-fixture-graph specs/005-browser-market-data-boundary specs/006-nextjs-application-shell src/graph src/integration harness test/standin.ts app/harness/page.tsx components/Boot.tsx | xargs shasum -a 256`
    (record the count)
  - `awk '/^async function runGraph/,0' src/main.ts | shasum -a 256` (the `runGraph` section hash)
  - Re-checked in T026.
- [X] T003 Record the upstream audit basis in `verification.md`:
  - `git -C ~/git/TradingAgents rev-parse HEAD` = `35543d0248bf89fcb92b17a15858ad0c0e940687`
  - `git -C ~/git/TradingAgents status --porcelain` empty
  - venv observed versions `stockstats 0.6.8`, `yfinance 1.7.0` (upstream pins only `>=`)
  - State: **UPSTREAM_CONTRACT_FROZEN**.

---

## Checkpoint B — Provider-independent contract (Phase 2: Foundational, US3)

- [X] T004 [US3] Create `test/fixtures/market/generate-golden.py`. It needs no network and runs
  with `~/git/TradingAgents/.venv/bin/python`.
  - It builds a deterministic synthetic series of 1,300 US sessions (weekday dates from
    2021-01-04, skipping weekends only).
  - Prices are smooth deterministic functions: `close = 100 + 10*sin(i/37) + i*0.02`, open/high/low
    derived from close, integer volume. Values are unrounded.
  - It computes the 12 indicators with `stockstats.wrap`.
    - For each golden row N (30, 250, last), it computes on the prefix slice `[0..N]`. Indicators are
      causal: verified 2026-09-29 in the frozen venv, the prefix value equals the full-series value
      (research R0.3).
    - The script asserts this equality again for each row.
  - It writes `test/fixtures/market/history.json` (sessions) and `test/fixtures/market/golden.json`
    (indicator values at rows 30, 250 and the last row).
  - Run it once. Commit both outputs and the script. Record the command, the venv versions and the
    output sha256s in `verification.md`. Later tests need no Python.
- [X] T005 [US3] Create `src/market-bundle.ts`, used by both browser and server, with no Node-only
  API:
  - types `Session`, `Indicators`, `MarketBundle`, `MarketDataFailure`
    (`{ boundary: 'market-data'; stage: 'request'|'acquisition'|'normalization'; kind }`, with the
    kinds of contracts/market-data-errors.md)
  - `INDICATOR_NAMES` (the 12 in data-model.md order)
  - `computeIndicators(sessions)`: the values at the last session, implementing exactly the research
    R0.3 definitions on unrounded input:
    - SMA `min_periods=1`, so values exist before the window fills; there is no warm-up N/A
    - EMA `span`, `adjust=True`
    - SMMA `alpha=1/N`, `adjust=True`
    - RSI first row 50
    - Bollinger 20 with sample std ×2
    - ATR 14 SMMA of TR
    - VWMA 14 typical price with **unadjusted volume**
    - MACD 12/26/9
  - `sessionDate(epochSeconds, timeZone)` via `Intl.DateTimeFormat('en-CA', { timeZone })`
  - `validateBundle(x): MarketBundle | MarketDataFailure`, enforcing data-model.md rules verbatim:
    - dates "strictly increasing; `≤ analysisDate`"
    - prices "finite, `> 0`, `low ≤ min(open, close)`, `high ≥ max(open, close)`"
    - volume "integer `≥ 0`"
    - `recent` "1…30, ascending"
    - `historySessions` "integer ≥ 260"
    - exactly the 12 indicator keys, each finite
  - `renderMarketFacts(bundle)`, the only place with decimal formatting: latest session with change
    vs the previous close, the 12 indicators, the 30-session range and average volume. Sentences
    are tagged `market fact L1…L4`.
  - canonical JSON in data-model.md key order; `snapshotDigest`, `marketFactsDigest` (SHA-256 via
    `crypto.subtle`); `replayArtifact(bundle)`
- [X] T006 [US3] Create `test/market-bundle.test.ts` (L1). Use one test per indicator family (SMA,
  EMA, MACD ×3, RSI, Bollinger ×3, ATR, VWMA) so a failure names its family.
  - `computeIndicators(history.slice(0, N+1))` equals `golden.json` at each golden row.
    - Non-finite values (NaN/±Infinity) are rejected explicitly before comparing.
    - Tolerance: `|actual − expected| ≤ 1e-9 · max(1, |expected|)`.
  - validation: one case per rule of T005 → `invalid-data`, plus a valid bundle passes
  - render: contains each tag; deterministic
  - digests: stable
  - time zone: spawn `node` twice with `TZ=UTC` and `TZ=Asia/Seoul` computing
    `sessionDate` + `snapshotDigest` of a fixed bundle; outputs equal (SC-011)
- [X] T007 **Checkpoint B gate** in `verification.md`:
  - `npm run typecheck`
  - `npm test` = baseline + the T006 count, all pass
  - L1 results
  - pre/post digest (INV-6)
  - State: **SERVER_CONTRACT_DEFINED**.

---

## Checkpoint C0 — Local Node reachability (MANUAL, APPROVAL REQUIRED)

- [X] T008 **APPROVAL REQUIRED**: exactly one unauthenticated request from **local** Node.
  - No Yahoo request is made before this task.
  - The scratch script lives outside the repo: `fetch('https://query2.finance.yahoo.com/v8/finance/chart/IBM?period1=<epoch s, 5y ago 00:00 UTC>&period2=<epoch s, tomorrow 00:00 UTC>&interval=1d&includePrePost=false&events=div,splits')`
    - no cookie, crumb, custom header or credential
    - 0 retries, 0 fallbacks
  - Record in `verification.md` only:
    - the exact URL
    - the HTTP status
    - presence of `chart.result[0].timestamp`, `indicators.quote[0].{open,high,low,close,volume}`,
      `indicators.adjclose[0].adjclose`
    - `meta.exchangeTimezoneName` (value), `meta.currency` (value)
    - the row count
  - Record no prices and no body.
  - Classify per research R14a: PASS / BLOCKED_RAW_FETCH / RATE_LIMITED_INCONCLUSIVE / ENVIRONMENT /
    CONTRACT_INCOMPATIBLE.
  - State: **LOCAL_NODE_REACHABILITY** = the class. It proves local Node `fetch` acceptance only,
    not Vercel.
  - Anything but PASS → STOP and a maintainer decision. No crumb, cookie or TLS workaround.

---

## Checkpoint C — Server boundary (US2, US4, US5)

- [X] T009 [US2] Create `src/server/market-provider.ts`:
  - `acquireYahoo(symbol, analysisDate, { signal, limitMs = 20_000, baseUrl, now })`: one `fetch` of
    `${baseUrl}/v8/finance/chart/${symbol}?period1=${epoch seconds of analysisDate−5y 00:00 UTC}&period2=${epoch seconds of analysisDate+1d 00:00 UTC}&interval=1d&includePrePost=false&events=div,splits`
    with `cache: 'no-store'` and `signal: AbortSignal.any([signal, AbortSignal.timeout(limitMs)])`.
    This is the only timer. `period2` is exclusive.
  - HTTP mapping per contracts/market-data-errors.md:
    - fetch rejection → `timeout` if the time limit fired, `cancelled` if the caller aborted,
      else `network`
    - 401/403 → `unauthorized`; 429 → `rate-limited`; other non-2xx or `chart.error` →
      `provider-error`
    - non-JSON → `invalid-data`
  - normalization in the fixed research R14 order:
    1. shape and alignment: `chart.result[0]` present; equal lengths of `timestamp`, `open`,
       `high`, `low`, `close`, `volume`, `adjclose`; strictly increasing timestamps (a duplicate
       or decrease → `invalid-data`); `meta.exchangeTimezoneName` = `America/New_York`, else
       `invalid-data`
    2. date bars with `sessionDate`
    3. drop the last bar if it is dated `analysisDate` and `now` is before 16:00
       `America/New_York` (keep the `ponytail:` comment)
    4. drop the last remaining bar if its `close` is null (unsettled final session, A-M11)
    5. any null or non-finite OHLCV or `adjclose` in the remaining rows → `invalid-data`
    6. adjust O/H/L by `adjclose/close`; C = `adjclose`; volume unchanged; no rounding
    7. latest > 10 calendar days before `analysisDate` (strictly greater) or fewer than 260
       sessions → `unavailable`
  - build the `MarketBundle` (`provider: 'yahoo-chart@1'`, `adjustment: 'split-dividend'`,
    `acquiredAt`, `historySessions`, `latest`, `indicators`, `recent` = last 30), then
    `validateBundle`
  - no retry, no logging of bodies or values
- [X] T010 [US2] Create `app/api/market/route.ts`:
  - `export const runtime = 'nodejs'`; `export const dynamic = 'force-dynamic'`
  - `GET(request)`: `symbol !== LIVE_INSTRUMENT.symbol` → 400 `invalid-request` (stage `request`)
  - `analysisDate` = today in `America/New_York`
  - `acquireYahoo(symbol, analysisDate, { signal: request.signal, baseUrl: process.env.BTA_YAHOO_BASE_URL ?? 'https://query2.finance.yahoo.com' })`.
    The route has no timer of its own and reads no URL from the request.
  - 200 with the bundle, or the contract HTTP status with `{ boundary, stage, kind }` only (never
    a Yahoo body or text); always `Cache-Control: no-store`
  - one log line: adapter id, duration, status class, `kind`
  - `LIVE_INSTRUMENT` comes from its existing module, not duplicated
- [X] T011 [P] [US5] Create `test/fixtures/market/stub-bodies.ts` (implemented as `.ts`, see verification): synthetic chart JSON builders
  from `history.json` (fake values only). Cases:
  - valid, with `adjclose` ≠ `close` on some rows
  - valid plus a **final unsettled bar** (last bar with `close: null` and other nulls)
  - valid plus a bar dated "today" (for the 16:00 rule)
  - `chart.error`
  - non-JSON
  - missing `adjclose`
  - a **historical** null cell
  - **mismatched array lengths**
  - **duplicate timestamp**
  - wrong time zone
  - stale (latest 11 days old) and boundary (exactly 10 days old)
  - short history (< 260)
  - a future-dated bar
- [X] T012 [US5] Create `test/market-route.test.ts` (L2). It starts a `node:http` stub in-process,
  sets `process.env.BTA_YAHOO_BASE_URL`, and calls the route's `GET` with `Request` objects.
  Timeout cases call `acquireYahoo` directly with `limitMs: 50`.
  - valid → 200, validated bundle, and adjustment exact: O/H/L = raw × ratio, C = adjclose,
    volume raw
  - final unsettled bar → 200, `marketAsOf` = the previous completed session (not `invalid-data`)
  - "today" bar before 16:00 ET (injected `now`) → dropped; after 16:00 → kept
  - historical null, mismatched lengths, duplicate timestamp → `invalid-data`
  - stale 11 days → `unavailable`; exactly 10 days → 200
  - every other row of contracts/market-data-errors.md → the listed status/stage/kind and stub
    request count; no `credential-missing` is ever produced on this path
  - wrong symbol → 400 with 0 stub requests
  - the stub saw exactly the expected path and query (epoch-second `period1`/`period2`,
    `interval=1d`)
  - two calls → 2 stub requests and `Cache-Control: no-store` (no caching)
  - an aborted `Request` while the stub hangs → the stub observes its socket close; the response
    body contains no provider text
  - timeout (`limitMs: 50`, stub hangs) → `timeout`
- [X] T013 **Checkpoint C gate** in `verification.md`:
  - `npm run typecheck`
  - `npm run build` lists `ƒ /api/market`
  - `npm test` (count recorded)
  - pre/post digest

---

## Checkpoint D — Browser live through the server (US2, US4, US6)

- [X] T014 [P] [US5] Create `e2e/market-stub.mjs`: an HTTP stub on `127.0.0.1:${STUB_PORT ?? 5198}`
  that serves the T011 bodies.
  - `POST /__scenario {name, hang?}` selects the next response.
  - `GET /__stats` returns `{ requests, lastPath, lastQuery, closedSockets }` and resets on
    `POST /__reset`.
  - It is test-only and never imported by `app/` or `src/`.
- [X] T015 [P] [US5] Update `playwright.config.ts`:
  - `webServer` becomes an array: the existing Next server entry plus
    `{ command: 'node e2e/market-stub.mjs', url: 'http://127.0.0.1:5198/__stats', reuseExistingServer: false }`
  - The Next entry gets `env: { BTA_YAHOO_BASE_URL: 'http://127.0.0.1:5198' }`, for the
    production and dev commands alike.
  - Projects and the `devSmoke` split are unchanged.
  - (T014 ‖ T015: different files; T015 only names the stub's command and port.)
- [X] T016 [US2] Update `prepareLive` in `src/main.ts`:
  - Replace the `acquireDailyBars` call with
    `fetch('/api/market?symbol=' + LIVE_INSTRUMENT.symbol, { signal })` under the existing 30 s
    page limit.
    - 200 → `validateBundle` (a failure is `invalid-data`, stage `normalization`)
    - non-2xx → use a valid `{stage, kind}`, else `network`
    - fetch rejection → `cancelled` / `timeout` / `network`
  - Then `renderMarketFacts`, `replayArtifact`, the existing `signal.aborted` check, and the input
    `{ id: 'live-market@2', … }`.
  - `dataSource` per data-model.md: `receivedAt` from the browser clock.
  - `usedAt` is recorded in the `prepareLive` path **immediately before `runGraph` is invoked**.
    The `runGraph` block is not touched (INV-2, T002 section hash).
  - The browser never branches on `bundle.provider`.
  - The old Massive functions stay in `src/market-data.ts` but are no longer called.
    - Transitional: the legacy key input may still render until T021. The canonical live path
      does not read it.
- [X] T017 [US4] Update the live tests in `e2e/app.spec.ts` to the server path. This is the
  canonical deterministic proof: stand-in + stub. Keep each guarantee; use `guardNetwork` with the
  provider-origin check extended to `*.yahoo.com`, and the stub `/__stats`.
  - live success: 8/8, 8 logical / 0 fallback; stub requests 1 with the expected query; provider
    origin requests 0; `dataSource` fields present; no prices/indicator values in `#evidence`;
    news stays the neutral fixture
  - failure matrix, one test per contract row reachable through the stub:
    - `network` (stub scenario `close`)
    - `unauthorized`, `rate-limited`, `provider-error`
    - `invalid-data` (non-JSON, missing adjclose, historical null, length mismatch, duplicate
      timestamp, wrong time zone, future bar)
    - `unavailable` (stale, short)

    Each asserts the typed failure, `creates === 0`, model requests 0, `#result` empty and no
    fixture text.
  - page `timeout` (page clock +30 s)
  - Cancel during acquisition (stub `hang`): `cancelled`, creates 0, stub `closedSockets` ≥ 1
  - Cancel during the graph: `{ready,0,0}` before shutdown, `settledBeforeShutdown` true,
    `{closed,0,0}`
  - native + live: BLOCKED with stub requests 0
  - the four mode URLs
  - two consecutive live runs: 2 stub requests
  - Feature 005 Massive `page.route` cases are removed in this task, because their path no longer
    runs. Record each one's replacement in `verification.md`.
- [X] T018 **Checkpoint D gate** in `verification.md`:
  - `npm run test:browser` (count, all pass), `npm run test:browser:dev` 1/1, `npm test`
  - lifecycle record from the graph-stage cancel
  - fixture tests unchanged (US1)
  - pre/post digest
  - State: **CONTROLLED_BOUNDARY_VALIDATED**.

---

## Checkpoint E — Security, evidence, retirement, opt-in real tests, mutations (US6, US2, US7)

- [X] T019 [US6] Security checks, recorded:
  - `grep -rnE "server/market-provider" app src components e2e` → only
    `app/api/market/route.ts`. This covers static, re-export and `import(` forms; no barrel file
    exists.
  - `grep -rn "NEXT_PUBLIC_" app src components next.config.ts` → 0
  - `grep -rn "BTA_YAHOO_BASE_URL" app src components` → only the route (server env read)
  - after `npm run build`: `grep -rl "finance.yahoo.com" .next/static` → 0
  - the success test asserts provider-origin requests 0
- [X] T020 [US6] Replay and evidence:
  - `test/market-bundle.test.ts` gains: a local `.local/replay/*.json` (bundle form) re-renders
    and re-digests to itself when present, else skip
  - a synthetic replay round-trip
  - the live success test asserts that `#evidence` `dataSource` has no price, indicator value or
    provider body, and that its digests equal the page's replay digests
- [X] T021 [US2] Retire the Feature 005 direct browser path (research R13). Precondition: T018,
  T019 and T020 pass.
  - Remove `acquireDailyBars`, `replyProvenance`, the Massive `normalize`, `ageHours` and
    `buildLiveInput`'s Massive dependency from `src/market-data.ts`. Keep `LIVE_INSTRUMENT`, or
    move it to `src/market-bundle.ts`, updating imports.
  - Remove `#key-row` and `#key` from `app/page.tsx` and their wiring from `src/main.ts`.
  - Update the page's data paragraph: live mode requests end-of-day daily bars for IBM through the
    application's server from Yahoo at run time; no key; "live" means fetched at run time, not
    real-time; news stays a committed neutral text; no investment advice.
  - Retire the Massive-specific cases in `test/market-data.test.ts`. Keep and port the
    digest/render/replay cases to the bundle form. Record removed and added test names and counts.
  - Add to the live success test (market-provider credential scope only):
    - rendered page has 0 API-key/password inputs
    - `localStorage` and `sessionStorage` contain no market-provider key trace
    - no browser-originated request carries a market-provider `Authorization` header
  - Feature 005 specs and evidence stay untouched (INV-1).
- [X] T022 [P] Update `docs/testing.md`:
  - live mode = browser → `/api/market` → Yahoo, keyless
  - Yahoo is yfinance-compatible, not identical (A-M10)
  - personal-research scope; Yahoo Terms §2.4 restriction recorded; unofficial endpoint risk; no
    legal conclusion; no claim of public redistribution suitability; the server boundary does not
    resolve terms
  - stub-based tests (`BTA_YAHOO_BASE_URL`, `e2e/market-stub.mjs`)
  - the C0/G manual gates
  - future optional providers (Tiingo, Alpha Vantage, Massive) mentioned as not built
  - remove the Massive key instructions (kept in Feature 005 history)

  (T022 ‖ T021: docs only.)
- [X] T023 [US7] Add the default-skipped real-Yahoo tests, so they are part of the T027 commit:
  - `e2e/app.spec.ts`: L4, stand-in + live, **no stub**
  - `e2e/prompt-api.spec.ts`: L5, native + live, title without "eight-role" so the canonical gate
    never selects it
  - both `test.skip(process.env.BTA_REAL_YAHOO !== '1')`
  - Under `BTA_REAL_YAHOO=1`, `playwright.config.ts` omits `BTA_YAHOO_BASE_URL` and the stub entry.
  - Each writes evidence with:
    - tested full SHA and clean/dirty state
    - Node, Next and Chrome versions
    - `environment: 'local'`, `provider: 'yahoo-compatible'`, path `/api/market`
    - browser→Yahoo request count (measured by `guardNetwork`)
    - server→Yahoo request count: "not directly instrumented"
    - outcome or typed failure
    - `snapshotDigest` / `marketFactsDigest`
    - execution timestamp
    - no market values
  - Verify that `npm run test:browser` with the variable unset makes 0 Yahoo requests (the tests
    are reported as skipped).
- [X] T024 Mutation guards (research/plan table). Each mutation is uncommitted: copy the file,
  apply, run the designated test and confirm it FAILS for the intended reason, restore from the
  copy, `cmp` identical, re-run → PASS. Record each in `verification.md`.
  - **A**: `src/server/market-provider.ts` without the ratio (use raw O/H/L/C) → T012 adjustment
    test fails on the adjusted values
  - **B**: `app/api/market/route.ts` passes `new AbortController().signal` instead of
    `request.signal`. This keeps types and other tests valid, so only forwarding is removed. The T012
    abort test fails because the stub sees no socket close
  - **C**: `src/main.ts` creates the runtime before calling `/api/market` in `prepareLive` → T017
    failure/cancel tests fail on `creates !== 0`
  - Residue: T002 hashes unchanged; `git diff` of the three files equals the pre-mutation diff.
- [X] T025 **Checkpoint E gate** in `verification.md`:
  - `npm run typecheck`, `npm run build`, `npm test` (count), `npm run test:browser` (count; real
    tests skipped)
  - T019–T021 results; one canonical live path (SC-015); mutations A–C effective and restored
  - pre/post digest
  - State: **DIRECT_BROWSER_PATH_RETIRED**.

---

## Checkpoint F — Regression, commit, native gate (US1)

- [X] T026 **Full automatic gate** in `verification.md`:
  - `npm run typecheck`, `npm run build`
  - `npm test` (final count vs the T001 baseline)
  - `npm run test:browser` ×3
  - `npm run test:browser:dev` 1/1
  - T019 checks
  - T002 hashes and the `runGraph` section hash equal
  - pre/post digest for every command
- [X] T027 **APPROVAL REQUIRED — commit**:
  - Commit to `007-upstream-server-market-data-boundary`, including the default-skipped real-Yahoo
    tests. No push unless asked.
  - Exclude `.claude/`, `.specify/*`, `CLAUDE.md`, `.local/`, `.next/`, `next-env.d.ts`,
    `test-results/`, `*.tsbuildinfo`.
  - Record the full SHA; code paths clean.
- [ ] T028 [US1] **APPROVAL REQUIRED — native + fixture gate** at the T027 SHA:
  - Run `npm run test:prompt-api -- -g "eight-role"`. This is never native + live.
  - Apply the same validation as Feature 006 T042.
  - Save it unedited as `evidence/real-browser-next-fixture-<date>-<sha>.json`.
  - Code paths clean afterwards.
  - State: **IMPLEMENTATION_COMPLETE**.

---

## Checkpoint G — Real Yahoo (US7, MANUAL, APPROVAL REQUIRED)

- [ ] T029 [US7] **APPROVAL REQUIRED** — at the **exact T027 SHA** with code paths clean (checked
  before and after):
  - `BTA_REAL_YAHOO=1 npx playwright test --project=chromium -g "real Yahoo"` (L4), then
    `BTA_REAL_YAHOO=1 npm run test:prompt-api -- -g "real Yahoo"` (L5)
  - Save the evidence unedited as `evidence/real-yahoo-standin-<date>-<sha>.json` and
    `…/real-yahoo-native-<date>-<sha>.json`.
  - Record `REAL_PROVIDER_VALIDATED`, `BLOCKED` (with kind) or `DEFERRED` if not approved (SC-017).
  - A real Yahoo failure does not invalidate the controlled results (B–F).
- [ ] T030 Final audit and completion record in `verification.md`:
  - FR-001…FR-033 / SC-001…SC-017 table (task + evidence)
  - ledger A-M1…A-M12 still accurate
  - hashes equal
  - dependency scope (`npm ls --depth=0` unchanged)
  - `git diff f4d976c --stat` limited to plan surfaces
  - AkariSP changes 0; findings
  - States: UPSTREAM_CONTRACT_FROZEN → SERVER_CONTRACT_DEFINED → LOCAL_NODE_REACHABILITY (PASS) →
    CONTROLLED_BOUNDARY_VALIDATED → DIRECT_BROWSER_PATH_RETIRED → IMPLEMENTATION_COMPLETE →
    **FEATURE_COMPLETE** when T028 PASS and T029 recorded (any of PASS/BLOCKED/DEFERRED). A real
    Yahoo PASS is not required.
- [ ] T031 **APPROVAL REQUIRED — closeout commit** of `verification.md`, `tasks.md` and the T028/T029
  evidence (docs and evidence only; code paths unchanged; same exclusions).

---

## Dependencies & Execution Order

```text
A T001–T003 → B T004 → T005 → T006 → T007 → C0 T008 (approval)
 → C T009 → T010 → T012 (T011 ‖ T009) → T013
 → D (T014 ‖ T015) → T016 → T017 → T018
 → E T019 → T020 → T021 (T022 ‖ T021) → T023 → T024 → T025
 → F T026 → T027 (approval) → T028 (approval)
 → G T029 (approval, T027 SHA) → T030 → T031 (approval)
```

## Parallel Opportunities

- T011 (stub bodies) ‖ T009 (adapter)
- T014 (browser stub) ‖ T015 (Playwright config)
- T022 (docs) ‖ T021 (retirement)

## Requirement Coverage

| Req | Implementation | Verification |
|---|---|---|
| FR-001, FR-002 | research R0 | T003, T030 |
| FR-003 | T005, T009 | T006, T012 |
| FR-004 | T005 (render only) | T002/T026 (INV-2 hashes) |
| FR-005, FR-007 | T010, T016 | T017, T019 |
| FR-006 | T009, T010, T016 | T012, T017, T019 |
| FR-008 | T009 (one adapter) | T019 |
| FR-009–FR-011 | research R10/R14 (decision recorded) | T008 |
| FR-012, FR-013 | T016 | T017, T028 |
| FR-014, FR-015 | T016 | T017, T024 (C) |
| FR-016 | T009, T010 | T012, T017, T024 (B) |
| FR-017 | — (unchanged block) | T017, T018, T026 |
| FR-018, FR-019 | T005, T009 | T012, T017 |
| FR-020 | T005, T009 | T006, T012, T024 (A) |
| FR-021 | T005 | T006 |
| FR-022 | T010 | T012, T017 |
| FR-023 | T009 | T012 (1 request per call) |
| FR-024, FR-025 | T021, T022 | T019, T021 |
| FR-026 | T021 | T025 |
| FR-027, FR-028 | T016, T020 | T020 |
| FR-029 | T006, T012, T017 | T007, T013, T018 |
| FR-030 | T012, T017, T023 | T029 |
| FR-031 | T023 | T029 |
| FR-032, FR-033 | — | T002, T026, T030 |
| SC-001, SC-002 | research R0 | T030 |
| SC-003 | — | T018, T028 |
| SC-004 | T016 | T017, T019 |
| SC-005–SC-008 | T016 | T017, T024 (C) |
| SC-009, SC-010 | T021 | T019, T020, T021 |
| SC-011 | T005 | T006 |
| SC-012 | T012, T017, T023 | T029 |
| SC-013, SC-014 | — | T002, T026 |
| SC-015 | T021 | T025 |
| SC-016 | research R10 (recorded decision) | T030 |
| SC-017 | T023 | T029, T030 |

## Implementation Strategy

1. **A–B**: freeze the contract and prove the indicator math offline (provider-independent MVP).
2. **C0**: one approved local request confirms the chosen path before building on it.
3. **C–D**: server boundary and browser live path, proven only with the stub.
4. **E**: security, replay, retirement after the proofs, default-skipped real tests, mutations.
5. **F**: commit and the native fixture gate.
6. **G**: real Yahoo on the committed SHA as separate evidence, then the closeout commit.
