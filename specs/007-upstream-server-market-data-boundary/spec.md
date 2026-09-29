# Feature Specification: Feature 007 — Upstream-Compatible Server Market Data Boundary

**Feature Branch**: `007-upstream-server-market-data-boundary`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "First establish, from the frozen TradingAgents implementation, what
the Market Analyst actually needs as market data and tools. Then specify a same-origin Next.js
server market-data boundary that supplies that data to the existing browser graph. Provider not
preselected."

## Purpose

Core question: **What market input does the frozen TradingAgents Market Analyst actually consume,
and can BrowserTradingAgents obtain an upstream-compatible version of it through its own
same-origin server boundary, without moving any agent execution to the server?**

Today (Feature 005, historical experiment):

```text
Browser → external market provider (direct) → normalization → marketFacts → Market Analyst
```

Target (this Feature):

```text
Browser → same-origin application market boundary → server-side external provider
        → normalized BrowserTradingAgents market contract → existing marketFacts boundary
        → existing Market Analyst
```

The contract is derived from the upstream reference first. A provider is chosen only after that,
from documented evidence. No provider is canonical at specification time.

## Baseline

Verified at specification time (2026-09-29):

| Item | Value |
|---|---|
| Branch | `007-upstream-server-market-data-boundary`, created from `origin/main` |
| Base | `f4d976c` — merge of PR #7 (Feature 006) |
| Working tree | clean apart from unrelated untracked Spec Kit/Claude tooling |
| Shell | Next.js App Router (`app/page.tsx`, `app/harness/page.tsx`); Vite retired |
| Execution | LangGraph, `AkariChatModel`, AkariSP, the Prompt API and the stand-in run in the browser only |
| Route handlers | none (no `/api/*`) |
| Data modes | `fixture` (default) and `live` (Feature 005: browser → Massive directly, user-typed key) |
| Feature 006 | FEATURE_COMPLETE; final native evidence `specs/006-…/evidence/real-browser-next-fixture-2026-09-29-a303192.json` |
| Feature 005 | IMPLEMENTATION_COMPLETE; authenticated provider validation (P-1, L4, L5) DEFERRED |

## Frozen upstream reference

- Repository: `TauricResearch/TradingAgents`
- Commit: `35543d0248bf89fcb92b17a15858ad0c0e940687` (v0.5.1), the same reference as Feature 001.
- The upstream is never advanced to a newer HEAD in this Feature.

Already recorded by Feature 001 (`specs/001-tradingagents-reference-analysis/research.md` §4.1,
§6.1–6.3) and reused here:
- The Market Analyst binds three tools: `get_stock_data`, `get_indicators` and
  `get_verified_market_snapshot`. It runs a model-driven tool loop (N tool rounds ⇒ N+1 model
  calls) until it answers without tool calls.
- All analyst tools receive `trade_date` from graph state. Dated arguments are clamped so they are
  never later than `trade_date`.
- Data calls go through a vendor router with yfinance as the configured default.
- BrowserTradingAgents adaptations A3 (real data → fixtures) and A4 (tool loop → data in the prompt,
  one request per analyst) are in force.

Not recorded by Feature 001, and therefore **not assumed** here: tool parameters, date/range and
interval semantics, the indicator set and how it is computed, the shape of each tool's result, how
results enter the prompt, and any provider-specific assumptions. These are the research obligations
of FR-001.

## Reference vs adaptation

- **Reference behavior**: what the frozen upstream actually does to give the Market Analyst market
  data (tools, inputs, results, prompt entry).
- **BrowserTradingAgents adaptation**: a deliberate, documented difference made for the browser +
  Next.js architecture. Examples already in force are A1 (analyst fan-out), A3 (fixtures) and A4
  (no tool loop).

Every difference between the two is recorded with its reason. A difference that is not recorded
is a defect.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fixture runs exactly as before (Priority: P1)

A user runs the default fixture mode, with the stand-in or the native Prompt API. It works exactly
as it does today, with no external provider, no credential and no dependency on the new server
boundary.

