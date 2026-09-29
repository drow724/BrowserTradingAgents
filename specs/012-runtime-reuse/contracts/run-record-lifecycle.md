# Contract: run record lifecycle (Feature 004 evidence contract, extended)

## `?reuse=off` — unchanged (Feature 004/007)

```json
"lifecycle": { "mode": "per-run", "runtimeId": 3, "prepared": true,
  "settledBeforeShutdown": true, "snapshotBeforeShutdown": {"state":"ready","active":0,"queued":0},
  "snapshotAfterShutdown": {"state":"closed","active":0,"queued":0} },
"timing": { "graphMs": 0, "runtimeCreateMs": 0, "shutdownMs": 0 }
```

Existing assertions on these three fields keep their meaning; `mode`, `runtimeId`, `prepared` are added.

## `?reuse=on`

```json
"lifecycle": { "mode": "reuse", "runtimeId": 1, "prepared": false,
  "settledAfterRun": true, "snapshotAfterRun": {"state":"ready","active":0,"queued":0} },
"timing": { "graphMs": 0, "runtimeCreateMs": 0 }
```

With a replacement before the run:

```json
"replaced": { "reason": "closed", "before": {"state":"closed","active":0,"queued":0},
              "after": {"state":"closed","active":0,"queued":0} }
```

With a runtime that did not settle after the run: `settledAfterRun: false`,
`discarded: { reason: "unsettled" | "broken" | "closed", before, after }`, `timing.shutdownMs` present; the next
run has `prepared: true`. (`replaced` is only ever about the runtime found before a run; `discarded` about the
one just used — so a run can carry both.)

A runtime-create failure after a replacement keeps the replacement: `lifecycle: { mode: "reuse", replaced }`.

## Invariants

- Acquisition (live data) completes before `createRuntime` for any run that prepares a runtime.
- A run starts only on a runtime observed `{ready,0,0}`.
- 8 logical requests per successful run, as today.
