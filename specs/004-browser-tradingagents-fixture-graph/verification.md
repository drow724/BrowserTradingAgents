# Verification: Feature 004 — Browser TradingAgents Fixture Graph

Running record for tasks.md. Values are measured, not expected.

## Checkpoint A0 — baseline and historical protection (2026-09-28)

### T001 Baseline

- Branch `004-browser-tradingagents-fixture-graph`, HEAD `4627c738be176b9b714337e5f9c0c62c038562a1`
  (= `origin/main`, Feature 003 merged).
- `git status --short`: untracked only — `specs/004-browser-tradingagents-fixture-graph/` (planning
  documents, uncommitted) and unrelated Spec Kit/Claude tooling (untouched).
- Node `v23.9.0`, npm `10.9.2`.

### T002 Dependencies

`npm ls`: `akarisp@0.1.0-alpha.2`, `@langchain/core@1.2.13` (single, deduped),
`@langchain/langgraph@1.4.18`. `package.json` dependencies: `@langchain/core 1.2.13`,
`@langchain/langgraph 1.4.18`, `akarisp 0.1.0-alpha.2`.

### T003 Historical baseline (`shasum -a 256`, 33 files: specs/001 5, specs/002 13, specs/003 13, harness 2)

```text
791971c27ab834f44075697eeae5af3a4997163f78e2cb6b4b219ec8b1ec67f0  harness/index.html
d9ec9319b249d39b6fb37c38f3be7dfebac0a7a92ce8b11df3bdcdff2a9651e6  harness/main.ts
1532dc6476e7abff69d1d7293ed6706012e26b5340e5be5004a350a896430703  specs/001-tradingagents-reference-analysis/checklists/requirements.md
714ec8e5ff479bd9d351ca637f8f052298f118bf762e6ca5bc24cf72714f0981  specs/001-tradingagents-reference-analysis/plan.md
324b1361ad829cc120e1d4c0424cdba58379a129b3f887c62d74ee9bd452ddea  specs/001-tradingagents-reference-analysis/research.md
3878b0af91dc8b2def895178895fb75b59be43bbf30061903e80684b4a35bdb8  specs/001-tradingagents-reference-analysis/spec.md
acd8ba84ced817211910af3ec38154c16e554ddd8fb5e130cd19b173359ee50b  specs/001-tradingagents-reference-analysis/tasks.md
d4bec122fb9207335858bad2399bd6ac64a6bd899fb6485e4194945d5c309b3d  specs/002-langchain-akarisp-integration-validation/checklists/requirements.md
87940542f59477aef2d08341b83d441b0ca97c9480d8ad5cd9578da5aa76babf  specs/002-langchain-akarisp-integration-validation/contracts/bridge.md
a355f02926cdd347fde02bc38d6bc8b31ff452cba8e559783df19b8ccf38aac6  specs/002-langchain-akarisp-integration-validation/contracts/evidence.md
4f52433f3d1ac403a1dddbddf766b4d6eb244b9d73a7a19a660bf6a8ea5cce48  specs/002-langchain-akarisp-integration-validation/data-model.md
7dd24a07d61a60608d9f48fb6e18cfc3cc07082242a4b6d9666820ab87a037e9  specs/002-langchain-akarisp-integration-validation/evidence/browser-automated-2026-09-28.json
8cbc3c573d48277bc9bcf89860a8c5d59e352cdabaa56efff49d402db042a292  specs/002-langchain-akarisp-integration-validation/evidence/real-browser-2026-09-28-ce3f946.json
e62c9a7d1daa055039759254279fba89ede46e693589f5551db633c7dc6225db  specs/002-langchain-akarisp-integration-validation/evidence/real-browser-2026-09-28.json
f2e8a366503840eac54c3bf8898d1a69560cb7c7806e65365f9541507ff1a949  specs/002-langchain-akarisp-integration-validation/plan.md
9ae780e47a9ff8d79ec07870aac6db716e555f274a377f479cd653071cba0bea  specs/002-langchain-akarisp-integration-validation/quickstart.md
9d95802b184ded45e464169643a85846a8095fd4e83666dde78933f5e23f7c96  specs/002-langchain-akarisp-integration-validation/research.md
a6a06bd042e8a42fa83771759ec8b7df915f8fedb393ba1af8b890369b5872df  specs/002-langchain-akarisp-integration-validation/spec.md
406c3ae54c0bc8711a9f1dc5dc01f4d3ea8f77146c1f90bfff581733afa88be5  specs/002-langchain-akarisp-integration-validation/tasks.md
80e396313a5f637002dc4787eaca358a57acc765630dc30cf6c9561fa5f77291  specs/002-langchain-akarisp-integration-validation/verification.md
0d14cfc25fb8eb805991d3d3d93f02b2164efe95014a87bab06bdbfd923723b4  specs/003-langgraph-akarisp-minimal-graph/checklists/requirements.md
4fabebf3b0d97d45c6de8258fc3e6cbfb0ffec951651683bdf0d613dd1fec8a9  specs/003-langgraph-akarisp-minimal-graph/contracts/evidence.md
f18ecc6a28387fcb39889b8e11ee2d4910cab5d75c4151a52a7c2664defef175  specs/003-langgraph-akarisp-minimal-graph/contracts/graph.md
d29e4634760eebc5f5605ce17056e0c07009b72406abe7b3bab33530d4c0e1f8  specs/003-langgraph-akarisp-minimal-graph/data-model.md
2c83260d0f1cff02edc9d45b554507969df59285ca5a087c4c363852ca4579ff  specs/003-langgraph-akarisp-minimal-graph/evidence/browser-automated-2026-09-28-4e64472.json
1c3306adc44aed0f6388a50491682ff42fa56477006df9cfb172c2896429cc67  specs/003-langgraph-akarisp-minimal-graph/evidence/browser-automated-2026-09-28.json
84ec0eb5818668d918730881766c48b61e7c95c202e5990ea0690c77747d00ab  specs/003-langgraph-akarisp-minimal-graph/evidence/real-browser-2026-09-28-4e64472.json
99949901743079a57c010e4d352b41782736f965c7518c5f5fce248dbbf6e11b  specs/003-langgraph-akarisp-minimal-graph/plan.md
bc3f94673136f7c33d00896e50760bb3d62dcbfb730f15753874adddb00f00f7  specs/003-langgraph-akarisp-minimal-graph/quickstart.md
bb9efa0b97ae6875153cdd6555d2391e4ae0fd6f892caed2e2517a7dc0029376  specs/003-langgraph-akarisp-minimal-graph/research.md
cc5a442da0c2aa0de0d67fab101cd9073d3ac6b3090659ffa65aa75c7065bc7a  specs/003-langgraph-akarisp-minimal-graph/spec.md
71e66b39b0d1d3c0c54921f854ac522d71e054fa5fddd23a127188e32b258017  specs/003-langgraph-akarisp-minimal-graph/tasks.md
035b02aefbe56658b81861f1863e23f14b6cb1dd7918e6ef137af4339654b7e7  specs/003-langgraph-akarisp-minimal-graph/verification.md
```

