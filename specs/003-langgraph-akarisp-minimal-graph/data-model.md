# Data Model: Feature 003 — Minimal Graph

Feature 003 concepts only. Nothing from TradingAgents' `AgentState` is imported.

## MinimalGraphInput (the committed fixture)

`src/graph/fixture.ts`, exported constant.

| Field | Type | Rule |
|---|---|---|
| `id` | string | stable identity recorded in evidence, e.g. `minimal-graph-fixture@1`; bump the suffix when content changes |
| `subject` | string | neutral subject name (not a listed company, no ticker) |
| `branchAFacts` | string | read by Branch A only |
| `branchBFacts` | string | read by Branch B only; must not appear in Synthesis/Decision prompts except through branch outputs |

Neutral, non-financial content; no network source (FR-011). Test-only inputs (for example the
failure marker in R20) are defined in tests, never in this file.

## MinimalGraphState

`Annotation.Root` in `src/graph/minimal-graph.ts` (research R2). All fields are last-value
channels; no reducer.

| Key | Type | Written by | Read by |
|---|---|---|---|
| `input` | `MinimalGraphInput` | caller (`invoke`) | `branchA`, `branchB` |
| `branchAResult` | string | `branchA` | `synthesize` |
| `branchBResult` | string | `branchB` | `synthesize` |
| `synthesis` | string | `synthesize` | `decide` |
| `decision` | string | `decide` | caller (final state) |

Node names (`branchA`, `branchB`, `synthesize`, `decide`) differ from state keys because LangGraph
1.4.18 rejects a node named like a channel (R2).

## NodeEvent (observation)

Emitted by the node wrapper through `onNode`.

| Field | Type | Meaning |
|---|---|---|
| `node` | `'branchA' \| 'branchB' \| 'synthesize' \| 'decide'` | node name |
| `event` | `'start' \| 'done' \| 'error'` | one `start` and one terminal event per node execution |
| `seq` | number | run-local order of events (1, 2, …) |

Derived per node: `status` (`waiting` → `running` → `done` \| `error`; `waiting` if never started),
`executions` (count of `start`), `modelRequests` (count of `model.invoke` calls made by the node).

Distinct from Feature 002's `BridgeEvent` (`logicalRequestId`, `start/done/error`, `errorKind`,
`timing`), which describes model requests, not node executions.

## GraphRun

One execution of the graph by `src/main.ts` (or a test owner).

| Field | Meaning |
|---|---|
| runtime | exactly one `createRuntime({ limit: 1, queueCapacity: 32 })`, shut down at the end |
| model | exactly one `AkariChatModel` over that runtime |
| signal | one `AbortController` owned by the run (`Cancel` aborts it) |
| outcome | `success` \| `cancelled` \| `failed` |

State transitions:

```text
idle ──Run Graph──▶ running ──invoke resolves──────────▶ settling ──▶ done(success)
                       │     ──invoke rejects, aborted──▶ settling ──▶ done(cancelled)
                       │     ──invoke rejects, other────▶ settling ──▶ done(failed)
settling: wait (bounded) for AkariSP active 0 / queued 0 → snapshot → shutdown() → snapshot
```

`cancelled` = the run's signal was aborted before `invoke` settled; the error is kept as recorded.
`failed` = any other rejection (e.g. `TaskError('failed')` from a branch).

## GraphRunEvidence

One JSON record per run; schema in [contracts/evidence.md](contracts/evidence.md).
