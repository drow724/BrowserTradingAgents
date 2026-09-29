---

description: "Task list for Feature 006 — Next.js Application Shell Migration"
---

# Tasks: Feature 006 — Next.js Application Shell Migration

**Input**: `specs/006-nextjs-application-shell/` — spec.md, plan.md, research.md (R0–R13),
contracts/shell-boundary.md, contracts/evidence-equivalence.md, quickstart.md

**Baseline** (verified at task generation): branch `006-nextjs-application-shell` @ `c64021e`
(= `origin/main`). Untracked: this feature directory and unrelated Spec Kit/Claude tooling (leave
untouched).

**Frozen decisions** (plan; not reopened here):

| Item | Decision |
|---|---|
| Versions | `next@16.3.6`, `react@19.3.0`, `react-dom@19.3.0`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`; Turbopack |
| Client entry | one `'use client'` `Boot` whose effect dynamic-imports the unchanged `src/main.ts` / `harness/main.ts` |
| Language features | top-level `await` and `.ts` imports kept; `@langchain/langgraph/web` kept; default Strict Mode |
| Revision | `compiler.define` with **raw** strings (no `JSON.stringify`) |
| Not added | no route handler, no health probe, no Vercel gate; the Feature 005 live path stays browser-side |
| Build output | the default `.next` only (dev output in `.next/dev`); no custom or per-port `distDir` (rejected: Next rewrites the tracked `tsconfig.json`, research R9); one Playwright session per checkout |
| Client boundary vs timing | `'use client'` makes `Boot` a client component, but client components are prerendered too; the **dynamic import inside the effect** keeps the browser bootstrap off the server (M1 spike) |

**Tests**: required (spec FR-017, SC-006/SC-007). `npm test` keeps its 62 tests (SC-007). The
browser suite keeps its 28 tests (one gains assertions) and adds one `@dev` smoke test in a separate
project.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different file and no behavioral dependency on an incomplete task.
- **[USn]**: the spec's user stories.
  - US1 Next.js canonical run
  - US2 native Prompt API
  - US3 lifecycle
  - US4 Feature 005 data axis
  - US5 harness, provenance, history
  - US6 dev flow and Vite retirement
- **APPROVAL REQUIRED / MANUAL**: ask in chat and wait for an explicit yes; never auto-checked.

## Invariants every phase keeps

> **INV-1 — unchanged core**: these files stay byte-identical to their T002 hashes through the whole
> Feature: `src/main.ts`, `harness/main.ts`, `harness/index.html`, `src/graph/*`,
> `src/integration/*`, `src/market-data.ts`, `test/standin.ts`, and AkariSP (no dependency change).
> Only mutations M1–M3 touch them, temporarily, restored with `cmp`.
>
> **INV-2 — browser-only execution**: Server Components render markup only. `src/**`, `harness/**`
> and `test/**` are never imported statically by `app/**` or `components/**`. They are imported only
> by `Boot`'s effect.
>
> **INV-3 — lifecycle ownership**: React state, effects cleanup and unmount never own the runtime,
> the `AbortController` or the graph. `Boot` has no cleanup.
>
> **INV-4 — no early retirement**: nothing of the Vite path (`index.html`, `vite.config.ts`, Vite
> scripts, `vite`) is removed before T033 passes.
>
> **INV-5 — no credentials, no domain server**: no key of any kind; no route handler, root
> `middleware.*`/`proxy.*`, server action, `/api/*`, `output: 'export'`, custom server or custom
> `distDir`.
>
> **INV-6 — commands never dirty the tree**: after every build, dev, typegen, test or native command,
> `git status --porcelain -- <code paths>` is empty. Code paths during coexistence: `index.html src test harness e2e app components package.json package-lock.json vite.config.ts next.config.ts tsconfig.json playwright.config.ts`;
> after retirement: `src test harness e2e app components package.json package-lock.json next.config.ts tsconfig.json playwright.config.ts`.

## Stop conditions (write a finding in the project format, keep the Vite path canonical, and stop)

Stop if any of these happens:
- a change to an INV-1 file appears necessary, or an AkariSP change appears necessary
- a browser-only module is evaluated on the server (build or prerender)
- one click produces more than one runtime or graph run (`createCalls` > 1, `logicalRequests` 16)
- the cancellation settlement invariant breaks (not `{ready,0,0}` before shutdown)
- a Feature 005 controlled-live guarantee cannot be preserved
- the revision loses provenance (wrong format, quotes, `+dirty` not reflecting code paths)
- the native Prompt API cannot run on the Next shell while it runs on Vite
- a protected hash mismatches
- a migration-matrix row lacks a passing Next proof before retirement

---

## Checkpoint A — Baseline, protection, dependencies (Phase 1: Setup)

- [X] T001 Create `specs/006-nextjs-application-shell/verification.md` with the baseline:
  - branch, `git rev-parse HEAD`, `git rev-parse origin/main`, `git status --short`
  - `node --version`, `npm --version`
  - `npm ls --depth=0`
  - the current `package.json` scripts
  - the Vite gates: `npm run typecheck`, `npm run build`, `npm test` (expect 62: 61 pass, 1 skip),
    `npm run test:browser` (expect 28)
  - Record exact counts.
- [X] T002 Record protected SHA-256 hashes in `verification.md`:
  - `git ls-files specs/001-tradingagents-reference-analysis specs/002-langchain-akarisp-integration-validation specs/003-langgraph-akarisp-minimal-graph specs/004-browser-tradingagents-fixture-graph specs/005-browser-market-data-boundary harness src/main.ts src/graph src/integration src/market-data.ts test/standin.ts | xargs shasum -a 256`
  - expected 63 files, explicitly including `src/main.ts`, `harness/main.ts`, `harness/index.html`,
    `src/graph/trading-graph.ts`, `src/integration/akari-chat-model.ts`
  - Re-checked in T029, T039 and T043.
- [X] T003 Save the Vite baseline evidence:
  - after `npm run test:browser`, copy app test (a)'s `evidence.json` to
    `specs/006-nextjs-application-shell/evidence/baseline-vite-standin-fixture-<date>-<sha>.json`
  - copy the harness stand-in `evidence.json` to `…/evidence/baseline-vite-harness-standin-<date>-<sha>.json`
  - The native baseline is the Feature 005 record
    `specs/005-browser-market-data-boundary/evidence/real-browser-fixture-2026-09-28-0543a69.json`
    (read only).
- [X] T004 Add the Next/React dependencies, exact versions:
  - `npm install --save-exact next@16.3.6 react@19.3.0 react-dom@19.3.0`
  - `npm install --save-exact -D @types/react@19.3.0 @types/react-dom@19.3.0`
  - This changes `package.json` and `package-lock.json`. Nothing is removed.
  - Re-run the Vite gates (typecheck, build, `npm test`, `test:browser`): unchanged counts.
- [X] T005 [P] Add `.next/` and `next-env.d.ts` to `.gitignore` (existing one-entry-per-line
  style). Confirm with `git check-ignore -q .next/x .next/dev/x next-env.d.ts`.

**Checkpoint A**: baseline and hashes recorded; dependencies added; the Vite path is still
canonical and green.

---

## Checkpoint B — Next.js shell beside Vite (Phase 2: Foundational)

- [X] T006 Update `tsconfig.json` (R10).
  - Add: `"jsx": "react-jsx"`, `"isolatedModules": true`, `"esModuleInterop": true`,
    `"resolveJsonModule": true`, `"incremental": true`, `"allowJs": false`,
    `"plugins": [{ "name": "next" }]`.
  - Extend `include` with `app`, `components`, `next-env.d.ts`, `.next/types/**/*.ts`,
    `.next/dev/types/**/*.ts`. These are exactly Next 16's generated entries for the default
    `.next`, so Next does not append anything (research R10).
  - Add top-level `"exclude": ["node_modules"]` (finding F006-001: without it `next typegen` and
    `next build` rewrite the file).
  - Keep unchanged: `target`, `module`, `moduleResolution: bundler`, `lib`, `types: ["node"]`,
    `strict`, `noEmit`, `allowImportingTsExtensions`, `erasableSyntaxOnly`, `verbatimModuleSyntax`,
    `skipLibCheck`.
  - Verify `npm run typecheck` (Vite) still passes.
  - After T013's `next:build`, `next:typecheck` and dev run, `git diff tsconfig.json` shows only
    this task's change: Next appended nothing.
- [X] T007 Create `next.config.ts` (contracts/shell-boundary.md "Build-time constants").
  - `revision` = `git rev-parse HEAD` + `+dirty` if
    `git status --porcelain -- index.html src test harness e2e app components package.json package-lock.json vite.config.ts next.config.ts tsconfig.json playwright.config.ts`
    is non-empty. The three versions are read from `node_modules/<pkg>/package.json`.
  - `compiler.define` gets `__BTA_REVISION__`, `__AKARISP_VERSION__`, `__LANGCHAIN_CORE_VERSION__`,
    `__LANGGRAPH_VERSION__` as **raw strings (no `JSON.stringify`)**.
  - No `distDir` key (the default `.next`), no `output`, no custom server, no rewrites. Nothing else.
- [X] T008 Create `app/layout.tsx`: `<html lang="en"><body>{children}</body></html>` and
  `metadata.title = 'BrowserTradingAgents'`.
- [X] T009 [US1] Create `app/page.tsx` as a Server Component.
  - Reproduce the `<body>` of `index.html` element by element: same ids, initial attributes and
    text, including the two explanatory paragraphs, `#key-row[hidden]`, `#key`
    `type=password autoComplete=off`, `#run[disabled]` "Run Graph", `#cancel`,
    `#status[data-state="idle"]`, the 8 `#node-<role>` cells "waiting" with their role labels,
    `#result`, `#runtime`, `#market`, `#evidence`, `#replay`.
  - Then `<Boot entry="app" />`. No styling changes, no UI redesign.
