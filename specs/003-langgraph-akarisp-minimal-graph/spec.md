# Feature Specification: Feature 003 — LangGraph.js ↔ AkariSP Minimal Graph Integration

**Feature Branch**: `003-langgraph-akarisp-minimal-graph`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Specify a Feature that answers whether a minimal LangGraph.js graph
executes browser-locally through the existing `AkariChatModel → AkariSP` inference boundary while
preserving fan-out, fan-in, sequential dependency, cancellation, failure propagation, cleanup and
runtime lifecycle semantics, from the canonical root BrowserTradingAgents application. Not the
TradingAgents MVP; no real agents, no external data, no AkariSP changes."

## Purpose

Core question: **Can a minimal LangGraph.js graph execute browser-locally through the existing
`AkariChatModel → AkariSP` inference boundary while preserving fan-out, fan-in, sequential
dependency, cancellation, failure propagation, cleanup and runtime lifecycle semantics?**

This is an architecture/integration validation Feature. It is **not** the Browser TradingAgents
MVP. Feature 004 or a later application Feature introduces the actual agent graph.

Architecture invariant under validation:

```text
Browser application (index.html → application entry)
          ↓
      LangGraph graph
          ↓
      graph nodes
          ↓
    AkariChatModel            (Feature 002 bridge, unchanged in responsibility)
          ↓
       AkariSP                (akarisp@0.1.0-alpha.2, unaware of graphs)
          ↓
  browser LanguageModel / Prompt API
```

Never: an AkariSP API that knows about LangGraph, graph topology, agents or trading semantics.

Feature 003 succeeds only if, in the canonical browser application, the minimal fan-out → fan-in →
sequential workflow reproducibly executes through `AkariChatModel → AkariSP → browser model` with
correct cancellation, controlled-failure, state-propagation and runtime-lifecycle behavior. It
does **not** succeed merely because the LangGraph package can be imported or because a Node-only
graph test passes.

## Baseline

Remote state stated by the user before this Feature:

| Item | Value |
|---|---|
| `main` | `e20abdb13d7c9168601c2ba8f751d4a8abba125d` |
| Feature 002 | COMPLETE (merged) |
| `akarisp` | `0.1.0-alpha.2` |
| `@langchain/core` | `1.2.13` |
| `@langchain/langgraph` | not installed |
| Application integration | `src/integration/akari-chat-model.ts`, `src/integration/structured.ts` |
| Browser surface | `harness/index.html`, `harness/main.ts`; build root = `harness/` |
| Root `index.html` / `src/main.ts` | absent |

Local state verified at specification time (2026-09-28): `main` has legitimately advanced to
`6c79c918b186c6c749900cdb52aa2192b542ed43` (merge of PR #3, test infrastructure: native Prompt API
runs from Playwright without re-downloading the model). That change adds the `prompt-api`
Playwright project, `scripts/prepare-prompt-api-profile.sh` and `docs/testing.md`; it does not
change the integration code, the package versions above, or the absence of a root application.
The actual repository is authoritative; this Feature starts from `6c79c91`. Untracked local Spec
Kit/Claude tooling files present in the working tree are unrelated and are left untouched.

## Inputs From Earlier Features

- **Feature 001** (TradingAgents v0.5.1 @ `35543d0`): upstream analysts run sequentially; running
  independent analysts in parallel is an intentional browser adaptation (Constitution XI). The
  future correspondence below is documentation only.