**Why this priority**: fixture mode is the deterministic regression oracle and the canonical
native inference gate. Breaking it breaks every earlier guarantee.

**Independent Test**: run the existing fixture browser tests and the installed-Chrome
native + fixture gate with no provider credential present and the market boundary unreachable.

**Acceptance Scenarios**:

1. **Given** no provider credential is configured, **When** a fixture run starts (stand-in or
   native), **Then** it completes 8/8 roles with 8 logical and 0 fallback requests and makes no
   market-data request of any kind.
2. **Given** the market boundary fails or is absent, **When** a fixture run starts, **Then** the
   run is unaffected.

---

### User Story 2 - Live data through the application's own server (Priority: P1)

A user chooses live market data. The browser obtains it only from the application's same-origin
market boundary. The server fetches it from the chosen provider, and the user never sees, types or
receives the provider secret.

**Why this priority**: this is the Feature's architectural change. It moves external acquisition
and secrets behind the server while agents stay in the browser.

**Independent Test**: with the provider side controlled, a live run completes the eight-role
graph. The browser's recorded requests contain only same-origin market-boundary calls and no
provider-origin request.

**Acceptance Scenarios**:

1. **Given** live mode and a valid provider response, **When** the user clicks Run, **Then** the
   browser calls only the same-origin boundary, receives the normalized contract, builds
   `marketFacts`, and the existing graph completes 8/8.
2. **Given** live mode, **When** the page, the DOM, browser storage, the URL and the evidence are
   inspected, **Then** no provider secret and no provider-specific raw field is present.
3. **Given** live mode, **When** the run completes, **Then** the evidence identifies the data mode,
   the use of the server boundary, the provider adapter, freshness times and the digests.

---

### User Story 3 - Market contract derived from the frozen upstream (Priority: P1)

A developer can see, with source references, what the frozen Market Analyst consumes. They can
also see how the browser-facing contract reproduces or deliberately adapts each part.

**Why this priority**: without it, the contract would be whatever the first provider happens to
return, which is the mistake Feature 005 documented.

**Independent Test**: the research artifact answers each FR-001 question with a source reference
at the frozen commit, and every contract field maps to a reference item or to a recorded
adaptation.

**Acceptance Scenarios**:

1. **Given** the research artifact, **When** a reviewer checks each Market Analyst tool, **Then**
   its parameters, date handling, result shape and prompt entry are documented with file/line
   references at the frozen commit.
2. **Given** the browser-facing contract, **When** each field is traced, **Then** it maps to a
   reference item or to a named adaptation with its reason. Nothing is unexplained.

---

### User Story 4 - Failures and cancellation stop before any model work (Priority: P1)

A live acquisition that fails, times out, returns invalid data or is cancelled ends the run as a
typed market-data failure. No AkariSP runtime or model request is created, and no fixture data is
substituted.

**Why this priority**: acquisition-before-runtime and no-silent-fallback are the core Feature 005
guarantees. Moving acquisition to the server must not weaken them.

**Independent Test**: controlled provider outcomes (unauthorized, rate-limited, provider error,
malformed, timeout) and a user Cancel during acquisition each produce a typed failure with
runtime creations 0 and model requests 0.

**Acceptance Scenarios**:

1. **Given** live mode and a failing provider, **When** the user clicks Run, **Then** the run ends
   with a market-data failure of the matching kind, runtime creations 0, model requests 0, and no
   fixture data shown or recorded as live.
2. **Given** live mode, **When** the user cancels while acquisition is in flight, **Then** the
   browser request is aborted, the server request is cancelled as far as the provider path allows
   (with any limitation stated), and runtime creations and model requests are 0.
3. **Given** acquisition succeeded, **When** the user cancels during the graph, **Then** the
   Feature 004 invariant holds: `{ready,0,0}` before shutdown, `settledBeforeShutdown` true,
   `{closed,0,0}` after.

---

### User Story 5 - Deterministic validation without the real provider (Priority: P2)

