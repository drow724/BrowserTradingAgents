---

description: "Task list for Feature 004 — Browser TradingAgents Fixture Graph"
---

# Tasks: Feature 004 — Browser TradingAgents Fixture Graph

**Input**: `specs/004-browser-tradingagents-fixture-graph/` — spec.md, plan.md, research.md,
data-model.md, contracts/graph.md, contracts/evidence.md, quickstart.md

**Baseline** (verified at task generation): branch `004-browser-tradingagents-fixture-graph` @
`4627c73` (= `origin/main`, Feature 003 merged). Untracked: this feature directory and unrelated Spec
Kit/Claude tooling (leave untouched). Dependencies unchanged: `akarisp@0.1.0-alpha.2`,
`@langchain/core@1.2.13`, `@langchain/langgraph@1.4.18` — no dependency task exists.

**Tests**: required (spec FR-020 evidence layers). G1–G16 and L1–L6 are the numbering of
[contracts/graph.md](contracts/graph.md); tasks do not renumber them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different files and no behavioral dependency on an incomplete task.
- **[USn]**: US1 full workflow, US2 analyst fan-out/fan-in, US3 debate semantics, US4 downstream
  provenance, US5 cancel/fail safely.

## Invariants every phase keeps

> **INV-A — explicit signal forwarding**: every role node calls
> `model.invoke(msgs, { signal: config.signal })`; graph code and tests import only
> `@langchain/langgraph/web` (Feature 003 O-1). `src/integration/*` is not changed.
>
> **INV-B — settlement before shutdown**: cleanup is proven only by `snapshot()` =
> `{ state: 'ready', active: 0, queued: 0 }` observed **before** `runtime.shutdown()`; a post-shutdown
> `closed 0/0` is never settlement evidence (Feature 003 O-2).
>
> **INV-C — role provenance**: a role's prompt is built only from its `reads` in the role table;
> no role receives the whole state.
>
> **INV-D — migration order**: the Feature 003 minimal graph, its fixture and its tests are deleted
> only after the Feature 004 replacements pass and the R7 guarantee audit (T041) is done.

## Plan adjustments made at task level (no scope change)

- **New fixture file** `src/graph/trading-fixture.ts` instead of reusing `src/graph/fixture.ts`
  (plan R5): the old fixture must stay intact while the old tests still run (INV-D). `fixture.ts` is
  deleted at retirement (T053).
- **New Node integration file** `test/trading-graph-integration.test.ts` instead of rewriting
  `test/graph-integration.test.ts` in place (plan R7), for the same reason; the old file is deleted at
  retirement.
- **G5 covers Bull as well as Bear**: contracts/graph.md G5 lists Bear only; Bull's provenance
  (both reports, no raw facts, opening instruction) is asserted under G5 too (T021) and the contract
  row is synced (T022).

---

## Phase 1: Setup — Checkpoint A0 (baseline and historical protection)

- [X] T001 Create `specs/004-browser-tradingagents-fixture-graph/verification.md`; record `git branch --show-current`, `git rev-parse HEAD` (expect `4627c73…`), `git status --short`, `node -v`, `npm -v`
- [X] T002 Record in `specs/004-browser-tradingagents-fixture-graph/verification.md`: `npm ls akarisp @langchain/core @langchain/langgraph` (expect 0.1.0-alpha.2 / 1.2.13 single deduped / 1.4.18) and the `dependencies` block of `package.json`
- [X] T003 Record `shasum -a 256` of every file under `specs/001-tradingagents-reference-analysis/`, `specs/002-langchain-akarisp-integration-validation/`, `specs/003-langgraph-akarisp-minimal-graph/` (incl. `evidence/*.json`) and `harness/` in `specs/004-browser-tradingagents-fixture-graph/verification.md` as the historical baseline (FR-022, SC-020)
- [X] T004 Run the Feature 003 baseline and record exact counts in `specs/004-browser-tradingagents-fixture-graph/verification.md`: `npm run typecheck`, `npm run build`, `npm test` (expect 36/36), `npm run test:browser` (expect 6/6)
- [X] T005 Record the pre-change state in `specs/004-browser-tradingagents-fixture-graph/verification.md`: files `src/graph/minimal-graph.ts`, `src/graph/fixture.ts`, `test/minimal-graph.test.ts`, `test/graph-integration.test.ts`, `index.html` (4 node rows), `src/main.ts` (imports `buildMinimalGraph`), `e2e/app.spec.ts` (4 tests), `e2e/prompt-api.spec.ts` canonical test (4 nodes) — with their SHA-256 for the retirement audit

