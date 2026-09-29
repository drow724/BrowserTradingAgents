# Research: Feature 006 — Next.js Application Shell Migration

Date: 2026-09-29. Branch `006-nextjs-application-shell` @ `c64021e` (= `origin/main`).

**Method**: every design decision below was checked in a throwaway **spike outside the repository**
(session scratchpad). The spike used Next.js 16.3.6 and React 19.3.0 with copies of the repository's
real `src/`, `harness/` and `test/standin.ts`, built and served, and driven in Playwright Chromium.
Repository dependencies and code were not changed. Spike results are `BROWSER_AUTOMATED`
(stand-in) facts about the design, not Feature evidence. The Feature re-proves everything in the
repository.

## R0 Baseline

| Item | Value |
|---|---|
| Node / npm | v23.9.0 / 10.9.2 |
| Dependencies | `akarisp` 0.1.0-alpha.2, `@langchain/core` 1.2.13, `@langchain/langgraph` 1.4.18; dev: `vite` 8.3.1, `@playwright/test` 1.63.0, `typescript` 5.9.3, `@types/node` 22.20.4; no React |
| Scripts | `dev`/`harness`: `vite`; `build`: `vite build`; `test`: `node --test test/*.test.ts`; `test:browser`: Playwright `chromium`; `test:prompt-api`: Playwright `prompt-api` (installed Chrome); `prepare:prompt-api` |
| Tests | `npm test` 62 (61 pass, 1 intended skip); `test:browser` 28 |
| Git | clean except `specs/006-…/` (this Feature) and the usual untracked tooling |

## R1 Versions

- **Decision**: `next@16.3.6`, `react@19.3.0`, `react-dom@19.3.0`, `@types/react@19.3.0`,
  `@types/react-dom@19.3.0`, pinned exactly like the existing runtime dependencies.
- **Rationale**:
  - These are the npm `latest` versions on 2026-09-29.
  - `next@16.3.6` has `engines.node >=20.9.0`; local Node is 23.9.0.
  - Its peer ranges accept `react ^19.0.0` and `@playwright/test ^1.51.1`; the local version is
    1.63.0.
  - The spike built and ran the real app modules with this set, including `@langchain/*` and
    `akarisp`.
- **Alternatives**: Next 15.x offers nothing extra this project needs and is older; not chosen.

## R2 Current architecture and `src/main.ts` responsibilities

`index.html` holds the static markup (ids below). `src/main.ts` is one ES module that, **when
evaluated**, does all of the following:

| Responsibility | Class | Migration |
|---|---|---|
| read `?provider`, `?runner`, `?data` | A (application) | KEEP |
| Prompt API availability check (top-level `await`) | A, browser-only | KEEP |
| load the stand-in on demand (`await import('../test/standin.ts')`) and expose `window.__standin` | A, browser-only | KEEP |
| DOM lookups by id, `#mode` / `#key-row` / `#availability` text, enabling Run after init | B (DOM binding) | KEEP (the markup ids are preserved) |
| button wiring (Run, Cancel), one `AbortController` per click | A + B | KEEP |
| data preparation (fixture / live `prepareLive`), `createRuntime`, `runGraph`, settle → shutdown | A | KEEP |
| evidence / replay / market / result rendering | B | KEEP |
| `declare const __BTA_REVISION__` etc. (build-time constants) | C (Vite define) | KEEP the identifiers; REPLACE the provider (R6) |

**Decision**: `src/main.ts` stays **byte-identical**. The migration replaces only what surrounds it:
the HTML entry (→ an App Router page with the same markup) and the build-time constants (→ Next
`compiler.define`). This keeps the execution semantics, including the Feature 004 `runGraph`
lifecycle block, untouched by construction. No React state, hook or effect takes over any
execution responsibility.

## R3 Client boundary (Option A chosen)

- **Option A (chosen)**:
  - The page is a Server Component that renders the existing static markup.
  - One tiny client component, `Boot` (`'use client'`), runs
    `useEffect(() => { void import('../src/main.ts') }, [])`.
  - `src/main.ts` and everything it imports are ordinary TS modules; none is marked `'use client'`.
- **Why it is safe**:
  - `'use client'` marks the React client-component boundary, but a client component is still
    **prerendered on the server** in the App Router. The directive alone does not keep
    `src/main.ts` off the server. What does is that the **dynamic import runs inside an effect**:
    it delays evaluation of the browser bootstrap module until the effect executes in the browser.
    Effects never run during SSR, prerender or build.
  - Spike proof of this distinction (M1): a *static* `import '../src/main.ts'` in the same
    `'use client'` `Boot` fails the build with `Error occurred prerendering page "/"` /
    `ReferenceError: location is not defined` (src/main.ts:26).
  - It runs after hydration, so its DOM writes never race React's hydration.
  - An ES module is evaluated once per page load, so a second effect run (React Strict Mode in dev)
    re-imports the same instance and registers no second listener.
