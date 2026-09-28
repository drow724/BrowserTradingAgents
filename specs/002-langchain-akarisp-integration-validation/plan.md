# Implementation Plan: Feature 002 — LangChain.js ↔ AkariSP Integration Validation

**Branch**: `002-langchain-akarisp-integration-validation` | **Date**: 2026-09-28 |
**Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-langchain-akarisp-integration-validation/spec.md`

## Summary

Bootstrap a minimal TypeScript project and prove one seam: a LangChain.js `SimpleChatModel`
subclass (`src/integration/akari-chat-model.ts`, target: tens of lines) that forwards
`invoke()` to `akarisp@0.1.0-alpha.2`'s `Runtime.run()` with the caller's `AbortSignal`, and returns
the output as an `AIMessage`. A second small file holds the application-level structured →
one-free-text fallback. Correctness is shown in four evidence layers (research.md R6): deterministic
unit tests, Node integration against the real AkariSP runtime with a platform stand-in, Playwright
Chromium with the same stand-in, and a harness page run in real Google Chrome with the native
Prompt API (`REAL_BROWSER_PROMPT_API` or `BLOCKED`).

## Technical Context

**Language/Version**: TypeScript (ESM), Node 23.9.0 locally (≥ 22.18 for `node --test` type
stripping); browser target: Chrome 153.

**Primary Dependencies**: `akarisp@0.1.0-alpha.2` (exact), `@langchain/core@1.2.13` (exact).
Dev: `typescript ^5.9`, `vite ^8.3`, `@playwright/test ^1.63`. Pinned by `package-lock.json`.

**Storage**: none. Evidence JSON files committed under the feature directory.

**Testing**: `node --test` (unit + Node integration), `@playwright/test` (browser automated),
manual harness page in real Chrome (real Prompt API).

**Target Platform**: browser (Chrome with Prompt API); Node only for tests.

**Project Type**: single project — application-local library code + browser harness.

**Performance Goals**: none (spec: not a benchmark). Timing recorded only as lifecycle evidence.

**Constraints**: public AkariSP exports only; no queue/pool/limiter/retry in the bridge;
concurrency exercised at exactly 2; no LangGraph.js; no UI framework.

**Scale/Scope**: ~2 source files, ~4 test files, 1 harness page, 1 Playwright spec.

All unknowns from the spec's Assumptions are resolved in [research.md](research.md) (R1–R9).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Dogfood Before Abstraction | one concrete bridge class + one helper function; no framework, adapter package, registry, retry framework | PASS |
| II. Deterministic Fixtures First | unit tests with a fake `Runtime`; Node integration with a stand-in provider; deterministic prompts only; no market data | PASS |
| III. Application Owns Orchestration | bridge and fallback live in `src/integration/` of this app | PASS |
| IV. AkariSP Owns Inference Lifecycle | queue, limit, cancel, cleanup all delegated to `Runtime`; bridge holds only a `Runtime` reference | PASS |
| V. Evidence Before Core Change | AkariSP source/API/deps changes: 0/0/0; notes N-1…N-5, no findings | PASS |
| VI. Browser First | completion requires `REAL_BROWSER_PROMPT_API`; stand-in evidence labeled; `BLOCKED` policy applied | PASS |
| VII. Reproducible Agent Runs | evidence JSON records revision, lockfile hash, package versions, browser/UA, availability, runtime options | PASS |
| VIII. No Trading-Quality Claims | no model-quality or financial evaluation | PASS |
| IX. External Data Deferred | no external data | PASS |
| X. Thin Integration Boundaries | `src/integration/akari-chat-model.ts`, application-local, not promoted | PASS |
| XI. Preserve Reference Semantics Explicitly | structured fallback excludes cancellation — recorded as intentional difference from upstream (R5) | PASS |
| XII. Findings Before Fixes | spec Finding format adopted; none so far | PASS |
| Verification Rules | typecheck (`tsc --noEmit`), build (`vite build`), deterministic tests (`node --test`), browser evidence | PASS |

Expected changes: application source > 0; tests/harness > 0; AkariSP production/API/deps = 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-langchain-akarisp-integration-validation/
├── spec.md
├── plan.md               # this file
├── research.md           # Phase 0
├── data-model.md         # Phase 1
├── quickstart.md         # Phase 1
├── contracts/
│   ├── bridge.md         # application-facing contract of the bridge + fallback helper
│   └── evidence.md       # evidence record shape
├── checklists/requirements.md
├── evidence/             # created during implementation (JSON evidence records)
└── tasks.md              # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
package.json              # scripts: typecheck, build, test, test:browser, harness
package-lock.json
tsconfig.json
playwright.config.ts
src/
└── integration/
    ├── akari-chat-model.ts   # SimpleChatModel subclass → Runtime.run(messages, {signal})
    └── structured.ts         # structuredOrFreeText(): ≤ 1 fallback, no fallback on abort
test/
├── akari-chat-model.test.ts  # DETERMINISTIC_TEST (fake Runtime)
├── structured.test.ts        # DETERMINISTIC_TEST
├── standin.ts                # stand-in globalThis.LanguageModel (test/harness only)
└── node-integration.test.ts  # NODE_INTEGRATION (real akarisp + stand-in)
harness/
├── index.html
└── main.ts                   # scenarios S1–S7, availability classification, JSON evidence
e2e/
└── harness.spec.ts           # BROWSER_AUTOMATED (Playwright Chromium + stand-in)
```

