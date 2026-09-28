# Feature Specification: Feature 002 — LangChain.js ↔ AkariSP Integration Validation

**Feature Branch**: `002-langchain-akarisp-integration-validation` (feature identifier)

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Formalize BrowserTradingAgents Feature 002: validate that LangChain.js's
minimum chat-model usage contract can reach AkariSP's published public API through an
application-local thin bridge only, with real Chrome Prompt API evidence. First implementation
Feature; no LangGraph.js, no TradingAgents agents, no AkariSP changes."

## Purpose

Core question: **Can LangChain.js's minimum chat-model usage contract be connected to AkariSP's
published public API using only an application-local thin bridge?**

Integration boundary under validation:

```text
LangChain.js
     ↓
application-local thin chat-model bridge
     ↓
akarisp@0.1.0-alpha.2 (published package)
     ↓
Chrome Prompt API
```

This is BrowserTradingAgents' **first implementation Feature**: creating application source,
project bootstrap files, deterministic tests and a browser harness is expected. It validates one
LLM integration seam that the future agent/graph layer will depend on. It does **not** implement
the TradingAgents graph or any agent, and does not use LangGraph.js.

## Inputs From Feature 001

Feature 001 (completed at BrowserTradingAgents `e7fb2e8`) analyzed TauricResearch/TradingAgents
v0.5.1 at `35543d0248bf89fcb92b17a15858ad0c0e940687`. Results this Feature relies on:

- Upstream analyst, Bull/Bear and risk stages are all sequential; analysts do not read each
  other's reports.
- BrowserTradingAgents intends to run Market and News analysts in parallel as an **intentional
  adaptation** (Feature 001 A1), giving a first fan-out of **2 concurrent model requests**.
- One agent/node is not one inference: tool loops add requests, and a structured-output failure
  adds exactly one free-text fallback request.
- Future workload accounting must separate logical model requests from provider invocations.

The Feature 001 minimum browser graph (Market ‖ News → Bull → Bear → Research Manager → Trader →
Risk Reviewer → Final Decision) is **not** implemented here; this Feature validates only the
model integration it will depend on.

## Frozen Baselines

```text
AkariSP (consumed dependency — fixed)
  package:                  akarisp@0.1.0-alpha.2 (published registry package)
  release/reference commit: 7e8202e6ab91af386abc9e2416d9cb07fdfacecf

BrowserTradingAgents
  repository: drow724/BrowserTradingAgents
  starting revision: e7fb2e8 (Feature 001 completion)
```

- A local sibling checkout `../akariSP` was observed at `78804aa` at the end of Feature 001. It
  is **not** this Feature's baseline and MUST NOT be used as a dependency: no `../akariSP/src/...`
  paths, no `file:../akariSP`, no workspace-relative imports, no private/internal module imports.
- The baseline MUST NOT change implicitly (e.g. because a local checkout is newer). Any change
  requires an explicit, recorded decision or finding.

## Constitution Alignment

Constitution v1.0.0 applies in full; with particular weight:

- **I. Dogfood Before Abstraction** — build the real application integration; no generic
  integration framework.
- **II. Deterministic Fixtures First** — verify bridge semantics, failure, fallback, cancellation
  wiring and counting deterministically first; keep deterministic and real-browser evidence apart.
- **III / IV.** — the bridge belongs to the application; inference lifecycle, capacity, queueing,
  cancellation and cleanup belong to AkariSP. The bridge MUST NOT add its own pool, queue,
  limiter or session manager.
- **V. Evidence Before Core Change** — integration friction does not justify AkariSP changes.
  Expected: AkariSP source / public API / runtime dependency changes = 0 / 0 / 0.
- **VI. Browser First** — Node-only success does not complete this Feature.
- **VII. Reproducible Agent Runs** — record package versions, browser environment,
  model/runtime configuration and evidence class.
- **X. Thin Integration Boundaries** — the bridge stays application-local; it is not promoted
  to a package.
- **XII. Findings Before Fixes** — suspected contract problems are recorded as findings first.
- **Verification Rules** — this is an implementation Feature: typecheck, build and deterministic
  tests are required, plus browser evidence for browser claims.

## Terminology

