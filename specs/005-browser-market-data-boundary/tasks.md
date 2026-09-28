---

description: "Task list for Feature 005 — Browser Market Data Boundary"
---

# Tasks: Feature 005 — Browser Market Data Boundary

**Input**: `specs/005-browser-market-data-boundary/` — spec.md, plan.md, research.md (R0–R12),
data-model.md, contracts/market-data.md, contracts/evidence.md, quickstart.md

**Baseline** (verified at task generation): branch `005-browser-market-data-boundary` @ `cca9c9a`
(= `origin/main`, Feature 004 merged). Untracked: this feature directory and unrelated Spec
Kit/Claude tooling (leave untouched). Dependencies unchanged: `akarisp@0.1.0-alpha.2`,
`@langchain/core@1.2.13`, `@langchain/langgraph@1.4.18`. There is no dependency task.

**Tests**: required. The spec requires deterministic, browser-automated and real-browser layers
(FR-013, SC-015–SC-017). The layer names R0 and L1–L5 come from research.md R10 and quickstart.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different file and no behavioral dependency on an incomplete task.
- **[USn]**: the spec's user stories.
  - US1 run on live market data
  - US2 fixture regression survives
  - US3 live unavailable is explicit
  - US4 payload never becomes the graph contract
  - US5 provenance and secrets
- **MANUAL**: performed by the maintainer, never by the agent. **APPROVAL REQUIRED**: ask in chat
  and wait for an explicit yes. **EXTERNAL PREREQUISITE**: depends on a party outside the
  repository. These tasks are never auto-checked.

## Invariants every phase keeps

> **INV-1 — frozen graph**: `src/graph/trading-graph.ts`, `src/integration/*`, AkariSP and
> `package*.json` are not changed. Successful runs still make 8 logical and 0 fallback requests.
> Fan-out `{ready,1,1}` means LangGraph fan-out + AkariSP backpressure, never native parallelism.
>
> **INV-2 — independent axes**: `?provider` and `?data` are parsed independently. The native
> availability preflight runs only when provider = native. Stand-in never depends on Prompt API
> availability.
>
> **INV-3 — acquisition before runtime**: in live mode, `createRuntime` is reached only after
> acquisition, normalization and rendering succeed. A market-data failure or cancel means 0 runtimes
> and 0 model requests.
>
> **INV-4 — no fallback**: live mode never uses `FIXTURE` market facts, subject or news.
>
> **INV-5 — settlement before shutdown** (Feature 004): cleanup is proven only by
> `{ready, 0, 0}` before `shutdown()`. `closed 0/0` is never proof.
>
> **INV-6 — no credential anywhere**: the key is read from the field at click time. It is passed as
> an argument into one `Authorization: Bearer` header and held nowhere else: not in module/global
> state, storage, URL, console, evidence, replay, test output or committed files. No bundler
> environment variable is used for it.
>
> **INV-7 — no market values committed**: live-mode evidence holds provenance and two digests. Values
> exist only on the page and in the gitignored `.local/replay/`.
>
> **INV-8 — no real credential before P-1**: R0 and L1–L3 use dummy strings and synthetic or
> controlled responses only.

---

## Checkpoint A — Baseline and R0 (Phase 1: Setup)

- [X] T001 Record the baseline in a new `specs/005-browser-market-data-boundary/verification.md`:
  - `git branch --show-current`, `git rev-parse HEAD` (`cca9c9a…`), `git status --short`
  - `npm ls akarisp @langchain/core @langchain/langgraph`
  - Feature 004 gates: `npm run typecheck`, `npm run build`, `npm test` (expect 43/43),
    `npm run test:browser` (expect 7/7)
  - Record exact counts. A different value is kept and explained.
- [X] T002 Hash the protected files with `shasum -a 256` into `verification.md`:
  - all files under `specs/001…`, `specs/002…`, `specs/003…`, `specs/004…` and `harness/`
  - plus `src/graph/trading-graph.ts` and `src/integration/akari-chat-model.ts`
  - These are compared in T053 (FR-027, INV-1).
- [X] T003 **R0 browser CORS probe (no credential)**:
  - Write a one-off Playwright script in the session scratchpad; it is not committed. Its text goes
    into `verification.md`.
  - Start Vite on the test port. In Playwright Chromium, on the app origin, run
    `fetch('https://api.massive.com/v2/aggs/ticker/IBM/range/1/day/<today−10>/<today>?adjusted=true&sort=asc', { headers: { Authorization: 'Bearer r0-dummy-not-a-key' } })`.
  - Record the promise outcome, `status`, whether `await res.json()` succeeds, and the body's top-level
    keys.
  - Scope of the proof: **preflight + error response only**. It is not success-path CORS.
