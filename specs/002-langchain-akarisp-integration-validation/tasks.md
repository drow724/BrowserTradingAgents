# Tasks: Feature 002 — LangChain.js ↔ AkariSP Integration Validation

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/bridge.md](contracts/bridge.md),
[contracts/evidence.md](contracts/evidence.md), [quickstart.md](quickstart.md), Constitution v1.0.0.

**Feature type**: first **implementation** Feature. Tests are required (Constitution Verification
Rules; spec FR-018): deterministic tests are written before the code they check.

## Conventions

- `FD` = `specs/002-langchain-akarisp-integration-validation`.
- `FD/verification.md` = the single running record for baseline, gate results, findings and the
  final completion status (created in T001, appended by later tasks).
- Evidence JSON files go to `FD/evidence/` in the shape of `contracts/evidence.md`.
- Evidence classes are never mixed: `DETERMINISTIC_TEST` (fake `Runtime`), `NODE_INTEGRATION`
  (real `akarisp` + **stand-in** `LanguageModel`), `BROWSER_AUTOMATED` (Playwright Chromium +
  **stand-in**), `REAL_BROWSER_PROMPT_API` (native Prompt API in real Chrome) or `BLOCKED`.
- Provider invocation count through AkariSP's public API: **`NOT EXPOSED`**. Stand-in counters
  are test instrumentation only and are always labeled "stand-in".
- AkariSP is imported only as `from 'akarisp'` (package root). Never `akarisp/…` subpaths other
  than published exports, never `../akariSP`, never `file:` dependencies.
- Allowed production files: `src/integration/akari-chat-model.ts`, `src/integration/structured.ts`.
  No runtime manager, client, registry, router, retry/queue manager, session pool or factory.
- New integration problems → **Finding** in `FD/verification.md` using the spec's Finding Format;
  never an AkariSP change task.
- `[P]` = different file, no dependency on an incomplete task; it never applies across the
  checkpoints below.
- Story labels: US1 single invocation, US2 reuse + cleanup, US3 concurrency/queueing,
  US4 cancellation, US5 structured fallback.

---

## Phase 1: Baseline

- [X] T001 Create `FD/verification.md` with a Baseline section: BrowserTradingAgents `git rev-parse HEAD` and branch (`002-langchain-akarisp-integration-validation`), active feature from `.specify/feature.json`, constitution version `1.0.0`, AkariSP baseline `akarisp@0.1.0-alpha.2` / reference commit `7e8202e6ab91af386abc9e2416d9cb07fdfacecf` with research note N-1 (registry `gitHead` `bd5b66e`, production source identical), LangChain baseline `@langchain/core@1.2.13`, the fact that no `package.json` / `src/` exists yet, the `../akariSP` HEAD (read-only `git -C ../akariSP rev-parse HEAD`) recorded as **not a dependency**, and `git -C ../akariSP status --porcelain` output for later comparison.

---

## Phase 2: Project Tooling (blocking)

