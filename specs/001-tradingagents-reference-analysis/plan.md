# Implementation Plan: Feature 001 — Original TradingAgents Reference Analysis

**Branch**: `001-tradingagents-reference-analysis` (feature identifier; no git branch created) |
**Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-tradingagents-reference-analysis/spec.md`

**Plan type**: Source-research execution plan. This Feature is research-only; nothing in this plan
is an application implementation step.

## Summary

Produce a reproducible, `STATIC_CODE_ANALYSIS`-only reference analysis of
TauricResearch/TradingAgents v0.5.1 at a frozen commit, answering: *which upstream graph semantics
are required for the minimum BrowserTradingAgents workload?* Approach: fetch the frozen commit into
a scratch checkout outside this repository, trace sources in dependency order
(topology → state → nodes → orchestration), record every conclusion as a cited Evidence Claim in a
single artifact `research.md`, then classify concepts (PRESERVE / SIMPLIFY / EXCLUDE) and propose a
minimum browser graph without implementing it.

## Frozen References

```text
TradingAgents (analysis target)
  repository: TauricResearch/TradingAgents
  branch:     main
  commit:     35543d0248bf89fcb92b17a15858ad0c0e940687
  version:    0.5.1

AkariSP dogfood baseline (recorded only)
  repository: drow724/akariSP
  branch:     main
  commit:     7e8202e6ab91af386abc9e2416d9cb07fdfacecf
  package:    akarisp@0.1.0-alpha.2

BrowserTradingAgents
  repository: drow724/BrowserTradingAgents
  branch:     main
  HEAD:       UNAVAILABLE — checked 2026-09-28 at plan time: `git rev-parse HEAD` fails,
              repository has no commits yet. Must be re-checked and recorded at analysis
              completion (see Gate V-10).
