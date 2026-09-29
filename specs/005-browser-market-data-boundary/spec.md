# Feature Specification: Feature 005 — Browser Market Data Boundary

**Feature Branch**: `005-browser-market-data-boundary`

**Created**: 2026-09-28

**Status**: Implemented (IMPLEMENTATION_COMPLETE); authenticated provider validation deferred — see
verification.md "Close-out" (2026-09-29). Requirements unchanged.

**Input**: User description: "Replace only the `marketFacts` producer of the completed Feature 004
eight-role graph with a browser-compatible live market-data boundary. News stays fixture. The
graph, role provenance, AkariSP boundary and lifecycle guarantees stay unchanged. Data source
(fixture / live) is an axis independent of the LLM provider (native / stand-in). The fixture path
survives; live never silently falls back to fixture; provider payloads are normalized before they
become graph input; source and time of the market data are observable; normalization is
deterministically testable; external-data failure is distinguishable from inference failure; no
secret is committed or exposed. No provider selection, tool calling, provider framework or
trading-quality claims in this Feature. Feature 006 = news data boundary."

## Purpose

Core question: **Can BrowserTradingAgents replace only the deterministic `marketFacts` input with
reproducible live market data obtained through a browser-compatible data boundary, without
changing the completed Feature 004 graph semantics, role provenance, or AkariSP inference
boundary?**

This is the first Feature that opens an external data boundary, and it opens exactly one: market
data for the Market Analyst. News stays the committed fixture (Feature 006 candidate). Success is
judged on data provenance, reproducibility, failure visibility and preserved graph semantics —
never on the quality of any analysis or decision (Constitution VIII).

## Baseline

Verified at specification time (2026-09-28):

| Item | Value |
|---|---|
| `origin/main` | `cca9c9a1abdcfa47d60f43d34fca43b07255fd0a` — merge of PR #5 (Feature 004 complete) |
| Feature branch | `005-browser-market-data-boundary`, created from `origin/main` @ `cca9c9a` |
| Feature 004 | COMPLETE — implementation / native execution revision `a0584fd`; `REAL_BROWSER_PROMPT_API` PASS; final re-audit PASS; code paths unchanged since `a0584fd` |
| `akarisp` / `@langchain/core` / `@langchain/langgraph` | `0.1.0-alpha.2` / `1.2.13` / `1.4.18` |
| Canonical app | root `index.html` → `src/main.ts`, running the eight-role fixture graph (`tradingagents-fixture-graph@1`, `tradingagents-fixture@1`) |
| LLM provider modes | native (default), stand-in (explicit test mode) |
| Market/news input | committed fixture only |

Untracked local Spec Kit/Claude tooling files are unrelated and left untouched.

## Inputs From Earlier Features

**Feature 001** (TradingAgents v0.5.1 @ `35543d0`) — upstream analysts obtain market data through
model-driven tool loops against live vendors, server-side. BrowserTradingAgents replaced this with
fixture data placed in the prompt (A3, A4). This Feature keeps A4 (no tool calling): the
application, not the model, acquires the data.

**Feature 004** — frozen contracts this Feature builds on: the eight-role topology, the role
contracts (Market Analyst reads subject + market facts, writes `marketReport`), 8 logical model
requests per successful run, one runtime / one model / one abort controller per run, explicit
signal forwarding (O-1), settlement on a `ready` runtime before shutdown (O-2), the evidence
contract, the canonical page and the provider modes.

**Roadmap** (`docs/roadmap.md`, 2026-09-28 CORS probe) — several upstream vendors cannot be called
from a browser page as is (no CORS headers, keys, User-Agent requirements); a browser-callable
source may expose its key. The data path is therefore an architectural question for the plan,
not an implementation detail.

## Target Data Flow

Feature 004:

```text
committed fixture ──→ marketFacts ──→ Market Analyst
committed fixture ──→ newsFacts   ──→ News Analyst
```

This Feature:

```text
                ┌─ fixture mode: committed fixture market facts (unchanged)
market data ────┤
                └─ live mode:    external market source
                                      ↓
                                 normalization boundary
                                      ↓
                                 normalized market snapshot
                                      ↓
                                 marketFacts ──→ Market Analyst ─┐
                                                                  ├─ fan-in ─→ Bull → … → Final Decision
committed news fixture ──→ newsFacts ────────→ News Analyst ────┘   (committed fixture in every mode)
```

