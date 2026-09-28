# Implementation Plan: Feature 003 — LangGraph.js ↔ AkariSP Minimal Graph Integration

**Branch**: `003-langgraph-akarisp-minimal-graph` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-langgraph-akarisp-minimal-graph/spec.md`

## Summary

Add `@langchain/langgraph@1.4.18` and build one four-node graph (`branchA ‖ branchB →
synthesize → decide`) in `src/graph/minimal-graph.ts`, whose nodes call the unchanged Feature 002
`AkariChatModel` with the node's `config.signal` forwarded explicitly. Make the repository root the
canonical app (`index.html` → `src/main.ts`), which owns one AkariSP runtime per graph run
(`limit 1`), shows node/runtime state, and prints a Feature 003 evidence record. Prove behavior in
four layers: deterministic tests (fake `Runtime`), Node integration (real `akarisp` + stand-in),
Playwright on the canonical page (stand-in), and the same page on the native Prompt API.

Key research results (details in [research.md](research.md)):

- LangGraph **1.4.18** (stable `latest`) is compatible with `@langchain/core@1.2.13`; its `zod`
  peer is already satisfied by core's `zod@4.6.5`; no other direct dependency.
- State: `Annotation.Root` (current, not deprecated, no `zod` needed). No reducer: branches write
  disjoint keys.
- Fan-out: two `addEdge(START, …)`; fan-in: `addEdge(['branchA','branchB'], 'synthesize')`
  (`NamedBarrierValue`).
- **In the browser, a model invoked inside a node does not inherit the graph's signal** (the web
  entry has no AsyncLocalStorage). Nodes must forward `config.signal`; the app imports
  `@langchain/langgraph/web` so Node tests catch a missing forward.
- LangGraph rejects the caller on abort/failure **without waiting** for in-flight node work;
  AkariSP settlement is asserted separately, before `shutdown()`.

## Technical Context

**Language/Version**: TypeScript (ESM), Node 23.9.0 locally (≥ 22.18); browser target: Google
Chrome with the Prompt API (Chrome 153 on the development machine).

**Primary Dependencies**: `akarisp@0.1.0-alpha.2`, `@langchain/core@1.2.13`, **new**
`@langchain/langgraph@1.4.18` (all exact, lockfile-pinned). Dev: unchanged (`typescript ^5.9.3`,
`vite ^8.3.1`, `@playwright/test ^1.63.0`, `@types/node`).

**Storage**: none. Evidence JSON committed under the feature directory.

**Testing**: `node --test` (deterministic + Node integration), Playwright (`chromium` project:
canonical page with stand-in; `prompt-api` project: installed Chrome with the native model),
manual run of the same page.

**Target Platform**: browser (Chrome Prompt API); Node only for tests.

**Project Type**: single project — browser application (static Vite build).

**Performance Goals**: none (validation Feature). Bundle size (~0.9 MB minified for LangGraph +
core, research R12) recorded, not optimized.

**Constraints**: AkariSP public exports only; `AkariChatModel` unchanged; no reducer/messages
state; no `Send`/conditional edges/subgraphs/retry/checkpointer; plain-text user-role prompts; no
UI framework; no network data.

**Scale/Scope**: 3 new source files + `index.html`, 2 new test files, 1 new e2e spec, small edits
to `vite.config.ts`, `package.json`, `test/standin.ts`, `e2e/harness.spec.ts`,
`e2e/prompt-api.spec.ts`, `docs/testing.md`, `docs/roadmap.md`.

No NEEDS CLARIFICATION remains (research R1–R23).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Dogfood Before Abstraction | one graph builder for one graph; run owner is a function in `main.ts`; no GraphRuntime/RuntimeManager/pool/adapter/registry | PASS |
| II. Deterministic Fixtures First | committed neutral fixture; fake `Runtime` tests first; stand-in for runtime/browser layers; no network | PASS |
| III. Application Owns Orchestration | graph, nodes, edges, prompts, cancellation initiation, failure handling all in `src/` | PASS |
| IV. AkariSP Owns Inference Lifecycle | queue, limit, cancel, cleanup, shutdown delegated to `Runtime`; graph never manages sessions | PASS |
| V. Evidence Before Core Change | AkariSP source/API/deps changes 0/0/0; no findings; observations O-1, O-2 | PASS |
| VI. Browser First | completion requires `REAL_BROWSER_PROMPT_API` success on the canonical page; stand-in and Node layers labelled | PASS |
| VII. Reproducible Agent Runs | record: revision(+dirty), 3 package versions, fixture id, prompt source, topology, runtime options, provider, runner, date, class | PASS |
| VIII. No Trading-Quality Claims | neutral fixture and prompts; output content never evaluated | PASS |
| IX. External Data Deferred | no data APIs; `langgraph-sdk` (transitive) never instantiated | PASS |
| X. Thin Integration Boundaries | `AkariChatModel` untouched; signal forwarding lives in graph nodes | PASS |
| XI. Preserve Reference Semantics Explicitly | branches are neutral; parallel branches documented as the future browser adaptation (Feature 001), not upstream topology; no TradingAgents prompts/roles | PASS |
| XII. Findings Before Fixes | spec finding format adopted; none raised | PASS |
| Verification Rules | typecheck, build, deterministic tests, browser evidence | PASS |

Expected: AkariSP production changes 0; public API changes 0; runtime dependency changes 0;
TradingAgents agent semantics 0; external market-data dependencies 0.

**Post-design re-check**: unchanged — PASS on all rows.

## Project Structure

### Documentation (this feature)

```text
specs/003-langgraph-akarisp-minimal-graph/
├── spec.md
├── plan.md                 # this file
├── research.md             # Phase 0 (R1–R23)
├── data-model.md           # Phase 1
├── quickstart.md           # Phase 1
├── contracts/
│   ├── graph.md            # observable graph guarantees G1–G10, L1–L5
│   └── evidence.md         # Feature 003 evidence record
├── checklists/requirements.md
├── evidence/               # created during implementation
└── tasks.md                # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
index.html                    # NEW canonical page (Vite root = repo root)
src/
├── main.ts                   # NEW run owner + DOM + evidence record
├── graph/
│   ├── minimal-graph.ts      # NEW Annotation.Root state, 4 nodes, edges, buildMinimalGraph()
│   └── fixture.ts            # NEW committed neutral fixture (id minimal-graph-fixture@1)
└── integration/
    ├── akari-chat-model.ts   # unchanged (Feature 002)
    └── structured.ts         # unchanged, unused by Feature 003