```

No code from any other upstream revision may enter the analysis.

## Technical Context

**Language/Version**: N/A for BrowserTradingAgents (no code produced). Analysis subject is Python
source of TradingAgents v0.5.1.

**Primary Dependencies**: None added. Tools used for reading only: `git` (fetch pinned commit),
`grep`/text viewer. No LangChain.js, LangGraph.js, or AkariSP installation.

**Storage**: Markdown files in the feature directory.

**Testing**: No application tests (research-only Feature). Replaced by research verification
gates V-01…V-12 below.

**Target Platform**: N/A (documentation artifact).

**Project Type**: Research / reference analysis.

**Performance Goals**: N/A.

**Constraints**: Evidence class `STATIC_CODE_ANALYSIS` only; frozen SHA only; no upstream code
copied verbatim into the repository beyond short identifiers/snippets needed for citation
(Principle XI).

**Scale/Scope**: ~20 upstream source files listed in the spec plus directly referenced
helpers (`agents/tools.py` or equivalent, `default_config.py`).

No NEEDS CLARIFICATION items remain in Technical Context.

## Constitution Check

*GATE: Must pass before research. Re-checked after design below.*

| Principle | Check | Result |
|---|---|---|
| I. Dogfood Before Abstraction | No generator scripts, AST parsers, visualizers, or doc frameworks; manual reading + Markdown tables only | PASS |
| II. Deterministic Fixtures First | No fixtures or data integrations introduced | PASS (N/A) |
| III. Application Owns Orchestration | Every upstream concept is attributed to the application side in classification | PASS |
| IV. AkariSP Owns Inference Lifecycle | AkariSP is recorded as baseline only; no responsibility assigned to it beyond inference lifecycle | PASS |
| V. Evidence Before Core Change | AkariSP source / public API / runtime dependency changes expected: 0 / 0 / 0 | PASS |
| VI. Browser First | Evidence limited to `STATIC_CODE_ANALYSIS`; no browser/runtime claims | PASS |
| VII. Reproducible Agent Runs | Upstream pinned by SHA; AkariSP pinned by SHA + npm version; BTA HEAD recorded as UNAVAILABLE, re-checked at completion | PASS with noted gap |
| VIII. No Trading-Quality Claims | No accuracy/PnL/Sharpe/backtest evaluation | PASS |
| IX. External Data Deferred | Upstream data vendors analyzed only as "external dependencies"; nothing integrated | PASS |
| X. Thin Integration Boundaries | Feature 002 appears as recommendation only | PASS |
| XI. Preserve Reference Semantics Explicitly | SOURCE FACT / DESIGN INFERENCE / STATUS labeling mandatory; three-term parallelism vocabulary | PASS |
| XII. Findings Before Fixes | F001-001 kept as candidate until source-verified; new deviations become findings | PASS |
| Verification Rules (typecheck/build/tests) | Apply to implementation Features; this Feature is research-only and uses V-01…V-12 instead | PASS (not applicable) |

Expected changes: **AkariSP production changes = 0; BrowserTradingAgents application
implementation = 0.**

## Research Artifact

**Decision**: single artifact `specs/001-tradingagents-reference-analysis/research.md`.

- Spec Kit's canonical Phase 0 output is `research.md`; this plan uses that path for the actual
  source analysis result.
- Spec Kit's usual Phase 0 content (decision/rationale/alternatives for technical unknowns) is not
  needed: there are no technical unknowns. Plan-level decisions are recorded in this `plan.md`
  under "Planning Decisions".
- `research.md` is **not written in this planning step**. It is produced during execution.

### Required `research.md` Structure

1. **Reference Baseline** — TradingAgents repo/branch/SHA/version, analysis date, AkariSP
   baseline, BrowserTradingAgents revision (or UNAVAILABLE), evidence class, source-path
   validation table.
2. **Original Graph Topology** — source-derived diagram + edge table (from → to, kind:
   static/conditional, condition, citation). Every edge and conditional transition cited.
3. **Graph State** — AgentState, InvestDebateState, RiskDebateState, messages, reports, plans,
   final decision fields, run identity/context; per field: type, writers, readers, citation.
4. **Agent Analysis** — 12 Node Analysis Records (spec format, including both
   "Can run in parallel in upstream" and "Could be parallelized as BrowserTradingAgents
   adaptation"), plus ToolNode and message-clear node records.
5. **LLM Invocation Map** — table: node, LLM class (quick/deep), structured output?, fallback
   path, tool-bound?, repeatable (tool loop re-entry)?, citation.
6. **Tool/Data Invocation Map** — ToolNode paths, analyst tool loops, Sentiment pre-fetch,
   external dependencies (named at interface level only).
7. **Bull/Bear Debate Mechanics** — starting node, alternating logic, state dependencies
   (previous opponent response), counter, termination.
8. **Risk Debate Mechanics** — speaker ordering, state dependencies, counter, termination.
9. **Upstream Parallelism Analysis** — verdict per stage: sequential / parallel / mixed, using the
   three-term vocabulary.
10. **BrowserTradingAgents Classification** — PRESERVE / SIMPLIFY / EXCLUDE table with reasons.
11. **Intentional Adaptations** — adaptation candidates, each with SOURCE FACT / DESIGN INFERENCE
    / STATUS.
12. **Minimum Browser Graph** — proposal only (roles, state transitions, adaptation labels).
13. **Findings** — spec Finding format; F001-001 verdict.
14. **Feature 001 Final Deliverable** — spec template, fully filled.

## Evidence Strategy

- **Evidence class**: `STATIC_CODE_ANALYSIS` only.
- **Not evidence**: README diagrams alone, blogs, paper figures, other commits/HEAD of `main`,
  execution results, local runtime behavior, browser behavior, model inference, speculation.
  README/docs MAY be cited as secondary evidence; on conflict, frozen source wins and the conflict
  is recorded.
- **Claim record** (every significant claim):

  ```text
  Claim:
  Evidence class: STATIC_CODE_ANALYSIS
  Source path:
  Function / class / symbol:
  Location: <path>#L<start>-L<end> at 35543d02
  Observed behavior:
  Implication:
  ```

- **Citation form**: `path:Lstart-Lend` at the frozen SHA; permalink form
  `https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/<path>#L<n>`.
- **Fact vs. inference**: every non-trivial statement about BrowserTradingAgents carries
  `SOURCE FACT` / `DESIGN INFERENCE` / `STATUS`.
- **Copying**: short snippets only when needed to support a claim; no verbatim module copies.

## Source Acquisition & Path Verification

1. Fetch the frozen commit into a scratch directory **outside this repository** (not committed,
   not vendored): init empty repo → fetch `35543d0248bf89fcb92b17a15858ad0c0e940687` → checkout
   detached.
2. Verify `git rev-parse HEAD` equals the frozen SHA; verify version string `0.5.1` from the
   package metadata at that SHA. Mismatch → stop, record BLOCKED.