A maintainer can validate the whole server boundary, from normalization to the route to the
browser, with controlled provider behavior and no real provider, network or credential.

**Why this priority**: Feature completion must not depend on an external service's availability,
terms or account state.

**Independent Test**: the controlled test levels run offline and cover a valid response, malformed
data, unauthorized, rate-limited, provider error, timeout and cancellation.

**Acceptance Scenarios**:

1. **Given** no network and no credential, **When** the controlled suites run, **Then** every
   listed outcome is exercised and asserted.

---

### User Story 6 - Separable evidence layers (Priority: P2)

A maintainer can tell apart, from the evidence, five things: browser network activity, server →
provider activity, market acquisition, graph execution and model lifecycle.

**Why this priority**: a browser showing no provider request says nothing about what the server
did, and a failure must be attributable to the right stage.

**Independent Test**: evidence records and test assertions name the layer each claim is about. Any
server-side request count is measured or controlled, never inferred.

**Acceptance Scenarios**:

1. **Given** a live run, **When** evidence is read, **Then** acquisition, normalization, runtime
   creation, graph execution and settlement outcomes are each distinguishable.
2. **Given** a claim about server → provider requests, **When** it is checked, **Then** it comes
   from a measured or controlled source.

---

### User Story 7 - One real provider evaluated separately (Priority: P3)

When a provider is technically viable and its permitted use is acceptable, and a credential is
available, a maintainer can validate it against the real service. This is reported separately
from controlled evidence and never gates fixture or native regression.

**Why this priority**: real-provider evidence is valuable but depends on terms, accounts and
uptime outside the project.

**Independent Test**: a real-provider run is recorded under its own evidence level. If
prerequisites are missing, the result is recorded as BLOCKED or DEFERRED, not as PASS.

**Acceptance Scenarios**:

1. **Given** prerequisites are met and the maintainer approves, **When** a real live run is made,
   **Then** its evidence is recorded separately with no secret.
2. **Given** prerequisites are not met, **When** the Feature closes, **Then** real-provider
   validation is recorded as BLOCKED or DEFERRED with the reason, and controlled evidence is not
   presented as real-provider evidence.

---

### Edge Cases

- The provider returns data for a date later than the run's analysis date, or no data for it
  (weekend, holiday, delisted symbol).
- The provider returns partial data: some required values are missing or some indicators cannot
  be computed from the available history.
- The provider responds after the user cancelled, or never responds.
- The server has no credential configured while the browser selects live mode.
- The server and browser run in different time zones, or the host time zone changes.
- A framework or intermediary caches a live response and would serve stale data as fresh.
- A second Run is clicked while an acquisition is still in flight.
- The provider changes its response shape or tightens its rate limit.
- The Feature 005 direct-browser path and the new server path could both be reachable as `live`.

## Requirements *(mandatory)*

### Functional Requirements

**Upstream audit and contract**

- **FR-001**: Before any contract or provider decision, the Feature MUST document, from the frozen
  upstream commit `35543d0248bf89fcb92b17a15858ad0c0e940687`, with file/line references:
  - each Market Analyst tool
  - its parameters, including symbol, date, range and interval handling
  - required price history
  - indicators and how they are produced
  - provider-specific assumptions
  - the result format
  - how results enter the prompt/context
  - how many tool calls one invocation may make
  - where market data is separated from fundamentals and news

  Nothing absent from the source may be assumed.
- **FR-002**: The Feature MUST record, for every item of FR-001, whether BrowserTradingAgents
  reproduces it, adapts it (with reason), delegates it to the provider, or defers it. This covers
  explicitly the indicator computation and any fundamentals data the Market Analyst's own tools
  require.
- **FR-003**: The browser-facing market contract MUST be derived from FR-001/FR-002. It MUST be
  deterministic in shape, validated and provider-independent. It MUST be explicit about required
  vs optional values, and contain no provider-specific or raw provider fields.
