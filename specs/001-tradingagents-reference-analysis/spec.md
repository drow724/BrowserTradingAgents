# Feature Specification: Feature 001 — Original TradingAgents Reference Analysis

**Feature Branch**: `001-tradingagents-reference-analysis`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Formalize BrowserTradingAgents Feature 001: source-level analysis of
TauricResearch/TradingAgents at a frozen revision, separating the graph semantics
BrowserTradingAgents must preserve from the Python/application infrastructure it can drop.
Research only — no porting, no application implementation, no AkariSP changes."

## Purpose

Core question: **Which TradingAgents graph semantics are actually required to implement the
minimum BrowserTradingAgents workload?**

This is a research Feature. It produces an evidence-backed reference analysis document. It does
NOT port TradingAgents code to TypeScript and does NOT implement any BrowserTradingAgents
application code.

## Frozen References

All analysis MUST be performed against these pinned references. If upstream `main` moves during
the Feature, the analysis stays on the pinned commit; results from branch HEAD MUST NOT be mixed in.

```text
Reference (analysis target)
  repository: TauricResearch/TradingAgents
  branch:     main
  commit:     35543d0248bf89fcb92b17a15858ad0c0e940687
  version:    0.5.1
  analysis baseline date: 2026-09-28

AkariSP dogfood baseline (recorded only; not modified)
  repository: drow724/akariSP
  branch:     main
  commit:     7e8202e6ab91af386abc9e2416d9cb07fdfacecf
  package:    akarisp@0.1.0-alpha.2
  registry verification: match

BrowserTradingAgents
  repository: drow724/BrowserTradingAgents
  branch:     main
  revision:   recorded at analysis completion (repository has no commits at spec creation)
```

## Constitution Alignment

Constitution v1.0.0 applies in full. Principles applied with particular weight:

- **I. Dogfood Before Abstraction** — the analysis MUST NOT propose generic runtimes, adapters,
  or frameworks.
- **III / IV. Application Owns Orchestration / AkariSP Owns Inference Lifecycle** — every upstream
  concept is attributed to the application side; nothing is assigned to AkariSP beyond inference
  lifecycle.
- **V. Evidence Before Core Change** — AkariSP source/public API/runtime dependency changes
  expected: 0 / 0 / 0.
- **VI. Browser First** — conclusions in this Feature are `STATIC_CODE_ANALYSIS` evidence only;
  no browser behavior claims.
- **VII. Reproducible Agent Runs** — pinned commit SHAs recorded above.
- **VIII. No Trading-Quality Claims** — success is never evaluated by accuracy, PnL, Sharpe,
  backtest, or buy/sell quality.
- **X. Thin Integration Boundaries** — Feature 002 recommendation stays at thin application-local
  bridge level.
- **XI. Preserve Reference Semantics Explicitly** — upstream behavior vs. BrowserTradingAgents
  adaptation MUST be labeled separately.
- **XII. Findings Before Fixes** — deviations are recorded as findings, not fixed.

## Pre-Established Finding To Verify

Before this spec, preliminary review indicated the following. The analysis MUST confirm or refute
it with source evidence and MUST NOT describe upstream v0.5.1 as having parallel analyst branches
unless source evidence demonstrates otherwise:

- TradingAgents v0.5.1 at the frozen revision does **not** execute the analyst team as LangGraph
  parallel branches. Selected analyst nodes are wired **sequentially** (each analyst → its
  message-clear node → the next selected analyst).
- Bull and Bear researchers are **not parallel**; they alternate sequentially, and each side can
  consume the opponent's previous response.
- Risk analysts are **sequential**: Aggressive → Conservative → Neutral.

Consequence (Principle XI): any future parallel analyst execution in BrowserTradingAgents is an
**intentional BrowserTradingAgents adaptation** for independent-analysis execution and AkariSP
concurrency/backpressure dogfooding — not a reproduction of upstream topology.

## User Scenarios & Testing *(mandatory)*

The primary user is the BrowserTradingAgents maintainer, who needs an authoritative,
evidence-backed reference before designing any browser workload.

### User Story 1 - Evidence-backed upstream topology (Priority: P1)

The maintainer reads the analysis and learns the exact upstream graph: nodes, START/END, edges,
conditional edges, tool loops, and execution order — each claim tied to a source path and
function at the frozen commit.