- [X] T002 Create `package.json` at repo root: `"private": true`, `"type": "module"`, `"engines": { "node": ">=22.18" }`, scripts `typecheck` = `tsc --noEmit`, `build` = `vite build`, `test` = `node --test test/*.test.ts`, `test:browser` = `playwright test`, `harness` = `vite`. No dependencies added by hand.
- [X] T003 Install dependencies with exact versions: `npm install --save-exact akarisp@0.1.0-alpha.2 @langchain/core@1.2.13` and `npm install --save-dev typescript@^5.9 vite@^8.3 @playwright/test@^1.63`; keep the generated `package-lock.json`. Install nothing else (no LangGraph, no UI framework, no test framework besides Playwright).
- [X] T004 [P] Create `tsconfig.json`: `strict`, `target` ES2022, `module`/`moduleResolution` `"nodenext"` or `"bundler"` consistent with running `.ts` via `node --test` (use `allowImportingTsExtensions` + `noEmit` + `erasableSyntaxOnly`), `lib` `["ES2022","DOM"]`, `include` `["src","test","harness","e2e","*.config.ts"]`.
- [X] T005 [P] Create `.gitignore` entries for `node_modules/`, `dist/`, `test-results/`, `playwright-report/`.
- [X] T006 Verify installed packages and record in `FD/verification.md` (Gate G7 initial): `node_modules/akarisp/package.json` `version` = `0.1.0-alpha.2`; `package-lock.json` entry for `akarisp` has `resolved` on `registry.npmjs.org` and `integrity` = research R1 value; `exports` = only `.` and `./webllm`; `node_modules/@langchain/core/package.json` `version` = `1.2.13`; no `file:` or `../akariSP` anywhere in `package.json` / `package-lock.json`; no `@langchain/langgraph` in `package-lock.json`. Any mismatch with research R1–R3 → Finding, not a baseline change.
- [X] T007 Create `vite.config.ts` (root `harness/`; `build.outDir` `../dist`; `define` of `__BTA_REVISION__` from `git rev-parse HEAD` and `__AKARISP_VERSION__` / `__LANGCHAIN_CORE_VERSION__` read at build time from `node_modules/*/package.json`) and `playwright.config.ts` (one `chromium` project; `webServer` = `npx vite --port 5173 --strictPort`; `baseURL` `http://localhost:5173`).

**Checkpoint**: `npm run typecheck` runs (no sources yet is acceptable); dependencies match baseline.

---

## Phase 3: Thin Bridge — US1 (Priority P1)

**Goal**: `AkariChatModel` forwards one LangChain invocation to `Runtime.run` and returns an `AIMessage`.
**Independent Test**: `node --test test/akari-chat-model.test.ts` with a fake `Runtime`.

- [X] T008 [P] [US1] Write `test/akari-chat-model.test.ts` (`DETERMINISTIC_TEST`, fake object typed as `Runtime` from `akarisp` that records calls): (a) one `HumanMessage` → `runtime.run` called exactly once with `[{ role: 'user', content }]`; (b) `TaskResult.output` → returned `AIMessage.content`; (c) the caller's `AbortSignal` is the same object passed as `run(..., { signal })`; (d) a rejected `TaskError` (code `failed`) is rethrown as the **same** object (`instanceof TaskError`, same `code`); a non-`TaskError` error is rethrown unchanged; never a success message; (e) `logicalRequests` increments by 1 per call; (f) one `start` and one terminal (`done` / `error` with `errorKind` = `TaskError.code` or `'other'`, and `timing`) event per request with the same `logicalRequestId`; (g) a `SystemMessage` is forwarded as `role: 'system'` unchanged — no flattening into user text, no support claim; (h) non-string content or an unsupported message type throws `TypeError` before `run` is called.
- [X] T009 [US1] Implement `src/integration/akari-chat-model.ts` per `contracts/bridge.md`: `class AkariChatModel extends SimpleChatModel` (import from `@langchain/core/language_models/chat_models`), constructor `{ runtime: Runtime; onEvent?: (e) => void }`, `_llmType()` = `'akarisp'`, `_call(messages, options)` → convert (`human→user`, `ai→assistant`, `system→system`; string content only) → `await runtime.run(input, { signal: options.signal })` → `output`. Rethrow errors unchanged. No queue, pool, timer, retry or fallback in this file.
- [X] T010 [US1] Run `npm run typecheck` and `node --test test/akari-chat-model.test.ts`; all pass. Record result (`DETERMINISTIC_TEST`) in `FD/verification.md`.

---

## Phase 4: Structured Fallback — US5 (Priority P3)

**Goal**: one structured-style request, at most one free-text fallback, no fallback on abort.
**Independent Test**: `node --test test/structured.test.ts`.