3. For every path listed in the spec, check existence in the frozen tree. Record a validation table
   (path, exists YES/NO, equivalent path if any, evidence).
4. Missing path handling:
   - never substitute a file from `main` or another revision;
   - never silently substitute a similarly named file;
   - search the frozen tree (by symbol/function name) for a real equivalent;
   - clear equivalent → record mapping with evidence;
   - otherwise → create a finding.
   This applies explicitly to `tradingagents/graph/analyst_execution.py`, `agents/context.py`,
   `agents/structured.py`, and `agents/tools.py`.

## Source Traversal Strategy

Default order is topology → state → nodes → orchestration. Order may deviate when a dependency
requires it; deviations need no justification beyond the dependency.

| Phase | Sources | Output into `research.md` |
|---|---|---|
| A — Graph skeleton | `graph/setup.py`, `graph/conditional_logic.py`, `graph/analyst_execution.py` | Node list, edge table, conditional routes, draft topology |
| B — State model | `agents/state.py`, `graph/propagation.py` | Graph State section; initial state fields; recursion/limit config |
| C — Analyst nodes | market / sentiment / news / fundamentals analysts | 4 Node Analysis Records; tool loop vs. pre-fetch |
| D — Research debate | bull / bear researchers, research manager | 3 records; Bull/Bear mechanics |
| E — Trader | trader | 1 record; Research Manager → Trader handoff |
| F — Risk debate | aggressive / conservative / neutral debators, portfolio manager | 4 records; Risk mechanics |
| G — Invocation helpers | `agents/context.py`, `agents/structured.py`, `agents/tools.py`, `default_config.py` (as needed) | LLM & Tool/Data Invocation Maps; structured output + fallback; defaults |
| H — Graph integration | `graph/trading_graph.py` | LLM class assignment (quick/deep), compile/invoke, initial/final state flow |
| I — Synthesis | all of the above | Parallelism verdict, classification, adaptations, minimum graph, findings, final deliverable |

## Analysis Approaches

**Graph topology**: enumerate every `add_node`, `add_edge`, `add_conditional_edges`, START/END
reference in the frozen graph setup. Build the edge table first, then draw the diagram from the
table (never the reverse). Resolve conditional edges by reading the routing function body and its
return-value → node mapping.

**State**: from the state type definitions, list every field; then for each node record which
fields it reads and which keys its return dict writes. Note reducers/merge semantics if declared.

**Per-agent**: fill the spec's Node Analysis Record for each of the 12 roles. "Can run in parallel
in upstream" is answered only from the edge table; "Could be parallelized as adaptation" only from
read/write dependencies, labeled as DESIGN INFERENCE.

**LLM/tool invocation**: from the graph class, determine which LLM instance (quick/deep) each node
factory receives; inside each node, locate model invocation, tool binding, structured-output
invocation and its fallback path. Tool loops identified by conditional edges routing to ToolNode
and back.

**Debate/risk**: trace the routing functions and the state updates of each speaker: initial speaker,
the field that carries the previous opponent response, counter increments, and the termination
expression relative to configured max rounds and its default.

## Parallelism Vocabulary & Classification Rule

Three terms, never merged:

- **Executes in parallel upstream** — concurrent branches exist in the frozen LangGraph topology
  (fan-out edges from one node to several nodes). Determined only from the edge table.
- **Could theoretically be independent** — no read/write dependency between stages. DESIGN
  INFERENCE only.
- **Proposed BrowserTradingAgents adaptation** — an intentional future deviation. STATUS:
  "adaptation, not upstream v0.5.1 behavior".

If Bull/Bear previous-opponent-response dependency is confirmed, Bull/Bear parallelization MUST
NOT be described as original semantics or as a valid adaptation that preserves semantics.

Classification: each major upstream concept gets exactly one of PRESERVE / SIMPLIFY / EXCLUDE and
a reason citing the analysis section it rests on. Spec candidates are inputs, not conclusions.

## Finding Handling

- F001-001 stays a **candidate** until Phase A and the edge table are complete. Verdict inputs:
  (1) frozen graph setup, (2) analyst execution logic, (3) registered edges, (4) conditional edges.
  - Source proves sequential → confirm F001-001.
  - Source contradicts → rewrite F001-001 to match source.
