# Verification Record: Feature 002

Running record for baseline, gate results, findings and completion status (tasks.md
Conventions). Evidence classes are never mixed.

## Baseline (T001, 2026-09-28)

| Item | Value |
|---|---|
| BrowserTradingAgents execution baseline | `4f95b3c7d3a1fbca2d624a9a6202d80bcc4a5971` (branch `002-langchain-akarisp-integration-validation`, on top of `main` `9faee6b`) |
| Active feature | `specs/002-langchain-akarisp-integration-validation` (`.specify/feature.json`) |
| Constitution | v1.0.0 |
| AkariSP baseline | `akarisp@0.1.0-alpha.2`, reference commit `7e8202e6ab91af386abc9e2416d9cb07fdfacecf`; note N-1: registry `gitHead` `bd5b66e` is an ancestor with identical production source |
| LangChain baseline | `@langchain/core@1.2.13` |
| Application state before Feature 002 | no `package.json`, no `src/` |
| `../akariSP` | HEAD `78804aac40022193e69982a4a8c0d93f65f9db70`, `status --porcelain` empty — **not a dependency**; recorded only for the T040 no-change check |

## Tooling and installed packages (T002–T007)

- `package.json` scripts: `typecheck`, `build`, `test`, `test:browser`, `harness` (T002).
- Installed (T003, exact via `package-lock.json`): `akarisp 0.1.0-alpha.2`, `@langchain/core 1.2.13`;
  dev: `typescript 5.9.3`, `vite 8.3.1`, `@playwright/test 1.63.0`, `@types/node 22.20.4`.
- **Deviation from plan R6 (recorded)**: `@types/node` added as a dev dependency so that
  `tsc --noEmit` can typecheck the `node:test` / `node:assert` test files. Development-only; allowed
  by the spec's dependency boundary ("development/build/test dependencies required by this
  repository").
- G7 initial (T006, `STATIC_CODE_ANALYSIS`): `node_modules/akarisp/package.json` version
  `0.1.0-alpha.2`; lockfile `resolved` `https://registry.npmjs.org/akarisp/-/akarisp-0.1.0-alpha.2.tgz`,
  `integrity` equal to research R1; exports exactly `.` and `./webllm`; `@langchain/core` `1.2.13`
  from `registry.npmjs.org`; `file:` / `akariSP` occurrences in `package.json` + lockfile: 0;
  `langgraph` packages in lockfile: 0. Matches research R1–R3; no finding.
- `tsconfig.json`: `moduleResolution: "bundler"`, `allowImportingTsExtensions`, `noEmit`,
  `erasableSyntaxOnly`, `verbatimModuleSyntax` (T004 ambiguity resolved: works for both
  `node --test` type stripping and Vite).

## Checkpoint A — deterministic bridge and fallback (T008–T013)

Evidence class: `DETERMINISTIC_TEST` (fake `Runtime`, no AkariSP runtime, no provider).
Environment: Node 23.9.0, macOS. Commands: `npm run typecheck` → exit 0; `npm test` → 13 tests,
13 pass, 0 fail.

| Test file | Tests | Covers |
|---|---|---|
| `test/akari-chat-model.test.ts` | 7 | user message → `[{role:'user',content}]`, one `run()` per call, `output` → `AIMessage`, same `AbortSignal` forwarded, `TaskError` rethrown as the same object, non-`TaskError` rethrown with `errorKind: 'other'`, start/done events correlated by `logicalRequestId`, `system` forwarded unflattened (no support claim), non-string content → `TypeError` before `run()` |
| `test/structured.test.ts` | 6 | structured success 1/0; parse failure → exactly 1 fallback; non-abort failure → 1 fallback; fallback failure propagates with no 3rd request; `TaskError('cancelled')` → 0 fallbacks; caller abort → 0 fallbacks |

Notes from this checkpoint:

- **Research N-2 revision pending (source wins)**: in the installed `@langchain/core@1.2.13`,
  `BaseChatModel.invoke` overrides `Runnable.invoke` and calls `generatePrompt` →
  `_generateUncached` → `_generate` with **no** `raceWithSignal` on the non-streaming path
  (`dist/language_models/chat_models.js` L82–85, L207–350). The caller should therefore reject
  when `runtime.run` rejects, not before. To be confirmed empirically in T018 before research.md
  is corrected.