- **Spike proof**:
  - `next build` prerendered `/` and `/harness` as static pages. Evaluating `src/main.ts` there
    would have thrown on `document`.
  - `next start` and `next dev` (Strict Mode on by default) each ran stand-in + fixture: 8/8,
    8 logical / 0 fallback, `{ready,0,0}` before shutdown, `settledBeforeShutdown` true,
    **`LanguageModel.create` calls = 1** for one click, 0 page errors.
- **Option B** (rebuild the UI as React components with state) was rejected. It would rewrite DOM
  binding and cancel/run wiring, put React lifecycle next to the AkariSP lifecycle, and reopen every
  browser test's observable semantics.
- **Option C** (serving `index.html` from `public/` with a Vite-built bundle) was rejected. It keeps
  two build systems, which contradicts the single-canonical-app goal.
- **Future React work** (Agent Town) can add client components beside `Boot` that read execution
  events. It does not require moving execution into React.

## R4 Browser-only evaluation boundary

| Module | Evaluation class | Basis |
|---|---|---|
| `src/main.ts` | CLIENT-ONLY | top-level `document`/`location`/`LanguageModel`/`await` |
| `harness/main.ts` | CLIENT-ONLY | same |
| `test/standin.ts` | SERVER-SAFE on import (installs only when called) | file header "No Node APIs"; imported by Node tests |
| `src/graph/*.ts` | SERVER-SAFE | imported by Node tests; `@langchain/langgraph/web` has no globals at import |
| `src/integration/*.ts` | SERVER-SAFE | imported by Node tests (incl. `akarisp`) |
| `src/market-data.ts` | SERVER-SAFE | only `Intl` at module level; `fetch`/`crypto` inside calls; imported by Node tests |

Only the two page entries are client-only, and they are imported only from `Boot`'s effect. The
server bundle never evaluates them. `grep` confirms the browser globals (`window.`, `document.`,
`location.`, `navigator.`) appear only in `src/main.ts` and `harness/main.ts`. **Gate**:
browser-API evaluations on the server = 0, shown by a successful `next build` prerender plus
Mutation M1 (R12).

## R5 Top-level await and `.ts`-extension imports

- **Top-level await**: in `src/main.ts` (availability, stand-in import) and `harness/main.ts`. The
  spike showed Next 16 with Turbopack (its default for dev and build) handles it in client chunks
  with no change. **Decision**: keep it; no wrapper, no rewrite.
- **`.ts`-extension imports**: 24 relative `.ts` imports across `src test harness e2e`. The spike
  resolved them under Turbopack with the repository's
  `allowImportingTsExtensions` + `moduleResolution: bundler`. **Decision**: keep; no import
  rewrite. Node tests (type stripping) are unaffected.
- **LangGraph entry**: every graph import is `@langchain/langgraph/web`; there are 0 root imports.
  The Feature 003 O-1 observation (a browser model call does not inherit the graph signal; explicit
  forwarding) holds in the unchanged `src/graph/trading-graph.ts`. **Gate**: static check "0 root
  `@langchain/langgraph` imports" plus the unchanged G11 test and browser cancel tests.

## R6 Revision and version injection (Vite `define` → Next `compiler.define`)

- **Today**: `vite.config.ts` computes, at config load (dev-server start or build), `git rev-parse
  HEAD` + `+dirty` when `git status --porcelain -- <code paths>` is non-empty. It also computes the
  three dependency versions and `define`s `__BTA_REVISION__`, `__AKARISP_VERSION__`,
  `__LANGCHAIN_CORE_VERSION__`, `__LANGGRAPH_VERSION__`. Both `src/main.ts` and the protected
  `harness/main.ts` read these identifiers.
- **Decision**: `next.config.ts` computes the same values the same way and passes them through
  **`compiler.define`**, keeping the identifiers.
  - `harness/main.ts` and `src/main.ts` stay unchanged.
  - The revision stays a **build-time** value: dev-server start for `next dev`, the build for
    `next build` (then served by `next start`). This matches the Vite semantics.
- **Pitfall found in the spike (recorded; not a blocker)**: Next's `compiler.define` inserts the
  value **as a string literal**, while Vite inserts it as **code**. Copying Vite's
  `JSON.stringify(value)` produced `"\"spike-rev\""` in the evidence; raw values produced
  `"spike-rev"`. The design therefore passes raw strings. It is guarded by a new e2e assertion,
  revision `^[0-9a-f]{40}(\+dirty)?$` and versions `^\d`, and by Mutation M2.