- [X] T004 **R0 gate**:
  - Readable HTTP error JSON (expected 401) → R0 PASS; continue.
  - `TypeError: Failed to fetch` → write finding **F005-001** in the project format in
    `verification.md`, set `TECHNICAL_PURE_BROWSER_VIABILITY` to "re-review", and **STOP — APPROVAL
    REQUIRED** before any task from T006 on (FR-028).
- [X] T005 Add `.local/` to `.gitignore`. Confirm `git check-ignore -q .local/replay/x.json` succeeds.
  The replay artifacts are never committed (INV-7).

**Checkpoint A**: baseline reproducible, protected files hashed, R0 PASS.

---

## Checkpoint B — L1 deterministic data boundary (Phase 2: Foundational; US4, US5)

Tests come first in each pair.
- `test/market-data.test.ts` replaces `globalThis.fetch` with a stub that throws, except where a
  test injects its own. Any real network access fails the test.
- Bodies are **synthetic** constants in the documented Custom Bars shape with invented values. No
  captured market data (research R6).

- [X] T006 [US4] Create `src/market-data.ts` with the committed constant and types:
  - `LIVE_INSTRUMENT = { symbol: 'IBM', name: 'International Business Machines Corp.', currency: 'USD', timeZone: 'America/New_York' }`
  - `MarketSnapshot { symbol, currency, sessions, asOf }`, with sessions as
    `{ date, open, high, low, close, volume }[]` of "2–5 items, ascending"
  - `MarketDataFailure { boundary: 'market-data', kind }` with `kind` ∈ `credential-missing`,
    `network`, `unauthorized`, `rate-limited`, `provider-error`, `timeout`, `unavailable`,
    `invalid-data`
  - No provider interface, registry or factory (FR-024).
- [X] T007 [US1] Add `NEUTRAL_NEWS = { id: 'neutral-news@1', text: 'No company-specific news is supplied for this run (committed neutral fixture; no news source is connected).' }`
  to `src/graph/trading-fixture.ts`. The `FIXTURE` object must stay unchanged (FR-005, FR-006).
- [X] T008 [US4] Normalization tests in `test/market-data.test.ts`:
  - **success**: 7 bars → the last 5, ascending; snapshot keys are exactly `symbol, currency,
    sessions, asOf`; session keys are exactly `date, open, high, low, close, volume`
  - **determinism**: the same body twice gives a deep-equal snapshot
  - **status**: `ERROR`, `DELAYED` or a missing value → `provider-error` ("`status` ≠ `OK`")
  - **results**: missing or not an array → `invalid-data`; 0 or 1 bar → `unavailable`
  - **values**: `NaN`, `Infinity`, `0` or a negative price → `invalid-data`; negative or
    non-integer volume → `invalid-data`; non-integer `t` → `invalid-data`
  - **dates**: duplicate or descending session dates → `invalid-data`; a session date after
    `receivedAt`'s ET date → `invalid-data`
  - **ET dates**: a midnight-ET `t` maps to its own date, and dates stay correct across a DST change
  - Nothing partial is returned on failure (FR-012, FR-013, SC-007).
- [X] T009 [US4] Implement `normalize(body, instrument, receivedAt)` in `src/market-data.ts` per
  [contracts/market-data.md](contracts/market-data.md):
  - accepts only `status === 'OK'`
  - consumes only `status`, `results[].{o,h,l,c,v,t}`
  - derives ET dates with `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })`
  - never defaults a value
  - T008 must pass.
- [X] T010 [US4] Rendering tests in `test/market-data.test.ts`:
  - the exact expected two-sentence string for a synthetic snapshot, with `(market fact L1)`/`(L2)`,
    2-decimal prices, a signed 2-decimal change and an integer average volume
  - identical output for identical input
  - output contains none of `"results"`, `"vw"`, `"t":`, `request_id`, `{` (FR-011, SC-008)
- [X] T011 [US4] Implement `renderMarketFacts(snapshot)` in `src/market-data.ts`. T010 must pass.
- [X] T012 [US5] Digest tests and implementation in `test/market-data.test.ts` and
  `src/market-data.ts`:
  - `snapshotDigest(snapshot)` = `sha256:` + hex of `JSON.stringify` with keys in data-model order
  - `marketFactsDigest(text)` via `crypto.subtle.digest`
  - Checks: stable across calls; different values → different digests; the digest string contains
    no market value (FR-014, SC-009).