- Test-fake correction during T011: LangChain calls `_call` after `invoke` has returned control,
  so an abort fired right after `invoke(...)` is already set when `run()` is reached. The fake now
  rejects immediately on an already-aborted signal, as `Runtime.run` does. No production change.
- `src/` contains exactly `integration/akari-chat-model.ts` (52 lines) and
  `integration/structured.ts` (26 lines). No queue, pool, timer, retry or registry.

## Checkpoint B — real AkariSP runtime, stand-in provider (T014–T022)

Evidence class: **`NODE_INTEGRATION` (stand-in)** — real `akarisp@0.1.0-alpha.2` `createRuntime()`
behind the bridge; `globalThis.LanguageModel` replaced by `test/standin.ts`. **Not** browser
evidence and **not** Prompt API evidence. Environment: Node 23.9.0, macOS.
Commands: `npm run typecheck` → exit 0; `npm test` → 19 tests, 19 pass, 0 fail
(`test/node-integration.test.ts`: 6/6; 5 additional repeat runs of that file: 0 failures).

| Scenario | Result | Public observation |
|---|---|---|
| S1 single (T015) | PASS | `AIMessage` content = stand-in output; `state: 'ready'` |
| S2 reuse (T016) | PASS | 2 sequential requests, `createRuntime()` calls = 1; `snapshot()` `ready 0/0` after; stand-in-only corroboration: creates 1, clones 2, prompts 2 |
| S3 concurrent ×2 (T017) | PASS | default `limit` 1; while A held: `{ active: 1, queued: 1 }` with 2 bridge `start` events (both calls reached `runtime.run` — no bridge queue); both resolve; B `timing.queueWait > 0`; then `0/0` |
| S4 queued cancellation (T018) | PASS | B aborted while queued → caller rejects with **`TaskError` code `cancelled`**; queue drains to 0 while A stays active; bridge event `errorKind: 'cancelled'`; A then resolves; a further request succeeds |
| Active cancellation (T019) | PASS | A aborted while in `prompt()` → caller rejects with `TaskError('cancelled')`; `active` returns to 0; further request succeeds |
| S7 shutdown (T020) | PASS | `shutdown()` twice resolves; `snapshot()` `{ state: 'closed', active: 0, queued: 0 }`; request after shutdown rejects `TaskError('closed')` — matches research R2 |

Counts across the Node integration file (from the bridge; stand-in counts reported separately):

| Metric | Source | Value |
|---|---|---|
| Workflow operations | test scenarios | 6 scenarios; each request = 1 operation (no structured helper in this file) |
| Logical model requests | `AkariChatModel.logicalRequests` / `start` events | per test as asserted (e.g. S3: 2, S4: 3 incl. the post-cancel request) |
| Fallback requests | — | 0 (structured fallback is covered by `DETERMINISTIC_TEST`, Checkpoint A) |
| Provider invocations | AkariSP public API | **NOT EXPOSED** |
| Stand-in prompts | stand-in instrumentation only | e.g. S2: 2 — not an AkariSP metric |

Findings review (T022): **no findings**. Every observation matches the AkariSP public contract
(research R2). One **planning-document correction** (not a finding, no contract problem):

- **Research N-2 corrected**: planning stated that LangChain rejects the caller before AkariSP
  settles. Observed and confirmed in source: `BaseChatModel.invoke` does not race the signal on
  the non-streaming path, so the caller receives AkariSP's `TaskError('cancelled')` after the task
  settles. `research.md` R4 / notes table and `contracts/bridge.md` updated accordingly; tests keep
  checking settlement through `snapshot()` regardless.

## Checkpoint C — browser harness and Playwright stand-in (T023–T031)

Code revision: `0933e3d139513aa4c4dc0c4554c9b5725ce610a1` (harness, e2e, `vite.config.ts`).

- **G1 typecheck** `npm run typecheck` → exit 0. **G3/G4** `npm test` → 19/19 pass.
- **G2 build** (T028) `npm run build` → exit 0: `dist/index.html`, `dist/assets/index-*.js`
  (540.57 kB, gzip 144.61 kB), `dist/assets/standin-*.js` (0.83 kB, separate chunk — loaded only with
  `?provider=standin`). Vite prints a >500 kB chunk-size warning caused by the `@langchain/core`
  bundle; informational only, bundle size is not a Feature 002 criterion.
