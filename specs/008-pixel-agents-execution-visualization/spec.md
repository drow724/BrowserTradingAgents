# Feature Specification: Feature 008 — Pixel Agents Execution Visualization

**Feature Branch**: `008-pixel-agents-execution-visualization`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "Show the existing 8-role BrowserTradingAgents run as cute 2D characters
using Pixel Agents. Pixel Agents is a visualization and observability layer only: execution events
flow one way from the application to the visualizer, and the visualizer never orchestrates. No fork
by default. Specify only."

## Purpose

Core question: **Can a user watch which of the eight roles is doing what, as it happens, through
a text execution view — and, on explicit request, character-based visualization — without the visualization changing anything about how the run
executes?**

Direction (the only allowed one):

```text
LangGraph / application execution  →  execution events  →  visualization adapter  →  Pixel Agents
```

Forbidden direction:

```text
Pixel Agents  →  LangGraph orchestration / AkariSP lifecycle / trading decisions
```

The visualization is a projection of state that has already happened. It is never the source of
execution truth.

## Baseline

Verified at specification time (2026-09-29):

| Item | Value |
|---|---|
| Branch | `008-pixel-agents-execution-visualization`, created from `main` |
| Base | `07f8f34` — merge of PR #8 (Feature 007) |
| Working tree | clean apart from unrelated untracked Spec Kit/Claude tooling |
| Shell | Next.js App Router; LangGraph, `AkariChatModel`, AkariSP, the Prompt API and the stand-in run in the browser only |
| Data modes | `fixture` (default) and `live` (same-origin `/api/market`, Yahoo-compatible, keyless) |
| Model modes | stand-in and native Chrome Prompt API |
| Feature 007 | FEATURE_COMPLETE, REAL_PROVIDER_VALIDATED |
| Existing run display | plain text per role (`waiting`/`running`/`done`/`error`) and a runtime line `state · active · queued` |
| Pixel Agents | not yet investigated; no dependency added; no source copied |

Topology being visualized (Feature 004, adaptation A1):

```text
START ─┬─ Market Analyst ─┐
       └─ News Analyst  ──┴─ (fan-in) → Bull Researcher → Bear Researcher → Research Manager
                                        → Trader → Risk Reviewer → Final Decision → END
```

## Two kinds of state

This distinction is the center of the Feature.

| Layer | Owner | States | Scope |
|---|---|---|---|
| Graph execution state | the application's LangGraph run | not started, ready, running, completed, failed, cancelled | per role |
| Model admission state | AkariSP | runtime state, `active` count, `queued` count | whole runtime, role-agnostic |

- The graph can have Market Analyst and News Analyst both running while AkariSP has one request
  active and one queued.
- AkariSP does not know role names (Constitution III). Any per-role statement about admission —
  role-level **inferring** ("this role's request is the active one") and role-level **queued**
  ("this role's request is the queued one") alike — is allowed only when the application can
  attribute the request to the role (for example by correlating run, role and request on the
  application side). It must never be guessed from graph state or from the runtime counts alone.
- When attribution is not possible, the display claims no more than both truths separately: graph
  truth (for example, News Analyst = working) and runtime truth (active 1, queued 1).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — See agents working (Priority: P1)

As a user running BrowserTradingAgents, I want to see which of the eight roles is working right
now. The always-on text execution view shows each role by name. When I explicitly choose
"Show Pixel Agents", each role also appears as a distinct character.

**Why this priority**: This is the core value of the Feature; nothing else is visible without it.

**Product decision (F008-011, 2026-09-29)**: the Pixel Agents canvas is an **explicit on-demand**
visualizer, **off by default**. Measurement showed that the unmodified upstream canvas has a persistent
rendering cost while it is visible and animating, and that cost is above the original budget.

**Independent Test**:
- Run a stand-in fixture run and observe each role's state in the text execution view.
- Then enable "Show Pixel Agents" and observe the characters during a run.
- The state logic can also be checked from a synthetic event trace, without any model.

