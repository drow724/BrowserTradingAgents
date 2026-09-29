# Data Model: Feature 008 — Pixel Agents Execution Visualization

All entities live in the browser page and in memory. Nothing is persisted and nothing is sent off
the page. Types are BrowserTradingAgents-owned. No Pixel Agents type appears outside the adapter and
host (see [contracts/pixel-host-protocol.md](contracts/pixel-host-protocol.md)).

## Role identity (fixed)

One entry per graph node, in `ROLES` order (`src/graph/trading-graph.ts`). The order and names come
from `ROLES`, not from a copy.

| Field | Rule |
|---|---|
| `node` | `ROLES[i].node`, e.g. `marketAnalyst` |
| `label` | `ROLES[i].label`, e.g. `Market Analyst` |
| `sheet` | Pixel palette 0..5: `i % 6` |
| `hueShift` | `0` for i < 6; `180` for i ≥ 6, so the two reused sheets look different |
| `seat` | a fixed seat id from the default layout, one per role, chosen once in the adapter constant table |
| `pixelId` | `i + 1` (Pixel agent ids are numbers) |

Invariant: the same role maps to the same identity for every run and page load (FR-006).

## ExecutionEvent

Contract: [contracts/execution-events.md](contracts/execution-events.md).

| Field | Type | Rule |
|---|---|---|
| `seq` | integer ≥ 1 | strictly increasing within a run; restarts at 1 at `run-started` |
| `type` | `run-started` · `role-started` · `role-completed` · `role-failed` · `run-ended` · `runtime` | — |
| `role` | node name | only on `role-*` |
| `outcome` | `success` · `failed` · `cancelled` · `not-run` | only on `run-ended`; `not-run` = the BLOCKED preflight |
| `stage` | `acquisition` · `graph` · `preflight` | only on `run-ended`, from the final record: `failure.boundary` `market-data` → `acquisition`, `inference` → `graph`; BLOCKED → `preflight`; success → `graph` |
| `runtime` | `{state, active, queued}` | only on `runtime`; values exactly as the page shows them |

There is no `role-cancelled` or `role-not-run` event. The page reports a cancelled node as `error`,
so role cancellation and not-run are **derived** at `run-ended` (FR-007a).

## ViewState (derived; the reducer's output)

```text
ViewState = { run: RunView, roles: Record<node, RoleView>, runtime: RuntimeView | null, anomalies: number }
```

### RoleView.state

| State | Meaning | Entered on |
|---|---|---|
| `idle` | no run yet in this page | initial |
| `waiting` | run in progress, role not started | `run-started` |
| `working` | node running in the graph | `role-started` |
| `completed` | node finished | `role-completed` |
| `failed` | the node errored, and the record attributes every model error to failure | `run-ended{failed}` whose `errorKinds` is non-empty with no `cancelled`, for a role that got `role-failed` |
| `cancelled` | still running when the run ended, or errored where the record attributes every model error to cancellation | `run-ended{failed \| cancelled}` for a role still `working` (analyze M9); `run-ended{cancelled}` whose `errorKinds` are all `cancelled`, for a role that got `role-failed` |
| `stopped` | the node errored, but the record cannot tell failure from cancellation for it (F008-009: the page writes `error` for both, and error kinds are not tied to roles). Text: "error (failed/cancelled unclear)" | `run-ended` for a role that got `role-failed` in every other case (for example `errorKinds` `['failed','cancelled']`, or none) |
| `not-run` | the run ended before the role started | `run-ended{failed \| cancelled \| not-run}` for a role still `waiting` |

`queued` and `inferring` are defined by the spec but **never produced in Feature 008**, because no
role-to-request attribution exists (research F008-O1, FR-011). The reducer type reserves them. The
tests assert they are never emitted.

Transitions (a role within one run):

```text
idle ─run-started→ waiting ─role-started→ working ─role-completed→ completed
                     │                       └─role-failed→ (errored, internal) ─run-ended→ failed | cancelled
                     └─run-ended{failed|cancelled|not-run}→ not-run
working ─run-ended{failed|cancelled}→ cancelled
```

No role is ever left in `working` or `waiting` after `run-ended`. A role still `working` at a failed
run exists only when the page's settle wait timed out, or when the watchdog ended the run. It is
shown as `cancelled` (the run ended its work), never as `completed` or `failed`.

Rules:

- **Monotonic (FR-009)**: after `completed`, `failed`, `cancelled` or `not-run`, no later event
  changes the role in that run. Such an event increments `anomalies` and is otherwise ignored.
- **Invalid order**: an event that is not a legal transition (for example `role-completed` without
  `role-started`, or a second `role-started`) increments `anomalies` and is ignored.
- **Late events (FR-017)**: every event after `run-ended` except `runtime` counts as an anomaly.
- **New run**: `run-started` resets every role to `waiting`, the run to `running`, `anomalies` to 0
  and `seq` tracking, and keeps the last runtime value until a new `runtime` event arrives.
- **Errored role at success**: impossible by graph semantics; counted as an anomaly.

### RunView

`idle` → `running` (`run-started`) → `completed` | `failed` | `cancelled` | `not-run` (`run-ended`), plus
`stage` for the last three. `not-run` is shown as "not run (blocked: native model unavailable)".

### RuntimeView

`{state, active, queued}` from the latest `runtime` event, shown verbatim (FR-025). Never computed,
never combined with role state. Because the page does not reset `#runtime` between runs, the first
part of a new run shows the previous run's final values until the new runtime's ticker writes
(contracts/execution-events.md; analyze L1).

## Pixel toggle (UI state, not execution state)

`pixelEnabled: boolean`:
- **Storage**: component state of `ExecutionView` only. It starts `false` on every page load and is
  never stored (FR-041).
- **Changed by**: only the host-owned "Show Pixel Agents" control, which is disabled under reduced
  motion (FR-044).
- **Effect**: the canvas iframe exists iff `pixelEnabled && run.state === 'running' && stage visible`
  (FR-042).
- **No influence on execution**: it never affects `ViewState`, the execution events or the page
  (FR-043).

## Mode

`{provider: 'standin' | 'native', data: 'fixture' | 'live'}`, read from the page's existing `#mode`
text. Display only (FR-025).

## Synthetic trace (tests only)

`test/fixtures/execution-traces/<name>.json`: `{ name, events: ExecutionEvent[], expected: ViewState[] }`.
`expected[k]` is the view state after `events[k]`. The file is committed and deterministic. The
required set (FR-027 plus the analyze repairs and F008-009) has 13 traces:

| Trace | Content |
|---|---|
| `success` | a full successful run |
| `fanout-active1-queued1` | both analysts started, runtime `{ready,1,1}`, no role queued or inferring |
| `role-failure-bull` | — |
| `failed-with-sibling-working` | a run fails while one role is still `working` → `cancelled` (M9) |
| `acquisition-cancel` | — |
| `acquisition-failure` | `run-ended{failed, acquisition}`, no role event (L2) |
| `graph-cancel-analysts` | — |
| `late-event-after-cancel` | — |
| `duplicate-and-out-of-order` | a second `role-started`, and a `role-completed` without a start → anomalies, state unchanged (L2) |
| `second-run` | — |
| `blocked-preflight` | — |
| `runtime-create-failure` | — |
| `ambiguous-sibling-error` | both analysts report `error`; `errorKinds` `['failed','cancelled']` → both `stopped` (F008-009) |

Visualization unavailable and visualization error are not event traces. The events are identical in
those cases, and they are browser cases covered by T025.
