# Feature Specification: Feature 006 — Next.js Application Shell Migration

**Feature Branch**: `006-nextjs-application-shell`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "Move the Vite-based BrowserTradingAgents application shell to a
Next.js App Router application shell while preserving, unchanged, the client-side execution
semantics and AkariSP lifecycle guarantees proven in Features 001–005. No new TradingAgents
functionality."

## Purpose

Core question: **Can BrowserTradingAgents run through a Next.js App Router application shell
while LangGraph → `AkariChatModel` → AkariSP → browser model keeps executing in the browser and
behaves equivalently to the validated Vite application?**

This is a framework migration without an execution-semantic migration. Success means the existing
canonical guarantees are proven again under the new shell. A starting dev server is not success.
The shell choice is a prior maintainer decision (ADR 0001); this Feature does not revisit it.

## Baseline

Verified at specification time (2026-09-29):

| Item | Value |
|---|---|
| `origin/main` | `c64021e` — merge of PR #6 (Feature 005 + ADR 0001 + constitution 1.1.0) |
| Feature branch | `006-nextjs-application-shell`, created from `origin/main` @ `c64021e` |
| Constitution | 1.1.0 (adds XIII Inference Tiers) |
| Feature 005 | IMPLEMENTATION_COMPLETE; authenticated provider validation DEFERRED; native + fixture PASS at `0543a69` |
| Canonical app | root `index.html` → `src/main.ts`: **vanilla TypeScript, no UI framework**, Vite 8 |
| Feature 002 harness | `harness/index.html` → `harness/main.ts` at `/harness/`, a separate page (T002-protected in Feature 005) |
| Vite coupling | build-time injection of revision (`+dirty` over the code paths) and dependency versions into both pages; top-level `await` in both pages; `.ts`-extension imports; the stand-in loaded on demand by the canonical page; Playwright starts Vite as its web server |
| Tests | `npm test` 62 (61 pass, 1 intended skip); `npm run test:browser` 28; installed-Chrome native runner (`test:prompt-api`) |
| Dependencies | `akarisp@0.1.0-alpha.2`, `@langchain/core@1.2.13`, `@langchain/langgraph@1.4.18`; no React |

Because the current app has no UI framework, this migration also introduces the UI runtime that
Next.js requires. Behaviour preservation is therefore the primary success criterion, not build
success.

## Ownership (unchanged by this Feature)

| Side | Owns |
|---|---|
| Browser (client) | LangGraph.js graph execution, the eight roles, `AkariChatModel`, AkariSP runtime and lifecycle, Prompt API availability and invocation, the stand-in, cancellation, settlement, evidence collection, Feature 005 acquisition/normalization as implemented |
| Server (Next.js) | page delivery only in this Feature. Future Features may add data acquisition, server-only secrets, an explicit cloud-inference tier (constitution XIII) and server-only tools |

The server never executes the graph, roles, AkariSP, the Prompt API or role execution state.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run the canonical app through Next.js (Priority: P1)

As a developer, I start the application through the Next.js shell, choose the stand-in provider
and fixture data, and run the eight-role graph in my browser with the same statuses, result and
evidence record as the Vite app.

**Why this priority**: it is the Feature's core claim; every other story is a property of this
run.

**Independent Test**: a stand-in + fixture run in the Next.js app produces an evidence record
equivalent to the Vite baseline.

**Acceptance Scenarios**:

1. **Given** the Next.js app with the stand-in provider and fixture data, **When** the user runs the
   graph, **Then** all eight roles complete in the Feature 004 order, the final decision is shown,
   and the record reports 8 logical and 0 fallback requests.
2. **Given** that run, **When** the evidence record is compared with the Vite baseline, **Then**
   every field present in the baseline is present with the same meaning. Revision, timing and dates
   may differ.
3. **Given** the page is rendered, **When** server-side rendering or the production build runs,
   **Then** no browser-only API (Prompt API, AkariSP runtime, graph) is evaluated outside the
   browser.

---

### User Story 2 - Native Prompt API through Next.js (Priority: P1)