test/
├── minimal-graph.test.ts     # NEW DETERMINISTIC_TEST: G1–G10
├── graph-integration.test.ts # NEW NODE_INTEGRATION (stand-in): L1–L5
├── standin.ts                # + STANDIN_FAIL marker rejection (test-only)
└── (Feature 002 tests unchanged)
e2e/
├── app.spec.ts               # NEW BROWSER_AUTOMATED: canonical page success, cancel, native→BLOCKED
├── harness.spec.ts           # URL '/' → '/harness/' only
└── prompt-api.spec.ts        # Feature 002 test URL → '/harness/'; NEW canonical-app native test
harness/                      # historical Feature 002 harness, unchanged, served at /harness/
vite.config.ts                # root/build removed; +index.html in dirty paths; +__LANGGRAPH_VERSION__
package.json                  # +@langchain/langgraph 1.4.18; +"dev": "vite"
docs/testing.md, docs/roadmap.md
```

**Structure Decision**: single project. `src/graph/` holds the only graph; `src/main.ts` is the
only runtime owner in the app. No `state.ts`/`nodes.ts`/`runtime.ts`/`events.ts` split: the graph
file is expected to stay well under ~100 lines. `fixture.ts` is separate so its identity and
content are reviewable on their own.

## Design

### `src/graph/minimal-graph.ts`

- `import { Annotation, StateGraph, START, END } from '@langchain/langgraph/web'` (R7).
- `State = Annotation.Root({ input, branchAResult, branchBResult, synthesis, decision })` (R2).
- `export type NodeEvent = { node; event: 'start' | 'done' | 'error'; seq }`.
- `buildMinimalGraph(model, onNode?)`: one local helper wraps each node — emits `start`, calls
  `model.invoke([new HumanMessage(prompt(state))], { signal: config.signal })`, counts the request
  for that node, emits `done` (returns `{ [key]: String(result.content) }`) or `error` (rethrows
  unchanged). Returns the compiled graph plus the per-node request counts.
- Prompts (user role, plain text, neutral):
  - branchA/B: summarize the given facts about `subject` in one sentence;
  - synthesize: combine summary A and summary B in two sentences;
  - decide: reply with one word — `POSITIVE`, `NEUTRAL` or `NEGATIVE` — for the tone of the
    synthesis. (A neutral label; not a trading decision; the answer is not evaluated.)

### `src/main.ts` (run owner)

1. Classify native availability first (`LanguageModel.availability()` only; never `create()`
   outside AkariSP, never download) — same classification as Feature 002.
2. `?provider=standin` → `await import('../test/standin.ts')`, install on `window`, expose
   `window.__standin = { hold, resume }`. Native is the default; the stand-in module is never
   loaded otherwise. `?runner=playwright` sets `runner`.
   `Run Graph` is rendered `disabled` and enabled only after steps 1–2 finish (added in T055: in
   real Chrome `availability()` resolves slowly and an early click would find no handler).
3. Native and not `MODEL_AVAILABLE` → record `BLOCKED`, `outcome: not-run`, no runtime created.
4. Run Graph (button disabled during a run):
   `controller = new AbortController()` → `runtime = await createRuntime({ limit: 1,
   queueCapacity: 32 })` → `model = new AkariChatModel({ runtime, onEvent })` (after the 2nd
   `start` event, poll ≤ 1 s until `active + queued === 2`, then take `fanOutSnapshot`; on timeout
   record the last snapshot as measured — the bridge emits `start` before `runtime.run()`) → `graph = buildMinimalGraph(model, onNode)` →
   `await graph.invoke({ input: FIXTURE }, { signal: controller.signal })`.
   Outcome: resolved → `success`; rejected with `controller.signal.aborted` → `cancelled`; else
   `failed`.
   `finally`: poll `runtime.snapshot()` until `active 0 && queued 0` (≤ 10 s) →
   `settledBeforeShutdown`, `snapshotBeforeShutdown` → `await runtime.shutdown()` →
   `snapshotAfterShutdown` → render record, `#status[data-state=done]`.