- **FR-004**: A fidelity gap between the current `marketFacts` representation and the reference
  MUST be recorded as a finding. The Market Analyst role contract (reads `subject`, `marketFacts`;
  writes `marketReport`) MUST NOT change without an explicit, recorded plan decision.

**Server boundary and ownership**

- **FR-005**: Live market data MUST reach the browser only through a same-origin application
  market boundary. In live mode the browser MUST make no request to a provider origin.
- **FR-006**: The server side MUST own only **deterministic market-data preparation**:
  - the provider request and any provider credential
  - provider-specific response normalization
  - upstream-compatible deterministic `MarketBundle` computation, including indicator calculation
    and verified-snapshot construction
  - timeout and error translation

  This is data preparation, not agent inference. The server MUST NOT own agent reasoning,
  LangGraph execution, LLM inference, the AkariSP lifecycle, the Prompt API, the graph lifecycle or
  trading-decision semantics. These stay in the browser.
- **FR-007**: Browser code MUST NOT depend on any provider URL, credential, response field name or
  SDK.
- **FR-008**: Exactly one concrete provider implementation MUST be built, behind one narrow
  boundary. No provider registry, plugin system, selection UI or hierarchy for hypothetical
  providers may be added. At most one minimal seam is allowed, and only when a test double needs
  it.

**Provider selection**

- **FR-009**: Provider selection MUST follow the upstream audit. Candidates MUST be evaluated
  against the capabilities FR-001 derives, with **technical viability** and **permitted use**
  recorded as separate findings for each serious candidate. Neither the existing Feature 005
  Massive code nor a candidate's price may decide the choice.
- **FR-010**: The provider choice, its rationale and its trade-offs MUST be documented. When cost,
  terms, credentials or architecture require maintainer judgment, real-provider implementation MUST
  wait for explicit maintainer approval.
- **FR-011**: If no candidate satisfies the derived contract with acceptable permitted use, the
  Feature MUST record **BLOCKED / provider decision required** instead of selecting a weak
  provider. The provider-independent boundary work (contract, validation, failure mapping,
  controlled tests) remains deliverable.

**Modes, ordering and failure**

- **FR-012**: The provider axis (`native`/`standin`) and the data axis (`fixture`/`live`) MUST stay
  independent. After migration, `live` MUST mean acquisition through the server boundary. No third
  user-facing data mode is added unless research gives a documented reason.
- **FR-013**: Fixture mode MUST remain deterministic and MUST NOT depend on the market boundary, a
  provider, a credential or the network. The canonical native Prompt API gate MUST stay native +
  fixture.
- **FR-014**: In live mode, acquisition, then validation/normalization, then graph input MUST
  complete before any AkariSP runtime or model is created. Any acquisition failure, timeout,
  invalid data or cancellation MUST leave runtime creations and model requests at 0.
- **FR-015**: A live acquisition failure MUST NOT fall back to fixture or stale data, and MUST NOT
  label non-live data as live.
- **FR-016**: The run's cancellation MUST propagate from the browser to the server request, and on
  to the provider request where the provider path supports it. Any point where cancellation cannot
  propagate MUST be documented, not claimed.
- **FR-017**: The graph-stage lifecycle invariant MUST be unchanged: after a caller cancellation or
  failure, `{ready,0,0}` is observed before shutdown with `settledBeforeShutdown` true, then
  `{closed,0,0}`.
- **FR-018**: Market-data failures MUST use a typed taxonomy that preserves or deliberately maps
  the Feature 005 kinds: credential-missing, network, unauthorized, rate-limited, provider-error,
  timeout, unavailable, invalid-data, cancelled. Raw provider status details MUST NOT become
  application semantics. No failure may default silently.
- **FR-019**: Failures MUST keep their stage provenance: acquisition, normalization/validation,
  runtime/model creation, graph execution, and settlement/shutdown. A market-data failure is never
  reported as a model or graph failure, or vice versa.
- **FR-020**: Invalid provider data MUST be rejected or mapped to a failure. It MUST NOT be
  zero-filled, given invented timestamps or substitute indicators, or coerced into valid-looking
  values.