- [X] T011 [P] [US5] Write `test/structured.test.ts` (`DETERMINISTIC_TEST`, `AkariChatModel` over a scripted fake `Runtime`): (1) parseable JSON → `kind: 'structured'`, `logicalRequests` 1, `fallbacks` 0; (2) first output unparseable → exactly one free-text request, `kind: 'freetext'`, `logicalRequests` 2, `fallbacks` 1; (3) first request rejects with a non-abort error (`TaskError` code `failed`) → exactly one fallback; (4) first and fallback both reject → the fallback's error propagates and `run` was called exactly 2 times (no third request); (5) caller signal aborted during the first request (and separately a `TaskError` code `cancelled`) → abort/cancel error propagates, `fallbacks` 0, `run` called exactly 1 time. Each case counts as 1 workflow operation.
- [X] T012 [US5] Implement `src/integration/structured.ts` per `contracts/bridge.md`: `structuredOrFreeText(model, input, parse, { signal? })`; fall back only when the signal is not aborted and the error is not a `TaskError` with code `cancelled`; never loop. Not a generic retry helper.
- [X] T013 [US5] Run `npm run typecheck` and `npm test`; `test/akari-chat-model.test.ts` and `test/structured.test.ts` pass. Record in `FD/verification.md`.

**Checkpoint A**: bootstrap + deterministic bridge and fallback — `npm run typecheck` and `npm test` green.

---

## Phase 5: Node Integration with the Real AkariSP Package — US1

**Goal**: real `akarisp` `createRuntime` behind the bridge, with a platform stand-in for `LanguageModel`.

- [X] T014 [P] Write `test/standin.ts`: a **stand-in** Prompt API (header comment: "STAND-IN — not the Chrome Prompt API; evidence produced with it is never REAL_BROWSER_PROMPT_API") installable on a given global object: `availability()` → `'available'`; `create(config)` → base with `clone({ signal })` → session with `prompt(input, { signal })` that resolves a deterministic string derived from the input after a **manually released gate** (for deterministic queue timing) and rejects with the signal's reason when aborted, and `destroy()`; base `destroy()`. Expose `standinCounters` (`creates`, `clones`, `prompts`) labeled stand-in-only, plus `release()` helpers.
- [X] T015 [US1] Write S1 in `test/node-integration.test.ts` (`NODE_INTEGRATION`, stand-in): install the stand-in on `globalThis`, `createRuntime()` from `akarisp`, `new AkariChatModel({ runtime })`, `invoke([new HumanMessage('…')])` → `AIMessage` with the stand-in's deterministic output; `snapshot().state === 'ready'`; `await runtime.shutdown()` in `finally`.

---

## Phase 6: Lifecycle, Queueing, Cancellation, Shutdown

- [X] T016 [US2] Add S2 reuse to `test/node-integration.test.ts`: the test counts its own `createRuntime()` calls (must be 1); two sequential invokes both succeed; `snapshot().state === 'ready'` between and after them; stand-in `creates === 1` (stand-in-only corroboration). No private AkariSP state is read.
- [X] T017 [US3] Add S3 concurrent ×2 to `test/node-integration.test.ts`: default `limit` (1); start invokes A and B without awaiting; while A's stand-in gate is closed, `snapshot()` reads `{ active: 1, queued: 1 }` and the bridge has emitted 2 `start` events (both calls reached `runtime.run` — no bridge queue); release gates; both resolve; B's logged `timing.queueWait > 0`; afterwards `snapshot()` `{ active: 0, queued: 0 }`.
- [X] T018 [US4] Add S4 queued cancellation to `test/node-integration.test.ts`: A active (gate closed), B queued with its own `AbortController`; abort B → B's `invoke` rejects with an abort error (not a response, not a placeholder string); poll `snapshot()` until `queued === 0` (research N-2: the caller may reject before AkariSP settles); bridge log for B ends with `errorKind: 'cancelled'`; A unaffected: release → A resolves; final `snapshot()` `{ active: 0, queued: 0 }`; one further invoke succeeds (runtime reusable).
- [X] T019 [US4] Add active cancellation to `test/node-integration.test.ts`: A active (gate closed), abort A → caller rejects; poll `snapshot()` until `active === 0`; bridge log `errorKind: 'cancelled'`; a further invoke succeeds.
- [X] T020 [US2] Add S7 shutdown/cleanup to `test/node-integration.test.ts`: after completed work, `await runtime.shutdown()` twice (both resolve, neither rejects); `snapshot()` = `{ state: 'closed', active: 0, queued: 0 }`; an invoke after shutdown rejects with `TaskError` code `closed` (public contract per research R2). If AkariSP returns a different public outcome, record a Finding and assert the observed contract — do not wrap it in application state.
- [X] T021 Run `npm test`; all Node integration scenarios pass. Record in `FD/verification.md` as `NODE_INTEGRATION (stand-in)` with counts: workflow operations, logical requests, fallbacks (from the bridge/helper), provider invocations `NOT EXPOSED` (stand-in prompt count reported separately and labeled).
- [X] T022 Findings review for Phases 3–6: for any behavior that contradicted `research.md` R2/R4 (cancellation outcome, queue observability, signal propagation, shutdown outcome), write a Finding in `FD/verification.md` with an application-workaround analysis; otherwise record "no findings". No AkariSP change task in any case.