In live mode the subject is the real instrument and the news input is a committed, neutral news
fixture that names no company (see *Clarifications*); fixture mode keeps the Feature 004 subject
and news unchanged.

The graph downstream of `marketFacts` is not touched. Data acquisition is an application step,
not a model-calling role and not a model decision.

## Mode Axes

Two independent choices, both visible to the user before a run and recorded in evidence:

| | Fixture market data | Live market data |
|---|---|---|
| **Stand-in LLM** | deterministic regression (Feature 004 path) | market-data boundary validation |
| **Native LLM** | Feature 004 native path | integrated dogfooding run |

Neither axis implies the other: choosing the native model never selects live data, and choosing
live data never selects the native model. News is fixture in all four combinations.

## Frozen Contracts (unchanged from Feature 004)

| Contract | Value |
|---|---|
| Topology | START → {Market Analyst ‖ News Analyst} → fan-in → Bull → Bear → Research Manager → Trader → Risk Reviewer → Final Decision → END |
| Role provenance | the Feature 004 *Role Contracts* table, every row, unchanged |
| Market Analyst | reads subject + `marketFacts`; writes `marketReport` |
| News Analyst | reads subject + fixture `newsFacts`; writes `newsReport` |
| Requests | 8 logical model requests, 0 fallback requests per successful run |
| Lifecycle | one runtime / model / abort controller per run; settlement before shutdown |
| Responsibility | application owns orchestration and data semantics; AkariSP owns inference lifecycle only |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run the graph on live market data (Priority: P1)

As a developer, I choose live market data on the canonical page and run the completed eight-role
graph. Only the Market Analyst's facts come from an external market source; News stays the
fixture; every role behaves as in Feature 004; and I can tell which source and which point in time
the market data came from.

**Why this priority**: it is the Feature's core claim — one external boundary, nothing else
changed.

**Independent Test**: one live-mode run in the browser whose evidence shows the data mode, the
source, the data time, fixture news, and the same role execution and request accounting as
Feature 004, and reproducibly identifies the normalized snapshot the Market Analyst saw.

**Acceptance Scenarios**:

1. **Given** live market data is selected and the source returns usable data, **When** the user
   runs the graph, **Then** the market data is normalized, rendered as `marketFacts`, read by the
   Market Analyst, and the run completes with all eight roles done.
2. **Given** a live-mode run, **When** the News Analyst's input is inspected, **Then** it is the
   committed neutral news fixture, names no company, and its subject is the real instrument.
3. **Given** a live-mode run, **When** every role's input is inspected, **Then** each reads exactly
   the fields of its Feature 004 role contract and nothing else, and every role's subject is the
   real instrument the market data describes.
4. **Given** a successful live-mode run, **When** accounting is read, **Then** logical model
   requests and fallback requests are the measured values (expected 8 and 0); data acquisition adds
   no model request.

---

### User Story 2 - Fixture regression survives (Priority: P1)

As a developer, I can still run the exact Feature 004 fixture path (fixture market + fixture news)
with either LLM provider, and the deterministic regression suite still proves the Feature 004
contracts.

**Why this priority**: the fixture is the regression oracle; losing it would make every later
failure unattributable (Constitution II).

**Independent Test**: fixture mode with the stand-in produces the Feature 004 inputs and
evidence; all Feature 004 deterministic, integration and browser tests still pass.

**Acceptance Scenarios**:

1. **Given** fixture mode, **When** the graph runs, **Then** the Market Analyst's `marketFacts` are
   identical to Feature 004's committed fixture market facts and no network data request is made.
2. **Given** fixture mode, **When** the evidence is read, **Then** it identifies the data mode as
   fixture and the fixture by its stable identity.
3. **Given** the Feature 004 deterministic and browser suites, **When** they run after this
   Feature, **Then** they pass without weakening their assertions.

---

### User Story 3 - Live data unavailable is explicit (Priority: P1)

As a developer, when I ask for live market data and it cannot be obtained, I see an explicit
market-data failure — never a run that quietly used fixture data.

**Why this priority**: a silent fallback would make a user believe an analysis used live data
when it did not; that is a provenance lie.

**Independent Test**: simulate each kind of unusable response in live mode and check the outcome,
the recorded failure kind, and that no fixture market data reached any role.

**Acceptance Scenarios**:

1. **Given** live mode and an unreachable, refusing, rate-limited or unusable source, **When** the
   user runs the graph, **Then** the run ends with an explicit market-data failure, no role
   receives fixture market facts, and the evidence records the data mode as live with the failure.
