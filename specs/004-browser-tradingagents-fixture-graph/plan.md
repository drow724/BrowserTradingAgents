# Implementation Plan: Feature 004 — Browser TradingAgents Fixture Graph

**Branch**: `004-browser-tradingagents-fixture-graph` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-browser-tradingagents-fixture-graph/spec.md`

## Summary

Replace the Feature 003 minimal graph with the eight-role TradingAgents fixture graph in the same
canonical app. One Feature-local role table (node, writes, reads, ask) drives both the prompts and
the evidence `reads` summary, so each role can see only the fields Feature 001 assigns it
([research.md](research.md) R1). Topology: Market ‖ News → barrier → Bull → Bear → Research Manager →
Trader → Risk Reviewer → Final Decision. Everything else — `AkariChatModel`, `/web` entry, explicit
`config.signal` forwarding, one runtime per run at limit 1, pre-shutdown settlement, stand-in mode,
evidence format, native Playwright runner — is reused from Feature 003 unchanged. No dependency
changes.

## Technical Context

**Language/Version**: TypeScript (ESM), Node 23.9.0 (≥ 22.18); Google Chrome 153 with the Prompt API.

**Primary Dependencies**: unchanged — `akarisp@0.1.0-alpha.2`, `@langchain/core@1.2.13`,
`@langchain/langgraph@1.4.18` (exact). No additions.

**Storage**: none; evidence JSON committed under the feature directory.

**Testing**: `node --test` (deterministic + Node integration), Playwright `chromium` (stand-in) and
`prompt-api` (native) projects — the Feature 003 setup.

**Target Platform**: browser; Node for tests.

**Project Type**: single project — static browser app.

**Performance Goals**: none; `timing.graphMs` recorded as operational evidence. Page watchdog 180 s
(R10).

**Constraints**: role prompts built only from each role's `reads`; plain text; no system role, no
tools, no structured output, no network data; `AkariChatModel` and AkariSP unchanged; no new
abstraction beyond the role table.

**Scale/Scope**: source — `src/graph/trading-graph.ts`, `src/graph/trading-fixture.ts` (new),
`src/main.ts` + `index.html` (edited), `src/graph/minimal-graph.ts` + `src/graph/fixture.ts`
(deleted after the replacements pass); tests — `test/trading-graph.test.ts`,
`test/trading-graph-integration.test.ts` (new; replace `test/minimal-graph.test.ts`,
`test/graph-integration.test.ts`, deleted at retirement), `e2e/app.spec.ts` + `e2e/prompt-api.spec.ts`
(edited); docs — `docs/testing.md`, `docs/roadmap.md`.

No NEEDS CLARIFICATION remains (research R1–R14).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Dogfood Before Abstraction | eight concrete roles in one Feature-local table + one node helper; no role engine, registry, runtime wrapper; no shared abstraction with the retired minimal graph | PASS |
| II. Deterministic Fixtures First | committed fictional fixture with sentinel tags; fake Runtime and stand-in | PASS |
| III. Application Owns Orchestration | roles, topology, prompts, cancellation, failure semantics in `src/` | PASS |
| IV. AkariSP Owns Inference Lifecycle | queue, cancel, cleanup, shutdown stay in AkariSP; per-run runtime unchanged | PASS |
| V. Evidence Before Core Change | AkariSP changes 0; findings first | PASS |
| VI. Browser First | completion needs native eight-role run on the canonical page | PASS |
| VII. Reproducible Agent Runs | record: revision, versions, fixture id, graph version/topology, runtime options, provider, runner, class, per-role `reads`, timing | PASS |
| VIII. No Trading-Quality Claims | no assertion on wording or decisions | PASS |
| IX. External Data Deferred | fixture only; Feature 005 boundary | PASS |
| X. Thin Integration Boundaries | bridge untouched | PASS |
| XI. Preserve Reference Semantics Explicitly | fidelity table (R2); Bull → Bear sequential; RM/Trader/Final boundaries from Feature 001; A11 deviation (plain text) and A4 tool simplification stated | PASS |
| XII. Findings Before Fixes | finding format adopted; none | PASS |
| Verification Rules | typecheck, build, deterministic tests, browser evidence | PASS |

Expected: AkariSP changes 0; external data integrations 0; tool calling 0; generic agent runtime 0.
**Post-design re-check**: PASS on all rows.

## Project Structure

### Documentation (this feature)

```text
specs/004-browser-tradingagents-fixture-graph/
├── spec.md
├── plan.md                 # this file
├── research.md             # R1–R14 (role contracts, fidelity table, migration, watchdog)
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── graph.md            # topology, role provenance, G1–G16, L1–L6
│   └── evidence.md         # extension of the Feature 003 record
├── checklists/requirements.md
├── evidence/               # created during implementation
└── tasks.md                # /speckit-tasks
```

### Source Code (repository root)

```text
index.html                    # 8 role rows (was 4 nodes)
src/
├── main.ts                   # owner unchanged; imports role graph; graph version/topology; result; timing
├── graph/
│   ├── trading-graph.ts      # NEW: state, ROLES table, node helper, edges, buildTradingGraph()
│   ├── trading-fixture.ts    # NEW: tradingagents-fixture@1
│   ├── fixture.ts            # DELETED at retirement (minimal-graph-fixture@1; history in git + specs/003)
│   └── minimal-graph.ts      # DELETED at retirement (Feature 003 history kept in git + specs/003 evidence)
└── integration/              # unchanged
test/
├── trading-graph.test.ts     # NEW: G1–G16 (minimal-graph.test.ts deleted at retirement)
├── trading-graph-integration.test.ts # NEW: L1–L6 (graph-integration.test.ts deleted at retirement)
├── standin.ts                # unchanged
└── (Feature 002 tests unchanged)
e2e/
├── app.spec.ts               # updated to 8 roles + (e) repeated run
├── prompt-api.spec.ts        # canonical test: 8 role nodes
└── harness.spec.ts           # unchanged
```

**Structure Decision**: option B of R7 — the role graph replaces the minimal graph. New files are
created alongside the old ones and the old graph/fixture/tests are deleted only after the new tests
pass and the R7 matrix is complete (tasks.md INV-D); Feature 003 evidence and specs untouched.

## Design

### `src/graph/trading-graph.ts`

- `State = Annotation.Root({ input, marketReport, newsReport, bullArgument, bearArgument,
  researchDecision, traderPlan, riskReview, finalDecision })` from `@langchain/langgraph/web`.
- `ROLES`: eight rows `{ node, label, writes, reads, ask }` exactly as contracts/graph.md
  *Role provenance*. `reads` keys resolve from `state.input` for `subject`/`marketFacts`/`newsFacts`,
  otherwise from state.
- One node helper (Feature 003 shape): emit `start`; prompt = `ask` + `\n\n` + one line
  `<Label>: <value>` per `reads` key; `model.invoke([new HumanMessage(prompt)], { signal:
  config.signal })`; count request; emit `done` / `error` (rethrow unchanged); return
  `{ [writes]: String(content) }`.
- Edges: `START→marketAnalyst`, `START→newsAnalyst`, `[marketAnalyst, newsAnalyst]→bullResearcher`,
  then a static chain to `finalDecisionMaker→END`.
- `ask` texts: role name + task + "Reply in plain text in at most three sentences." Bull adds "The
  bear analyst has not spoken yet — open the debate." Bear adds "Rebut the bull argument."

### `src/main.ts` / `index.html`

Owner function unchanged. Changes: import `buildTradingGraph`/`ROLES`/`FIXTURE`; `NODES` from
`ROLES`; `feature`, `fixture`, `prompts`, `graph.{version,topology}`; `nodes.*.reads`; `result` =
eight fields; `timing.graphMs` around `graph.invoke`; result line shows `finalDecision`.
`index.html`: eight rows `node-<node>` labelled with the role names.

### Tests

- `test/trading-graph.test.ts`: Feature 003 fake Runtime (copied helper), role identified by its
  `ask` first line; fake outputs `out-<writes>`; G1–G16.
- `test/trading-graph-integration.test.ts`: Feature 003 owner/`settled`/fan-out helpers; L1–L6.
- `e2e/app.spec.ts`: (a) success — eight `done`, `logicalRequests` 8, fallback 0, fan-out `{1,1}`,
  `settledBeforeShutdown`, `graph.version`, `nodes.*.reads` present; (b) cancel during analysts;
  (c) native BLOCKED; (d) `createRuntime` failure; (e) repeated run — Run twice, second record
  also success with `logicalRequests` 8 and its own settlement.
- `e2e/prompt-api.spec.ts`: canonical test asserts the eight role nodes `done`.
- Mutation checks repeated: Regression A (drop `config.signal` → G11/G12 fail), Regression B (Node
  L3 and `src/main.ts` shutdown before settle → fail).

## Verification Gates

| Gate | Command / method | Evidence class |
|---|---|---|
| typecheck / build | `npm run typecheck`, `npm run build` | — |
| deterministic | `npm test` → `trading-graph.test.ts` | DETERMINISTIC_TEST |
| Node integration | `npm test` → `trading-graph-integration.test.ts` | NODE_INTEGRATION (stand-in) |
| browser automated | `npm run test:browser` | BROWSER_AUTOMATED |
| native | `npm run test:prompt-api` at a clean commit | REAL_BROWSER_PROMPT_API / BLOCKED |
| static audit | no `akarisp` in `src/graph`; no root LangGraph entry; `src/integration` diff empty; no `fetch`/URLs/API keys; no tools/`Send`/conditional edges/checkpointer/`retryPolicy`/`SystemMessage`/structured helper in `src/graph` + `src/main.ts`; no new classes; Feature 001–003 + harness hashes unchanged | STATIC_AUDIT |

## Requirement → Evidence Map

| Req | Evidence |
|---|---|
| FR-001 | graph edges review; G1 (8 roles once) |
| FR-002 | `trading-fixture.ts` id/content; static audit (no network) |
| FR-003 | G2 |
| FR-004 | G3; L2 |
| FR-005 | G4 (both orders) |
| FR-006 | G5 |
| FR-007 | G5–G9 (includes + excludes) |
| FR-008 | G6, G7, G8 (distinct fields/roles) |
| FR-009 | G1 (nine fields, one writer each); state review |
| FR-010 | G10 (one user message, fallback 0); static audit |
| FR-011 | static audit; G10 |
| FR-012 | L1, L6; app (a)(e) |
| FR-013 | G11–G13; L3, L4; app (b); mutation A |
| FR-014 | G12, G13; L3, L4; app (b) |
| FR-015 | G14, G15; L5 |
| FR-016 | L3, L4, L5; app (a)(b)(e); mutation B |
| FR-017 | record fields in app (a); native record |
| FR-018 | record `counts`/`concurrency` asserted in app (a) |
| FR-019 | app (a)–(e) on `/`; eight role rows; build output |
| FR-020 | per-layer labels; app (a) `BROWSER_AUTOMATED`; app (c) `BLOCKED`; native record |
| FR-021 | contracts/evidence.md; app (a) asserts new + inherited fields |
| FR-022 | static audit hashes |
| FR-023 | static audit |
| FR-024 | no wording assertions (review of tests) |
| FR-025 | findings review |
| SC-001 | G1 |
| SC-002 | G3 |
| SC-003 | G2 |
| SC-004 | G4 |
| SC-005 | G5 |
| SC-006 | G6 |
| SC-007 | G7, G8, G9 |
| SC-008 | G1; app (a); native record |
| SC-009 | G10; L1; app (a); native record |
| SC-010 | G14, G15; L5 |
| SC-011 | G12, G13; L3, L4; app (b) |
| SC-012 | L3, L4, L5; app (b) |
| SC-013 | L2; app (a) fan-out snapshot |
| SC-014 | static audit; G10 |
| SC-015 | app (a), (b) |
| SC-016 | native record (T-gate) |
| SC-017 | static audit |
| SC-018 | static audit |
| SC-019 | static audit |
| SC-020 | static audit hashes |
| SC-021 | all gates |

## Completion Model (from spec)

Implementation complete: SC-001–SC-015, SC-017–SC-021. Feature complete: plus SC-016 native PASS;
otherwise BLOCKED / INCOMPLETE.

## Risks

- Native per-request time grows with prompt length; watchdog 180 s rechecked against measured
  `timing.graphMs` (R10).
- The stand-in echoes prompts, so stand-in outputs grow along the chain; harmless for assertions
  (none on wording).
- Native output may ignore "three sentences"; not evaluated.

## Self-review

1 Market/News parallelism labelled A1 adaptation — OK. 2 Bull/Bear sequential — OK. 3 RM without
reports — G6. 4 Trader keeps `marketReport` — G7. 5 Risk Reviewer provenance per R1 — G8. 6 Final
Decision = PM boundary — G9. 7 no whole-state prompts — role `reads` only. 8 request count 8, no
fallback path — R3. 9 provider invocations NOT EXPOSED — OK. 10 no native concurrency claim — OK.
11 Feature 003 guarantees migrated — R7 matrix. 12 no external data — audit. 13 no tool calling —
audit. 14 no generic abstraction — role table only. 15 Feature 003 evidence untouched — hashes.
16 watchdog from measured data — R10. 17 native gate = one success run — OK. 18 no quality
criterion — OK.

## Complexity Tracking

No constitution violations to justify.
