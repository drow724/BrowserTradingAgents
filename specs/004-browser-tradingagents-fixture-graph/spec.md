# Feature Specification: Feature 004 — Browser TradingAgents Fixture Graph

**Feature Branch**: `004-browser-tradingagents-fixture-graph`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Specify the first semantically meaningful TradingAgents-style workflow
in the browser: eight roles (Market Analyst, News Analyst, Bull Researcher, Bear Researcher,
Research Manager, Trader, Risk Reviewer, Final Decision) on deterministic local fixtures, through
the Feature 003 LangGraph → AkariChatModel → AkariSP path, preserving Feature 001's role and
dependency boundaries. Not real market data; not a fidelity/completeness port."

## Purpose

Core question: **Can BrowserTradingAgents execute its first semantically meaningful
TradingAgents-style workflow in the browser, preserving the role and dependency boundaries found
in Feature 001, while using deterministic local fixtures and the already validated LangGraph →
AkariChatModel → AkariSP inference path?**

This is the first Feature whose graph nodes represent TradingAgents roles. It is **not** a
real-market-data Feature (Feature 005 candidate) and **not** a TradingAgents fidelity or
completeness Feature. Success is judged on orchestration, semantic boundaries and lifecycle, never
on the quality of any investment conclusion (Constitution VIII).

## Baseline

Verified at specification time (2026-09-28):

| Item | Value |
|---|---|
| `origin/main` | `4627c738be176b9b714337e5f9c0c62c038562a1` — merge of PR #4 (Feature 003 complete) |
| Feature branch | `004-browser-tradingagents-fixture-graph`, created from `origin/main` @ `4627c73` |
| Feature 003 | COMPLETE (implementation `4e64472`; `REAL_BROWSER_PROMPT_API` PASS) |
| `akarisp` / `@langchain/core` / `@langchain/langgraph` | `0.1.0-alpha.2` / `1.2.13` / `1.4.18` |
| Canonical app | root `index.html` → `src/main.ts`, running the Feature 003 minimal graph |
| Feature 002 harness | historical, `/harness/` |

Untracked local Spec Kit/Claude tooling files are unrelated and left untouched.

## Inputs From Earlier Features

**Feature 001** (TradingAgents v0.5.1 @ `35543d0`, research §4, §7, §8, §10–§12) — reference
facts this Feature relies on:

- Upstream analysts run **sequentially** (finding F001-001). Analysts read no other analyst's
  report, so running two of them in parallel is a scheduling change, not a semantic one (A1).
- Bull and Bear form a **strict data dependency**: Bear reads Bull's latest argument (§7.3).
  Running them in parallel would change the debate semantics.
- Research Manager reads **only the debate** (not the analyst reports) and produces the
  investment plan; Trader reads the **investment plan and the market report**; the final
  decision (upstream Portfolio Manager) reads the **risk review, investment plan and trader plan**,
  not the analyst reports (§4.8, §4.9, §4.13, §8.4). These are three distinct boundaries.
- Feature 001's minimum browser graph (§12) is exactly the eight-node topology below, with
  adaptations A1–A14 (§11).

**Feature 002/003** — boundaries that are reused unchanged: `AkariChatModel` (one AkariSP run per
model request, signal and errors passed through); LangGraph's browser entry; explicit forwarding
of the node's abort signal to the model (observation O-1); one AkariSP runtime per graph run with
concurrency limit 1; settlement checked on a `ready` runtime before shutdown (O-2); evidence
classes; canonical page; real-Chrome automation on the development machine.

## Reference Behavior vs BrowserTradingAgents Adaptation

This graph is **not** an exact topology port of upstream TradingAgents.

| Aspect | Upstream reference (Feature 001) | This Feature | Kind |
|---|---|---|---|
| Analyst scheduling | sequential chain | Market ‖ News, then fan-in | intentional adaptation A1 (browser orchestration, AkariSP fan-out/backpressure dogfooding) |
| Analyst set | 4 by default | Market + News | upstream-supported subset A2 |
| Data | live vendors, tool loops | committed fixture in the prompt | A3, A4 |
| Bull → Bear | sequential, opponent-aware, 1 round by default | sequential, Bear reads Bull, 1 round | **preserved** |
| Research Manager | reads debate only | reads Bull and Bear arguments only | **preserved** boundary |
| Trader | reads investment plan + market report | reads research decision + market report | **preserved** boundary (no portfolio, A9) |
| Risk stage | 3-way rotating debate | one Risk Reviewer | simplification A5 |
| Final Decision | Portfolio Manager | Final Decision, no portfolio/past context | A6, A9 |
| Routing | count/label routers | static edges | A10 |
| Structured output | RM/Trader/PM structured + one fallback | plain text output for every role | **deviation from Feature 001 proposal A11** (see Constitution Alignment) |
| Models | quick/deep split | one browser model | A12 |

