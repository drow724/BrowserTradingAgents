# Testing

| Command | What runs | Evidence class |
|---|---|---|
| `npm test` | unit tests (fake `Runtime`), incl. the Feature 004 eight-role fixture graph (`test/trading-graph.test.ts`) and the Feature 007 market bundle without network (`test/market-bundle.test.ts`: golden indicator values, validation, time zones, digests; its local-replay check is skipped unless `.local/replay/*.json` holds a bundle artifact) and the `/api/market` route against an in-process Yahoo stand-in (`test/market-route.test.ts`) + Node integration (real `akarisp`, stand-in `LanguageModel`; `test/node-integration.test.ts`, `test/trading-graph-integration.test.ts`) | `DETERMINISTIC_TEST`, `NODE_INTEGRATION` |
| `npm run test:browser` | on the Next.js **production** server (`next build && next start`): canonical app `/` = eight-role graph (`e2e/app.spec.ts`: fixture mode, and live mode through `/api/market` to the **local Yahoo stand-in** `e2e/market-stub.mjs` — every non-local browser request is aborted) and Feature 002 harness `/harness` (`e2e/harness.spec.ts`) in Playwright's Chromium with the stand-in; native paths must report `BLOCKED` | `BROWSER_AUTOMATED` |
| `npm run test:browser:dev` | dev smoke only (`BTA_DEV_SMOKE=1`, `next dev`): the `@dev` test checks one click = one runtime and one graph run under React Strict Mode | `BROWSER_AUTOMATED` |
| `npm run test:prompt-api` | on the same production server: canonical app `/` (fixture mode) and Feature 002 harness `/harness` in the **installed Google Chrome** with the **native Prompt API** (Gemini Nano), headless. The native gate is `-g "eight-role"` = native + **fixture**; the real-Yahoo test is skipped unless `BTA_REAL_YAHOO=1` (see below) | `REAL_BROWSER_PROMPT_API`, `runner: playwright` |
| `npm run dev` | `next dev`: canonical app at `http://localhost:3000/` (Next's default port) for a manual run in your own Chrome (`?provider=standin` = stand-in, never Prompt API evidence; `?data=live` = live market data, see below) | `REAL_BROWSER_PROMPT_API`, `runner: manual` (or `BLOCKED`) |
| `npm run dev` → `/harness` | the Feature 002 harness page, `http://localhost:3000/harness` | Feature 002 record |

Other commands: `npm run build` (`next build`), `npm start` (`next start`), `npm run typecheck`
(`next typegen && tsc --noEmit`).

## Application shell (Feature 006)

- The app is a Next.js App Router application. Vite is retired. Server Components render only the
  static markup; a small client component (`components/Boot.tsx`) imports the unchanged browser
  entry (`src/main.ts`, or `harness/main.ts` for `/harness`) inside an effect, so the graph,
  AkariSP and the Prompt API run only in the browser.
- The canonical harness route is `/harness` (`app/harness/page.tsx`). `harness/index.html` is
  retained as a protected historical file; it is no longer an executable entry.
- Live market data comes through the one route handler, `/api/market` (Feature 007, below). The graph
  never runs on the server.
- Playwright uses its own explicit port (`HARNESS_PORT`, default 5174), separate from the dev
  port. It starts exactly one app server per run: the production server for `test:browser` and
  `test:prompt-api`, `next dev` only for `test:browser:dev`. The dev server is never a browser gate.
  Next to it, Playwright starts the local Yahoo stand-in (`e2e/market-stub.mjs`, app port + 24)
  and points `/api/market` at it with `BTA_YAHOO_BASE_URL`.
- Build output is always the default `.next` (gitignored with `next-env.d.ts`). Run one Playwright
  session per checkout; use a separate `git worktree` for parallel work. No build, dev, typegen or
  test command may modify a tracked file.
- **Revision**: `next.config.ts` reads `git rev-parse HEAD` when `next build` or `next dev` starts
  and appends `+dirty` if any code path (`src test harness e2e app components package.json
  package-lock.json next.config.ts tsconfig.json playwright.config.ts`) differs from HEAD. The
  values go to `compiler.define` as raw strings (Next quotes them itself; `JSON.stringify` would
  embed the quotes).
- **Dev hot reload**: `src/main.ts` wires the page at module evaluation, once per page load. After
  editing it under `npm run dev`, reload the page instead of relying on hot reload. The revision
  is also fixed when `next dev` starts; restart it for a fresh revision.

## Real Prompt API without downloading the model again

`npm run test:prompt-api` reuses the model your Google Chrome already downloaded. It works only on
the macOS machine that has that Chrome and model (not in cloud sessions).

1. Once (and again after Chrome updates its model): build the golden profile.

   ```bash
   npm run prepare:prompt-api
   ```

   It APFS-clones `OptGuideOnDeviceModel/` from your Chrome profile (no data copied, ~0 extra disk)
   into `~/.cache/browser-trading-agents/prompt-api-profile` and writes a `Local State` containing
   only the model prefs. Nothing else is read from your Chrome profile; nothing is downloaded.

2. Run:

   ```bash
   npm run test:prompt-api
   ```

   Each test APFS-clones the golden profile into its own output folder, launches Google Chrome
   headless on it, runs one full eight-role fixture graph on the canonical page `/` (Feature 004, native
   provider only — never the stand-in) or the harness S1–S7 (Feature 002), and deletes the clone. The record is written to
   `test-results/<port>/…/evidence.json`.

- **Several sessions at once**: give each its own port —
  `HARNESS_PORT=5175 npm run test:prompt-api`. The output folder is keyed by port.
- **Override paths**: `PROMPT_API_PROFILE` (golden profile), `CHROME_USER_DATA_DIR` (source
  Chrome profile for the prepare step).
- **Why the special launch flag**: Playwright disables Chrome's `OptimizationHints` feature by
  default, which the on-device model needs. The test re-enables only that feature. Playwright's
  other defaults (no component updates, no background networking) stay on, so a test cannot start
  a model download. The list of Playwright's default disabled features is pinned to Playwright
  1.63.0; the test fails with a clear message after a Playwright upgrade until the list is updated.
- **What does not work** (probed 2026-09-28): Playwright's default launch arguments (model reports
  `downloadable`/`unavailable`), and Chrome for Testing with those arguments removed
  (`availability()` never resolves). Only the installed Google Chrome with `OptimizationHints`
  re-enabled reports `available`.