### T004 Feature 003 baseline gates

- `npm run typecheck`: PASS
- `npm run build`: PASS (`dist/index.html`, `index-*.js` 917.95 kB, `standin-*.js` 0.92 kB; chunk-size warning)
- `npm test`: 36 tests, 36 pass, 0 fail
- `npm run test:browser`: 6 passed

### T005 Replacement targets (pre-change)

`index.html` has 4 node rows; `src/main.ts` imports `buildMinimalGraph` from `./graph/minimal-graph.ts`;
`e2e/app.spec.ts` has 4 tests; `e2e/prompt-api.spec.ts` canonical test asserts 4 nodes.

```text
6185b4febc16a59b6dd0a5a620560a97d4070867c2ba2a97a6fead8fced8c50d  src/graph/minimal-graph.ts
d385c97efdf4c4e4ac70e80bd41df7eb97861a8b7e7ab8e4711a688efc39c5b6  src/graph/fixture.ts
271163b9edaaf6b4acc0032089479f1f852c3eb302441d196d7e5246e7985e03  test/minimal-graph.test.ts
24c019bd9ab022ba012aeec5e52e4d8c9c065dafe5febfdcf2519aba417d3cf2  test/graph-integration.test.ts
f8720f2b731382b284ff61c6cb7f6fd30f4664045b6665ef7daa1e7d9d879d1e  index.html
6088161796660296c0496e857635524af4ac60b1a80f7772f6bc5e9b87b0156a  src/main.ts
00bfd26b26f902b3ae62e80d0104b5acc5139af4b2f08f9281ea4ae57d360853  e2e/app.spec.ts
4deacc5200682e102e7b3237cc29a38126b4e7d45a5a20bd8c3a0bd1e1ee4801  e2e/prompt-api.spec.ts
```

**Checkpoint A0**: PASS. Feature 003 baseline reproducible; history hashed; dependencies unchanged.

## Checkpoint A — fixture, role table, graph, deterministic proof (2026-09-28)

Evidence class: `DETERMINISTIC_TEST` (real LangGraph `/web` → real `AkariChatModel` → fake `Runtime`).

### Files

- Added: `src/graph/trading-fixture.ts` (`tradingagents-fixture@1`, subject `Northwind Lamps Ltd.
  (fictional)`, facts tagged `(market fact M1|M2)`, `(news fact N1|N2)`); `src/graph/trading-graph.ts`
  (`Annotation.Root` with `input` + 8 role fields, no reducer; `ROLES` table = node, label, writes,
  reads, ask; one node helper whose prompt is `ask` + one labelled line per `reads` key; explicit
  `{ signal: config.signal }`; static edges incl. barrier `[marketAnalyst, newsAnalyst] →
  bullResearcher`); `test/trading-graph.test.ts`.