- [X] T013 [US1] Live-input tests and implementation (`buildLiveInput(snapshot)` in
  `src/market-data.ts`):
  - returns `{ id: 'live-market@1', subject: 'International Business Machines Corp. (IBM)', marketFacts: renderMarketFacts(snapshot), newsFacts: NEUTRAL_NEWS.text }`
  - `NEUTRAL_NEWS.text` contains none of `IBM`, `International Business`, `Northwind`
  - `FIXTURE` deep-equals the Feature 004 values (FR-005, FR-005a, FR-006, SC-003, SC-004)
- [X] T014 [US3] Acquisition tests in `test/market-data.test.ts`, each with an injected fetch stub and
  a clock:
  - empty key → `credential-missing` with **0** fetch calls
  - request URL = `…/range/1/day/<ET today−10>/<ET today>?adjusted=true&sort=asc`, with no key
    substring; `Authorization` header = `Bearer <key>`; exactly **1** call (no retry)
  - status mapping: 401/403 → `unauthorized`, 429 → `rate-limited`, 500 → `provider-error`, 200
    with non-JSON → `invalid-data`
  - rejections: after the run signal aborts → cancelled; after the acquisition limit → `timeout`;
    otherwise → `network`
  - `meta = { requestedAt, receivedAt, httpStatus, from, to }`
- [X] T015 [US3] Implement `acquireDailyBars(instrument, key, signal, { fetch = globalThis.fetch, now = () => new Date(), limitMs = 30_000 } = {})`
  in `src/market-data.ts`:
  - the limit is a `setTimeout` that aborts a local controller linked to `signal`, so Playwright
    `page.clock` can advance it
  - the key is used only in the header and not stored
  - T014 must pass.
- [X] T016 [US5] Replay check in `test/market-data.test.ts`:
  - For each `.local/replay/*.json`, if any (otherwise the test is skipped with a message): the
    recomputed digests equal the file's; `renderMarketFacts(snapshot) === marketFacts`; the
    `snapshotDigest` equals one in a committed `specs/005-browser-market-data-boundary/evidence/*.json`;
    the file contains neither `Bearer` nor `Authorization`.
  - Also a synthetic in-test replay object passes the same checks (SC-009).
- [X] T017 [US4] **Mutation C — raw payload leak** (not committed):
  - copy `src/market-data.ts`
  - make `normalize` keep the provider bar objects (`sessions = results.slice(-5)`)
  - T008 (exact keys) and T010 (no provider field names) must FAIL
  - restore from the copy; `cmp` identical; rerun → PASS; residue 0
- [X] T018 **Checkpoint B gate**: `npm run typecheck`, `npm test`. Record counts: Feature 004 43 plus
  the new tests. The replay test is reported as skipped when no local file exists.

**Checkpoint B**: the data boundary is proven without network (L1).

---

## Checkpoint C — Application integration (US1, US3, US5)

- [X] T019 [US1] Edit `index.html`:
  - `<p id="mode">`, and a `<label>` with `<input id="key" type="password" autocomplete="off">` that
    is hidden unless data = live
  - `<p>` "Market snapshot" `<pre id="market">` for the page-local snapshot display, and
    `<pre id="replay">`
  - Replace "Nothing is sent anywhere" with: fixture mode sends nothing; live mode fetches
    **end-of-day** daily bars for IBM from Massive at run time with the owner's key ("live" =
    fetched at run time, not real-time); no output is investment advice.
- [X] T020 [US1] In `src/main.ts`:
  - parse `data = params.get('data') === 'live' ? 'live' : 'fixture'` independently of `provider`
    (INV-2)
  - show `provider: … · data: …` in `#mode`
  - show the key field only when data = live (FR-007, FR-008)
- [X] T021 [US1] [US3] Reorder `run()` in `src/main.ts` (INV-2, INV-3, INV-4):
  1. Create the run `AbortController` at click, so Cancel reaches acquisition (FR-019).
  2. `provider === 'native' && availability !== 'MODEL_AVAILABLE'` → the Feature 004 `BLOCKED`
     record before any fetch. Stand-in has no availability gate.
  3. data = live:
     - `acquireDailyBars(LIVE_INSTRUMENT, keyField.value, controller.signal)` → `normalize` →
       `renderMarketFacts` → digests
     - Any failure or cancel returns a record **without** calling `createRuntime`, with outcome
       `failed` or `cancelled`, `failure: { boundary: 'market-data', kind }`,
       `counts.logicalRequests 0`, all nodes `waiting`, `lifecycle: null`, and no `result`.
     - On success, `input = buildLiveInput(snapshot)`.
  4. data = fixture: `input = FIXTURE`.
  5. `runGraph(base, input)`: the Feature 004 body with `FIXTURE` replaced by the parameter.
     Inference-side records get `failure: { boundary: 'inference', kind }` with `kind` ∈
     `native-unavailable` (the BLOCKED record), `runtime-create` (`createRuntime` rejected), `model`
     (the graph rejected with an AkariSP `TaskError`), `graph` (any other graph rejection),
     `cancelled` (abort after the graph started).
  - The key value is never assigned outside the call expression.