## Data modes (Feature 005, server boundary since Feature 007)

Two independent choices in the canonical page URL:

| | fixture (default) | live (`?data=live`) |
|---|---|---|
| stand-in (`?provider=standin`) | `/?provider=standin` | `/?provider=standin&data=live` |
| native (default) | `/` | `/?data=live` |

- **fixture**: the committed fictional fixture (Feature 004). It is deterministic and makes no
  market-data request of any kind. It stays the canonical regression, and the native gate is
  native + fixture.
- **live**: `browser → /api/market (same origin) → this app's server → Yahoo chart endpoint`.
  - The server:
    - fetches about 5 years of daily bars for IBM
    - applies yfinance's `auto_adjust` formula
    - computes the 12 indicators of the upstream Market Analyst prompt
    - returns one validated bundle
  - The browser renders the Market Analyst's `marketFacts` from that bundle.
  - "Live" means fetched at run time; the data is end-of-day, not real-time.
  - News stays a committed, company-neutral text.
  - Evidence holds provenance (`analysisDate`, `marketAsOf`, `acquiredAt`, `receivedAt`, `usedAt`)
    and two digests, never prices or role text.
- **No key**: the Yahoo path needs no API key, signup or deployment secret. The Feature 005
  browser-direct Massive path and its key field are retired; their records stay in
  `specs/005-browser-market-data-boundary/`.
- **Yahoo-compatible, not yfinance**: it uses the same chart endpoint and adjustment formula as
  Python yfinance, but it is a different client, with no cookie, crumb, retry or cache.