As the maintainer, I run the canonical native + fixture graph in installed Google Chrome against a
clean Next.js revision and get a complete, clean evidence record.

**Why this priority**: browser-local inference is the project's purpose. A shell that breaks it is
not a replacement.

**Independent Test**: the installed-Chrome native runner, pointed at the Next.js app, completes the
fixture graph at a clean revision.

**Acceptance Scenarios**:

1. **Given** installed Chrome with the model available and a clean revision, **When** the native
   fixture run executes, **Then** the record reports provider native, data mode fixture, 8/8 roles
   done, 8 logical and 0 fallback requests, settlement before shutdown, and a revision without the
   dirty marker.
2. **Given** a browser without the model, **When** the native provider is selected, **Then** the
   run is reported as blocked before any work, exactly as before.

---

### User Story 3 - Lifecycle and cancellation guarantees survive (Priority: P1)

As the maintainer, I can rely on the same cancellation, failure and cleanup behaviour under
Next.js: the caller's rejection is distinct from AkariSP settlement, and settlement is observed on a
ready runtime before shutdown.

**Why this priority**: this is the most important regression invariant of Features 003–005.

**Independent Test**: the existing cancel, failure, runtime-creation-failure and consecutive-run
checks pass against the Next.js app.

**Acceptance Scenarios**:

1. **Given** a run cancelled during the analysts, **When** the record is read, **Then** the outcome
   is cancelled, no later role ran, and before shutdown the runtime was ready with 0 active and 0
   queued. Only after that was it closed.
2. **Given** a runtime-creation failure, **When** the user runs, **Then** a failed record is shown
   and Run is usable again.
3. **Given** two consecutive runs, **When** the second record is read, **Then** it reflects only its
   own run: a new runtime and model, 8 logical requests.
4. **Given** a cancel, **When** the graph's abort reaches the model calls, **Then** it does so through
   explicit signal forwarding, as proven in Feature 003.

---

### User Story 4 - Feature 005 data axis survives (Priority: P2)

As the maintainer, the fixture/live data axis, independent of the provider axis, behaves exactly as
in Feature 005 under controlled responses.

**Why this priority**: Feature 005's evidence must remain reproducible even though its provider is
not canonical.

**Independent Test**: the Feature 005 controlled-browser matrix passes against the Next.js app with
no real credential.

**Acceptance Scenarios**:

1. **Given** stand-in + live with a controlled market response, **When** the user runs, **Then**
   the Feature 005 success record is produced: provenance, digests, redacted result, replay
   artifact, 8/0 requests.
2. **Given** each Feature 005 acquisition failure kind or a cancel during acquisition, **When** the
   user runs, **Then** it ends as the same market-data failure, with no runtime created and no
   fixture fallback.
3. **Given** the four provider × data combinations, **When** each is selected, **Then** each is
   reported correctly, and neither axis implies the other.
4. **Given** the dummy test credential, **When** leakage is checked, **Then** it appears nowhere but
   the outgoing request header, exactly as in Feature 005.

---

### User Story 5 - Harness, provenance and history (Priority: P2)

As the maintainer, the Feature 002 harness guarantees still hold, the evidence identifies its
source revision truthfully (clean vs dirty), and no historical Feature 001–005 file changes.

**Why this priority**: reproducibility (constitution VII) depends on trustworthy revision identity
and untouched history.

**Independent Test**: the harness checks pass, and a deliberately dirty and a clean build each report
the right revision form. Historical hashes match.

**Acceptance Scenarios**:

1. **Given** the harness, **When** its stand-in and native-unavailable checks run, **Then** they
   report the same scenario outcomes as before.
2. **Given** an uncommitted change in the application's code paths, **When** the app is served,
   **Then** the recorded revision carries the dirty marker. On a clean checkout it does not.
3. **Given** the Feature 005 protected hash list, **When** it is re-checked after migration,
   **Then** all historical specs and evidence are identical.

---

### User Story 6 - Standard Next.js development flow and Vite retirement (Priority: P3)

As a developer, I install, develop, build and start the app with the standard Next.js flow. The
old Vite canonical path is retired only after the Next.js path has proven every guarantee above.