5. Cancel → `controller.abort(new Error('cancelled by user'))`.
6. A 180 s watchdog aborts the run the same way (page behavior, not AkariSP behavior) and is noted
   in `error`.

### Test additions

- `test/minimal-graph.test.ts`: fake `Runtime` with per-call deferreds (extends the Feature 002
  pattern); G1–G10 of [contracts/graph.md](contracts/graph.md).
- `test/graph-integration.test.ts`: real `createRuntime({ limit: 1 })` + `installStandIn()`; L1–L5.
- `test/standin.ts`: `prompt()` rejects immediately (regardless of `hold`) with a plain `Error`
  when the last message contains `STANDIN_FAIL` (one rule; Feature 002 prompts never contain it).
  Not a `DOMException InvalidStateError`: AkariSP's browser provider treats that as `broken`
  (`akarisp/dist/browser/runtime.js`), whereas a plain `Error` yields `TaskError('failed')` with
  the runtime staying `ready`.
- `e2e/app.spec.ts`: (a) `/?provider=standin` → Run → `success`, 4 nodes done, logical 4, fallback
  0, `fanOutSnapshot` `1/1`, `settledBeforeShutdown` true, class `BROWSER_AUTOMATED`;
  (b) `/?provider=standin` → `__standin.hold()` → Run → wait until `Runtime` shows active 1 queued
  1 → Cancel → `outcome: cancelled`, `result` absent, synthesize/decide not `done`,
  `settledBeforeShutdown` true, both model requests `cancelled`; (c) `/` in Playwright Chromium →
  `BLOCKED`, `not-run`. Records written to `testInfo.outputPath`.
- `e2e/prompt-api.spec.ts`: extract the existing launch into a local function; existing test opens
  `/harness/?runner=playwright`; new test opens `/?runner=playwright`, Run, asserts the SC-011
  record fields.

## Verification Gates

| Gate | Command / method | Evidence class |
|---|---|---|
| typecheck | `npm run typecheck` | — |
| build | `npm run build` (emits `dist/index.html` only) | — |
| deterministic | `npm test` → `minimal-graph.test.ts` | `DETERMINISTIC_TEST` |
| Node integration | `npm test` → `graph-integration.test.ts` | `NODE_INTEGRATION` (stand-in) |
| browser automated | `npm run test:browser` → `app.spec.ts` (+ Feature 002 harness regression) | `BROWSER_AUTOMATED` |
| real provider | `npm run test:prompt-api` or manual run of `/` | `REAL_BROWSER_PROMPT_API` / `BLOCKED` |
| static checks | `grep` for `akarisp` imports under `src/graph/` (0), `@langchain/langgraph` imports outside `src/graph/` (0), `AkariChatModel` diff vs `6c79c91` (empty), AkariSP files in diff (0), non-goal names (Market/News/Bull/Bear/Trader/Risk…, data APIs) in `src/` (0) | `STATIC_CODE_ANALYSIS` |

## Requirement → Evidence Map

