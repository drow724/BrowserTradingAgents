# Feature Specification: Feature 012 — Runtime Reuse Across Runs

**Feature Branch**: `012-runtime-reuse`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Runtime reuse: instead of creating and shutting down one model runtime
per graph run, reuse one runtime across runs (Feature 010 research R3 left this to a later Feature).
Measure the time saved, keep runs isolated, keep cancellation and failure behaviour. AkariSP changes 0."

## Purpose

Core question: **Does keeping one model runtime alive across graph runs make repeated analysis
noticeably faster, without leaking anything between runs and without weakening cancellation, failure
handling or the lifecycle evidence?**

```text
today:  run → [create runtime ~15 s] → graph → settle → shutdown        (every run)
after:  first run → [create runtime] → graph → settle ─┐
        next run  ──────────────────→ graph → settle ─┤  (runtime kept)
        end of reuse scope ─────────────────────────→ shutdown
```

## Baseline

Verified at specification time (2026-09-30):

| Item | Value |
|---|---|
| Branch | `012-runtime-reuse` (worktree), created from `main` |
| Base | `59413a6` — merge of PR #11 (Feature 010) |
| Lifecycle (Feature 004/007) | one graph run owns one runtime: created after acquisition, settled to `{ready,0,0}`, then shut down to `{closed,0,0}`; `settledBeforeShutdown` recorded per run |
| Runtime options | `limit 1`, `queueCapacity 32` |
| Isolation in AkariSP | every task starts its own task session from the template's warm base and destroys it after the prompt; no conversation state carries over between tasks by design |
| Observed cost (Feature 010, native) | runtime create 14.7 s for a graph of about 42 s (one observation; the Feature 010 measurement T041 records more) |
| Overview | N holdings = N sequential runs, each with its own runtime (Feature 010 R3) |
| AkariSP | 0.1.0-alpha.2, public API only (`createRuntime`, `run`, `snapshot`, `shutdown`, `TaskError`) |

## Clarifications

### Session 2026-09-30

- Q: How long does a runtime live? → A: B — the page session: kept until the page closes or the runtime becomes unusable; no idle shutdown.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Faster repeated analysis (Priority: P1)

A user asks about one holding, then another, or runs the portfolio overview. After the first run, the
following runs start working without waiting for the model to be prepared again.

**Why this priority**: It is the user-visible value and the question this Feature answers.

**Independent Test**: Run the overview over the example portfolio twice — once with reuse, once
without — and compare the per-run preparation time and the overview total.

**Acceptance Scenarios**:

1. **Given** a runtime already prepared by an earlier run in the reuse scope, **When** a new run
   starts, **Then** no new runtime is prepared and the record shows the run reused it.
2. **Given** the first run in the reuse scope, **When** it starts, **Then** a runtime is prepared once,
   as today.

---

### User Story 2 - Runs stay isolated and correct (Priority: P1)

Reusing the runtime changes nothing in what a run produces: the same inputs give the same kind of
outputs, no text from an earlier run appears in a later one, and the grounding results are unaffected.

**Why this priority**: Speed is worthless if runs contaminate each other.

**Independent Test**: With the deterministic stand-in, run the same sequence with and without reuse;
outputs and grounding results are identical.

**Acceptance Scenarios**:

1. **Given** the stand-in, **When** the same sequence runs with and without reuse, **Then** every
   run's outputs and grounding counts are identical.
2. **Given** each run, **When** it settles, **Then** the runtime is observed idle (`ready`, 0 active,
   0 queued) before the next run starts.

---

### User Story 3 - Cancel and failure keep working (Priority: P1)

Cancelling a run, or a run that fails, leaves the app able to run again. If the runtime itself becomes
unusable, the next run prepares a new one instead of failing.

**Why this priority**: Cancellation and failure isolation are existing guarantees (Feature 004/007/010).

**Independent Test**: Cancel mid-run, then run again; force a model failure, then run again; force an
unusable runtime, then run again.

**Acceptance Scenarios**:

1. **Given** a cancelled run, **When** the next run starts, **Then** it runs on the same runtime, which
   was idle before the next run began.
2. **Given** a runtime that became unusable (broken or closed), **When** the next run starts, **Then**
   a new runtime is prepared and the record says why.
3. **Given** the page is closing, **When** it unloads, **Then** the runtime is shut down (best effort;
   the browser may end the page first), and the last run's record already holds its idle observation.

---

### User Story 4 - Evidence of the effect (Priority: P2)

The maintainer gets a report comparing reuse and no reuse: preparation time per run, overview total,
failures, cancellations, and lifecycle observations, for the stand-in and, separately, for the native
model.

**Why this priority**: The project decides on evidence (Constitution V); the report is that evidence.

**Independent Test**: The report exists for the stand-in in the automated suite and for the native
model as an opt-in run.

**Acceptance Scenarios**:

1. **Given** the comparison run, **When** it finishes, **Then** the report lists both modes with the
   same holdings, evidence classes kept separate.

### Edge Cases