**Why this priority**: it completes the migration but depends on Stories 1–5.

**Independent Test**: a fresh install runs the development, build and start flows and all test
suites. The retirement check confirms the proofs precede the removal.

**Acceptance Scenarios**:

1. **Given** a fresh clone, **When** the documented install, development, production-build and start
   commands run, **Then** each succeeds without any secret or external domain API.
2. **Given** the Next.js path has not yet passed Stories 1–5, **When** retirement is considered,
   **Then** the Vite canonical path stays.
3. **Given** the Next.js path passed Stories 1–5, **When** the Vite canonical path is retired,
   **Then** exactly one canonical application remains.

---

### Edge Cases

- Browser-only globals (Prompt API, AkariSP) referenced during server rendering or the production
  build must not be evaluated there. A render that touches them is a defect.
- The native Prompt API is unavailable or still downloading: the run is blocked before any work;
  the stand-in is never substituted.
- Top-level asynchronous initialization (availability check, stand-in installation) must finish
  before Run is usable. The Feature 003 click-before-ready guarantee (Run disabled until ready)
  must hold.
- A page reload or navigation during a run must not leave a runtime alive across page loads.
- The development server and the production server may differ in behaviour. Both are exercised.
- Revision identity when the working tree changes after the server started. Feature 004 policy:
  the server is started fresh per test run, and a reused server is never trusted.

## Requirements *(mandatory)*

### Functional Requirements

**Migration and ownership**

- **FR-001**: The canonical application MUST be served by a Next.js App Router application shell.
- **FR-002**: Graph execution, the eight roles, `AkariChatModel`, AkariSP runtime creation and
  shutdown, Prompt API availability and invocation, the stand-in, cancellation and evidence
  collection MUST execute in the browser. None of them may execute on the server.
- **FR-003**: Browser-only APIs MUST NOT be evaluated during server rendering or the production
  build.
- **FR-004**: The eight-role topology, role contracts and prompt construction (`src/graph/*`),
  `AkariChatModel` (`src/integration/*`) and AkariSP MUST NOT change. AkariSP source, public API and
  dependency changes = 0.

**Behaviour equivalence**

- **FR-005**: Stand-in + fixture MUST complete the eight-role graph with 8 logical and 0 fallback
  requests and the Feature 004 role order, as in the Vite app.
- **FR-006**: Native + fixture MUST complete in installed Google Chrome with the model available,
  with 8/8 roles, 8/0 requests and settlement before shutdown. It MUST NOT be substituted by the
  stand-in.
- **FR-007**: With the native provider and no available model, the run MUST be reported as blocked
  before any work.
- **FR-008**: Explicit abort-signal forwarding to every model call MUST be preserved.
- **FR-009**: After cancellation or failure, the caller's outcome and AkariSP settlement MUST be
  recorded separately. Settlement MUST be observed as ready, 0 active, 0 queued **before** shutdown.
  A closed runtime after shutdown is never cleanup proof.
- **FR-010**: Each run MUST own a new runtime, model and abort controller. Runtime-creation failure
  and consecutive runs MUST behave as in Feature 004.
- **FR-011**: The provider axis (native/stand-in) and the data axis (fixture/live) MUST stay
  independently selectable, with Feature 005 semantics unchanged: acquisition before runtime, no
  fixture fallback, failure taxonomy, result redaction, replay artifact, and a credential only in
  the outgoing request.
- **FR-012**: The observable controls, statuses, result and evidence surfaces that the browser tests
  rely on MUST keep their meaning. Markup and styling may change only as the migration requires.
  There is no UI redesign.

**Evidence and provenance**

- **FR-013**: Evidence MUST keep reporting revision identity, provider, data mode, graph identity,
  logical and fallback requests, per-role status, runtime lifecycle and outcome, with the Feature
  004/005 meaning.
- **FR-014**: The recorded revision MUST be the source revision at serve/build time. It MUST carry
  the dirty marker when the application's code paths differ from that revision, and MUST NOT carry
  it on a clean checkout. The code-path set MUST be updated to the new shell's files.