- **Workflow operation** — one higher-level task from the caller's or test scenario's view
  (e.g. "obtain one structured decision").
- **Logical model request** — one request the application/bridge sends to the model. A
  structured attempt followed by a free-text fallback is **two** logical requests within **one**
  workflow operation.
- **Provider invocation** — an actual call into the browser-local provider. Usually equal to
  logical requests, but may differ (e.g. provider-internal retries). If not exposed by public
  contracts, it is recorded as `NOT EXPOSED`, never estimated.
- **Integration owner** — the application-level object that owns one AkariSP runtime and the
  bridge instance(s) using it for the lifetime of a test or harness session.

## Bridge Responsibility

Allowed: translate LangChain message input into an AkariSP request; translate the AkariSP result
into a LangChain-compatible AI response; propagate caller cancellation; propagate minimal
metadata and errors; assign application-owned logical request identifiers.

Not allowed: session pool, queue, concurrency limiter, resource-reuse manager, retry framework,
provider registry, model router, graph or agent orchestration, RAG, memory, trading semantics.

## User Scenarios & Testing *(mandatory)*

Primary actor: the BrowserTradingAgents application developer, who needs a model seam the future
agent/graph layer can call without knowing AkariSP lifecycle details.

### User Story 1 - Invoke a browser-local model through LangChain.js and AkariSP (Priority: P1)

The developer calls the model through a standard LangChain.js invocation. The bridge forwards
the request to AkariSP's public API, AkariSP manages the Chrome Prompt API lifecycle, and the
developer receives a LangChain-compatible AI response. The developer never manages a Prompt API
session directly.

**Why this priority**: every later Feature depends on this path; without it nothing else in this
Feature matters.

**Independent Test**: In a supported browser, one invocation with a short text prompt returns a
non-empty AI response through the full path; deterministically, conversion in both directions is
verified without a real provider.

**Acceptance Scenarios**:

1. **Given** a text/message input, **When** it is invoked through the bridge, **Then** AkariSP
   receives the equivalent request and the caller receives an AI-message-compatible result.
2. **Given** a supported browser with the Prompt API available, **When** one invocation runs,
   **Then** the full path LangChain → bridge → AkariSP → Chrome Prompt API → result succeeds and
   is recorded as `REAL_BROWSER_PROMPT_API` evidence.
3. **Given** the runtime or provider fails, **When** the invocation runs, **Then** the caller
   receives an error (with original cause and request correlation), never a success response.

---

### User Story 2 - Reuse the AkariSP lifecycle across repeated calls (Priority: P1)

Repeated calls through the same integration owner reuse AkariSP's warm resource lifecycle; the
application does not rebuild a runtime per request.

**Why this priority**: the future graph issues 8–11 requests per run through one runtime
(Feature 001 §12); per-request reconstruction would invalidate that workload model.

**Independent Test**: two sequential requests through one integration owner both succeed, and
application-owned construction counters show one runtime construction.

**Acceptance Scenarios**:

1. **Given** one integration owner, **When** request A then request B complete, **Then** both
   succeed and runtime construction count stays 1.
2. **Given** the owner has not been shut down, **When** a further request is sent, **Then** the
   runtime is still usable.
3. Reuse evidence uses only public observability or application-owned counters, never private
   AkariSP state.

---

### User Story 3 - Observe bounded concurrency and queueing through the bridge (Priority: P2)

Two independent requests are started concurrently through the same integration owner. The bridge
forwards both to AkariSP without its own queue, and AkariSP's configured capacity/backpressure
behavior remains observable.

**Why this priority**: mirrors the future 2-branch analyst fan-out (Feature 001 A1); depends on
US1/US2.

**Independent Test**: with capacity configured so that queueing occurs (if the public API allows
it), two concurrent requests show one active and one queued through public observability, and
both eventually settle.

**Acceptance Scenarios**:

1. **Given** capacity lower than 2, **When** two requests start concurrently, **Then** public
   observability shows the second as queued while the first is active, and both settle.
2. **Given** any configured capacity, **When** two requests run, **Then** the bridge introduced
   no semaphore, queue or pool of its own (verified by inspection).
3. **Given** both settle, **When** a further request is sent, **Then** the runtime is usable.

---

### User Story 4 - Propagate cancellation correctly (Priority: P2)