**Acceptance Scenarios**:

1. **Given** the page is loaded and no run is started, **When** the user looks at the execution
   view, **Then** all eight roles are shown in the idle state, each with its own name. The Pixel
   canvas is off, and a host-owned "Show Pixel Agents" control is available.
2. **Given** the user enabled "Show Pixel Agents" and a run is in progress with the canvas area on
   screen, **When** a role starts, **Then** that role shows the working state within one second: in
   the text view always, and on its labeled character.
3. **Given** two runs in the same page session with Pixel Agents enabled, **When** the user compares
   them, **Then** each role keeps the same character, seat and label.
4. **Given** Pixel Agents is enabled during a run, **When** the user turns it off, **Then** only the
   canvas disappears, and the run, its requests, its evidence and its lifecycle are unchanged.
5. **Given** the user enabled Pixel Agents, **When** the page is loaded again, **Then** Pixel Agents is
   off again. The choice is not stored.

---

### User Story 2 — Understand execution flow (Priority: P1)

As a user, I want to see the order Market/News → Bull → Bear → Research Manager → Trader → Risk
Reviewer → Final Decision, and a clear end-of-run state.

**Why this priority**: Seeing the flow, not only the final answer, is the reason for the Feature.

**Independent Test**: Replay the synthetic trace of a successful run and verify the sequence of
role states and the final run state.

**Acceptance Scenarios**:

1. **Given** a successful run, **When** it finishes, **Then** all eight roles show completed and
   the run shows completed.
2. **Given** a successful run, **When** Bull Researcher starts, **Then** both Market Analyst and
   News Analyst already show completed.
3. **Given** a role shows completed, **When** the run continues, **Then** that role never returns
   to working during the same run.

---

### User Story 3 — Distinguish waiting from working (Priority: P1)

As a user, I do not want a role whose request is waiting for the model to look the same as a role
whose request is being answered.

**Why this priority**: Showing two analysts "inferring" at once when the browser model admits one
would be a false claim about the system.

**Independent Test**: Replay a synthetic fan-out trace where the runtime reports active 1, queued 1
and check what the visualization shows.

**Acceptance Scenarios**:

1. **Given** Market Analyst and News Analyst are both running in the graph and the runtime
   reports active 1 and queued 1, **When** the user looks, **Then** at most one role is shown as
   inferring and at most one as queued, and only for requests that are attributed to those roles.
2. **Given** the active/queued split cannot be attributed to a specific role, **When** the user
   looks, **Then** both roles are shown as running in the graph (not as inferring), and the
   runtime status shows active 1 and queued 1.
3. **Given** any run, **When** the runtime status is displayed, **Then** it matches the runtime's
   own reported state, active and queued values.

---

### User Story 4 — See completion, failure and cancellation (Priority: P1)

As a user, I want to know right away whether each role and the whole run completed, failed or was
cancelled.

**Why this priority**: A visualization that hides failures or shows false completion is worse than
none.

**Independent Test**: Replay synthetic traces for a failure at a given role, for cancellation
during market acquisition, and for cancellation during the graph.

**Acceptance Scenarios**:

1. **Given** a role fails, **When** the run ends, **Then** that role shows failed, the roles that
   never started show not run (not completed), and the run shows failed.
2. **Given** the user cancels during market acquisition, **When** the run ends, **Then** no role
   was ever shown as working or inferring, and the run shows cancelled.
3. **Given** the user cancels while a role is running, **When** the run ends, **Then** that role
   shows cancelled, the roles that never started show not run, and the run shows cancelled.
4. **Given** any terminal run state, **When** the user looks, **Then** failed and cancelled are
   distinguishable by text, not only by color.

---

### User Story 5 — Preserve trading behavior (Priority: P1)

As a user, I want the run to produce the same outputs, request counts, evidence and lifecycle
whether the visualization is on or off.

**Why this priority**: The project's value rests on unchanged execution semantics.

**Independent Test**: Run the same deterministic stand-in fixture run with the visualization
enabled and disabled and compare the evidence.

