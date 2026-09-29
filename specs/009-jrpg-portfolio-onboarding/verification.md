# Verification: Feature 009 — JRPG Fullscreen Shell, Portfolio Onboarding and Own Pixel Renderer

## T001 — Baseline (Checkpoint A, 2026-09-29)

| Item | Value |
|---|---|
| Branch | `009-jrpg-portfolio-onboarding` |
| HEAD | `f92e6cc677c7e8dfeb59e5cbc2a29fcfcf3c61d4` (merge of PR #9) |
| Working tree | untracked: `specs/009-jrpg-portfolio-onboarding/` and unrelated tooling (`.claude/`, `.impeccable/`, `.specify/*`, `CLAUDE.md`) |
| `src/main.ts` sha256 | `bd34bf98e1e5d41fb7ee2227edf879e24ed905ebd05b98e0e90ab1a55032d4bf` (= frozen) |
| `runGraph` section (`awk '/^async function runGraph/,0' src/main.ts \| shasum -a 256`) | `922db7527716b5f318776e6aea9fdc4c076c3385b65add03089cc72b89f38ec8` (= frozen) |
| `npm run typecheck` | exit 0 |
| `npm test` | 133 tests: 132 pass, 0 fail, 1 skipped |
| `npm run test:browser` | 50 passed, 1 skipped (4.3 min); SC-014b1 PASS; SC-014b2 raw delta 14.74 pp (KNOWN_UPSTREAM_COST, retired in T006) |
| Art inventory (`node_modules/pixel-agents/dist/assets/{characters,floors,walls,furniture}`, 79 files; sorted `"<sha256>  <path>"` lines, sha256) | `5f758db153f649fdf0ac67e3a8db2eca7052e8ad8aff1845cea491971bfb83ba` |

## T002 — Planning findings carried into implementation

- **P-1** (resolved in spec by analyze C3): US exchanges = Nasdaq, NYSE, NYSE American, NYSE Arca, Cboe BZX, IEX.
- **F009-R1** (LOW, open): product types REIT / US preferred / US ETN come from name rules; misclassification only changes the label.
- **F009-F1** (follow-up candidate): scheduled directory build deferred (research R12).
- **R6**: the upstream pixel font `FSPixelSansUnicode-Regular.ttf` has 0 of 11,172 Hangul syllables → Galmuri11 (T013, approval).
- **F008-L1** stays OPEN; public deployment deferred.

## Checkpoint B — Pixel path retired (T003–T012)

- Removed: `src/view/pixel-adapter.ts`, `src/view/pixel-assets.ts`, `public/pixel-agents/bta-host-shim.js`,
  `scripts/copy-pixel-agents.mjs`; the Pixel toggle, iframe lifecycle, IntersectionObserver and
  `data-iframes`/`data-ignored-requests` from `components/ExecutionView.tsx`; the scoped CORS `headers()` in
  `next.config.ts`. `pixel-agents@1.4.1` stays an exact devDependency (art source only, MD-6).
- `scripts/copy-office-art.mjs`: 79 files → `public/office-art/` (git- and vercel-ignored), pinned inventory
  `5f758db1…bfb83ba`; no-op on Vercel. `predev`, `prebuild` and the Playwright webServer run it.
- T006 retired Pixel-only assertions (non-Pixel assertions unchanged):
  - `e2e/execution-view.spec.ts`: T021 deleted (Pixel default-off/opt-in canvas); T023 canvas label line;
    T024 `enablePixel`/`bootPixel` in acquisition cancel and `data-iframes`/`ds.iframes` lines; T025 fixture
    reduced to view on vs off (webview/decoder/host-failure variants removed); both T026 tests deleted (forged
    messages, off-screen remount); T028 toggle/iframe lines; T029 per-run iframe/message-listener mount
    expectations (now: 0 iframes per run); T031 toggle/note/canvas lines.
  - `e2e/view-overhead.spec.ts`: SC-014b2 (`pixel` mode) deleted.
  - `e2e/prompt-api.spec.ts`: "Pixel Agents explicitly enabled" test and scenario-B branches deleted.
  - `test/execution-view.test.ts`: the two `adapter:` tests; pixel-adapter removed from the import scan.
- T007/T007a: default `storageState` seeds `bta.portfolio` (finished, empty); the native gate seeds it with
  `context.addInitScript`. One Feature 007 assertion adjusted: `e2e/app.spec.ts` "no browser storage" now
  excludes the seeded `bta.portfolio` key (`Object.keys(localStorage)` minus that key must be `[]`).
- T008/T009: `e2e/market-stub.mjs` serves fictional directory sources from `test/fixtures/directory/`.
- T010 regression: `tsc` 0; `npm test` 135 (134 pass, 1 skip; −2 adapter tests, +4 Feature 009 L1);
  `test:browser` 45 passed + 1 expected failure (the storage assertion above), fixed, then green (Checkpoint C run).

## Checkpoint C — Office (T014–T020)

- `src/view/office-scene.ts` (data), `src/view/narration.ts` (pure), `components/Office.tsx` +
  `components/Office.module.css` (scoped CSS; no global style change), rendered by `ExecutionView` from the same
  observer and reducer. T015's scene checks live in `test/narration.test.ts` (one L1 file for the office).
- `e2e/replay-dom.ts` now writes the record fields the view reads (stage via `failure.boundary`/`BLOCKED`,
  error kinds via `modelRequests`), so failed/cancelled traces replay faithfully.
- `e2e/office.spec.ts` (5 tests, PASS): ready ≤ 2 s and 8 characters seated before any run (SC-002, FR-022);
  5 traces → final tags and last two narration lines (SC-007); 375×812 fits (FR-026); art 404 → unavailable,
  text view and run OK (FR-029); hidden page → 0 draws over 2 s (FR-028).
- T019 **SC-008 PASS** (5 alternating reps, office visible, 4 paints/s):
  - run 1: medianOff 0.304 %, medianOn 1.515 %, delta **+1.21 pp**
  - run 2 (full suite): medianOff 0.420 %, medianOn 1.511 %, delta **+1.09 pp**
- T020: `tsc` 0; `npm test` 135 (134 pass, 1 skip); `test:browser` **51 passed, 1 skipped**; `src/main.ts` and
  `runGraph` hashes unchanged; AkariSP / graph changes 0. Office screenshot shown to the maintainer (not committed).
- C14 (analyze): `browser.newPage()` tests passed, but inheritance of `storageState` is only proven once the
  onboarding exists (Checkpoint D).

## T013 — Font (approved by the maintainer 2026-09-29)

| File | Source | Size | sha256 | jsDelivr hash (base64 sha256) |
|---|---|---|---|---|
| `public/fonts/Galmuri11.woff2` | `https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/Galmuri11.woff2` | 504,736 | `f467d1b10e6b88dfa8399c9f93b38c7643e050abfe4fc15800ac0b000f5a57d6` | `9GfRsQ5riN+oOZyfk7OMdkPgUKv+T8FYAKwLAA9aV9Y=` (match) |
| `public/fonts/OFL.txt` | `https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/LICENSE.txt` | 4,360 | `86a3ee9495f942f0243f18c103da9faca27adb88142613edb8bb852e56c892c1` | `hqPulJX5QvAkPxjBA9qfrKJ624gUJhPtuLuFLlbIksE=` (match) |

- Galmuri 2.40.3 by Lee Minseo (quiple), SIL Open Font License 1.1 (redistribution with the licence allowed).
- Hangul coverage from the cmap table (WOFF2 table directory + brotli decoded; scratch script): **11,172 / 11,172**
  syllables, 20,966 code points. Control with the same script: upstream `FSPixelSansUnicode-Regular.ttf` 0 / 11,172.
- A first canvas-rendering check was discarded: its control (the upstream font) also reported no missing glyphs.

## Checkpoint D — Shell, onboarding, portfolio (T021–T034)

- `components/Shell.tsx` + `Shell.module.css`: fullscreen JRPG shell; server-rendered slots (HUD, stage,
  결과, 상태) are always mounted — only wrappers are hidden — so every id `src/main.ts` uses exists from the
  first render. Windows are native `<dialog>` (`showModal`: focus trap, Escape, focus return).
  `app/page.tsx` renders the existing markup through the slots (no id renamed); `ExecutionView` lays the
  office beside a "party" panel (the Feature 008 text) via `ExecutionView.module.css`.
- `src/portfolio.ts` + `test/portfolio.test.ts` (5 L1). **Bug found by T029** and fixed: the default storage
  was resolved outside the `try` (a default parameter), so a throwing `localStorage` getter crashed the first
  read; now resolved inside each guard, with an L1 case for it.
- `components/Portfolio.tsx`: onboarding (인사 → 보유 자산 → 확인), holding form, 포트폴리오 window (edit,
  remove, 초기화 with confirmation, "현재 목록에 없음"), read-only and session-only modes.
- T023 selector/visibility adjustments (no behaviour assertion changed):
  - `e2e/view-overhead.spec.ts`: the `?viz=off` sample scrolls `#status` (HUD) instead of `#result`, which now
    sits in the closed 결과 window.
  - `e2e/app.spec.ts`: the storage assertion excludes the seeded portfolio key (Checkpoint B).
- `e2e/onboarding.spec.ts` (7, PASS): onboarding hides the HUD; skip → office + record; reload mid-onboarding →
  nothing stored; fixed instruments with validation messages and duplicate → edit; reload and a new context
  from the same storage keep holdings (SC-004, analyze C8); storage throwing → session-only notice; unreadable
  record → reset / read-only; HUD run with 상태 opened mid-run (C13) and 결과 with both advice statements;
  `?viz=off`.
- C14 confirmed: tests using `browser.newPage()` inherit the seeded `storageState` (they pass with the shell).
- T025 dev smoke: **not run** — `next dev` allows one dev server per directory and the maintainer's own dev
  server (port 3000) was running; it was not stopped. Pending.

## Checkpoint E — Symbol directory (T035–T044)

- `src/directory/parse.ts`, `src/directory/server.ts`, `src/directory/client.ts`, `app/api/directory/route.ts`
  (`nodejs`, `force-dynamic`, `Cache-Control: no-store`, 200 / 503 `{ kind: 'unavailable', sources }`).
- Korean refresh: walk back ≤ 10 Seoul days with 1-row probes to the latest published `basDt`, then all pages
  (1,000 rows) of getItemInfo, getETFPriceInfo, getETNPriceInfo; parser keeps the latest `basDt` rows only.
- Parser fix during L1: the Nasdaq footer is `mmddyyyyhh:mm` (documented example `1217200717:03`).
- `test/directory.test.ts` (7, PASS): parsers; **100 concurrent calls → KR 4 requests (1 probe + 3 operations),
  US 2**; same day → 0 more; next Seoul day with KR failing → KR `stale` with previous entries, US refreshed
  once, no same-day retry; first-ever failure → `unavailable`; no key → `credential-missing` and 0 KR requests;
  the key never appears in responses or warnings; import boundary (only the route imports the server module
  at runtime; the key name only in `src/directory/server.ts`); search ≤ 100 ms per call over 25,000 rows.
- `e2e/directory.spec.ts` (4, PASS): one `/api/directory` download per browser per day, 0 requests while typing,
  as-of and attribution shown, no further source request on the second visit; aged copy + failed refresh keeps
  the old copy; no copy + failure → "목록 없음" and BTC still addable; a KR stock by Korean name and a US ETF by
  ticker with type and market; **T033 privacy sentinel: 0 occurrences** of `777777.77`, `777777`, `424242.42`,
  `424242` in every request URL, header and body, console line, evidence and replay (fixture and live runs).
- F009-R1 visible in the fixtures: a US "Realty Trust" is typed `stock` (no REIT flag in the source).

## Checkpoint F — Font and accessibility (T013, T045–T048)

- Font: see T013 above. `e2e/a11y.spec.ts` (2, PASS): keyboard only — onboarding with BTC and a searched Korean
  stock, Run, Cancel, 결과 open/Escape with focus returned (SC-010); reduced motion — 0 redraws over 2 s in an
  unchanged state, 0 running animations, one draw per state change, canvas `aria-hidden`, text for every role.

## Checkpoint G — Regression (T049–T051)

| Check | Result |
|---|---|
| `tsc --noEmit` | 0 |
| `npm run build` | 0 — routes `/` (static), `/api/directory` (dynamic), `/api/market` (dynamic), `/harness` |
| `npm test` | 147 tests: 146 pass, 1 skipped |
| `npm run test:browser` | **64 passed, 1 skipped** (real Yahoo L4) |
| SC-008 (final run) | medianOff/On delta **+0.85 pp** (earlier runs +1.21, +1.09, +1.25) |
| Dev smoke (`BTA_DEV_SMOKE=1`) | **not run** (see T025) |
| Native gate (`npm run test:prompt-api`) | 2 passed, 1 skipped (real Yahoo L5): harness S1–S5/S7 PASS; eight-role fixture graph in installed Chrome 154, `MODEL_AVAILABLE`, outcome success, 8 nodes, 8 logical / 0 fallback, settled before shutdown `{ready,0,0}` → `{closed,0,0}`, 0 iframes, office ready and all eight office tags `completed`. Revision `f92e6cc…+dirty` (uncommitted tree) |
| `src/main.ts` / `runGraph` sha256 | unchanged (`bd34bf98…`, `922db752…`) |
| AkariSP / graph topology / `src/graph`, `src/integration` | 0 changes |
| New npm dependencies | 0 (`pixel-agents@1.4.1` kept, art only) |
| T051 licences | Galmuri11 OFL 1.1 recorded (T013); upstream art ignored (`.gitignore:10 public/office-art/`), untracked public files = `public/fonts/*` only |
| T051 secrets | `.next/static`: 0 files with the fake key, `serviceKey`, `BTA_DATA_GO_KR*`, data.go.kr or nasdaqtrader hosts; the key name appears in `src/directory/server.ts` only (plus the fake value in `playwright.config.ts` and `test/directory.test.ts`) |

## Findings during implementation

- **F009-001 (process, OPEN — reported to the maintainer)**: an unapproved real-source request. To take a
  screenshot, a scratch Playwright script opened the maintainer's own `next dev` server (port 3000), which has
  no stub base URLs; the shell loaded `/api/directory`, and that server refreshed the US source from the real
  Nasdaq Trader Symbol Directory: **2 requests** (`nasdaqlisted.txt`, `otherlisted.txt`), status `ok`, as-of
  2026-09-29, 13,246 entries. Korean source: `credential-missing`, **0 requests** (no key). No raw body was
  saved or committed; the data lives only in that server's memory; by design no further request that Seoul
  day. Cause: FR-019 requires approval before a real source is contacted, but a server without the stub
  environment contacts the keyless US source on the first page open. Smallest correction: decided by the
  maintainer with T052 (approve normal operation, or gate real sources behind an explicit opt-in env).
- **F009-R2 (LOW, from the one real response above)**: `otherlisted.txt` contains Exchange code `F` (5 rows),
  not in the documented code list (A, N, P, Z, V); the parser passes unknown codes through unchanged, so those
  rows show market "F".

## T052 — Real sources (maintainer decision 2026-09-29: option A, normal operation approved)

- The maintainer approved normal operation: the app refreshes each directory source at most once per Seoul day
  from the real sources. This also settles F009-001 (the earlier US request stays recorded as having happened
  before approval).
- Safety fix before any key exists: `.gitignore` and `.vercelignore` did not exclude local env files; both now
  contain `.env*.local` (`git check-ignore` → `.gitignore:12 .env*.local`).
- **US (Nasdaq Trader, keyless)**: from the refresh already made on 2026-09-29 (F009-001; read back from that
  server's cache, 0 new requests): status `ok`, as-of 2026-09-29, 13,246 entries; by type stock 7,039, ETF 5,741,
  preferred 451, ETN 15; by market Nasdaq 5,628, NYSE 2,917, NYSE Arca 2,742, Cboe BZX 1,646, NYSE American 308,
  `F` 5 (F009-R2). Upstream requests: 2.
- **KR (data.go.kr, keyed)**: pending the maintainer's key in `.env.local`.
- The maintainer asked (2026-09-29) to stop their dev server and to enter the key later: the `npm run dev` tree on
  port 3000 (PIDs 73853/73883/78604) was stopped with SIGTERM at their request. **KR real-source check deferred**
  until the key exists; T052 stays open. Completion does not depend on it (FR-020).

## T025 / T049 — Dev smoke

- `BTA_DEV_SMOKE=1 HARNESS_PORT=5176 npx playwright test --project=chromium-dev`: **2 passed** — Feature 006
  Strict Mode smoke (one click = one runtime, one graph run) and Feature 008 T028 (mount, cleanup, mount; 1 graph
  run, 8 requests, ≤ 1 observer) with the shell and the office. The dev server used the stub environment.

## T054 — Final state

| SC | Evidence | Class | Result |
|---|---|---|---|
| SC-001 onboarding < 3 min | maintainer check with quickstart (analyze C7) | MANUAL | pending the maintainer |
| SC-002 office ≤ 2 s | `e2e/office.spec.ts` | BROWSER_AUTOMATED | PASS |
| SC-003 search ≤ 100 ms, 0 requests while typing | `test/directory.test.ts`, `e2e/directory.spec.ts` | L1 + BROWSER_AUTOMATED | PASS |
| SC-004 holdings survive reload / new context | `e2e/onboarding.spec.ts`, `e2e/directory.spec.ts` | BROWSER_AUTOMATED | PASS |
| SC-005 0 sentinel leaks | `e2e/directory.spec.ts` T033 | BROWSER_AUTOMATED | PASS |
| SC-006 ≤ 1 source refresh / day / instance; 1 browser download / day | `test/directory.test.ts` (100 concurrent), `e2e/directory.spec.ts` | L1 + BROWSER_AUTOMATED | PASS |
| SC-007 every trace narrated, final states | `test/narration.test.ts` (13 traces), `e2e/office.spec.ts` (5 traces) | L1 + BROWSER_AUTOMATED | PASS |
| SC-008 office ≤ 2 pp vs `?viz=off` | `e2e/view-overhead.spec.ts` | BROWSER_AUTOMATED | PASS (+0.85 … +1.25 pp) |
| SC-009 existing suites, native 8/8 | full `test:browser`, dev smoke, native gate | BROWSER_AUTOMATED + REAL_BROWSER_PROMPT_API | PASS |
| SC-010 keyboard, reduced motion | `e2e/a11y.spec.ts` | BROWSER_AUTOMATED | PASS |
| SC-011 hashes, AkariSP 0, graph 0, deps 0 | T049 | STATIC_CODE_ANALYSIS | PASS |
| SC-012 licences; public deployment deferred | T013, T051 | STATIC_CODE_ANALYSIS | PASS |

- Findings: P-1 resolved; F009-001 settled by the maintainer's decision A (recorded); F009-R1 (LOW) open;
  F009-R2 (LOW) open; F009-F1 follow-up candidate; **F008-L1 OPEN**.
- State: **IMPLEMENTATION_COMPLETE** for local/research use. `REAL_SOURCES_VALIDATED` = US only (from the
  pre-approval refresh); KR pending the key. **PUBLIC_DEPLOYMENT_DEFERRED** (F008-L1: temporary upstream art).