- **Scope and risk**:
  - Personal research use by the deployer. The endpoint is unofficial and can change or
    rate-limit without notice.
  - Yahoo's terms (§2.4) restrict automated access. This restriction is recorded; the server
    boundary does not resolve it, and nothing here claims suitability for public redistribution.
  - A local reachability check (Feature 007 T008) does not show that a Vercel deployment can
    reach Yahoo.
- **Failures**:
  - A live failure is typed `{boundary: 'market-data', stage, kind}`: network, unauthorized,
    rate-limited, provider error, timeout, unavailable, invalid data, cancelled or invalid request.
  - It ends the run before any runtime exists.
  - There is no fallback to the fixture or to another provider, and no retry.
- **Future providers**: Tiingo, Alpha Vantage and Massive are possible later, behind the same
  `/api/market` contract. None is built.

### Local replay artifact

Copy the `#replay` JSON of a successful live run into `.local/replay/<name>.json`. `.local/` is
gitignored; never commit it. It holds the validated bundle, `marketFacts` and their digests, and no raw
provider response. `npm test` then checks that it re-renders and re-digests to itself, with no
network.

### Real-Yahoo runs (approval-gated, Feature 007 G)

`BTA_REAL_YAHOO=1` removes the stand-in and selects only the "real Yahoo" tests. Without it these
tests are skipped and no test reaches Yahoo. Run them only on a clean committed revision, with the
maintainer's approval:

```bash
BTA_REAL_YAHOO=1 npx playwright test --project=chromium -g "real Yahoo"
```

```bash
BTA_REAL_YAHOO=1 npm run test:prompt-api -- -g "real Yahoo"
```

Each writes `real-yahoo-evidence.json`. It records:
- revision and clean state
- Node, Next and Chrome versions
- `environment: local`
- the browser's direct Yahoo requests (measured: 0 expected)
- server → Yahoo requests as "not directly instrumented"

A typed market-data failure is recorded as BLOCKED, never as PASS.

## Execution view and office (Features 008, 009)

- **Text execution view** (Feature 008): the canonical display. It observes the page's status surface
  read-only; `?viz=off` removes it and the office entirely.
- **Office** (Feature 009): the same view state drawn by our own canvas renderer, on by default
  (Feature 008 D5 re-decided, MD-4). Korean dialog-box narration; name tags carry every state as text.
  - Art is our own (Feature 011): text pixel maps in `art/office/` → committed PNGs in `public/office/` by
    `node scripts/build-office-art.mjs` (byte-deterministic; `--check` fails when a PNG is out of date, and
    `test/office-art.test.ts` runs it). Provenance: `art/office/PROVENANCE.md`, one row per file.
  - The Feature 008 Pixel Agents iframe was retired (MD-5).
- **Tests**:
  - `test/execution-view.test.ts`, `test/narration.test.ts`: synthetic traces, no model.
  - `e2e/execution-view.spec.ts` (text view), `e2e/office.spec.ts` (office; traces replayed as DOM writes
    by `e2e/replay-dom.ts`).
  - `e2e/view-overhead.spec.ts`: SC-008 — the default page with the office visible and animating within
    2 pp of `?viz=off`. Part of `npm run test:browser`, which runs single-worker (shared stub).
- **Native**: `npm run test:prompt-api` runs the fixture graph once in the default view.

## Shell, portfolio and symbol directory (Feature 009)

- **Seeded portfolio**: `playwright.config.ts` sets a default `storageState` with a finished, empty
  `bta.portfolio`, so every suite opens into the office. Onboarding tests use an empty state; the native
  gate seeds the same value with `context.addInitScript` (its persistent context gets no storageState).
- **Directory**: `/api/directory` talks to the local stand-in (`e2e/market-stub.mjs`, fictional files in
  `test/fixtures/directory/`) through `BTA_DATA_GO_KR_BASE_URL`, `BTA_NASDAQ_TRADER_BASE_URL` and a fake
  `BTA_DATA_GO_KR_KEY`; no test reaches data.go.kr or Nasdaq Trader.
