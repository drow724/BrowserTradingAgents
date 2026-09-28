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
