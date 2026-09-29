# Research: Feature 012 — Runtime Reuse Across Runs

## R1 — Mode switch and default

- **Decision**: URL parameter `?reuse=on|off`, like `provider`/`data`. Default **off** until the native
  comparison (SC-005) is recorded; then the maintainer decides whether the default becomes on (last
  task of this Feature).
- **Rationale**: Constitution V — the default lifecycle changes only on evidence. Existing per-run
  tests keep their meaning with `reuse=off` pinned explicitly, so they survive a later default flip.
- **Alternatives**: default on immediately (changes user behaviour before evidence); a UI toggle
  (UI work for a comparison switch; the URL matches existing switches).

## R2 — Reuse check

- **Decision**: before a run, reuse the kept runtime only if `snapshot()` is exactly
  `{state: 'ready', active: 0, queued: 0}`. Otherwise `await shutdown()` (idempotent, never rejects),
  record `{reason: 'broken'|'closed'|'busy', before, after}` in the new run's record, create a new one.
- **Rationale**: `state` is AkariSP's only public health signal; `active/queued` 0 proves the last run
  drained. **Finding candidate F012-1**: no public runtime identity or creation time; the app assigns
  `runtimeId` (counter) itself.

## R3 — After a run

- **Decision**: keep the existing settle poll (≤ 10 s to `{ready,0,0}`), recorded per run as
  `settledAfterRun` + snapshot. If it does not settle, shut the runtime down now and do not keep it
  (recorded in the same run as `discarded`, reason `unsettled`, or the runtime's state). With `reuse=off`, the existing settle → shutdown →
  record is used unchanged.
- **Rationale**: FR-003/FR-004; a runtime that did not drain must never serve the next run.

## R4 — Cancellation and failures

- **Decision**: unchanged run-level behaviour: the run's AbortSignal cancels its tasks inside AkariSP.
  The runtime is kept if it settles (R3). `TaskError('failed')` (e.g. quota) does not by itself discard
  the runtime; `state` decides. Runtime creation failure: record `runtime-create` as today; nothing kept.
- **Rationale**: FR-005/FR-006 with AkariSP's own semantics (a failed task ≠ broken runtime).

## R5 — Page end

- **Decision**: `pagehide` (when `!event.persisted`) calls `kept.runtime.shutdown()` without awaiting
  and without recording; it does not clear `kept`, so a test can dispatch `pagehide` to produce a
  `closed` runtime and exercise the replacement path (US3 scenario 2) without a test-only hook.
- **Rationale**: FR-004 best effort; bfcache (`persisted`) pages keep their runtime.

## R6 — Isolation check

- **Decision**: stand-in sequence (example portfolio overview, 6 holdings) with `reuse=on` and
  `reuse=off`; compare per-run `result` and `analysis.grounding.counts` byte for byte (SC-002). Native:
  report only (outputs are not deterministic).
- **Rationale**: AkariSP clones a task session from the warm base per task; the check verifies no
  carry-over at the app level.

## R7 — Comparison report

- **Decision**: `measurement-reuse-<provider>.json` in the test output: per mode — runs, `prepared`
  count, `runtimeCreateMs` per run, `graphMs`, total, outcomes, cancellations, replacements. Stand-in
  in the automated suite; native opt-in (`BTA_REUSE_COMPARE=1`, overview × `BTA_REUSE_REPS` default 2
  per mode, alternating order). Copied to `specs/012-runtime-reuse/evidence/`.
