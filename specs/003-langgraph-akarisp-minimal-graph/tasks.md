---

description: "Task list for Feature 003 — LangGraph.js ↔ AkariSP Minimal Graph Integration"
---

# Tasks: Feature 003 — LangGraph.js ↔ AkariSP Minimal Graph Integration

**Input**: `specs/003-langgraph-akarisp-minimal-graph/` — spec.md, plan.md, research.md,
data-model.md, contracts/graph.md, contracts/evidence.md, quickstart.md

**Baseline**: branch `003-langgraph-akarisp-minimal-graph` @ `6c79c91` (verified at task
generation: clean tracked tree; untracked Spec Kit/Claude tooling files and this feature
directory only — leave the tooling files untouched).

**Tests**: required by the spec (FR-025 evidence layers) — test tasks are included and precede or
accompany the code they prove.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files, no dependency on an incomplete task.
- **[USn]**: user story from spec.md (US1 run graph, US2 independent branches, US3 join, US4
  sequence, US5 cancel/fail safely).
- G1–G10 / L1–L5 refer to [contracts/graph.md](contracts/graph.md); record fields refer to
  [contracts/evidence.md](contracts/evidence.md).

## Two invariants every phase must keep

> **INV-A — explicit signal forwarding.** In the browser, LangGraph does **not** propagate the
> graph's `AbortSignal` into a model call made inside a node (research R7, O-1). Every node calls
> `model.invoke(msgs, { signal: config.signal })`. `src/integration/akari-chat-model.ts` is **not**
> changed for this. All graph code and tests import **`@langchain/langgraph/web`** (never the root
> entry, whose AsyncLocalStorage would mask a missing forward in Node).
>
> **INV-B — caller rejection ≠ task settlement.** LangGraph may reject the caller before in-flight
> work settles (R8/R9, O-2), and `runtime.shutdown()` itself cancels remaining work. Cleanup is
> proven only by `active 0, queued 0` observed **with `snapshot().state === 'ready'`, before
> `shutdown()`** → `settledBeforeShutdown: true`. A post-shutdown `closed 0/0` is never settlement
> evidence.

---

## Phase 1: Setup — baseline and dependency lock

**Purpose**: auditable start; the one new dependency pinned before any graph code.

- [X] T001 Record baseline in `specs/003-langgraph-akarisp-minimal-graph/verification.md` (new): output of `git branch --show-current`, `git rev-parse HEAD` (expect `6c79c91…`), `git status --short`; `node -v`, `npm -v`
- [X] T002 Record pre-change dependency and config facts in `specs/003-langgraph-akarisp-minimal-graph/verification.md`: `npm ls akarisp @langchain/core @langchain/langgraph` (expect akarisp 0.1.0-alpha.2, core 1.2.13, langgraph absent), current `vite.config.ts` `root: 'harness'`, absence of root `index.html` and `src/main.ts`
- [X] T003 Record `shasum -a 256` of every file under `harness/` and `specs/002-langchain-akarisp-integration-validation/` (including `evidence/*.json`) into `specs/003-langgraph-akarisp-minimal-graph/verification.md` as the Feature 002 byte-for-byte baseline (FR-024)
- [X] T004 Install `npm install --save-exact @langchain/langgraph@1.4.18` in `package.json`/`package-lock.json`; completion: `package.json` `dependencies` has exactly `"@langchain/langgraph": "1.4.18"` added, `@langchain/core` still `1.2.13`, no `zod` entry added (FR-001, FR-002, SC-001)
- [X] T005 Verify install: `npm ls @langchain/langgraph @langchain/core akarisp zod` shows langgraph 1.4.18, a single deduped `@langchain/core@1.2.13`, akarisp 0.1.0-alpha.2, `zod@4.6.5` deduped; no peer warnings in install output; record output and the list of lockfile packages added (expected 10 per research R1; record the actual list truthfully) in `specs/003-langgraph-akarisp-minimal-graph/verification.md`
- [X] T006 Confirm `npm run typecheck`, `npm test`, `npm run build` still pass unchanged after the install (no source change yet); record in `specs/003-langgraph-akarisp-minimal-graph/verification.md`

**Checkpoint A0**: dependency graph fixed; no graph code; AkariSP changes 0.

---

## Phase 2: Foundational — fixture, graph core, test scaffolding

**Purpose**: the graph module and the controllable fake runtime every later test uses.