**Why this priority**: Every later design decision (including whether analysts may be
parallelized) depends on an accurate topology. A wrong topology poisons all later Features.

**Independent Test**: A reviewer checks out the frozen commit, opens each cited file/function, and
confirms every topology claim; the reviewer can redraw the graph from the document alone.

**Acceptance Scenarios**:

1. **Given** the frozen commit, **When** the reviewer follows the cited evidence for analyst
   wiring, **Then** the document's statement on whether analysts are sequential or parallel
   matches the source.
2. **Given** the document's topology diagram, **When** compared against graph setup and
   conditional-logic source, **Then** every edge and conditional route in the diagram has a
   matching citation, and no uncited edge exists.

---

### User Story 2 - Per-node semantics and debate mechanics (Priority: P1)

The maintainer gets a per-node record for all 12 agent roles (plus tool and message-clear nodes)
and a precise description of the Bull/Bear and risk debate mechanics, including counters, turn
order, opponent dependencies, and termination.

**Why this priority**: The debates are the semantics most at risk of being wrongly "optimized"
(e.g., naive parallelization) in a browser adaptation.

**Independent Test**: For any listed node, a reviewer can verify its input state, state writes,
LLM class, tools, and routing against source.

**Acceptance Scenarios**:

1. **Given** the Bull/Bear section, **When** the reviewer traces the conditional routing function
   and debate state updates, **Then** the initial speaker, alternation, counter increment, and
   termination condition (in terms of configured max rounds) match the source.
2. **Given** the risk section, **When** traced, **Then** Aggressive → Conservative → Neutral
   ordering, prior-argument dependencies, counter semantics, and routing to Portfolio Manager
   match the source.

---

### User Story 3 - Browser dogfood classification and minimum graph proposal (Priority: P2)

The maintainer gets a PRESERVE / SIMPLIFY / EXCLUDE classification of upstream concepts and a
proposed minimum browser graph (not implemented), with every adaptation explicitly labeled.

**Why this priority**: This is the actionable output feeding Feature 002+, but it is only valid
once Stories 1–2 are evidence-backed.

**Independent Test**: Each classification entry cites the upstream concept it classifies and
gives a reason; each deviation from upstream in the minimum graph is labeled as an adaptation.

**Acceptance Scenarios**:

1. **Given** the minimum graph proposal, **When** it proposes Market/News parallel execution,
   **Then** it is labeled "intentional adaptation, not upstream behavior".
2. **Given** the minimum graph proposal, **When** it includes Bull/Bear, **Then** it preserves the
   opponent's-previous-response dependency and does not parallelize debate turns.
3. **Given** the decision on Research Manager, **When** read, **Then** it is justified from source
   semantics (its role converting the debate into `investment_plan`).

---

### User Story 4 - Final report and Feature 002 recommendation (Priority: P3)

The maintainer receives a final report in the required deliverable format, including findings,
zero-change confirmations, and a recommendation-level Feature 002 scope.

**Why this priority**: Closes the Feature and hands off; depends on Stories 1–3.

**Independent Test**: Every field in the Required Final Deliverable template is filled; AkariSP
and application change counts are 0 and verifiable via repository state.

**Acceptance Scenarios**:

1. **Given** the completed Feature, **When** the reviewer inspects the repository diff, **Then**
   no application source, tests, integration code, or AkariSP changes exist.

---

### Edge Cases

- **A listed source path does not exist at the frozen commit** (e.g., a file was renamed or
  never existed): record it as a finding with evidence of absence; do not substitute a file from
  another revision.
- **Upstream `main` advances during analysis**: continue on the pinned SHA; any observation from
  a newer revision is out of scope and at most noted separately, never merged into results.
- **Source contradicts the pre-established finding** (e.g., fan-out edges exist): the source
  wins; record a finding that corrects the pre-established claim.
- **Behavior depends on configuration** (selected analysts, max debate rounds, max risk rounds):
  describe semantics as a function of configuration and state the upstream defaults with
  citations.
- **Node behavior depends on runtime LLM output** (tool calls present or not, structured output
  failure → free-text fallback): describe each branch; do not claim which branch occurs at
  runtime.