**Checkpoint A0**: Feature 003 baseline reproducible; history hashed; dependencies unchanged.

---

## Phase 2: Foundational — fixture, role table, graph, test scaffolding

- [X] T006 Create `src/graph/trading-fixture.ts` exporting `TradingFixture` type and `FIXTURE = { id: 'tradingagents-fixture@1', subject: 'Northwind Lamps Ltd. (fictional)', marketFacts, newsFacts }`; `marketFacts` = 2–3 short neutral facts each ending `(market fact M1)`, `(market fact M2)`…; `newsFacts` = 2–3 facts each ending `(news fact N1)`, `(news fact N2)`…; no ticker, no real prices, no positions/orders/PnL types (FR-002)
- [X] T007 Create `src/graph/trading-graph.ts` state: `import { Annotation, END, START, StateGraph, type LangGraphRunnableConfig } from '@langchain/langgraph/web'`; `State = Annotation.Root({ input: Annotation<TradingFixture>, marketReport, newsReport, bullArgument, bearArgument, researchDecision, traderPlan, riskReview, finalDecision })` as `Annotation<string>` last-value channels; no reducer, no `messages` (FR-009)
- [X] T008 In `src/graph/trading-graph.ts` add the exported `ROLES` constant: eight rows `{ node, label, writes, reads, ask }` exactly per contracts/graph.md *Role provenance* (nodes `marketAnalyst`, `newsAnalyst`, `bullResearcher`, `bearResearcher`, `researchManager`, `trader`, `riskReviewer`, `finalDecisionMaker`); `reads` typed as keys of `subject | marketFacts | newsFacts | <state output keys>`; `ask` = role name + one-sentence task + "Reply in plain text in at most three sentences."; Bull's `ask` adds "The bear analyst has not spoken yet — open the debate."; Bear's adds "Rebut the bull argument." (INV-C, FR-001, FR-007)
- [X] T009 In `src/graph/trading-graph.ts` add `buildTradingGraph(model, onNode?)`: one node helper per Feature 003 shape — emit `start`, build the prompt as `ask` + `\n\n` + one `<Label>: <value>` line per `reads` key (fixture keys from `state.input`, others from state) and nothing else, count the request per node, call **`model.invoke([new HumanMessage(prompt)], { signal: config.signal })`** (INV-A), emit `done` and return `{ [writes]: String(content) }` or emit `error` and rethrow unchanged; export `NodeEvent`; return `{ graph, modelRequests }` (FR-010, FR-011, FR-013)
- [X] T010 In `src/graph/trading-graph.ts` add the edges: `START→marketAnalyst`, `START→newsAnalyst`, `addEdge(['marketAnalyst','newsAnalyst'],'bullResearcher')`, `bullResearcher→bearResearcher→researchManager→trader→riskReviewer→finalDecisionMaker→END`; no `Send`, conditional edges, subgraphs, checkpointer, `retryPolicy`, `SystemMessage`, structured helper, tools (FR-001, FR-005–FR-008)
- [X] T011 Create `test/trading-graph.test.ts` header (`DETERMINISTIC_TEST`) and copy the Feature 003 fake-Runtime helper (per-call deferred; records input + signal; rejects `TaskError('cancelled')` on abort, immediately if pre-aborted; bounded `settled(2000)` failing `run() not settled — orphaned`); add helpers: `roleOf(call)` (by the role name in the prompt's first line), `answer(call)` returning `out-<writes>`, `count(node, event)`
- [X] T012 Add a table test in `test/trading-graph.test.ts`: `ROLES` has 8 rows, unique `node` and `writes`, `writes` covers all eight output keys once, and every `reads` entry is a key the contract allows for that role (static guard for INV-C)
- [X] T013 `npm run typecheck` passes with the new files while `src/graph/minimal-graph.ts` and its tests still exist and `npm test` passes with every Feature 002/003 suite still present and green (new Feature 004 tests add to the count) (INV-D)

---

## Phase 3: User Story 1 — full fixture workflow, deterministic (P1)

**Independent test**: `node --test test/trading-graph.test.ts` success tests.

- [X] T014 [US1] G1 in `test/trading-graph.test.ts`: auto-answer run → resolved state has all nine fields; each output field equals `out-<field>`; each of the eight roles has exactly one `start` event (SC-001, FR-009)
- [X] T015 [US1] G10 in `test/trading-graph.test.ts`: `model.logicalRequests === 8` (measured, bridge counter) = Σ `modelRequests` = number of `run()` calls; each call is exactly one `user`-role message; fallback = `run() calls − Σ modelRequests` = 0 (no fallback path); no assertion on provider invocations (SC-009, FR-010, FR-017)
- [X] T016 [US1] G16 in `test/trading-graph.test.ts`: News answers `''` → run completes; Bull's request contains the News-report label followed by an empty value (edge case: empty analyst output)

---

## Phase 4: User Story 2 — analyst independence, fan-out, fan-in (P1)

**Independent test**: fan-out/fan-in tests in `test/trading-graph.test.ts`.

- [X] T017 [US2] G2 in `test/trading-graph.test.ts`: Market request contains `M1`,`M2` sentinels and no `N` sentinel, no `out-` token; News request contains `N1`,`N2` and no `M` sentinel, no `out-` token (SC-003, FR-003)
- [X] T018 [US2] G3 in `test/trading-graph.test.ts`: with nothing released, both analyst requests exist and neither has resolved — graph-level submission only, no provider-parallelism wording (SC-002, FR-004)
- [X] T019 [US2] G4 (Market first) in `test/trading-graph.test.ts`: resolve Market, hold News, yield ticks → Bull `start` count 0 and no Bull request; resolve News → Bull `start` count 1 (SC-004, FR-005)
- [X] T020 [US2] G4 (News first) in `test/trading-graph.test.ts`: same with the order reversed (SC-004)

---

## Phase 5: User Story 3 — debate semantics (P1)

**Independent test**: Bull/Bear/Research Manager tests in `test/trading-graph.test.ts`.

- [X] T021 [US3] G5 in `test/trading-graph.test.ts`: Bull's request contains `out-marketReport`, `out-newsReport` and the "has not spoken yet" instruction, no M/N sentinels; Bear's request is issued only after Bull's `done` event and contains the actual `out-bullArgument` plus both report tokens, no M/N sentinels (SC-005, FR-006)
- [X] T022 [US3] Confirm `specs/004-browser-tradingagents-fixture-graph/contracts/graph.md` G5 row (synced during analysis: Bull + Bear provenance) matches the assertions written in T021
- [X] T023 [US3] G6 in `test/trading-graph.test.ts`: Research Manager's request contains `out-bullArgument` and `out-bearArgument`; contains neither `out-marketReport` nor `out-newsReport` nor any M/N sentinel (SC-006, FR-007)

---

## Phase 6: User Story 4 — downstream provenance (P1)

**Independent test**: Trader/Risk/Final tests in `test/trading-graph.test.ts`.

- [X] T024 [US4] G7 in `test/trading-graph.test.ts`: Trader's request is issued after Research Manager `done`; contains `out-researchDecision` and `out-marketReport`; contains none of `out-newsReport`, `out-bullArgument`, `out-bearArgument`, M/N sentinels (SC-007, FR-007, FR-008)
- [X] T025 [US4] G8 in `test/trading-graph.test.ts`: Risk Reviewer's request is issued after Trader `done`; contains `out-traderPlan`, `out-researchDecision`, `out-marketReport`, `out-newsReport`; contains neither Bull/Bear tokens nor M/N sentinels (SC-007)
- [X] T026 [US4] G9 in `test/trading-graph.test.ts`: Final Decision's request is issued after Risk Reviewer `done`; contains `out-riskReview`, `out-researchDecision`, `out-traderPlan`; contains none of the report tokens, Bull/Bear tokens, M/N sentinels; `finalDecision` equals `out-finalDecision` (SC-007, SC-008)

---

## Phase 7: User Story 5 — cancel and fail safely, deterministic (P2)

**Independent test**: cancel/failure tests in `test/trading-graph.test.ts`.

- [X] T027 [US5] G11 (**Regression A**) in `test/trading-graph.test.ts`: every `run()` received a signal (not `undefined`) and each aborts when the caller aborts (FR-013)
- [X] T028 [US5] G12 (C1) in `test/trading-graph.test.ts`: both analyst requests in flight → abort → `invoke` rejects; **separately** `await settled(2000)` → both runs `TaskError('cancelled')`; Bull, Bear, Research Manager, Trader, Risk Reviewer, Final Decision `start` = 0; no `finalDecision` (SC-011, FR-014)
- [X] T029 [US5] G13 (C2) in `test/trading-graph.test.ts`: auto-answer every role except Trader (held); wait (bounded, ≤ 2 s) until Trader's `run()` call is observed → abort → `invoke` rejects; separately `settled(2000)` → Trader run `cancelled`; Risk Reviewer and Final Decision `start` = 0; no `finalDecision` (SC-011, FR-014)
- [X] T030 [US5] G14 (F1) in `test/trading-graph.test.ts`: News `run()` rejects `err = new TaskError('failed', …)` while Market is held → first assert `invoke` rejects with `e === err`; Bull…Final `start` = 0; then release Market (resolve its call if still pending) and `settled(2000)`; record Market's outcome (`done` or `cancelled`) with `t.diagnostic` — not asserted (SC-010, FR-015)
- [X] T031 [US5] G15 (F2) in `test/trading-graph.test.ts`: auto-answer every role except Trader, whose `run()` rejects `TaskError('failed')` (fake-runtime control by role, no prompt marker) → same error object at the caller; Risk Reviewer and Final Decision `start` = 0; the five earlier roles (Market, News, Bull, Bear, RM) have one `done` each (observation) (SC-010, FR-015)
- [X] T032 [US5] Regression A mutation (not committed): (1) record passing state; (2) copy `src/graph/trading-graph.ts` to the scratchpad; (3) remove `{ signal: config.signal }` from the node's `model.invoke`; (4) run `node --test test/trading-graph.test.ts` → expect G11 fail (no signal) and G12/G13 fail with `run() not settled — orphaned`, finishing without a hang; (5) restore from the copy, `cmp` identical; (6) rerun → all pass; (7) record in `specs/004-browser-tradingagents-fixture-graph/verification.md`
- [X] T033 Static check recorded in `verification.md`: `grep -rnE "from ['\"]@langchain/langgraph['\"]" src test e2e` = 0; `grep -rn "akarisp" src/graph` = 0; `grep -rnE "Send|addConditionalEdges|checkpointer|retryPolicy|SystemMessage|structuredOrFreeText|bindTools|fetch\(" src/graph` = 0
- [X] T034 **Checkpoint A gate**: `npm run typecheck`, `npm test` pass; record exact counts (Feature 002 19 + Feature 003 old suites still present + Feature 004 deterministic) in `verification.md`

---

## Phase 8: Node integration — Checkpoint B (US1, US2, US5)

**Evidence class**: `NODE_INTEGRATION (stand-in)` — not browser, not Prompt API evidence.

- [X] T035 Create `test/trading-graph-integration.test.ts`: header with the evidence class; copy the Feature 003 owner helper (one `createRuntime({ limit: 1, queueCapacity: 32 })` per test, one `AkariChatModel`, `buildTradingGraph`, `installStandIn`, `finally` resume → shutdown → uninstall), the `settled(runtime)` helper (`until` on `ready` 0/0, message `AkariSP work did not settle before shutdown`) and the bounded fan-out snapshot helper (after 2 bridge starts, poll ≤ 1 s for `active + queued === 2`)
- [X] T036 [US1] L1 in `test/trading-graph-integration.test.ts`: success; all eight result fields start with `stand-in reply to:`; `model.logicalRequests` 8; 8 bridge `done`; each role 1 execution; `settled(runtime)` → `{ready, 0, 0}` before shutdown (SC-001, SC-009, FR-012)
- [X] T037 [US2] L2 in `test/trading-graph-integration.test.ts`: `standin.hold()` → fan-out snapshot = `{ready, active 1, queued 1, limit 1, queueCapacity 32}` (measured, `t.diagnostic` with poll ms); resume; success; settled (SC-013, FR-004)
- [X] T038 [US5] L3 (**Regression B**) in `test/trading-graph-integration.test.ts`: in the L2 state abort → `invoke` rejects, no result; **before** shutdown `settled(runtime)`; both bridge requests `errorKind: cancelled`; Bull…Final 0; then shutdown → `closed 0/0` (SC-011, SC-012, FR-016)
- [X] T039 [US5] L4 in `test/trading-graph-integration.test.ts`: `onNode` calls `standin.hold()` on the Trader `start` event; wait (bounded, ≤ 2 s) until `standin.waitingPrompts() === 1` → abort → rejects; Trader request `cancelled`; the five earlier roles (Market, News, Bull, Bear, RM) `done`; Risk/Final 0; `settled(runtime)` before shutdown (SC-011, SC-012)
- [X] T040 [US5] L5 in `test/trading-graph-integration.test.ts`: input copy with `STANDIN_FAIL` appended to `newsFacts` → rejects `TaskError` code `failed`; Bull…Final 0; `snapshot().state === 'ready'`; `settled(runtime)` before shutdown; Market's outcome only as `t.diagnostic` (SC-010, SC-012)
- [X] T041 L6 in `test/trading-graph-integration.test.ts`: success → `settled(runtime)` → `shutdown()` twice → `closed 0/0` (lifecycle only; never used as L3–L5 cleanup evidence)
- [X] T042 Regression B mutation (not committed): copy `test/trading-graph-integration.test.ts`; insert `await runtime.shutdown()` before `settled(runtime)` in L3; run → L3 fails `AkariSP work did not settle before shutdown`; restore, `cmp` identical, rerun pass; record in `verification.md`
- [X] T043 **R7 guarantee audit**: in `verification.md`, fill the research.md R7 matrix with the actual passing test names for every Feature 003 guarantee (fan-out, fan-in both orders, independence, sequence, accounting, signal forwarding + mutation, cancel with separate settlement, failure same error, runtime reuse, active 1/queued 1, pre-shutdown ready 0/0 + mutation, shutdown); browser rows are filled in T053 (after T051). No row may be empty before the retirement task T054
- [X] T044 **Checkpoint B gate**: `npm run typecheck`, `npm test` pass; record counts in `verification.md`

---

## Phase 9: User Story 1 — canonical app migration and browser automated — Checkpoint C (P1)

- [X] T045 [US1] Edit `index.html`: replace the four node rows with eight rows `<td id="node-<node>">waiting</td>` labelled Market Analyst, News Analyst, Bull Researcher, Bear Researcher, Research Manager, Trader, Risk Reviewer, Final Decision (FR-019)
- [X] T046 [US1] Edit `src/main.ts`: import `buildTradingGraph`, `ROLES` from `./graph/trading-graph.ts` and `FIXTURE` from `./graph/trading-fixture.ts`; `NODES` = `ROLES.map(r => r.node)`; `feature: '004-browser-tradingagents-fixture-graph'`; `prompts: 'src/graph/trading-graph.ts'`; `graph: { version: 'tradingagents-fixture-graph@1', topology: <contracts/evidence.md string>, entry: '@langchain/langgraph/web' }`; owner code (per-run runtime/model/controller, fan-out poll, settle-before-shutdown, `createRuntime` failure path, Run disabled while running, Cancel + 180 s watchdog on the same controller) unchanged (FR-012, FR-019)
- [X] T047 [US1] Edit `src/main.ts` evidence: `nodes.<node>` gains `reads` from `ROLES`; `result` holds the eight role fields on success; `timing.graphMs` = wall time of `graph.invoke`; result line shows `finalDecision` (FR-017, FR-021)
- [X] T048 [US1] Update `e2e/app.spec.ts` test (a): `/?provider=standin` → eight nodes `{status: done, executions: 1, modelRequests: 1}` with `reads` arrays; `logicalRequests` 8, `fallbackRequests` 0, `providerInvocations` NOT EXPOSED; `fanOutSnapshot.snapshot` ⊇ `{ready, 1, 1}`; `settledBeforeShutdown` true, before `{ready,0,0}`, after `closed`; `graph.version`, `fixture` `tradingagents-fixture@1`; `result.finalDecision` truthy; `timing.graphMs` number; availability ≠ `MODEL_AVAILABLE`; write record to `testInfo.outputPath` (SC-015, FR-020)
- [X] T049 [US5] Update `e2e/app.spec.ts` test (b) (analyst-phase cancel): hold → wait runtime `data-active 1`/`data-queued 1` → Cancel → resume → `outcome: cancelled`, no `result`, `bullResearcher`…`finalDecisionMaker` `waiting`, both model requests `cancelled`, `settledBeforeShutdown` true with `snapshotBeforeShutdown {ready,0,0}`, after `closed` (SC-011, SC-012, SC-015)
- [X] T050 [US1] Keep `e2e/app.spec.ts` (c) native BLOCKED (eight nodes `waiting`) and (d) `createRuntime` failure (`failed`, no `result`, Run re-enabled); add (e) repeated run: Run → done → Run again → second record `success`, `logicalRequests` 8 (a shared model would read 16), `nodeEvents[0].seq` 1, its own `settledBeforeShutdown` true — the first runtime is closed, so success proves a new runtime (edge case: repeated Run)
- [X] T051 Regression B mutation on `src/main.ts` (not committed): copy; move `await runtime.shutdown()` before the settle poll; `e2e/app.spec.ts` (a),(b) fail (`settledBeforeShutdown` false); restore, `cmp`, `npm run test:browser` pass; record in `verification.md`
- [X] T052 **R7 audit completion — browser rows**: in `specs/004-browser-tradingagents-fixture-graph/verification.md` fill the browser rows of the research.md R7 matrix with the passing tests from T048–T051: canonical success (a), analyst-phase cancel (b), native BLOCKED (c), `createRuntime` failure (d), repeated run (e), `src/main.ts` Regression B mutation (T051); completion: every R7 row (deterministic, Node, browser) names a passing test
- [X] T053 **Retire Feature 003 current sources — only after T034, T044 and T048–T051 pass and T043 + T052 leave no empty R7 row**: delete `src/graph/minimal-graph.ts`, `src/graph/fixture.ts`, `test/minimal-graph.test.ts`, `test/graph-integration.test.ts`; `grep -rn "minimal-graph\|graph/fixture" src test e2e` = 0; Feature 003 `specs/` and evidence untouched (source removal ≠ evidence change)
- [X] T054 Update `docs/testing.md` test table: `test/trading-graph.test.ts`, `test/trading-graph-integration.test.ts`, canonical app = eight-role fixture graph
- [X] T055 **Checkpoint C gate**: `npm run typecheck`, `npm run build` (`dist/index.html` only), `npm test`, `npm run test:browser` (app 5 + harness 2); record counts in `verification.md`; the post-retirement re-run catches dangling imports → Implementation status COMPLETE; Feature status not complete

---

## Phase 10: Native gate — Checkpoint D (US1)

- [X] T056 [US1] Update the canonical test in `e2e/prompt-api.spec.ts`: assert the eight role nodes `done`, `result.finalDecision` truthy, class/provider/availability/runner/`success`/`settledBeforeShutdown` as before; no assertion on wording or on `logicalRequests` value (validated in T059)
- [ ] T057 **MANUAL / APPROVAL — do not auto-check.** With the maintainer's approval, commit the Feature 004 implementation to `004-browser-tradingagents-fixture-graph` (no push unless asked; exclude `.claude/`, `.specify/*` tooling, `CLAUDE.md`), then confirm `git status --porcelain -- index.html src test harness e2e package.json package-lock.json vite.config.ts` is empty
- [ ] T058 **MANUAL — do not auto-check.** At the clean revision, run the native gate in installed Google Chrome with `MODEL_AVAILABLE`: `npm run test:prompt-api` (runner `playwright`) or `npm run dev` → `/` → Run Graph (runner `manual`); supply the canonical record. Model unavailable → supply the `BLOCKED` record. Stand-in results never substitute
- [ ] T059 [US1] Validate the supplied record against contracts/evidence.md: `REAL_BROWSER_PROMPT_API`, `native`, `MODEL_AVAILABLE`, revision = the T057 commit without `+dirty`, versions, `tradingagents-fixture@1`, `tradingagents-fixture-graph@1`, `runtimeOptions {1,32}`, eight nodes `done` in contract order, `logicalRequests`/`fallbackRequests` as measured (expected 8/0; a different value is kept and investigated), NOT EXPOSED, `settledBeforeShutdown` true, `result.finalDecision` present; record `timing.graphMs` — if > 90 000 ms record a watchdog-review observation (the 180 s watchdog is not changed); save as `specs/004-browser-tradingagents-fixture-graph/evidence/real-browser-<date>-<sha>.json` (SC-016)

---

## Phase 11: Polish — Checkpoint E (audit, coverage, completion)

Do not start T064 before T059 is PASS or the spec-defined BLOCKED state.

- [ ] T060 Findings review in `verification.md` (spec finding format; expected none); observations O-1/O-2 carried; plain-text A11 deviation and A4 tool simplification restated as adaptations, not findings
- [ ] T061 Clean verification at the T057 commit (copy test (a)'s record to `evidence/browser-automated-<date>-<sha>.json`, clean revision): `npm ci`, `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser`, `npm ls akarisp @langchain/core @langchain/langgraph`; record exact counts and versions (SC-021)
- [ ] T062 Static audit in `verification.md`: dependencies unchanged vs T002; `git diff 4627c73 -- src/integration` empty; AkariSP changes 0; root LangGraph entry imports 0; `fetch(`/URLs/API keys/proxy in `src/` 0; tools, RAG, checkpoint, memory 0; classes / `*Runtime` / `*Registry` / `*Engine` / `*Pool` in `src/` 0; Sentiment/Fundamentals analysts, multi-round debate, three-person risk debate 0; Feature 005 work 0; one canonical `index.html`; FR-024 audit: in `test/` and `e2e/`, assertions on model output reference only fake tokens (`out-*`), the `stand-in reply to:` prefix, fixture sentinels or presence/non-emptiness — never wording, decisions or quality (FR-024, SC-014, SC-017–SC-019, FR-011, FR-023)
- [ ] T063 Re-hash `specs/001…`, `specs/002…`, `specs/003…`, `harness/` and compare with T003 → all identical (FR-022, SC-020); note that the T053 source deletions are outside these paths
- [ ] T064 Requirement coverage table in `verification.md`: FR-001…FR-025 and SC-001…SC-021, each → task(s) + evidence (test name, record file or static check); no documentation-only row
- [ ] T065 [P] Update `docs/roadmap.md`: Feature 004 status and carry-overs (A11 deviation, A4 simplification); Feature 005 = real market/news data boundary
- [ ] T066 Completion record at the end of `verification.md`: revision, versions, graph/fixture ids, import surface, AkariSP changes 0/0, external data 0, tool calling 0, gate results per layer, provenance per role verified, fan-out/fan-in, C1/C2, F1/F2, Regression A/B, orphaned work 0, logical/fallback requests (observed), provider invocations NOT EXPOSED, native concurrency NOT CLAIMED, `timing.graphMs`, Implementation status, Real-provider validation, Feature status per spec Completion Model

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T005)
  → Phase 2 (T006–T013)
  → Phases 3–7 deterministic (T014–T034)         = Checkpoint A
  → Phase 8 Node integration (T035–T044)         = Checkpoint B
  → Phase 9 app + browser + retirement (T045–T055) = Checkpoint C (implementation complete)
  → Phase 10 native gate (T056–T059; T057/T058 MANUAL) = Checkpoint D
  → Phase 11 (T060–T066)                         = Checkpoint E
```

- US1–US5 deterministic tests share `test/trading-graph.test.ts` → sequential, no [P].
- T032 needs T027–T029; T042 needs T038; T051 needs T046–T049; T052 needs T043, T048–T051; T053 needs T034, T044, T052; T059 needs T057–T058; T064/T066 need T059.

## Parallel Opportunities

- T065 (`docs/roadmap.md`) ‖ T060–T064 — the only [P] task.
- Everything else shares a file (`src/graph/trading-graph.ts`, `test/trading-graph.test.ts`,
  `test/trading-graph-integration.test.ts`, `src/main.ts`, `e2e/app.spec.ts`) or depends on the
  behavior of the preceding task (T007–T010 import the fixture type from T006).

## Implementation Strategy

1. Checkpoint A: role provenance, fan-out/fan-in, ordering, cancel, failure, Regression A — no
   runtime, no browser. Old Feature 003 suites stay green alongside.
2. Checkpoint B: real AkariSP backpressure and settlement (Regression B).
3. Checkpoint C: switch the canonical app, prove it in the browser, then retire Feature 003 sources.
4. Checkpoint D: one native eight-role success at a clean, approved commit.
5. Checkpoint E: audit, coverage, completion.

## Notes

- AkariSP modification tasks: 0. Dependency tasks: 0. Feature 005 tasks: 0.
- No task asserts model wording or investment quality; no task infers provider invocations or
  native parallelism.
- Mutation checks (T032, T042, T051) are run and reverted; only results are committed.