- **Code paths for `+dirty`**:
  - during coexistence: `index.html src test harness e2e app components package.json package-lock.json vite.config.ts next.config.ts tsconfig.json playwright.config.ts`
  - after retirement: `src test harness e2e app components package.json package-lock.json next.config.ts tsconfig.json playwright.config.ts`
  - `playwright.config.ts` is included because Feature 006 changes it and a test run must not
    rewrite it (see R9, provenance constraint).
- **Alternatives rejected**:
  - `env` / `NEXT_PUBLIC_*`: needs `process.env.X` in the code, which changes the protected
    `harness/main.ts`.
  - A generated module: an extra build step and a file to keep out of git.
- **Staleness guard kept**: the Playwright web server builds fresh on every run (never reused), as
  in Feature 004.

## R7 React Strict Mode, hydration and readiness

- Strict Mode (default `true` in App Router dev) double-invokes effects. With Option A the second
  effect re-imports the cached module, so nothing runs twice. The spike showed creates = 1 in dev.
  **Decision**: keep the default Strict Mode, and add one dev-server smoke test (R9) asserting 1
  runtime and 8 logical requests per click.
- **Readiness**: the canonical Run button renders `disabled`. `src/main.ts` attaches its listeners
  and only then enables Run (Feature 003 fix). This is unchanged, so "enabled ⇒ handler attached"
  still holds.
  - The harness keeps its F005-002 signal (`#availability` contains `provider: `, set in a promise
    reaction after `addEventListener`). The spike used exactly this.
  - No timeouts are used for readiness.
- **Dev-only caveat (documented, not a gate)**: editing `src/main.ts` while `next dev` runs can
  hot-re-evaluate it in the open page. Reload the page after editing, as with any module that binds
  DOM at evaluation.

## R8 Harness strategy (Option A: Next page hosting the unchanged module)

- `app/harness/page.tsx` renders `harness/index.html`'s body markup (same ids and text) and mounts
  `Boot` for `harness/main.ts`.
- `harness/main.ts` stays **byte-identical**. The spike's copy hashed equal and returned S1–S5/S7
  PASS and S6 OBSERVED.
- `harness/index.html` stays byte-identical as a historical (protected) file. It is no longer an
  entry, which is recorded.
- **URL**: Next serves `/harness`, and `/harness/?q` answers 308 → `/harness?q` (query kept, spike).
  The e2e and native specs are updated to `/harness?…` so no evidence run depends on a redirect.
- **Rejected**:
  - (B) keeping a static Vite-built harness: a second build system.
  - (C) a separate harness build: the same problem.

## R9 Playwright and scripts

- **Web servers** (fresh per run, never reused; exactly **one** server per Playwright invocation):
  1. **Production** (default): `next build && next start --port $PORT`. The canonical `chromium` and
     `prompt-api` projects run here, because production bundle behaviour is what ships. A dev
     server is never started for these runs, so native evidence has no dev compilation or process
     in its environment.
  2. **Development** (only when `BTA_DEV_SMOKE=1`, via the `test:browser:dev` script):
     `next dev --port $PORT`, used only by the `chromium-dev` project that runs the tests tagged
     `@dev` (Strict Mode single-init + one full stand-in run).
  - **Output directory: the default `.next` only.**
    - **Rejected: per-port custom `distDir`** (`.next-<port>` / `.next-dev-<port>` from an env
      variable). The analyze spike showed Next then rewrites the tracked `tsconfig.json` on every
      build/dev: it appends literal `.next-5174/types/**/*.ts`, `.next-5174/dev/types/**/*.ts`,
      `.next-dev-5174/…`, ignoring a `.next*/` glob. It also rewrites `next-env.d.ts` to that
      directory. Because `tsconfig.json` is a `+dirty` code path, every test run would dirty the
      revision and make a clean native gate impossible.
    - **Spike result for the chosen design**: with the default `.next`, Next 16 keeps dev output in
      `.next/dev`. `next dev`, `next build` and `next start` ran **concurrently** in one checkout
      (dev 200, build exit 0, start 200). With the two exact includes of R10, `tsconfig.json`
      stayed unchanged.
    - **Consequence**: one Playwright session per checkout. Parallel work uses a separate
      `git worktree`, an operational note, not a supported mode. `HARNESS_PORT` still selects the
      port.