- **G5 browser automated** (T029–T031) `npm run test:browser` → 2 passed, Playwright 1.63.0,
  "Chrome for Testing 153.0.8010.12" (playwright chromium v1243, already present in the local
  Playwright cache — **no browser download was needed**).

| Playwright test | Evidence class | Result |
|---|---|---|
| `?provider=standin` | **`BROWSER_AUTOMATED` (stand-in)** — not Prompt API evidence | S1, S2, S3, S4, S5, S7 PASS; S6 `OBSERVED` (`supported (standin)`); record saved to `evidence/browser-automated-2026-09-28.json` |
| `/` (native provider) | `BLOCKED` | Chrome for Testing exposes `LanguageModel` but reports `downloadable` → `MODEL_DOWNLOADABLE`; all scenarios `BLOCKED`, none `PASS`; the page did not start a download (Browser Unsupported Policy exercised) |

Stand-in record (`evidence/browser-automated-2026-09-28.json`, revision `0933e3d`): S3 snapshot
while running `{ active: 1, queued: 1 }`; S4 caller error `TaskError:cancelled`, then `0/0` and a
further request PASS; S5 `kind: structured`, 1 request, 0 fallbacks; S7 `closed 0/0`, second
shutdown resolved, request after shutdown `TaskError:closed`. Counts: workflow operations 12,
logical requests 12, fallback requests 0, provider invocations `NOT EXPOSED` by AkariSP — the
stand-in counted 10 prompts (the queued-cancelled request and the post-shutdown request never
reached the model), which illustrates logical requests ≠ provider invocations but is **not** an
AkariSP metric.

Corrections made during this checkpoint (evidence truthfulness, before any record was kept):

1. The first stand-in record reported `environment.availability: MODEL_AVAILABLE` — that was the
   stand-in's own `availability()`. The harness now classifies the browser's native Prompt API
   **before** installing the stand-in; `contracts/evidence.md` states this rule and the e2e test
   asserts it.
2. S6 under the stand-in reported `observation: supported`, which says nothing about the Prompt
   API. Observations now carry the provider suffix (`supported (standin)`), asserted in e2e.
3. The embedded revision is now marked `+dirty` when bundled code differs from HEAD; the kept
   record was regenerated after committing the code, so it carries the clean revision `0933e3d`.

Findings review: no findings (no AkariSP or LangChain contract mismatch in the browser engine).

**Implementation status after Checkpoint C**: source, tests, build, deterministic tests, Node
integration and Playwright stand-in complete. **Feature status: not complete** — the
`REAL_BROWSER_PROMPT_API` gate (Checkpoint D, manual) is still open.

## Checkpoint D — real Chrome Prompt API (T032–T035)

**T032 environment**: harness served by `npm run harness` on `http://localhost:5173/`; run by the
user in their Google Chrome on macOS. Revision under test: `5dac1a2` (bundled code identical to
`0933e3d`: `git diff 0933e3d 5dac1a2 -- src test harness e2e package.json package-lock.json
vite.config.ts` is empty; no `+dirty`). **Browser version**: the record's user agent reports
`Chrome/152.0.0.0` (major only), while the installed binary reports `Google Chrome 153.0.8010.53`.
Most likely a Chrome process started before an on-disk update; the run is therefore recorded as
**Chrome 152 (per user agent)**. The exact running build was not captured.

**T033 MANUAL CHECKPOINT**: JSON supplied by the user and saved verbatim to
`evidence/real-browser-2026-09-28.json`. The agent did not observe or operate the run itself.

**T034 validation** against `contracts/evidence.md`: `provider: native`,
`availability: MODEL_AVAILABLE` (`raw: "available"`), S1 PASS → `evidenceClass:
REAL_BROWSER_PROMPT_API` is consistent with the classification rule; `providerInvocations:
NOT EXPOSED`; no `blocked` block (not applicable).