- Unchanged and still present (INV-D): `src/graph/minimal-graph.ts`, `src/graph/fixture.ts`,
  `test/minimal-graph.test.ts`, `test/graph-integration.test.ts`; `src/integration/*` (diff empty).

### Results — `node --test test/trading-graph.test.ts`: 18 tests, 18 pass

| Test | Result |
|---|---|
| role table — 8 rows, unique nodes/outputs, `reads` equal to the contract per role | PASS |
| G1 — nine fields filled, each output `out-<field>`, each role 1 execution | PASS |
| G10 — `logicalRequests` 8 = Σ node requests = `run()` calls; fallbacks 0 (no path); each call one `user` message | PASS |
| G16 — News `''` → run completes; Bull request has `News report: ` (empty) | PASS |
| G2 — Market: M1, M2, subject; no N1/N2, no `out-`. News: N1, N2; no M1/M2, no `out-` | PASS |
| G3 — both analyst requests submitted, neither resolved | PASS |
| G4 ×2 — Market first / News first: Bull 0 while the other is held, then 1 | PASS |
| G5 — Bull: `out-marketReport`, `out-newsReport`, "has not spoken yet"; no sentinels, no Bear token; no Bear request while Bull unresolved; Bear starts after Bull `done` and contains Bull's actual output (`bull-said-7f3a`) + both reports; no sentinels | PASS |
| G6 — Research Manager: Bull + Bear tokens; no report tokens, no sentinels | PASS |
| G7 — Trader after RM; `out-researchDecision` + `out-marketReport`; no news report, Bull/Bear, sentinels | PASS |
| G8 — Risk Reviewer after Trader; trader plan, research decision, both reports; no Bull/Bear, sentinels | PASS |
| G9 — Final Decision after Risk; risk review, research decision, trader plan; no reports, Bull/Bear, sentinels; `finalDecision` = `out-finalDecision` | PASS |
| G11 — every `run()` got a signal; all aborted with the caller | PASS |
| G12 — analysts in flight, abort → rejects, no result; then bounded settle: both `cancelled`; 6 downstream roles 0 | PASS |
| G13 — waited for Trader's `run()` (≤ 2 s) → abort → rejects, no result; Trader `cancelled`; Risk/Final 0 | PASS |
| G14 — News rejects → same error object; 6 downstream 0; Market released explicitly then settled; observed Market outcome: `cancelled` (LangGraph aborted the sibling) — recorded only | PASS |
| G15 — Trader rejects (injected by role in the fake, no prompt marker) → same error; Risk/Final 0; 5 earlier roles `done` | PASS |

T022: contracts/graph.md G5 row matches the G5 assertions above.
Provider invocations: NOT EXPOSED. Native concurrency: not observed.

### T032 Regression A mutation (not committed)

`{ signal: config.signal }` removed from `src/graph/trading-graph.ts` line 82 (copy in the session
scratchpad) → 18 tests, 15 pass, **3 fail** in ~5 s (no hang): G11 `marketAnalyst: run() received no
AbortSignal`; G12 and G13 `run() not settled — orphaned`. Restored from the copy (`cmp` identical,
forwarding present ×1) → 18/18. Mutation residue: none.

### T033 Static checks

Root LangGraph entry imports in `src test e2e`: 0. `akarisp` in `src/graph`: 0. In `src/graph`:
`Send`, conditional edges, checkpointer, `retryPolicy`, `SystemMessage`, `structuredOrFreeText`,
tools, `fetch(`, URLs, `JSON.stringify`, `Object.values(state…)`: 0. Deferred roles (sentiment,
fundamentals, risk personas, portfolio): 0.

### T034 Checkpoint A gate

`npm run typecheck`: PASS. `npm test`: 54 tests, 54 pass, 0 fail (Feature 002 19 + Feature 003
deterministic 12 + Feature 003 Node integration 5 + Feature 004 deterministic 18).

**Checkpoint A**: PASS. AkariSP production/API changes 0/0. Findings: none.

## Checkpoint B — Node integration (2026-09-28)

Evidence class: `NODE_INTEGRATION (stand-in)` — real LangGraph (`/web`) → real role graph → real
`AkariChatModel` → real `akarisp@0.1.0-alpha.2` (`limit 1, queueCapacity 32`) → stand-in
`globalThis.LanguageModel`. **Not browser evidence, not Prompt API evidence.** Role provenance is not
repeated here (proven by G1–G16).

Pre-B: HEAD `4627c73` (no commit; working tree preserved); typecheck PASS; `npm test` 54/54.

### File