- [X] T022 [US5] Evidence in `src/main.ts` per [contracts/evidence.md](contracts/evidence.md):
  - `dataSource.mode` is part of the shared `base`, so **every** record carries it, including
    BLOCKED and failure records. A BLOCKED record or a failure before the source replied may hold
    `{ mode }` only (plus whatever was reached). Snapshot and temporal fields are never required
    there.
  - `feature: '005-browser-market-data-boundary'`, `input: { id, news }`, `timing.acquisitionMs`
  - fixture mode: `dataSource: { mode: 'fixture', fixture: FIXTURE.id }`; the Feature 004 `fixture`
    field and full `result` are kept
  - live mode: `dataSource` provenance (`source`, `endpoint` template, `symbol`, `from`, `to`,
    `requestedAt`, `receivedAt`, `httpStatus`, `providerStatus`, `requestId`, `bars`, `asOf`,
    `ageHours`, `snapshotDigest`, `marketFactsDigest`); `fixture` omitted;
    `result = { <field>: { present, length } }`
  - never values, `marketFacts`, URL with query, or header
  - FR-014–FR-017
- [X] T023 [US5] In `src/main.ts`, on a live success:
  - show the snapshot in `#market`
  - print `{ snapshot, marketFacts, snapshotDigest, marketFactsDigest }` in `#replay`
  - `#evidence` never contains these values (INV-7, SC-009)
- [X] T024 **Checkpoint C gate**: `npm run typecheck`, `npm run build`, `npm test`,
  `npm run test:browser`. The Feature 004 cases stay 7/7 unchanged, because fixture is the default
  mode.

**Checkpoint C**: live mode is wired; the fixture path is unchanged.

---

## Checkpoint D — L3 browser controlled responses (`e2e/app.spec.ts`; US1–US5)

Shared setup in `e2e/app.spec.ts`:
- a `massive(page, handler)` helper using `page.route('https://api.massive.com/**', …)` with
  synthetic bodies; no real network
- `DUMMY_KEY = 'l3-dummy-key-not-real'`
- a `createCalls(page)` helper that wraps the installed stand-in `LanguageModel.create` via
  `page.evaluate` and counts calls

The tests share one file and run sequentially.

- [X] T025 [US2] **(A) stand-in + fixture**: extend Feature 004 test (a).
  - `dataSource.mode` is `fixture`, `input.id` is `tradingagents-fixture@1`, `fixture` is present.
  - 0 requests to `api.massive.com` (`page.on('request')`).
  - Every Feature 004 assertion is unchanged (FR-006, FR-023, SC-003).
- [X] T026 [US1] **(B, N, O, P) stand-in + live success**:
  - The route returns 200 with 7 synthetic bars. The route handler asserts the request URL has no
    `DUMMY_KEY` and `Authorization === 'Bearer ' + DUMMY_KEY`.
  - `evidenceClass` is `BROWSER_AUTOMATED`; the eight nodes are `done`, including `newsAnalyst`.
  - `logicalRequests 8`, `fallbackRequests 0`, `providerInvocations 'NOT EXPOSED'`.
  - `lifecycle`: `settledBeforeShutdown` true, before `{ready,0,0}`, after `closed`.
  - `dataSource` has every provenance field and both digests. `input` is
    `{ id: 'live-market@1', news: 'neutral-news@1' }`.
  - `result` has `present`/`length` only. `#evidence` contains none of the synthetic price strings.
  - `#replay` digests equal the evidence digests.
  - `#result` (the stand-in echo of the Final Decision prompt) contains
    `International Business Machines Corp. (IBM)` and not `Northwind`.
  - FR-003, FR-005, FR-005a, FR-014–FR-016, FR-018, SC-001, SC-004, SC-015.