2. **Given** a market-data failure, **When** the evidence is read, **Then** it is classified as a
   market-data failure, distinct from an inference, runtime or graph-node failure.
3. **Given** a market-data failure before the graph starts, **When** accounting is read, **Then**
   zero model requests were made and no AkariSP work is left behind.

---

### User Story 4 - Provider payload never becomes the graph contract (Priority: P2)

As a maintainer, I can prove deterministically that a known source response becomes a stable
normalized snapshot and stable `marketFacts`, and that the Market Analyst never sees the source's
raw response format.

**Why this priority**: the normalization boundary is what keeps a later source change from
rippling into prompts, roles and tests.

**Independent Test**: feed recorded or constructed source responses through the boundary without a
network, compare the normalized snapshot and `marketFacts` to expected values, and inspect the
Market Analyst request.

**Acceptance Scenarios**:

1. **Given** the same source response twice, **When** it is normalized, **Then** the normalized
   snapshot and the `marketFacts` text are identical both times.
2. **Given** a response missing information the normalized snapshot requires, **When** it is
   normalized, **Then** normalization fails explicitly; no value is invented or defaulted silently.
3. **Given** a live-mode run, **When** the Market Analyst request is inspected, **Then** it contains
   the rendered normalized facts and none of the source's raw response structure.

---

### User Story 5 - Market data provenance and secrets (Priority: P2)

As a reviewer, from a live-mode evidence record alone I can tell which source was used, for which
instrument, when the data was requested and received, what time the source says the data
describes, and how old it was — and no credential appears anywhere in the record, the page output
or the repository.

**Why this priority**: live data is time-dependent; without temporal provenance a run cannot be
interpreted or reproduced, and a browser app is where secrets leak.

**Independent Test**: inspect a successful live-mode record for the provenance facts, and every record and the
committed tree for any credential material.

**Acceptance Scenarios**:

1. **Given** a successful live-mode record, **When** it is read, **Then** it identifies the data mode, source,
   instrument, request time, receive time, source as-of time and data age (or the plan's
   equivalent), and reproducibly identifies the normalized snapshot and the `marketFacts` rendered
   from it, whose values are kept in a local, non-committed replay artifact.
2. **Given** any record, console output or committed file produced by this Feature, **When** it is
   searched for credential material, **Then** none is found.

---

### Edge Cases

Required behavior:

- **Source unreachable / refuses the browser request / rate-limited / returns an error body**:
  explicit market-data failure (US3); no fallback.
- **Response lacks required information or has malformed values**: explicit normalization failure;
  no fabricated or defaulted values.
- **Data older than expected (market closed, weekend, delayed feed)**: the age and the source's
  as-of time are recorded and visible; stale data is never presented as current. Whether an age
  threshold blocks a run is a plan decision.
- **Cancel during market-data acquisition**: the run ends as cancelled; no role runs; no model
  request is made; any runtime created is shut down under the Feature 004 lifecycle rules.
- **Cancel or failure after the graph starts in live mode**: Feature 004 cancellation, failure and
  pre-shutdown settlement guarantees hold unchanged.
- **Repeated live runs**: each run acquires and records its own snapshot; no snapshot, runtime or
  model from a previous run is reused.
- **Live mode with the native model unavailable**: reported as the Feature 004 native `BLOCKED`
  case; the data mode does not change that classification.

Observation-only (recorded if seen, not a gate):

- The live snapshot's values differ between runs; content differences are expected and never
  asserted.
- Native model output that ignores the live facts or comments on stale data: content is not
  evaluated.

## Requirements *(mandatory)*

### Functional Requirements

**Frozen graph**

- **FR-001**: The eight-role topology, role order and fan-out/fan-in of Feature 004 MUST remain
  unchanged in every mode.
- **FR-002**: Every Feature 004 role contract (reads, must-not-read, writes) MUST remain unchanged
  in every mode; in particular the Market Analyst reads only the subject and `marketFacts` and
  writes `marketReport`.
- **FR-003**: A successful run MUST still make 8 logical model requests and 0 fallback requests
  (measured); market-data acquisition MUST NOT be a model request and MUST NOT be decided by a model.

**Data modes**

- **FR-004**: The application MUST offer a fixture market-data mode and a live market-data mode;
  only the producer of `marketFacts` differs between them.
- **FR-005**: The News Analyst MUST run in every mode (never removed or skipped) on news facts from
  a committed fixture: the Feature 004 news fixture in fixture mode; in live mode a committed neutral
  news fixture that names no company and states that no company-specific news is supplied.