- [X] T007 [P] Create `src/graph/fixture.ts` exporting `FIXTURE = { id: 'minimal-graph-fixture@1', subject, branchAFacts, branchBFacts }` with neutral, non-financial content (no company ticker, no market terms); data-model rule: "`branchBFacts` … must not appear in Synthesis/Decision prompts except through branch outputs" (FR-011)
- [X] T008 [P] Add the failure marker to `test/standin.ts`: when the last message contains `STANDIN_FAIL`, `prompt()` rejects **immediately, regardless of `hold`**, with a plain `new Error('stand-in failure')` — not a `DOMException InvalidStateError`, which AkariSP's browser provider classifies as `broken` (`akarisp/dist/browser/runtime.js`); a plain `Error` yields `TaskError('failed')` with the runtime staying `ready`. One rule only, no generic error routing; update the file header comment; completion: existing `npm test` still passes (Feature 002 prompts never contain the marker)
- [X] T009 Create `src/graph/minimal-graph.ts`: `import { Annotation, StateGraph, START, END } from '@langchain/langgraph/web'`; `State = Annotation.Root({ input: Annotation<MinimalGraphInput>, branchAResult: Annotation<string>, branchBResult: Annotation<string>, synthesis: Annotation<string>, decision: Annotation<string> })` — no reducer, no messages state (FR-010)
- [X] T010 In `src/graph/minimal-graph.ts` add `export type NodeEvent = { node: 'branchA' | 'branchB' | 'synthesize' | 'decide'; event: 'start' | 'done' | 'error'; seq: number }` and `buildMinimalGraph(model: AkariChatModel, onNode?: (e: NodeEvent) => void)` with one local node helper that: emits `start`; calls **`model.invoke([new HumanMessage(prompt)], { signal: config.signal })`** (INV-A; node signature `(state, config)` typed with LangGraph's `LangGraphRunnableConfig`); increments that node's `modelRequests`; emits `done` and returns `{ [key]: String(result.content) }`, or emits `error` and rethrows unchanged. Return `{ graph, modelRequests }` (FR-004, FR-015, FR-019)
- [X] T011 In `src/graph/minimal-graph.ts` add the four nodes and static edges exactly: `addEdge(START,'branchA')`, `addEdge(START,'branchB')`, `addEdge(['branchA','branchB'],'synthesize')`, `addEdge('synthesize','decide')`, `addEdge('decide',END)`; prompts per contracts/graph.md "Prompt dependencies" (user-role only, plain text, neutral; decide asks for one of POSITIVE/NEUTRAL/NEGATIVE tone labels); no `Send`, conditional edges, subgraphs, retry, structured helper, `SystemMessage`, tools (FR-006, FR-007, FR-009, FR-014)
- [X] T012 Create `test/minimal-graph.test.ts` header (`DETERMINISTIC_TEST`, fake Runtime behind the real `AkariChatModel`) and a local `fakeRuntime()` helper: each `run(input, {signal})` records `{ input, signal }` and returns a deferred with `resolve(output)` / `reject(err)`; on signal abort it rejects `new TaskError('cancelled', …)`, and **immediately if the signal is already aborted**; exposes `calls` and a bounded `settled(ms = 2000)` that resolves when all run promises settled and otherwise fails with `assert.fail('run() not settled — orphaned')` — never an unbounded wait. Extends the Feature 002 fake pattern, no test-only model class (R17)
- [X] T013 `npm run typecheck` passes with the new files

---

## Phase 3: User Story 1 — graph completes through AkariChatModel (P1) — deterministic part

**Goal**: final state and accounting through `LangGraph → AkariChatModel → Runtime`.
**Independent test**: `node --test test/minimal-graph.test.ts` success cases.

- [X] T014 [US1] Test G6 in `test/minimal-graph.test.ts`: resolve every `run()` with distinct outputs (`'rA'`, `'rB'`, `'rS'`, `'rD'` keyed by prompt), assert the resolved state has `branchAResult`, `branchBResult`, `synthesis`, `decision` equal to those outputs and `input` unchanged (SC-002)
- [X] T015 [US1] Test G7 in `test/minimal-graph.test.ts`: after a success run assert `model.logicalRequests === 4` (measured from the bridge counter), `modelRequests` per node all `1` and their sum equals `model.logicalRequests`, each node `executions === 1` (count of `start` NodeEvents); fallback: the graph has no fallback path, observed value `0` — measured values, never rewritten (SC-021, FR-019, FR-020)
- [X] T016 [US1] Test in `test/minimal-graph.test.ts`: every `fakeRuntime().calls[i]` came through `AkariChatModel` (4 calls, each input a single `{ role: 'user', content }` message — no `system` role) (FR-004, FR-014, SC-006)

---

## Phase 4: User Story 2 — independent branches / fan-out (P1)

**Goal**: both branches start from the input without waiting for each other.
**Independent test**: fan-out tests in `test/minimal-graph.test.ts`.

- [X] T017 [US2] Test G1 in `test/minimal-graph.test.ts`: invoke, release nothing, wait until `calls.length === 2`; assert the two calls are Branch A and Branch B (identified by their facts) and neither has resolved — graph-level concurrent submission only; the test name/comment must not claim provider parallelism (FR-007, SC-003)
- [X] T018 [US2] Test G2 in `test/minimal-graph.test.ts`: Branch A prompt contains `FIXTURE.branchAFacts` and not `branchBFacts`; Branch B prompt the reverse; neither contains any branch output string (FR-007, SC-003)

---

## Phase 5: User Story 3 — fan-in barrier (P1)

**Goal**: Synthesis once, only after both branches, consuming both.
**Independent test**: barrier tests in `test/minimal-graph.test.ts`.

- [X] T019 [US3] Test G3 (A first) in `test/minimal-graph.test.ts`: resolve Branch A, hold Branch B, yield several ticks; assert `calls.length === 2` and synthesize `start` count `0`; resolve B; assert synthesize `start` count becomes `1` (FR-008, SC-004)
- [X] T020 [US3] Test G3 (B first) in `test/minimal-graph.test.ts`: same with completion order reversed; same assertions (SC-004)
- [X] T021 [US3] Test G4 in `test/minimal-graph.test.ts`: the Synthesis `run()` input contains both branch outputs; after the run synthesize `executions === 1` (FR-008, SC-004)

---

## Phase 6: User Story 4 — sequential dependency (P2)

**Goal**: Decision after Synthesis, consuming only the synthesis.
**Independent test**: sequence test in `test/minimal-graph.test.ts`.

- [X] T022 [US4] Test G5 in `test/minimal-graph.test.ts`: `decide:start.seq > synthesize:done.seq`; Decision `run()` input contains the synthesis output and contains neither `branchAFacts` nor `branchBFacts`; the Decision call is not issued while the Synthesis call is unresolved (FR-009, SC-005)

---

## Phase 7: User Story 5 — cancellation and failure, deterministic (P2)

**Goal**: abort and branch failure reach the caller; no success; tasks settle.
**Independent test**: cancel/failure tests in `test/minimal-graph.test.ts`.

- [X] T023 [US5] **Regression A** test G8 in `test/minimal-graph.test.ts`: invoke with a caller `AbortController`, wait for 2 calls, assert **every** `calls[i].signal` is defined (not `undefined`); abort; assert every recorded signal is `aborted` (INV-A, FR-015, SC-007)
- [X] T024 [US5] Test G9 in `test/minimal-graph.test.ts`: with A and B in flight, abort → `graph.invoke` rejects (assert it never resolves; record the rejection value's type — research: the caller's abort reason); **then separately** `await settled(2000)` (bounded; fails `run() not settled — orphaned` on timeout) and assert both run promises rejected with `TaskError` code `cancelled`; synthesize/decide `start` count `0` (INV-B, FR-016, SC-007)
- [X] T025 [US5] Test G10 in `test/minimal-graph.test.ts`: reject Branch B's `run()` with `const err = new TaskError('failed', …)` while A is in flight → `invoke` rejects with `e === err` (same object, code `failed`); synthesize/decide `start` count `0`; then `await settled(2000)` (bounded) and assert A's signal `aborted` and A's run settled — this is the deterministic proof of sibling cancellation on failure (FR-017, SC-008)
- [X] T026 [US5] Mutation check for Regression A (not committed): (1) temporarily change the node call in `src/graph/minimal-graph.ts` to `model.invoke([...])` without options; (2) run `node --test test/minimal-graph.test.ts` and confirm the expected failures — **T023: signal `undefined` assertion failure; T024: `run() not settled — orphaned` bounded-wait failure** (a hang counts as a task failure, not a pass); (3) restore the exact line; (4) re-run and confirm all tests PASS; (5) `git diff -- src/graph/minimal-graph.ts` shows no mutation trace; record steps 2–5 in `specs/003-langgraph-akarisp-minimal-graph/verification.md`
- [X] T027 Static check recorded in `specs/003-langgraph-akarisp-minimal-graph/verification.md`: `grep -rnE "from ['\"]@langchain/langgraph['\"]" src test e2e` = 0 (only `/web` imported, quote-independent); `grep -rn "akarisp" src/graph` = 0

**Checkpoint A**: `npm run typecheck` and `npm test` pass; topology, fan-out, fan-in, state flow,
sequence, accounting, signal forwarding and failure proven without AkariSP or a browser.

---

## Phase 8: Node integration — real AkariSP + stand-in (US1, US2, US5)

**Evidence class**: `NODE_INTEGRATION (stand-in)` — not browser evidence, not Prompt API evidence.

- [X] T028 Create `test/graph-integration.test.ts` with header comment stating the evidence class, and a local owner helper: `installStandIn()`, count `createRuntime({ limit: 1, queueCapacity: 32 })` calls, `new AkariChatModel({ runtime, onEvent })`, `buildMinimalGraph(model, onNode)`, and a `settle(runtime)` poll returning `true` only when `snapshot()` is `{ state: 'ready', active: 0, queued: 0 }` within 2 s; `finally` resumes the stand-in, calls `shutdown()`, uninstalls
- [X] T029 [US1] Test L1 in `test/graph-integration.test.ts`: success on the real runtime; `createRuntime` called exactly once; `model.logicalRequests === 4`; all four bridge requests `done`; final state has the four result keys (FR-012, SC-002)
- [X] T030 [US2] Test L2 in `test/graph-integration.test.ts`: `standin.hold()`, invoke, wait for 2 bridge `start` events **and then poll (≤ 1 s) until `active + queued === 2`** (the bridge emits `start` before `runtime.run()`, so event #2 alone is too early); assert `snapshot()` `active 1, queued 1, limit 1`; `resume()`; success. Comment: graph fan-out + AkariSP backpressure, not native parallelism (FR-013, FR-021, SC-019)
- [X] T031 [US5] **Regression B** test L3 in `test/graph-integration.test.ts`: in the L2 state abort the caller → assert `invoke` rejects (no result); **before** `shutdown()` assert `settle(runtime) === true` (state `ready`, 0/0) and both bridge requests ended `errorKind: 'cancelled'`; only then `shutdown()` → `closed 0/0` (INV-B, FR-015, FR-016, FR-018, SC-007, SC-009)
- [X] T032 [US5] Test L4 in `test/graph-integration.test.ts`: input copy whose `branchBFacts` contains `STANDIN_FAIL` (no hold); required assertions: `invoke` rejects with a `TaskError` code `failed`; synthesize/decide `start` count `0`; `snapshot().state === 'ready'`; **before** `shutdown()` `settle(runtime) === true`; then `shutdown()`. Branch A's bridge outcome is recorded as an observation only (under limit 1 A normally completes before B reaches the model); sibling cancellation is proven by T025 (G10) (INV-B, FR-017, FR-018, SC-008, SC-009)
- [X] T033 [US1] Test L5 in `test/graph-integration.test.ts`: after a success run, `settle(runtime) === true`, `shutdown()` twice resolves, `snapshot()` `closed 0/0` (FR-012, FR-018)
- [X] T034 Mutation check for Regression B (not committed): (1) temporarily move `shutdown()` before the `settle()` assertion in T031; (2) confirm the test **fails** (state `closed`, not `ready`); (3) restore; (4) re-run `npm test` and confirm PASS; (5) `git diff -- test/graph-integration.test.ts` shows no mutation trace; record steps 2–5 in `specs/003-langgraph-akarisp-minimal-graph/verification.md`. The production ordering in `src/main.ts` (T041) is guarded by T051 (mutation-checked in T053)

**Checkpoint B**: `npm run typecheck`, `npm test` pass; record `NODE_INTEGRATION (stand-in)` results.

---

## Phase 9: User Story 1 — canonical root application (P1)

**Goal**: `index.html → src/main.ts → LangGraph → AkariChatModel → AkariSP → browser model`.

- [X] T035 [US1] Edit `vite.config.ts`: remove `root: 'harness'` and the `build` block (defaults: repo root, `dist/`); add `index.html` to the `+dirty` code paths; add `__LANGGRAPH_VERSION__: JSON.stringify(version('@langchain/langgraph'))` to `define` (FR-022)
- [X] T036 [US1] Edit `package.json` scripts: add `"dev": "vite"`; keep `"harness": "vite"` unchanged (FR-022)
- [X] T037 [US1] Create root `index.html`: title "BrowserTradingAgents", availability line, buttons `Run Graph` and `Cancel`, a node table with rows `branchA`/`branchB`/`synthesize`/`decide` showing status text, `#result`, `#runtime` (state/active/queued), `#status[data-state]` (`idle|running|done`), `<pre id="evidence">`, `<script type="module" src="/src/main.ts">`; no framework, no styling work (FR-022)
- [X] T038 [US1] Create `src/main.ts` — environment: `declare` the four `__…__` build constants; classify native availability **before** any stand-in is installed (same mapping as `harness/main.ts`, `availability()` only, never `create()`/download); `provider = ?provider=standin ? 'standin' : 'native'`; `runner = ?runner=playwright ? 'playwright' : 'manual'` (FR-023, FR-026)
- [X] T039 [US1] In `src/main.ts`, stand-in mode only: `await import('../test/standin.ts')`, install on `window`, expose `window.__standin = { hold, resume }`; native mode never loads the module (FR-023)
- [X] T040 [US1] In `src/main.ts`, the run function: disable `Run Graph`; `controller = new AbortController()`; `runtime = await createRuntime({ limit: 1, queueCapacity: 32 })`; `model = new AkariChatModel({ runtime, onEvent })` (after bridge `start` #2, poll ≤ 1 s until `active + queued === 2`, then capture `fanOutSnapshot = runtime.snapshot()`; on timeout record the last snapshot as measured, never adjusted); `{ graph, modelRequests } = buildMinimalGraph(model, onNode)`; `await graph.invoke({ input: FIXTURE }, { signal: controller.signal })`; outcome `success` / `cancelled` (rejected and `controller.signal.aborted`) / `failed` (FR-012, FR-015, FR-016, FR-017)
- [X] T041 [US5] In `src/main.ts` `finally` block, in this order (INV-B): poll `runtime.snapshot()` up to 10 s for `state === 'ready' && active === 0 && queued === 0` → `settledBeforeShutdown` + `snapshotBeforeShutdown`; **then** `await runtime.shutdown()` → `snapshotAfterShutdown`; re-enable `Run Graph`; set `#status` `done`. A new run always creates a new runtime/model/controller (FR-018)
- [X] T042 [US5] In `src/main.ts`: `Cancel` → `controller.abort(new Error('cancelled by user'))` (no-op when idle); 180 s watchdog aborts the same controller and notes it in `error` (FR-015)
- [X] T043 [US1] In `src/main.ts`: native provider with availability ≠ `MODEL_AVAILABLE` → no runtime created, record `evidenceClass: 'BLOCKED'`, `outcome: 'not-run'`, `blocked: { reason, stillVerified, unverified }`, nodes `waiting` (FR-025)
- [X] T044 [US1] In `src/main.ts`: live UI updates from `onNode` (node status text) and bridge events (runtime state/active/queued) (FR-019, FR-022)
- [X] T045 [US1] In `src/main.ts`: build the evidence record exactly per contracts/evidence.md — `feature`, `evidenceClass` (`standin`→`BROWSER_AUTOMATED`; native+available→`REAL_BROWSER_PROMPT_API`; else `BLOCKED`), `provider`, `runner`, `environment`, `revision` (incl. `langgraph`), `fixture: FIXTURE.id`, `prompts`, `graph.topology`/`graph.entry: '@langchain/langgraph/web'`, `runtimeOptions`, `outcome`, `error`, `nodes` (status/executions/modelRequests), `nodeEvents`, `modelRequests` (bridge events), `counts` (`graphRuns 1`, `nodeExecutions`, `logicalRequests = model.logicalRequests`, `fallbackRequests 0` measured, `providerInvocations: 'NOT EXPOSED'`), `concurrency` (`graph` submission text, `akarisp.fanOutSnapshot`, `nativeProvider: 'not observed (out of scope)'`), `lifecycle`, `result` only when `outcome === 'success'` (FR-019, FR-020, FR-021, FR-026, SC-019, SC-020, SC-021)
- [X] T046 [US1] `npm run typecheck` and `npm run build` pass; `ls dist` shows `index.html` and no harness page; record in `specs/003-langgraph-akarisp-minimal-graph/verification.md` (SC-017, SC-018)

---

## Phase 10: Preserve Feature 002 harness (historical)

- [X] T047 Edit `e2e/harness.spec.ts`: change only the two page URLs to `/harness/?provider=standin` and `/harness/`; completion: diff touches URL lines only (FR-024)
- [X] T048 Edit `e2e/prompt-api.spec.ts`: move the existing launch/clone code into a local `launchNativeChrome(testInfo)` function in the same file; change the Feature 002 test URL to `/harness/?runner=playwright`; no behavior change otherwise (FR-024)
- [X] T049 Re-hash `harness/` and `specs/002-langchain-akarisp-integration-validation/` and compare with T003; completion: identical; record in `specs/003-langgraph-akarisp-minimal-graph/verification.md` (FR-024)

---

## Phase 11: Browser automated — canonical page, stand-in (US1, US5)

**Evidence class**: `BROWSER_AUTOMATED`, `provider: standin` — never Prompt API evidence.

- [X] T050 [US1] Create `e2e/app.spec.ts` test (a): open `/?provider=standin`, click `Run Graph`, wait `#status[data-state=done]`, parse `#evidence`; assert `evidenceClass 'BROWSER_AUTOMATED'`, `provider 'standin'`, `outcome 'success'`, all four nodes `done` with `executions 1`, `counts.logicalRequests === 4` and `fallbackRequests === 0` (observed; no fallback path), `providerInvocations 'NOT EXPOSED'`, `concurrency.akarisp.fanOutSnapshot` `{active:1, queued:1}` (taken per the contract's `active + queued === 2` bounded poll, not at bridge event #2), `concurrency.nativeProvider` not a parallelism claim, `lifecycle.settledBeforeShutdown true` with `snapshotBeforeShutdown.state 'ready'`, `snapshotAfterShutdown.state 'closed'`, `revision.langgraph '1.4.18'`, `environment.availability !== 'MODEL_AVAILABLE'`; write the record to `testInfo.outputPath('evidence.json')` (SC-010, SC-019, SC-020, SC-021)
- [X] T051 [US5] `e2e/app.spec.ts` test (b) — **Regression B in the browser**: open `/?provider=standin`, `page.evaluate(() => __standin.hold())`, click `Run Graph`, wait until `#runtime` shows active 1 queued 1, click `Cancel`, then `__standin.resume()`; assert `outcome 'cancelled'`, no `result`, synthesize/decide not `done`, both `modelRequests` entries `errorKind 'cancelled'`, `lifecycle.settledBeforeShutdown true` and `snapshotBeforeShutdown.state 'ready'` (INV-A + INV-B in the real browser bundle, where implicit propagation does not exist) (SC-007, SC-009, SC-010)
- [X] T052 [US1] `e2e/app.spec.ts` test (c): open `/` in Playwright Chromium (no model) → `evidenceClass 'BLOCKED'`, `outcome 'not-run'`, `blocked.reason` contains the availability, nodes all `waiting` (FR-023, FR-025)
- [X] T053 Run `npm run test:browser`; completion: `app.spec.ts` (3) and `harness.spec.ts` (2) pass. Then mutation check for the production ordering (not committed): (1) temporarily move `await runtime.shutdown()` in `src/main.ts` before the settlement poll; (2) confirm T051 (and T050) **fail** (`snapshotBeforeShutdown.state` is `closed` / `settledBeforeShutdown` false); (3) restore; (4) re-run `npm run test:browser` → PASS; (5) `git diff -- src/main.ts` shows no mutation trace. Record counts and steps 2–5 in `specs/003-langgraph-akarisp-minimal-graph/verification.md`
- [X] T054 Copy the T050 record to `specs/003-langgraph-akarisp-minimal-graph/evidence/browser-automated-2026-MM-DD.json` deliberately (actual run date)

**Checkpoint C**: `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser` pass →
Implementation status COMPLETE; native-provider gate still open.

---

## Phase 12: Native Prompt API (US1) — gate SC-011

Do not start before Checkpoint C is green.

- [X] T055 [US1] Add to `e2e/prompt-api.spec.ts` a canonical-app test using `launchNativeChrome`: open `/?runner=playwright`, `Run Graph`, wait for done (9 min timeout); write the record to `testInfo.outputPath('evidence.json')`; assert `evidenceClass 'REAL_BROWSER_PROMPT_API'`, `provider 'native'`, `environment.availability 'MODEL_AVAILABLE'`, `runner 'playwright'`, `outcome 'success'`, four nodes `done`, `lifecycle.settledBeforeShutdown true`; do **not** assert output wording or `logicalRequests === 4` (measured, validated in T058)
- [X] T056 [US1] Update `docs/testing.md`: `npm run dev` serves the canonical app at `/`; Feature 002 harness at `/harness/` (`npm run harness` unchanged); new `app.spec.ts` / canonical native test rows; evidence classes of each
- [ ] T057 [US1] **MANUAL — do not auto-check.** In a compatible real Google Chrome with `MODEL_AVAILABLE`, run the canonical app on the native Prompt API — either `npm run test:prompt-api` (runner `playwright`, after `npm run prepare:prompt-api`) or `npm run dev` → open `http://localhost:5173/` → `Run Graph` (runner `manual`) — and provide the generated JSON. If the model is unavailable, provide the `BLOCKED` record instead. No evidence is fabricated or inferred from stand-in runs.
- [ ] T058 [US1] Validate the supplied record against contracts/evidence.md: `revision` (sha, no `+dirty` for the gate run), versions (akarisp 0.1.0-alpha.2, core 1.2.13, langgraph 1.4.18), `provider native`, `MODEL_AVAILABLE`, `fixture minimal-graph-fixture@1`, `runtimeOptions {1, 32}`, node statuses/order (A,B before synthesize before decide), `counts.logicalRequests` and `fallbackRequests` **as measured** (expected 4 / 0; if different: keep the value, investigate, record), `settledBeforeShutdown`, `result` present; output wording is not evaluated. Save as `specs/003-langgraph-akarisp-minimal-graph/evidence/real-browser-<date>.json` (SC-011, SC-021)

---

## Phase 13: Polish — findings, final verification, coverage, completion record

Do not start T063 before T057/T058 reached PASS or the spec-defined BLOCKED state.

- [ ] T059 Findings review in `specs/003-langgraph-akarisp-minimal-graph/verification.md`: every failure/deviation met during implementation written in the spec's Finding format; record O-1 (browser entry: no implicit signal propagation) and O-2 (caller rejects before tasks settle) as observations, not AkariSP change requests; also record, if observed, the spec edge cases not covered by dedicated tests (abort before the run starts, abort during Synthesis/Decision, empty model response) as observations only; `Core change required` stays NO without evidence (FR-027)
- [ ] T060 Clean verification: `npm ci`, `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser`; record exact pass/fail counts; `npm ls akarisp @langchain/core @langchain/langgraph` = 0.1.0-alpha.2 / 1.2.13 / 1.4.18 (SC-018)
- [ ] T061 Static scope audit recorded in `specs/003-langgraph-akarisp-minimal-graph/verification.md`: `git diff 6c79c91 -- src/integration/` empty (FR-005); `akarisp` imported only as the package root (FR-003); no AkariSP files in the diff (SC-012, SC-013); `grep -rniE "market analyst|news analyst|bull|bear|trader|risk|research manager" src` = 0 (SC-014); no `fetch(`/URLs/data-API names in `src/`, no new data dependency (SC-015); no classes/modules beyond the plan's files, no `Send`/`addConditionalEdges`/checkpointer/`retryPolicy`/tools (SC-016); single root `index.html`, no other new HTML entry (SC-017); T049 hashes unchanged (FR-024)
- [ ] T062 [P] Update `docs/roadmap.md`: Feature 003 row status and carry-over observations O-1/O-2 (no Feature 004 work)
- [ ] T063 Requirement coverage table FR-001…FR-027 and SC-001…SC-021 in `specs/003-langgraph-akarisp-minimal-graph/verification.md`, each row → task(s) and concrete evidence (test name, record file, static check or manual evidence); no row marked complete without evidence
- [ ] T064 Completion record at the end of `specs/003-langgraph-akarisp-minimal-graph/verification.md` with: BrowserTradingAgents revision; AkariSP 0.1.0-alpha.2; LangChain core 1.2.13; LangGraph 1.4.18; import surface `@langchain/langgraph/web`; AkariSP production/API changes 0/0; TradingAgents agent semantics 0; external market dependencies 0; typecheck/build/deterministic/Node integration/browser automated PASS|FAIL; REAL_BROWSER_PROMPT_API PASS|BLOCKED|NOT RUN; fan-out, fan-in, Synthesis exactly once, Decision dependency, explicit signal forwarding, controlled failure, settled-before-shutdown after cancellation, settled-before-shutdown after failure — verified|not verified; orphaned active/queued (observed); logical requests (observed); fallback requests (observed); provider invocations NOT EXPOSED; native provider concurrency NOT CLAIMED; Implementation status; Real-provider validation; Feature status per the spec's Completion Model (COMPLETE only with SC-011 PASS; otherwise BLOCKED / INCOMPLETE)

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T006) → Phase 2 (T007–T013)
  → Phases 3–7 deterministic (T014–T027)      = Checkpoint A
  → Phase 8 Node integration (T028–T034)      = Checkpoint B
  → Phase 9 canonical app (T035–T046)
  → Phase 10 harness preservation (T047–T049)
  → Phase 11 browser automated (T050–T054)    = Checkpoint C (implementation complete)
  → Phase 12 native gate (T055–T058, T057 MANUAL)
  → Phase 13 (T059–T064)
```

- User stories share one graph file, so their phases run in order US1 → US2 → US3 → US4 → US5
  inside `test/minimal-graph.test.ts` (same file → no [P]).
- T026 needs T023/T024; T034 needs T031; T041 needs T040; T051 needs T039 and T041;
  T055 needs T048 (shared launch function); T063/T064 need T058 (PASS or BLOCKED).

## Parallel Opportunities

- T007 (`src/graph/fixture.ts`) ‖ T008 (`test/standin.ts`) — independent files, no dependency.
- T062 (`docs/roadmap.md`) ‖ T059–T061.
- Everything else touches a shared file or depends on the preceding behavior; not marked [P].

## Implementation Strategy

1. **Checkpoint A** first: the graph's semantics, INV-A and failure propagation are proven against a
   fake runtime before any runtime or browser is involved.
2. **Checkpoint B**: the same graph on the real AkariSP runtime proves backpressure and INV-B.
3. **Checkpoint C**: the canonical page proves the browser bundle (where implicit propagation does
   not exist) behaves the same → implementation complete.
4. **Native gate** (T057 manual): one successful real graph run → Feature complete; otherwise
   BLOCKED / INCOMPLETE.

## Notes

- AkariSP modification tasks: 0. Feature 004 / TradingAgents agent tasks: 0.
- No task claims native-provider parallelism or infers provider invocation counts.
- Committed evidence is copied deliberately (T054, T058); routine runs write to `test-results/`.
- Mutation checks (T026, T034) are run and reverted; only their results are committed.

## Phase 14: Convergence

- [X] T065 In `src/main.ts` `runGraph`, handle a rejected `createRuntime()` (AkariSP creates the warm base session eagerly, so `LanguageModel.create` failures surface there): today it escapes `run()`, leaving `#status` `running`, `Run Graph` disabled, no evidence record and the watchdog timer pending; record `outcome: 'failed'` with `error`, clear the watchdog, re-enable Run, and skip settle/shutdown when no runtime exists — per FR-022, FR-019, plan: `src/main.ts` run owner step 4 (partial)
- [ ] T066 After the implementation commit (needed for T057/T058), regenerate the `BROWSER_AUTOMATED` record with `npm run test:browser` and save it as `specs/003-langgraph-akarisp-minimal-graph/evidence/browser-automated-<date>-<sha>.json`; the current `browser-automated-2026-09-28.json` was produced on `6c79c91+dirty` before the Run-button readiness fix and the poll simplification, so it does not describe the committed code; note both files in `verification.md` — per Constitution VII, T054 (partial)
- [X] T067 Update `specs/003-langgraph-akarisp-minimal-graph/contracts/evidence.md` `fanOutSnapshot` rule: polling also stops when the graph run ends (`src/main.ts`), not only at the 1 s bound — per plan: fan-out snapshot decision / H1 (partial)
- [X] T068 Record in `specs/003-langgraph-akarisp-minimal-graph/plan.md` (Design → `src/main.ts`) and `quickstart.md` that `Run Graph` stays disabled until availability classification and the optional stand-in are ready (added during T055 to fix a click-before-handler race); currently documented only in `verification.md` — per FR-022, plan: `src/main.ts` design (unrequested)