- [X] T027 [US3] **(C–G, J, K) market-data failure matrix**, one test per case:

  | Case | Expected `kind` |
  |---|---|
  | `route.abort('failed')` | `network` |
  | 401 | `unauthorized` |
  | 429 | `rate-limited` |
  | 500 | `provider-error` |
  | 200 `{status:'ERROR'}` | `provider-error` |
  | 200 with a `NaN` price | `invalid-data` |
  | 200 with 1 bar | `unavailable` |
  | empty key | `credential-missing`, 0 requests |

  Each case asserts:
  - `outcome: failed` and `failure.boundary: 'market-data'` with the expected kind
  - `createCalls` = 0, `logicalRequests` 0, `lifecycle` null
  - nodes all `waiting`, no `result`, no `fixture` field, `#result` without `Northwind`
    (no fallback)
  - Run re-enabled
  - FR-009, FR-017, SC-006, SC-010
- [X] T028 [US3] **(H) acquisition timeout**:
  - `page.clock.install()` before `goto`; the route never fulfills.
  - Advance 30 s → `kind: 'timeout'`, `createCalls` 0, `logicalRequests` 0.
- [X] T029 [US3] **(I) cancel during acquisition**:
  - The route is held; click Cancel.
  - `outcome: cancelled`, `failure.boundary: 'market-data'`, `createCalls` 0, `logicalRequests` 0.
  - Then release the route (FR-019, SC-012).
- [X] T030 [US1] [US3] **Live-mode graph-stage cancellation** (FR-018; representative, the
  Feature 004 fixture-mode lifecycle tests are not repeated):
  - The route returns 200 with synthetic bars. `standin('hold')` before Run.
  - Wait for runtime `data-active 1` / `data-queued 1` (the two analysts), then click Cancel.
  - `outcome: cancelled`, `failure: { boundary: 'inference', kind: 'cancelled' }`, both model
    requests `cancelled`, Bull…Final `waiting`, no `result`.
  - `dataSource` still carries the acquisition provenance and both digests, because acquisition
    succeeded.
  - `settledBeforeShutdown: true`, before `{ready, 0, 0}`, after `closed` (INV-5). Then
    `standin('resume')`.
- [X] T031 [US1] **native + live in Playwright Chromium**:
  - `BLOCKED`, `not-run`, and 0 requests to `api.massive.com`. The native preflight precedes
    acquisition; the data mode does not change the class (FR-016, INV-2).
- [X] T032 [US1] **Four mode URLs**: `/?provider=standin`, `/`, `/?provider=standin&data=live`,
  `/?data=live` each report the correct `provider` and `dataSource.mode` in `#mode` and in the
  record (FR-007, FR-008, SC-005).
- [X] T033 [US5] **(L, M) leakage checks** after the T026 success and one T027 failure:
  - `DUMMY_KEY` is absent from `#evidence`, `#replay`, `#market`, every console message
    (`page.on('console')`), `localStorage`/`sessionStorage` dumps, `document.cookie`, `page.url()`
    and every request URL
  - no record contains `Authorization` or `Bearer`
  - after the run, `grep -r "$DUMMY_KEY" test-results/` = 0 hits
  - FR-022, SC-011
- [X] T034 **Mutation A — silent fallback** (not committed):
  - copy `src/main.ts`
  - on a market-data failure, set `input = FIXTURE` and continue to `runGraph`
  - T027 must FAIL (`fixture` present / `logicalRequests` 8 / `Northwind` echoed)
  - restore; `cmp` identical; rerun → PASS; residue 0
- [X] T035 **Mutation B — runtime before acquisition** (not committed):
  - move `createRuntime` to the start of `run()`, before acquisition
  - the `createCalls` 0 assertions in T027 and T029 must FAIL
  - restore; `cmp` identical; rerun → PASS
- [X] T036 **Mutation D — credential leak** (not committed):
  - make `dataSource.endpoint` include `?apiKey=<key>`
  - T033 must FAIL
  - restore; `cmp` identical; rerun → PASS
- [X] T037 **Checkpoint D gate**:
  - `npm run test:browser` three times
  - record counts (Feature 004 7 plus the new cases) and stability
  - record the mutation outcomes of T034–T036 in `verification.md`

**Checkpoint D**: L3 PASS with stand-in + live on controlled responses.

---

## Checkpoint E — Automated stabilization