- **FR-005a**: In live mode the subject presented to every role MUST be the real instrument the
  market data describes; the fictional Feature 004 subject MUST NOT be paired with live market
  data.
- **FR-006**: Fixture market-data mode MUST remain available and MUST yield `marketFacts`, subject
  and news identical to the Feature 004 committed fixture.
- **FR-007**: The data mode and the LLM provider mode MUST be independently selectable; all four
  combinations MUST be possible and neither choice may imply the other.
- **FR-008**: The data mode in effect MUST be visible to the user for each run and recorded in its
  evidence.
- **FR-009**: When live mode is selected and usable market data cannot be obtained, the run MUST end
  with an explicit market-data failure; fixture market data MUST NOT be substituted, and fixture
  data MUST be used only when fixture mode is selected.

**Normalization boundary**

- **FR-010**: Source responses MUST pass through an explicit normalization step that produces an
  application-defined normalized market snapshot; `marketFacts` MUST be rendered only from that
  snapshot.
- **FR-011**: The source's raw response structure MUST NOT reach graph state or any role request;
  the Market Analyst MUST NOT depend on any source-specific format.
- **FR-012**: The same source response MUST always produce the same normalized snapshot and the
  same `marketFacts`; a response lacking required information MUST fail normalization instead of
  producing invented or silently defaulted values.
- **FR-013**: Normalization and rendering MUST be verifiable deterministically, without a network,
  from known source responses.

**Provenance and evidence**

- **FR-014**: A successful live-mode evidence record MUST identify the market-data source, the
  instrument, the request and receive times, the source's as-of time for the data, the data age (or
  equivalent), and reproducibly identify the normalized snapshot and the generated `marketFacts`;
  their values MUST be preserved in a local, non-committed replay artifact that holds no
  credential. A failed or cancelled live-mode record identifies the data mode and whatever
  provenance was reached, and never a snapshot that does not exist.
- **FR-015**: Evidence MUST extend the Feature 004 evidence contract (same terms where they apply)
  and MUST record which news fixture was used, LLM provider, graph identity, logical/fallback
  requests, runtime lifecycle and outcome.
- **FR-016**: Evidence class MUST keep its Feature 004 meaning (LLM provider and environment); the
  data mode MUST NOT change or upgrade the evidence class.
- **FR-017**: A market-data failure MUST be recorded and shown as a market-data failure, distinct
  from inference, runtime or graph-node failures, with the failure kind observable.

**Lifecycle and boundaries**

- **FR-018**: Feature 004 lifecycle guarantees MUST hold in every mode: one runtime / model /
  abort controller per run; cancellation reaches every in-flight request; settlement is observed on
  a `ready` runtime before shutdown; post-shutdown `closed 0/0` is never cleanup proof.
- **FR-019**: Cancellation MUST also stop an in-progress market-data acquisition; a run cancelled or
  failed before the graph starts MUST make 0 model requests and leave no AkariSP work behind.
- **FR-020**: Market-data acquisition MUST stay outside AkariSP and outside `AkariChatModel`;
  AkariSP source, public API and dependency changes MUST be 0, and AkariSP MUST NOT gain any
  market-data awareness.
- **FR-021**: Inference MUST stay in the browser; if the plan shows that a server-side element is
  required to reach a market source, it MUST be limited to data acquisition and hold no inference,
  graph or trading logic.

**Security and scope**

- **FR-022**: No provider secret MAY be committed, written to evidence, printed to logs or console,
  or embedded in built artifacts in a way the provider's rules prohibit; the credential model is a
  plan decision.
- **FR-023**: Network data requests MUST be limited to the selected market-data source in live mode
  and MUST be zero in fixture mode; news is never fetched.
- **FR-024**: This Feature MUST use one market-data source path; no provider interface, registry,
  factory or multi-provider framework ahead of evidence (Constitution I).
- **FR-025**: No tool calling, function calling, model-selected data access or web search.
- **FR-026**: Success MUST NOT be judged on analysis quality, decision correctness, profitability
  or forecast accuracy; role output wording and live data values are never asserted.
- **FR-027**: Feature 001–004 evidence and historical files MUST NOT be rewritten.
- **FR-028**: Any incompatibility involving the data boundary, LangGraph, LangChain or AkariSP MUST
  be recorded as a finding (project format) before any workaround.

### Explicit Non-Goals