- Any other deviation (missing path, doc/source conflict, unexpected topology) → new finding
  `F001-NNN` in spec format. `Core change required? = YES` is not permitted without evidence; for
  this Feature AkariSP contract involvement is expected to be none.
- Findings are recorded, not fixed.

## Verification Gates

Research correctness gates replace typecheck/build/tests for this research-only Feature:

| Gate | Check |
|---|---|
| V-01 | Scratch checkout HEAD == `35543d0248bf89fcb92b17a15858ad0c0e940687`; version 0.5.1 confirmed |
| V-02 | Source-path validation table complete; every missing path has mapping or finding |
| V-03 | 12/12 Node Analysis Records complete (no empty fields) |
| V-04 | Every edge in the topology diagram appears in the edge table with a citation (0 uncited) |
| V-05 | Every conditional route lists its routing function, condition, targets, citation |
| V-06 | Every Evidence Claim has path + symbol + location |
| V-07 | Every PRESERVE / SIMPLIFY / EXCLUDE entry has a reason |
| V-08 | Every adaptation carries SOURCE FACT / DESIGN INFERENCE / STATUS; 0 unlabeled deviations in the minimum graph |
| V-09 | All 17 spec success questions answered with citations; Final Deliverable fully filled |
| V-10 | BrowserTradingAgents HEAD re-checked and recorded (SHA or UNAVAILABLE) |
| V-11 | AkariSP changes = 0 (no AkariSP repo touched; no AkariSP dependency added) |
| V-12 | Application implementation = 0: relative to the baseline commit (excluding pre-existing untracked scaffold), `git status` shows changes only under `specs/001-tradingagents-reference-analysis/` (and `.specify/feature.json`) |

## Planning Decisions

- **Single artifact** — Decision: all analysis in `research.md`. Rationale: one reviewable
  document; the spec's sections map 1:1. Alternatives rejected: separate topology/state/agents
  docs (more files, cross-reference drift).
- **No `data-model.md`** — Decision: skip. Rationale: no application data model; the spec's Key
  Entities already define the research record types. Alternative rejected: duplicating entities.
- **No `contracts/`** — Decision: skip. Rationale: research Feature exposes no interface.
- **No `quickstart.md`** — Decision: skip; the verification guide is the V-01…V-12 table above.
  Alternative rejected: a separate file duplicating the gates.
- **Scratch checkout outside repo** — Decision: fetch pinned SHA into a temp directory. Rationale:
  reproducible, avoids vendoring upstream code (Principle XI). Alternatives rejected: git
  submodule (adds repo state), reading GitHub web UI only (hard to verify SHA consistency).
- **No research tooling** — manual reading + Markdown tables (Principle I applied to research).

## Project Structure

### Documentation (this feature)

```text
specs/001-tradingagents-reference-analysis/
├── spec.md                  # exists
├── plan.md                  # this file
├── checklists/
│   └── requirements.md      # exists
├── research.md              # produced during execution (NOT in this planning step)
└── tasks.md                 # /speckit-tasks (NOT created here)
```

### Source Code (repository root)

None. This Feature creates no source directories (`src/`, `tests/`, etc.).

**Structure Decision**: documentation-only Feature; all outputs live in the feature directory.

### Expected Modified Files (whole Feature)

- `specs/001-tradingagents-reference-analysis/plan.md` (this step)
- `specs/001-tradingagents-reference-analysis/research.md` (execution)
- `specs/001-tradingagents-reference-analysis/tasks.md` (`/speckit-tasks`)
- Possibly `specs/001-tradingagents-reference-analysis/spec.md` (only if findings require
  correcting spec statements; recorded as such)

## Explicit Non-Goals

Not planned in any phase: LangChain.js integration; LangGraph.js implementation; AkariSP bridge;
AkariChatModel; BrowserTradingAgents runtime; Chrome Prompt API integration; WebLLM integration;
deterministic fixture runtime; browser UI; external market APIs; trading execution; backtesting;
analysis generator scripts; AST parsers; graph visualizers; documentation frameworks; automated
architecture extraction. No "implement/create/install/integrate/build" work items.

## Post-Design Constitution Re-Check

Re-checked after defining artifacts and gates: no new files beyond `research.md`/`tasks.md`, no
tooling, no dependencies, evidence class unchanged. All gates remain PASS; VII gap
(BrowserTradingAgents HEAD UNAVAILABLE) is tracked by V-10.

## Complexity Tracking

No constitution violations. Table intentionally empty.