`test/trading-graph-integration.test.ts` (new; Feature 003 `test/graph-integration.test.ts` kept).
Owner helper creates exactly one runtime and one model per test; `settled(runtime)` = bounded 2 s
wait for `{ready, 0, 0}`, never calls shutdown; bounded ≤ 1 s fan-out poll.

### Results — 6 tests, 6 pass

| Test | Result |
|---|---|
| L1 — eight result fields `stand-in reply to: …`; each role `done` once; bridge starts 8, ends 8×`done`; `model.logicalRequests` 8 (measured); fallbacks = requests − role executions = 0; before shutdown `{ready, 0, 0}` | PASS |
| L2 — hold; after 2 bridge starts, poll → `fanOutSnapshot {ready, active 1, queued 1, limit 1, queueCapacity 32}` after 0 ms; resume → success → settled | PASS |
| L3 — abort at the fan-out state → caller rejects, no result; **separately** settled `{ready,0,0}` before shutdown (stand-in still held); bridge outcomes `[error:cancelled, error:cancelled]`; Bull…Final 0; then shutdown → `closed 0/0` | PASS |
| L4 — hold on Trader `start`; `waitingPrompts() === 1` observed after 16 ms (bounded 2 s); abort → rejects, no result; settled before shutdown; bridge outcomes 5×`done` (Market, News, Bull, Bear, RM) + Trader `error:cancelled`; Risk/Final 0 | PASS |
| L5 — `STANDIN_FAIL` in `newsFacts` (stand-in rejects with a plain `Error`) → caller `TaskError` code `failed`; Bull…Final 0; runtime `ready` (not broken); settled before shutdown. Observation: Market `done` | PASS |
| L6 — success → settled → `shutdown()` ×2 → `closed 0/0` (lifecycle only; not used as L3–L5 cleanup evidence) | PASS |

Documentation correction during B (not a finding): contracts/graph.md L4, tasks.md T031/T039 said "6"
earlier roles; five roles precede Trader (Market, News, Bull, Bear, Research Manager). Test and
documents now say five.

Provider invocations: NOT EXPOSED. Native concurrency: not observed. One runtime per graph run:
structural (the owner makes one `createRuntime` call; all 8 bridge requests use its one model).

### T042 Regression B mutation (not committed)

1. Baseline 6/6. 2. Copy to scratchpad; insert `await runtime.shutdown()` before `settled(runtime)` in
L3. 3. Run → 5 pass, **1 fail**: L3 `timed out waiting for AkariSP work did not settle before
shutdown` (runtime `closed`, `ready 0/0` unobservable). 4. Restored; `cmp` identical; `MUTATION`
marker 0. 5. Rerun 6/6. Residue: none.

### T043 R7 guarantee audit (deterministic + Node rows)