| Req | Evidence path |
|---|---|
| FR-001 | `package.json`/lockfile diff: one new production dep `@langchain/langgraph` 1.4.18 exact; `npm ls` clean; research R1 |
| FR-002 | `npm ls @langchain/core` = 1.2.13 single copy |
| FR-003 | static: no AkariSP files changed; imports only from `akarisp` root |
| FR-004 | static: `src/graph/` imports no `akarisp`; G7 (all requests via `model.logicalRequests`) |
| FR-005 | static: `git diff 6c79c91 -- src/integration/akari-chat-model.ts` empty |
| FR-006 | G1, G3, G5; contracts/graph.md topology; code review |
| FR-007 | G1, G2 |
| FR-008 | G3, G4 |
| FR-009 | G5 |
| FR-010 | code review of `State` (5 keys, no reducer) |
| FR-011 | `fixture.ts` review; static: no fetch/URL in `src/` |
| FR-012 | L1, L5; `main.ts` review; e2e (a)(b) `snapshotAfterShutdown` closed |
| FR-013 | `runtimeOptions` in every record; L2 |
| FR-014 | static: `structured.ts` not imported by `src/graph`/`src/main.ts`; no `SystemMessage`; `fallbackRequests` 0 |
| FR-015 | G8, G9, L3, e2e (b) |
| FR-016 | G9, L3, e2e (b) `outcome: cancelled`, no `result` |
| FR-017 | G10, L4 |
| FR-018 | L3, L4, L5, e2e (a)(b) `settledBeforeShutdown` |
| FR-019 | record fields `nodes`, `nodeEvents`, `modelRequests`, `counts`, `fanOutSnapshot`, `lifecycle`; e2e (a) |
| FR-020 | record `counts` keys; `providerInvocations: "NOT EXPOSED"` asserted in e2e |
| FR-021 | record `concurrency` block asserted in e2e (a) |
| FR-022 | e2e (a)(b)(c) on `/`; build emits root `index.html`; no framework in `package.json` |
| FR-023 | e2e (a) `provider: standin`; (c) native default |
| FR-024 | `git diff 6c79c91 -- harness specs/002-*` empty; `harness.spec.ts` passes at `/harness/` |
| FR-025 | the four gates above, each record labelled |
| FR-026 | evidence contract fields asserted in e2e (a) and in the real record |
| FR-027 | research "Findings: none"; findings section kept in verification |
| SC-001 | FR-001 |
| SC-002 | G6, G7 |
| SC-003 | G1, G2 |
| SC-004 | G3, G4 |
| SC-005 | G5 |
| SC-006 | FR-004 |
| SC-007 | G8, G9, L3, e2e (b) |
| SC-008 | G10, L4 |
| SC-009 | L3, L4, L5 + e2e `settledBeforeShutdown` |
| SC-010 | e2e (a) success, (b) cancel |
| SC-011 | real record (`REAL_BROWSER_PROMPT_API`, `success`) or BLOCKED |
| SC-012 / SC-013 | static: no AkariSP changes; `akarisp` version unchanged |
| SC-014 | static non-goal name scan |
| SC-015 | static: no data-API hosts/`fetch` in `src/`; dependency list review |
| SC-016 | static: no new classes/modules beyond the listed files |
| SC-017 | single root `index.html`; no other new HTML entry |
| SC-018 | all gates |
| SC-019 | record `concurrency` block; wording review of evidence/docs |
| SC-020 | `providerInvocations: "NOT EXPOSED"` in every record |
| SC-021 | G7, e2e (a), real record `counts` (measured) |

Every FR/SC has an evidence path. Only SC-011 depends on the development machine's native model.

## Completion Model (from spec, unchanged)

- **Implementation complete**: SC-001–SC-010 and SC-012–SC-021 pass (source, deterministic, Node
  integration, browser automated, static checks).
- **Real-provider validation**: `REAL_BROWSER_PROMPT_API` success record, or `BLOCKED`.
- **Feature complete**: implementation complete **and** SC-011 passes. If the native model is
  unavailable: Feature BLOCKED / INCOMPLETE.

## Risks

- **Native run duration**: four sequential-ish native requests (limit 1) may take tens of
  seconds; the page watchdog (180 s) and Playwright timeout cover it.
- **Native output variability**: the Decision label may not be one of the three words; content is
  not evaluated, so this cannot fail the Feature.
- **LangGraph caller-first rejection (O-2)**: if a future LangGraph version changed signal
  derivation, L3/e2e (b) `settledBeforeShutdown` would catch it.
- **Bundle size** warning from Vite: accepted, not a goal.

## Self-review

1. Speculative abstraction — none (one builder, one owner function).
2. AkariSP responsibility growth — none; bridge unchanged.
3. Feature 004 work — none; neutral nodes/prompts.
4. Hidden network/market data — none; `langgraph-sdk` unused.
5. Node evidence as browser evidence — layers labelled; SC-010 uses Playwright.
6. Stand-in as native — rule in evidence contract; asserted in e2e.
7. Fan-out as native parallelism — `concurrency.nativeProvider: not observed`.
8. Provider invocations inferred — `NOT EXPOSED` everywhere.
9. Caller rejection vs settlement — `settledBeforeShutdown` measured before `shutdown()`.
10. Feature 002 evidence rewritten — no; only e2e URLs change.
11. Reducer/message machinery — none.
12. Remembered APIs — every API verified in 1.4.18 `dist/` or by experiment.

## Complexity Tracking

No constitution violations to justify.