**Acceptance Scenarios**:

1. **Given** the same stand-in fixture input, **When** the run is executed with and without the
   visualization, **Then** the role outputs, logical request count, per-role execution counts and
   market digests are identical.
2. **Given** the visualization throws an error, **When** a run is in progress, **Then** the run
   continues and ends with the same outcome it would have had without the visualization.
3. **Given** any successful or cancelled run with the visualization on, **When** the runtime
   shuts down, **Then** the existing lifecycle evidence still shows pre-shutdown ready 0/0,
   settledBeforeShutdown true, and post-shutdown closed 0/0.

---

### User Story 6 — Same visualizer across data and model modes (Priority: P2)

As a developer or researcher, I want the same visualizer in `fixture`/`live` and stand-in/native
runs.

**Why this priority**: The visualizer must not become one more mode-specific path.

**Independent Test**: Run the existing mode combinations and confirm the visualization behaves the
same and the mode labels are correct.

**Acceptance Scenarios**:

1. **Given** any of the four data × model combinations, **When** a run completes, **Then** the
   role state sequence has the same shape.
2. **Given** a run, **When** the user looks at the status area, **Then** the data mode
   (`fixture`/`live`) and model mode (stand-in/native) are shown.

---

### User Story 7 — Test the visualization without expensive inference (Priority: P2)

As a developer, I want to feed deterministic synthetic execution traces to the visualization and
check the resulting logical state, without running a model.

**Why this priority**: Native runs are slow and hardware-dependent; visual correctness must not
depend on them.

**Independent Test**: The visualization state tests run in the ordinary deterministic test suite
with no model, no network and no browser model API.

**Acceptance Scenarios**:

1. **Given** a synthetic trace, **When** it is replayed twice, **Then** the resulting logical
   visualization states are identical.
2. **Given** the synthetic traces for success, fan-out queueing, failure, acquisition cancellation
   and graph cancellation, **When** the tests run, **Then** each expected state sequence is checked.

### Edge Cases

- **Event after a terminal state**: a late role event arriving after the run has ended (for
  example, work that settles after the caller was cancelled) must not turn a cancelled role back
  into working or completed.
- **Duplicate or out-of-order events**: a repeated start or a completion without a start must not
  produce an impossible state (for example, working after completed); such events are recorded as
  anomalies for tests, not shown as progress.
- **Runtime creation failure**: the run fails before any role starts; no role is shown working.
- **Market acquisition failure (`live`)**: the run fails in acquisition; no role is shown working;
  the failure is attributed to data acquisition, not to a role.
- **Watchdog limit**: a run ended by the existing page time limit is shown as the outcome the
  application records, with the same role rules as cancellation or failure.
- **Second run in the same page**: all roles reset to idle at the new run's start; nothing from
  the previous run leaks into the new one.
- **Strict Mode / remount**: mounting, unmounting and remounting the visualization in development
  neither starts a run nor creates duplicate subscriptions, and one user action still produces one
  graph run.
- **Visualization disabled or failed to load**: the application runs and records evidence exactly
  as without the visualization.
- **Reduced motion**: all states remain readable with no animation.
- **Narrow viewport**: the eight roles remain visible and labeled; the layout may stack or scale
  but does not overlap labels or scroll horizontally.

## Requirements *(mandatory)*

### Functional Requirements

**Execution event boundary**

- **FR-001**: The application MUST expose run progress through one BrowserTradingAgents-owned
  execution event boundary that describes, at minimum: run started; role started, completed and
  failed; run completed, failed, cancelled or not run (with its stage); and model runtime state
  changes (state, active, queued). A role's cancelled and not-run states are **derived** at the
  run's terminal state (FR-007a), not emitted as events.
- **FR-002**: The event boundary MUST be defined in BrowserTradingAgents terms. It MUST NOT use or
  expose Pixel Agents types, names or objects. Replacing the visualizer MUST NOT require changes to
  the graph, `AkariChatModel`, AkariSP or the market boundary.