**Checkpoint B**: real AkariSP Node integration — reuse, queueing, cancellation and shutdown green.

---

## Phase 7: Browser Harness

- [X] T023 [P] Create `harness/index.html`: no framework; a **Run** button, an availability line, a `<pre id="evidence">` block that always shows the JSON, and a **Copy JSON** button; loads `./main.ts` as a module.
- [X] T024 Create `harness/main.ts` setup: read `?provider=standin` (install `test/standin.ts` on `window` before any runtime is created) or native (default); classify Prompt API availability exactly as research R7 using only `LanguageModel.availability()` (never triggers a download); build the evidence skeleton from `contracts/evidence.md` including `feature`, `revision` (`__BTA_REVISION__`, `__AKARISP_VERSION__`, `__LANGCHAIN_CORE_VERSION__`), `userAgent`, `date`, `runtimeOptions`; a harness watchdog (120 s per scenario, labeled as harness behavior, not AkariSP).
- [X] T025 Implement scenarios S1 single, S2 reuse, S3 concurrent ×2 in `harness/main.ts`: each scenario creates its own runtime (`createRuntime({ limit: 1 })`, counted) and always calls `shutdown()` in `finally`; S3 records the `snapshot()` taken right after both invokes start. Prompts are short, fixed strings (no market data).
- [X] T026 Implement S4 cancellation (queued; plus active when a model is available), S5 structured (`structuredOrFreeText` with a fixed JSON request and a tiny shape check; record `kind`, `logicalRequests`, `fallbacks`), S6 system-role observation (invoke `[SystemMessage, HumanMessage]`, record `observation` as `supported` / `rejected` (with error) / `unavailable`, outcome `OBSERVED`; never PASS/FAIL), and S7 cleanup (double shutdown, closed snapshot, request after shutdown) in `harness/main.ts`. S4 waits on `snapshot()` for settlement (research N-2).
- [X] T027 Implement evidence classification in `harness/main.ts`: `provider: 'standin'` → `BROWSER_AUTOMATED`; `provider: 'native'` + `MODEL_AVAILABLE` + S1 PASS → `REAL_BROWSER_PROMPT_API`; otherwise `BLOCKED` with `blocked.reason`, `stillVerified`, `unverified`; skipped scenarios are `BLOCKED`, never `PASS`; `counts.providerInvocations` = `'NOT EXPOSED'` for native, stand-in prompt count (labeled) for stand-in.
- [X] T028 Run `npm run typecheck` and `npm run build`; both pass (harness bundles `akarisp` and `@langchain/core` for the browser). Record in `FD/verification.md`.

---

## Phase 8: Browser Automated Evidence (stand-in)