- [X] T038 [US1] Update `e2e/prompt-api.spec.ts`:
  - In the existing canonical test (`native Prompt API: canonical eight-role fixture graph …`), add
    `expect(record.dataSource.mode).toBe('fixture')`. It stays credential-free.
  - Add the owner-run native live test titled `native Prompt API: live market data run (owner-run
    L5)`. The title contains neither `eight-role` nor `canonical`, so `-g "eight-role"` never
    selects it.
  - `test.skip(!process.env.BTA_MASSIVE_KEY, 'owner-run L5 only')`
  - reuse `launchNativeChrome`; `goto('/?data=live&runner=playwright')`;
    `page.fill('#key', process.env.BTA_MASSIVE_KEY)`; Run
  - assert the SC-016 gate fields
  - write `#evidence` to `testInfo.outputPath('evidence.json')`
  - never log or write the key; the test's own assertion checks that the written file lacks it
  - no trace, video or screenshot for this test (`test.use({ trace: 'off', video: 'off',
    screenshot: 'off' })`). It must not be run with `DEBUG=pw:api`, which prints `fill` values.
  - The variable is set by the owner in their own terminal (quickstart procedure). It is test-runner
    input, not a bundler variable.
- [X] T039 [US5] Static secret scan, recorded in `verification.md` (FR-022, SC-011, INV-6):
  - `grep -rnE "import\.meta\.env|VITE_|localStorage|sessionStorage" src/` → 0 key-related uses
  - `grep -rn "console\." src/market-data.ts` → 0
  - `npm run build`, then `grep -r "l3-dummy-key-not-real\|apiKey=" dist/` → 0
  - `git grep -nE "Bearer [A-Za-z0-9_]{16,}"` → 0
- [X] T040 Static scope audit, recorded in `verification.md` (FR-001, FR-002, FR-020, FR-021,
  FR-023–FR-026, SC-002, SC-013, SC-014):
  - `git diff cca9c9a -- src/integration src/graph/trading-graph.ts package.json package-lock.json`
    is empty
  - `fetch(` appears only in `src/market-data.ts`
  - no `interface .*Provider|Registry|Factory` in `src/`
  - no news, tool, RAG or server code
  - FR-026 audit: no test asserts model wording or live values
- [X] T041 [P] Update `docs/testing.md`:
  - data modes and the four URLs, the L1/L3 layers, and "live" = end-of-day data fetched at run time
  - key handling (INV-6) and the `.local/replay/` artifact
  - the owner-run L4/L5 procedure, including the quickstart key-entry procedure (silent read →
    subshell env → run → automatic unset; never a literal on the command line)
  - Note: Chrome may offer to save the key typed into the password field; decline it. That store is
    outside the application.
- [X] T042 **Checkpoint E gate**:
  - `npm run typecheck`, `npm run build` (`dist/` only), `npm test`, `npm run test:browser`
  - Re-check the T002 protected hashes (`shasum -a 256 -c`): all identical (SC-017).
  - Record counts in `verification.md`.
  - R0 + L1–L3 PASS and hashes identical → **IMPLEMENTATION_COMPLETE**.
  - IMPLEMENTATION_COMPLETE does **not** mean every SC passed:
    - native + fixture is proven by T044
    - native + live and SC-016 are proven by L5 (T051)
    - FEATURE_COMPLETE still needs P-1 + L4 + L5 + the final audit (T056)
- [ ] T043 **APPROVAL REQUIRED — commit.**
  - With the maintainer's approval, commit the implementation to `005-browser-market-data-boundary`
    (no push unless asked). Exclude `.claude/`, `.specify/*` tooling, `CLAUDE.md` and `.local/`.
  - Confirm that
    `git status --porcelain -- index.html src test harness e2e package.json package-lock.json vite.config.ts`
    is empty, so the revision is clean.

- [ ] T044 [US2] **APPROVAL REQUIRED — native + fixture clean-revision gate** (no credential; not
  gated by P-1):
  - At the T043 commit with the code paths clean, in installed Google Chrome with `MODEL_AVAILABLE`,
    run the repository's canonical native test: `npm run test:prompt-api -- -g "eight-role"`.
  - Validate the record: `REAL_BROWSER_PROMPT_API`, `native`, revision = T043 commit without
    `+dirty`, `dataSource.mode: fixture`, `input.id: tradingagents-fixture@1`, eight nodes `done`,
    8/0 measured, `settledBeforeShutdown: true`, `outcome: success`.
  - Save it unedited as
    `specs/005-browser-market-data-boundary/evidence/real-browser-fixture-<date>-<sha>.json`.
  - Model unavailable → `BLOCKED`. Stand-in or Chromium results never substitute (SC-001, SC-005).

---

## Checkpoint F — P-1 (EXTERNAL PREREQUISITE, MANUAL)