**Structure Decision**: single project. Only `src/integration/` is application code; the
stand-in lives under `test/` and is imported by the harness only when `?provider=standin`
(automated runs). No integration-owner class: the owner is whoever calls `createRuntime()` and
`runtime.shutdown()` (test / harness) — an extra wrapper would be an abstraction with one use.

## Design Decisions

- **Bridge** (`AkariChatModel extends SimpleChatModel`): constructor takes a `Runtime`.
  `_call(messages, options)`: convert messages (R8) → `await runtime.run(input, { signal:
  options.signal })` → return `output`. Increments `logicalRequests`, assigns
  `logicalRequestId`, emits one structured log event per request (start / done / error with
  `TaskError.code` as `errorKind` and `timing`). Errors are **rethrown unchanged** (the original
  `TaskError` keeps `code`, `cause`, `timing`); correlation is carried by the log event.
- **No queue anywhere in the app**: concurrency comes only from callers issuing parallel
  `invoke()` calls; LangChain's invoke path adds none (R3).
- **Structured fallback** (`structuredOrFreeText`): as R5; returns
  `{ kind: 'structured' | 'freetext', value, logicalRequests, fallbacks }`.
- **Reuse evidence**: tests/harness count their own `createRuntime()` calls (must be 1 per
  owner) and assert every request returned; `snapshot().state` stays `ready` until shutdown.
- **Queueing evidence**: `createRuntime({ limit: 1 })`, two concurrent invokes; while the first
  is running, `snapshot()` must read `{ active: 1, queued: 1 }`; both settle; `queueWait` of the
  second > 0 in `TaskTiming` (logged).
- **Cancellation evidence** (R4): cancel the queued request; caller rejects with abort error;
  bridge log shows `TaskError('cancelled')`; poll `snapshot()` until `active + queued = 0`; a
  further request succeeds.
- **Cleanup evidence**: `await runtime.shutdown()` twice; `snapshot()` = `closed, 0/0`; a request
  after shutdown rejects with `TaskError('closed')` (public contract), never a response.

## Verification Gates (implementation Feature)

| Gate | Command / method | Evidence class |
|---|---|---|
| G1 typecheck | `npm run typecheck` (`tsc --noEmit`) | — |
| G2 build | `npm run build` (`vite build` of harness) | — |
| G3 deterministic tests | `npm test` (unit + structured) | `DETERMINISTIC_TEST` |
| G4 Node integration | `npm test` (node-integration, stand-in) | `NODE_INTEGRATION` |
| G5 browser automated | `npm run test:browser` | `BROWSER_AUTOMATED` |
| G6 real Prompt API | harness in Chrome 153, JSON committed | `REAL_BROWSER_PROMPT_API` / `BLOCKED` |
| G7 import boundary | grep: only `from 'akarisp'` (no `akarisp/…`, no `../akariSP`), lockfile shows 0.1.0-alpha.2 | `STATIC_CODE_ANALYSIS` |
| G8 scope | no `@langchain/langgraph` in lockfile; no agents/graph; AkariSP repo untouched | `STATIC_CODE_ANALYSIS` |

Feature completion requires G1–G8 PASS; G6 `BLOCKED` ⇒ Feature not declared full PASS (spec).

## Post-Design Constitution Re-Check

After Phase 1: two source files, one stand-in used only by tests/harness, no new abstractions,
no dependency beyond R6's list, AkariSP untouched. All rows remain PASS.

## Complexity Tracking

No constitution violations. Table intentionally empty.
