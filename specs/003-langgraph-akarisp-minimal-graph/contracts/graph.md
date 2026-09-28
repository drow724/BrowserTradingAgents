# Contract: minimal graph execution (observable behavior)

Application-internal contract of `src/graph/minimal-graph.ts` as used by `src/main.ts` and the
tests. It fixes what must be observable; the code shape is in `plan.md`.

## Interface

```text
buildMinimalGraph(model: AkariChatModel, onNode?: (e: NodeEvent) => void)
  → { graph, modelRequests }
     graph: compiled graph (LangGraph 1.4.18, imported from '@langchain/langgraph/web')
     modelRequests: per-node count of model.invoke calls, e.g. { branchA: 1, … }

graph.invoke({ input: MinimalGraphInput }, { signal?: AbortSignal })
  → resolves: MinimalGraphState (all five keys set)
  → rejects: on abort or on any node error
```

Every node: `model.invoke([new HumanMessage(prompt)], { signal: config.signal })` exactly once,
plain text output, user-role message only (no `system` message — N-7), no structured parsing
(N-6), no tools. Nodes never touch `akarisp` directly (SC-006: `src/graph/` imports nothing from
`akarisp`).

## Topology

```text
addEdge(START, 'branchA'); addEdge(START, 'branchB')
addEdge(['branchA', 'branchB'], 'synthesize')        // barrier fan-in
addEdge('synthesize', 'decide'); addEdge('decide', END)
```

## Prompt dependencies

| Node | Prompt built from | Must not contain |
|---|---|---|
| `branchA` | `input.subject`, `input.branchAFacts` | `branchBFacts`, any branch output |
| `branchB` | `input.subject`, `input.branchBFacts` | `branchAFacts`, any branch output |
| `synthesize` | `branchAResult`, `branchBResult` | — |
| `decide` | `synthesis` | `branchAFacts`, `branchBFacts` |

## Observable guarantees and their test assertions

Fake `Runtime` = deferred per `run()`, records `input` and `signal`, rejects with
`TaskError('cancelled')` when its signal aborts — immediately if the signal is already aborted.
Settlement is always awaited with a bounded wait (2 s) that fails with `run() not settled —
orphaned`, never with an unbounded `await`.

| # | Guarantee | Deterministic assertion (DETERMINISTIC_TEST) |
|---|---|---|
| G1 | fan-out | before any `run()` resolves, 2 calls exist: Branch A and Branch B prompts |
| G2 | independence | branch prompts contain only their own facts (table above) |
| G3 | fan-in barrier | A resolved, B held → Synthesis executions 0 (and 2 `run()` calls); B resolved → Synthesis executions 1; same with order reversed |
| G4 | join consumes both | Synthesis prompt contains both branch outputs |
| G5 | sequence | `decide:start` seq > `synthesize:done` seq; Decision prompt contains the synthesis output and neither fact string |
| G6 | final state | resolves with `branchAResult`, `branchBResult`, `synthesis`, `decision` equal to the model outputs |
| G7 | accounting | `model.logicalRequests` = 4 = Σ node `modelRequests`; each node executions 1 |
| G8 | signal forwarding | every `run()` received a signal (not `undefined`); it aborts when the caller aborts |
| G9 | cancellation | abort with A and B in flight → `invoke` rejects (never resolves); within the bounded wait both `run()` promises settle as `TaskError('cancelled')` (else fail: orphaned); Synthesis/Decision executions 0 |
| G10 | failure | B's `run()` rejects with `TaskError('failed')` → `invoke` rejects with that same object; Synthesis 0, Decision 0; A's signal aborted and A's `run()` settled |

Because the application imports the `/web` entry (no AsyncLocalStorage), G8/G9 fail if a node
stops forwarding `config.signal` (research R7).

## Runtime-level guarantees (NODE_INTEGRATION, real akarisp + stand-in; BROWSER_AUTOMATED)

| # | Guarantee | Assertion |
|---|---|---|
| L1 | one runtime per run | owner makes exactly 1 `createRuntime()`; all 4 requests succeed on it |
| L2 | backpressure | stand-in held; after 2 bridge `start` events poll (≤ 1 s) until `active + queued === 2` → `snapshot()` `active 1, queued 1` |
| L3 | cancel settles | abort in L2 state → caller rejects; both bridge requests end `cancelled`; `active 0, queued 0` observed **before** `shutdown()` |
| L4 | failure settles | Branch B fails (stand-in marker) → caller rejects with `TaskError('failed')`; Synthesis/Decision 0; runtime stays `ready`; `0/0` before `shutdown()`. Branch A's outcome is recorded, not asserted: under limit 1 A normally completes before B reaches the model. Sibling cancellation is proven by G10 |
| L5 | shutdown | after every outcome `shutdown()` resolves; `closed, 0/0` |

Caller rejection and task settlement are asserted separately: LangGraph may reject the caller
before in-flight node work settles (research R8/R9), so tests poll `snapshot()` after the caller
settles.
