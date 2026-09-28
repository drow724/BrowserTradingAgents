# Verification: Feature 003 — LangGraph.js ↔ AkariSP Minimal Graph Integration

Running record for tasks.md. Values are measured, not expected.

## Checkpoint A0 — baseline and dependency lock (2026-09-28)

### T001 Baseline

- Branch: `003-langgraph-akarisp-minimal-graph`
- HEAD: `6c79c918b186c6c749900cdb52aa2192b542ed43`
- `git status --short`: untracked only — Spec Kit/Claude tooling (`.claude/`, `.specify/*`,
  `CLAUDE.md`, left untouched) and `specs/003-langgraph-akarisp-minimal-graph/` (this feature's
  planning documents, uncommitted).
- Node `v23.9.0`, npm `10.9.2`.

### T002 Pre-change facts

- `npm ls akarisp @langchain/core @langchain/langgraph`: `@langchain/core@1.2.13`,
  `akarisp@0.1.0-alpha.2`; `@langchain/langgraph` absent.
- `vite.config.ts`: `root: 'harness'` (line 14). Root `index.html`: absent. `src/main.ts`: absent.

### T003 Feature 002 byte-for-byte baseline (`shasum -a 256`)

```text
791971c27ab834f44075697eeae5af3a4997163f78e2cb6b4b219ec8b1ec67f0  harness/index.html
d9ec9319b249d39b6fb37c38f3be7dfebac0a7a92ce8b11df3bdcdff2a9651e6  harness/main.ts
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
```

### T004 Install

`npm install --save-exact @langchain/langgraph@1.4.18` → "added 10 packages", exit 0, no peer
warnings. `package.json` diff: one line, `"@langchain/langgraph": "1.4.18"` in `dependencies`.
`@langchain/core` unchanged (`1.2.13`); no `zod` entry added.

### T005 Dependency tree