## Target Role Graph

```text
                    ┌─ Market Analyst ─┐
START ──────────────┤                  ├─ fan-in ─→ Bull Researcher
                    └─ News Analyst ───┘                  │
                                                          ▼
                                                   Bear Researcher
                                                          ▼
                                                  Research Manager
                                                          ▼
                                                        Trader
                                                          ▼
                                                   Risk Reviewer
                                                          ▼
                                                   Final Decision ─→ END
```

Explicitly out of scope: Bull and Bear as parallel branches joined before Research Manager.

## Role Contracts

Each role makes exactly one model request (plain text) and writes exactly one semantic field.
"Reads" is the complete set of state it may use; anything not listed must not appear in its
request.

| Role | Reads | Must not read | Writes | Reference |
|---|---|---|---|---|
| Market Analyst | subject context, market facts | news facts, any role output | `marketReport` | §4.1, A1, A4 |
| News Analyst | subject context, news facts | market facts, any role output | `newsReport` | §4.3, A1, A4 |
| Bull Researcher | `marketReport`, `newsReport` | raw fixture facts | `bullArgument` | §4.6 (opening turn) |
| Bear Researcher | `marketReport`, `newsReport`, `bullArgument` | raw fixture facts | `bearArgument` | §4.7, §7.3 |
| Research Manager | `bullArgument`, `bearArgument` | analyst reports, raw facts | `researchDecision` | §4.8 (debate only) |
| Trader | `researchDecision`, `marketReport` | `newsReport`, Bull/Bear arguments, raw facts | `traderPlan` | §4.9 |
| Risk Reviewer | `traderPlan`, `researchDecision`, `marketReport`, `newsReport` | Bull/Bear arguments, raw facts | `riskReview` | §12 (A5) |
| Final Decision | `riskReview`, `researchDecision`, `traderPlan` | analyst reports, Bull/Bear arguments, raw facts | `finalDecision` | §4.13 (A6, A9) |

The subject context (a neutral name) may appear in any role's request; it carries no role output.

## Responsibility Split (unchanged from Feature 003)

| Owner | Responsibilities |
|---|---|
| Application / LangGraph | role topology, state, prompt construction, semantic dependencies, cancellation initiation, failure semantics, runtime construction and shutdown |
| `AkariChatModel` | one AkariSP run per model request, signal forwarding, error pass-through, request events |
| AkariSP | resource reuse, bounded concurrency, queue/backpressure, task cancellation, cleanup, shutdown, snapshot, timing |

AkariSP stays unaware of every role name, the topology and TradingAgents semantics.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run the full fixture workflow (Priority: P1)

As a developer, I open the canonical BrowserTradingAgents page, run the eight-role fixture
workflow, and see every role's status and the Final Decision, produced through LangGraph →
AkariChatModel → AkariSP → browser model.

**Why this priority**: it is the Feature's core claim; all other stories are properties of this
run.

**Independent Test**: one run with a deterministic model and one run in the canonical page with
the stand-in provider both end with a final decision and a complete evidence record.

**Acceptance Scenarios**:

1. **Given** the committed fixture and a model that answers every request, **When** the workflow
   runs, **Then** all eight roles execute exactly once, all eight semantic fields are filled, and
   the caller receives the final state.
2. **Given** the canonical page, **When** the user runs the workflow, **Then** each of the eight
   roles shows waiting → running → done, the final decision is shown, runtime state is visible,
   and an evidence record is produced.
3. **Given** a successful run, **When** accounting is read, **Then** logical model requests and
   fallback requests are reported as measured (expected 8 and 0) and provider invocations as
   `NOT EXPOSED`.

---

### User Story 2 - Independent analysts with fan-out and fan-in (Priority: P1)

Market Analyst and News Analyst start independently from the fixture; Bull Researcher starts only
when both reports exist.

