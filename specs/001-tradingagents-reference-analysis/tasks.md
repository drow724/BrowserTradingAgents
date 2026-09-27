# Tasks: Feature 001 — Original TradingAgents Reference Analysis

**Input**: [spec.md](spec.md), [plan.md](plan.md), Constitution v1.0.0
(`.specify/memory/constitution.md`)

**Feature type**: `STATIC_CODE_ANALYSIS` research Feature. Every task is inspect / verify / trace /
map / classify / document / cross-check / validate. There are **no implementation tasks** and **no
application tests** (no unit/integration/browser tests, typecheck, or build). Research correctness
is enforced by the verification gates V-01…V-12 from plan.md (Phase 12).

**Frozen reference (only source allowed)**: TauricResearch/TradingAgents `main` @
`35543d0248bf89fcb92b17a15858ad0c0e940687` (v0.5.1).
**AkariSP baseline (recorded only)**: drow724/akariSP `main` @
`7e8202e6ab91af386abc9e2416d9cb07fdfacecf`, `akarisp@0.1.0-alpha.2`.

## Conventions

- `RD` = `specs/001-tradingagents-reference-analysis/research.md` — the single canonical research
  artifact. `RD §N` refers to section N of the research.md structure defined in plan.md
  (§1 Reference Baseline … §14 Final Deliverable).
- `UP` = scratch checkout of the frozen SHA **outside this repository**
  (e.g. `$TMPDIR/tradingagents-35543d0`). Nothing from `UP` is copied into this repository except
  short citation snippets.
- Every claim written to RD uses: Claim / Evidence class (`STATIC_CODE_ANALYSIS`) / source path /
  line range / frozen-SHA permalink
  (`https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/<path>#L<a>-L<b>`)
  / observed behavior / implication.
- Every BrowserTradingAgents-facing statement uses SOURCE FACT / DESIGN INFERENCE / STATUS.
- Node Analysis Records use the spec format, including the separate field
  "Could be parallelized as BrowserTradingAgents adaptation".
- **Classification fields are deferred**: in Phases 4–9, the record fields "Could be parallelized
  as BrowserTradingAgents adaptation", "Required for browser dogfood", and "Reason", and the RD §3
  column "Required for minimum browser graph", MUST be written as `TBD (Phase 10)`. They are
  decided only in T043, after all source observation is complete.
- If a listed file does not exist in `UP`, use the mapping recorded in T004/T005; never a file from
  another revision.