```text
+-- @langchain/core@1.2.13
| `-- zod@4.6.5
+-- @langchain/langgraph@1.4.18
| +-- @langchain/core@1.2.13 deduped
| +-- @langchain/langgraph-checkpoint@1.1.5
| | `-- @langchain/core@1.2.13 deduped
| +-- @langchain/langgraph-sdk@1.12.0
| | `-- @langchain/core@1.2.13 deduped
| `-- zod@4.6.5 deduped
`-- akarisp@0.1.0-alpha.2
```

Single `@langchain/core` (deduped). Lockfile: 10 packages added, 0 removed —
`@langchain/langgraph`, `@langchain/langgraph-checkpoint`, `@langchain/langgraph-sdk`
(+ nested `eventemitter3`, `p-queue`, `p-timeout`), `@langchain/protocol`, `@types/json-schema`,
`is-network-error`, `p-retry` (matches research R1).

### T006 Gates after install (no source change)

- `npm run typecheck`: PASS
- `npm test`: 19 tests, 19 pass, 0 fail (Feature 002 suites)
- `npm run build`: PASS (harness root, unchanged)

**Checkpoint A0**: PASS. AkariSP changes 0.

## Checkpoint A — graph core and deterministic proof (2026-09-28)

Evidence class: `DETERMINISTIC_TEST` (real LangGraph `/web` entry → real `AkariChatModel` → fake
`Runtime`). No AkariSP runtime, no provider, no browser.

### Files

- Added: `src/graph/fixture.ts` (`minimal-graph-fixture@1`, neutral content),
  `src/graph/minimal-graph.ts` (`Annotation.Root`, 4 nodes, static edges, explicit
  `{ signal: config.signal }`, returns `{ graph, modelRequests }`), `test/minimal-graph.test.ts`.
- Changed: `test/standin.ts` — one rule: a prompt containing `STANDIN_FAIL` rejects immediately
  (also while held) with a plain `Error` (not `InvalidStateError`, which AkariSP treats as broken).
  Feature 002 tests unchanged and passing.
- Unchanged: `src/integration/akari-chat-model.ts`, `src/integration/structured.ts`
  (`git diff --stat -- src/integration` empty).

### T013 / gates

- `npm run typecheck`: PASS
- `node --test test/minimal-graph.test.ts`: 12 tests, 12 pass, 0 fail
- `npm test`: 31 tests, 31 pass, 0 fail (19 Feature 002 + 12 Feature 003)

### Results (measured)

| Test | Result |
|---|---|
| G6 success — final state `branchAResult`, `branchBResult`, `synthesis`, `decision` | PASS |
| G7 accounting — `model.logicalRequests` 4; per node 1/1/1/1; sum = bridge counter; executions 1 each; fallback path absent, observed fallbacks 0 | PASS |
| every `run()` = one `user`-role message via `AkariChatModel` (4 calls, no system role) | PASS |
| G1 fan-out — 2 branch requests submitted, neither completed | PASS |
| G2 independence — branch prompts hold only own facts, no branch output | PASS |
| G3 fan-in, branchA first — synthesize 0 while B held; 1 after release | PASS |
| G3 fan-in, branchB first — synthesize 0 while A held; 1 after release | PASS |
| G4 join — synthesis prompt contains both outputs; synthesize executions 1 | PASS |
| G5 sequence — no decision request while synthesis unresolved; `decide:start` after `synthesize:done`; decision prompt has synthesis, no branch facts | PASS |
| G8 signal forwarding — every `run()` got a signal; aborted with the caller | PASS |
| G9 cancellation — caller rejects (value: the caller's abort reason); then, separately, both runs settle `TaskError('cancelled')` within the 2 s bound; synthesize/decide 0 | PASS |
| G10 failure — caller rejects with the same `TaskError('failed')` object; synthesize/decide 0; sibling A's signal aborted, A settled `cancelled` | PASS |

Provider invocations: NOT EXPOSED (not measured, not inferred). Native concurrency: not observed.

### T026 Regression A mutation (not committed)

1. Mutation: `src/graph/minimal-graph.ts` line 36 `model.invoke([...], { signal: config.signal })`
   → `model.invoke([...])` (backup copied to the session scratchpad first).
2. Run: 12 tests, 9 pass, **3 fail**, finished in ~5 s (no hang):
   - G8: `run() received no AbortSignal — node did not forward config.signal`
   - G9: `run() not settled — orphaned` (bounded 2 s wait)
   - G10: `run() not settled — orphaned` (sibling never aborted → orphan)
3. Restored from the backup; `cmp` byte-identical; `{ signal: config.signal }` present (1).
4. Re-run: 12 tests, 12 pass.
5. Mutation trace: none (file is new/untracked, so verified by `cmp` against the pre-mutation copy
   instead of `git diff`).

### T027 Static checks

- Root-entry imports `from '@langchain/langgraph'` / `"@langchain/langgraph"` in `src test e2e`: 0
  (quote-independent regex). `/web` import: `src/graph/minimal-graph.ts:8` only.
- `akarisp` in `src/graph`: 0 (nodes reach AkariSP only via `AkariChatModel`).
- `Send`, conditional edges, checkpointer, `retryPolicy`, `SystemMessage`, `structuredOrFreeText`,
  `fetch(`, TradingAgents role names in `src/graph`: 0.

**Checkpoint A**: PASS. AkariSP production/API changes 0/0. Findings: none.

## Checkpoint B — Node integration (2026-09-28)

Evidence class: `NODE_INTEGRATION (stand-in)` — real LangGraph (`/web`) → real `AkariChatModel` →
real `akarisp@0.1.0-alpha.2` runtime (`limit 1, queueCapacity 32`) → stand-in
`globalThis.LanguageModel`. **Not browser evidence, not Prompt API evidence.**

Baseline before B: HEAD `6c79c91` (no commit since Checkpoint A; working tree preserved);
`npm run typecheck` PASS; `npm test` 31/31.

### Files

- Added: `test/graph-integration.test.ts` (owner helper: one `createRuntime` per run, bounded
  `settle()` = `ready` + 0/0 within 2 s, bounded fan-out poll ≤ 1 s).
- `src/integration/akari-chat-model.ts`, `src/graph/*`, `test/standin.ts`: not changed in B.

### Results (measured)

| Test | Result |
|---|---|
| L1 success — 4 result keys; `createRuntime` 1; `model.logicalRequests` 4; bridge `done` 4; node executions 1 each; fallback path absent (observed 0); before shutdown `ready, 0/0` | PASS |
| L2 fan-out — `fanOutSnapshot` `{state: ready, active: 1, queued: 1, limit: 1, queueCapacity: 32}` after a 0 ms poll (bridge starts = 2); after release settled `ready 0/0` | PASS |
| L3 abort during branches — caller rejects (value: the caller abort reason `Error('caller abort')`), no result; **separately**, with the stand-in still held, `settle()` true → `ready, 0/0` before shutdown; both bridge requests ended `errorKind: cancelled`; synthesize/decide 0; then shutdown → `closed 0/0` | PASS |
| L4 Branch B `STANDIN_FAIL` — caller rejects `TaskError` code `failed`; synthesize/decide 0; runtime `ready` (not broken); `settle()` true before shutdown. Observation: request 1 (branchA) `done`, request 2 (branchB) `error:failed` — A finished before B reached the model under limit 1 (sibling cancellation is proven by G10) | PASS |
| L5 success then shutdown twice — `closed, 0/0` (lifecycle regression only; not used as L3/L4 cleanup evidence) | PASS |

Provider invocations: NOT EXPOSED (stand-in counters not reported as AkariSP metrics). Native
concurrency: not observed.

### T034 Regression B mutation (not committed)

1. Passing state: 5/5.
2. Mutation: in L3 insert `await runtime.shutdown();` before the settlement assertion (backup
   copied to the session scratchpad first).
3. Run: 5 tests, 4 pass, **1 fail** — L3 `AkariSP work did not settle before shutdown` (runtime
   `closed`, so the required `ready 0/0` can never be observed).
4. Restored from the backup; `cmp` byte-identical; `MUTATION` marker count 0.
5. Re-run: `npm test` 36/36 PASS.
6. Mutation trace: none (untracked file; verified by `cmp` against the pre-mutation copy).
   Production ordering in `src/main.ts` will be guarded by T051 and mutation-checked in T053.

### Gates

- `npm run typecheck`: PASS
- `npm test`: 36 tests, 36 pass, 0 fail (Feature 002: 19; Feature 003 deterministic: 12; Feature 003
  Node integration: 5)
- `git diff --stat -- src/integration`: empty. AkariSP production/API changes 0/0.

**Checkpoint B**: PASS. Findings: none.

## Checkpoint C — canonical app and browser automated (2026-09-28)

Baseline before C: HEAD `6c79c91` (Checkpoints A/B uncommitted, preserved); typecheck PASS;
`npm test` 36/36.

### Files

- `vite.config.ts`: `root`/`build` removed (repo root, `dist/`); `index.html` added to the `+dirty`
  paths; `__LANGGRAPH_VERSION__` define.
- `package.json`: `"dev": "vite"` added; `"harness": "vite"` kept (Feature 002 page now at
  `/harness/`).
- Added `index.html`, `src/main.ts` (run owner: one `createRuntime({limit 1, queueCapacity 32})`,
  one `AkariChatModel`, one `AbortController` per click; Run disabled during a run; Cancel and the
  180 s page watchdog abort the same controller; `finally`: bounded 10 s settle poll on a `ready`
  runtime → `settledBeforeShutdown` → `shutdown()`), `e2e/app.spec.ts`.
- `e2e/harness.spec.ts`: 2 URLs `/…` → `/harness/…` only. `e2e/prompt-api.spec.ts`: launch/clone
  code moved into `launchNativeChrome(testInfo)`; Feature 002 URL → `/harness/?runner=playwright`;
  no behavior change.
- `contracts/evidence.md`: example `fanOutSnapshot` shape synced to the record
  (`{ snapshot, pollMs }`).
- Unchanged: `src/integration/*`, `src/graph/*`, `harness/*`.

### T046 Build

`npm run build` PASS → `dist/index.html`, `dist/assets/index-*.js` (917.9 kB, gzip 250.5 kB),
`dist/assets/standin-*.js` (0.9 kB, lazy chunk loaded only with `?provider=standin`). No harness page
in `dist/`. Vite chunk-size warning (> 500 kB) — accepted (plan Risks), not a failure. No
`async_hooks` in the bundle (browser resolves LangGraph's web entry).

### Implementation note (fixed during C, not a finding)

First run of T050: `fanOutSnapshot` read `closed 0/0`. Cause: `src/main.ts` polled first
synchronously (before the second `runtime.run()`) and then only every 5 ms; with an un-held
stand-in both branches finished in between, and the 1 s timeout sampled after shutdown. AkariSP's
`admit()` updates `running`/`queue` synchronously inside `run()`, so the poll now checks on
microtasks first, then every 5 ms, and stops at 1 s or when the run ends, recording the last
observed snapshot. Application bug; AkariSP behavior as documented. Result after the fix:
`{ready, active 1, queued 1}` after a 0 ms poll; `app.spec.ts` 3/3 in 3 consecutive runs.

### Results (measured) — `BROWSER_AUTOMATED`, `provider: standin` (not Prompt API evidence)

| Test | Result |
|---|---|
| (a) success on `/?provider=standin` — 4 nodes `done` (executions 1, modelRequests 1); `logicalRequests` 4; `fallbackRequests` 0 (observed; no fallback path); `providerInvocations` NOT EXPOSED; `fanOutSnapshot` `{ready, 1, 1}` (pollMs 0); `nativeProvider` not observed; `settledBeforeShutdown` true, before `{ready,0,0}`, after `{closed,0,0}`; langgraph 1.4.18; fixture `minimal-graph-fixture@1`; availability `MODEL_DOWNLOADABLE` (native API of Playwright Chromium, not the stand-in) | PASS |
| (b) Cancel with stand-in held at active 1 / queued 1 — `outcome: cancelled`, no `result`, synthesize/decide `waiting`, both model requests `errorKind: cancelled`, `settledBeforeShutdown` true with `snapshotBeforeShutdown {ready,0,0}`, after shutdown `closed` | PASS |
| (c) `/` native in Playwright Chromium — `BLOCKED`, `not-run`, reason contains availability, nodes `waiting` | PASS |
| Feature 002 harness at `/harness/` — `harness.spec.ts` 2/2 (stand-in S1–S5, S7 PASS; native BLOCKED) | PASS |

### T053 Regression B mutation on `src/main.ts` (not committed)

1. Passing state: `npm run test:browser` 5/5.
2. Mutation: `await runtime.shutdown()` inserted before the settlement poll in `runGraph`'s
   `finally` (backup in the session scratchpad).
3. `e2e/app.spec.ts`: 1 pass, **2 fail** — (a) and (b): `lifecycle.settledBeforeShutdown` expected
   `true`, received `false` (runtime `closed` before the poll, so `ready 0/0` never observed).
4. Restored from the backup; `cmp` byte-identical; `MUTATION` marker count 0.
5. Re-run `npm run test:browser`: 5/5 PASS. Mutation trace: none.

### T049 Feature 002 preservation

Re-hash of `harness/` + `specs/002-langchain-akarisp-integration-validation/`: 15/15 identical to
T003. `git diff --stat -- harness specs/002-… src/integration`: empty.

### Gates

- `npm run typecheck`: PASS
- `npm run build`: PASS (chunk-size warning only)
- `npm test`: 36/36 PASS
- `npm run test:browser`: 5/5 PASS (`app.spec.ts` 3, `harness.spec.ts` 2)
- Static: root-entry LangGraph imports 0; `GraphRuntime`/`AgentRuntime`/`RuntimeManager`/
  `ProviderRegistry`/`GraphModelPool`/`InferenceCoordinator`/`fetch(`/TradingAgents role names in
  `src/`: 0. AkariSP production/API changes 0/0.

### T054 Evidence

`evidence/browser-automated-2026-09-28.json` — copy of test (a)'s record; revision
`6c79c91…+dirty` (uncommitted working tree at run time, stated truthfully).

**Checkpoint C**: PASS → Implementation status COMPLETE. Real-provider gate (T055–T058) not run:
Feature status NOT YET COMPLETE. Findings: none.

## Native gate preparation — T055, T056 (2026-09-28)

State: branch `003-langgraph-akarisp-minimal-graph`, HEAD `6c79c91`, Feature 003 work uncommitted
(evidence produced now carries `+dirty`). Environment: Google Chrome 153.0.8010.53, golden profile
model `2025.8.8.1141`.

- **T055**: `e2e/prompt-api.spec.ts` gained the canonical-app test (`/?runner=playwright`, reuses
  `launchNativeChrome`; asserts class, provider, availability, runner, `success`, four nodes
  `done`, `settledBeforeShutdown`; no wording or `logicalRequests` assertion).
- **T056**: `docs/testing.md` command table updated (`npm run dev` → canonical app `/`; harness at
  `/harness/`; test files and evidence classes per command).

### Implementation fix found by T055 (application bug, not a finding)

First native smoke: `#status` stayed `idle` for 9 min. Cause: `src/main.ts` registers the click
handlers after a top-level `await classifyAvailability()`; in real Chrome `availability()` resolves
slowly, so Playwright's click landed before any handler existed (Playwright Chromium resolves it
immediately, which hid the race). Fix: `index.html` renders `Run Graph` `disabled`; `src/main.ts`
enables it after availability and the optional stand-in are ready (Playwright waits for an enabled
button; a person cannot click too early either). `e2e/app.spec.ts` (b) waits for the enabled button
before calling `__standin.hold()`. After the fix: `npm run test:browser` 5/5 PASS.

### Pre-gate native smoke (NOT the T057 gate record)

`npx playwright test --project=prompt-api -g "canonical minimal graph"`: 1 passed (40.1 s). Record
(kept in `test-results/`, not copied to `evidence/` because the revision is
`6c79c91…+dirty` and T058 requires a clean revision):
`REAL_BROWSER_PROMPT_API`, native, runner `playwright`, `MODEL_AVAILABLE`, `success`; nodes
branchA/branchB/synthesize/decide `done` ×1; node order A start, B start, A done, B done, S, D;
`logicalRequests` 4, `fallbackRequests` 0, `providerInvocations` NOT EXPOSED; `fanOutSnapshot`
`{ready, active 1, queued 1}` after 2 ms; `settledBeforeShutdown` true (`ready 0/0`), after shutdown
`closed 0/0`; UA `HeadlessChrome/153.0.0.0`. Output wording not evaluated.

T057 (MANUAL) and T058: pending — require a clean-revision run supplied by the user.

## Simplification pass (ponytail review, 2026-09-28)

Applied (no behavior or contract change):
- `src/main.ts`: `poll()` now checks 10× on microtasks, then every 5 ms; the fan-out snapshot
  reuses it instead of its own loop; `Snapshot` alias and the one-use `starts` variable removed.
- `test/graph-integration.test.ts`: boolean `settle()` + `assert.equal(…, true, msg)` replaced by
  `settled(runtime)` built on `until()` (same `ready` + 0/0 condition, same message); tautological
  `constructions` counter removed (one runtime per run is structural in `owner`).
- `test/minimal-graph.test.ts`: fake `Runtime` keeps each call's `input`; the user-role test reads
  it instead of wrapping `run()`.
- Not applied: removing per-node `modelRequests` — it is a contract field (contracts/graph.md,
  contracts/evidence.md).

Re-verified after the pass: typecheck PASS; `npm test` 36/36; `npm run test:browser` 5/5; build
PASS. Regression B mutations repeated: L3 with `shutdown()` before `settled()` → 1 fail
(`AkariSP work did not settle before shutdown`); `src/main.ts` with `shutdown()` before the settle
poll → `app.spec.ts` (a) and (b) fail. Both restored (`cmp` identical, `MUTATION` count 0).

## Convergence tasks T065, T067, T068 (2026-09-28)

- **T065**: new `e2e/app.spec.ts` test (d) — stand-in `LanguageModel.create` made to reject before
  Run. Before the fix: page stuck `running`, `[Unhandled rejection] Error: create failed`, test
  failed. Fix in `src/main.ts` `runGraph`: `createRuntime()` in `try`; on rejection clear the
  watchdog and return `outcome: failed` with `error` (no runtime → no settle/shutdown); `run()`
  then prints the record and re-enables Run. After: (d) PASS.
- **T067**: `contracts/evidence.md` fan-out rule now says polling also stops when the run ends.
- **T068**: `plan.md` (main.ts step 2) and `quickstart.md` record that `Run Graph` is disabled until
  availability (and the optional stand-in) are ready.

Gates: typecheck PASS; build PASS; `npm test` 36/36; `npm run test:browser` 6/6 (`app.spec.ts` 4,
`harness.spec.ts` 2).

Open: T066 and T057/T058 need the implementation commit (clean revision); then T059–T064.

## Simplification pass 2 (ponytail review, 2026-09-28)

`src/main.ts`: `createRuntime()` rejection handled with `.catch(() => ({ error }))` + one guard;
the watchdog now starts after the runtime exists (it never could cancel `createRuntime`), so the
catch no longer clears it; result/error display moved to one line in `run()`. Gates: typecheck,
build PASS; `npm test` 36/36; `npm run test:browser` 6/6. T053 mutation repeated (shutdown before
the settle poll): `app.spec.ts` (a) and (b) fail; restored (`cmp` identical, marker 0), 6/6 again.