**Why this priority**: it is the one intentional topology adaptation (A1) and the AkariSP
fan-out/backpressure workload.

**Independent Test**: hold either analyst's request with a controllable model; the other
analyst's request is still issued and Bull does not start until the held one completes.

**Acceptance Scenarios**:

1. **Given** the Market Analyst request is held, **When** the workflow runs, **Then** the News
   Analyst request is also submitted before Market completes (and vice versa).
2. **Given** a completed run, **When** the analyst requests are inspected, **Then** each contains
   only its own fixture facts and neither contains the other's facts or output.
3. **Given** one analyst completed and the other held (either order), **When** the graph is
   observed, **Then** Bull Researcher has executed zero times; after the held analyst completes,
   Bull executes exactly once.
4. **Given** AkariSP concurrency limit 1 and both analyst requests submitted, **When** the runtime
   is observed, **Then** it reports active 1 and queued 1, recorded as graph fan-out reaching the
   AkariSP queue — not as native parallel inference.

---

### User Story 3 - Research debate semantics (Priority: P1)

Bear runs after Bull and answers Bull's argument; Research Manager synthesizes the two arguments
and nothing else.

**Why this priority**: the Bull → Bear dependency is the reference semantic that a naive parallel
design would destroy (Feature 001 §7.3).

**Independent Test**: record role order and requests in a deterministic run.

**Acceptance Scenarios**:

1. **Given** a run, **When** role order is read, **Then** Bear starts only after Bull completes.
2. **Given** a run, **When** Bear's request is inspected, **Then** it contains Bull's argument and
   both analyst reports.
3. **Given** a run, **When** Research Manager's request is inspected, **Then** it contains Bull's
   and Bear's arguments and contains neither analyst report nor raw fixture facts.

---

### User Story 4 - Downstream decision provenance (Priority: P1)

Research Manager → Trader → Risk Reviewer → Final Decision execute in order, each consuming its
intended upstream fields.

**Why this priority**: three distinct decision boundaries are the difference between a
TradingAgents-style workflow and a chain of summaries (Feature 001 §8.4).

**Independent Test**: record role order and requests in a deterministic run.

**Acceptance Scenarios**:

1. **Given** a run, **When** role order is read, **Then** Trader starts after Research Manager
   completes, Risk Reviewer after Trader, Final Decision after Risk Reviewer.
2. **Given** a run, **When** each downstream request is inspected, **Then** it contains exactly the
   fields its role contract lists and none of the fields it must not read.
3. **Given** a successful run, **When** the final state is read, **Then** `finalDecision` holds the
   Final Decision role's output and every intermediate field holds the output of the role that
   wrote it.

---

### User Story 5 - Cancel or fail a long role graph safely (Priority: P2)

Cancellation or a controlled role failure stops the workflow before the Final Decision and leaves
no AkariSP work behind.

**Why this priority**: the eight-role graph is the first long workload; lifecycle correctness must
hold at every depth, not only at the fan-out.

**Independent Test**: abort during the analyst fan-out and again during the sequential chain; fail
an early role and a late role; check caller outcome, downstream roles and runtime settlement.

**Acceptance Scenarios**:

1. **Given** both analyst requests in flight, **When** the caller aborts, **Then** the caller
   observes cancellation, no role after the analysts runs, and AkariSP reaches active 0 / queued 0
   on a `ready` runtime before shutdown.
2. **Given** a sequential-chain role in flight (e.g. Research Manager or Trader), **When** the
   caller aborts, **Then** the caller observes cancellation, no later role runs, no
   `finalDecision` is produced, and AkariSP settles before shutdown.
3. **Given** an analyst (e.g. News) fails with a controlled error, **When** the workflow runs,
   **Then** the caller observes that failure and Bull and every later role execute zero times.
4. **Given** a late role (e.g. Trader) fails with a controlled error, **When** the workflow runs,
   **Then** the caller observes that failure, Risk Reviewer and Final Decision execute zero times,
   and roles before Trader keep their completed outputs in the evidence.

---

### Edge Cases

Required behavior (deterministic evidence):

- **Analyst returns empty text**: the empty report is passed downstream as that role's output and
  the workflow continues; it is not treated as a failure.
