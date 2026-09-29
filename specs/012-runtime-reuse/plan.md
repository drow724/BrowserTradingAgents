# Implementation Plan: Feature 012 — Runtime Reuse Across Runs

**Branch**: `012-runtime-reuse` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/012-runtime-reuse/spec.md`

## Summary

`src/main.ts` keeps at most one AkariSP runtime for the page session. `runGraph` asks a small
`acquireRuntime()` for a runtime: it reuses the kept one when its snapshot is `{ready,0,0}`, otherwise
shuts the old one down (recorded) and creates a new one. After each run the existing settle poll runs;
a runtime that does not settle is discarded, not reused. `pagehide` requests shutdown. `?reuse=off`
restores exactly the Feature 004/007 per-run lifecycle. The default mode is decided on native evidence
(research R1). The graph, prompts, AkariChatModel and AkariSP are unchanged.

## Technical Context

**Language/Version**: TypeScript (Next.js 16.3.6, React 19.3.0)

**Primary Dependencies**: AkariSP 0.1.0-alpha.2 (public API: `createRuntime`, `run`, `snapshot`,
`shutdown`, `TaskError`), LangGraph.js, AkariChatModel — all unchanged

**Storage**: none (the kept runtime lives in page memory)

**Testing**: Playwright stand-in (`e2e/reuse.spec.ts`, existing specs), opt-in native comparison in
`e2e/prompt-api.spec.ts` (`BTA_REUSE_COMPARE=1`)

**Target Platform**: Chrome desktop with the Prompt API (native), any Chromium (stand-in)

**Project Type**: web application (single Next.js project)

**Performance Goals**: none fixed; the saving per reused run is the measured result (SC-005)

**Constraints**: AkariSP changes 0; graph topology and prompts unchanged; 8 logical requests per run;
acquisition before the first runtime; settle observed per run

**Scale/Scope**: one runtime per page; one run at a time (the Run button is disabled while running)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I Dogfood before abstraction | Uses AkariSP's public runtime as designed for long-lived use; no wrapper library | PASS |
| II Deterministic fixtures | Stand-in equality with/without reuse (SC-002) | PASS |
| III Application owns orchestration | The app decides when a runtime is created, reused or replaced | PASS |
| IV AkariSP owns inference lifecycle | Task sessions, queueing and cancellation stay inside AkariSP; the app only holds the runtime longer | PASS |
| V Evidence before core change | AkariSP untouched; the app lifecycle change is backed by Feature 010 timing (runtime create 14.7 s) and gated on the native comparison for the default (R1) | PASS |
| VI Browser first | Browser evidence for both providers, classes separate | PASS |
| VII Reproducible runs | Records gain `runtimeId`, `prepared`, per-run settle; per-run mode records unchanged | PASS |
| VIII / IX | No trading claims; no new data | PASS |
| XII Findings before fixes | Anything AkariSP cannot express (e.g. no runtime identity, no health signal besides `state`) is a finding | PASS |
| XIII Inference tiers | Tier unchanged | PASS |

Post-design re-check: unchanged — PASS.

## Project Structure

### Documentation (this feature)

```text
specs/012-runtime-reuse/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/run-record-lifecycle.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
src/main.ts                 # kept runtime, acquireRuntime(), per-run settle, pagehide, ?reuse=on|off, record fields
e2e/reuse.spec.ts           # stand-in: reuse count, equality with/without reuse, cancel/fail/closed recovery, report
e2e/app.spec.ts, e2e/execution-view.spec.ts, e2e/analysis.spec.ts, e2e/prompt-api.spec.ts
                            # per-run lifecycle assertions pinned to ?reuse=off (unchanged meaning)
e2e/prompt-api.spec.ts      # opt-in native comparison (BTA_REUSE_COMPARE=1)
harness/                    # unchanged (Feature 002/003 harness has its own lifecycle)
```

**Structure Decision**: no new module; the kept runtime is ~30 lines in `src/main.ts` next to
`runGraph`, which already owns creation and shutdown.

## Complexity Tracking

No constitution violations. The protected `src/main.ts` / `runGraph` hashes change by design; the new
hashes are recorded in verification.