| Scenario | Evidence class | Result | Observation |
|---|---|---|---|
| S1 single | `REAL_BROWSER_PROMPT_API` | PASS | LangChain `invoke` → AkariChatModel → akarisp → native Prompt API returned a one-sentence answer; `state: ready` |
| S2 reuse | `REAL_BROWSER_PROMPT_API` | PASS | 2 requests, 1 runtime construction, then `ready 0/0` |
| S3 concurrent ×2 | `REAL_BROWSER_PROMPT_API` | PASS | while running `{ active: 1, queued: 1 }`, then `0/0` |
| S4 cancellation (queued) | `REAL_BROWSER_PROMPT_API` | PASS | caller `TaskError:cancelled`, then `0/0`, further request PASS |
| S5 structured | `REAL_BROWSER_PROMPT_API` | PASS | the model wrapped its JSON in a Markdown code fence → strict parse failed → **exactly 1 free-text fallback** (`kind: freetext`, 2 logical requests) |
| S6 system role | observation only | OBSERVED | `supported (native)`: `[system, user]` input to `prompt()` returned "Blue." in this run — an observation, not a guarantee |
| S7 cleanup | `REAL_BROWSER_PROMPT_API` | PASS | second shutdown resolved; `closed 0/0`; request after shutdown `TaskError:closed` |

Counts (real provider): workflow operations 12, logical requests 13 (= 12 + 1 fallback), fallback
requests 1, provider invocations **NOT EXPOSED**.

**T035 findings review**: **no findings** — every result matches the AkariSP public contract and
the bridge contract. Notes:

- **N-6 (real-model structured output)**: the on-device model returned
  ```` ```json … ``` ```` around valid JSON, so the strict `JSON.parse` failed and the one allowed
  fallback fired. This is the Feature 001 workload property (structured failure adds one request)
  occurring with a real model. A small application-side fence strip would avoid the fallback; not
  added here (not required by the spec) — candidate for the Feature that introduces agent schemas.
- **N-7 (system role)**: in this run the native Prompt API accepted a `system` message inside
  `prompt()` input. Research R8 remains "observed once", not a contract; Feature 003 may still
  prefer AkariSP templates (`initialPrompts`) for agent instructions.
- **Coverage note**: the real-browser run covered **queued** cancellation (the spec requires at
  least one path). **Active** cancellation was verified only in `NODE_INTEGRATION` (stand-in,
  Checkpoint B); the harness has no real-browser active-cancel scenario. Recorded as a gap, not a
  failure.

**Real-provider validation: PASS** (`REAL_BROWSER_PROMPT_API`).

## Harness update: active cancellation in S4 (after Checkpoint D)

- `ae0c5e3`: S4 now cancels a **queued** request and then an **active** request (slot held,
  inside the model), checking the caller error, settlement through `snapshot()` and reuse
  (closes the Checkpoint D coverage gap once a real-browser run of this revision is recorded).
- **Stale-revision incident (corrected)**: the stand-in record regenerated right after `ae0c5e3`
  was stamped `5dac1a2` because Playwright reused an already-running dev server, and Vite embeds
  `__BTA_REVISION__` when the server **starts** (the served code was current; the label was not).
  Fix `e18a100`: Playwright always starts its own server on port 5174 (`reuseExistingServer:
  false`). `evidence/browser-automated-2026-09-28.json` regenerated: revision `e18a100`, S4
  `target: queued+active` PASS (active part: caller `TaskError:cancelled`, then `0/0`, further
  request PASS), counts 14 operations / 14 logical requests / stand-in prompts 12.
- **Rule for real-browser runs**: restart `npm run harness` after any commit before running, so
  the page's revision matches the code it serves. The existing real-browser record
  (`5dac1a2`) is unaffected: that server started at `5dac1a2` with identical code.

## Second real-browser run — active cancellation and Chrome 153

`evidence/real-browser-2026-09-28-ce3f946.json` (supplied by the user after restarting the harness
server and Chrome; saved verbatim; not observed or operated by the agent).

- Revision `ce3f946` (served code identical to `ae0c5e3`: empty diff over code paths); no `+dirty`.
- User agent `Chrome/153.0.0.0` — matches the installed `Google Chrome 153.0.8010.53`; the
  152/153 discrepancy of the first run is resolved by the restart.
- `provider: native`, `MODEL_AVAILABLE`, S1 PASS → `REAL_BROWSER_PROMPT_API` (classification rule
  holds).
- S1, S2, S3, S5, S7 PASS; S6 `OBSERVED` (`supported (native)`, again).
- **S4 PASS with `target: queued+active`**: queued request → caller `TaskError:cancelled`, then
  `0/0`, further request PASS; **active request** (holding the slot, inside the native model) →
  caller `TaskError:cancelled`, then `0/0`, further request PASS. **The Checkpoint D coverage gap
  (active cancellation only in `NODE_INTEGRATION`) is closed with `REAL_BROWSER_PROMPT_API`
  evidence.**