- [X] T029 Write `e2e/harness.spec.ts`: open `/?provider=standin`, click **Run**, read `#evidence` JSON; assert `evidenceClass === 'BROWSER_AUTOMATED'`, `provider === 'standin'`, S1–S5 and S7 `PASS`, S6 `OBSERVED`, S3 snapshot `{ active: 1, queued: 1 }`, S4 `snapshotAfter` `{ active: 0, queued: 0 }`, S5 `fallbacks ≤ 1`, S7 `state: 'closed'`; write the JSON to `FD/evidence/browser-automated-<YYYY-MM-DD>.json`.
- [X] T030 Add a second test to `e2e/harness.spec.ts`: open `/` (native, Playwright Chromium has no Prompt API model) → availability recorded (e.g. `API_ABSENT`) and `evidenceClass === 'BLOCKED'` with `blocked` filled and no scenario reported `PASS` (exercises the Browser Unsupported Policy).
- [X] T031 Install the Playwright Chromium engine (`npx playwright install chromium`, browser binary only) and run `npm run test:browser`; both tests pass. Record in `FD/verification.md` as `BROWSER_AUTOMATED (stand-in)` — explicitly not native Prompt API evidence.

**Checkpoint C**: harness + Playwright stand-in green; implementation complete except real-provider evidence.

---

## Phase 9: Real Chrome Prompt API Evidence

