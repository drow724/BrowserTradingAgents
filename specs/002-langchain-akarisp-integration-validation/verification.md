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