- **Documentation/diagrams disagree with source**: source is authoritative; record the
  discrepancy.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The analysis MUST be reproducible against the frozen TradingAgents commit SHA
  `35543d0248bf89fcb92b17a15858ad0c0e940687`; every source citation MUST reference that revision.
- **FR-002**: The analysis MUST describe the original graph topology with source-level evidence:
  graph construction, START/END, node registration, edge registration, conditional edges, tool
  loops, and execution ordering.
- **FR-003**: The analysis MUST identify, for each major agent, its input state, output, and state
  writes, using the Node Analysis Record format below.
- **FR-004**: The analysis MUST identify every LLM invocation class (quick-thinking vs.
  deep-thinking) and major invocation point, including structured-output invocation, free-text
  fallback, tool-enabled invocation, and any possible repeated calls.
- **FR-005**: The analysis MUST explain the difference between ToolNode-loop tool invocation
  (Market / News / Fundamentals analysts) and in-node pre-fetch data invocation (Sentiment
  analyst), with evidence.
- **FR-006**: The analysis MUST explain Bull/Bear debate semantics: initial speaker, alternating
  turns, previous-opponent-response dependency, debate counters, max debate rounds, and
  termination routing to Research Manager.
- **FR-007**: The analysis MUST explain risk debate semantics: Aggressive → Conservative →
  Neutral ordering, prior-argument dependencies, risk discussion counters, and termination routing
  to Portfolio Manager.
- **FR-008**: The analysis MUST explain the distinct responsibilities of Research Manager,
  Trader, and Portfolio Manager and what state each adds to the final decision flow.
- **FR-009**: The analysis MUST separate upstream behavior from BrowserTradingAgents adaptation
  proposals, using SOURCE FACT / DESIGN INFERENCE / STATUS labeling.
- **FR-010**: The analysis MUST classify upstream concepts as PRESERVE / SIMPLIFY / EXCLUDE, each
  with a reason grounded in source analysis.
- **FR-011**: The analysis MUST propose a minimum BrowserTradingAgents graph (roles and state
  transitions) without implementing it.
- **FR-012**: The Feature MUST NOT produce AkariSP production changes (source, public API, or
  runtime dependency).
- **FR-013**: The Feature MUST NOT produce BrowserTradingAgents application source, tests,
  integration code, fixtures, or UI.
- **FR-014**: Every significant conclusion MUST use the Evidence Claim format; speculative
  statements without source evidence ("probably parallel", "it seems") are prohibited.
- **FR-015**: Deviations and surprises MUST be recorded in the Finding format (Principle XII),
  including at minimum finding F001-001.
- **FR-016**: The final report MUST follow the Required Final Deliverable template.
- **FR-017**: All evidence in this Feature MUST be classified as `STATIC_CODE_ANALYSIS`; no
  runtime or browser behavior claims.

### Analysis Scope

**Graph construction**: `StateGraph` construction, START/END, node and edge registration,
conditional edges, tool loops, execution ordering.

**Agent roles (minimum)**: Market Analyst, Sentiment Analyst, News Analyst, Fundamentals
Analyst, Bull Researcher, Bear Researcher, Research Manager, Trader, Aggressive Risk Analyst,
Conservative Risk Analyst, Neutral Risk Analyst, Portfolio Manager.

**State (minimum)**: AgentState, analyst reports, investment debate state, investment plan,
trader investment plan, risk debate state, final trade decision, messages, run identity/context
fields.

**Invocation semantics**: quick-/deep-thinking invocation points, structured output, free-text
fallback, tool-enabled invocation, possible repeated calls.

**Tool semantics**: Market, News, Fundamentals tools; Sentiment pre-fetch behavior; ToolNode
loops.

**Final decision flow**: Research Manager → Trader → Risk stage → Portfolio Manager → final state
production.

**Source paths (minimum)** at the frozen revision:

```text
tradingagents/graph/setup.py
tradingagents/graph/trading_graph.py
tradingagents/graph/conditional_logic.py
tradingagents/graph/propagation.py
tradingagents/graph/analyst_execution.py
tradingagents/agents/state.py
tradingagents/agents/context.py
tradingagents/agents/structured.py
tradingagents/agents/analysts/{market,news,sentiment,fundamentals}_analyst.py
tradingagents/agents/researchers/{bull,bear}_researcher.py
tradingagents/agents/managers/research_manager.py
tradingagents/agents/trader/trader.py
tradingagents/agents/risk_mgmt/{aggressive,conservative,neutral}_debator.py
tradingagents/agents/managers/portfolio_manager.py
```

