# Research: Feature 004 — Browser TradingAgents Fixture Graph

**Date**: 2026-09-28 | **Branch**: `004-browser-tradingagents-fixture-graph` | **Start**: `origin/main` @ `4627c73`

Sources: Feature 001 research (§4, §7, §8, §10–§12; A1–A14), Feature 003 spec/plan/research/
contracts/verification/evidence, the current repository. No dependency is added or changed; no
LangGraph API beyond what Feature 003 verified in `@langchain/langgraph@1.4.18` is needed.

## R1 — Role read/write contracts (Feature 001 authoritative)

Upstream every role also reads `instrument_context` (company identity); the fixture's `subject`
plays that part and is allowed for every role. "Raw facts" = `marketFacts` / `newsFacts`.

| Role | Reads (exact) | Must not read | Writes | Requests | Consumers | Feature 001 basis |
|---|---|---|---|---|---|---|
| Market Analyst | `subject`, `marketFacts` | `newsFacts`, every role output | `marketReport` | 1 | Bull, Bear, Trader, Risk | §4.1; A1, A3, A4 |
| News Analyst | `subject`, `newsFacts` | `marketFacts`, every role output | `newsReport` | 1 | Bull, Bear, Risk | §4.3; A1, A3, A4 |
| Bull Researcher | `subject`, `marketReport`, `newsReport` (+ fixed opening instruction: the bear has not spoken yet) | raw facts, later outputs | `bullArgument` | 1 | Bear, Research Manager | §4.6 (reads reports + opponent's last argument; first turn = opening marker) |
| Bear Researcher | `subject`, `marketReport`, `newsReport`, `bullArgument` | raw facts, later outputs | `bearArgument` | 1 | Research Manager | §4.7, §7.3 (reads Bull's last argument) |
| Research Manager | `subject`, `bullArgument`, `bearArgument` | raw facts, `marketReport`, `newsReport`, later outputs | `researchDecision` | 1 | Trader, Risk, Final | §4.8 (debate history only; does not read reports) |
| Trader | `subject`, `researchDecision`, `marketReport` | raw facts, `newsReport`, Bull/Bear arguments, later outputs | `traderPlan` | 1 | Risk, Final | §4.9 (investment_plan + market_report; no debate, no news) |
| Risk Reviewer | `subject`, `traderPlan`, `researchDecision`, `marketReport`, `newsReport` | raw facts, Bull/Bear arguments, `finalDecision` | `riskReview` | 1 | Final | §12 (A5: trader plan + investment plan + 2 reports) |
| Final Decision | `subject`, `riskReview`, `researchDecision`, `traderPlan` | raw facts, both reports, Bull/Bear arguments | `finalDecision` | 1 | caller | §4.13 (PM: risk history + investment plan + trader plan; no reports, no debate); A6, A9 |

Upstream's debate `history` at one round = Bull's argument + Bear's argument, so Research
Manager reading `bullArgument` + `bearArgument` is the same content as upstream's `history`
(A8). Portfolio/past context (A9) is absent everywhere.

- **Decision**: exactly this table (identical to spec *Role Contracts*, plus `subject` explicit).
- **Alternatives**: "primarily derived from" single-input roles (rejected: drops Trader's
  `marketReport` and Final Decision's plan inputs that Feature 001 found load-bearing, §8.4).

## R2 — Reference vs adaptation, fidelity table

| Reference semantic | Feature 001 evidence | Feature 004 behavior | Exact / Adapted / Deferred | Reason | Test/evidence |
|---|---|---|---|---|---|
| Market role | §4.1 | fixture-fed report | Adapted (A3, A4) | no vendors/tools | G1, G2 provenance |
| News role | §4.3 | fixture-fed report | Adapted (A3, A4) | as Market | G1, G2 |
| Analyst sequencing | §9.1 sequential, F001-001 | Market ‖ News + fan-in | Adapted (A1) | browser orchestration, AkariSP fan-out dogfood | G3, G4, L2 |
| Analyst set | §2.1 default 4 | 2 | Adapted (A2) | upstream-supported subset | fixture/graph review |
| Bull role | §4.6 | 1 turn, reads 2 reports, opening instruction | Exact at 1 round | default `k = 1` | G5 |
| Bear dependency | §7.3 | reads Bull's argument, runs after Bull | Exact | data dependency is the semantics | G5 |
| Multi-round debate | §7 `2k` turns | 1 round | Deferred | `k = 1` = upstream default | — |
| Research Manager boundary | §4.8 | Bull + Bear only | Exact | sole debate → plan boundary | G6 |
| Trader boundary | §4.9 | research decision + market report | Exact (no portfolio, A9) | distinct input set/scale | G7 |
| Risk-team behavior | §8 3-way rotation | single Risk Reviewer | Adapted (A5) | minimum second-pass critique | G8 |
| Portfolio Manager boundary | §4.13 | Final Decision: risk review + plans | Adapted name/inputs (A6, A9) | same boundary, no portfolio/past | G9 |
| Routing | §2.4 routers | static edges | Adapted (A10) | constant at 1 round / 1 reviewer | graph review |
| `messages` channel | §4.5a | none; explicit fields | Adapted (A7, A8) | needed for A1; provenance | G1 |
| Tool use | §6.1 ToolNode loops | none; facts in prompt | Adapted (A4) | no vendors, browser tool calling unproven | static audit |
| Structured output | §5.2 RM/Trader/PM + 1 fallback | plain text everywhere | **Adapted — deviates from A11 proposal** | deterministic 8 requests; browser structured output unproven (F002 N-6) | G10 (fallback 0) |
| Quick/deep models | §5.1 | one browser model | Adapted (A12) | one runtime model | evidence runtime |
| Checkpoint / reporting | §6.4 | none | Adapted (A13) | infrastructure | static audit |
| Reflection / memory | §6.4 | none | Adapted (A14) | persistence | static audit |

No new adaptation beyond A1–A14 except the recorded A11 deviation (plain text). No finding.

## R3 — Plain-text request model

All eight roles call the model once, plain text, user-role message. Expected per successful run:
8 role executions, 8 logical requests, 0 fallback requests (no fallback path exists), provider
invocations NOT EXPOSED. Feature 001's 8–11 estimate assumed A11's structured fallback and does
not apply. Measured, never asserted into the record.

## R4 — State

`Annotation.Root` (Feature 003 R2, same package version): `input` (fixture object) plus the eight
role fields, all last-value, no reducer (each key written by one role; Market/News write disjoint
keys in the same step — verified pattern). No `messages`, no generic output map. Raw fixture
categories stay inside `input`; each role reads only its contracted keys (R6).

Node names must differ from state keys (Feature 003 R2): nodes `marketAnalyst`, `newsAnalyst`,
`bullResearcher`, `bearResearcher`, `researchManager`, `trader`, `riskReviewer`,
`finalDecisionMaker`; the terminal field stays `finalDecision`.

## R5 — Fixture

`src/graph/trading-fixture.ts` (new file; the Feature 003 `src/graph/fixture.ts` stays until the old tests are
retired, then is deleted — its content remains in git history and its evidence keeps the old id):

```text
id:          tradingagents-fixture@1
subject:     Northwind Lamps Ltd. (fictional)
marketFacts: 2–3 short facts, each tagged "(market fact M1)", "(M2)" …
newsFacts:   2–3 short facts, each tagged "(news fact N1)", "(N2)" …
```

Tagged facts are exact strings tests search for (sentinels). Neutral, fictional, no ticker, no
real prices. Tests never depend on model output quality.

## R6 — Prompt design

- **Decision**: one Feature-local constant table in `src/graph/trading-graph.ts`: per role
  `{ node, writes, reads: [...state keys], ask }`, and one node helper that builds the prompt as
  `ask` followed by one labelled line per `reads` key. A role can only see what its `reads` lists,
  so "whole state in every prompt" cannot happen; `reads` is also what the evidence reports.
- User-role message only; no system role (F002 N-7), no tools, no structured output.
- `ask` states the role and task in one or two sentences and asks for a short plain-text reply
  (e.g. Bear: "rebut the bull argument"; Bull: "the bear has not spoken yet — open the debate").
- **Alternatives**: eight hand-written prompt functions (more code, same result); separate prompt
  module / registry (rejected: one file suffices, no second consumer).
- Empty upstream output is rendered as-is (empty value after its label); the workflow continues.

## R7 — Feature 003 minimal graph migration

- **Decision: B (replace)**. The canonical app now runs the role graph. `src/graph/minimal-graph.ts`
  and `test/minimal-graph.test.ts` are deleted; `src/graph/trading-graph.ts` and
  `test/trading-graph.test.ts` replace them; `test/trading-graph-integration.test.ts` replaces
  `test/graph-integration.test.ts`; `src/graph/trading-fixture.ts` replaces `src/graph/fixture.ts`. New files
  are added first; the old ones are deleted only after the replacements pass (tasks.md INV-D). Feature 003 evidence and specs stay
  byte-identical (their `revision` points at the commit containing the old code).
- A (keep as regression) rejected: production code with no production use; C (shared helpers)
  rejected: nothing reusable beyond test snippets already copied per file.

Guarantee migration matrix (no Feature 003 safety property is dropped):

| Feature 003 guarantee | Old test | Feature 004 replacement |
|---|---|---|
| fan-out submission | G1 | G3 (both analyst requests before either completes) |
| fan-in barrier, both orders | G3 ×2 | G4 ×2 (Bull 0 while either analyst held) |
| branch independence | G2 | G2 (sentinel provenance) |
| join consumes both | G4 | G5 (Bull/Bear read both reports) |
| sequence + dependency | G5 | G5–G9 (each downstream role) |
| final state / accounting | G6, G7 | G1, G10 |
| explicit signal forwarding (Regression A) | G8 + T026 mutation | G11 + mutation repeated |
| cancellation, settle separately | G9 | G12 (analyst phase), G13 (sequential phase) |
| failure, same error, sibling abort | G10 | G14 (early, News), G15 (late, Trader) |
| real runtime reuse, 1/1 fan-out | L1, L2 | L1, L2 |
| cancel settles before shutdown (Regression B) | L3 + T034 mutation | L3 (analyst), L4 (sequential) + mutation repeated |
| failure settles, runtime ready | L4 | L5 (early failure) |
| shutdown idempotent | L5 | L6 |
| browser success / cancel / BLOCKED / createRuntime failure | app (a)–(d) | app (a)–(d) updated + (e) repeated run |
| main.ts shutdown-order mutation | T053 | repeated |

## R8 — Failure trigger

- Deterministic tests: the fake `Runtime` rejects the request of a chosen role (identified by the
  role line in the prompt) with `TaskError('failed')` — no stand-in change.
- Node integration early failure: `STANDIN_FAIL` in `newsFacts` makes the News Analyst prompt fail
  (existing stand-in rule; plain `Error` → `TaskError('failed')`, runtime stays `ready`).
- A late failure in Node integration is **not** added: the stand-in echoes its prompt, so any
  marker would surface in the earlier role that first sees it. Late failure is proven by G15
  (deterministic). No new fault-injection mechanism.

## R9 — Cancellation locations

- C1 (analyst phase): both analyst requests in flight (active 1 / queued 1) → abort. Deterministic
  G12, Node L3, browser app (b).
- C2 (sequential phase): Trader in flight → abort. Deterministic G13 (hold Trader's request); Node
  L4 (call `standin.hold()` on the Trader's `start` node event, before its prompt reaches the
  model, then abort). Not in the browser (same code path; F003 kept browser cancel to one phase).

## R10 — Watchdog (page protection only)

Measured, Feature 003 native run at `4e64472` (`real-browser-2026-09-28-4e64472.json`), four
requests: prompt times 1.9 s, 1.3 s, 2.2 s, 0.4 s; graph work ≈ 7.8 s of request time; whole
Playwright test 20–40 s (dominated by browser start and base-session creation, which happen
before the watchdog starts). Feature 004 has eight requests with longer prompts (downstream roles
carry two to four earlier outputs). Projection: ~2–4× Feature 003 per request → roughly 20–60 s
of graph time.

- **Decision**: keep **180 s** (unchanged). It is ≥ 3× the projected upper bound and far below
  the Playwright native wait (9 min). The record gains `timing.graphMs`; if a native run uses more
  than half the watchdog (> 90 s), the implementation records it and revisits the value.
- It is application protection — not an AkariSP timeout, a LangGraph timeout, or a Prompt API SLA.

## R11 — Canonical app evolution

`index.html`: eight role rows (ids `node-<nodeName>`), result shows `finalDecision`. `src/main.ts`:
imports the role graph and its node list; topology/version strings change; everything else
(owner function, per-run runtime/model/controller, pre-shutdown settlement, fan-out poll,
`createRuntime` failure path, stand-in mode, Run disabled until ready) is unchanged Feature 003
code.

## R12 — Evidence contract evolution

Extends Feature 003's record (same field names). Changes: `feature` = Feature 004 id; `fixture` =
`tradingagents-fixture@1`; `graph.version` = `tradingagents-fixture-graph@1` and new `topology`
string; `nodes` has the eight role nodes, each with `reads` (field names from the role table) in
addition to `status`, `executions`, `modelRequests`; `result` holds all eight role fields on
success; new `timing.graphMs`. Full prompts are **not** stored: request provenance is proven by
deterministic request capture (sentinels) and summarized by `reads` in the record.

## R13 — Native gate

Reuse `npm run test:prompt-api`: the canonical-app test in `e2e/prompt-api.spec.ts` currently
asserts four node names; it is updated to the eight role nodes (same assertions otherwise). The
Feature 002 harness test is unchanged. Required native evidence: one successful eight-role run,
clean revision.

## R14 — Historical evidence

Feature 001–003 files unchanged: SHA-256 baseline of `specs/001…`, `specs/002…`, `specs/003…`,
`harness/` recorded before any change and compared at the end. Feature 004 evidence files are new
(`specs/004…/evidence/`).

## Findings

None. Observations O-1/O-2 (Feature 003) apply unchanged and are designed in.
