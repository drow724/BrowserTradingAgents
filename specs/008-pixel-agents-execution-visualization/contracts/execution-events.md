# Contract: Execution events (BrowserTradingAgents-owned)

**Direction**: page execution → observer → `ExecutionEvent` → reducer. Nothing flows back.

**Status**: this DOM observer is the Feature 008 **event-source adapter** only. It is not a declared
or canonical execution API, and `src/main.ts` is not bound to keep it (research R8, D2).

## Source: the existing status surface (research R8, option E1)

The observer is read-only. It watches the elements that `src/main.ts` already writes, and changes no
line of `src/main.ts`.

`MutationObserver` options:
- `childList` on `#status`, on each `#node-<node>`, and on `#mode`. `#mode` is used only to
  refresh the mode line and never produces an event.
- `attributes` (`data-state`, `data-active`, `data-queued`) on `#runtime`
- `#evidence` is not observed. Its text is read when a `#status` `done: …` record is processed
  (implementation note, T011).

### How values are read (analyze H1)

A `MutationObserver` callback is batched: it can run after several writes in the same task. The value
an element holds when the callback runs is therefore **not** a transition.

- **Transitions** (`#status`, `#node-*`): each `textContent = …` assignment replaces the element's
  children and yields one `childList` record. Its `addedNodes[0]` Text node keeps `data` equal to the
  value written at that moment. The observer walks the records in order and reads **only
  `record.addedNodes` Text data**.
  - Example: a same-task `running…` → `done: …` on `#status`, as in the BLOCKED preflight path
    (`src/main.ts:87-88, 146-149`, no `await` between them), yields two records and two events.
- **`data-state` on `#status` is never used for transitions.**
- **`#runtime`**: only the latest value matters (verbatim display). The observer reads its current
  `data-*` attributes after each batch and emits `runtime` if they differ from the last emitted
  values. Latest-value/snapshot semantics apply here, and only here.
- **`#evidence`**: read as the current text when a `#status` `done: …` record is processed. `run()`
  writes `#evidence` before `#status` (`src/main.ts:146-148`), so by then it holds this run's final
  record.

### Mapping

| Record | Value read | Event |
|---|---|---|
| `#status` childList | added text starts with `running` | `run-started` |
| `#status` childList | added text starts with `done:` | `run-ended{outcome, stage, errorKinds}` from the `#evidence` record |
| `#node-<node>` childList | `running` | `role-started{role}` |
| `#node-<node>` childList | `done` | `role-completed{role}` |
| `#node-<node>` childList | `error` | `role-failed{role}` |
| `#node-<node>` childList | `waiting` | none; the reset is implied by `run-started` |
| `#runtime` attributes (latest) | `data-state` / `data-active` / `data-queued` | `runtime{state, active, queued}` when changed |

`run-ended` fields from the final record:
- `outcome` = the record's `outcome` (`success` · `failed` · `cancelled` · `not-run`)
- `errorKinds` = the `errorKind` of every `modelRequests` entry with `event: 'error'`, in record order. They
  are not tied to roles; the reducer uses them only to attribute failed or cancelled when all kinds agree
  (F008-009).
- `stage`:
  - `failure.boundary` `market-data` → `acquisition`
  - `inference` → `graph`
  - `evidenceClass` `BLOCKED` → `preflight`
  - success → `graph`

Consecutive duplicates are not special-cased. The reducer rejects illegal transitions as anomalies
(data-model).

### Mount, remount, missing or unexpected input (analyze M8)

- **Mount**:
  - The observer first builds an initial snapshot from the current DOM:
    - `#status` text: `running…` means a run is in progress; `done: …` or `idle` means none is
    - each `#node-*` text
    - the `#runtime` attributes
  - The snapshot is turned into a synthetic prefix: `run-started`, then the matching `role-*`
    events in `ROLES` order, then the current `runtime`.
  - Only then does the observer start observing. A view mounted mid-run therefore starts from the
    true current state instead of from idle.
- **Unexpected text**: a value outside the table (for example, an unknown node text) counts as an
  anomaly. No event is emitted.
- **Missing element**: if one of `#status`, `#node-*` for the 8 roles, `#runtime` or `#evidence` is
  absent at mount, the view does not observe. The text panel shows "status unavailable".
- **Unparseable final record**: counts as an anomaly and emits `run-ended{failed, graph}`. The text
  panel shows "status unavailable" for the run stage.
- **`#runtime` between runs**: `run()` does not reset `#runtime`. From a new `run-started` until the
  new runtime's ticker writes, the runtime panel shows the previous run's final values (for example
  `closed · 0 · 0`). This is verbatim page state, not a view error, and is documented rather than
  hidden (analyze L1).

## Guarantees

- **Read-only**: the observer never writes to, clicks, or dispatches events on any element outside
  its own container.
- **Imports**: it does not import `src/main.ts`, `src/integration/*` or `akarisp`. From `src/graph/*`
  it imports only the `ROLES` constant, for labels and order. The weight of that import is verified
  at Checkpoint B (research R6, analyze M1).
- **No new truth**: every event corresponds to one write that the page already performs. Nothing is
  inferred beyond the table (FR-005).
- **Error containment**: exceptions in the observer, reducer, adapter or host are caught inside
  `ExecutionView`. The view falls back to text-only and never rethrows (FR-019).
- **Lifecycle**: one `MutationObserver` per mounted `ExecutionView`, disconnected in the effect
  cleanup (FR-022, FR-031).

## Not in this contract

- **Role-level `queued` / `inferring`**: no attribution source exists (research F008-O1).
- **Timing fields**: ordering comes from `seq` only. Timings belong to the existing evidence record.
- **Persistence**: events are held in memory for the current view only. Replay exists only in tests
  (FR-028).