Related schema/tool/config files MAY be analyzed when needed; vendor data-implementation
internals are out of scope.

### Expected Baseline Topology (to be confirmed by evidence)

```text
START → selected analyst #1 → message clear → selected analyst #2 → … → Bull Researcher
  → Bear Researcher ↔ (configured debate rounds) → Research Manager → Trader
  → Aggressive → Conservative → Neutral ↔ (configured risk rounds) → Portfolio Manager → END

Market / News / Fundamentals analyst tool loop:
  Analyst → tool calls? ── YES → ToolNode → Analyst
                        └─ NO  → report complete (→ message clear → next)

Sentiment Analyst: pre-fetches external data inside the node, then invokes the model
(no ToolNode loop).
```

### Browser Dogfood Classification (candidates; final classification is an output)

- **PRESERVE candidates**: agent role separation; explicit graph state; analyst report
  production; adversarial Bull/Bear reasoning; opponent-aware debate turns; debate synthesis;
  Trader synthesis; risk review; final decision synthesis.
- **SIMPLIFY candidates**: 4 analysts → Market + News; 3-way risk debate → single Risk reviewer;
  detailed structured report schemas → smaller application schemas; portfolio context → deferred;
  multiple debate rounds → initially one round.
- **EXCLUDE candidates**: CLI; Python application shell; backtesting; checkpoint SQLite;
  filesystem report generation; portfolio persistence; persistent decision memory; reflection
  system; vendor routing infrastructure; provider factory; real data integrations.

### Minimum Browser Graph Candidate (proposal only; not implemented)

```text
Market Analyst ─┐
                ├─→ Bull ↔ Bear → Research Manager → Trader → Risk Reviewer → Final Decision
News Analyst ───┘
```

Constraints on the proposal:

- Market/News parallel execution is a BrowserTradingAgents adaptation candidate, not upstream
  reproduction.
- Bull/Bear MUST preserve the dependency on the opponent's immediately previous response.
- Whether Research Manager can be omitted MUST be decided from source semantics, considering that
  upstream Research Manager is a clear stage boundary converting the debate into
  `investment_plan`.

### Required Record Formats

**Node Analysis Record** (one per major node):

```text
Node:
Purpose:
Input state:
Output state:
LLM calls:
LLM class:
Tools:
Can run in parallel in upstream:
Could be parallelized as BrowserTradingAgents adaptation:
Depends on:
Writes to state:
Conditional routing:
Required for browser dogfood: YES / NO / PARTIAL
Reason:
```

**Evidence Claim**:

```text
Claim:
Evidence:
Source path:
Relevant function/class:
Implication for BrowserTradingAgents:
```

**Fact vs. inference labeling**:

```text
SOURCE FACT:
DESIGN INFERENCE:
STATUS: (upstream behavior | intentional adaptation, not upstream behavior)
```

**Finding** (Principle XII):

```text
Finding ID:
Feature:
Workload:
Observed:
Expected:
Reproduction:
Evidence:
AkariSP contract involved:
Application workaround possible?:
Core change required?:
Confidence:
```

Known finding candidate:

```text
F001-001
Upstream TradingAgents v0.5.1 analyst execution is sequential, while the initial
BrowserTradingAgents roadmap assumed parallel analysis as part of TradingAgents-style topology.
Classification: reference-semantics correction (not a defect). AkariSP contract involved: none.
Core change required: NO.
```

### Required Final Deliverable

```text
Original TradingAgents analyzed: YES / NO

Reference revision:
  repository:
  branch:
  commit:
  version:
  analysis date:

AkariSP dogfood baseline:
  package:
  commit:

Graph topology:
Agents:
Graph state:
Conditional edges:
Tool loops:
Parallel paths in upstream:
Bull/Bear debate mechanics:
Risk debate mechanics:
Research Manager responsibility:
Trader responsibility:
Portfolio Manager responsibility:
LLM invocation points:
Tool invocation points:
External dependencies:
Required for BrowserTradingAgents:
Explicitly excluded:
What will be simplified:
What must preserve semantics:
Intentional BrowserTradingAgents adaptations:
Findings:

AkariSP production changes: 0
BrowserTradingAgents implementation changes: 0

Recommended Feature 002 scope:
```