- The page is hidden or closed while a runtime is kept: no run is lost; the runtime ends with the page.
- The runtime is not idle when a run starts (not expected: a run's record is written only after it
  settles): the runtime is replaced, reason recorded (FR-005).
- Data acquisition fails or is cancelled before the graph: no runtime is prepared for that run (the
  acquisition-before-runtime rule holds).
- The native model reports a quota or context error in one run: the next run still starts; if the
  runtime turned unusable, it is replaced (US3).
- Reuse is switched off: behaviour is exactly today's.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Within the reuse scope, a run MUST use an existing usable runtime instead of preparing a
  new one; the first run in the scope prepares it.
- **FR-002**: The reuse scope MUST be the page session: the runtime is kept from the first run until
  the page closes (unloaded for good) or the runtime becomes unusable (FR-005); there is no
  idle shutdown. An idle timeout is added only if idle resource use is measured to be a problem.
- **FR-003**: Before each run starts and after each run ends, the runtime MUST be observed idle
  (`ready`, 0 active, 0 queued); the record keeps the settle observation per run.
- **FR-004**: The per-run idle observation (FR-003) replaces the per-run shutdown of Feature 004/007.
  When a runtime is replaced (FR-005), the old one is shut down and its before/after observations are
  kept in the next run's record; a runtime that does not settle after a run is shut down at once and
  recorded in that same run. On page close, shutdown is requested best effort and is not recorded
  (the page may end first). With reuse off (FR-009), the per-run settle-then-shutdown record is exactly
  today's.
- **FR-005**: A runtime that is broken or closed MUST NOT be reused; the next run prepares a new one
  and records the reason.
- **FR-006**: Cancellation MUST stop the current run as today and leave the runtime usable; the
  runtime MUST NOT be shut down by a run's cancellation unless the scope ends.
- **FR-007**: Data acquisition MUST still complete before any runtime is prepared for the first run
  in a scope; a failed or cancelled acquisition prepares nothing.
- **FR-008**: Each run's record MUST state whether it prepared or reused a runtime, its preparation
  time (0 when reused), and a runtime identity so reuse can be traced across records.
- **FR-009**: Reuse MUST be switchable on and off; off restores exactly the per-run lifecycle, for
  comparison and as a fallback. The default mode is decided by the maintainer on the native comparison
  (FR-012); until then the default is off.
- **FR-010**: The model library MUST NOT be changed (AkariSP changes 0); anything it cannot express is
  recorded as a finding with evidence (Constitution V, XII).
- **FR-011**: The graph, its eight roles and its prompts MUST stay unchanged; 8 logical model requests
  per run remain.
- **FR-012**: A comparison report MUST cover both modes over the same holdings: preparation time per
  run, total time, outcomes, cancellations and lifecycle observations; stand-in and native reported
  separately.

### Key Entities

- **Reuse scope**: the span during which one runtime is kept; start, end, reason for ending.
- **Runtime identity**: a label per prepared runtime, repeated in every run record that used it.
- **Run record additions**: prepared or reused, preparation time, runtime identity, settle observation.
- **Comparison report**: per mode and evidence class — runs, preparation times, totals, outcomes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a page session with M runs (single questions or overviews) and no unusable runtime,
  runtime preparation happens once (M−1 runs reuse), versus M times without reuse.
- **SC-002**: With the stand-in, outputs and grounding counts of every run are identical with and
  without reuse (0 differences).
- **SC-003**: 100% of runs observe the runtime idle before starting and after ending; 100% of runtime
  replacements record the old runtime's shutdown; with reuse off, 100% of runs record settle-then-shutdown.
- **SC-004**: After a cancelled run, a failed run, and a forced unusable runtime, the next run
  completes in 100% of the automated checks.
- **SC-005**: With the native model, the overview's total time with reuse is reported against without
  reuse; the saving per reused run is stated with the observed spread (no fixed target; the result is
  the finding).
- **SC-006**: Existing checks (unit, browser, Feature 010 measurement with the stand-in) pass; the
  per-run lifecycle checks are updated only where FR-004 moves them to the scope.

## Assumptions

- Isolation between runs relies on the library's per-task session design (each task starts from the
  warm base and is destroyed after its prompt); US2 verifies it rather than assuming it.
- One page has at most one runtime at a time (`limit 1`).
- The stand-in has negligible preparation time; the time saving is a native-model question.
- No constitution amendment is needed: the lifecycle invariant is re-specified by this Feature with
  evidence (Feature 010 R3), as Feature 010 did for its inputs.

## Out of Scope

- Concurrent runs, queue depth and backpressure experiments (need concurrent callers).
- Changing runtime options (`limit`, `queueCapacity`) or the model.
- WebLLM or other inference tiers.
- The Effectiveness Benchmark (moves to Feature 013).

## Roadmap context

Feature 010 research R3 kept one runtime per run and left reuse to a later Feature. Feature 011 is Own
Office Art; this Feature is 012; the Effectiveness Benchmark becomes 013.