A cancellation started by the LangChain caller reaches the AkariSP task.

**Why this priority**: the future graph needs abortable runs; a broken cancellation path would
leak work or hide failures.

**Independent Test**: one chosen scenario (active or queued request cancellation; the choice and
reason are recorded) where the caller observes cancellation, the AkariSP task settles, and no
queued/active work remains.

**Acceptance Scenarios**:

1. **Given** a submitted request, **When** the caller cancels it, **Then** the caller's call
   rejects with a cancellation/error outcome — never a normal response and never a placeholder
   string such as "cancelled".
2. **Given** a cancelled request, **When** the runtime is inspected through public observability,
   **Then** no orphaned active or queued task remains.
3. **Given** a cancelled request, **When** another request is sent, **Then** the runtime is usable
   (or in the state the public AkariSP contract defines).
4. Where possible without a real provider, the signal path application → bridge → AkariSP is also
   verified deterministically.

---

### User Story 5 - Structured-result fallback at the application layer (Priority: P3)

A small structured-style operation is attempted; on a controlled failure, the application issues
exactly one free-text fallback request; if that also fails, the error reaches the caller.

**Why this priority**: reproduces the Feature 001 workload property (structured → at most one
fallback) with a tiny example; it is application logic, not AkariSP responsibility.

**Independent Test**: deterministic test forcing the first attempt to fail shows logical requests
= 2, fallback requests = 1, workflow operations = 1; forcing both to fail shows the error
propagates and no further request is made.

**Acceptance Scenarios**:

1. **Given** the structured attempt succeeds, **When** the operation runs, **Then** it ends with
   1 logical request and 0 fallback requests.
2. **Given** the structured attempt fails in the controlled way, **When** the operation runs,
   **Then** exactly one fallback logical request is added.
3. **Given** the fallback also fails, **When** the operation runs, **Then** the error propagates
   to the caller and no third request is made.

---

### Edge Cases

- **Prompt API unavailable** in the test environment: record `BLOCKED` evidence (see Browser
  Unsupported Policy); never substitute a fake provider result as real-browser success.
- **Model download/availability pending** in a supported browser: treated as an environment
  state and recorded, not as integration success or failure.
- **Public API cannot express required behavior** (e.g. capacity cannot be configured, queued
  state not observable, cancellation not accepted): record a finding; do not modify AkariSP.
- **Cancellation races completion**: the recorded outcome follows AkariSP's public contract;
  the caller must still never receive a disguised success for a cancelled request.
- **Request after shutdown**: behavior must match the public AkariSP contract; duplicate shutdown
  must not corrupt application resources.
- **Provider-internal retries** not exposed: provider invocations recorded as `NOT EXPOSED`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: BrowserTradingAgents MUST depend on the published `akarisp@0.1.0-alpha.2`, pinned by
  a lockfile.
- **FR-002**: AkariSP MUST be consumed only through the package's public exports.
- **FR-003**: The application MUST provide an application-local thin LangChain chat-model bridge.
- **FR-004**: The bridge MUST convert LangChain model input into an AkariSP request.
- **FR-005**: The bridge MUST return the AkariSP result as a LangChain-compatible AI response.
- **FR-006**: A single LangChain invocation MUST complete through real AkariSP execution.
- **FR-007**: Sequential requests MUST work through the same bridge/runtime owner.
- **FR-008**: Two concurrent logical requests MUST be deliverable through the bridge.
- **FR-009**: The bridge MUST NOT implement its own concurrency queue, pool or limiter.
- **FR-010**: AkariSP's bounded concurrency/backpressure semantics MUST remain intact through the
  bridge.
- **FR-011**: Caller cancellation MUST propagate to the AkariSP task.
- **FR-012**: Runtime/provider failures MUST NOT be turned into success responses.
- **FR-013**: For a structured-style operation, on first-attempt failure the application layer
  MUST perform at most one free-text fallback request.
- **FR-014**: If the fallback also fails, the error MUST propagate to the caller.
- **FR-015**: Workflow operations, logical model requests and fallback requests MUST be
  observable separately.
- **FR-016**: Provider invocation counts MUST be recorded separately from logical requests when
  publicly observable, and MUST NOT be estimated when they are not.