- **Real sources** (optional, approval-gated): put a data.go.kr key issued to the maintainer in
  `.env.local` as `BTA_DATA_GO_KR_KEY` (server-only; never commit). Without it, Korean search shows
  "인증키 없음" and everything else works.
- **Tests**: `test/portfolio.test.ts`, `test/directory.test.ts` (parsers, once-per-day server cache under
  100 concurrent calls, import boundary, search ≤ 100 ms); `e2e/onboarding.spec.ts`,
  `e2e/directory.spec.ts` (incl. the holdings privacy sentinel), `e2e/a11y.spec.ts`.

## Portfolio analysis and grounding (Feature 010)

- **Runs**: the shell starts a portfolio run with a `bta-analyze` event on `#run`; `src/main.ts` announces each
  finished record with `bta-done`. Portfolio runs use committed fictional facts (`src/analysis/portfolio-fixture.ts`)
  and make no network request. The 포트폴리오 window's "예시 포트폴리오" loads the fictional portfolio.
- **Tests**: `test/analysis.test.ts` (facts, prompts — demo prompts pinned to `e9b2425` in
  `test/fixtures/grounding/demo-prompts@e9b2425.json` — and question resolution), `test/grounding.test.ts` (71
  labelled claims in `test/fixtures/grounding/claims.json`, report and verdict), `test/ledger.test.ts`;
  `e2e/analysis.spec.ts` (runs, flags, questions, overview and cancel, ledger, privacy sentinel),
  `e2e/measurement.spec.ts` (stand-in measurement, deterministic), `e2e/a11y.spec.ts`.
- **Native measurement** (opt-in, installed Chrome, long): `BTA_MEASURE=1 npm run test:prompt-api -- -g measurement`
  (`BTA_MEASURE_REPS`, default 3). The report is written to the test output; its verdict follows SC-007. Stand-in
  numbers are `NOT_APPLICABLE` (the stand-in echoes its prompt).


## Runtime reuse (Feature 012)

- `?reuse=on` keeps one AkariSP runtime for the page session; the default (`off`) keeps one runtime per run. Records
  carry `lifecycle.mode`, `runtimeId`, `prepared` (and `replaced` / `discarded` when a runtime is swapped).
- `e2e/reuse.spec.ts` (stand-in): prepare-once, identical results with and without reuse, cancel/failure/pagehide
  recovery, live-acquisition failure prepares nothing; writes `measurement-reuse-standin.json` to the test output.
- **Native comparison** (opt-in, installed Chrome, ~5 min per overview):
  `BTA_REUSE_COMPARE=1 npm run test:prompt-api -- -g reuse` (`BTA_REUSE_REPS`, default 2 per mode, alternating order).

## Numbers by reference and checker fixes (Feature 013)

- `?numbers=current|formatted|refs` (default `current`) selects the final role's number mode for portfolio runs:
  `formatted` adds the app's Korean reading after each KRW amount in the final role's facts; `refs` gives every number
  a name (`{H3}`, `{D1b}`) and asks for references only — the app renders them (`src/analysis/format.ts`,
  `src/analysis/references.ts`) and flags `bare-number`, `unknown-reference`, `unbraced-reference`. The seven other
  roles are identical in every mode.
- Checker (Feature 013): Korean refusals, compound Korean amounts, Korean↔English months, no unit↔unit-less rounding.
  Re-score a recorded report offline: `node scripts/rescore-measurement.ts <report.json> [out.json]`.
- Tests: `test/format.test.ts`, `test/references.test.ts`, new labelled claims; `e2e/analysis.spec.ts` (refs with a
  canned final answer, formatted, current); `e2e/measurement.spec.ts` (three modes, stable).
- **Native comparison** (opt-in, ≈ 4.5 h): `BTA_MEASURE=1 BTA_MEASURE_MODES=current,formatted,refs npm run
  test:prompt-api -- -g measurement` — one report per mode and `measurement-native-compare.json`.