- **FR-015**: Feature 001–005 historical specs, evidence and verification records MUST NOT be
  rewritten or converted. Feature 006 creates its own evidence.

**Harness and tests**

- **FR-016**: The Feature 002 harness guarantees MUST remain verifiable: its stand-in scenario
  outcomes and its native-unavailable behaviour. Whether its protected files are served as they are
  or re-hosted is a plan decision. Changing a protected file requires a recorded, deliberate
  decision; it never happens silently.
- **FR-017**: Every guarantee proven by the current browser suites MUST be proven again against the
  Next.js app: full success, native unavailable, cancellation, runtime-creation failure, consecutive
  runs, Feature 005 controlled live path, acquisition failures, graph-stage cancellation,
  credential/security checks, harness. Test files may change; the guarantees may not disappear.
- **FR-018**: The deterministic and Node integration suites MUST keep passing unchanged in meaning.

**Build, server boundary and retirement**

- **FR-019**: The project MUST support the standard Next.js flow: fresh install, development,
  production build, production start. Browser tests and the installed-Chrome native runner MUST
  work against it.
- **FR-020**: The build MUST NOT depend on a custom server that would prevent a later standard
  serverless deployment.
- **FR-021**: The shell MAY include one trivial server route or health probe to show that a server
  boundary exists. It MUST carry no domain semantics (no market, news, fundamentals or inference
  endpoint).
- **FR-022**: Canonical execution MUST need no secret or credential of any kind.
- **FR-023**: The Vite canonical path MUST be retired only after the Next.js path has passed
  FR-005–FR-011, FR-013, FR-014, FR-016–FR-018 and the native gate. After retirement exactly one
  canonical application remains. A test-only static surface may remain if the plan justifies it.

**Process and scope**

- **FR-024**: A behaviour break found during migration (browser globals, the LangGraph web entry,
  abort signals, browser imports, revision injection, the Playwright server, the native runner, the
  harness) MUST first be written up as a finding (project format: reproduction, cause, candidate
  resolution) before any workaround.
- **FR-025**: The Feature MUST NOT add a generic framework, runtime, deployment or environment
  abstraction, or a provider registry. Only the integration boundary the shell needs is added.

### Explicit Non-Goals

- The upstream TradingAgents data contract; new market-data providers; real Massive validation;
  Yahoo or Alpha Vantage integration; live news, fundamentals or technical indicators; production
  `/api/market`, `/api/news` or `/api/fundamentals`.
- LLM tool calling; WebLLM; Agent Town; the Vercel AI SDK or AI Gateway; cloud inference;
  inference-tier routing.
- Agent topology changes, new roles, prompt-fidelity redesign; AkariSP changes; a generic provider
  abstraction; UI redesign.
- Trading-quality evaluation; performance claims (the Feature is not faster, cheaper or better at
  analysis).
- A mandatory cloud deployment. Whether a Vercel deployment check is included is a plan decision.

### Feature 007 Boundary

`007-upstream-server-data-boundary` is the next candidate. It first studies the TauricResearch/
TradingAgents data/tool contract at a pinned upstream SHA. Only then does it decide the
`/api/market` contract, provider selection (Yahoo-equivalent, Alpha Vantage, others), technical
indicators, permitted-use constraints and server normalization. Feature 006 brings none of this
forward.

### Key Entities

- **Application shell**: the framework that serves the canonical page and, later, server
  boundaries.
- **Client execution boundary**: the part of the application that runs only in the browser (graph,
  model bridge, AkariSP, providers).
- **Evidence record**: the Feature 004/005 per-run record, unchanged in meaning.
- **Revision identity**: the source revision plus the dirty marker, computed over the new shell's
  code paths.
- **Harness**: the Feature 002 verification page and its guarantees.
- **Migration baseline**: the Vite-shell results that the Next.js results are compared with.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The development app and the production build both serve the canonical page. The
  production build completes with 0 errors.
- **SC-002**: A stand-in + fixture run completes 8/8 roles in the Feature 004 order, with 8 logical
  and 0 fallback requests.