- [X] T010 [US1] Create `components/Boot.tsx` exactly per contracts/shell-boundary.md "Client
  entry": `'use client'`, `useEffect` dynamic import of `../src/main.ts` / `../harness/main.ts`, no
  cleanup, returns `null`.
- [X] T011 [US5] Create `app/harness/page.tsx` as a Server Component.
  - Reproduce the `<body>` of `harness/index.html` (heading, paragraph, `#availability`, `#run`
    "Run", `#copy` "Copy JSON", `#status[data-state="idle"]`, `#evidence`), then
    `<Boot entry="harness" />`.
  - `metadata.title = 'BrowserTradingAgents — Feature 002 harness'`.
  - `harness/index.html` and `harness/main.ts` are not touched.
- [X] T012 Add coexistence scripts to `package.json`: `next:dev` = `next dev`, `next:build` =
  `next build`, `next:start` = `next start`, `next:typecheck` = `next typegen && tsc --noEmit`.
  Existing scripts (`dev`, `build`, `harness`, `typecheck`, `test*`) are unchanged.
- [X] T013 **Checkpoint B gate** (FR-003, FR-020, FR-021, SC-001, SC-004), recorded in
  `verification.md`:
  1. `npm run next:typecheck` passes.
  2. `npm run next:build` passes and lists `/` and `/harness` as prerendered with no error. A
     server-side evaluation of `src/main.ts` would throw on `document`/`location`.
  3. **Static boundary scan** (one half of the M1 guard; research R12a):
     - `grep -rnE -e "^[[:space:]]*import[[:space:]]+[^(]*['\"](\.\./)+(src|harness|test)/" -e "from[[:space:]]*['\"](\.\./)+(src|harness|test)/" app components` → 0. This catches `import x from`, `import { x } from`, side-effect
       `import '…'`, multi-line imports and re-exports; it ignores `import(…)`.
     - `grep -rn "'use client'" components/Boot.tsx` → 1
     - `grep -rn "import(" components/Boot.tsx` shows only the two dynamic imports inside
       `useEffect`
     - `find app -name 'route.*'` → 0, and `ls middleware.* proxy.* src/middleware.* src/proxy.* 2>/dev/null`
       → nothing (the Next 16 root-level `proxy`/`middleware` boundary)
     - `grep -nE "output:|distDir|JSON\.stringify" next.config.ts` → 0
  4. `npm run next:start -- --port 5180`: `curl` `/` and `/harness` → 200 and the HTML contains
     `id="run"` and `id="evidence"`. Also start `npm run next:dev` briefly and `curl` `/` → 200.
  5. The Vite gates still pass.
  6. **Pre/post diff digest** (final analyze L1): immediately before and after each of steps 1, 2
     and 4, record `git diff -- <coexistence code paths> | shasum`. The two digests must be equal:
     uncommitted Feature edits are allowed, but a command that modifies a tracked code-path file
     fails. A dirty `git status` alone is not a failure before the T030 commit.
  - State: **NEXT_SHELL_IMPLEMENTED**.