- **FR-021**: Normalized dates and sessions MUST be deterministic. The same provider data MUST
  normalize identically regardless of the server's or browser's time zone. The date semantics MUST
  follow the upstream audit, not Feature 005's assumptions.
- **FR-022**: Live data MUST NOT be cached or served stale by the framework or any intermediary
  unintentionally. No cache layer is added unless research shows it is needed for correctness.
- **FR-023**: No automatic retry, backoff or provider failover is added without documented evidence
  of need. Rate limits and timeouts surface as typed failures.

**Security**

- **FR-024**: Any provider credential MUST be server-only. It MUST NOT appear in:
  - the client bundle, HTML or DOM
  - browser storage
  - browser-sent URLs
  - evidence or replay
  - logs, error messages or responses
  - source control

  It MUST NOT use a publicly exposed environment prefix. Checks target actual secret values and
  injection paths; identifier names alone are not leaks.
- **FR-025**: The server boundary is a technical, secret and CORS boundary only. Documentation MUST
  NOT claim that it resolves a provider's terms or permitted use.
- **FR-026**: The Feature 005 direct-browser live path and its browser credential entry MUST stay
  until the server path is proven equivalent and secure. The plan MUST then decide between
  retiring it and keeping it as a clearly distinguished non-canonical experiment. The canonical
  application MUST NOT offer two indistinguishable `live` paths.

**Evidence, replay and tests**

- **FR-027**: A live run's evidence MUST identify:
  - revision and data mode
  - that the server boundary was used, and the provider adapter
  - when the data applies, when the server acquired it, and when the run used it
  - the normalized-data digest and the `marketFacts` digest
  - the acquisition outcome and the graph lifecycle outcome

  It MUST follow the existing redaction conventions: no secret, no authorization value, no raw
  provider payload, no market values or role text where the existing policy excludes them.
- **FR-028**: A successful live acquisition MUST remain replayable locally, meaning a normalized
  snapshot plus `marketFacts` with matching digests and no credential. Reproducibility comes from
  that replay, never from assuming the provider returns the same data again.
- **FR-029**: Deterministic controlled tests, with no real provider or network, MUST cover:
  - a valid response
  - invalid/malformed data
  - unauthorized
  - rate-limited
  - provider failure
  - timeout
  - cancellation

  They cover normalization, the server boundary, and the browser → server path, using the
  project's existing evidence-level convention. No production-only test hook may be added without
  justification.
- **FR-030**: Browser network evidence and server → provider evidence MUST be recorded separately.
  Any server-side request count, URL, timeout or cancellation claim MUST be measured or controlled.
- **FR-031**: Real-provider validation, if performed, MUST be a separate evidence level with
  maintainer approval. It MUST NOT be required for fixture, controlled or native gates. Controlled
  success MUST NOT be reported as real-provider success.
- **FR-032**: The eight-role topology, role provenance, prompts, AkariSP and `AkariChatModel` MUST
  be unchanged (AkariSP changes: 0). If a change appears necessary, work stops with a finding.
- **FR-033**: Feature 001–006 specs, verification records and evidence MUST NOT be modified.
  Feature 005 evidence continues to describe a browser-direct experiment.

### Key Entities

- **Upstream Market Analyst data requirement**: the audited set of tools, parameters, history,
  indicators, date semantics and result formats at the frozen commit, each with a source reference.
- **Reference/adaptation record**: for each requirement, reproduce, adapt, delegate or defer, with
  the reason.
- **Normalized market contract**: the provider-independent, validated response the browser
  receives, with required/optional values and freshness times.
- **Market-data failure**: a typed kind plus stage provenance, with no raw provider detail.
- **Provider evaluation**: per candidate, contract coverage, technical viability and permitted use
  as separate findings, plus the maintainer decision.
- **Live evidence record / replay artifact**: provenance, freshness, digests and outcomes,
  redacted per the existing policy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Controlled / deterministic** (required for completion):

- **SC-001**: 100% of the FR-001 questions are answered with a source reference at the frozen
  commit, or marked "not present in source". Unsupported assumptions: 0.
