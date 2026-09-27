# BrowserTradingAgents Constitution

BrowserTradingAgents is an external consumer application that incrementally builds a
TradingAgents-style multi-agent application running in the browser, drawing on the ideas and graph
semantics of TauricResearch/TradingAgents, in order to dogfood AkariSP's public API and
lifecycle/concurrency model under a real workload.

The responsibility boundary between AkariSP and BrowserTradingAgents is the project's core
architectural invariant.

## Core Principles

### I. Dogfood Before Abstraction

Real application workload always precedes generic abstraction.

- A new abstraction MUST NOT be introduced on speculative grounds alone, including: "it will be
  needed later", "multiple agents imply a framework", "formalizing a LangChain/LangGraph adapter
  would be convenient", or "another provider may be added someday".
- A new abstraction MAY be considered only when repeated, concrete pain in an actual
  BrowserTradingAgents workload is backed by evidence.
- The following MUST NOT be built up front: generic agent runtime, graph runtime, provider
  registry, automatic provider selection, generic retry framework, prompt manager, generic tool
  abstraction, AkariSP orchestration API, generic browser AI framework, official LangChain
  integration package.
- When application-local code suffices, it MUST stay application-local.

Rationale: the project exists to observe real integration pain; premature abstraction hides it.

### II. Deterministic Fixtures First

External market data and network dependencies are introduced only after integration semantics are
verified.

- Early Features MUST use deterministic, committed, small, network-independent fixtures.
- Early integration/lifecycle research MUST NOT mix these concerns: LLM lifecycle, LangGraph
  orchestration, AkariSP concurrency, market-data vendor failures, rate limits, network
  instability, historical-data quality.
- Real market data is a separate, later application Feature.

Rationale: isolating variables is the only way to attribute a failure to the correct layer.

### III. Application Owns Orchestration

The BrowserTradingAgents application owns: agents, agent roles, graph, graph topology, routing,
conditional edges, debate mechanics, prompts, tools, domain state, market research logic, trading
research decisions, risk review, and final decision flow.

- LangGraph.js and LangChain.js are BrowserTradingAgents application dependencies.
- AkariSP MUST NOT be made aware of agent names, graph topology, Bull/Bear meaning, trading
  semantics, or application state.

### IV. AkariSP Owns Inference Lifecycle

AkariSP's responsibility is limited to browser-local LLM inference resource lifecycle.

- AkariSP owns: warm resource ownership, session lifecycle, bounded concurrency, FIFO queueing,
  backpressure, task cancellation, deterministic cleanup, shutdown, failure/broken-state handling,
  TaskTiming, minimal runtime snapshot observability.
- AkariSP does NOT own: agents, graphs, workflows, prompt orchestration, market data, trading
  logic, RAG, long-term memory, portfolio management, tool routing.
- Growing application complexity while AkariSP responsibility stays small is a success outcome.

### V. Evidence Before Core Change

Inconvenience in BrowserTradingAgents alone MUST NOT drive AkariSP changes.

- Every AkariSP production change candidate MUST satisfy at least this chain:
  actual application workload → repeatable pain or correctness failure → reproducible evidence →
  minimal reproduction → existing AkariSP public contract analysis → current public contract
  cannot express the required behavior.
- If an application-layer workaround is reasonably possible, it MUST live in the application
  layer.
- Every BrowserTradingAgents Feature assumes by default: AkariSP source changes expected: 0;
  AkariSP public API changes expected: 0; AkariSP runtime dependency changes expected: 0.
- Even when an AkariSP change appears necessary, it MUST NOT be made inside a
  BrowserTradingAgents Feature. It MUST be recorded as a separate finding and, if warranted,
  reviewed as an independent Feature candidate in the AkariSP repository.

### VI. Browser First

The final execution target of BrowserTradingAgents is the browser.

- Node-only success is NOT final integration evidence.
- Evidence MUST be explicitly classified where possible as one of: `STATIC_CODE_ANALYSIS`,
  `DETERMINISTIC_TEST`, `NODE_INTEGRATION`, `BROWSER_AUTOMATED`, `REAL_BROWSER_PROMPT_API`,
  `WEBLLM_REAL_PROVIDER`, `BLOCKED`.
- Evidence from stand-in providers and real native providers MUST NOT be mixed.
- Claims about actual browser behavior MUST NOT be finalized without browser evidence.

### VII. Reproducible Agent Runs

Significant agent/graph experiments MUST be reproducible and MUST record at least:

- BrowserTradingAgents revision
- AkariSP npm version (and AkariSP git/release revision when relevant)
- upstream reference revision
- fixture version/content
- prompt version or prompt source
- graph configuration, selected agents, debate-round configuration
- runtime concurrency configuration
- provider
- execution date
- evidence class

Analysis of an upstream project MUST pin a commit SHA, not only a branch.