---

## Checkpoint C — Stand-in equivalence on the production server (US1)

- [X] T014 [US1] Update `playwright.config.ts` (R9). Exactly **one** web server per invocation.
  - With `const devSmoke = process.env.BTA_DEV_SMOKE === '1'`:
    - default: `webServer` = `npx next build && npx next start --port ${port}`
      (production; the build runs inside the same command before start)
    - `devSmoke`: `webServer` = `npx next dev --port ${port}`
    - both with `reuseExistingServer: false` and `timeout: 180_000`; no `env` and no `distDir`
      (default `.next`)
  - `projects`:
    - default: `chromium` (`testIgnore` prompt-api, `grepInvert: /@dev/`) and `prompt-api`
    - `devSmoke`: only `chromium-dev` (`grep: /@dev/`)
  - The canonical and native runs therefore never start `next dev`. `outputDir` stays
    `test-results/${port}`.
- [X] T015 [US5] Update harness URLs so no test relies on the 308 redirect:
  - `e2e/harness.spec.ts`: `/harness/?provider=standin` → `/harness?provider=standin`,
    `/harness/` → `/harness`
  - `e2e/prompt-api.spec.ts`: `/harness/?runner=playwright` → `/harness?runner=playwright`
  - header comments `/harness/` → `/harness`
  - No assertion changes.