- **FR-017**: The integration owner MUST have an explicit cleanup/shutdown path.
- **FR-018**: The Feature MUST include deterministic tests.
- **FR-019**: Real browser integration MUST be verified.
- **FR-020**: Any Chrome Prompt API integration success claim MUST be backed by
  `REAL_BROWSER_PROMPT_API` evidence.
- **FR-021**: The Feature MUST NOT include LangGraph.js or TradingAgents agent/graph code.
- **FR-022**: The Feature MUST NOT change AkariSP production source, public API or runtime
  dependencies.
- **FR-023**: On integration problems, a finding and application-workaround analysis MUST precede
  any core-modification proposal.

### Error Semantics

Bridge errors MUST preserve the original cause, carry the logical request correlation, and keep
cancellation distinguishable from provider/runtime failure. Where AkariSP exposes public error
types, their meaning is preserved; exact mapping is decided in planning from the actual public
API. No new AkariSP error API is invented.

### Observability

No new telemetry subsystem. A minimal structured log / counters is allowed, with fields such as
`executionId`, `logicalRequestId`, `event`, `queued`, `active`, `fallback`, `cancelled`, `timing`,
`errorKind`. Data already available from AkariSP's public snapshot/timing is referenced, not
re-implemented.

### Evidence Classes and Validation Matrix

Evidence classes: `STATIC_CODE_ANALYSIS`, `DETERMINISTIC_TEST`, `NODE_INTEGRATION`,
`BROWSER_AUTOMATED`, `REAL_BROWSER_PROMPT_API`, `BLOCKED`. Deterministic/fake evidence is never
reported as real Prompt API evidence; Node success is never reported as browser success.

| Scenario | Required evidence |
|---|---|
| Bridge conversion | `DETERMINISTIC_TEST` |
| Single request | `DETERMINISTIC_TEST` + browser evidence |
| Repeated invocation (reuse) | `BROWSER_AUTOMATED` or `REAL_BROWSER_PROMPT_API` |
| Concurrent requests ×2 | browser evidence |
| Queue / backpressure | browser evidence + public observability |
| Cancellation | `DETERMINISTIC_TEST` where possible + browser evidence |
| Structured fallback | `DETERMINISTIC_TEST` |
| Cleanup | browser evidence |
| Public import boundary | `STATIC_CODE_ANALYSIS` |
| Real Prompt API integration | `REAL_BROWSER_PROMPT_API` |

### Browser Unsupported Policy

If the Chrome Prompt API is unavailable in an environment, record:

```text
Evidence: BLOCKED
Reason:
Environment:
What was still verified:
What remains unverified:
```

Forbidden: reporting fake-provider success as real-browser success, reporting skipped tests as
PASS, claiming integration success on an unsupported browser. Because real Prompt API integration
is this Feature's core purpose, the Feature is **not** declared a full PASS while that evidence
remains `BLOCKED`.

### Finding Format

```text
Finding ID:
Feature:
Scenario:
Observed:
Expected:
Reproduction:
Evidence class:
AkariSP public contract involved:
LangChain contract involved:
Application workaround possible?:
Core change required?:
Confidence:
```

`Core change required = YES` requires reproduction and public-contract analysis first. A small,
natural application-local workaround is preferred.

### Key Entities

- **Integration owner**: owns one AkariSP runtime and the bridge for a session; has an explicit
  shutdown path.
- **Bridge**: application-local adapter between the LangChain chat-model contract and AkariSP's
  public API; stateless apart from references to its owner.
- **Logical model request**: one model request with an application-owned identifier; may be a
  primary or fallback request.
- **Workflow operation**: one caller-level task grouping one or more logical requests.
- **Evidence record**: scenario, evidence class, environment, revision, package versions, result,
  public observability snapshot where available.
- **Finding**: record in the Finding Format above.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 — Public package consumption**: installed AkariSP is exactly `akarisp@0.1.0-alpha.2`,
  and private/internal AkariSP imports = 0.
- **SC-002 — Thin bridge**: one model invocation succeeds from LangChain.js through the
  application-local bridge.
- **SC-003 — Real browser path**: at least 1 end-to-end run LangChain → bridge → AkariSP → Chrome
  Prompt API → result succeeds in a supported browser, recorded as `REAL_BROWSER_PROMPT_API`.
