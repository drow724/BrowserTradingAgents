# Implementation Plan: Feature 006 — Next.js Application Shell Migration

**Branch**: `006-nextjs-application-shell` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-nextjs-application-shell/spec.md`

## Summary

Replace only the **shell** around the existing browser application:
- `index.html` becomes an App Router page with the same markup.
- A one-line client component (`Boot`) evaluates the **unchanged** `src/main.ts` in the browser after
  hydration.
- Vite's build-time constants become Next `compiler.define` (raw string values).
- `/harness/` becomes an App Router page that evaluates the **unchanged** `harness/main.ts`.

`src/main.ts`, `src/graph/*`, `src/integration/*`, `src/market-data.ts`, `test/standin.ts`,
`harness/*` and AkariSP are unchanged, so the execution semantics (graph, signal forwarding,
settlement before shutdown, Feature 005 data axis) move over by construction. The migration is then
**re-proven** on the Next.js production server:
- deterministic and Node suites
- the full browser suite
- a Strict-Mode dev smoke test
- migration-specific mutations
- the installed-Chrome native gate at a clean revision

Vite is retired only after that. The final native gate runs again at the final clean revision.

The approach was validated in an out-of-repo spike ([research.md](research.md)).

## Technical Context

**Language/Version**: TypeScript 5.9.3 (ESM), Node 23.9.0 (Next requires ≥ 20.9); Google Chrome 153
with the Prompt API.

**Primary Dependencies**:
- runtime unchanged: `akarisp@0.1.0-alpha.2`, `@langchain/core@1.2.13`, `@langchain/langgraph@1.4.18`
- **added**: `next@16.3.6`, `react@19.3.0`, `react-dom@19.3.0`; dev `@types/react@19.3.0`,
  `@types/react-dom@19.3.0`
- **removed at retirement**: `vite`

**Bundler**: Turbopack (the Next 16 default for dev and build). The spike proved it handles
top-level `await`, `.ts`-extension imports and the define constants.

**Storage**: none. The default Next output `.next/` (dev output in `.next/dev/`) and `next-env.d.ts`
are gitignored. No custom `distDir`: a per-port `distDir` makes Next rewrite the tracked
`tsconfig.json` (research R9).

**Operational note**: one Playwright session per checkout. Use a separate `git worktree` for
parallel work.

**Testing**:
- `node --test` (unchanged)
- Playwright:
  - `chromium` on `next build && next start` (canonical)
  - `prompt-api` on the same production server in installed Chrome
  - `chromium-dev` on `next dev`, started **only** by `test:browser:dev` (`BTA_DEV_SMOKE=1`), tagged
    smoke only. A dev server never runs during canonical or native gates.

**Target Platform**: browser, served by a Next.js server (Node or serverless). Default output; no
static export and no custom server.

**Project Type**: single project — Next.js App Router application with a browser-executed core.

**Performance Goals**: none (no performance claims). `timing.*` stays operational evidence.

**Constraints**:
- `src/main.ts` and `harness/main.ts` byte-identical
- browser APIs never evaluated on the server
- no secret; no domain server route
- no AkariSP / graph / integration change

**Scale/Scope**:

| Status | Files |
|---|---|
| New | `app/layout.tsx`, `app/page.tsx`, `app/harness/page.tsx`, `components/Boot.tsx`, `next.config.ts` |
| Edited | `tsconfig.json`, `package.json`/lock, `playwright.config.ts`, `.gitignore`, `e2e/*.spec.ts` (URLs, a revision assertion, one `@dev` smoke test), `docs/testing.md`, `docs/roadmap.md` |
| Retired after the gates | `index.html`, `vite.config.ts`, the Vite scripts and dependency |

No NEEDS CLARIFICATION remains.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Dogfood Before Abstraction | one `Boot` component; no framework/runtime/env abstraction; no server probe | PASS |
| II. Deterministic Fixtures First | fixture + stand-in stays the regression oracle | PASS |
| III. Application Owns Orchestration | orchestration stays in unchanged application modules | PASS |
| IV. AkariSP Owns Inference Lifecycle | AkariSP unchanged; React never owns runtime lifecycle | PASS |
| V. Evidence Before Core Change | AkariSP changes 0; findings first | PASS |
| VI. Browser First | execution only in the browser (Option A); native gate twice | PASS |
| VII. Reproducible Agent Runs | revision + `+dirty` preserved via `compiler.define`; baseline comparison | PASS |
| VIII. No Trading-Quality Claims | none | PASS |
| IX. External Data Deferred | no new data | PASS |
| X. Thin Integration Boundaries | `AkariChatModel` unchanged | PASS |
| XI. Preserve Reference Semantics | graph unchanged | PASS |
| XII. Findings Before Fixes | stop conditions below | PASS |
| XIII. Inference Tiers | local tier only | PASS |

Post-design re-check: PASS. Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/006-nextjs-application-shell/
├── spec.md
├── plan.md                      # this file
├── research.md                  # R0–R13 (spike-validated)
├── contracts/
│   ├── shell-boundary.md        # client/server boundary, Boot, define, harness page
│   └── evidence-equivalence.md  # baseline vs Next evidence comparison + migration matrix
├── quickstart.md
├── checklists/requirements.md
└── tasks.md                     # /speckit-tasks
```

No `data-model.md`: this Feature adds no data; evidence records keep the Feature 005 contract.

### Source Code (repository root)

```text
app/
├── layout.tsx            # <html><body>, <title>BrowserTradingAgents</title>
├── page.tsx              # Server Component: index.html's markup (same ids/text) + <Boot entry="app" />
└── harness/page.tsx      # Server Component: harness/index.html's markup + <Boot entry="harness" />
components/Boot.tsx       # 'use client'; useEffect → import('../src/main.ts' | '../harness/main.ts')
next.config.ts            # compiler.define (raw strings): revision(+dirty), 3 versions; default .next
src/  test/  harness/     # unchanged (main.ts and harness/main.ts byte-identical)
index.html, vite.config.ts  # kept until Checkpoint G, then removed
harness/index.html        # retained, protected, historical; no longer an executable entry (the /harness route is app/harness/page.tsx)
```

## Design

Details: [contracts/shell-boundary.md](contracts/shell-boundary.md).

### Execution flow

```text
Next server ─► static HTML (markup only; no application module evaluated)
Browser     ─► hydrate ─► Boot effect ─► import('../src/main.ts')  (evaluated once per page load)
                                          └─ availability → stand-in? → wire Run/Cancel → enable Run
            click Run ─► src/main.ts run(): unchanged (AbortController, prepareLive, runGraph, settle, shutdown)
```

React owns only rendering the static markup and triggering one module evaluation. React state,
effects cleanup and unmount never touch the runtime, the controller or the graph.

`'use client'` makes `Boot` a client component, but client components are prerendered on the server
too. Browser-only evaluation is kept off the server by the **dynamic import inside the effect**,
which delays evaluation of the browser bootstrap module until the effect runs in the browser. M1
proves this.

### Revision

`next.config.ts` computes at config load:
- `git rev-parse HEAD` + `+dirty` when `git status --porcelain -- <code paths>` is non-empty
- the three dependency versions

It passes them as **raw strings** in `compiler.define` under the existing identifiers. A new e2e
assertion checks the formats; Mutation M2 guards it.

### Evidence

- Records keep the Feature 005 contract and field names.
- The `feature` field stays `005-browser-market-data-boundary`. It names the evidence contract,
  which is unchanged, and `src/main.ts` stays byte-identical. The shell change is identified by the
  revision.

Comparison rules: [contracts/evidence-equivalence.md](contracts/evidence-equivalence.md).

## Migration checkpoints

| Checkpoint | Content | Old Vite path |
|---|---|---|
| **A** Baseline | record the Vite baseline: tests 62/28, evidence of stand-in+fixture test (a) and harness stand-in, protected hashes (specs 001–005, harness/*, `src/main.ts`, `src/graph/*`, `src/integration/*`, `src/market-data.ts`, `test/standin.ts`); add the Next/React dependencies; Vite suites still pass | canonical |
| **B** Next shell beside Vite | `next.config.ts`, `app/*`, `components/Boot.tsx`, tsconfig, `next:*` scripts; `next build` passes; manual smoke | canonical |
| **C** Stand-in equivalence | Playwright switches to the Next production server (+ dev server); test (a) and harness pass; evidence equivalence vs baseline; revision assertion | still present |
| **D** Full browser suite | all 28 prior browser tests pass on Next (lifecycle, cancel, failure, consecutive runs, Feature 005 L3 matrix, security, harness); `@dev` smoke passes | still present |
| **E** Provenance + negative proofs | clean vs `+dirty` shown; M1–M3 each fail as designed and are restored | still present |
| **F** Commit + native gate (pre-retirement) | APPROVAL commit; installed-Chrome native + fixture at that clean revision (8/8, 8/0, settled, no `+dirty`) | still present |
| **G** Vite retirement | remove `index.html`, `vite.config.ts`, the Vite scripts and dependency; rename scripts; code-path list without Vite files; re-run all automated gates | **removed** |
| **H** Final | APPROVAL commit; final native gate at the final clean revision; hash re-check; FR/SC coverage; docs/roadmap; completion record | — |

**Retirement gate (G)**: only after C, D, E and F pass (FR-023). `index.html` retires in G. Its
markup already lives in `app/page.tsx` from B. `harness/index.html` is kept byte-identical as a
historical file that is no longer an entry.

**Provenance after commands**: after every build, dev, typecheck and test gate,
`git status --porcelain -- <code paths>` must be empty. A tool must never rewrite a tracked file.

**Stop / rollback conditions**:
- A finding blocks progress, and the Vite path stays canonical, if any of these happens:
  - the prerender evaluates a browser API
  - a pre-existing browser guarantee fails on Next
  - the dev smoke shows >1 runtime per click
  - the revision format is wrong
  - native fails on Next while it passes on Vite
  - any change to `src/main.ts`, `harness/main.ts`, `src/graph`, `src/integration` or AkariSP
    appears necessary
- Rollback is reverting the Next-shell commits. Until G, nothing on the Vite path is removed.

## Equivalence matrix (summary)

Full matrix: [contracts/evidence-equivalence.md](contracts/evidence-equivalence.md).

| Guarantee | Vite proof (baseline) | Next proof | Retirement gate |
|---|---|---|---|
| 8-role success, 8/0 | app (a), Feature 004 native | app (a) on `next start`; M-native | C |
| fan-out `{ready,1,1}` / backpressure | app (a) | app (a) | C |
| native unavailable → BLOCKED | app (c) | app (c) | D |
| runtime-create failure | app (d) | app (d) | D |
| analyst cancel, settle before shutdown | app (b) + T051 | app (b) + M3 | D, E |
| consecutive runs | app (e) | app (e) | D |
| Feature 005 live success / failures / cancels / modes / leakage | T026–T033 | same tests | D |
| evidence fields | baseline records | equivalence check | C |
| revision clean / `+dirty` | Feature 004/005 records | new assertion + E + native | E, F |
| harness S1–S7 / native-unavailable | harness.spec | harness.spec on `/harness` | D |
| installed-Chrome native | T044 (`0543a69`) | F gate, then H gate | F |
| no server evaluation of browser APIs | n/a (Vite) | `next build` prerender + M1 | E |
| single init under Strict Mode | n/a | `@dev` smoke (creates = 1) | D |

## Complexity Tracking

No violations.