### VIII. No Trading-Quality Claims

Infrastructure success MUST NOT be conflated with trading quality.

- NOT project success criteria in the initial phase: prediction accuracy, PnL, Sharpe ratio,
  backtest performance, buy/sell quality, investment profitability.
- An integration/lifecycle experiment can succeed even if the LLM's investment decision is wrong.
- Evaluation targets: workflow correctness, graph semantics, integration ergonomics, lifecycle
  correctness, concurrency, queueing, backpressure, cancellation, failure propagation, cleanup,
  runtime reuse, provider swap.

### IX. External Data Deferred

External market/news/fundamental/social data integration happens in a separate Feature, only after
the deterministic workload is stable.

- The initial phase MUST NOT introduce: broker APIs, crypto exchange APIs, real orders, Yahoo
  Finance, Alpha Vantage, FRED, SEC EDGAR, Reddit, StockTwits, or real-time news integrations.
- External data introduction is an application Feature, not an AkariSP Feature.

### X. Thin Integration Boundaries

Integration between LangChain.js / LangGraph.js / AkariSP starts as a minimal application-local
bridge.

- A small application-local adapter (e.g., `src/integration/akari-chat-model.ts`) is permitted
  when needed.
- Without real repeated evidence, it MUST NOT be promoted to `@akarisp/langchain`,
  `akarisp/langchain`, an official adapter package, or a generic model abstraction.
- A thin bridge that stays at tens of lines of natural application code is a success.

### XI. Preserve Reference Semantics Explicitly

When referencing TauricResearch/TradingAgents, the original implementation and the
BrowserTradingAgents adaptation MUST be clearly distinguished.

- Original code MUST NOT be copied verbatim.
- Concepts adopted from the original: agent role separation, explicit graph state, analyst
  reports, adversarial Bull/Bear reasoning, debate synthesis, Trader synthesis, risk review, final
  decision flow.
- Any topology or execution semantics that differ from the original MUST be documented as an
  adaptation.
- As analyzed for TradingAgents v0.5.1, analyst execution is sequential, and both the Bull/Bear
  debate and the 3-way risk debate are sequential alternating flows. Parallelizing independent
  analyst stages in BrowserTradingAgents MUST be recorded as an intentional browser adaptation for
  AkariSP concurrency/backpressure dogfooding, not as a replica of the original topology.
- Debates in which each turn depends on the opponent's previous response (e.g., Bull/Bear) MUST
  NOT be naively parallelized and claimed as original semantics.

### XII. Findings Before Fixes

Problems discovered during integration MUST first be written up as a finding, using at least:

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

- `Core change required = YES` MUST NOT be selected without evidence.
- Classification and reproduction come before any fix.

## Project Scope & Non-Goals

BrowserTradingAgents does NOT aim to:

- develop AkariSP itself;
- port the entire TradingAgents Python repository to TypeScript;
- build a generic agent framework;
- build a generic workflow runtime;
- build a live automated order system;
- prove investment returns.

Work that drifts toward any of these non-goals MUST be rejected or re-scoped against Principles
I, III, IV, and VIII.

## Development Workflow & Verification

### Feature Governance

- Each Feature is an independent research/development unit.
- Feature numbering is fully independent from AkariSP (BrowserTradingAgents Feature 001, 002,
  003, ...). AkariSP's past Feature numbers are NOT inherited.
- A single Feature MUST NOT implement the whole roadmap at once.
- Improvements outside a Feature's scope MUST be recorded as a finding or follow-up candidate and
  MUST NOT be pulled into the current Feature.

### Verification Rules

- Every implementation Feature MUST run at least: typecheck, build, deterministic tests.
- Any claim of browser-specific behavior MUST add the appropriate browser evidence (Principle VI).
- When the AkariSP repository is not modified, the full AkariSP internal suite need not be re-run
  per BrowserTradingAgents Feature. Instead, each Feature MUST record the published AkariSP
  package version actually consumed and the public API boundary used.

## Governance

This constitution supersedes other project practices. Every plan's Constitution Check and every
review MUST verify compliance with the principles above; any justified deviation MUST be recorded
in the plan's Complexity Tracking table.

Amendments MUST NOT be made for ordinary feature convenience. Every amendment MUST include:

- the reason for the change;
- the actual project evidence that requires the principle change;
- affected existing Features/specs;
- backward-compatibility or workflow impact;
- amendment date;
- constitution version change.

Versioning policy (semantic versioning):

- MAJOR: backward-incompatible principle removal or redefinition.
- MINOR: new principle/section or materially expanded guidance.
- PATCH: typo or wording clarification without semantic change.

The initial constitution version is `1.0.0`.

**Version**: 1.0.0 | **Ratified**: 2026-09-28 | **Last Amended**: 2026-09-28