- **SC-004 — Reuse**: at least 2 sequential requests through one integration owner succeed with
  runtime construction count = 1.
- **SC-005 — Concurrency**: 2 independent requests can be submitted concurrently and AkariSP's
  capacity/queue semantics remain observable and intact.
- **SC-006 — Cancellation**: at least 1 cancellation scenario propagates from caller to AkariSP
  task, and orphaned active/queued work after it = 0.
- **SC-007 — Structured fallback**: under controlled failure, fallback requests per workflow
  operation ≤ 1, and no repeated retry loop occurs.
- **SC-008 — Counting**: workflow operations, logical model requests and fallback requests are
  reported separately; provider invocations are reported separately or as `NOT EXPOSED`.
- **SC-009 — Cleanup**: at test/harness end the shutdown path runs and active + queued work = 0.
- **SC-010 — Deterministic verification**: deterministic tests for conversion, failure
  propagation, fallback and counting exist and pass.
- **SC-011 — Scope integrity**: LangGraph implementation, TradingAgents agents, TradingAgents
  graph, AkariSP production changes, and official/generic AkariSP-LangChain packages are all 0.
- **SC-012 — Reproducibility**: a third party can repeat verification from the recorded
  BrowserTradingAgents revision, dependency lock, AkariSP version, browser prerequisites, test
  commands and evidence.

## Out of Scope

- **Graph / agents**: LangGraph.js; Market, News, Bull, Bear, Research Manager, Trader, Risk
  Reviewer, Final Decision; TradingAgents graph state.
- **Trading / data**: real market data; Yahoo Finance, Alpha Vantage, Reddit, StockTwits, FRED;
  brokers/exchanges; order execution; backtesting; PnL/Sharpe evaluation.
- **AkariSP extensions**: source changes, new public APIs, new provider abstraction, new queue
  implementation, official LangChain package.
- **Generic abstractions**: `@akarisp/langchain`, `akarisp/langchain`, generic model adapter
  package, provider registry, generic retry framework, generic structured-output framework,
  generic agent runtime.
- **Not required in this Feature**: streaming, tool calling.
- **Not success criteria**: tokens/sec, answer quality, financial accuracy, latency rankings,
  Prompt API vs WebLLM comparison. Timing may be recorded only as lifecycle/queue/reuse evidence.
- **Not implied**: success does not mean "AkariSP officially supports LangChain.js"; it means a
  small application-local bridge connected them in BrowserTradingAgents.

## Dependency Boundary

- **Allowed**: LangChain.js core packages required for the minimum chat-model contract;
  `akarisp@0.1.0-alpha.2`; development/build/test dependencies this repository needs.
- **Forbidden**: LangGraph.js; any TradingAgents Python dependency; AkariSP local source
  dependency; unnecessary frontend frameworks (React/Vue/Svelte/Next.js are not assumed).

## Feature 003 Boundary

Only after this Feature completes: *Feature 003 — LangGraph.js ↔ AkariSP Integration Validation*
(minimal graph, parallel independent branches, fan-in, sequential dependent nodes). Nothing from
Feature 003 is installed or implemented here.

## Assumptions

- `akarisp@0.1.0-alpha.2` is retrievable from the public npm registry.
- A Chrome build with the Prompt API available (including any required flags/origin setup and
  on-device model) can be provided for `REAL_BROWSER_PROMPT_API` evidence; exact setup is a
  planning concern. If unavailable, the Browser Unsupported Policy applies.
- Planning decides, from actual installed public APIs: LangChain.js packages/version and which
  chat-model base class/interface to use; TypeScript build tool; test runner; browser automation
  tool; exact AkariSP constructor/method/option names (runtime, capacity, cancellation,
  observability, shutdown); Chrome Prompt API setup. None of these are fixed by this spec.
- Whether queueing can be forced (capacity < 2) and whether queued/active state is publicly
  observable is determined in planning; if not, a finding is recorded rather than AkariSP changed.
- The concurrency level validated is exactly 2; larger stress tests are out of scope.
- A small deterministic schema/example is used for the structured fallback scenario; no
  TradingAgents schema is ported.