- Live news, news search, Sentiment or Fundamentals analysts (Feature 006 and later).
- Tool calling, function calling, model-selected API calls, RAG, web-search agents.
- More than one market-data source; a generic provider framework, registry or factory; a generic
  data platform or caching framework.
- Portfolio persistence, brokerage, orders, paper trading, positions, PnL.
- Multi-round Bull/Bear debate, a risk team, topology or role-provenance redesign.
- AkariSP changes of any kind (source, public API, dependency).
- Trading-quality evaluation or profitability claims.
- Fixing retry, backoff or cache behavior as requirements in this specification.

### Feature 006 Boundary

`006-browser-news-data-boundary` is the next candidate: live news acquisition, ranking,
freshness, attribution and duplication. This Feature keeps news on the committed fixture.

### Decisions Deferred to Planning

Market-data source; endpoint; authentication and credential model (public token, user-supplied
key, ephemeral key, proxy or keyless); whether a thin data proxy is needed; normalized snapshot
fields; rendered `marketFacts` wording; mode selection controls and parameter names; error kinds;
retry, backoff, cache, freshness and rate-limit handling; evidence field names; whether live
snapshots may be committed as evidence under the source's terms.

### Key Entities

- **Data mode**: fixture or live; chosen per run; independent of the LLM provider mode.
- **Market-data source**: the one external source used in live mode; identified in evidence.
- **Source response**: the raw response of the source; never enters graph state.
- **Neutral news fixture**: committed news input for live mode; names no company; states that no
  company-specific news is supplied.
- **Normalized market snapshot**: the application-defined representation produced by
  normalization; carries instrument identity and temporal provenance.
- **`marketFacts`**: text rendered from the snapshot (live) or taken from the fixture (fixture);
  the only market input the Market Analyst reads.
- **Market-data failure**: an acquisition or normalization failure; distinct from inference
  failures.
- **Evidence record**: the Feature 004 record extended with data mode and market-data provenance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In every mode, a successful run executes each of the eight roles exactly once in the
  Feature 004 order, with 8 logical model requests and 0 fallback requests (measured).
- **SC-002**: In every mode, 100% of role requests contain only the fields of their Feature 004
  role contract; forbidden fields found = 0.
- **SC-003**: In fixture mode, `marketFacts` equal the Feature 004 fixture market facts exactly and
  network data requests = 0.
- **SC-004**: In every mode, the News Analyst's input equals the committed news fixture for that
  mode exactly (Feature 004 news in fixture mode, neutral news in live mode); external news requests
  = 0; live-mode runs pairing the fictional subject with live market data = 0.
- **SC-005**: All four data-mode × provider-mode combinations can be selected and each run's
  evidence identifies both choices correctly.
- **SC-006**: For every simulated live-data failure kind, the run ends as a market-data failure,
  fixture market data reaches no role (0 substitutions), and 0 model requests are made when the
  failure precedes the graph.
- **SC-007**: Normalizing the same source response repeatedly yields identical snapshots and
  identical `marketFacts` in 100% of deterministic checks; incomplete responses are rejected in
  100% of checks.
- **SC-008**: Market Analyst requests containing any raw source-response structure = 0.
- **SC-009**: Every successful live-mode execution record reproducibly identifies the normalized market
  snapshot and generated `marketFacts`, records their source and temporal provenance, and preserves
  the corresponding values in a local non-committed replay artifact without storing credentials;
  missing items = 0.
- **SC-010**: Market-data failures are classified separately from inference/runtime failures in
  100% of failure records.
- **SC-011**: Credential material found in committed files, evidence records and console output =
  0.
- **SC-012**: Feature 004 lifecycle guarantees (pre-shutdown `ready 0/0`, cancellation reaching all
  in-flight work, per-run ownership) pass in both data modes; a cancellation during acquisition
  makes 0 model requests.
- **SC-013**: AkariSP source, public API and dependency changes = 0; data acquisition code paths
  inside AkariSP or `AkariChatModel` = 0.
- **SC-014**: Market-data sources used = 1; provider framework/registry/factory abstractions = 0;
  tool or function calls = 0.
- **SC-015**: The canonical page completes a live-mode run with the stand-in LLM under automated
  browser validation, and a live-unavailable run that ends as an explicit market-data failure.
- **SC-016**: In real Chrome, the canonical page completes one eight-role run with live market data
  from the real source on the native Prompt API, with the full market-data provenance recorded, or
  the Feature is reported `BLOCKED` (not complete).