- **Scripts after retirement**:
  - `dev` = `next dev`; `build` = `next build`; `start` = `next start`
  - `typecheck` = `next typegen && tsc --noEmit` (the Next-generated `next-env.d.ts` references
    route types that `typegen` writes)
  - `test`, `test:browser`, `test:prompt-api`, `prepare:prompt-api` unchanged; **add**
    `test:browser:dev` = `BTA_DEV_SMOKE=1 playwright test --project=chromium-dev`
  - `harness` removed; the harness is at `/harness` of `dev`
- **During coexistence**: add `next:dev`, `next:build`, `next:start`, and keep the Vite scripts
  until retirement.

## R10 TypeScript config

- Next 16 rewrites `tsconfig.json` on first run:
  - mandatory: `esModuleInterop`, `resolveJsonModule`
  - suggested: `allowJs`, `incremental`
  - include: `next-env.d.ts`, `.next/types/**/*.ts`, `.next/dev/types/**/*.ts`

  Seen in the spike.
- **Decision**: pre-set these so Next does not rewrite:
  - add `jsx: "react-jsx"`, `isolatedModules`, `esModuleInterop`, `resolveJsonModule`,
    `incremental`, `plugins: [{ name: "next" }]`, `allowJs: false`
  - extend `include` with `app`, `components`, `next-env.d.ts`, `.next/types/**/*.ts`,
    `.next/dev/types/**/*.ts`. These are exactly the entries Next 16 generates for the default
    `distDir`.
  - add top-level `"exclude": ["node_modules"]` (Next 16 requires it; the spike's file already had
    it, so the rewrite was missed there; finding F006-001 at T013). With them present, `next build`, `next dev` and `next typegen` leave `tsconfig.json`
    unchanged (spike).
- **Kept unchanged**: `strict`, `erasableSyntaxOnly`, `verbatimModuleSyntax`,
  `allowImportingTsExtensions`, `moduleResolution: bundler`, `noEmit`, `types: ["node"]`.
- `next-env.d.ts` is gitignored (generated). Next rewrites it to point at `.next/types` (build) or
  `.next/dev/types` (dev), so it must not be tracked. The spike passed `tsc --noEmit` after
  `next typegen`.
- **Provenance constraint**: no build, dev, typegen or test command may leave a tracked code-path
  file modified. Tasks check `git status --porcelain -- <code paths>` **after** such commands.

## R11 Deployment mode, server probe, Vercel

- **Default Next output**: no `output: 'export'`, no custom server. The app keeps a server-capable
  runtime for Feature 007 and stays compatible with a standard serverless deployment (FR-020).
- **Server probe**: not added. `next start` serving the app already proves the server boundary
  exists (Dogfood Before Abstraction).
- **Vercel deployment**: not a gate. It needs an account/credential (FR-022) and proves nothing
  about the client-side guarantees. It is deferred to a deployment Feature.

## R12 Negative proofs (migration-specific only)

| ID | Mutation (not committed) | Must fail |
|---|---|---|
| M1 | move `import('../src/main.ts')` out of `Boot`'s effect to a static top-level import | `next build` prerender (server evaluates browser APIs; FR-003) |
| M2 | wrap the revision in `JSON.stringify` inside `compiler.define` | the new e2e revision-format assertion (FR-014) |
| M3 | in `src/main.ts`, move `runtime.shutdown()` before the settle poll (Feature 004 Regression B, now under Next) | the analyst-cancel browser test (FR-009) |

Each mutation is restored from a copy with `cmp` identity and residue 0. Signal forwarding (G11 +
T032) lives in unchanged, Node-tested code and is not re-mutated.

## R12a Static boundary scan (the grep half of the M1 guard)

The scan must catch every static import of an application module from `app/` or `components/`,
including side-effect and multi-line forms, and must not catch dynamic `import(…)`. The earlier
pattern (`from ['"]…` only) missed `import '../src/main.ts';`. Verified with BSD grep (macOS) on
samples: 6/6 static forms hit, 0/3 dynamic forms hit.

```bash
grep -rnE -e "^[[:space:]]*import[[:space:]]+[^(]*['\"](\.\./)+(src|harness|test)/" -e "from[[:space:]]*['\"](\.\./)+(src|harness|test)/" app components
```

## R13 Findings

- None blocking. The `compiler.define` string-literal difference (R6) is a recorded design fact,
  guarded by an assertion and M2.
- The dev-only hot-reload caveat (R7) is documented, not a finding.
- Analyze (2026-09-29): H1 (per-port `distDir` rewrites `tsconfig.json`) → design changed to the
  default `.next` only (R9, R10). H2 (the scan missed side-effect imports) → scan corrected (R12a).