- S5 again: model wrapped JSON in a code fence → exactly 1 fallback (N-6 reproduced).
- Counts: workflow operations 14, logical requests 15 (= 14 + 1 fallback), fallback requests 1,
  provider invocations **NOT EXPOSED**.
- Findings: none.

The first record (`real-browser-2026-09-28.json`, revision `5dac1a2`, Chrome 152 per user agent)
is kept unchanged as the original Checkpoint D evidence.

## Checkpoint E — final verification (T036–T044)

Revision under verification: `85cdef2be2bf00d70d2a2a96c7adbffc2fd9da10`.

**T036 gates (clean `npm ci` in this repository)**: `npm ci` OK · G1 `npm run typecheck` exit 0 ·
G2 `npm run build` exit 0 · G3/G4 `npm test` 19/19 pass (13 `DETERMINISTIC_TEST`, 6
`NODE_INTEGRATION` stand-in) · G5 `npm run test:browser` 2/2 pass (`BROWSER_AUTOMATED` stand-in;
`evidence/browser-automated-2026-09-28.json` regenerated at `85cdef2`).

**T037 versions (G7)**: `npm ls` → `akarisp@0.1.0-alpha.2`, `@langchain/core@1.2.13`; lockfile
`akarisp` resolved `https://registry.npmjs.org/akarisp/-/akarisp-0.1.0-alpha.2.tgz`, integrity
`sha512-ntzf/l02…E9xQ==` (= research R1).

**T038 import boundary (SC-001)**: all 6 AkariSP imports in `src`, `test`, `harness`, `e2e` are
`from 'akarisp'` (package root). Occurrences of `akarisp/`, `akariSP`, `file:` in code and
`package.json`: 0. **Private/internal AkariSP imports: 0.**

**T039 scope (G8)**: `langgraph` in `package.json` / lockfile: 0; agent/graph identifiers
(`LangGraph`, `StateGraph`, Market Analyst, Bull, Bear, Research Manager, Trader, Risk Reviewer) in
code: 0; `src/` = exactly `integration/akari-chat-model.ts` and `integration/structured.ts`; the
only `queue`/`retry` words in `src/` are the two comments stating the bridge has neither.

**T040 AkariSP unchanged — observation**: the literal check "`../akariSP` equals the T001 record"
**does not hold**: HEAD is now `7e8202e` (T001: `78804aa`) and an untracked
`experiments/prompt-api-concurrency/` directory exists. The reflog shows `checkout main` +
`pull --ff-only` at 2026-09-28 11:52:02 +0900 — **not performed by this Feature** (only read-only
git commands were run there). `git diff 78804aa 7e8202e -- src package.json` is empty and
`git status -- src package.json` is clean, so **AkariSP production changes: 0** (source, public API,
runtime dependencies). The new HEAD is exactly the Feature 002 reference commit. This repository's
changes since the execution baseline `4f95b3c` are only: bootstrap/config files, `src/integration/*`,
`test/*`, `harness/*`, `e2e/*`, and `specs/002-…/*` — all allowed by plan.md.

**T041 evidence truthfulness**: zero statements that present `NODE_INTEGRATION` as browser
evidence, stand-in results as native Prompt API, stand-in counters as AkariSP provider metrics,
caller cancellation as immediate AkariSP task termination, or S6 as guaranteed system-role
support. Evidence files: `browser-automated-2026-09-28.json` → `BROWSER_AUTOMATED`, `standin`,
native availability `MODEL_DOWNLOADABLE`; both `real-browser-*` → `REAL_BROWSER_PROMPT_API`,
`native`, `MODEL_AVAILABLE`. Two truthfulness bugs found and fixed earlier (stand-in availability,
stale dev-server revision) are recorded above.

**T043 reproducibility (SC-012)**: fresh `git clone` into a scratch directory, checkout `85cdef2`,
`package-lock.json` SHA-256
`844a251bed4f5c3771abd5033119c55f557e967c9aa7d8f0319d67d086a4a017`, Node v23.9.0, macOS:
`npm ci` 0 · typecheck 0 · build 0 · `npm test` 19 pass / 0 fail · `npm run test:browser` 2 passed.
Real-browser prerequisites and steps: `quickstart.md` (Chrome with Prompt API and an available
on-device model; restart `npm run harness` after any commit before a run).