- **`[P]` meaning**: the *research tasks* can be performed concurrently (distinct sources, distinct
  RD subsections, no dependency on each other). It says **nothing** about whether upstream
  TradingAgents agents run in parallel at runtime. `[P]` covers only source inspection / evidence
  collection; writes into RD are serialized (one writer applies one task's section at a time).
- Story labels map to spec.md user stories: US1 topology, US2 per-node semantics & debate
  mechanics, US3 classification & minimum graph, US4 final report.

---

## Phase 1: Setup / Reproducibility Baseline

**Purpose**: Pin every reference before any source is read.

- [X] T001 Record BrowserTradingAgents baseline in RD §1 (`specs/001-tradingagents-reference-analysis/research.md`): run `git rev-parse HEAD` in this repository and record the SHA or `UNAVAILABLE` (no commits) as the execution baseline; record the pre-existing untracked paths from `git status --porcelain` (Spec Kit / tool scaffold) so T057 can exclude them; confirm constitution version `1.0.0` from `.specify/memory/constitution.md`; confirm active feature `specs/001-tradingagents-reference-analysis` from `.specify/feature.json`; record AkariSP baseline (repo, branch, commit, package) and evidence class `STATIC_CODE_ANALYSIS`. Create RD with the 14 section headings from plan.md (headings only).
- [X] T002 Acquire frozen source into `UP` outside this repository (empty `git init` → `git fetch --depth 1 https://github.com/TauricResearch/TradingAgents 35543d0248bf89fcb92b17a15858ad0c0e940687` → detached checkout of `FETCH_HEAD`); verify `git rev-parse HEAD` == `35543d0248bf89fcb92b17a15858ad0c0e940687`; record command and result in RD §1. On mismatch: stop and record BLOCKED.
- [X] T003 Verify project version `0.5.1` from package metadata in `UP` (e.g. `pyproject.toml` / `setup.py` / `__version__`) and record file + line citation in RD §1. On mismatch: stop and record a finding.
- [X] T004 Validate existence in `UP` of every source path listed in spec.md and plan.md (`tradingagents/graph/{setup,conditional_logic,analyst_execution,propagation,trading_graph}.py`, `tradingagents/agents/{state,context,structured,tools}.py`, `tradingagents/default_config.py`, the 4 analyst, 2 researcher, research manager, trader, 3 risk debator, and portfolio manager files); record a table in RD §1 with status `exact path present` / `mapped equivalent` / `not found`.
- [X] T005 For each path not present in T004, search `UP` by expected symbol (function/class name) for a real equivalent; record mapping with evidence in RD §1, or record a new finding `F001-NNN` in RD §13 (spec Finding format). No silent substitution.

**Checkpoint**: Frozen SHA and version verified; path table complete. No other phase starts before this.

---

## Phase 2: Graph Skeleton (US1, Priority P1)

**Goal**: Evidence-backed node inventory, edge inventory, conditional routes, and upstream parallelism verdict.

**Independent Test**: A reviewer opens each citation in RD §2/§9 at the frozen SHA and can redraw the graph from the edge table alone.

- [X] T006 [US1] Inventory every node registered in `tradingagents/graph/setup.py` (agent nodes, ToolNodes, message-clear nodes, any others) with node name, factory/function, and line range; write the node inventory in RD §2.
- [X] T007 [US1] Inspect `tradingagents/graph/analyst_execution.py` (or its T005 mapping) and trace how selected analysts are ordered/planned and consumed by graph setup; record ordering semantics with citations in RD §2.
- [X] T008 [US1] Record every direct edge (`add_edge`, `START`, `END`) from `tradingagents/graph/setup.py` in the RD §2 edge inventory using fields From / To / Type (`direct`) / Condition/router (none) / Source / Line range / Evidence class.
- [X] T009 [US1] Record every conditional edge (`add_conditional_edges`) from `tradingagents/graph/setup.py` with its routing function body in `tradingagents/graph/conditional_logic.py` and the full return-value → target mapping; type each as `conditional` or `tool-loop`; add to RD §2 edge inventory.
- [X] T010 [US1] Determine upstream analyst execution verdict — `SEQUENTIAL` / `PARALLEL` / `MIXED` / `UNRESOLVED` — using only T006–T009 evidence: START edge target(s), analyst plan ordering, edges leaving each message-clear node, presence/absence of fan-out and fan-in, conditional edge behavior; write verdict with citations in RD §9 using the three-term vocabulary (executes in parallel upstream / could theoretically be independent / proposed adaptation).
- [X] T011 [US1] Draw the Original Graph Topology diagram in RD §2 strictly from the edge inventory; cross-check that every diagram edge maps to exactly one inventory row and no edge is added from memory or docs.
- [X] T012 [US1] Resolve F001-001 in RD §13 after T010: confirm it if source proves sequential execution, otherwise rewrite it to match source; fill all spec Finding fields (AkariSP contract involved: none expected; Core change required: NO unless evidenced).

**Checkpoint**: US1 complete — topology, conditional routes, parallelism verdict, F001-001 resolved.

---

## Phase 3: State Model (US2, Priority P1)

**Goal**: Complete graph state inventory as the basis for per-node read/write analysis.

- [X] T013 [US2] Document every field of `AgentState`, `InvestDebateState`, `RiskDebateState` (and any other state types) from `tradingagents/agents/state.py`, including declared reducers/merge semantics, grouped as: run identity/context, messages, analyst reports, investment debate state, investment plan, trader investment plan, risk debate state, final trade decision, past context, portfolio context; write to RD §3.
- [X] T014 [US2] Trace initial state creation and graph invocation args (e.g. recursion limit) in `tradingagents/graph/propagation.py`; record each field's initializer and initial value with citations in RD §3.
- [X] T015 [US2] Create the RD §3 per-field table (Field / Initialized by / Read by / Written by / Purpose / Required for minimum browser graph) with Initialized-by filled from T014; Read-by / Written-by are filled incrementally by Phases 4–7 and finalized in T040.

---

## Phase 4: Analyst Nodes (US2)

**Goal**: Node Analysis Records for the 4 analysts and the ToolNode vs. pre-fetch distinction.

- [X] T016 [P] [US2] Complete the Market Analyst Node Analysis Record in RD §4 from `tradingagents/agents/analysts/market_analyst.py`: input state, output state, LLM invocation, bound tools, ToolNode loop (link to T009 edges), report completion condition, state writes.
- [X] T017 [P] [US2] Complete the Sentiment Analyst Node Analysis Record in RD §4 from `tradingagents/agents/analysts/sentiment_analyst.py`: whether it uses a ToolNode or in-node pre-fetch, which data it pre-fetches (interface level only), structured vs. free-text invocation, state writes.
- [X] T018 [P] [US2] Complete the News Analyst Node Analysis Record in RD §4 from `tradingagents/agents/analysts/news_analyst.py`: tool set, tool loop, report write.
- [X] T019 [P] [US2] Complete the Fundamentals Analyst Node Analysis Record in RD §4 from `tradingagents/agents/analysts/fundamentals_analyst.py`: tool set, tool loop, report write.
- [X] T020 [US2] Write RD §6 Tool/Data Invocation Map from T016–T019: ToolNode paths per analyst, tool-loop edges, Sentiment pre-fetch contrast, external dependencies named at interface level (no vendor internals); write the ToolNode node record in RD §4 (registration, tools bound, return edge, state effect).

---

## Phase 5: Research Debate (US2)

**Goal**: Bull/Bear and Research Manager semantics, including opponent dependency and termination.

- [X] T021 [P] [US2] Complete the Bull Researcher Node Analysis Record in RD §4 from `tradingagents/agents/researchers/bull_researcher.py`: reports read, field carrying the opponent's previous response, history update, count update.
- [X] T022 [P] [US2] Complete the Bear Researcher Node Analysis Record in RD §4 from `tradingagents/agents/researchers/bear_researcher.py`: same items as T021.
- [X] T023 [US2] Trace `should_continue_debate()` (or equivalent) in `tradingagents/graph/conditional_logic.py`: first speaker (from T008/T009 edges), next-speaker rule, max rounds source, exact termination expression, transition to Research Manager; record with citations in RD §7.
- [X] T024 [US2] Complete the Research Manager Node Analysis Record in RD §4 from `tradingagents/agents/managers/research_manager.py`: debate history input, `investment_plan` output, structured output behavior, LLM class (placeholder until T037), boundary to Trader.
- [X] T025 [US2] Write RD §7 Bull/Bear Debate Mechanics from T021–T024: starting node, alternation, previous-opponent-response dependency verdict, counter, termination; state explicitly whether Bull/Bear parallelization would break upstream semantics (no assumption of independent branches).

---

## Phase 6: Trader (US2)

- [X] T026 [US2] Complete the Trader Node Analysis Record in RD §4 from `tradingagents/agents/trader/trader.py`: `investment_plan` dependency, market report dependency, portfolio/instrument context, structured output, `trader_investment_plan` output, message/state writes, downstream risk-stage edge; add an explicit Research Manager vs. Trader responsibility contrast (not merged).

---

## Phase 7: Risk Debate (US2)

- [X] T027 [P] [US2] Complete the Aggressive Risk Analyst Node Analysis Record in RD §4 from `tradingagents/agents/risk_mgmt/aggressive_debator.py`: inputs, prior-argument fields read, history/count updates.
- [X] T028 [P] [US2] Complete the Conservative Risk Analyst Node Analysis Record in RD §4 from `tradingagents/agents/risk_mgmt/conservative_debator.py`: same items as T027.
- [X] T029 [P] [US2] Complete the Neutral Risk Analyst Node Analysis Record in RD §4 from `tradingagents/agents/risk_mgmt/neutral_debator.py`: same items as T027.
- [X] T030 [US2] Trace the risk router (e.g. `should_continue_risk_analysis()`) in `tradingagents/graph/conditional_logic.py`: initial speaker, speaker sequence, previous-response dependencies, count semantics, max discussion rounds source, termination expression, Portfolio Manager transition; record in RD §8.
- [X] T031 [US2] Complete the Portfolio Manager Node Analysis Record in RD §4 from `tradingagents/agents/managers/portfolio_manager.py`: which of research plan / trader plan / risk history / past or portfolio context it actually reads, structured output, final state write (`final_trade_decision` or equivalent).
- [X] T032 [US2] Write RD §8 Risk Debate Mechanics from T027–T031, including the Research Manager / Trader / Portfolio Manager responsibility comparison.

---

## Phase 8: Invocation Helpers (US2)

**Scope**: only semantics needed for Feature 001 questions; no vendor internals.

- [X] T033 [P] [US2] Inspect `tradingagents/agents/structured.py` (or mapping): `with_structured_output` usage, failure fallback to free text, whether fallback causes a second LLM invocation; record in RD §5 and link from affected Node Analysis Records.
- [X] T034 [P] [US2] Inspect `tradingagents/agents/context.py` and the message-clear node factory: message deletion, placeholder message creation, analyst context isolation; write the message-clear node record in RD §4.
- [X] T035 [P] [US2] Inspect `tradingagents/agents/tools.py` (or mapping): injected state (e.g. trade date), tool definitions per analyst, ToolNode semantics; record in RD §6.
- [X] T036 [P] [US2] Inspect `tradingagents/default_config.py`: quick-thinking and deep-thinking model defaults, default max debate rounds, default max risk discussion rounds; record in RD §5, §7, §8.

---

## Phase 9: Top-Level Graph Integration (US2)

- [X] T037 [US2] Trace quick/deep LLM construction in `tradingagents/graph/trading_graph.py` and which LLM instance is passed to each node factory; fill the LLM class field in all 12 Node Analysis Records and write RD §5 LLM Invocation Map (quick / deep / structured / fallback / tool-bound / repeatable via tool loop).
- [X] T038 [US2] Trace GraphSetup invocation, graph compile, initial state creation, invoke/stream, final state, and final decision extraction in `tradingagents/graph/trading_graph.py`; record in RD §2 (entry/exit) and §3 (initial/final state flow).
- [X] T039 [US2] Identify checkpoint, memory, reflection, reporting, and backtesting dependencies wired in `tradingagents/graph/trading_graph.py` at interface level only; record each as input for EXCLUDE decisions in RD §6 (external dependencies). No deep analysis of their internals.
- [X] T040 [US2] Finalize RD §3 Read-by / Written-by columns and RD §5 repeatable-call entries by cross-checking against all 12 Node Analysis Records; resolve any inconsistency by re-reading source.

**Checkpoint**: US2 complete — 12 records, state map, LLM and tool maps, both debate mechanics.

---

## Phase 10: Classification & Minimum Browser Graph (US3, Priority P2)

**Prerequisite**: Phases 2–9 complete. Spec candidates are inputs, not answers.

- [X] T041 [US3] Write RD §10 PRESERVE / SIMPLIFY / EXCLUDE table: one row per major upstream concept, exactly one class, a reason citing the RD section it rests on and the minimum-browser-workload purpose.
- [X] T042 [US3] Write RD §11 Intentional Adaptations: for each candidate (e.g. independent analyst parallelization, 4→2 analysts, 3-way risk → single reviewer, smaller state, deterministic fixtures) record Upstream behavior / Proposed Browser behavior / Why / Semantic cost / Dogfood value / Status, plus SOURCE FACT / DESIGN INFERENCE / STATUS.
- [X] T043 [US3] Replace every `TBD (Phase 10)` placeholder: in all 12 Node Analysis Records in RD §4 fill "Could be parallelized as BrowserTradingAgents adaptation" (DESIGN INFERENCE from state read/write dependencies, never merged with "Can run in parallel in upstream"), "Required for browser dogfood" (YES / NO / PARTIAL), and "Reason"; fill the RD §3 "Required for minimum browser graph" column; all consistent with RD §10 and §11. Confirm 0 `TBD (Phase 10)` remain.
- [X] T044 [US3] Write RD §12 Minimum Browser Graph (proposal only, not implemented), answering from source analysis: Can Market + News represent the analyst stage? Must Bull/Bear be kept? Is Research Manager needed (given its `investment_plan` boundary)? Is Trader needed? Is the full 3-way risk debate needed? How can Portfolio Manager / final synthesis be simplified? Label every deviation from upstream as an adaptation.

---

## Phase 11: Findings & Final Deliverable (US4, Priority P3)

- [X] T045 [US4] Consolidate RD §13 Findings: F001-001 (resolved in T012) and any `F001-NNN` raised during Phases 1–10, all in spec Finding format; do not create AkariSP findings without evidence.
- [X] T046 [US4] Answer all 17 spec success questions in RD §14, each with at least one citation to an RD evidence entry.
- [X] T047 [US4] Fill every field of the spec's Required Final Deliverable in RD §14, including `AkariSP production changes: 0`, `BrowserTradingAgents implementation changes: 0`, and Recommended Feature 002 scope as a recommendation only.
- [X] T048 [US4] If any finding contradicts a factual statement in `specs/001-tradingagents-reference-analysis/spec.md` or `plan.md`, apply a minimal factual correction and note it in RD §13; otherwise record "no correction needed". No scope changes. If a finding contradicts a factual statement in `.specify/memory/constitution.md` (notably Principle XI's statement on v0.5.1 sequential execution), do NOT edit the constitution: record it in RD §13 as a finding marked "constitution amendment candidate" for a separate amendment outside Feature 001.

---

## Phase 12: Verification (research correctness gates)

**Rule**: A failed gate → fix RD (re-reading source as needed) → re-run that gate. No gate runs before Phase 11 is complete.

- [ ] T049 V-01: Re-run `git rev-parse HEAD` in `UP` (== `35543d0248bf89fcb92b17a15858ad0c0e940687`) and re-confirm version `0.5.1`; confirm RD §1 matches.
- [ ] T050 V-02: Confirm RD §1 path table covers every path from spec.md/plan.md and every non-present path has a mapping or a finding.
- [ ] T051 V-03: Confirm RD §4 contains the 12 agent records (Market, Sentiment, News, Fundamentals, Bull, Bear, Research Manager, Trader, Aggressive, Conservative, Neutral, Portfolio Manager) plus the ToolNode record and the message-clear record, with no empty fields and no `TBD (Phase 10)` remaining.
- [ ] T052 V-04 / V-05: Confirm every edge in the RD §2 diagram has an inventory row with citation (0 uncited) and every conditional route lists router, condition, targets, citation.
- [ ] T053 V-06: Confirm every Evidence Claim in RD has path + symbol + line range + frozen-SHA permalink, evidence class is only `STATIC_CODE_ANALYSIS`, and no implementation claim rests on README/diagrams/paper alone. Sample-verify correctness (SC-006): for at least one claim per RD section §2–§9, re-open the cited file and line range in `UP` and confirm it shows the claimed behavior; record the sampled claims and result in RD §14.
- [ ] T054 V-07 / V-08: Confirm every RD §10 entry has a reason; every RD §11/§12 deviation carries SOURCE FACT / DESIGN INFERENCE / STATUS; the three parallelism terms are never merged.
- [ ] T055 V-09: Confirm all 17 success questions and all Final Deliverable fields in RD §14 are filled and F001-001 is resolved.
- [ ] T056 V-10: Re-check `git rev-parse HEAD` in this repository and record the SHA or `UNAVAILABLE` in RD §1 and §14.
- [ ] T057 V-11 / V-12: Run `git diff --name-only <T001 baseline SHA>` and `git status --porcelain` in this repository and, excluding the pre-existing untracked paths recorded in T001, confirm changes exist only under `specs/001-tradingagents-reference-analysis/` (plus `.specify/feature.json`); confirm no `src/`, `package.json`, dependency, or AkariSP change and that no upstream source was copied into the repository.
- [ ] T058 Feature completion verification: confirm and record in RD §14 the completion state below; any line not satisfied → return to the owning phase.

```text
Original TradingAgents analyzed: YES
12 agent records: COMPLETE
Graph topology: fully evidence-backed
Conditional edges: fully evidence-backed
Upstream parallelism: resolved
Bull/Bear mechanics: resolved
Risk mechanics: resolved
PRESERVE/SIMPLIFY/EXCLUDE: complete with rationale
Intentional adaptations: explicitly separated
Minimum browser graph: proposed, not implemented
F001-001: resolved
AkariSP production changes: 0
BrowserTradingAgents application source changes: 0
```

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T005)
  → Phase 2 / US1 (T006–T012)          T010 → T012 (F001-001 only after verdict)
  → Phase 3 (T013–T015)
  → Phase 4 (T016–T019 [P]) → T020
  → Phase 5 (T021–T022 [P]) → T023 → T024 → T025
  → Phase 6 (T026)
  → Phase 7 (T027–T029 [P]) → T030 → T031 → T032
  → Phase 8 (T033–T036 [P])
  → Phase 9 (T037 → T038 → T039 → T040)
  → Phase 10 / US3 (T041 → T042 → T043 → T044)
  → Phase 11 / US4 (T045 → T046 → T047 → T048)
  → Phase 12 (T049 … T058, sequential)
```

- US1 has no story dependency. US2 depends on US1's edge inventory (routing, tool loops). US3
  depends on US1 + US2. US4 depends on US1–US3.
- Phases 4–8 may be reordered where a record needs a helper earlier (e.g. T033 before T024), but no
  synthesis task (T041–T047) may start before Phase 9 is complete.

## Parallel Opportunities

Research tasks that may run concurrently (distinct source files, distinct RD subsections):

```text
Phase 4: T016, T017, T018, T019   (4 analyst records)
Phase 5: T021, T022               (Bull, Bear records)
Phase 7: T027, T028, T029         (3 risk debator records)
Phase 8: T033, T034, T035, T036   (helpers)
```

Never `[P]`: synthesis before evidence collection, F001-001 before topology trace, classification
before agent analysis, verification before RD completion.

## Implementation Strategy

- **MVP**: Phase 1 + Phase 2 (US1). Stop and validate: topology and F001-001 are the foundation
  for every later decision.
- **Incremental**: each phase writes its RD section on completion so evidence is fixed at the
  moment of analysis; no single "write research.md" task.
- **Expected modified files**: `specs/001-tradingagents-reference-analysis/research.md` (primary);
  `spec.md` / `plan.md` only via T048 factual corrections.
- **Never modified**: `src/`, `package.json`, any dependency manifest, the AkariSP repository.