- [X] T032 Start the harness with `npm run harness` and record in `FD/verification.md` the Chrome version (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --version`), the served URL `http://localhost:5173/`, and the BrowserTradingAgents revision under test.
- [X] T033 **MANUAL CHECKPOINT** — the user opens `http://localhost:5173/` in Google Chrome (153 or another verified Prompt-API Chrome), clicks **Run** (provides user activation), and supplies the JSON. Save it verbatim to `FD/evidence/real-browser-<YYYY-MM-DD>.json`. **Do not mark SC-003 or this task complete until the user has supplied the JSON**; the agent must not infer or fabricate a native run it did not observe.
- [X] T034 Validate the real-browser record against `contracts/evidence.md`: `provider: 'native'`; availability recorded; `REAL_BROWSER_PROMPT_API` only if `MODEL_AVAILABLE` and S1 PASS; S2–S5, S7 outcomes; S6 kept as observation only; `providerInvocations: 'NOT EXPOSED'`. If `BLOCKED`, confirm `reason`, `stillVerified`, `unverified` are filled. Record the result in `FD/verification.md`.
- [X] T035 Findings review for the real provider: any real-browser failure or contract mismatch (cancellation outcome, queue observability, system role, bundling) → Finding in `FD/verification.md` with reproduction and application-workaround analysis; `Core change required` stays `NO` unless reproduction and public-contract analysis show otherwise. No AkariSP change task.

**Checkpoint D**: real Chrome evidence recorded (`REAL_BROWSER_PROMPT_API` or `BLOCKED`).

---

## Phase 10: Final Verification

- [X] T036 Re-run `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser` from a clean `npm ci`; all pass. Record commands and exit codes in `FD/verification.md` (G1–G5).
- [X] T037 Record installed versions via `npm ls akarisp @langchain/core` (must be exactly `0.1.0-alpha.2` and `1.2.13`) and re-check the lockfile `resolved`/`integrity` for `akarisp` (G7).
- [X] T038 Import-boundary audit: `grep -rn "akarisp" src test harness e2e` shows only `from 'akarisp'` (plus types from it); zero `akarisp/dist`, zero `../akariSP`, zero `file:`; record private AkariSP imports = 0 (SC-001).
- [X] T039 Scope audit (G8): no `@langchain/langgraph` in `package.json` / `package-lock.json`; `grep -rniE "langgraph|StateGraph|Market Analyst|Bull|Bear|Research Manager|Trader|Risk Reviewer" src test harness e2e` returns nothing that implements agents or graphs; `src/` contains exactly `integration/akari-chat-model.ts` and `integration/structured.ts`; no queue/pool/limiter/retry code in `src/`.
- [X] T040 AkariSP unchanged: `git -C ../akariSP status --porcelain` and `rev-parse HEAD` equal the T001 record; `git diff --name-only <T001 revision>` in this repo lists only files allowed by plan.md; record AkariSP production changes = 0 (SC-011, FR-022).
- [X] T041 Evidence truthfulness audit over `FD/verification.md` and `FD/evidence/*.json`: zero statements that call `NODE_INTEGRATION` browser evidence, call stand-in results native Prompt API, present stand-in counters as AkariSP provider-invocation metrics, claim caller cancellation ended the AkariSP task immediately, or claim guaranteed system-role support from S6.
- [X] T042 Write the FR-001…FR-023 and SC-001…SC-012 coverage table in `FD/verification.md`, each mapped to the task(s) and evidence (test name or evidence file) that satisfy it; any row without evidence blocks completion.
- [X] T043 Reproducibility check (SC-012): follow `quickstart.md` exactly from a clean checkout of the recorded revision; record the revision, lockfile hash (`shasum -a 256 package-lock.json`), Node and Chrome versions and outcome.
- [X] T044 Write the completion record in `FD/verification.md`:

```text
AkariSP installed version: 0.1.0-alpha.2
LangChain installed version: 1.2.13
private AkariSP imports: 0
LangGraph dependencies: 0
AkariSP production changes: 0
typecheck: PASS
build: PASS
deterministic tests: PASS
Node integration: PASS
Playwright stand-in: PASS
REAL_BROWSER_PROMPT_API: PASS / BLOCKED
single request: verified
reuse: verified
concurrent x2: verified
queue: verified
cancellation: verified
structured fallback: verified
abort fallback count: 0
shutdown: verified
provider invocation count: NOT EXPOSED
Implementation status: COMPLETE
Real-provider validation: PASS / BLOCKED
Feature status: COMPLETE only if REAL_BROWSER_PROMPT_API passed; otherwise BLOCKED / INCOMPLETE
```

**Checkpoint E**: final verification recorded.

---

## Dependencies & Execution Order

```text
T001 → T002 → T003 → (T004 [P], T005 [P]) → T006 → T007
  → Phase 3: T008 [P] → T009 → T010
  → Phase 4: T011 [P] → T012 → T013                     ── Checkpoint A
  → Phase 5: T014 [P] → T015
  → Phase 6: T016 → T017 → T018 → T019 → T020 → T021 → T022   ── Checkpoint B
  → Phase 7: T023 [P] → T024 → T025 → T026 → T027 → T028
  → Phase 8: T029 → T030 → T031                         ── Checkpoint C
  → Phase 9: T032 → T033 (MANUAL) → T034 → T035          ── Checkpoint D
  → Phase 10: T036 → … → T044                            ── Checkpoint E
```

- T008 and T011 may be written in parallel with each other once Phase 2 is done (different files);
  T014 may be written in parallel with Phase 3–4 work (different file).
- Phase 6 edits one file (`test/node-integration.test.ts`) — sequential.
- Phase 7 edits one file (`harness/main.ts`) after T023 — sequential.
- Nothing in Phase 10 starts before Checkpoint D.

## Parallel Opportunities

```text
After T003:  T004 (tsconfig.json) ‖ T005 (.gitignore)
After T007:  T008 (test/akari-chat-model.test.ts) ‖ T011 (test/structured.test.ts) ‖ T014 (test/standin.ts)
Phase 7:     T023 (harness/index.html) can be written while Phase 6 finishes
```

## Implementation Strategy

- **MVP (Checkpoint A)**: tooling + bridge + fallback with deterministic tests — proves the seam
  shape without any provider.
- **Checkpoint B** proves AkariSP's real lifecycle through the bridge (stand-in provider).
- **Checkpoint C** proves the same in a browser engine (stand-in provider). At this point:
  Implementation status = COMPLETE, Feature status = not yet complete.
- **Checkpoint D** is the only gate that can make the Feature COMPLETE (`REAL_BROWSER_PROMPT_API`).
- No task modifies `../akariSP`, publishes AkariSP, adds an AkariSP export or adapter, or installs
  LangGraph.js.