- **FR-003**: Events MUST flow one way: from execution to the visualization. Nothing the
  visualization does may start, stop, retry, reorder, admit, cancel or otherwise influence a run,
  a model request, a market acquisition or the runtime lifecycle.
- **FR-004**: Each event MUST carry enough ordering information (a per-run sequence) for a
  consumer to reconstruct the logical state deterministically.
- **FR-005**: Events MUST only describe state that was actually observed by the application. The
  boundary MUST NOT invent finer states (for example, "reading news", "thinking about RSI",
  "deciding to buy").

**Roles and state**

- **FR-006**: All eight roles MUST be represented, each with a fixed identity (character, position
  and text label) that is the same across runs and page loads.
- **FR-007**: Each role MUST be shown in one of these user-visible states: idle (no run), waiting
  (run in progress, role not yet started), working (running in the graph), inferring (its model
  request is attributed as the active one — only when attributable), queued (its model request is
  attributed as waiting for admission — only when attributable), completed, failed, cancelled, stopped,
  and not run. `stopped` ("error (failed/cancelled unclear)") is shown for a role that reported an
  error when the observed evidence cannot attribute failure or cancellation to it. Failed and
  cancelled are shown only when directly attributable (F008-009).
- **FR-007a**: `not run` is a **derived** terminal display state, not an execution event: when the
  run reaches a failed, cancelled or not-run (blocked) terminal state, every role that never
  started is displayed as not run. The application MUST NOT emit a "role not run" event.
- **FR-008**: The visualization MUST keep these distinctions: queued ≠ inferring; failed ≠
  cancelled ≠ stopped; completed ≠ started; not run ≠ completed. It MUST NOT guess failed or cancelled.
- **FR-009**: Role state transitions MUST be monotonic within a run: once completed, failed,
  cancelled or not run, a role MUST NOT return to waiting, working, queued or inferring in that
  run.
- **FR-010**: The number of roles shown as inferring at the same time MUST never exceed the
  runtime's reported active count, and the number shown as queued MUST never exceed the reported
  queued count.
- **FR-011**: When a request cannot be attributed to a role, the role MUST be shown as working
  (graph) and neither as inferring nor as queued; the runtime status MUST still show the true active and
  queued counts.
- **FR-012**: A run-level status MUST show running, completed, failed, cancelled, or not run
  (blocked before execution, e.g. the native model is unavailable). For failure or cancellation it
  MUST say whether it happened during market acquisition or during the graph. Not run carries the
  stage preflight.

**Flow**

- **FR-013**: In a successful run, every role MUST go through exactly one working period and end
  completed, and the run MUST end completed.
- **FR-014**: The visualization MUST reflect the real order: Bull Researcher starts only after
  both analysts are shown completed; the sequential roles start in topology order.
- **FR-015**: On a role failure:
  - the failed role MUST show failed
  - roles that never started MUST show not run
  - any role still working when the run ends MUST show cancelled
  - the run MUST show failed
  No role may remain working after the run ends.
- **FR-016**: On cancellation during market acquisition, no role MUST ever be shown working,
  queued or inferring.
- **FR-017**: On cancellation during the graph, the running role(s) MUST show cancelled, roles
  that never started MUST show not run, and events that arrive after the run's terminal state MUST
  NOT change any role's terminal state.

**Non-interference**

- **FR-018**: With the visualization on, off, absent, or throwing errors, the following MUST be
  identical for the same deterministic input: role outputs, per-role execution counts, logical
  model request count, MarketBundle, marketFacts and their digests, evidence fields other than any
  separately recorded visualization metadata, and the lifecycle order (settlement before shutdown,
  pre-shutdown ready 0/0, post-shutdown closed 0/0).
- **FR-019**: Visualization errors MUST be contained in the visualization; they MUST NOT reject,
  delay or alter the run.
- **FR-020**: Visualization cleanup (on run end, unmount or page leave) MUST NOT wait on, delay or
  block runtime settlement or shutdown.