- [X] T016 [US1] Strengthen app test (a) in `e2e/app.spec.ts` (FR-014, FR-005):
  - `expect(r.revision.browserTradingAgents).toMatch(/^[0-9a-f]{40}(\+dirty)?$/)`
  - the three version fields equal the installed `node_modules/<pkg>/package.json` versions
  - `countCreates` before the click and `expect(await creates(page)).toBe(1)`
  - No existing assertion is removed.
- [X] T017 [US1] Run test (a) and the harness stand-in test on the Next production server
  (`npx playwright test --project=chromium -g "full eight-role|stand-in provider"`). PASS.
  - Copy their `evidence.json` to `…/evidence/next-standin-fixture-<date>-<sha>.json` and
    `…/evidence/next-harness-standin-<date>-<sha>.json` (FR-005, SC-002).
- [X] T018 [US1] Create `scripts/compare-evidence.mjs` implementing
  contracts/evidence-equivalence.md.
  - It compares key sets at every depth.
  - Identical values are required for the listed fields.
  - The allowed-to-differ fields are revision, date, timing, `pollMs` and `modelRequests[].timing`.
  - Exit code is non-zero on any other difference.
  - It has two explicit modes (contracts/evidence-equivalence.md):
    - `--mode app`: the structural + value rules with only the listed allowed differences
    - `--mode harness`: scenario outcomes plus the snapshot fields `e2e/harness.spec.ts` asserts
      only. It never applies the app comparator to the harness record, whose per-scenario timings
      vary. No other ignore list is added.
  - Run `--mode app` (baseline T003 vs T017 app) and `--mode harness` (baseline vs T017 harness).
    Record both outputs in `verification.md` (FR-013). Any difference → finding.

**Checkpoint C**: stand-in + fixture and the harness are equivalent on Next production.

---

## Checkpoint D — Full browser suite, lifecycle, Feature 005 (US3, US4, US5)

- [X] T019 [US3] Run the Feature 004 app tests on Next production:
  - (a) success, (b) analyst cancel, (c) native BLOCKED, (d) createRuntime failure, (e)
    consecutive runs
  - All PASS. Record per test (FR-005, FR-007, FR-010, FR-012, FR-017).
- [X] T020 [US4] Run the Feature 005 L3 tests on Next production:
  - live success, the 11-case failure matrix, timeout, cancel during acquisition, graph-stage
    cancel, native + live BLOCKED, four mode URLs, key leakage
  - All PASS. `net.external` stays `[]` in every test (Next's own assets are same-origin
    `localhost`). `grep -r l3-dummy-key-not-real test-results/` → 0 (FR-011, SC-008). No
    `/api/market`.