- [ ] T045 **EXTERNAL PREREQUISITE / MANUAL — P-1 (F005-P1).**
  - The maintainer obtains a record Massive can stand behind: written support confirmation, or a
    licence/plan confirmation, that personal, local, LLM-assisted analysis of Stocks Basic data is
    permitted.
  - Record in `verification.md`: date, form, and the quoted scope. No credential and no personal
    data.
  - Result `PASS` or `UNRESOLVED`. The agent does not decide it.
  - **UNRESOLVED** → record L4 and L5 as `BLOCKED (P-1)`, skip Checkpoints G–H, and go to I.
  - Only G and H depend on this task.

---

## Checkpoint G — L4 real Massive + stand-in (MANUAL, APPROVAL REQUIRED; needs T045 PASS, T043)

- [ ] T046 **APPROVAL REQUIRED**: ask the maintainer in chat to approve an authenticated request.
  The agent never sees, types or stores the key.
- [ ] T047 **MANUAL** (maintainer):
  - At the clean T043 revision, run `npm run dev`, open `/?provider=standin&data=live`, type the key
    into the page, and click Run.
  - Save `#evidence` unedited as
    `specs/005-browser-market-data-boundary/evidence/live-standin-<date>-<sha>.json`.
  - Optionally save `#replay` to `.local/replay/`.
  - The key never goes into chat, commands or files.
- [ ] T048 Validate the L4 record against [contracts/evidence.md](contracts/evidence.md):
  - `BROWSER_AUTOMATED`, `standin`, `dataSource.mode: live`, `source: massive`, `httpStatus: 200`,
    `providerStatus: OK`, both digests
  - eight nodes `done`, 8/0, `settledBeforeShutdown` true, clean revision, no fields outside the
    contract
  - This is the first **authenticated success-response CORS** proof.
  - Run `npm test` so T016 checks a saved replay file.
  - `Failed to fetch` → F005-001 and stop. A non-OK `status` → finding, with no contract change
    without a decision (SC-009).

---

## Checkpoint H — L5 real Massive + native Prompt API (MANUAL, APPROVAL REQUIRED; needs T045 PASS, T048)

- [ ] T049 **APPROVAL REQUIRED**: ask the maintainer to approve the SC-016 run.
- [ ] T050 **MANUAL** (maintainer):
  - At the clean T043 revision, in installed Google Chrome with `MODEL_AVAILABLE`, run either:
    - `/?data=live` (runner `manual`): type the key, Run, save `#evidence` unedited, or
    - the quickstart key-entry procedure in the maintainer's own terminal, which runs
      `npm run test:prompt-api -- -g "live market data"` (runner `playwright`). The key is never
      written on a command line.
  - Save as `specs/005-browser-market-data-boundary/evidence/real-browser-live-<date>-<sha>.json`.
  - Model or source unavailable → save the `BLOCKED` or failure record. Never a stand-in substitute.
- [ ] T051 [US1] Validate the SC-016 gate record per [contracts/evidence.md](contracts/evidence.md):
  - `REAL_BROWSER_PROMPT_API`, `native`, `MODEL_AVAILABLE`, revision = T043 commit without `+dirty`,
    versions
  - `dataSource.mode: live`, `source: massive`, `httpStatus: 200`, `providerStatus: OK`, both digests
  - `input.news: neutral-news@1`, eight nodes `done`, `logicalRequests`/`fallbackRequests` as
    measured (expected 8/0), `settledBeforeShutdown` true, `outcome: success`
  - no values, no key
  - record `timing.acquisitionMs` and `graphMs`; `graphMs` > 90 000 is only a watchdog-review
    observation
  - SC-001, SC-009, SC-016

---

## Checkpoint I — Final audit (Phase: Polish)

- [ ] T052 Findings review in `verification.md`: F005-001 (if raised), F005-P1 (final state),
  F005-P2 (closed), and any new finding in the project format (FR-028).
- [ ] T053 Re-hash the T002 files → identical. This covers `specs/001–004`, `harness/`,
  `trading-graph.ts` and `akari-chat-model.ts` (FR-027, SC-017, INV-1).
- [ ] T054 Coverage table in `verification.md`: FR-001…FR-028 (including FR-005a) and
  SC-001…SC-017, each → task(s) + evidence (test name, record file or static check). No
  documentation-only row.
- [ ] T055 [P] Update `docs/roadmap.md`: the Feature 005 status (with P-1 state), "live" =
  end-of-day at run time, and Feature 006 = `006-browser-news-data-boundary`.