### T042 coverage

| Req | Evidence |
|---|---|
| FR-001 | T003/T006/T037: exact `akarisp@0.1.0-alpha.2` from registry, lockfile integrity |
| FR-002 | T038: package-root imports only, private imports 0 |
| FR-003 | `src/integration/akari-chat-model.ts` (application-local) |
| FR-004 | `test/akari-chat-model.test.ts` (user → `[{role:'user',content}]`) |
| FR-005 | same test (output → `AIMessage`); real S1 |
| FR-006 | Node S1; real S1 `REAL_BROWSER_PROMPT_API` |
| FR-007 | Node S2; real S2 |
| FR-008 | Node S3; stand-in and real S3 (`active 1, queued 1`) |
| FR-009 | Node S3 (2 `start` events while 1 active/1 queued); T039 (no queue code in `src/`) |
| FR-010 | S3 snapshots in Node, Playwright and real Chrome |
| FR-011 | Node S4 + active cancel; real S4 `queued+active` (`TaskError:cancelled`, `0/0`) |
| FR-012 | bridge tests (same `TaskError` / error object rethrown); S7 `TaskError:closed` |
| FR-013 | `test/structured.test.ts` (1 fallback); real S5 (fallback fired once) |
| FR-014 | structured test "fallback failure: its error propagates, no third request" |
| FR-015 | counts in every evidence record (workflow operations / logical requests / fallbacks) |
| FR-016 | `providerInvocations: NOT EXPOSED` (native); stand-in count labeled separately |
| FR-017 | Node S7; stand-in and real S7 (idempotent shutdown, `closed 0/0`) |
| FR-018 | 13 `DETERMINISTIC_TEST` tests |
| FR-019 | two real-browser records (Chrome 152 per UA, Chrome 153) |
| FR-020 | real records classified `REAL_BROWSER_PROMPT_API` by the harness rule (native + available + S1) |
| FR-021 | T039: LangGraph 0, agent/graph code 0 |
| FR-022 | T040: AkariSP production changes 0 |
| FR-023 | findings reviews T022/T035 (none); research N-2 corrected by evidence, no core change proposed |
| SC-001 | T037 + T038 |
| SC-002 | bridge tests + Node S1 |
| SC-003 | `evidence/real-browser-2026-09-28.json`, `evidence/real-browser-2026-09-28-ce3f946.json` |
| SC-004 | S2 (1 runtime construction, 2 requests) in Node and real Chrome |
| SC-005 | S3 in Node, Playwright, real Chrome |
| SC-006 | S4 queued + active in Node and real Chrome; orphaned work 0 (`0/0`) |
| SC-007 | structured tests (≤ 1 fallback, abort → 0); real S5 fallbacks 1 |
| SC-008 | evidence counts; provider invocations `NOT EXPOSED` |
| SC-009 | S7 everywhere; every harness scenario shuts its runtime down |
| SC-010 | 13 deterministic tests pass |
| SC-011 | T039 + T040 |
| SC-012 | T043 clean-clone reproduction |

### T044 completion record

```text
AkariSP installed version: 0.1.0-alpha.2
LangChain installed version: 1.2.13
private AkariSP imports: 0
LangGraph dependencies: 0
AkariSP production changes: 0
typecheck: PASS
build: PASS
deterministic tests: PASS (13/13)
Node integration: PASS (6/6, stand-in)
Playwright stand-in: PASS (2/2)
REAL_BROWSER_PROMPT_API: PASS (Chrome 152 per UA @ 5dac1a2; Chrome 153 @ ce3f946)
single request: verified
reuse: verified
concurrent x2: verified
queue: verified
cancellation: verified (queued + active, real Prompt API)
structured fallback: verified (real model fallback fired exactly once)
abort fallback count: 0
shutdown: verified
provider invocation count: NOT EXPOSED
Implementation status: COMPLETE
Real-provider validation: PASS
Feature status: COMPLETE
```

Observations carried forward (not findings): N-1 registry `gitHead`; N-2 corrected; N-6 real
model wraps JSON in code fences (fallback fires); N-7 `system` role accepted in two real runs
(not a contract); `@types/node` dev-dependency deviation; `../akariSP` moved externally to
`7e8202e` during the Feature (no production change).