- **Cancellation during analyst fan-out** and **during the sequential chain**: US5 scenarios 1–2.
- **Early failure (analyst)** and **late failure (Trader)**: US5 scenarios 3–4.
- **Repeated Run** after a completed, cancelled or failed run: a new run with its own runtime; no
  state, request or runtime from the previous run leaks into it; Run is unavailable while a run is
  in progress.

Observation-only (recorded if seen, not a gate):

- Bull returns empty text; Bear fails; failure of other individual roles (covered by the general
  failure contract, FR-021).
- The native model becomes unavailable before a run: the page reports it and records `BLOCKED`
  (never replaced by stand-in evidence).
- Native model output that ignores the requested format: content is not evaluated.
- Total native run duration versus the page's protection timeout (the plan decides the value).

## Requirements *(mandatory)*

### Functional Requirements

**Roles, topology and data**

- **FR-001**: The workflow MUST consist of exactly eight model-calling roles — Market Analyst,
  News Analyst, Bull Researcher, Bear Researcher, Research Manager, Trader, Risk Reviewer, Final
  Decision — in the topology of *Target Role Graph*.
- **FR-002**: Input MUST be a committed, local, deterministic fixture with a neutral fictional
  subject, one set of market facts and one set of news facts, with a stable identity recorded in
  evidence. The fixture MUST be distinct from Feature 003's `minimal-graph-fixture`.
- **FR-003**: Market Analyst and News Analyst MUST each read only the subject context and their own
  fixture facts, MUST NOT depend on each other's output, and MUST both be eligible to start from
  the initial state.
- **FR-004**: Both analyst requests MUST be submitted before either analyst is required to complete.
- **FR-005**: Bull Researcher MUST start only after both `marketReport` and `newsReport` exist and
  MUST execute exactly once per successful run.
- **FR-006**: Bear Researcher MUST start only after Bull Researcher completes and its request MUST
  contain `bullArgument` (plus both analyst reports).
- **FR-007**: Research Manager, Trader, Risk Reviewer and Final Decision MUST each start only after
  their predecessor completes, and each request MUST contain exactly the fields listed in *Role
  Contracts* and none of the fields listed as "must not read".
- **FR-008**: Research Manager and Trader MUST remain distinct roles writing distinct fields
  (`researchDecision`, `traderPlan`); the risk stage MUST be a single Risk Reviewer.
- **FR-009**: Workflow state MUST expose the semantic fields `input`, `marketReport`, `newsReport`,
  `bullArgument`, `bearArgument`, `researchDecision`, `traderPlan`, `riskReview`, `finalDecision`,
  each written only by its role. A generic message list MUST NOT replace these fields.
- **FR-010**: Role outputs MUST be plain text; the workflow MUST NOT depend on structured output,
  the structured fallback helper, tool calling or `system`-role support.

**Integration and lifecycle**

- **FR-011**: Every role's model call MUST go through `AkariChatModel`; no role calls AkariSP
  directly. `AkariChatModel` and AkariSP MUST NOT change (source, public API, dependency) and MUST
  NOT gain role, topology or trading awareness.
- **FR-012**: One graph run MUST own one AkariSP runtime (concurrency limit 1 unless the plan
  justifies another explicit value) and one model instance, created at run start and shut down after
  the run settles; roles MUST NOT create or shut down runtimes.
- **FR-013**: The caller MUST be able to abort a run; the abort MUST reach every in-flight or
  queued role request through explicit signal propagation (Feature 003 O-1).
- **FR-014**: An aborted run MUST surface as cancellation, never as a result, and MUST produce no
  `finalDecision`; no role after the in-flight ones may run.
- **FR-015**: A controlled failure in any role MUST surface to the caller with the original error
  preserved; every role that depends on the failed role MUST execute zero times. No retry or
  recovery path.
- **FR-016**: After success, cancellation and failure, AkariSP MUST reach active 0 / queued 0 on a
  `ready` runtime before shutdown, recorded separately from the caller's outcome (Feature 003 O-2).

**Observability and evidence**

- **FR-017**: Each run MUST record role execution order and per-role status (waiting, running,
  done, error), each role's written field, logical model requests per role and in total, fallback
  requests (measured), provider invocations as `NOT EXPOSED`, AkariSP snapshots at the analyst
  fan-out and before/after shutdown, and the result or error.
- **FR-018**: Records MUST keep distinct: graph run, role execution, logical model request, fallback
  request, AkariSP active task, AkariSP queued task, provider invocation, native provider
  concurrency (not observed).