| Feature 003 guarantee | Feature 004 replacement (passing) |
|---|---|
| fan-out submission | G3 (`trading-graph.test.ts`); L2 |
| fan-in barrier, both orders | G4 (marketAnalyst first), G4 (newsAnalyst first) |
| branch independence | G2 (sentinels) |
| join consumes both | G5 (Bull reads both reports; Bear reads both + Bull's actual output) |
| sequence + dependency | G5, G6, G7, G8, G9 |
| final state / accounting | G1, G10; L1 |
| explicit signal forwarding (Regression A) | G11 + T032 mutation (G11 no signal; G12/G13 orphaned) |
| cancellation, settle separately | G12 (analysts), G13 (Trader) |
| failure, same error, sibling | G14 (News; Market released then settled), G15 (Trader) |
| real runtime reuse, 1/1 fan-out | L1, L2 |
| cancel settles before shutdown (Regression B) | L3, L4 + T042 mutation |
| failure settles, runtime ready | L5 |
| shutdown idempotent | L6 |
| one graph run = one runtime | L1 (owner structure; 8 requests on one model) |
| browser success / cancel / BLOCKED / createRuntime failure / repeated run; `main.ts` Regression B | **T052 (after T048–T051)** |

Deterministic and Node rows: complete. Browser rows: pending T052 (by design).

### T044 Gate

`npm run typecheck`: PASS. `npm test`: 60 tests, 60 pass, 0 fail (Feature 002 19 + Feature 003 12 + 5
+ Feature 004 deterministic 18 + Node integration 6). `git diff --stat -- src/integration`: empty.
Feature 003 files still present: `src/graph/minimal-graph.ts`, `src/graph/fixture.ts`,
`test/minimal-graph.test.ts`, `test/graph-integration.test.ts`.

**Checkpoint B**: PASS. AkariSP production/API changes 0/0. Findings: none.

## Checkpoint C — canonical app, browser automated, retirement (2026-09-28)

Pre-C: HEAD `4627c73` (no commit); typecheck PASS; `npm test` 60/60.

### T045–T047 Canonical app

- `index.html`: eight role rows `node-<node>` (Market Analyst … Final Decision); result line
  "Final decision"; description notes the fictional fixture and no investment advice.
- `src/main.ts`: imports `buildTradingGraph`/`ROLES` and `trading-fixture.ts`; `NODES` from `ROLES`;
  `feature` 004, `prompts` `src/graph/trading-graph.ts`, `graph.version`
  `tradingagents-fixture-graph@1` + topology string; `nodes.<node>.reads` from `ROLES` (the same table
  that builds prompts — no second input map); `result` = the eight role fields on success;
  `timing.graphMs` = invoke start → caller settlement. Owner unchanged: per click one runtime
  (`limit 1, queueCapacity 32`), one `AkariChatModel`, one `AbortController`; Run disabled until
  availability is known and while running; Cancel and the 180 s watchdog (page protection only) abort
  the same controller; native default, stand-in only with `?provider=standin`.

### T048–T050 Browser automated — `BROWSER_AUTOMATED`, `provider: standin` (not Prompt API evidence)

`npm run test:browser`: 7 passed (app 5 + Feature 002 harness 2); `e2e/app.spec.ts` alone 3 more runs:
5/5 each.

| Test | Result |
|---|---|
| (a) success — 8 roles `{done, executions 1, modelRequests 1}` with `reads`; `logicalRequests` 8, `nodeExecutions` 8, `fallbackRequests` 0 (measured), `providerInvocations` NOT EXPOSED; `fanOutSnapshot {ready, 1, 1}` after 0 ms (backpressure, not native parallelism); `timing.graphMs` 90; before shutdown `{ready,0,0}`, `settledBeforeShutdown` true, after `closed 0/0`; `graph.version`, `fixture` `tradingagents-fixture@1`, langgraph 1.4.18; `#result` = `result.finalDecision` | PASS |
| (b) analyst-phase cancel — hold → runtime `active 1 / queued 1` → Cancel → `cancelled`, no `result`, Bull…Final `waiting`, both model requests `cancelled`, settled `{ready,0,0}` before shutdown, then `closed` | PASS |
| (c) native in Playwright Chromium — `BLOCKED`, `not-run`, reason contains availability, eight nodes `waiting`; no stand-in fallback | PASS |
| (d) `LanguageModel.create` rejects → `failed`, error "create failed", no `result`, Run re-enabled (no runtime created) | PASS |
| (e) two runs — run 1 `success`, runtime `closed`; run 2 `success`, `logicalRequests` 8 (a shared model would read 16), `nodeEvents[0].seq` 1, 16 node events (this run only), own settlement true, `closed` | PASS |

`timing.graphMs` 90 ms (stand-in) — far below the 90 s review threshold; watchdog unchanged at 180 s.

### T051 Regression B mutation on `src/main.ts` (not committed)

Baseline 7/7 → copy to scratchpad → `await runtime.shutdown()` inserted before the settle poll →
`e2e/app.spec.ts`: **3 fail** — (a) success, (b) cancel, (e) consecutive runs
(`settledBeforeShutdown` false / `snapshotBeforeShutdown.state` `closed`); (c), (d) pass (no runtime
lifecycle involved) → restored, `cmp` identical, `MUTATION` marker 0 → `npm run test:browser` 7/7.

### T052 R7 audit completion — browser rows

| Feature 003 guarantee | Feature 004 replacement (passing) |
|---|---|
| browser success on the canonical page | app (a) |
| browser cancellation, settled before shutdown | app (b) |
| native unavailable → BLOCKED, no fallback | app (c) |
| `createRuntime` failure surfaced, Run usable | app (d) |
| repeated run: new runtime and model per click | app (e) |
| `src/main.ts` shutdown ordering (Regression B, production) | T051 mutation (a, b, e fail) |

With T043 (deterministic + Node rows), every R7 row names a passing test. Empty rows: 0.

### T053 Retirement of Feature 003 current sources

Preconditions: T034 PASS, T044 PASS, T048–T051 PASS, T043 + T052 → no empty R7 row. Deleted
(`git rm`): `src/graph/minimal-graph.ts`, `src/graph/fixture.ts`, `test/minimal-graph.test.ts`,
`test/graph-integration.test.ts`. `grep -rn "minimal-graph\|graph/fixture" src test e2e` = 0.
`specs/001…`–`specs/003…` and `harness/` unchanged vs HEAD (source removal ≠ evidence change).
Post-retirement: typecheck PASS; `npm test` 43/43 (60 − 12 − 5 retired Feature 003 tests; their
guarantees are carried by the R7 rows above).

### T054 `docs/testing.md`

Test table lists `test/trading-graph.test.ts`, `test/trading-graph-integration.test.ts`; canonical app =
eight-role fixture graph. The `test:prompt-api` paragraph still describes the minimal graph — that
runner is adapted in T056.

### T055 Checkpoint C gate

| Command | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run build` | PASS — `dist/index.html` + `dist/assets/` only |
| `npm test` | 43/43 |
| `npm run test:browser` | 7/7 (app 5 + harness 2) |

Static scope: `src/integration/` diff 0; `package.json`/lockfile diff 0 (AkariSP source/API changes 0);
`fetch`/API key/axios in `src/` 0; no tools, RAG, generic framework, Feature 005 work.
Findings: none.

**Implementation status: COMPLETE.** Feature status: NOT YET COMPLETE —
`REAL_BROWSER_PROMPT_API` not run (T056–T059).

## Checkpoint D — native gate (T056–T059)

### T056 Native runner

`e2e/prompt-api.spec.ts` canonical test: eight role nodes `done`, `graph.version`
`tradingagents-fixture-graph@1`, `result.finalDecision` truthy; class/provider/availability/runner/
`success`/`settledBeforeShutdown` as before; no wording or `logicalRequests` assertion (T059). Harness
test and the Chrome launch unchanged. `docs/testing.md`: `test:prompt-api` runs one full eight-role
graph on `/`, native only. Regression: typecheck PASS, `npm test` 43/43, `npm run test:browser` 7/7.

Dirty smoke (SMOKE ONLY — not gate evidence): `npm run test:prompt-api -- -g "eight-role"` 1 passed
(47.1 s); record revision `4627c73…+dirty`, `MODEL_AVAILABLE`, `success`, 8/8/0/NOT EXPOSED,
`graphMs` 29 369, fan-out `{ready,1,1}`, before shutdown `{ready,0,0}`. Discarded; T058 reruns at the
clean T057 commit.

### T057 Commit (MANUAL / APPROVAL)

Maintainer approved (2026-09-28). Local commit `a0584fd` on `004-browser-tradingagents-fixture-graph`
(no push); `.claude/`, `.specify/*` tooling, `CLAUDE.md` excluded.
`git status --porcelain -- index.html src test harness e2e package.json package-lock.json vite.config.ts`
empty → the bundle revision is clean (untracked tooling is outside `vite.config.ts` code paths).

### T058 Native run (MANUAL)

`npm run test:prompt-api -- -g "eight-role"` at `a0584fd`: 1 passed (40.6 s). Installed Google Chrome
153.0.8010.53 (userAgent `HeadlessChrome/153.0.0.0`), headless, per-run clone of the golden profile,
runner `playwright`, provider `native`, availability `MODEL_AVAILABLE` (raw `available`).

### T059 Validation — `evidence/real-browser-2026-09-28-a0584fd.json` (byte-identical copy of the raw record)

| Contract field | Record | |
|---|---|---|
| `evidenceClass` / `provider` / `runner` | `REAL_BROWSER_PROMPT_API` / `native` / `playwright` | PASS |
| `environment.availability` | `MODEL_AVAILABLE` | PASS |
| `revision.browserTradingAgents` | `a0584fdcf03c52aa679eb5b8ffc3a9d8104222b7` (no `+dirty`) = T057 commit | PASS |
| versions | akarisp 0.1.0-alpha.2, core 1.2.13, langgraph 1.4.18 = `node_modules` | PASS |
| `fixture` / `graph.version` | `tradingagents-fixture@1` / `tradingagents-fixture-graph@1` | PASS |
| `runtimeOptions` | `{limit 1, queueCapacity 32}` | PASS |
| nodes | eight `done`, `executions 1`, `modelRequests 1`, `reads` present | PASS |
| event order | Market start, News start (both before either done) → both done → Bull → Bear → RM → Trader → Risk → Final (seq 1–16) | PASS |
| counts | `logicalRequests` 8, `fallbackRequests` 0 (measured), `providerInvocations` NOT EXPOSED | PASS |
| fan-out | `{ready, active 1, queued 1}` after 1 ms — graph fan-out + AkariSP backpressure, not native parallelism | observed |
| lifecycle | before shutdown `{ready,0,0}`, `settledBeforeShutdown` true; after `{closed,0,0}` | PASS |
| `outcome` / `error` / `result.finalDecision` | `success` / null / present (wording not evaluated) | PASS |
| `timing.graphMs` | 26 174 ms (< 90 000 — no watchdog-review observation; watchdog stays 180 s) | recorded |

SC-016: **PASS** (`REAL_BROWSER_PROMPT_API`). Findings: none. The T056 dirty smoke is not used.
Working tree after saving: dirty only by this evidence file, `verification.md` and `tasks.md`
(post-run; execution-time revision was clean).

## Checkpoint E — audit, coverage, completion (2026-09-28)

Repository: branch `004-browser-tradingagents-fixture-graph`, HEAD = implementation commit `a0584fd`;
working tree dirty only in `specs/004…/` (tasks, verification, evidence) and `docs/roadmap.md` —
post-run documentation, not code paths.

### T060 Findings review

**No Findings.** Carried observations (not findings): O-1 the `/web` entry does not pass the graph's
signal to models called in nodes → every node forwards `config.signal` (G11, T032); O-2 LangGraph
rejects the caller before in-flight work settles → settlement checked on a `ready` runtime before
`shutdown()` (L3/L4, app (b), T042/T051). Adaptations, not findings: A11 deviation — all eight role
outputs plain text, no structured fallback (8 logical requests); A4 simplification — no tools, facts
come from the fixture. The Checkpoint B L4 count correction (5 earlier roles, not 6) was a
documentation fix.

### T061 Clean verification at `a0584fd`

`npm ci` (0 vulnerabilities; `package-lock.json` unchanged) → typecheck exit 0 → build PASS
(`dist/index.html` + `dist/assets/`) → `npm test` 43/43 → `npm run test:browser` 7/7 →
`npm ls`: `akarisp@0.1.0-alpha.2`, `@langchain/core@1.2.13` (single copy, all others `deduped`),
`@langchain/langgraph@1.4.18`. Test (a)'s record (revision `a0584fd…` without `+dirty`,
`BROWSER_AUTOMATED`, `standin`, `success`, 8 logical requests, `graphMs` 61) saved byte-identical as
`evidence/browser-automated-2026-09-28-a0584fd.json` (SC-021).

### T062 Static audit

| Check | Result |
|---|---|
| `git diff 4627c73 -- package.json package-lock.json src/integration` | empty — dependencies, `AkariChatModel`, AkariSP changes 0/0 |
| root `@langchain/langgraph` imports (`src`, `test`, `e2e`) | 0; `src` uses `/web` only |
| `akarisp` imports in `src/graph/` | 0 — roles reach AkariSP only via `AkariChatModel` |
| `fetch(` / URLs / API key / axios / proxy in `src/` | 0 |
| tools, RAG, retrieval, checkpoint, memory, interrupt in `src/` | 0 |
| new classes / `*Runtime` / `*Registry` / `*Engine` / `*Pool` in `src/` | 0 (only the unchanged Feature 002 `AkariChatModel`) |
| Sentiment/Fundamentals analysts, multi-round debate, three-person risk debate | 0 (grep hits: `Math.round` ×2, "grounded") |
| `structuredOrFreeText` in `src/graph/`, `src/main.ts` | 0 |
| Feature 005 work | 0 |
| canonical `index.html` | one (plus the Feature 002 `harness/index.html`) |
| topology (`trading-graph.ts`) | START→Market, START→News; `[Market, News]`→Bull; Bull→Bear→RM→Trader→Risk→Final→END (Bull and Bear sequential) |

FR-024 audit (`test/`, `e2e/`): every assertion on model output uses fake tokens (`out-*`,
`bull-said-7f3a`, Feature 002 fakes such as `hello back`), the `stand-in reply to:` prefix, fixture
sentinels, `""` (G16) or presence (`toBeTruthy`, `#result` equals the recorded value). Buy/sell,
profit, quality or correctness assertions: 0.

### T063 Historical hashes

`shasum -a 256 -c` against the 33 T003 lines: 33 OK, 0 mismatch (specs/001 5, specs/002 13,
specs/003 13, harness 2); no new/untracked files under those paths. The T053 deletions
(`src/graph/minimal-graph.ts`, `src/graph/fixture.ts`, `test/minimal-graph.test.ts`,
`test/graph-integration.test.ts`) are outside these paths: all four absent, references 0.

### T064 Requirement coverage

| Req | Tasks | Evidence |
|---|---|---|
| FR-001 | T007–T010, T012, T045 | role-table test, G1; app (a); native record (8 nodes) |
| FR-002 | T006, T017 | G2 sentinels; `fixture: tradingagents-fixture@1` in both records |
| FR-003 | T017 | G2 |
| FR-004 | T018, T037 | G3; L2; app (a) fan-out |
| FR-005 | T019–T020, T014 | G4 both orders; G1 |
| FR-006 | T021 | G5 (`bull-said-7f3a` in Bear) |
| FR-007 | T023–T026 | G6–G9 (includes + excludes) |
| FR-008 | T008, T012, T023–T024 | role-table test; G6, G7 |
| FR-009 | T007, T014 | G1 (nine fields, own writer); T062 no message list |
| FR-010 | T015, T062 | G10 (one user message, 0 fallbacks); `structuredOrFreeText` 0 |
| FR-011 | T027, T062 | G11; static: `src/integration` diff empty, `akarisp` in `src/graph` 0 |
| FR-012 | T036, T046, T050 | L1; app (e) |
| FR-013 | T027, T032 | G11 + Regression A mutation |
| FR-014 | T028–T029, T038–T039, T049 | G12, G13; L3, L4; app (b) |
| FR-015 | T030–T031, T040 | G14, G15; L5 |
| FR-016 | T036, T038–T042, T048–T051 | L1, L3–L5 + T042; app (a)(b) + T051 |
| FR-017 | T047–T048, T059 | app (a); native record (`nodeEvents`, nodes, counts, snapshots) |
| FR-018 | T047–T048, T059 | app (a) counts/concurrency fields; native record |
| FR-019 | T045–T050 | app (a)–(e) |
| FR-020 | T048, T050, T059 | app (a) `BROWSER_AUTOMATED`, (c) `BLOCKED`; native `REAL_BROWSER_PROMPT_API` |
| FR-021 | T047, T059 | T059 contract table |
| FR-022 | T003, T063 | 33/33 hashes |
| FR-023 | T062 | static audit |
| FR-024 | T062 | FR-024 audit |
| FR-025 | T060 | findings review (none) |
| SC-001 | T014 | G1 |
| SC-002 | T018 | G3 |
| SC-003 | T017 | G2 |
| SC-004 | T019–T020 | G4 both orders |
| SC-005 | T021 | G5 |
| SC-006 | T023 | G6 |
| SC-007 | T024–T026 | G7–G9 |
| SC-008 | T014, T026, T059 | G1, G9; native `result.finalDecision` |
| SC-009 | T015, T036, T048, T059 | G10; L1; app (a); native 8/0 |
| SC-010 | T030–T031, T040 | G14, G15; L5 |
| SC-011 | T028–T029, T038–T039 | G12, G13; L3, L4 |
| SC-012 | T038–T042 | L3–L5 + T042 |
| SC-013 | T037, T048, T059 | L2; app (a); native `{ready,1,1}` |
| SC-014 | T027, T062 | G11; static audit |
| SC-015 | T048–T049 | app (a), (b) |
| SC-016 | T058–T059 | `evidence/real-browser-2026-09-28-a0584fd.json` |
| SC-017 | T062 | `git diff 4627c73 -- src/integration package*.json` empty |
| SC-018 | T062 | static audit |
| SC-019 | T062 | static audit; one `index.html` |
| SC-020 | T063 | 33/33 |
| SC-021 | T061 | clean verification |

FR 25/25, SC 21/21 mapped; documentation-only rows 0.

### T065 Roadmap

`docs/roadmap.md`: Feature 004 complete (real Prompt API, `a0584fd`), carry-overs A11 deviation and
A4 simplification; Feature 005 = real market/news data boundary (next candidate).

### T066 Completion record

- Revision: `a0584fdcf03c52aa679eb5b8ffc3a9d8104222b7` (clean at execution for both records).
- Versions: akarisp 0.1.0-alpha.2, @langchain/core 1.2.13, @langchain/langgraph 1.4.18.
- Graph/fixture: `tradingagents-fixture-graph@1` / `tradingagents-fixture@1`.
- Import surface: `@langchain/langgraph/web` in `src/graph/trading-graph.ts`; AkariSP only through
  `src/integration/akari-chat-model.ts`.
- AkariSP changes: 0 source / 0 public API. External data 0. Tool calling 0.
- Gates: `DETERMINISTIC_TEST` PASS (G1–G16 + role table), `NODE_INTEGRATION` PASS (L1–L6),
  `BROWSER_AUTOMATED` PASS (app (a)–(e)), `REAL_BROWSER_PROMPT_API` PASS (T058/T059).
- Provenance verified per role: Market, News (G2); Bull, Bear (G5); Research Manager (G6); Trader
  (G7); Risk Reviewer (G8); Final Decision (G9).
- Fan-out G3/L2; fan-in G4 both orders. C1 G12/L3/app (b); C2 G13/L4. F1 G14/L5; F2 G15.
  Regression A T032; Regression B T042 (Node) + T051 (`main.ts`); mutation residue 0.
- Orphaned work: 0 (every cancel/failure case settles `ready 0/0` before shutdown).
- Native: logical requests 8, fallback 0 (observed); provider invocations NOT EXPOSED; native
  concurrency NOT CLAIMED (fan-out `{ready,1,1}` = AkariSP backpressure); `timing.graphMs` 26 174 ms
  (< 90 s, no watchdog review; watchdog 180 s).

**Implementation status: COMPLETE. Real-provider validation: PASS. Feature status: COMPLETE**
(spec Completion Model: SC-001–SC-015, SC-017–SC-021 and SC-016 with `REAL_BROWSER_PROMPT_API`).

Final gate after the T060–T066 documentation updates: typecheck exit 0, build exit 0, `npm test`
43/43, `npm run test:browser` 7/7, `npm ls` 0.1.0-alpha.2 / 1.2.13 / 1.4.18; code paths clean
(`git status --porcelain -- index.html src test harness e2e package.json package-lock.json vite.config.ts`
empty), so both evidence records still represent the final code. Native not re-run (no code change).