- **FR-021**: Mounting or rendering the visualization MUST NOT trigger a graph run, a model
  request or a market acquisition. The existing Run control remains the only trigger.
- **FR-022**: In development Strict Mode and on remount, one user run MUST still produce exactly
  one graph run, and the visualization MUST hold at most one active subscription.
- **FR-023**: The visualization MUST be removable: disabling it MUST leave a fully working
  application with the existing text status and evidence.

**Modes and status**

- **FR-024**: The visualization MUST work unchanged in `fixture` and `live` data modes and with the
  stand-in and native model providers; it MUST NOT branch execution by mode.
- **FR-025**: A small status area MUST show the data mode, the model mode, and the runtime state
  with active and queued counts, all read from the application, never set by the visualization.

**Testing**

- **FR-026**: The mapping from execution events to logical visualization state MUST be testable in
  the deterministic test suite from synthetic event traces, with no model, network or browser
  model API.
- **FR-027**: Synthetic traces MUST at least cover: successful run, fan-out with one active and one
  queued request, role failure, acquisition cancellation, graph cancellation, late event after
  cancellation, and a second run in the same page.
- **FR-028**: Replaying the same trace MUST produce the same logical state sequence. Event replay
  is test-only; no persistent event store is built.

**Pixel Agents on demand (maintainer decision F008-011)**

- **FR-040**: The Pixel Agents canvas MUST be off by default. It is enabled only through a
  BrowserTradingAgents-owned control ("Show Pixel Agents"), never through a control inside the
  upstream webview. The text execution view is always on and stays the canonical surface.
- **FR-041**: The enabled state MUST live only in the page session (component state). It MUST NOT be
  stored in `localStorage`, `sessionStorage`, cookies or on a server. Every page load starts off.
- **FR-042**: The canvas iframe MUST exist only when Pixel Agents is enabled **and** the observed run is
  running **and** the canvas area is in the viewport. It MUST NOT exist in every other case: disabled,
  idle, terminal or off-screen. A later run with Pixel Agents still enabled mounts it again.
- **FR-043**: Turning Pixel Agents off, including during a run, MUST only unmount the canvas. It MUST
  NOT change the graph, the model requests, the market requests, the evidence or the lifecycle.
- **FR-044**: Under reduced motion, Pixel Agents MUST NOT start. The toggle is shown as unavailable.

**Accessibility, performance, privacy**

- **FR-029**: Every role state and run state MUST be conveyed by text (and optionally an icon), not
  by color or animation alone.
- **FR-030**: When the user prefers reduced motion, the visualization MUST show state changes
  without movement animation.
- **FR-031**: The visualization MUST release its timers, animation loops and subscriptions when it
  is unmounted or when a run ends and no animation remains; repeated runs MUST NOT grow memory or
  subscription count.
- **FR-032**: The visualization MUST NOT send any data off the page: no telemetry, analytics,
  remote assets or third-party API calls at run time. Assets MUST be served from the application.
- **FR-033**: The layout MUST remain usable on a desktop browser and MUST NOT break (overlapping
  labels, horizontal page scroll) on a narrow viewport; mobile optimization is out of scope.

**Pixel Agents integration policy**

- **FR-034**: **NO_FORK_BY_DEFAULT.** Pixel Agents MUST be integrated in this order of preference:
  (1) upstream consumed as-is; (2) a BrowserTradingAgents-owned adapter or wrapper; (3) a minimal
  application-local compatibility patch. A permanent fork repository MUST NOT be created.
- **FR-035**: If research shows that no option in FR-034 works, the Feature MUST stop at a
  maintainer approval boundary with a finding (evidence, the limiting source, patch surface and
  options) before any fork or source copy.
- **FR-036**: Any mismatch between Pixel Agents and these requirements MUST be recorded as
  finding → evidence → impact → minimal adaptation options before any change (Constitution XII).
- **FR-037**: The upstream Pixel Agents reference used MUST be pinned by commit SHA (Constitution
  VII) and its license recorded.