- [X] T021 [US5] Run `e2e/harness.spec.ts` on Next (`/harness`): stand-in S1–S5/S7 PASS, S6
  OBSERVED; native-unavailable BLOCKED; the F005-002 readiness signal unchanged (FR-016, SC-009).
- [X] T022 [US1] Add one dev smoke test to `e2e/app.spec.ts` titled
  `@dev stand-in + fixture under next dev (Strict Mode): one click = one runtime, one graph run`:
  - `countCreates`, then one click; `creates === 1`, `counts.logicalRequests === 8`,
    `nodeEvents.length === 16`, every node `executions === 1`
  - It waits only on existing readiness (Run enabled, `#status[data-state="done"]`); no sleeps.
- [X] T023 [US1] Run `BTA_DEV_SMOKE=1 npx playwright test --project=chromium-dev`: the `@dev` test
  PASS, and only `next dev` was started. Then `npm run test:browser` (prod only; no dev server
  started) three consecutive times: 28/28 each.
- [X] T024 [US3] Lifecycle equivalence record in `verification.md` (FR-009, SC-005), from the
  Next evidence of (b) and the graph-stage cancel:
  - caller `cancelled`; `snapshotBeforeShutdown` `{ready,0,0}`; `settledBeforeShutdown` true;
    `snapshotAfterShutdown` `closed`
  - `components/Boot.tsx` has no effect cleanup, confirmed by grep (INV-3)

**Checkpoint D**: every prior browser guarantee is re-proven on Next production (matrix rows 1–13,
18).

---

## Checkpoint E — Provenance and negative proofs (US5)

- [X] T025 [US5] Dirty provenance (FR-014, SC-010).
  - With the uncommitted shell (code paths dirty), the T017 evidence shows
    `revision.browserTradingAgents === "<HEAD>+dirty"`.
  - `grep` shows the `next.config.ts` code-path list contains `app components next.config.ts
    tsconfig.json`.
  - The clean and doc-only cases are T031.
- [X] T026 **Mutation M1 — client boundary violation** (not committed).
  - Copy `components/Boot.tsx`. Replace its effect body with a static top-level
    `import '../src/main.ts';` (and `harness` likewise).
  - Designated guards, with distinct roles:
    - (1) **Static scan** (fast, source-level): `grep -rnE -e "^[[:space:]]*import[[:space:]]+[^(]*['\"](\.\./)+(src|harness|test)/" -e "from[[:space:]]*['\"](\.\./)+(src|harness|test)/" app components` reports the added
      `components/Boot.tsx` import line.
    - (2) **Build/prerender** (behavioural): `npm run next:build` fails **because the browser
      bootstrap was evaluated on the server**. Expected text: `Error occurred prerendering page "/"`
      with `ReferenceError: location is not defined` (or `document`/`LanguageModel`) at
      `src/main.ts`, as reproduced in the spike. A build failure for any other reason does not make
      the mutation effective.
  - Restore from the copy; `cmp` identical; `git diff -- components` equals the pre-mutation diff;
    `next:build` passes again (final analyze L2: `cmp` + hash + diff are the authoritative restore
    proof; no `MUTATION` marker is used)
    (FR-003, SC-004).
- [X] T027 **Mutation M2 — Vite-style revision define** (not committed).
  - Copy `next.config.ts`. Set `__BTA_REVISION__: JSON.stringify(revision)`.
  - Designated test: app test (a)'s revision assertion (T016) FAILS, receiving a quoted value.
  - Restore; `cmp` identical; rerun (a) → PASS (FR-014).
- [X] T028 **Mutation M3 — shutdown before settlement on the Next path** (not committed).
  - Copy `src/main.ts`. Move `await runtime.shutdown()` before the settle poll in `runGraph`.
  - Designated test: app test (b) (analyst cancel) FAILS on `settledBeforeShutdown` /
    `snapshotBeforeShutdown.state` (the live graph-stage cancel test is expected to fail too).
  - Restore from the copy; `cmp` identical and `shasum` equals the T002 hash of `src/main.ts`;
    rerun → PASS (FR-009, SC-005).