- **SC-002**: 100% of the browser contract fields trace to a reference item or a recorded
  adaptation.
- **SC-003**: The fixture regression passes unchanged in the same browser suite (8/8 roles, 8
  logical, 0 fallback), and the native + fixture gate passes, both with no provider credential
  present.
- **SC-004**: Live runs in the controlled browser suite make 0 browser requests to any provider
  origin.
- **SC-005**: A valid controlled server response drives the existing eight-role graph to 8/8, with
  8 logical and 0 fallback requests.
- **SC-006**: For every controlled acquisition failure kind and for Cancel during acquisition,
  runtime creations = 0 and model requests = 0.
- **SC-007**: Silent fixture fallbacks in live mode: 0.
- **SC-008**: A graph-stage cancel after successful acquisition records `{ready,0,0}` before
  shutdown, `settledBeforeShutdown` true, and `{closed,0,0}` after.
- **SC-009**: Provider-secret occurrences in the client bundle, HTML/DOM, browser storage, URLs,
  evidence, replay, logs, boundary responses and committed files: 0.
- **SC-010**: Provider-specific or raw provider fields in the browser contract: 0.
- **SC-011**: The same provider data normalizes to identical output under at least two different
  host time zones.
- **SC-012**: Every server-side network claim in the evidence cites a measured or controlled source.
  Inferred server request counts: 0.
- **SC-013**: Feature 001–006 historical files changed: 0 (hash comparison).
- **SC-014**: AkariSP source, API and dependency changes: 0. Graph topology, role provenance and
  prompt changes: 0 (or each backed by a recorded plan decision under FR-004).
- **SC-015**: Canonical `live` paths offered by the application at completion: exactly 1.

**Provider decision and real provider** (reported separately):

- **SC-016**: Each serious provider candidate has separate technical-viability and permitted-use
  findings, and the chosen provider (or BLOCKED state) is recorded with rationale and maintainer
  decision.
- **SC-017**: The real-provider result is recorded as exactly one of PASS, BLOCKED or DEFERRED
  under its own evidence level. It is never counted toward SC-001–SC-015.

## Assumptions

- The Next.js server runtime from Feature 006 can host one same-origin market route. Local
  development runs it with `next dev` / `next start`.
- A provider credential, if one is needed, comes from a server environment variable chosen in the
  plan. No test or fixture gate needs it.
- Controlled provider behavior can be produced without a production-only hook. The plan decides
  the mechanism.
- The News Analyst keeps its committed neutral fixture input. Only the Market producer changes.
- The Feature 005 evidence ladder (L1 normalization, L3 browser-controlled, L4/L5 real) is extended
  rather than replaced. The plan fixes the level names, including a server-controlled level.
- Constitution IX is satisfied: external data arrives as a separate application Feature after the
  deterministic workload is stable, and fixture stays the default.

## Out of Scope

- Live news, `/api/news`, news providers, web search, news tools
- A general `/api/fundamentals` endpoint. Fundamentals appear only if FR-001 shows the Market
  Analyst's own tools require them, and then only as an FR-002 decision.
- A multi-provider framework, provider registry, provider selection UI, or failover
- Retry/backoff frameworks, caches (Redis, database, persistent)
- Moving any agent reasoning or market analysis to the server or to Server Components
- The upstream tool loop (A4 stays; changing it would be a separate Feature)
- WebLLM, Agent Town, Vercel AI SDK/Gateway, cloud inference, inference-tier routing
- Trading-quality claims: correctness, PnL, alpha, analyst quality
- Changes to AkariSP or `AkariChatModel`
- Using a real credential or contacting a real provider before the plan's approval gate

## Feature 008 boundary (candidate)

After this Feature, the market producer is server-backed and upstream-traced. Candidates for a
later Feature (not decided here): live news through the same server pattern, fundamentals if
Feature 007's audit places them outside the Market Analyst, or the upstream tool loop (removing A4)
once browser tool calling is evidenced.