- **FR-019**: The canonical page (root `index.html` → `src/main.ts`) MUST run this workflow, show
  status for all eight roles, show `finalDecision`, show runtime state, and produce the evidence
  record. No Feature 004-specific application; no UI framework; no trading dashboard.
- **FR-020**: Evidence MUST be classified truthfully: `DETERMINISTIC_TEST`, `NODE_INTEGRATION`
  (stand-in), `BROWSER_AUTOMATED` (canonical page, stand-in), `REAL_BROWSER_PROMPT_API` (canonical
  page, native, model available) or `BLOCKED`. Stand-in evidence never counts as Prompt API
  evidence.
- **FR-021**: The evidence record MUST extend the Feature 003 evidence contract (same terms and
  field names where they apply) and add what the role graph needs (per-role fields/provenance,
  fixture and graph identity).
- **FR-022**: Feature 001–003 evidence and historical files MUST NOT be rewritten; Feature 003's
  minimal-graph evidence remains Feature 003 evidence.

**Scope**

- **FR-023**: No external data source (market, news, financial or search API), no API key, no
  server or proxy, no network request other than the page's own assets.
- **FR-024**: Success MUST NOT be judged on investment correctness, action accuracy, profitability
  or forecast quality; role output wording is never asserted.
- **FR-025**: Any incompatibility between LangGraph, LangChain and AkariSP MUST be recorded as a
  finding (project format) before any workaround; no AkariSP change within this Feature.

### Explicit Non-Goals

- Real market/news APIs, API keys, server/backend proxy, brokerage, orders, paper trading, PnL or
  performance evaluation.
- Checkpoint persistence, cross-session memory, reflection, human-in-the-loop.
- Dynamic routing, conditional trading branches, `Send`-style dynamic fan-out, subgraphs (unless
  planning proves one strictly necessary), tool calling, web search agents, retrieval/RAG.
- Multi-round Bull/Bear debate, the three-way risk debate team, multiple risk personas, Sentiment
  and Fundamentals analysts.
- Generic agent/graph/role frameworks, provider registry, runtime manager, `AgentRuntime`,
  `TradingRuntime`, `GraphRuntime`, `InferenceCoordinator`, `TradingAgentPool`, `RoleModelPool`,
  `AkariLangGraphAdapter`.
- AkariSP changes of any kind; native-provider parallelism claims.

### Feature 005 Boundary

Real market/news data is the next candidate Feature. Deferred there: browser CORS constraints,
API-key ownership, a thin server-side data proxy, data normalization, freshness, rate limits, and
fixture vs live mode (see `docs/roadmap.md`). Feature 004 keeps the fixture as its only input.

### Key Entities

- **TradingAgents fixture**: subject name, market facts, news facts; stable identity; neutral and
  fictional.
- **Workflow state**: the nine semantic fields of FR-009.
- **Role execution**: one execution of one role in a run; status, order, logical request count.
- **Graph run**: one execution owning one runtime; outcome success, cancelled or failed.
- **Evidence record**: the per-run record of FR-017/FR-021, one evidence class.
- **Finding**: an incompatibility write-up in the project finding format.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a normal deterministic run, each of the eight roles executes exactly once and all
  nine state fields are filled, each by its own role.
- **SC-002**: Both analyst requests are submitted before either analyst completes.
- **SC-003**: Each analyst's request contains its own facts and none of the other analyst's facts
  or output.
- **SC-004**: Bull Researcher executes 0 times while either analyst is incomplete (both completion
  orders), then exactly once.
- **SC-005**: Bear starts after Bull completes, and Bear's request contains Bull's argument.
- **SC-006**: Research Manager's request contains Bull's and Bear's arguments and 0 analyst reports
  or raw facts.
- **SC-007**: Trader starts after Research Manager, Risk Reviewer after Trader, Final Decision after
  Risk Reviewer; each downstream request contains exactly its contracted fields (0 forbidden
  fields).
- **SC-008**: After a successful run `finalDecision` is non-null and was written by the Final
  Decision role.
- **SC-009**: Logical model requests for a successful run are measured and equal 8; fallback
  requests are measured and equal 0; a different measured value is recorded and explained, never
  overwritten.
- **SC-010**: An early controlled failure (analyst) yields 0 executions of Bull and every later
  role; a late controlled failure (Trader) yields 0 executions of Risk Reviewer and Final Decision;
  the caller receives the original error in both.
