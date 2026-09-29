# Data Model: Feature 012 — Runtime Reuse Across Runs

## Kept runtime (page memory)

- `runtime` (AkariSP `Runtime`), `id` (integer, 1-based per page, assigned by the app), `createdAt`.
- At most one per page. States: none → kept (after creation) → replaced (not ready/idle before a run,
  or unsettled after a run) → none/kept.

## Run record — `lifecycle` (see contracts/run-record-lifecycle.md)

- `mode`: `'reuse' | 'per-run'`.
- `runtimeId`: integer; equal across records that used the same runtime.
- `prepared`: boolean — true if this run created the runtime.
- `replaced` (optional): the kept runtime was not `{ready,0,0}` before this run — `{ reason: 'broken' | 'closed' | 'busy', before, after }`.
- `discarded` (optional): the runtime did not settle after this run and was shut down — `{ reason: 'unsettled' | 'broken' | 'closed', before, after }`.
- `settledAfterRun`: boolean; `snapshotAfterRun`: snapshot.
- per-run mode only (unchanged): `settledBeforeShutdown`, `snapshotBeforeShutdown`, `snapshotAfterShutdown`.

## Run record — `timing`

- `runtimeCreateMs`: 0 when reused.
- `shutdownMs`: present only when a shutdown happened in this run (per-run mode, or an unsettled discard).

## Comparison report

- `{ provider, evidenceClass, reps, modes: { on|off: { runs, prepared, runtimeCreateMs[], graphMs[],
  totalMs[], outcomes, replacements } } }`.