- [X] T029 **Pre-retirement automatic gate**, recorded in `verification.md`:
  - `npm run next:typecheck`, `npm run next:build`
  - `npm test` 62 (61 pass, 1 skip)
  - `npm run test:browser` 28/28 (Next prod); `BTA_DEV_SMOKE=1 npx playwright test --project=chromium-dev` 1/1
  - T013 static boundary scan 0
  - protected hashes `shasum -a 256 -c` 63/63
  - mutation residue: `cmp` of every mutated file against its copy, `src/main.ts` hash = T002
    (L2: no marker grep); test-results sentinel grep 0
  - no credential: `git grep -nE "Bearer [A-Za-z0-9_]{16,}|BTA_MASSIVE_KEY=[^ .…$\"]"` 0
  - pre/post diff digest (L1): `git diff -- <coexistence code paths> | shasum` is equal immediately
    before and after the typecheck, build, `npm test` and browser commands above
  - State: **MIGRATION_VALIDATED**.

---

## Checkpoint F — Clean commit and pre-retirement native gate (US2)

- [X] T030 **APPROVAL REQUIRED — commit.**
  - With the maintainer's approval, commit the shell to `006-nextjs-application-shell` (no push
    unless asked). Exclude `.claude/`, `.specify/*` tooling, `CLAUDE.md`, `.local/`, `.next/`,
    `next-env.d.ts`, `test-results/`.
  - Record HEAD. Confirm `git status --porcelain --` over the T007 code-path list is empty.
- [X] T031 [US5] Clean and doc-only provenance at the T030 HEAD (SC-010):
  - (1) `npx playwright test --project=chromium -g "full eight-role"` → `revision === HEAD`, no
    `+dirty`.
  - (2) Temporarily edit `specs/006-nextjs-application-shell/verification.md`, rerun (1) → still
    no `+dirty`; revert.
  - Together with T025, this shows the Vite semantics are preserved.
- [X] T032 [US2] **APPROVAL REQUIRED — pre-retirement native gate** (installed Google Chrome, no
  credential).
  - At the T030 HEAD: `npm run test:prompt-api -- -g "eight-role"`.
  - Validate: `REAL_BROWSER_PROMPT_API`, `native`, `MODEL_AVAILABLE`, revision = T030 HEAD without
    `+dirty`, `dataSource.mode: fixture`, 8/8 `done`, `logicalRequests` 8, `fallbackRequests` 0,
    `{ready,0,0}` before shutdown, `settledBeforeShutdown` true, no stand-in.
  - Save it unedited as `…/evidence/real-browser-next-fixture-pre-retirement-<date>-<sha>.json`.
  - After the run: `git status --porcelain -- index.html src test harness e2e app components package.json package-lock.json vite.config.ts next.config.ts tsconfig.json playwright.config.ts` → empty **after** the commands (no tool rewrote a tracked file). The build did not rewrite `tsconfig.json` or any other tracked
    file, so the clean revision still holds.
  - Model unavailable → `BLOCKED`, and Vite retirement stays forbidden.
  - State: **PRE_RETIREMENT_NATIVE_PASS**.

---

## Checkpoint G — Vite retirement (US6)

- [X] T033 [US6] Retirement pre-check: every row 1–18 of contracts/evidence-equivalence.md has a
  passing Next proof recorded (T017–T032). Any gap → STOP (INV-4, FR-023).
- [X] T034 [US6] Remove the Vite canonical path:
  - delete `index.html` (its markup lives in `app/page.tsx`) and `vite.config.ts` (its define
    lives in `next.config.ts`)
  - `npm uninstall vite`, which updates `package.json` and `package-lock.json`
  - Keep `harness/index.html` (protected, historical, no longer an entry) and everything under
    INV-1.
- [X] T035 [US6] Switch the canonical scripts in `package.json`:
  - `dev` = `next dev`, `build` = `next build`, `start` = `next start`
  - `typecheck` = `next typegen && tsc --noEmit`
  - remove `harness` and the four `next:*` scripts
  - keep `test`, `test:browser`, `test:prompt-api`, `prepare:prompt-api`
  - add `test:browser:dev` = `BTA_DEV_SMOKE=1 playwright test --project=chromium-dev`
- [X] T036 [US6] In `next.config.ts`, drop `index.html` and `vite.config.ts` from the code-path
  list. Confirm `tsconfig.json`'s `"*.config.ts"` include still covers `next.config.ts` and
  `playwright.config.ts`.