- **Feature 002**: `AkariChatModel` forwards the caller's cancellation signal into one AkariSP
  run per request and rethrows errors unchanged; AkariSP default concurrency limit is 1; provider
  invocation count is not exposed by the public API; evidence classes and the stand-in provider
  exist; a real Prompt API run can be automated on the development machine (PR #3).
- **Carried-forward observations (not requirements of this Feature)**:
  - **N-6**: the native model may wrap JSON in Markdown fences, causing the strict structured
    parser to use its one free-text fallback. Not solved here unless graph requirements need
    structured parsing (they do not; see FR-014).
  - **N-7**: `system`-role input was accepted by two native Prompt API runs; this is an
    observation, not a contract. Feature 003 correctness MUST NOT depend on it.

## The Minimal Graph

```text
                 ┌─ Branch A ─┐
START ───────────┤            ├─→ Synthesis → Decision → END
                 └─ Branch B ─┘
```

| Node | Reads | Writes | Model requests (success, no fallback) |
|---|---|---|---|
| Branch A | the common input only | Branch A result | 1 |
| Branch B | the common input only | Branch B result | 1 |
| Synthesis | Branch A result **and** Branch B result | synthesis | 1 |
| Decision | synthesis | decision | 1 |

Conceptual future correspondence (documentation only, not implemented): Branch A ≈ future Market
Analyst, Branch B ≈ future News Analyst, Synthesis ≈ future downstream synthesis. Node names,
prompts and state in Feature 003 are neutral and carry no trading semantics.

## Canonical Application Surface

Feature 003 establishes the BrowserTradingAgents application itself as the single canonical
execution surface: a root `index.html` whose application entry (`src/main.ts`) builds and runs
the graph. Automated browser validation and real Chrome Prompt API validation both open this same
entry point.

- No Feature-specific or test-only application is created (for example `feature003.html`,
  `feature003-app/`, `langgraph-harness/`, `graph-test-app.html`).
- The Feature 002 harness (`harness/index.html`, `harness/main.ts`) and its committed evidence
  under `specs/002-…/evidence/` become **historical Feature 002 material**. They are not the
  canonical surface going forward, receive no new features, and committed evidence is not
  rewritten. The harness remains runnable only as far as needed to reproduce Feature 002; how it
  stays reachable once the build root moves is a plan decision, recorded in the plan.

## Responsibility Split

| Owner | Responsibilities |
|---|---|
| Application / LangGraph | graph, nodes, edges, state, fan-out, fan-in, sequential dependencies, prompts, starting graph cancellation, graph failure semantics, runtime construction and shutdown |
| `AkariChatModel` (unchanged role) | one AkariSP run per model request, signal forwarding, error pass-through, request events |
| AkariSP | session/resource reuse, bounded concurrency, queue/backpressure, task cancellation, cleanup, shutdown, snapshot/state, timing |

The graph is not a replacement resource manager for AkariSP.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a minimal LangGraph through AkariSP (Priority: P1)

As an application developer, I open the canonical BrowserTradingAgents page, start the minimal
graph, and obtain its final result through LangGraph → `AkariChatModel` → AkariSP → browser
model, with each node's status and the runtime state visible on the page.

**Why this priority**: it is the Feature's core claim; every other story is a property of this
run.

**Independent Test**: run the graph once with a deterministic model and once in the canonical page
with the stand-in provider; the run finishes with a decision and a complete evidence record.

**Acceptance Scenarios**:

1. **Given** the committed fixture and a model that answers every request, **When** the graph is
   run, **Then** the caller receives final state containing both branch results, a synthesis and a
   decision, and all four nodes report done.
2. **Given** the canonical page, **When** the user presses Run Graph, **Then** node statuses move
   through waiting → running → done, the result and runtime state (active, queued) are shown, and
   an evidence record is produced.
3. **Given** a successful run, **When** request accounting is read, **Then** logical model
   requests equal the number of model-calling node executions (expected 4, verified not assumed)
   and every one of them went through `AkariChatModel`.

---

### User Story 2 - Execute independent branches (Priority: P1)

Branch A and Branch B both start from the same initial input and neither depends on the other's
result.

**Why this priority**: fan-out is the first graph property the future analyst stage needs and the
reason this workload exercises AkariSP queueing.

**Independent Test**: a deterministic model that holds Branch A's request shows Branch B's request
is still issued; the prompts show each branch received only the common input.

**Acceptance Scenarios**:

1. **Given** Branch A's model request is held unanswered, **When** the graph runs, **Then** Branch
   B's model request is also submitted before Branch A completes.
2. **Given** a completed run, **When** the branch prompts are inspected, **Then** each contains the
   common input and neither contains the other branch's result.
3. **Given** AkariSP concurrency limit 1 and both branch requests submitted, **When** the runtime
   is observed, **Then** it reports active 1 and queued 1, and the evidence labels this as graph
   fan-out reaching the AkariSP queue, not as native parallel inference.

---

### User Story 3 - Join independent results (Priority: P1)

Synthesis executes exactly once, only after both branch results exist, and consumes both.

**Why this priority**: an early or duplicated join would silently produce wrong downstream state.

**Independent Test**: complete the branches in both orders with a controllable model; Synthesis
starts only after the second completion, exactly once.

**Acceptance Scenarios**:

1. **Given** Branch A completes while Branch B is still held, **When** the graph is observed,
   **Then** Synthesis has not started.
2. **Given** both branches complete (either order), **When** the graph continues, **Then**
   Synthesis executes exactly once and its prompt contains both branch results.

---

### User Story 4 - Preserve sequential dependency (Priority: P2)

Decision executes only after Synthesis and consumes Synthesis output rather than reprocessing the
original input.

**Why this priority**: the future Bull → Bear → … chain is sequential; this is its smallest form.

**Independent Test**: record node order and Decision's prompt in a deterministic run.

**Acceptance Scenarios**:

1. **Given** a successful run, **When** node order is read, **Then** Decision starts after
   Synthesis completes.
2. **Given** a successful run, **When** Decision's prompt is inspected, **Then** it contains the
   synthesis output and not the branch-specific fixture facts.

---

### User Story 5 - Cancel and fail safely (Priority: P2)

Cancellation started by the caller, or a controlled failure of one branch, reaches the graph
caller as cancellation/failure without leaving AkariSP active or queued work behind.

**Why this priority**: lifecycle correctness under abort and failure is what AkariSP is being
dogfooded for.

**Independent Test**: abort a run while both branches are in flight; separately, make Branch B
fail while Branch A succeeds; in both cases check the caller outcome, downstream node state and the
runtime snapshot.

**Acceptance Scenarios**:

1. **Given** both branch requests are in flight (one active, one queued under limit 1), **When**
   the caller aborts the graph run, **Then** the caller observes cancellation/failure (never a
   normal result), the abort reaches each in-flight `AkariChatModel` request and its AkariSP run,
   and the runtime eventually reports active 0 and queued 0.
2. **Given** Branch A succeeds and Branch B's model request fails with a controlled error,
   **When** the graph runs, **Then** the caller observes the failure with the original error
   semantics preserved, Synthesis and Decision are not reported as valid success, and the runtime
   eventually reports active 0 and queued 0.
3. **Given** a run ended by success, cancellation or controlled failure, **When** the application
   shuts the runtime down, **Then** shutdown completes and no orphaned task remains.

---

### Edge Cases

- **Abort before the run starts** (signal already aborted): the caller observes cancellation; no
  model request completes successfully.
- **Abort after the run completed**: has no effect on the delivered result.
- **Abort while Synthesis or Decision runs** (not only during branches): must also end in
  cancellation with active 0 and queued 0. Required scenario is during branches; this one is
  recorded if observed.
- **Branch A fails while Branch B is still queued**: Branch B's AkariSP task must still settle;
  whether LangGraph lets it finish or cancels it is recorded, not assumed.
- **Both branches fail**: caller observes failure; no synthesis.
- **Native model unavailable**: the page reports it; the run is classified `BLOCKED`, never
  replaced by stand-in evidence.
- **Run pressed twice / Run during a run**: the page must not start a second concurrent graph run
  on the same runtime (one run per owner at a time).
- **Model returns empty text**: treated as that node's output (answer quality is not evaluated);
  the graph still proceeds.

## Requirements *(mandatory)*

### Functional Requirements

**Dependencies and boundaries**

- **FR-001**: The application MUST add exactly one new production dependency,
  `@langchain/langgraph`, at an exact version that is current, declares compatibility with the
  installed `@langchain/core`, and is pinned through the lockfile. The version is selected during
  planning research from the registry, not from memory.
- **FR-002**: `@langchain/core` MUST stay at `1.2.13` unless the selected LangGraph version
  requires otherwise; any change MUST be justified in research.
- **FR-003**: AkariSP MUST be consumed only through `akarisp@0.1.0-alpha.2` public exports. AkariSP
  source, public API and runtime dependency changes MUST be 0.
- **FR-004**: Every graph-node model call MUST go through `AkariChatModel`; no node calls AkariSP
  directly.
- **FR-005**: `AkariChatModel` MUST NOT gain graph awareness, agent awareness, queue management,
  semaphore, pool, retry framework, runtime manager, model router or provider registry. Any bridge
  change requires recorded evidence that the current boundary cannot express the Feature.

**Graph semantics**

- **FR-006**: The graph MUST contain exactly the four model-calling nodes Branch A, Branch B,
  Synthesis and Decision, with the topology in *The Minimal Graph*.
- **FR-007**: Branch A and Branch B MUST each read only the common input, MUST NOT depend on each
  other's result, and MUST both be eligible to start from the initial state.
- **FR-008**: Synthesis MUST start only after both branch results exist, MUST execute exactly once
  per successful run, and MUST receive both branch results.
- **FR-009**: Decision MUST start only after Synthesis completes and MUST receive the synthesis
  output, not re-read the branch-specific input.
- **FR-010**: Graph state MUST be limited to the input, the two branch results, the synthesis and
  the decision (plus any small primitive the pinned LangGraph API strictly requires, documented in
  research). TradingAgents state (debate, risk, reports, plans, portfolio, reflection, memory,
  message history) MUST NOT be added.
- **FR-011**: Input MUST be a small committed deterministic fixture (for example a company name and
  one set of facts per branch) with neutral content; no network data source.

**Runtime lifecycle**

- **FR-012**: For one graph run, the application MUST create one AkariSP runtime shared by all
  nodes, and MUST shut it down after the run settles (success, cancellation or failure). The graph
  and nodes MUST NOT create or shut down runtimes.
- **FR-013**: The AkariSP concurrency limit MUST be an explicit, recorded configuration chosen in
  research; the default expectation is AkariSP's default (1). It MUST NOT be raised to 2 merely
  because the graph has two branches.
- **FR-014**: Nodes MUST use plain text model output. The Feature MUST NOT depend on structured
  output, the structured fallback helper, tool calling or `system`-role behavior (N-6, N-7).

**Cancellation and failure**

- **FR-015**: The caller MUST be able to abort a graph run. The abort MUST propagate caller →
  graph execution → running node → `AkariChatModel` → AkariSP run. The actual LangGraph
  cancellation mechanism is determined in research against the pinned version.
- **FR-016**: An aborted run MUST surface to the caller as cancellation/failure, never as a normal
  result.
- **FR-017**: A controlled failure in one branch MUST surface to the caller as graph failure,
  preserving the original error (for AkariSP errors, its task error code). Synthesis and Decision
  MUST NOT be presented as valid success from partial state. No retry or recovery path is added.
- **FR-018**: After success, cancellation and controlled failure, the runtime MUST eventually
  report active 0 and queued 0 before shutdown, and shutdown MUST complete.

**Observability and accounting**

- **FR-019**: Each run MUST record node execution order and per-node status (waiting, running,
  done, error), logical model requests per node and in total, fallback requests (expected 0), and
  AkariSP active/queued snapshots at the fan-out point and after settlement.
- **FR-020**: Records MUST keep these terms distinct: graph run, node execution, logical model
  request, fallback request, AkariSP active task, AkariSP queued task, provider invocation.
  Provider invocation count MUST be recorded as `NOT EXPOSED` while the AkariSP public API does not
  expose it; it MUST NOT be inferred.
- **FR-021**: Records MUST distinguish graph concurrency (both branch requests submitted), AkariSP
  concurrency (active/queued) and native-provider concurrency (not observed, out of scope).

**Canonical application**

- **FR-022**: The root `index.html` with application entry `src/main.ts` MUST be the single
  canonical surface. It MUST offer Run Graph and Cancel, per-node status, result, runtime
  active/queued, and an evidence record. No UI framework is introduced; UI polish is out of scope.
- **FR-023**: The canonical application MUST support selecting the stand-in provider for automated
  validation without becoming a separate application, and MUST record which provider ran.
- **FR-024**: Feature 002 harness files and committed evidence MUST remain as historical material
  and MUST NOT be rewritten.

**Evidence**

- **FR-025**: Evidence MUST be classified per Constitution VI:
  - `DETERMINISTIC_TEST` — controlled model: topology, branch independence, fan-out, fan-in,
    Synthesis exactly once, Decision ordering, state propagation, request counts, controlled
    failure, cancellation wiring.
  - `NODE_INTEGRATION` — real LangGraph + real `AkariChatModel` + real `akarisp` + stand-in
    `LanguageModel`: fan-out reaching the AkariSP queue, cancellation and failure settlement,
    shutdown. Labelled as not browser evidence.
  - `BROWSER_AUTOMATED` — the canonical page in automated Chromium with `provider = stand-in`:
    success run and cancellation run. Never presented as Prompt API evidence.
  - `REAL_BROWSER_PROMPT_API` — the canonical page in a compatible Chrome with the native Prompt
    API: at least one successful full graph run. Recorded only when the native model is available
    and the graph completes; otherwise `BLOCKED`. Stand-in evidence never substitutes.
- **FR-026**: Every evidence record MUST include BrowserTradingAgents revision, package versions
  (`akarisp`, `@langchain/core`, `@langchain/langgraph`), fixture identity, prompt source, graph
  configuration, runtime concurrency configuration, provider, runner, date and evidence class
  (Constitution VII).
- **FR-027**: Any incompatibility between LangGraph, LangChain and AkariSP MUST be recorded as a
  finding (format below) before any workaround; application-local workarounds stay in
  BrowserTradingAgents; no AkariSP change is made in this Feature.

### Finding Format

```text
Finding ID:
Feature:
Scenario:
Observed:
Expected:
Reproduction:
Evidence class:
LangGraph contract involved:
LangChain contract involved:
AkariSP contract involved:
Application workaround possible?:
Core change required?:
Confidence:
```

### Explicit Non-Goals

- Agents and semantics: Market Analyst, News Analyst, Bull, Bear, Research Manager, Trader, Risk
  Reviewer, Final Decision; TradingAgents prompts or business state; debate, risk debate,
  reflection memory.
- Data: Yahoo Finance, Alpha Vantage, Finnhub, FRED, Reddit, StockTwits, SEC, crypto exchange
  APIs, any real market/news data.
- Graph features: checkpoint or graph persistence, human-in-the-loop, long-term memory, subgraphs,
  dynamic routing, tool loops, agent retries, recovery graphs, conditional trading decisions.
- Abstractions: generic AgentRuntime, GraphRuntime, GraphModelPool, AkariLangGraphAdapter,
  AgentExecutorFactory, NodeModelRegistry, InferenceCoordinator.
- AkariSP: source changes, public API additions, a LangGraph adapter, graph awareness.
- Solving N-6; relying on N-7; UI frameworks (React, Vue, Svelte, Next.js); UI polish; claims about
  native model/GPU parallel inference; answer or trading quality.

### Key Entities

- **Fixture**: committed neutral input — a subject name plus one set of facts for Branch A and one
  for Branch B; has a stable identity recorded in evidence.
- **Graph state**: input, Branch A result, Branch B result, synthesis, decision.
- **Graph run**: one execution of the graph from START to END or to cancellation/failure; owns one
  runtime for its duration; outcome is success, cancelled or failed.
- **Node execution**: one execution of a node within a run; has status and order; issues one
  logical model request in the success path.
- **Evidence record**: the per-run record defined by FR-019–FR-021 and FR-026, tagged with one
  evidence class.
- **Finding**: an incompatibility write-up in the format above.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: One exact `@langchain/langgraph` version compatible with the installed
  `@langchain/core` is selected with recorded registry evidence and pinned in the lockfile; new
  production dependencies = 1.
- **SC-002**: The minimal graph completes under deterministic tests.
- **SC-003**: Branch independence is shown: Branch B's request is submitted while Branch A's is
  held, and neither branch prompt contains the other's result.
- **SC-004**: Synthesis starts only after both branch completions (verified for both completion
  orders) and runs exactly once per successful run, consuming both results.
- **SC-005**: Decision starts after Synthesis completes and its input contains the synthesis output
  and not the branch facts.
- **SC-006**: 100% of node model calls reach AkariSP through `AkariChatModel`; direct AkariSP calls
  from graph code = 0.
- **SC-007**: A caller abort during branch execution reaches every in-flight `AkariChatModel`
  request and its AkariSP run, and the caller observes cancellation (normal results after abort
  = 0).
- **SC-008**: A controlled Branch B failure surfaces as graph failure with the original error;
  Synthesis/Decision reported as valid success = 0.
- **SC-009**: After success, cancellation and controlled failure, AkariSP active = 0 and queued = 0,
  and shutdown completes.
- **SC-010**: The canonical root page completes a success run and a cancellation run in
  `BROWSER_AUTOMATED` validation with `provider = stand-in`.
- **SC-011**: The same canonical page obtains `REAL_BROWSER_PROMPT_API` evidence of a complete
  graph run, or the Feature is truthfully reported `BLOCKED` (not COMPLETE).
- **SC-012**: AkariSP source changes = 0.
- **SC-013**: AkariSP public API changes = 0.
- **SC-014**: Real TradingAgents agents implemented = 0.
- **SC-015**: External market/news dependencies = 0.
- **SC-016**: New generic graph/agent/runtime abstractions = 0.
- **SC-017**: Canonical application surfaces = 1 (root `index.html`); Feature-specific or test-only
  applications created = 0.
- **SC-018**: Typecheck, production build, deterministic tests, Node integration and browser
  automated validation all pass.
- **SC-019**: Every evidence record states graph concurrency, AkariSP active/queued and
  native-provider concurrency separately; claims of native parallel inference = 0.
- **SC-020**: Provider invocation count is recorded as `NOT EXPOSED` in every record while the
  published AkariSP API does not expose it.
- **SC-021**: For a successful run, logical model requests = 4 and fallback requests = 0, as
  measured (a different measured value is recorded and explained, not overwritten).

### Completion Model

- **Implementation complete**: SC-001–SC-010 and SC-012–SC-021 pass.
- **Feature complete**: additionally SC-011 passes with `REAL_BROWSER_PROMPT_API`. If the native
  model is unavailable, the Feature status is BLOCKED / INCOMPLETE.

## Assumptions

- The development machine can produce `REAL_BROWSER_PROMPT_API` evidence through the PR #3
  infrastructure (installed Google Chrome + reused on-device model) or a manual run of the same
  page; either runner is recorded.
- The Feature 002 stand-in `LanguageModel` can be reused for Node integration and automated browser
  runs; any extension (for example holding a specific request, or failing a specific request) stays
  test-side.
- AkariSP concurrency limit 1 is the expected configuration; research may justify another explicit
  value.
- Cancellation in the real-browser run is desirable but the required real-browser gate is the
  success run; cancellation and failure semantics are proven by deterministic, Node integration and
  automated browser evidence.
- Controlled failure is injected by the test model/provider, not by production code paths.
- Structured output is not used; plain text outputs suffice for graph-semantics validation.
- LangGraph API specifics (state definition, reducers, edge declaration, compile/invoke options,
  where the abort signal is passed, how parallel branches join) are unknown until research against
  the pinned version and are intentionally not fixed here.