- [ ] T056 Completion record at the end of `verification.md`:
  - `IMPLEMENTATION_COMPLETE` (T042), native + fixture gate (T044), P-1 (T045), L4 (T048),
    L5/SC-016 (T051)
  - `FEATURE_COMPLETE` only if P-1 PASS, L4 PASS, L5 PASS and T052–T054 PASS; otherwise
    `BLOCKED / INCOMPLETE` with the reason
  - No lower layer substitutes for L5.

---

## Dependencies & Execution Order

```text
A  T001–T005   baseline, hashes, R0 (T004 gate: F005-001 → STOP)
 → B  T006–T018   L1 deterministic boundary (+ Mutation C)
 → C  T019–T024   application integration
 → D  T025–T037   L3 controlled browser (+ graph-stage cancel T030, Mutations A, B, D)
 → E  T038–T044   stabilization → IMPLEMENTATION_COMPLETE (T042) → APPROVAL commit (T043)
                  → native + fixture clean gate (T044, no credential)
 → F  T045        P-1 EXTERNAL PREREQUISITE ─┐ UNRESOLVED → G, H = BLOCKED → I
 → G  T046–T048   L4 (needs T043 + T045 PASS)
 → H  T049–T051   L5 / SC-016 (needs T048)
 → I  T052–T056   final audit → FEATURE_COMPLETE or BLOCKED
```

- Only G and H depend on P-1. A–E and I never need a real credential (INV-8).
- Test before implementation inside B: T008→T009, T010→T011, T014→T015.
- T021 needs T015 and T013. T022/T023 need T012. D needs C. T030 needs T026. T044 needs T043
  (clean revision) and is independent of P-1. T034–T036 need T027/T029/T033 green.

## Parallel Opportunities

- T041 (`docs/testing.md`) ‖ T039–T040; T055 (`docs/roadmap.md`) ‖ T052–T054.
- Everything else shares `src/market-data.ts`, `test/market-data.test.ts`, `src/main.ts` or
  `e2e/app.spec.ts`, or depends on the preceding task's behavior.

## Requirement Coverage

| Req | Tasks |
|---|---|
| FR-001 | T026, T040, T042 |
| FR-002 | T040, T042 (Feature 004 G2–G9) |
| FR-003 | T026, T027, T051 |
| FR-004 | T020, T025, T026 |
| FR-005 | T007, T013, T026 |
| FR-005a | T013, T026 |
| FR-006 | T013, T025 |
| FR-007 | T020, T031, T032 |
| FR-008 | T020, T022, T032 |
| FR-009 | T021, T027, T034 |
| FR-010 | T009, T011 |
| FR-011 | T010, T017 |
| FR-012 | T008, T009 |
| FR-013 | T008, T014 |
| FR-014 | T012, T016, T022, T023, T026 |
| FR-015 | T022, T026 |
| FR-016 | T026, T031, T032 |
| FR-017 | T022, T027 |
| FR-018 | T026, T030, T042 |
| FR-019 | T021, T029, T035 |
| FR-020, FR-021 | T040 |
| FR-022 | T033, T036, T039 |
| FR-023 | T025, T026, T040 |
| FR-024–FR-026 | T040 |
| FR-027 | T002, T053 |
| FR-028 | T004, T052 |
| SC-001 | T026, T042, T044, T051 |
| SC-002 | T040, T042 |
| SC-003 | T013, T025 |
| SC-004 | T013, T025, T026 |
| SC-005 | T032, T044, T051 |
| SC-006 | T027, T028, T034 |
| SC-007 | T008, T010 |
| SC-008 | T010, T017 |
| SC-009 | T012, T016, T022, T023, T048, T051 |
| SC-010 | T027 |
| SC-011 | T033, T036, T039 |
| SC-012 | T026, T029, T030, T035 |
| SC-013, SC-014 | T040 |
| SC-015 | T026, T027 |
| SC-016 | T050, T051 |
| SC-017 | T042, T053 |

## Implementation Strategy

1. A: prove the baseline and the browser error path (R0) before writing provider code.
2. B: build and prove the boundary without network. This is the MVP of US4/US5.
3. C → D: wire live mode behind the unchanged graph; prove every failure and security property on
   controlled responses.
4. E: IMPLEMENTATION_COMPLETE; approval commit at a clean revision.
5. F → G → H: the external prerequisite, then owner-run real-source layers. P-1 unresolved =
   Feature BLOCKED, honestly recorded.
6. I: audit and completion record.