- [X] T037 [P] [US6] Update `docs/testing.md`:
  - commands (`dev`/`build`/`start`/`typecheck`, `test:browser:dev`)
  - `npm run dev` serves `http://localhost:3000/` (Next's default; Vite's 5173 is gone). Playwright
    uses its own explicit port (`HARNESS_PORT`, default 5174), which is a separate thing.
  - the Next production server as the only browser gate and native server; the `@dev` smoke via
    `test:browser:dev`
  - URLs (`/`, `/harness`). `harness/index.html` is **retained, protected and historical, no longer
    an executable entry**; the canonical harness route `/harness` is `app/harness/page.tsx`.
  - build output is the default `.next`; one Playwright session per checkout (use a `git worktree`
    for parallel work); commands must not modify tracked files
  - revision semantics under `compiler.define` (raw strings)
  - a note on the dev hot-reload caveat for `src/main.ts` edits
- [X] T038 [US6] Retirement completeness scan:
  - `git ls-files index.html vite.config.ts` → 0
  - `grep -rn "vite" package.json playwright.config.ts next.config.ts tsconfig.json docs/testing.md`
    → 0 functional references
  - `grep -rln "vite" specs/00[1-5]*` unchanged (history)
  - exactly one canonical app (`app/page.tsx`)
  - State: **VITE_RETIRED**.

---

## Checkpoint H — Post-retirement proof, final native gate, audit

- [X] T039 **Post-retirement automatic gate** (fresh install; pre-retirement results are not reused)
  (FR-017–FR-019, SC-001, SC-007, SC-015):
  - `rm -rf node_modules .next && npm ci`
  - `npm run typecheck`; `npm run build`; `npm start` smoke (`curl` `/` and `/harness` 200)
  - `npm test` 62; `npm run test:browser` 28/28 ×3; `npm run test:browser:dev` 1/1
  - T013 static scan 0; protected hashes 63/63; residue 0
  - `git status --porcelain -- src test harness e2e app components package.json package-lock.json next.config.ts tsconfig.json playwright.config.ts` → empty **after** the commands, beyond the retirement edits
  - State: **IMPLEMENTATION_COMPLETE**.
- [X] T040 [P] Update `docs/roadmap.md`: the Feature 006 status (Next.js App Router shell; Vite
  retired; native evidence pending T042).
- [ ] T041 **APPROVAL REQUIRED — final commit.**
  - With approval, commit the Vite retirement and docs (no push unless asked; same exclusions as
    T030).
  - Record HEAD. Confirm the post-retirement code-path list is clean.
- [ ] T042 [US2] **APPROVAL REQUIRED — final native gate** at the T041 HEAD.
  - `npm run test:prompt-api -- -g "eight-role"` with the same validation as T032.
  - Save as `…/evidence/real-browser-next-fixture-<date>-<sha>.json`. This is the **Feature 006
    canonical native evidence**. T032 does not substitute for it (FR-006, SC-003).
  - After the run: `git status --porcelain -- src test harness e2e app components package.json package-lock.json next.config.ts tsconfig.json playwright.config.ts` → empty **after** the commands.
  - Unavailable → `BLOCKED`, and the Feature stays incomplete.
- [ ] T043 Final audit in `verification.md`:
  - the FR-001…FR-025 / SC-001…SC-015 coverage table (task + evidence per row)
  - the 18-row migration matrix with Next proofs
  - protected hashes 63/63 and historical Feature 001–005 integrity
  - Vite removal completeness (T038)
  - mutation summary M1–M3
  - dependency scope (`npm ls --depth=0`: `next`/`react`/`react-dom` + types added, `vite`
    removed, runtime dependencies unchanged)
  - production diff `git diff c64021e --stat` limited to the planned surfaces
  - AkariSP changes 0; credentials used 0; findings (project format) or "none"
- [ ] T044 Completion record at the end of `verification.md`:
  - states NEXT_SHELL_IMPLEMENTED (T013) → MIGRATION_VALIDATED (T029) →
    PRE_RETIREMENT_NATIVE_PASS (T032) → VITE_RETIRED (T038) → IMPLEMENTATION_COMPLETE (T039) →
    **FEATURE_COMPLETE** only if T042 PASS and T043 clean
  - A successful build alone is never completion.