- **SC-011**: Cancellation during the analyst fan-out and during the sequential chain each yield 0
  successful `finalDecision` and 0 roles started after the abort.
- **SC-012**: After cancellation and after failure, AkariSP reports active 0 and queued 0 on a
  `ready` runtime before shutdown, and shutdown completes.
- **SC-013**: With concurrency limit 1, the analyst fan-out is observed as active 1 / queued 1;
  claims of native parallel inference = 0.
- **SC-014**: 100% of role model calls reach AkariSP through `AkariChatModel`; direct AkariSP calls
  from role code = 0.
- **SC-015**: The canonical page completes a successful run and a cancellation run under
  `BROWSER_AUTOMATED` with `provider = stand-in`, showing all eight role statuses and the final
  decision.
- **SC-016**: The canonical page completes one successful eight-role run on the native Prompt API
  in real Chrome (`REAL_BROWSER_PROMPT_API`), or the Feature is reported `BLOCKED` (not complete).
- **SC-017**: AkariSP source and public API changes = 0.
- **SC-018**: External market/news/data dependencies and network data requests = 0.
- **SC-019**: New generic agent/graph/runtime abstractions = 0; Feature-specific applications = 0.
- **SC-020**: Feature 001–003 historical files changed = 0.
- **SC-021**: Typecheck, production build, deterministic tests, Node integration and browser
  automated validation all pass, including every Feature 002/003 test that remains in the suite.

### Completion Model

- **Implementation complete**: SC-001–SC-015 and SC-017–SC-021 pass.
- **Feature complete**: additionally SC-016 passes with `REAL_BROWSER_PROMPT_API`. If the native
  model is unavailable, the Feature status is BLOCKED / INCOMPLETE.

## Constitution Alignment

| Principle | How this Feature complies | Visible tension |
|---|---|---|
| I. Dogfood Before Abstraction | eight concrete roles, no role framework | a per-role helper may be needed; must stay Feature-local |
| II. Deterministic Fixtures First | committed fixture only | — |
| III. Application Owns Orchestration | roles, topology, prompts, cancellation in the app | — |
| IV. AkariSP Owns Inference Lifecycle | queue, cancel, cleanup, shutdown stay in AkariSP | — |
| V. Evidence Before Core Change | AkariSP changes 0; findings first | — |
| VI. Browser First | completion needs `REAL_BROWSER_PROMPT_API` on the canonical page | — |
| VII. Reproducible Agent Runs | evidence records revision, versions, fixture, graph, runtime, provider, class | — |
| VIII. No Trading-Quality Claims | output wording and decisions never asserted | roles now carry trading names; neutrality lives in the evaluation, not the vocabulary |
| IX. External Data Deferred | fixture only; Feature 005 boundary | — |
| X. Thin Integration Boundaries | `AkariChatModel` unchanged | — |
| XI. Preserve Reference Semantics Explicitly | *Reference vs Adaptation* table; Bull → Bear kept sequential | **plain-text roles deviate from Feature 001 proposal A11** (structured output + one fallback for RM/Trader/Final); chosen to keep request counts deterministic (8, not 8–11) and because browser structured output is unproven (Feature 002 N-6); recorded as an explicit adaptation, reversible in a later Feature |
| XII. Findings Before Fixes | finding format required (FR-025) | — |

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

No finding is known at specification time; expected default: Core change required = NO.

## Assumptions

- Feature 003's patterns (explicit signal forwarding, per-run runtime, pre-shutdown settlement,
  stand-in with hold/failure marker, real-Chrome automation) carry over unchanged.
- The canonical page switches from the Feature 003 minimal graph to this workflow; whether the
  minimal graph's code and tests stay as regression tests or are retired is a plan decision, with
  Feature 003 evidence kept as history either way.
- The Bull Researcher's first-turn "opening" context (upstream opening marker) is part of its prompt;
  exact wording is a plan decision.
- An empty analyst report is passed downstream as-is (upstream renders missing reports with an
  absence marker; the plan may adopt that rendering).
- A native eight-role run takes several times longer than Feature 003's four-role run; the plan
  sets the page protection timeout accordingly (page protection only, not an AkariSP or provider
  contract).
- Cancellation and failure semantics are proven by deterministic, Node integration and automated
  browser evidence; the real-browser gate requires only one successful run.
