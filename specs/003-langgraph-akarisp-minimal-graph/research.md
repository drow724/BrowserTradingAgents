# Research: Feature 003 — LangGraph.js ↔ AkariSP Minimal Graph Integration

**Date**: 2026-09-28 | **Branch**: `003-langgraph-akarisp-minimal-graph` | **Start**: `6c79c91`

Method: registry queries (`npm view`), declarations and compiled source of the selected package,
and throw-away experiments run in a scratchpad copy of the repository (`package.json`,
`package-lock.json`, `src/`, `test/` copied; `npm ci` then `npm install --save-exact
@langchain/langgraph@1.4.18`). The repository's own `package.json`/`package-lock.json` were not
modified during planning. Experiments used the real `AkariChatModel`, a fake `Runtime`, and the
real `akarisp@0.1.0-alpha.2` with the Feature 002 stand-in `LanguageModel`. They are research
proof only; the implementation re-proves each result in committed tests.

Nothing here comes from remembered LangGraph APIs; every API named below was checked in
`@langchain/langgraph@1.4.18`'s published `dist/`.

## R1 — Exact LangGraph version and dependency compatibility

Registry (queried 2026-09-28):

| Query | Result |
|---|---|
| `dist-tags` | `latest: 1.4.18`, `rc: 1.4.18-rc.0`, `next: 1.0.1`, `alpha: 1.0.0-alpha.1` |
| publish times | 1.4.17 2026-09-21, 1.4.18-rc.0 2026-09-22, **1.4.18 2026-09-25** |
| `1.4.18` peerDependencies | `@langchain/core ^1.1.48`, `zod ^3.25.32 \|\| ^4.2.0` (neither optional) |
| `1.4.18` dependencies | `@langchain/langgraph-checkpoint ^1.1.5`, `@langchain/langgraph-sdk ~1.12.0`, `@langchain/protocol ^0.0.19`, `@standard-schema/spec 1.1.0` |
| `1.4.18` engines | `node >=18` |
| `1.4.18` exports | `.` (with `browser` → `dist/web.js`), `./web`, `./zod`, `./pregel`, `./remote`, `./stream`, `./channels`, `./prebuilt`, `./zod/schema` |
| `@langchain/core` `latest` | `1.2.13` (the installed version) |

The pre-planning hint (latest stable 1.4.17) is outdated: **1.4.18 is now the stable `latest`**,
three days old, and is not an RC.

- **Decision**: `@langchain/langgraph@1.4.18`, exact, lockfile-pinned. `@langchain/core` stays
  `1.2.13`.
- **Compatibility**: `1.2.13` satisfies `^1.1.48`. Scratch install result: `npm ls` shows one
  `@langchain/core@1.2.13` deduped under `langgraph`, `langgraph-checkpoint` and `langgraph-sdk`;
  no peer warnings. `langgraph-sdk`'s `react`/`react-dom` peers are optional and are not installed.
- **zod**: required as a peer, but already present: `@langchain/core@1.2.13` depends on
  `zod ^3.25.76 || ^4` and the lockfile resolves `zod@4.6.5`, which satisfies `^4.2.0`; npm dedupes
  it. **No direct `zod` dependency is needed** as long as application code does not import `zod`
  (see R2 for why it does not).
- **Lockfile delta** (scratch): 10 packages added — `@langchain/langgraph`,
  `@langchain/langgraph-checkpoint`, `@langchain/langgraph-sdk` (+ nested `eventemitter3`,
  `p-queue`, `p-timeout`), `@langchain/protocol`, `@types/json-schema`, `is-network-error`,
  `p-retry`. None is a data source; `langgraph-sdk` is a client for a remote LangGraph server that
  this Feature never constructs (no network use; checked in R12 build output as part of SC-015
  verification).
- **Alternatives**: `1.4.17` (older stable, no reason to prefer); `1.4.18-rc.0` (rejected: RC and
  superseded by the stable 1.4.18); upgrading `@langchain/core` (rejected: not required).

## R2 — Minimal state API

Checked in `dist/index.d.ts`, `dist/state/schema.d.ts`, `dist/graph/annotation.d.ts`,
`dist/graph/state.d.ts`:

- Exported: `StateGraph`, `START`, `END`, `Annotation`, `StateSchema`, `ReducedValue`,
  `UntrackedValue`, `GraphNode`, `LangGraphRunnableConfig`, among many others.
