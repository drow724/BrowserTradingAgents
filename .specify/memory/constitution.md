<!--
Sync Impact Report — amendment 2026-09-30
- Version: 1.1.0 → 1.2.0 (MINOR: two new principles, XIV and XV; VIII materially expanded. No
  principle removed. VIII keeps its prohibition on trading-quality claims and adds a bounded
  permission to record paper-trading outcomes as pre-registered experiment metrics.)
- Modified: VIII. No Trading-Quality Claims (title unchanged; guidance expanded)
- Added: XIV. Deterministic Grounding Verification; XV. Pre-Registered Evaluation
- Removed: none
- Reason: the project now studies how structural changes (roles, orchestration, answer modes,
  models) change answer behaviour under browser-LLM limits. It needs two things fixed as rules:
  (1) who judges grounding, and (2) how a result counts as evidence. The research goal also uses
  paper-trading outcomes as one metric, which VIII did not allow in any form.
- Evidence:
  - F016-R1: the checker scored 26/26 on frozen fixtures but 9–17 % mismatch precision on real
    native answers. A score on data the rules were tuned on did not show generalisation (XV).
  - Feature 017: a pre-registered threshold on a held-out native capture (132 answers, blind audit
    hashed before scoring) was not met and was reported as not met. Refs mode missed 8 of 9 meaning
    errors (F017-R5). The procedure worked; this is the reason to make it a rule (XV).
  - Features 010, 013, 016 and 017: errors of the same kind with every answer mode, including a
    10x value error that only the deterministic checker caught (F017-R10). The checker must stay
    whatever the model or tier (XIV).
  - External context (docs/research/2026-09-30-*): FinanceBench (large cloud models still wrong on
    financial figures); MAST FM-3 (verification failures in multi-agent systems).
- Affected Features: 010, 013, 016 and 017 already follow XIV and XV (checker on every answer;
  017 pre-registration, held-out set, blind audit), so no evidence changes. Earlier Features have
  no grounding claims. 018 (Benchmark, single-role baseline) and any future cloud tier (XIII) must
  satisfy XIV, XV and the revised VIII.
- Workflow impact: every plan's Constitution Check adds XIV and XV. A Feature that reports a
  trading metric must pre-register it under VIII and XV. Templates need no change (the plan
  template derives its gates from this file).
- Deferred: none.
-->
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

- Prediction accuracy, PnL, Sharpe ratio, backtest performance, buy/sell quality and investment
  profitability are NOT project success criteria. They MUST NOT be presented as product quality,
  as evidence that a configuration is good for investing, or as investment advice.
- Paper-trading outcomes MAY be recorded as experiment metrics only when a Feature pre-registers
  them under Principle XV. The pre-registration states the baselines (such as no action,
  buy-and-hold, random decisions or a single-role graph), the number of decisions and the smallest
  difference that number can detect, and a fact window with no look-ahead.
- Grounding results (Principle XIV) MUST be reported alongside any trading metric. A trading-metric
  gain that comes with worse grounding MUST NOT be reported as an improvement.
- An integration/lifecycle experiment can succeed even if the LLM's investment decision is wrong.
- Evaluation targets: workflow correctness, graph semantics, integration ergonomics, lifecycle
  correctness, concurrency, queueing, backpressure, cancellation, failure propagation, cleanup,
  runtime reuse, provider swap, and grounding and answer behaviour under structural variation.

Rationale: paper-trading outcomes are informative as one signal among many, but they are noisy and
easy to over-read. A small sample or a lucky variant can look like skill.

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

### XIII. Inference Tiers

Browser/local inference is the default tier.

- The application owns inference-tier routing: which tier serves a request is an application
  decision, visible in its configuration and UI.
- Remote (cloud) inference requires explicit escalation. It must be selected deliberately, be
  visible to the user and be recorded in evidence. It is never a silent fallback for a failed or
  unavailable local tier.
- AkariSP owns the local inference lifecycle (Principle IV), not routing semantics. Tier routing
  MUST NOT be pushed into AkariSP.
- Evidence MUST state which tier served each run. Remote-tier results MUST NOT be reported as
  local-provider evidence (Principle VI).
- This principle names no vendor. Candidate remote-tier implementations belong in the roadmap,
  not in this constitution.

Rationale: keeping local inference the default protects the project's purpose, dogfooding browser
inference through AkariSP, while allowing a deliberate cloud tier when a Feature justifies one.

### XIV. Deterministic Grounding Verification

Model-generated claims shown to the user are checked by deterministic application code, not by a
model.

- Every numeric, date and interpretation claim in a final answer MUST be classified by a
  deterministic checker against the facts the run was given. The result MUST be visible with the
  answer and recorded in evidence.
- The same checker MUST apply to every model, provider and inference tier (Principle XIII). It
  MUST NOT be removed, relaxed or bypassed because a model is larger or remote.
- A model's judgement of its own or another model's grounding MUST NOT count as grounding
  evidence. Model-written citations are inputs to the checker, not verdicts.
- A checker signal enters a verdict only after its precision is shown on held-out data (Principle
  XV). Until then it is reported separately from the verdict.

Rationale: grounding errors (a value with the wrong meaning, a forecast without evidence, a figure
off by a factor of ten) appeared with every answer mode and model configuration measured. Model
size does not remove them. A checker whose rules can be read and whose results can be reproduced
is the project's line of defence.

### XV. Pre-Registered Evaluation

A result counts as evidence only if its test was fixed before the result was seen.

- Hypotheses, metrics, thresholds and baselines MUST be recorded in the spec before the results
  they judge.
- Sets used to tune rules or prompts (development sets) MUST be separate from held-out sets. The
  rules MUST be frozen, with their hashes recorded, before a held-out set is scored.
- A human audit of held-out results MUST be recorded, and its hash stored, before the checker's
  classification of the same items is viewed.
- Fixtures, thresholds and audit judgements MUST NOT be edited after results are seen. A missed
  threshold is reported as a result and followed by findings (Principle XII), not re-scoped.
- A score on a set that was used for tuning MUST NOT be reported as evidence of generalisation.
- A comparison of structures, models or modes MUST change one factor against a baseline, with the
  same set and checker. The sample size MUST be stated before the results. A difference within
  run-to-run variation MUST be reported as no difference.

Rationale: rules that reached 26/26 on the fixtures they were tuned on reached 9–17 % precision on
real answers (F016-R1). Only a held-out, pre-registered test showed what the rules actually did
(Feature 017).

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

**Version**: 1.2.0 | **Ratified**: 2026-09-28 | **Last Amended**: 2026-09-30