**Protected scope**

- **FR-038**: The following MUST NOT change in meaning: graph topology, role prompts and `reads`
  provenance, AkariSP (production changes 0), `AkariChatModel` semantics, MarketBundle, `/api/market`
  and the provider adapter, and the existing trading/inference evidence schema. Instrumentation
  needed for FR-001 MUST be a thin application-side addition; rewriting the protected `runGraph`
  lifecycle region MUST NOT be the default approach.
- **FR-039**: Any visualization evidence MUST be recorded separately from trading/inference
  evidence and MUST NOT be used as execution truth.

### Key Entities

- **Execution event**: an application-owned record of something that happened in a run: run
  start/end (with stage and outcome), role start/end (with outcome), or a runtime state change
  (state, active, queued). Carries a per-run sequence number and the role name where applicable.
- **Role identity**: the fixed mapping from each of the eight roles to its display name, character
  and position.
- **Role view state**: the derived, user-visible state of one role in the current run
  (idle, waiting, working, queued, inferring, completed, failed, cancelled, not run). `not run` is
  derived at the run's terminal state, never received as an event.
- **Run view state**: the derived, user-visible state of the run (idle, running, completed, failed,
  cancelled, not run) with its stage (acquisition, graph, or preflight for not run).
- **Runtime status**: the runtime's own reported state, active and queued values, shown as-is.
- **Synthetic trace**: a committed, deterministic list of execution events used only by tests.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a successful 8-role run, each of the 8 roles passes through exactly one working
  period and ends completed, and the run ends completed (8/8 roles, 0 repeated working periods).
- **SC-002**: For the same deterministic stand-in fixture input, visualization on vs off gives
  identical role outputs, identical logical model request count (8), identical per-role execution
  counts (8 × 1) and identical market digests.
- **SC-003**: In the fan-out trace with active 1 and queued 1, the number of roles shown as
  inferring is at most 1 and shown as queued is at most 1 at every step, and with no attribution
  both are 0 (0 violations).
- **SC-004**: In role-failure traces, 0 roles downstream of the failed role are shown completed.
- **SC-005**: In acquisition-cancellation traces and runs, 0 roles are ever shown working, queued
  or inferring.
- **SC-006**: After graph cancellation, the run and every role reach a terminal state, no terminal
  state changes afterwards, and the lifecycle evidence still shows settledBeforeShutdown true,
  pre-shutdown ready 0/0 and post-shutdown closed 0/0.
- **SC-007**: In development Strict Mode, one user run produces exactly 1 graph run and 8 logical
  model requests, and the visualization holds at most 1 subscription.
- **SC-008**: All FR-027 scenarios are checked from synthetic traces in the deterministic test
  suite with 0 model requests and 0 network requests; replaying each trace twice gives identical
  state sequences.
- **SC-009**: The existing deterministic tests, the controlled browser tests (`fixture` and `live`
  with the controlled market stub, stand-in) and the native Prompt API fixture gate all pass after
  the Feature.
- **SC-010**: AkariSP production changes = 0.
- **SC-011**: Graph topology and role provenance changes = 0.
- **SC-012**: With the visualization disabled or failing to load, the application completes a
  stand-in fixture run and records evidence equal to the enabled run (apart from separately
  recorded visualization metadata).
- **SC-013**: Role state changes appear in the visualization within 1 second of the corresponding
  execution event.
- **SC-014a**: After 10 consecutive runs and after mount/unmount cycles in one page, the
  visualization's subscription, timer and listener counts return to their baseline, with no
  accumulation between runs.
- **SC-014b (original)**: the median main-thread busy-ratio increase is ≤ 10 percentage points, with
  the always-on Pixel canvas. Status: **SUPERSEDED_BY_MAINTAINER_DECISION**. This requirement
  **FAILED** and is kept as the record:
  - Headless, active and visible, after A/B/C optimization: +11.72 to +14.95 percentage points.
  - Headed Chrome: the sandboxed Pixel out-of-process iframe's main thread was about 12.8 % busy.
  - This failure is the basis of the on-demand product decision.