- `StateSchema` fields must be a `ReducedValue`, `DeltaValue`, `UntrackedValue` or a
  `SerializableSchema` (a Standard Schema such as a `zod` schema). A plain last-value field
  therefore needs a schema library object (the declaration's example uses `z.string()`). Using it
  would make the application import `zod` directly, i.e. a second production dependency (FR-001
  allows exactly one).
- `Annotation.Root({...})` with `Annotation<T>` fields is exported and **not deprecated**; the
  only `@deprecated` in `annotation.d.ts` is the `value` option of a reducer annotation (replaced
  by `reducer`), which this Feature does not use. `StateGraph`'s own declaration example still uses
  `Annotation.Root`.
- **Decision**: `Annotation.Root` with five `Annotation<T>` last-value fields. No reducer, no
  `zod`, no messages state.
- **Alternatives**: `StateSchema` + `zod` (rejected: extra direct dependency for no Feature
  need); `MessagesAnnotation` (rejected: message-history state is a non-goal).

Constraints discovered by experiment (the compiled graph rejects these at build time):

- A **node name cannot equal a state key** (`"branchA is already being used as a state attribute
  (a.k.a. a channel), cannot also be used as a node name"`). → state keys `branchAResult`,
  `branchBResult`, `synthesis`, `decision`; node names `branchA`, `branchB`, `synthesize`,
  `decide`.
- `END` cannot be the target of a multi-source (list) edge (`"END cannot be an end node"`); not
  needed here (`decide → END` is a single edge).

## R3 — Fan-out

`StateGraph.addEdge(startKey: typeof START | N | N[], endKey: N | typeof END)`. Two static edges
`addEdge(START, 'branchA')` and `addEdge(START, 'branchB')` are sufficient.

Scheduler meaning (LangGraph's Pregel model): execution proceeds in supersteps; every node
triggered by the channels written in the previous step runs in the same superstep, and the step's
writes are applied together when all its tasks finish. Both branches are triggered by `START`, so
they are tasks of the same superstep and their node functions are started without waiting for each
other (`pregel/runner.js` starts all of the step's tasks, then collects them in a `Promise.race` loop).

Experiment (fake `Runtime` whose `run()` never resolves until released): after invoking the graph,
**two `run()` calls had been made before either was released**, with prompts built from the input
only. With the real AkariSP runtime (`limit: 1`) and the stand-in held, `snapshot()` read
`{ active: 1, queued: 1 }`.

What this proves: graph-level fan-out (both branch requests submitted) + AkariSP backpressure. It
says nothing about the native provider running two inferences at once; that is not observed and is
out of scope. `Send`, conditional edges and subgraphs are not used.

## R4 — Fan-in

`addEdge(['branchA', 'branchB'], 'synthesize')` — the `N[]` form of `addEdge`; `StateGraph` stores
it in `waitingEdges: Set<[N[], N]>` and `attachEdge` compiles it to a `NamedBarrierValue` channel (`graph/state.js`) that triggers the
target only when every listed source has written.

Experiment: release Branch A only → still 2 `run()` calls (Synthesis not started); release Branch
B → the third call is Synthesis, and its prompt contains both branch outputs. Reversed order (B
first, then A) gives the same result. Synthesis ran once per run.

Note: two separate edges `addEdge('branchA','synthesize')` + `addEdge('branchB','synthesize')`
would express a different contract (trigger on either). Here both branches are in the same
superstep so it would usually run once, but the barrier is the explicit fan-in contract and is
what the Feature asserts. **Decision**: list-form `addEdge`.

## R5 — Shared state and reducers

Branches write disjoint keys (`branchAResult`, `branchBResult`) in the same superstep; the
experiment completed without `InvalidUpdateError` and with both values in the final state.
LastValue channels only reject multiple writes to the **same** key in one step. **Decision**: no
reducer.

## R6 — Sequential dependency

`addEdge('synthesize', 'decide')`, `addEdge('decide', END)`. Decision's prompt is built from
`state.synthesis` only. Experiment: Decision's `run()` input was the synthesis output; node log
order `A/B start → A/B done → S start → S done → D start → D done`.

## R7 — How the graph's AbortSignal reaches the model (critical)

Declarations: `invoke(input, options?)` takes `Partial<PregelOptions>`, which extends
`RunnableConfig` (has `signal`); the node function receives `(state, config:
LangGraphRunnableConfig)`. In source, the graph combines the caller's signal with internal
controllers (`combineAbortSignals(options?.signal, abortController.signal)` in `pregel/index.js`;
per-task `combineAbortSignals(externalAbortSignal, timeoutAbortSignal, exceptionSignal)` in
`pregel/runner.js`). So `config.signal` inside a node is a **derived** signal, not the caller's
object: it aborts when the caller aborts **or** when LangGraph aborts the step.

Entry points differ:

- `dist/index.js` (the `.` export for Node `import`) begins with
  `initializeAsyncLocalStorageSingleton()` from `dist/node.js`, which installs `node:async_hooks`
  `AsyncLocalStorage` into `@langchain/core`'s singleton. That lets a runnable invoked inside a
  node **implicitly inherit** the node's config (including `signal`).
- `dist/web.js` (the `browser` condition of `.`, and the `./web` export) does **not** install it.

Experiment, node calls `model.invoke(prompt)` **without** passing a signal, caller aborts:

| Entry | `run()` received a signal? | Caller | AkariSP tasks after caller rejected |
|---|---|---|---|
| `@langchain/langgraph` in Node (`index.js`) | yes (derived, via AsyncLocalStorage) | rejects | settled |
| `@langchain/langgraph/web` in Node | **no** | rejects | **not settled — orphaned** |

With explicit forwarding (`model.invoke(prompt, { signal: config.signal })`) both entries deliver
the derived signal to `run()` and every task settles.

Vite build check: a browser bundle importing `@langchain/langgraph` resolves to `web.js` (no
`async_hooks` in the output) and a minimal graph ran in Playwright Chromium. So **in the browser
there is no implicit propagation**; relying on it would pass Node tests and orphan tasks in Chrome.

**Decisions**:

1. Each node forwards explicitly: `model.invoke([new HumanMessage(prompt)], { signal:
   config.signal })`. This is application/graph code; `AkariChatModel` is unchanged (it already
   forwards `options.signal` to `runtime.run`).
2. Application code imports from **`@langchain/langgraph/web`** (a published export). Node tests
   and the browser then run the same no-AsyncLocalStorage configuration, so a node that forgot to
   forward the signal **fails the deterministic test** instead of being masked by Node-only
   propagation.

Cancellation path (verified end to end in the experiment):

```text
caller AbortController.abort(reason)
  → graph.invoke(input, { signal })            combined with LangGraph's controllers
  → node(state, config)                        config.signal (derived)
  → model.invoke(msgs, { signal: config.signal })
  → AkariChatModel._call → runtime.run(input, { signal })   (Feature 002, unchanged)
```

## R8 — Cancellation under fan-out

Experiments (Branch A active, Branch B queued, caller aborts):

- Caller: `graph.invoke` rejects with the **caller's abort reason** (here the `Error('user
  abort')` passed to `abort()`), not with `TaskError`. It rejected within ~1–2 ms.
- Model layer: both `AkariChatModel` requests end with `errorKind: 'cancelled'` (AkariSP
  `TaskError('cancelled')` for the active and for the queued task).
- Real AkariSP: `snapshot()` was `{ active: 0, queued: 0, state: 'ready' }` right after the caller
  rejected in this run.
- **Guarantee check**: with a node that ignores the signal, `graph.invoke` rejected while the
  node's work was still pending. **LangGraph does not wait for in-flight node work before
  rejecting the caller.** Settlement of AkariSP tasks therefore depends only on the forwarded
  signal and on AkariSP's cancellation; the caller's rejection is not proof of settlement.

**Decisions**: tests and the app record *caller outcome* and *AkariSP settlement* separately: after
the caller settles, wait (bounded) for `snapshot()` `active 0, queued 0` **before** `shutdown()`.
Waiting matters because `shutdown()` itself cancels running and rejects waiting tasks (Feature 002
research), so a post-shutdown `0/0` cannot show that the graph's signal did the cleanup. No claim
is made about sibling-kill timing or native Prompt API interruption latency.

## R9 — Controlled branch failure

Experiment: Branch B's `run()` rejects with `TaskError('failed')`, Branch A still in flight.

- Caller: `graph.invoke` rejects with **the same `TaskError` object** (`e === err`, `code:
  'failed'`).
- Sibling: LangGraph aborts the step's derived signal, so Branch A's forwarded signal fires and its
  request ends `cancelled`; A's task settled.
- Synthesis and Decision: 0 executions.
- As in R8, LangGraph does not wait for a sibling that ignores its signal (experiment: rejection
  while the sibling was pending), so settlement is asserted from AkariSP snapshots.

**Decisions**: no `retryPolicy`, no `errorHandler`, no recovery path. Test-side failure injection
only: the fake `Runtime` rejects for deterministic tests; for Node integration the stand-in gains a
marker-triggered rejection (R20). Production code has no failure switch.

## R10 — One graph run = one runtime

Feature 002 evidence: one runtime per owner serves repeated and concurrent requests; `shutdown()`
is idempotent and leaves `closed, 0/0`. The experiment also showed why the model must be per run:
reusing one `AkariChatModel` across a cancelled run and a successful run reported
`logicalRequests = 6` (2 + 4), cumulative.

**Decision**: a run is a plain function in `src/main.ts`:

```text
createRuntime({ limit: 1, queueCapacity: 32 })
new AkariChatModel({ runtime, onEvent })
buildMinimalGraph(model, onNode)          // Feature-local builder: nodes close over the model
await graph.invoke(fixture, { signal }) → outcome
finally: wait for active 0 / queued 0 (bounded) → snapshot → runtime.shutdown() → snapshot
```

`buildMinimalGraph` exists because nodes must close over the per-run model; it builds this one
graph only. No `GraphRuntime`, `RuntimeManager`, pool or coordinator. Graph construction per run is
cheap (compile only).

## R11 — Concurrency limit 1

**Decision**: `createRuntime({ limit: 1, queueCapacity: 32 })` — AkariSP's defaults, passed
explicitly so the evidence records them. With two branches this makes the fan-out observable as
`active 1, queued 1`. No correctness issue found. Evidence wording: "graph fan-out: 2 branch
requests submitted; AkariSP: active 1, queued 1; native-provider concurrency: not observed".

## R12 — Canonical Vite root

Current `vite.config.ts` sets `root: 'harness'` and `build.outDir: '../dist'`.

**Decision** (smallest change):

- `vite.config.ts`: delete `root` and `build` (defaults: root = repository root, `outDir: 'dist'`,
  emptied on build); add `index.html` to the `+dirty` code paths; add
  `__LANGGRAPH_VERSION__` to `define`.
- New root `index.html` → `<script type="module" src="/src/main.ts">`.
- `vite build` then emits only the canonical app (`dist/index.html`).
- `package.json`: add `"@langchain/langgraph": "1.4.18"`; add `"dev": "vite"`. Other scripts
  unchanged.
- `playwright.config.ts`: unchanged (webServer is `npx vite`, `baseURL` is the server root → now
  the canonical app; the `chromium` project picks up the new spec automatically).
- `e2e/`: new `app.spec.ts` (canonical app, stand-in); Feature 002 specs switch their URLs to
  `/harness/…` (below).

Bundle: the scratch build of LangGraph + core was ~906 kB minified (Vite's >500 kB warning).
Bundle size is not a Feature goal; recorded only.

## R13 — Historical Feature 002 harness

Options evaluated:

- **A (chosen)**: keep `harness/index.html` and `harness/main.ts` unchanged. With root = repository
  root the Vite dev server serves them at `/harness/` with no configuration; their relative imports
  (`../src/...`, `../test/standin.ts`) still resolve. `e2e/harness.spec.ts` and the Feature 002
  test in `e2e/prompt-api.spec.ts` change only their URLs (`/` → `/harness/`), so the Feature 002
  regression checks keep running.
- B: keep files but drop them from dev/test — rejected: loses a free regression check.
- C: multi-page build input — rejected: production build must emit the canonical app only; the
  harness never needed a production build.

`npm run harness` stays `vite` (same command) but the page it names is now at
`http://localhost:5173/harness/`; `docs/testing.md` records this. Feature 002's committed
`quickstart.md`, `verification.md` and `evidence/*.json` are **not edited** (they describe the
state at their revision; their `revision` fields remain truthful). The harness keeps its own
evidence schema and is not given Feature 003 behavior.

## R14 — Minimal UI

Plain DOM in `index.html` + `src/main.ts`: title, availability line, `Run Graph` and `Cancel`
buttons, a four-row node status table (`waiting / running / done / error`), `Result`, `Runtime`
(state, active, queued; refreshed on node/model events and at the end), `#status[data-state]`
(`idle / running / done`) for automation, and `<pre id="evidence">`. `Run Graph` is disabled while
a run is in progress (one run per owner at a time). No framework, no styling work.

## R15 — Node observability

`buildMinimalGraph(model, onNode?)` wraps each node: `onNode({ node, event: 'start' | 'done' |
'error', seq })` with a run-local sequence number, and counts model requests issued by the node.
Graph-node events stay separate from Feature 002's `BridgeEvent` (model requests), so node
executions and logical requests are counted independently. No event bus, no tracing layer.

## R16 — Logical request accounting (SC-021)

Measured, not asserted into existence:

- total logical requests = `model.logicalRequests` (bridge-owned counter; fresh model per run);
- per-node requests = counted by the node wrapper;
- fallback requests = 0 by construction (no `structuredOrFreeText`; plain text) and reported as
  the measured value 0;
- provider invocations = `NOT EXPOSED` (AkariSP `0.1.0-alpha.2` public API unchanged).

Experiment: success run → 4 (1 per node). The test asserts `total === sum(per-node)` and
`total === 4`; if a real run ever differs the evidence keeps the measured value and the difference
is investigated (SC-021).

## R17 — Deterministic tests keep `AkariChatModel`

The Feature 002 fake-`Runtime` pattern extends naturally: `run()` returns a deferred the test
controls (resolve / reject), records `input` and `signal`, and rejects with
`TaskError('cancelled')` when its signal aborts (AkariSP's observable contract). This gives
controlled completion, delay, rejection, signal observation and request counting through the real
`LangGraph → AkariChatModel` path. No test-only model class.

## R18 / R19 — Deterministic fan-in and failure proofs

Planned tests are the experiments above made permanent (see `contracts/graph.md` for the exact
assertions): A done + B held → Synthesis 0; release B → Synthesis 1 → Decision after Synthesis;
both completion orders; B rejects → caller rejects with the same error, Synthesis 0, Decision 0,
A's forwarded signal aborted and its run settled.

## R20 — Node integration

Real `akarisp` + stand-in + real `AkariChatModel` + real LangGraph (`/web` entry), in a new
`test/graph-integration.test.ts`, labelled `NODE_INTEGRATION (stand-in)`:
fan-out snapshot `active 1, queued 1`; success with one runtime; abort during branches → caller
rejects, both requests `cancelled`, `0/0` **before** shutdown, then `closed 0/0`; controlled
failure → same checks.

Failure injection: `test/standin.ts` `reply()` gains one rule — a prompt containing the marker
`STANDIN_FAIL` makes `prompt()` reject. Feature 002 prompts never contain it, so Feature 002
behavior is unchanged. The failing run passes a test-only input whose Branch B facts contain the
marker; the committed fixture never does.

## R21 — Browser automated on the canonical page

`e2e/app.spec.ts` (Playwright Chromium, `chromium` project): `/?provider=standin` loads the
stand-in by dynamic `import('../test/standin.ts')` exactly as the Feature 002 harness did; native
is the default and never imports it. In stand-in mode only, the page exposes
`window.__standin = { hold, resume }` so the test can hold prompts, press `Cancel` while both
branches are in flight, and release. Tests: success run; cancellation run; native mode in
Playwright Chromium (no model) → `BLOCKED` and the graph is not run. Records carry
`evidenceClass: BROWSER_AUTOMATED`, `provider: standin`.

## R22 — Real Prompt API evidence

Same page, native mode, installed Google Chrome with the model. Two runners, both on the canonical
page: `e2e/prompt-api.spec.ts` gains a canonical-app test using the existing profile-clone launch
(`runner: playwright`), or a manual run from `npm run dev` (`runner: manual`). The record is
`REAL_BROWSER_PROMPT_API` only when availability is `MODEL_AVAILABLE` and the native provider ran;
SC-011 additionally requires `outcome: success`. Otherwise `BLOCKED`. The JSON is copied into
`specs/003-…/evidence/` deliberately (routine test runs write to `test-results/` only).

## R23 — Evidence schema

Defined in `contracts/evidence.md` (Feature 003-specific; not the Feature 002 S1–S7 schema).

## Findings

None. No LangGraph/LangChain/AkariSP incompatibility requiring a finding was observed. The
implicit-propagation difference between LangGraph's Node and web entries (R7) is documented
LangChain.js runtime behavior that the application handles by explicit forwarding; it is recorded
as observation **O-1**, not a defect. The early caller rejection (R8/R9) is recorded as
observation **O-2**.