---

## Dependencies & Execution Order

```text
A T001–T005  baseline, hashes, Vite evidence, deps (+ .gitignore)
 → B T006–T013  Next shell beside Vite            → NEXT_SHELL_IMPLEMENTED
 → C T014–T018  Playwright on Next; stand-in equivalence
 → D T019–T024  full browser, lifecycle, Feature 005, harness, @dev smoke
 → E T025–T029  provenance, M1–M3, pre-retirement gate  → MIGRATION_VALIDATED
 → F T030 (APPROVAL) → T031 → T032 (APPROVAL, native)   → PRE_RETIREMENT_NATIVE_PASS
 → G T033 → T034 → T035 → T036 → T038 (T037 ‖)           → VITE_RETIRED
 → H T039 → T041 (APPROVAL) → T042 (APPROVAL, native) → T043 → T044  (T040 ‖ before T041)
```

- Everything is sequential except the [P] tasks.
- T014–T023 need the shell (B).
- T026–T028 need T016, T019 and T013.
- T033 needs every earlier gate.
- T042 needs T041.

## Parallel Opportunities

- T005 (`.gitignore`) ‖ T004 (dependencies)
- T037 (`docs/testing.md`) ‖ T036
- T040 (`docs/roadmap.md`) ‖ T039
- Nothing else: the remaining tasks share files or depend on the previous task's behaviour.

## Requirement Coverage

| Req | Tasks |
|---|---|
| FR-001 | T008–T011, T034, T038 |
| FR-002 | T010, T013, T019, T026 |
| FR-003 | T013, T026 |
| FR-004 | T002, T029, T039, T043 |
| FR-005 | T016, T017, T019 |
| FR-006 | T032, T042 |
| FR-007 | T019, T021 |
| FR-008 | T019, T029 (unchanged graph + G11 in `npm test`) |
| FR-009 | T019, T024, T028 |
| FR-010 | T019 |
| FR-011 | T020 |
| FR-012 | T009, T011, T019–T021 |
| FR-013 | T017, T018 |
| FR-014 | T007, T016, T025, T027, T031 |
| FR-015 | T002, T043 |
| FR-016 | T011, T015, T021 |
| FR-017 | T019–T021, T029, T039 |
| FR-018 | T029, T039 |
| FR-019 | T012, T035, T039 |
| FR-020 | T007, T013 |
| FR-021 | T013 |
| FR-022 | T029, T043 |
| FR-023 | T033–T038 |
| FR-024 | Stop conditions, T043 |
| FR-025 | T013, T043 |
| SC-001 | T013, T039 |
| SC-002 | T017 |
| SC-003 | T032, T042 |
| SC-004 | T013, T026 |
| SC-005 | T024, T028 |
| SC-006 | T019–T021, T033 |
| SC-007 | T029, T039 |
| SC-008 | T020 |
| SC-009 | T021 |
| SC-010 | T025, T031 |
| SC-011 | T002, T043 |
| SC-012 | T002, T029, T043 |
| SC-013 | T013, T029, T043 |
| SC-014 | T033, T038 |
| SC-015 | T039 |

## Migration-matrix traceability (contracts/evidence-equivalence.md)

| Rows | Guarantee | Tasks |
|---|---|---|
| 1–2 | success, fan-out | T017, T018, T019 |
| 3 | native unavailable | T019 |
| 4 | runtime-create failure | T019 |
| 5 | cancel/settlement | T019, T024, T028 |
| 6 | consecutive runs | T019 |
| 7–12 | Feature 005 | T020 |
| 13 | harness | T017, T018, T021 |
| 14 | deterministic/Node | T029, T039 |
| 15 | revision | T016, T025, T027, T031 |
| 16 | native | T032, T042 |
| 17 | no server evaluation | T013, T026 |
| 18 | Strict Mode single init | T022, T023 |

Orphans: 0.

## Implementation Strategy

1. A–B: add the Next shell next to the working Vite app; change nothing that executes.
2. C–E: prove equivalence on the production server, then lifecycle, Feature 005, harness,
   provenance, and that the tests bite (M1–M3).
3. F: an approved clean commit and the native gate. Only then G retires Vite.
4. H: prove everything again from a fresh install, then an approved final commit, the final native
   gate and the audit.