- **SC-003**: In installed Google Chrome with the model available, at a clean revision, a native +
  fixture run completes 8/8 roles with 8/0 requests, settlement before shutdown, no dirty marker,
  and 0 stand-in substitutions.
- **SC-004**: Browser-only APIs evaluated during server rendering or the build: 0. Graph, AkariSP or
  Prompt API executions on the server: 0.
- **SC-005**: Every cancellation and failure scenario records the caller outcome and pre-shutdown
  settlement (ready, 0, 0) separately. Runs where cleanup is inferred only from a closed runtime:
  0.
- **SC-006**: 100% of guarantees proven by the pre-migration browser suites are proven again
  against the Next.js app (the guarantee list in FR-017). Guarantees dropped: 0.
- **SC-007**: The deterministic and Node integration suites pass with the same test count and
  meaning as the baseline.
- **SC-008**: The Feature 005 controlled matrix passes: success, every acquisition failure kind,
  both cancel stages, four mode combinations. Credential leaks found: 0.
- **SC-009**: Harness scenario outcomes equal the baseline in stand-in mode and native-unavailable
  mode.
- **SC-010**: A clean checkout records a revision without the dirty marker, and a checkout with a
  code-path change records it. Both cases are shown.
- **SC-011**: Feature 001–005 historical files changed: 0 (hash comparison).
- **SC-012**: AkariSP source, public API and dependency changes: 0. Changes to `src/graph/*` and
  `src/integration/*` semantics: 0.
- **SC-013**: Secrets or credentials needed for canonical execution: 0. Domain server endpoints
  added: 0.
- **SC-014**: After retirement, canonical applications in the repository: 1. The retirement happens
  only after SC-002–SC-011 pass.
- **SC-015**: A fresh install runs the development, build, start, browser-test and native-runner
  flows as documented.

### Completion Model

- **Implementation complete**: SC-001, SC-002 and SC-004–SC-015 pass.
- **Feature complete**: additionally SC-003 passes with `REAL_BROWSER_PROMPT_API` at a clean Next.js
  revision. If the native model is unavailable, the Feature is BLOCKED / INCOMPLETE. The stand-in
  never substitutes.

## Constitution Alignment

| Principle | How this Feature complies | Visible tension |
|---|---|---|
| I. Dogfood Before Abstraction | adds only the shell integration the page needs; no generic layers (FR-025) | introducing a UI runtime the vanilla app did not need; justified by ADR 0001 |
| II. Deterministic Fixtures First | fixture + stand-in remains the regression oracle | — |
| III. Application Owns Orchestration | graph, roles and routing stay in application code, client-executed | — |
| IV. AkariSP Owns Inference Lifecycle | AkariSP unchanged; lifecycle proofs repeated (FR-009) | — |
| V. Evidence Before Core Change | AkariSP changes 0; findings first (FR-024) | — |
| VI. Browser First | inference and orchestration stay in the browser (FR-002, SC-004); native gate required (SC-003) | a server now exists; it serves pages only in this Feature |
| VII. Reproducible Agent Runs | revision identity with the dirty marker preserved (FR-014, SC-010); baseline comparison | the code-path set changes with the shell |
| VIII. No Trading-Quality Claims | no quality or performance claims | — |
| IX. External Data Deferred | no new data source | — |
| X. Thin Integration Boundaries | `AkariChatModel` unchanged | — |
| XI. Preserve Reference Semantics | topology and role contracts unchanged (FR-004) | — |
| XII. Findings Before Fixes | FR-024 | — |
| XIII. Inference Tiers | local tier only; no remote tier, no routing | — |

## Assumptions

- The Feature 004/005 guarantees are verified today by `npm test`, `npm run test:browser` and the
  installed-Chrome runner; these define the migration baseline.
- The Next.js App Router's client/server split can host the existing browser modules without
  changing them. If it cannot, that is a finding (FR-024), not a silent rewrite.
- The UI runtime required by Next.js is used only to host the existing page behaviour. Its choice
  and structure, and whether the harness is served as-is or re-hosted, are plan decisions.
- A deployed cloud check is not required for completion. The plan decides whether to include one.