- **SC-014b1**: in the default mode, the median main-thread busy-ratio increase is **≤ 2 percentage
  points**.
  - Compared: A = `?viz=off` against B = the default Feature 008 page (text execution view on, Pixel
    toggle untouched and off).
  - Same synthetic active trace, same 10 s window, same browser process, alternating, ≥ 5 samples
    each.
  - B must create 0 Pixel iframes and make 0 `/pixel-agents/*` requests.
  - Native inference, setup and build are excluded.
- **SC-014b2**: the cost of explicit Pixel mode is **measured and disclosed** as
  `KNOWN_UPSTREAM_COST`. This is not a pass/fail threshold and not a performance claim.
  - Same harness: an active synthetic run, the canvas visible, actual animation ≥ 20 fps, the compact
    backing store, and the same process accounting.
  - Raw samples are kept.
- **SC-015**: With reduced motion preferred, every state from FR-007 is identifiable by text alone,
  no movement animation plays, and Pixel Agents cannot be started (the toggle is disabled).
- **SC-016**: During any run, the visualization makes 0 requests to hosts other than the
  application's own origin.
- **SC-017**: Pixel Agents fork repositories created = 0, unless a maintainer-approved finding
  (FR-035) says otherwise.

## Constraints

- Constitution I: no generic event bus, plugin system or visualizer registry; one application-local
  event boundary and one adapter.
- Constitution III/IV: orchestration stays in the application; AkariSP stays role-agnostic and
  unchanged. Per-role inference attribution, if any, is derived on the application side.
- Constitution VI: claims about browser behavior (Strict Mode, reduced motion, rendering, native
  runs) need browser evidence; stand-in and native evidence stay separate.
- Constitution VIII: the visualization makes no trading-quality claims.
- Constitution XII: findings before fixes, including for Pixel Agents mismatches.
- Dependency additions are limited to what the Pixel Agents integration decision requires, and are
  approved at plan time.

## Assumptions

- "Pixel Agents" refers to an upstream open-source pixel-art agent visualization project. Its exact
  repository, form (package, component, extension), rendering technology, asset delivery, license,
  and whether it can be consumed in a Next.js browser page are **not** assumed here; they are
  established in research by inspecting the actual upstream at a pinned commit.
- If Pixel Agents cannot be consumed or composed in the page (FR-034 options 1–3), that is a
  finding for a maintainer decision (FR-035), not a license to fork.
- The graph already reports role start/completion/error and the runtime already reports state,
  active and queued; the plan decides how to surface them through the event boundary with the
  smallest change.
- Per-role inference attribution may or may not be observable without touching protected code.
  If it is not, FR-011 applies and the visualization shows graph-level working plus the runtime
  counts; this is an acceptable outcome, not a failure.
- Character artwork and layout (desk, room, zones) are decided at plan time; decoration is allowed
  as long as semantic labels match real state.
- Desktop Chrome is the primary target; small viewports only need to not break.
- The existing text role status and runtime line remain as the always-available fallback.

## Non-Goals

- Effectiveness benchmark, single- vs multi-agent comparison (Feature 009).
- WebLLM, local LLM, cloud/OpenAI inference, model tier or provider routing, AI Gateway.
- New market, news or fundamentals providers; trading strategy or prompt changes.
- Graph topology redesign, AkariSP redesign or any AkariSP change.
- Persistent event database, distributed tracing, analytics or telemetry services.
- Multi-user, collaboration, multiplayer, public SaaS architecture.
- Agent Town or any visualizer-driven orchestration.
- Mobile-optimized layout.
- Trading-quality claims.

## Roadmap context

- 007 — Upstream-Compatible Server Market Data Boundary: COMPLETE.
- 008 — Pixel Agents Execution Visualization: CURRENT (this spec).
- 009 — BrowserTradingAgents Effectiveness Benchmark: FUTURE; not started here.
