---
description: "Task list for Feature 012 — Runtime Reuse Across Runs"
---

# Tasks: Feature 012 — Runtime Reuse Across Runs

**Input**: Design documents from `specs/012-runtime-reuse/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/run-record-lifecycle.md, quickstart.md

**Tests**: included — SC-001–SC-006 are verified by automated checks (stand-in) and an opt-in native comparison.

**Gate**: nothing is built, tested or served (in any checkout) while the Feature 010 native measurement
runs — a second browser or build would distort its timings. Feature 011 is implemented first; this
Feature rebases onto it before its own implementation.

## Phase 1: Setup

- [X] T001 Prepare the worktree ../BrowserTradingAgents-012: rebase `012-runtime-reuse` onto the merged Feature 011 (or `main`), provide node_modules by an APFS clone of the main checkout's (`cp -Rc`, no download), and record the baseline in specs/012-runtime-reuse/verification.md: SHA, sha256 of src/main.ts and the `runGraph` section, AkariSP 0.1.0-alpha.2 and its public API boundary (`createRuntime`, `run`, `snapshot`, `shutdown`, `TaskError`), and `npm run typecheck`, `npm test`, `npm run test:browser` results

## Phase 2: Foundational

- [X] T002 **Not needed — T018 kept the default off** (conditional task; nothing pinned): Pin every existing per-run lifecycle assertion to `reuse=off` by adding `&reuse=off` (or `?reuse=off`) to the page URLs they load: e2e/app.spec.ts (lines ~54–56, 94–96, 138–149, 238–240, 394–396), e2e/execution-view.spec.ts (~234–236, 272), e2e/analysis.spec.ts (~34, 161–163, 181–186), e2e/prompt-api.spec.ts (~138–140, 184); meaning unchanged
- [X] T003 Add the mode switch in src/main.ts: `const reuse = params.get('reuse') === 'on'` (default off, research R1); `lifecycle.mode` `'reuse' | 'per-run'`, `runtimeId` (page counter, 1-based) and `prepared` added to every record that reached the graph stage (acquisition-failure and BLOCKED records keep `lifecycle: null` / no lifecycle), per-run fields unchanged (contracts/run-record-lifecycle.md)

**Checkpoint**: with `reuse=off` (the default) all existing checks pass; records only gained `mode`, `runtimeId`, `prepared`.

## Phase 3: User Story 1 — Faster repeated analysis (P1) 🎯 MVP

**Goal**: with `reuse=on`, only the first run in the page session prepares a runtime.

**Independent Test**: `/?provider=standin&reuse=on`, example portfolio, "전체 점검": 1 × `prepared: true`, 5 × `prepared: false`, one `runtimeId`.

- [X] T004 [US1] Write e2e/reuse.spec.ts first: overview of the example portfolio (6 holdings) with `reuse=on` → exactly one record `prepared: true`, all six share one `runtimeId`, reused runs have `timing.runtimeCreateMs` 0 and no `shutdownMs`; with `reuse=off` → six `prepared: true`, six different `runtimeId`s (SC-001)
- [X] T005 [US1] Implement in src/main.ts a page-level `kept: { runtime, id } | undefined` and `acquireRuntime()`: reuse `kept` only when `snapshot()` is exactly `{state:'ready', active:0, queued:0}`; otherwise `await kept.runtime.shutdown()`, record `replaced: { reason: 'broken'|'closed'|'busy', before, after }` in this run's record, and create a new runtime (research R2); creation failure records `runtime-create` as today and leaves `kept` undefined
- [X] T006 [US1] In `runGraph` (src/main.ts), `reuse=on`: after the graph, run the existing settle poll (≤ 10 s to `{ready,0,0}`), record `settledAfterRun` and `snapshotAfterRun`; if not settled, shut down now, record `discarded: { reason: 'unsettled' }` and `timing.shutdownMs`, clear `kept` (research R3); `reuse=off` keeps settle → shutdown → record exactly as today
- [X] T007 [US1] Keep acquisition first (FR-007): `acquireRuntime()` is called only where `createRuntime` is called today (after `prepareLive`); a failed or cancelled acquisition prepares nothing

**Checkpoint**: T004 passes; checkpoint of Phase 2 still holds.

## Phase 4: User Story 2 — Runs stay isolated and correct (P1)

**Goal**: identical stand-in results with and without reuse; idle before and after each run.

**Independent Test**: T008 passes.

- [X] T008 [US2] Add to e2e/reuse.spec.ts: the same stand-in overview with `reuse=on` and `reuse=off` gives byte-identical per-run `result` and `analysis.grounding.counts`, and identical `counts.logicalRequests` (8 per run) (SC-002, FR-011)
- [X] T009 [US2] Add to e2e/reuse.spec.ts: every `reuse=on` record has `settledAfterRun: true` and `snapshotAfterRun` `{ready,0,0}`, and each non-first run started on a runtime observed `{ready,0,0}` (the absence of `replaced` proves it) (SC-003)

## Phase 5: User Story 3 — Cancel and failure keep working (P1)

**Goal**: the next run succeeds after a cancel, a model failure and an unusable runtime.

**Independent Test**: T010–T012 pass.

- [X] T010 [US3] Add `pagehide` handling in src/main.ts: when `!event.persisted`, call `kept?.runtime.shutdown()` without awaiting, without recording and without clearing `kept` (research R5)
- [X] T011 [US3] Add to e2e/reuse.spec.ts (`reuse=on`): cancel mid-run → next run completes with the same `runtimeId` and `prepared: false`; dispatch `pagehide` → next run completes with a new `runtimeId`, `prepared: true`, `replaced.reason: 'closed'` (SC-004, FR-005, FR-006); with `data=live`, a failed and a cancelled acquisition prepare no runtime (record has no `runtimeId`) and, with no runtime kept yet, the next run has `prepared: true` (FR-007)
- [X] T012 [US3] Add to e2e/reuse.spec.ts (`reuse=on`): a model failure (the existing stand-in failure path used by e2e/app.spec.ts role-failure checks) → the next run completes; the runtime is reused if it settled, replaced otherwise, and the record says which (SC-004)

## Phase 6: User Story 4 — Evidence of the effect (P2)

**Goal**: comparison reports for stand-in and native, classes separate.

**Independent Test**: the stand-in report is produced by the automated suite.

- [X] T013 [US4] Add to e2e/reuse.spec.ts: write `measurement-reuse-standin.json` to the test output per data-model.md (`{ provider, evidenceClass, reps, modes: { on, off: { runs, prepared, runtimeCreateMs[], graphMs[], totalMs[], outcomes, replacements } } }`)
- [X] T014 [US4] Add the opt-in native comparison to e2e/prompt-api.spec.ts, `BTA_REUSE_COMPARE=1` only: example-portfolio overview × `BTA_REUSE_REPS` (default 2) per mode, alternating on/off order, same report shape as `measurement-reuse-native.json` (research R7)
- [X] T015 [US4] Run the stand-in suite; copy the stand-in report to specs/012-runtime-reuse/evidence/; run T014 on native Chrome (after the maintainer's go-ahead; it takes time) and copy its report; record both in verification.md with the per-reused-run saving and its spread (SC-005)

## Phase 7: Polish & Cross-Cutting

- [X] T016 Record in verification.md: new sha256 of src/main.ts and `runGraph` (changed by design), `npm run typecheck && npm run build && npm test && npm run test:browser` results (SC-006), finding F012-1 (no public runtime identity or creation time in AkariSP) and any other AkariSP observations; AkariSP changes 0
- [X] T017 [P] Update docs/testing.md (reuse switch, reuse spec, native comparison) and docs/roadmap.md (012 runtime reuse; Effectiveness Benchmark → 013)
- [X] T018 Present the native comparison to the maintainer and apply the decision on the default: keep `reuse` off, or make `reuse=on` the default in src/main.ts (tests stay valid because they pin the mode); record the decision in verification.md

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 → (US2, US3 in either order) → US4 → Polish; T018 last.
- All e2e tasks edit e2e/reuse.spec.ts, so they run in sequence; T010 (src/main.ts) before T011.

## Parallel Example

```text
T017 docs while T015's native comparison runs
```

## Implementation Strategy

- MVP: Phases 1–3 (reuse works behind `reuse=on`), then isolation (US2) and recovery (US3) before any
  default change; the native comparison (US4) decides T018.