- **SC-017**: Feature 001–004 historical files changed = 0; every Feature 004 test remaining in the
  suite passes; typecheck, production build, deterministic tests, Node integration and automated
  browser validation pass.

### Completion Model

- **Implementation complete**: SC-001–SC-015 and SC-017 pass.
- **Feature complete**: additionally SC-016 passes. If the market source or the native model is
  unavailable, the Feature status is BLOCKED / INCOMPLETE, never completed with fixture or
  stand-in evidence.

## Constitution Alignment

| Principle | How this Feature complies | Visible tension |
|---|---|---|
| I. Dogfood Before Abstraction | one real source path; no provider interface/registry (FR-024) | a second source later may justify an abstraction — only with evidence |
| II. Deterministic Fixtures First | fixture mode kept as regression oracle; normalization proven without network (FR-006, FR-013) | first Feature that mixes a network dependency into a run; confined to one input and one mode |
| III. Application Owns Orchestration | acquisition, normalization and data semantics in the app | — |
| IV. AkariSP Owns Inference Lifecycle | AkariSP untouched, no market-data awareness (FR-020) | — |
| V. Evidence Before Core Change | AkariSP changes 0; findings first (FR-028) | — |
| VI. Browser First | inference stays in the browser; completion needs a real-Chrome live run (SC-016) | a data proxy, if required, is a non-browser element (FR-021 limits it to acquisition) |
| VII. Reproducible Agent Runs | source + temporal provenance recorded; snapshot and `marketFacts` reproducibly identified, values kept in a local replay artifact (FR-014, SC-009) | live content cannot be re-fetched identically; replay rests on the local artifact, not on committed evidence (provider terms) |
| VIII. No Trading-Quality Claims | FR-026 | real prices make outputs look like advice; evaluation stays structural |
| IX. External Data Deferred | this is the separate, later Feature the principle calls for; opens market data only | **the principle's initial-phase list names specific external data vendors; lifting it for market data is a deliberate step taken here, not a blanket permission — news, social, fundamentals and brokers stay excluded** |
| X. Thin Integration Boundaries | `AkariChatModel` unchanged; data boundary application-local | — |
| XI. Preserve Reference Semantics Explicitly | upstream tool-driven data (A4) stays replaced by app-acquired data | live data narrows the A3 gap; A4 (no tools) unchanged |
| XII. Findings Before Fixes | FR-028 | — |

### Finding Format

```text
Finding ID:
Feature:
Scenario:
Observed:
Expected:
Reproduction:
Evidence class:
Data mode:
Market-data source involved:
LangGraph contract involved:
LangChain contract involved:
AkariSP contract involved:
Application workaround possible?:
Core change required?:
Confidence:
```

No finding is known at specification time; expected default: Core change required = NO.

## Clarifications

### Session 2026-09-28

- Q: In live mode the market facts describe a real instrument while the committed news fixture
  describes the fictional "Northwind Lamps Ltd."; what subject and news should a live-mode run
  present to the roles? → A: The real instrument is the subject; news comes from a committed
  neutral news fixture that names no company (no invented news about a real company, no mismatched
  subjects). Fixture mode keeps the Feature 004 subject and news unchanged (FR-005, FR-005a,
  SC-004).
- Q (plan finding F005-P2): SC-009 required the record to *state* the normalized snapshot, but
  provider terms make committing market values a redistribution risk. How should reproducibility
  be proven? → A: The record reproducibly identifies the snapshot and `marketFacts` and records
  their source and temporal provenance. The values stay in a local, non-committed replay artifact
  without credentials. The identification mechanism is a plan decision (FR-014, SC-009).
- Q (analyze finding M3): does SC-009 apply to failed live runs, which have no snapshot? → A: No.
  SC-009 and FR-014 apply to successful live-mode records. Failed or cancelled live records carry
  the data mode and the provenance reached, and are covered by FR-017 and SC-006.

## Assumptions

- Live mode targets one real listed instrument configured by the application for this Feature;
  a user-entered symbol is a later Feature (roadmap end state: ticker and date as input).
- The Feature 004 fixture (`tradingagents-fixture@1`) stays byte-identical so the existing
  regression suites remain valid.
- Automated browser validation of live mode uses a controlled source response, not the real
  network; only SC-016 depends on the real source.
- Data acquisition happens before or at the start of the graph run; the exact placement is a plan
  decision constrained by FR-003 and FR-019.
- The Feature 004 page protection timeout covers the graph; any acquisition time limit is a plan
  decision and is page protection only.