### Key Entities

- **Reference Revision**: the pinned upstream repository/branch/commit/version/date that all
  evidence refers to.
- **Graph Node**: an upstream node (agent, ToolNode, message-clear) with its Node Analysis
  Record.
- **Graph Edge / Conditional Route**: a transition between nodes, with its routing condition and
  citation.
- **State Field**: an AgentState field (reports, debate states, plans, decision, messages, run
  context), with its writers and readers.
- **Evidence Claim**: a conclusion tied to source path and function.
- **Finding**: a Principle XII record of an unexpected observation.
- **Classification Entry**: PRESERVE / SIMPLIFY / EXCLUDE decision for one upstream concept, with
  reason.
- **Adaptation**: a proposed BrowserTradingAgents deviation from upstream, explicitly labeled.

## Out of Scope

Not implemented in this Feature: LangChain.js; LangGraph.js; AkariSP bridge; AkariChatModel;
Chrome Prompt API integration; WebLLM integration; Browser TradingAgents MVP; multi-agent
execution; deterministic fixture implementation; browser UI; external data APIs; actual trading;
backtesting; portfolio execution; AkariSP source modification.

Not created: `@akarisp/langchain`, `akarisp/langchain`, `createLangChainModel()`, generic agent
runtime, generic workflow framework.

Not evaluated: prediction accuracy, Buy/Sell correctness, profitability, Sharpe, PnL, backtest
results.

## Feature 002 Boundary (recommendation only)

Feature 002 is considered only after Feature 001 results are finalized. Recommended direction:

```text
Feature 002 — LangChain.js ↔ AkariSP Integration Validation
  LangChain.js → thin application-local bridge → akarisp@0.1.0-alpha.2 → Chrome Prompt API
```

LangGraph.js is recommended to stay out of Feature 002. This is a recommendation, not a
commitment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 17 success questions below are answered, each with at least one Evidence Claim
  citing a source path and function at the frozen commit (17/17).
- **SC-002**: Node Analysis Records exist for all 12 listed agent roles (12/12), plus the tool and
  message-clear node types.
- **SC-003**: 100% of topology edges and conditional routes in the final diagram have a source
  citation; 0 uncited edges.
- **SC-004**: Every item in the PRESERVE / SIMPLIFY / EXCLUDE classification has a stated reason
  (100%).
- **SC-005**: Every deviation from upstream in the minimum graph proposal is labeled as an
  intentional adaptation (0 unlabeled deviations).
- **SC-006**: An independent reviewer, using only the document and the frozen commit, can verify
  any sampled claim without additional context.
- **SC-007**: AkariSP production changes = 0; BrowserTradingAgents application implementation
  changes = 0.
- **SC-008**: Every field of the Required Final Deliverable is filled.

Success questions:

1. What is the original topology?
2. What agents exist?
3. What state connects them?
4. Which nodes invoke LLMs?
5. Which nodes invoke tools?
6. Which loops are tool loops?
7. How does Bull/Bear debate actually work?
8. How does risk debate actually work?
9. What terminates each debate?
10. What does Research Manager add?
11. What does Trader add?
12. What does Portfolio Manager add?
13. Are upstream analyst paths parallel?
14. Which semantics must BrowserTradingAgents preserve?
15. Which components can be simplified?
16. Which infrastructure should be excluded?
17. What is the minimum browser graph?

## Assumptions

- The frozen commit remains publicly retrievable from TauricResearch/TradingAgents.
- The AkariSP baseline is recorded for reproducibility only; AkariSP is not analyzed or modified
  in this Feature.
- The analysis output is a documentation artifact inside this Feature's directory; its exact file
  layout is decided in `/speckit-plan`.
- The BrowserTradingAgents revision is recorded at analysis completion, because the repository
  had no commits when this spec was created.
- All evidence produced is `STATIC_CODE_ANALYSIS`; no code is executed against LLMs or data
  vendors.
