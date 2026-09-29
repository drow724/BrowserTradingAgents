---

description: "Task list for Feature 009 — JRPG Fullscreen Shell, Portfolio Onboarding and Own Pixel Renderer"
---

# Tasks: Feature 009 — JRPG Fullscreen Shell, Portfolio Onboarding and Own Pixel Renderer

**Input**: `specs/009-jrpg-portfolio-onboarding/`: spec.md (US1–US7, FR-001…FR-037, SC-001…SC-012, MD-1…MD-6,
clarifications), plan.md (D1–D8, checkpoints A–I), research.md (R1–R12), data-model.md,
contracts/directory-api.md, contracts/portfolio-storage.md, contracts/office-view.md, quickstart.md.

**Baseline**: branch `009-jrpg-portfolio-onboarding` @ `f92e6cc` (merge of PR #9). Untracked: this feature
directory and unrelated tooling (`.claude/`, `.specify/*`, `CLAUDE.md`, `.impeccable/`) — never staged.

**Frozen decisions** (not reopened here):

| Item | Decision |
|---|---|
| Renderer | own canvas renderer (MD-3); 320×192 world, CSS-scaled pixelated, 4 Hz, DOM name tags (R8) |
| Default | office ON by default (MD-4); `?viz=off` removes office and Feature 008 view |
| Pixel Agents | iframe path retired (MD-5); `pixel-agents@1.4.1` kept as exact devDependency for art only (MD-6); art copied to ignored `public/office-art/`, never committed, not copied on Vercel |
| Portfolio | `localStorage["bta.portfolio"]`, version 1 (R5, contracts/portfolio-storage.md) |
| Directory | `GET /api/directory`; KR = data.go.kr (key `BTA_DATA_GO_KR_KEY`, server-only), US = Nasdaq Trader files; ≤ 1 refresh per source per Asia/Seoul day, single flight; browser Cache Storage copy (R1, R2, R4) |
| Language | new shell text Korean; role names, status values, evidence English (FR-001a) |
| Font | Galmuri11 woff2 + OFL.txt committed in `public/fonts/` (R6) — download needs approval |
| Protected | `src/main.ts` sha256 `bd34bf98e1e5d41fb7ee2227edf879e24ed905ebd05b98e0e90ab1a55032d4bf`; `runGraph` section `922db7527716b5f318776e6aea9fdc4c076c3385b65add03089cc72b89f38ec8`; AkariSP changes 0; graph topology 0 |
| Real sources | contacted only in T052 after explicit approval; not required for IMPLEMENTATION_COMPLETE |
| Not added | storage layer, provider registry, renderer engine, walking/pathfinding, scheduler (F009-F1), new npm dependency |

**Tests**: required (spec SC-001…SC-012). `npm test` grows by the Feature 009 L1 tests; the browser suite
loses only the retired Pixel tests (T006) and gains Feature 009 tests. Counts are recorded, not frozen.

**Approval gates**: T013 (font download), T052 (real sources), every commit (only when the maintainer says so).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different file, no dependency on an incomplete task. **[USn]**: spec user story.

---

## Phase 1: Setup (Checkpoint A — baseline)

- [X] T001 Record baseline in `specs/009-jrpg-portfolio-onboarding/verification.md` (new): branch, HEAD `f92e6cc`, `git status`, `src/main.ts` and `runGraph` sha256 (must equal the Frozen values), `npm run typecheck`, `npm run build`, `npm test` counts, `npm run test:browser` counts, upstream art inventory of `node_modules/pixel-agents/dist/assets/{characters,floors,walls,furniture}`
- [X] T002 Record in verification.md the planning findings: P-1 (FR-016 exchange list narrower than the ETF intent; plan includes Nasdaq, NYSE, NYSE American, NYSE Arca, Cboe BZX, IEX), F009-R1 (name-rule product types, LOW), F009-F1 (scheduler deferred), R6 (upstream font has 0 Hangul syllables)

---

## Phase 2: Foundational (Checkpoint B — retire the Pixel path, art source, test seeding, font)

**⚠️ Blocks all user stories.**

- [X] T003 Delete `src/view/pixel-adapter.ts`, `src/view/pixel-assets.ts`, `public/pixel-agents/bta-host-shim.js`; remove the Pixel toggle, iframe lifecycle, `loadPixel`, message handling, IntersectionObserver and `data-iframes`/`data-ignored-requests` counters from `components/ExecutionView.tsx`, keeping the observer, reducer wiring, text panel, `data-mounts`/`data-observers`/`data-anomalies` and `?viz=off` (FR-031)
- [X] T004 [P] Remove the scoped `/pixel-agents/:path*` CORS `headers()` block from `next.config.ts` (FR-031)
- [X] T005 Replace `scripts/copy-pixel-agents.mjs` with `scripts/copy-office-art.mjs`: copy `node_modules/pixel-agents/dist/assets/{characters,floors,walls,furniture}` to `public/office-art/`, verify a pinned sha256 inventory of those files (value from T001), remove stale output, no-op when `VERCEL` is set; update `package.json` `predev`/`prebuild`, the `playwright.config.ts` webServer command, `.gitignore` and `.vercelignore` (`public/office-art/`; drop the `public/pixel-agents/*` lines) (FR-031a)
- [X] T006 Retire Pixel-only tests: in `e2e/execution-view.spec.ts` remove T021 canvas assertions, T025 webview/decoder/host-failure variants, T026 forged-message and off-screen tests, iframe counts in T028/T029/T031; in `e2e/view-overhead.spec.ts` remove the SC-014b2 `pixel` mode; in `e2e/prompt-api.spec.ts` remove the "Pixel Agents explicitly enabled" test; in `test/execution-view.test.ts` remove the two `adapter:` tests and the pixel files from the import scan. Keep every non-Pixel assertion unchanged; list each removed assertion in verification.md
- [X] T007 Seed a finished empty portfolio for all Playwright projects: `use.storageState` in `playwright.config.ts` = `{ cookies: [], origins: [{ origin: \`http://localhost:${port}\`, localStorage: [{ name: 'bta.portfolio', value: '{"version":1,"onboardedAt":"2026-09-29T00:00:00.000Z","holdings":[]}' }] }] }` (R11)
- [X] T007a Seed the same finished empty portfolio in the native gate: in `e2e/prompt-api.spec.ts` `launchNativeChrome`, call `context.addInitScript` that sets `localStorage['bta.portfolio']` to the T007 value before any page script (its persistent context does not get `use.storageState`)
- [X] T008 Extend `e2e/market-stub.mjs` with directory routes: `GET /1160100/service/GetKrxListedInfoService/getItemInfo`, `…/GetSecuritiesProductInfoService/getETFPriceInfo`, `…/getETNPriceInfo` (JSON bodies from `test/fixtures/directory/kr-*.json`, paged by `pageNo`/`numOfRows`, record `serviceKey` presence only) and `GET /dynamic/SymDir/nasdaqlisted.txt`, `/otherlisted.txt` (from `test/fixtures/directory/*.txt`); per-route counters in `/__stats`; `/__scenario` gains `directory: 'ok' | 'fail-kr' | 'fail-us' | 'hang'`; set `BTA_DATA_GO_KR_BASE_URL=http://127.0.0.1:${stubPort}/1160100/service`, `BTA_NASDAQ_TRADER_BASE_URL=http://127.0.0.1:${stubPort}/dynamic/SymDir` and a fake `BTA_DATA_GO_KR_KEY=test-key-not-real` in the app webServer env in `playwright.config.ts`
- [X] T009 [P] Create fake source files in `test/fixtures/directory/`: `kr-items.json` (≥ 12 fictional rows across KOSPI/KOSDAQ/KONEX incl. a preferred `…우` and a `…리츠`; fictional names only, one of them "삼성테스트전자"), `kr-etf.json`, `kr-etn.json`, `nasdaqlisted.txt`, `otherlisted.txt` (fictional tickers incl. one ETF per exchange P/Z, one test issue, footer `File Creation Time`)
- [X] T010 Checkpoint B regression: `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser`; hashes unchanged; `public/pixel-agents/` absent after a clean build; record counts and removed-test list in verification.md
- [X] T011 [P] Add `src/view/office-scene.ts` (data only): `WORLD = { w: 320, h: 192 }`, eight desk positions in ROLES order (two rows of four), decoration list, `SheetLayout = { src, frameW, frameH, row, stand, work }` for characters (`frameW 16, frameH 32, row 0, stand 1, work [3,4]`), desk, PC on/off frames; all paths under `/office-art/` (FR-027)
- [X] T012 [P] Add `src/view/narration.ts`: `narrate(prev: ViewState, next: ViewState): string[]` with exactly the lines of data-model.md "Narration" table, ROLES order, English role names; no per-role queued/inferring wording (FR-024)
- [X] T013 **APPROVAL REQUIRED** Download Galmuri11 (woff2) and its OFL text from the quiple/galmuri release (state file name, source URL and size when asking); run the R6 cmap scan and require 11,172/11,172 Hangul syllables (else stop with a finding); place in `public/fonts/Galmuri11.woff2` and `public/fonts/OFL.txt`; record source, version, sha256 and licence in verification.md (FR-001, FR-033)

**Checkpoint**: Pixel path gone, tests green, art copied locally, scene/narration modules exist.

---

## Phase 3: User Story 3 — Returning visit lands in the office (P1) 🎯 MVP

**Goal**: fullscreen office drawn from ViewState with Korean narration.
**Independent test**: seeded portfolio → office; replayed traces show correct final states and ordered narration.

- [X] T014 [P] [US3] L1 tests in `test/narration.test.ts`: for all 13 committed traces, replay with `reduce` and assert every run/role transition yields exactly one line in order, no line contains "queued"/"inferring"/"대기열", and terminal lines match data-model.md (SC-007)
- [X] T015 [P] [US3] L1 test in `test/office-scene.test.ts`: 8 desks, unique positions inside `WORLD`, every sheet path under `/office-art/`, character sheets assigned `i % 6`, hue shift 180 for i ≥ 6
- [X] T016 [US3] Implement `components/Office.tsx` per contracts/office-view.md: canvas 320×192, largest-fit CSS scaling (integer when possible), `image-rendering: pixelated`, 4 Hz `setInterval` skipped while `document.hidden`, reduced motion → one draw per ViewState change; all eight characters always drawn (idle = standing, `not-run` = 40 % opacity); DOM name tags `{glyph} {role}` with state class; dialog box (last two `narrate` lines, `aria-live="polite"`); `data-office="ready|unavailable"`; asset load failure → `오피스를 표시할 수 없습니다`; never touches the status surface (FR-021…FR-030)
- [X] T017 [US3] Render `<Office view={view} />` from `components/ExecutionView.tsx` (one observer; props only); Galmuri11 `@font-face` in the office/shell stylesheet (`app/globals.css` or component CSS)
- [X] T018 [US3] e2e `e2e/office.spec.ts`: seeded state → `data-office="ready"` within 2 s of interactive (SC-002); replay `success`, `role-failure-bull`, `graph-cancel-analysts`, `ambiguous-sibling-error` via `e2e/replay-dom.ts` and assert each role tag's state class and the dialog's last line (SC-007); stand-in run: 8/8, evidence equal to `?viz=off` for the same run (FR-013); resize to 375×812 keeps tags inside the viewport (FR-026); before any run all eight characters are drawn (FR-022); `/office-art/**` requests aborted → `data-office="unavailable"`, the notice shown and a stand-in run still succeeds (FR-029); page hidden (`document.visibilityState` emulated via a new background tab) → 0 canvas draws over 2 s (FR-028)
- [X] T019 [US3] Update `e2e/view-overhead.spec.ts` SC-008: `default` (office visible and animating, ≥ 3 canvas draws/s observed) vs `?viz=off`, 5 alternating reps, median delta ≤ 2 pp; record raw numbers in verification.md
- [X] T020 [US3] Checkpoint C: typecheck, build, `npm test`, `test:browser`; screenshot of the office for the maintainer (not committed)

---

## Phase 4: User Story 4 — Existing controls and outputs stay available (P1)

**Goal**: the JRPG shell hosts every status-surface element; runs behave as before.
**Independent test**: existing app/execution-view suites pass unchanged against the shell.

- [X] T021 [US4] Before editing, read the relevant Next.js 16 guides in `node_modules/next/dist/docs/` (client components and layouts) per CLAUDE.md. Implement `components/Shell.tsx` (client): fullscreen layout; HUD with `#availability`, `#mode`, `#status`, `#run`, `#cancel`, runtime line and buttons 포트폴리오 / 결과 / 상태; 결과 `<dialog>` containing `#result`, `#market`, `#evidence`, `#replay` and the "투자 조언이 아닙니다" statement plus the existing English statement; 상태 `<dialog>` containing the eight-row table and the Feature 008 text panel; children passed from the server page so every element id exists from the first render (D1, R10, FR-004, FR-036)
- [X] T022 [US4] Restructure `app/page.tsx` to render the existing markup through `<Shell>` slots without renaming any id and without touching `src/main.ts`; verify both protected hashes unchanged (FR-035)
- [X] T023 [US4] Adjust only selector/visibility steps in `e2e/app.spec.ts` and `e2e/execution-view.spec.ts` that need a dialog opened (e.g. open 결과 before `toBeVisible` on `#evidence`); no assertion about behaviour changes; list each adjusted line in verification.md
- [X] T024 [US4] e2e in `e2e/office.spec.ts`: Run → Cancel from the HUD gives the same outcome/evidence as before; 결과 dialog shows decision, evidence and the advice statement; `?viz=off` → no office, run works (US4 AS1–AS3)
- [X] T025 [US4] Checkpoint D1: full `test:browser` and `@dev` smoke (`BTA_DEV_SMOKE=1`) green

---

## Phase 5: User Story 1 — First visit opens the onboarding (P1)

**Goal**: no stored portfolio → Korean onboarding; finish or skip → office.
**Independent test**: empty storage → onboarding; finish → stored record → office; reload mid-way → onboarding again.

- [X] T026 [P] [US1] Implement `src/portfolio.ts`: types from data-model.md; `load()` → `{ state: 'first' | 'ok' | 'unreadable' | 'unavailable', portfolio? }` with try/catch around every `localStorage` access; `save(portfolio)` whole-document write; `reset()`; `validateHolding(h)` enforcing "quantity > 0, finite, ≤ 1e12", "averagePrice > 0, finite, ≤ 1e12", decimals BTC ≤ 8 / KRX-GOLD ≤ 2 / KR 0 / US ≤ 6, currency KRW for KRX-GOLD and KR, USD for US, KRW|USD for BTC; identity `BTC` | `KRX-GOLD` | `assetClass+ticker` (FR-008, FR-010)
- [X] T027 [P] [US1] L1 tests `test/portfolio.test.ts` for T026: every rule above with boundary values, unreadable/`version ≠ 1`, storage throwing, duplicate identity
- [X] T028 [US1] Onboarding in `components/Portfolio.tsx` + `components/Shell.tsx`: synchronous first-visit decision (contracts/portfolio-storage.md); Korean JRPG screens (인사 → 보유 자산 입력 → 확인); 건너뛰기 stores `holdings: []`; nothing stored until finish/skip (FR-002, FR-003); session-only notice when storage is unavailable; `unreadable` state → notice with 초기화 (reset) and 읽기 전용으로 유지 (office opens, portfolio window read-only)
- [X] T029 [US1] e2e `e2e/onboarding.spec.ts` with `test.use({ storageState: { cookies: [], origins: [] } })`: onboarding shown and HUD not reachable; skip → office and record stored; reload mid-onboarding → onboarding again with nothing stored (US1 AS1–AS4); seeded `bta.portfolio = "{broken"` → unreadable notice with both choices; `localStorage` made to throw via `addInitScript` → onboarding with the session-only notice and no request carrying holdings

---

## Phase 6: User Story 2 — Enter holdings (P1)

**Goal**: add/edit/remove holdings of four asset classes.
**Independent test**: with the controlled directory, add one of each class, reload, same values.

- [X] T030 [US2] Holding form in `components/Portfolio.tsx`: asset class choice (비트코인, KRX 금현물, 국내 주식, 미국 주식); BTC currency selector KRW/USD; search box for KR/US using `src/directory/client.ts` (T041) with results showing name, ticker, market and product type; inline Korean validation messages from `validateHolding`; duplicate → "이미 있는 종목입니다" + edit (FR-005…FR-010)
- [X] T031 [US2] 포트폴리오 dialog in `components/Shell.tsx` reusing the form: list, edit, remove, 초기화 with confirmation → `reset()` → onboarding on next open (FR-009, FR-011); holdings not in the current directory marked "현재 목록에 없음"
- [X] T032 [US2] e2e in `e2e/onboarding.spec.ts`: add BTC (USD), KRX gold, one KR stock found by "삼성테스트", one US ETF found by ticker; invalid values rejected with reasons; reload → identical holdings (SC-004)

---

## Phase 7: User Story 6 — Holdings stay private (P2)

- [X] T033 [US6] e2e `e2e/privacy.spec.ts`: holdings with sentinel quantity `777777.77` and price `424242.42`; record every request URL, header and body from page load through onboarding, editing, directory load and one stand-in run (fixture and `?data=live` with the stub); assert 0 occurrences in requests, `#evidence`, `#replay` and console output (SC-005, FR-012)
- [X] T034 [US6] Static check in `test/portfolio.test.ts`: no module under `app/api/`, `src/directory/`, `src/main.ts`, `src/graph/` imports `src/portfolio.ts`

---

## Phase 8: User Story 5 — Symbol directory (P2)

**Goal**: server builds the directory at most once per Seoul day; browser caches and searches locally.
**Independent test**: with the stub, two opens the same day → 1 source refresh, 1 browser download; typing → 0 requests.

- [X] T035 [P] [US5] Implement `src/directory/parse.ts` (pure): `parseKr(items, etfs, etns)` and `parseUs(nasdaqlisted, otherlisted)` → `Entry[]` = `[assetClass, productType, name, ticker, market]`; drop test issues and footer; US exchange codes → `Nasdaq | NYSE | NYSE American | NYSE Arca | Cboe BZX | IEX`; product type rules from R1/R2 (ETF column / operation; `우`, `우B`, `우C` → preferred; `리츠` → reit; US "ETN"/"Exchange Traded Note" → etn, "Preferred" → preferred); source as-of from `basDt` / `File Creation Time`
- [X] T036 [P] [US5] L1 tests `test/directory.test.ts` for T035 on `test/fixtures/directory/*`: counts, types, markets, test issues excluded, as-of parsing, malformed input → error (not partial)
- [X] T037 [US5] Implement `src/directory/server.ts` taking a clock parameter (`now = () => new Date()`, contracts/directory-api.md): per-source cache `{ day, lastGood, inflight }`; Seoul day; single-flight refresh; 20 s timeout via `AbortSignal.timeout`; `cache: 'no-store'`; KR paged fetch of the three operations with `beginBasDt` = today − 10 days, keep latest `basDt`; key from `process.env.BTA_DATA_GO_KR_KEY` only, never logged; missing key → `credential-missing` with 0 KR requests; failures → `stale`/`unavailable`, no retry until next day (contracts/directory-api.md)
- [X] T038 [US5] Read the Route Handler guide in `node_modules/next/dist/docs/` first (CLAUDE.md). Add `app/api/directory/route.ts`: `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, ignores query; 200 `Directory` / 503 `{ kind: 'unavailable', sources }`; `Cache-Control: no-store`; no raw source text in any response
- [X] T039 [US5] Node integration test `test/directory-server.test.ts` using a local `node:http` stub (same fixtures): 100 concurrent calls → 1 refresh per source (SC-006); fail-kr → KR `stale` with previous entries; first-ever failure → `unavailable`; missing key → 0 KR requests; next Seoul day (injected clock) → exactly one more refresh; response never contains the key
- [X] T040 [US5] Static check in `test/directory.test.ts`: no `app/`/`components/` client module imports `src/directory/server.ts`; the key name appears only in `src/directory/server.ts` and docs
- [X] T041 [US5] Implement `src/directory/client.ts`: `loadDirectory()` using Cache Storage `bta-directory` (use cached response if its `fetchedDay` equals today in Asia/Seoul, else fetch once, fully parse, then `put`; on failure keep the old copy; no `caches` (insecure context) → in-memory only); `search(entries, query, limit = 20)` — ticker prefix first, then name substring, case-insensitive, trimmed
- [X] T042 [P] [US5] L1 tests for `search` in `test/directory.test.ts`: ordering, Korean substring, empty query, limit; timing over a synthetic 25,000-row array ≤ 100 ms per call (SC-003)
- [X] T043 [US5] Show directory as-of dates, per-source status (`목록 없음`, `인증키 없음`, `{date} 기준 (갱신 실패)`) and attributions (공공데이터포털 금융위원회 / Nasdaq Trader) in the search UI of `components/Portfolio.tsx` (FR-018, US5 AS4–AS5)
- [X] T044 [US5] e2e `e2e/directory.spec.ts`: two page loads the same day → stub counts 1 per source route set and 1 `/api/directory` request; typing 10 characters → 0 requests; `fail-kr` on a fresh server day shows the KR status and BTC/KRX gold remain addable; interrupted download (`hang`, then abort) keeps the previous copy (US5 AS1–AS5)

---

## Phase 9: User Story 7 — Accessible and calm (P2)

- [X] T045 [US7] Keyboard support in `components/Shell.tsx` and `components/Portfolio.tsx`: logical tab order, visible focus ring in the JRPG style, `<dialog>` focus return, Escape closes windows
- [X] T046 [US7] Canvas `aria-hidden="true"`; name tags and the 상태 dialog provide the text; reduced-motion CSS disables blink/animation in the shell
- [X] T047 [US7] e2e `e2e/a11y.spec.ts`: keyboard-only onboarding (one holding), Run, Cancel, open/close 결과 (SC-010); `reducedMotion: 'reduce'` → no canvas redraw between two identical view states over 2 s and no CSS animation running; role states readable via `#view-roles` text
- [X] T048 [US7] Keyboard-only variant of T032 (functional; the 3-minute SC-001 measure is the maintainer's quickstart check)

---

## Phase 10: Polish & Cross-Cutting (Checkpoints G, H, I)

- [X] T049 Full regression: `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser`, `BTA_DEV_SMOKE=1` dev smoke; hashes unchanged; `git diff --stat` shows no change under `src/graph/`, `src/integration/`, `src/main.ts`, AkariSP (SC-009, SC-011)
- [X] T050 Native gate: `npm run test:prompt-api` (installed Chrome, fixture) — 8/8, 8 logical, 0 fallback, settled before shutdown, office shown (SC-009)
- [X] T051 Licence and secret audit: every committed asset/font has a recorded licence (SC-012); `git ls-files public/` contains no upstream art; grep of `.next/static` and the repo for `BTA_DATA_GO_KR_KEY` values/`serviceKey=` finds only code references; record in verification.md
- [ ] T052 **APPROVAL REQUIRED** Real-source check (checkpoint H): with the maintainer's key in `.env.local` (entered by the maintainer), start the app once and call `/api/directory` once; record per-source status, as-of, entry counts by type/market and upstream request counts (expected: KR ≤ 3 operations × pages, US 2); commit no raw bodies; any non-`ok` status → STOP for maintainer decision (no workaround)
- [X] T053 [P] Docs: `docs/roadmap.md` (009 = this Feature; benchmark moved after the portfolio expansion; MD-4 D5 re-decided; MD-5 Pixel view retired; MD-6 temporary art; F009-F1), `docs/testing.md` (new suites, storageState seeding, directory stub, `BTA_DATA_GO_KR_KEY`)
- [X] T054 Final verification record in `specs/009-jrpg-portfolio-onboarding/verification.md`: SC-001…SC-012 table with evidence class, findings status (P-1, F009-R1, F009-F1, F008-L1 still OPEN), completion state (`IMPLEMENTATION_COMPLETE`; `REAL_SOURCES_VALIDATED` only if T052 passed; `PUBLIC_DEPLOYMENT_DEFERRED`)
- [X] T055 **APPROVAL REQUIRED** Commit (scope: this feature dir, changed source/tests/docs, `public/fonts/*`; never `.local/`, `.next/`, `public/office-art/`, `test-results/`, tooling) — only when the maintainer says so

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (T013 may wait for approval without blocking T014–T020; the office falls back to the system font until it lands).
- US3 (office) first — it needs only Phase 2. US4 (shell) depends on US3's `Office` placement. US1 and US2 depend on US4's `Shell`. US2's search depends on T041 (US5) — implement T035–T041 before T030, or stub search with fixed instruments first and wire search when T041 lands.
- US6 after US2 (needs holdings). US7 after US1/US2. Phase 10 last.

```text
A → B → US3 → US4 → US1 → (US5 T035–T041) → US2 → US6 → US5 rest → US7 → G/H/I
```

## Parallel Opportunities

- Phase 2: T004, T009, T011, T012 alongside T003/T005.
- US3: T014, T015 in parallel before T016.
- US1: T026 and T027 together.
- US5: T035/T036 and T042 in parallel; T039 after T037.

## Implementation Strategy

1. **MVP (visible first)**: A → B → US3. Stop and show the office to the maintainer.
2. US4 + US1 + US2: the product shape (shell, onboarding, portfolio).
3. US5, US6, US7: directory, privacy proof, accessibility.
4. G regression → optional H (approval) → I docs → commit on approval.
