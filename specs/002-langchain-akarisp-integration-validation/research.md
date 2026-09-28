# Research: Feature 002 — LangChain.js ↔ AkariSP Integration Validation

Phase 0 of `/speckit-plan`. All decisions below come from inspecting the **published** packages
(`npm pack` into a scratch directory outside the repository, 2026-09-28) and, read-only, the
local `../akariSP` history. Evidence class for this document: `STATIC_CODE_ANALYSIS`.

## R1. AkariSP published package identity

- **Decision**: consume `akarisp@0.1.0-alpha.2` from the npm registry, exact version, pinned by
  the lockfile (integrity `sha512-ntzf/l02WuHMCKOf3Q3LxjieMd5gAXCaomluNwIk1+FDm0tKg9Ba+mAPoKTpBaT/qpWEXO5DLifmdhyXjzE9xQ==`).
- **Observation (note N-1, not a finding)**: the registry metadata `gitHead` is
  `bd5b66e08c423e840c8467d2bb5c6cfd62dfc618` ("release: 0.1.0-alpha.2 intent"), not the recorded
  reference commit `7e8202e`. `bd5b66e` is an ancestor of `7e8202e`, and
  `git diff bd5b66e 7e8202e -- src package.json` is empty: the commits between them touch only
  specs, docs, experiments, tests and `releases/0.1.0-alpha.2.verified.json`. The published
  package therefore corresponds to the reference commit's production source. Baseline unchanged:
  package `akarisp@0.1.0-alpha.2`, reference commit `7e8202e`.
- **Alternatives rejected**: `file:../akariSP` or source imports (forbidden by spec); `akarisp@alpha`
  / `latest` tags (moving targets).

## R2. AkariSP public API (package root `akarisp`)

From `dist/index.d.ts`, `dist/core/runtime.d.ts`, `dist/browser/runtime.d.ts` and the README:

| Export | Kind | Used for |
|---|---|---|
| `createRuntime(options?)` | function → `Promise<Runtime>` | create the Prompt API runtime (base session created here) |
| `TaskError` | class; `code: 'failed' \| 'cancelled' \| 'rejected' \| 'closed' \| 'broken'`, `timing`, `cause` | error semantics preserved by the bridge |
| `Runtime` | type: `state`, `run(input, {signal?, template?})`, `stream(...)`, `snapshot()`, `shutdown()` | bridge target; observability; cleanup |
| `RuntimeOptions` | type: `session?`, `templates?`, `limit?` (default 1), `queueCapacity?` (default 32) | capacity configuration for queueing |
| `RuntimeSnapshot` | type: `state`, `active`, `queued`, `limit`, `queueCapacity` | public active/queued observation |
| `TaskResult` / `TaskTiming` | types: `output`, `timing {queueWait?, acquire?, prompt?, total}` | result + timing evidence |

- `run()` input is `string | readonly object[]` and goes unchanged to the Prompt API session's
  `prompt()`. Each run clones the warm base, prompts the clone, destroys it; the promise settles
  only after destroy and slot release.
- `shutdown()` is idempotent, never rejects, cancels running tasks, rejects waiting ones; snapshot
  then reports `closed` with `0/0`.
- `createCoreRuntime` and `SessionProvider` are **not** exported from the package root
  (README: "No other path is importable"). Deterministic tests therefore cannot inject a provider
  into AkariSP through its public API (note N-5, see R6).
- `run()` forwards only `{signal}` to `prompt()`; Prompt API prompt options such as a response
  constraint are not reachable through AkariSP's public API (note N-4). Not needed by this spec.
- **Provider invocation count**: not exposed (TaskTiming has phases, no invocation count) →
  recorded as `NOT EXPOSED` for real-provider runs (FR-016).

## R3. LangChain.js package and chat-model base

- **Decision**: `@langchain/core@1.2.13` (current `latest`), exact pin. Implement the bridge as a
  subclass of `SimpleChatModel` from `@langchain/core/language_models/chat_models`, implementing
  `_llmType()` and `_call(messages, options)` → string. `SimpleChatModel._generate` wraps the
  string into an `AIMessage`.
- **Rationale**: smallest supported extension point; gives `invoke()` with standard message input
  and AI-message output.
- **Verified in source** (`dist/language_models/chat_models.js`):
  - `_generateUncached` calls `this._generate(...)` **directly**, not through `AsyncCaller`
    (whose `p-queue` and `maxRetries` would add a hidden queue and retries). So invoking the model
    adds no LangChain-level queue or retry in front of AkariSP (FR-009, FR-016).
  - `callOptions.signal` is taken from the runnable config and passed to `_call` options.
- **Alternatives rejected**: `BaseChatModel` direct subclass (more surface, same behavior);
  `langchain` meta-package (not needed); implementing `bindTools` (tool calling out of scope).

## R4. Cancellation semantics across LangChain → bridge → AkariSP

- **Fact (note N-2)**: `Runnable.invoke` wraps the call in `raceWithSignal` (`dist/utils/signal.js`):
  on abort the caller's promise rejects **immediately** with the signal's reason (or
  `Error("Aborted")`), without waiting for the model call to settle. The underlying
  `runtime.run()` still receives the same signal and settles later with
  `TaskError('cancelled')`.
- **Decision**: the bridge forwards `options.signal` unchanged to `runtime.run`. Cancellation
  verification observes both sides: (a) caller rejects with an abort error, not a response;
  (b) AkariSP settles — confirmed by waiting until `snapshot()` shows `active + queued = 0` and by
  the bridge's own log event carrying `TaskError.code === 'cancelled'`.
- **Scenario chosen**: **queued-request cancellation** with `limit: 1` and two concurrent
  requests — it is deterministic in timing (the queued task never reaches the model) and exercises
  the 2-request fan-out shape. Active-request cancellation is additionally run in the browser
  harness when a real model is available (best effort, recorded either way).

## R5. Structured-result fallback

- **Fact (note N-3)**: `BaseChatModel.withStructuredOutput` requires `bindTools` and supports only
  `functionCalling`; tool calling is out of scope, so it is not usable here.
- **Decision**: one application-local function `structuredOrFreeText(model, input, parse)`:
  1 structured-style request (prompt asks for JSON) → `JSON.parse` + tiny shape check; on parse
  failure or a non-cancellation model error → exactly **one** free-text request; if that fails, the
  error propagates. **Cancellation never triggers a fallback** (an aborted signal rethrows at once).
- **Adaptation vs Feature 001 upstream**: upstream fell back on *any* exception; here abort is
  excluded so a cancelled operation cannot issue a new model request. Recorded as intentional.
- **Alternatives rejected**: zod/JSON-schema libraries (a stdlib parse suffices for a small
  deterministic example); Prompt API response constraints (not reachable via AkariSP, N-4).

## R6. Test strategy and tooling

| Layer | Tool | Provider | Evidence class | Covers |
|---|---|---|---|---|
| Unit | `node --test` (Node ≥ 22.18 type stripping; local Node 23.9.0) | fake object typed as `Runtime` | `DETERMINISTIC_TEST` | conversion, error propagation (TaskError preserved), signal forwarding, counting, structured fallback |
| Node integration | `node --test` | real `akarisp` `createRuntime` + stand-in `globalThis.LanguageModel` (platform stand-in, not an AkariSP internal) | `NODE_INTEGRATION` (stand-in) | reuse, limit-1 queueing ×2, queued cancel, shutdown, snapshot 0/0 |
| Browser automated | `@playwright/test` (Chromium engine) | same stand-in injected by `addInitScript` | `BROWSER_AUTOMATED` (stand-in) | harness runs in a real browser engine: import safety, bundle, all scenarios |
| Real browser | harness page opened in installed Google Chrome 153 on `localhost` | native Prompt API | `REAL_BROWSER_PROMPT_API` or `BLOCKED` | SC-003 and real-provider reuse/concurrency/cancel/cleanup |

- Stand-in results are always labeled stand-in and never reported as real Prompt API evidence
  (Principle VI; spec evidence rules).
- **Decision — build/typecheck**: `typescript` (`tsc --noEmit`) for typecheck; `vite` for the
  browser harness dev server and production build. No UI framework.
- **Rationale**: Vite bundles `@langchain/core` and `akarisp` for the browser without config;
  AkariSP's own framework validation used Vite 8.3.
- **Alternatives rejected**: esbuild + ad-hoc static server (two pieces instead of one);
  Vitest/Jest (node:test suffices, matches AkariSP); React etc. (spec forbids unnecessary UI).
- Versions to pin at install (exact via lockfile): `@langchain/core 1.2.13`,
  `akarisp 0.1.0-alpha.2`; dev: `typescript ^5.9`, `vite ^8.3`, `@playwright/test ^1.63`.

## R7. Real Prompt API environment

- **Decision**: follow AkariSP's proven Layer 3 method — the harness page on `http://localhost`
  (secure context) is opened in the installed **Google Chrome 153**; it first classifies
  `LanguageModel.availability()` (`API_ABSENT` / `API_PRESENT_UNAVAILABLE` / `MODEL_DOWNLOADABLE` /
  `MODEL_DOWNLOADING` / `MODEL_AVAILABLE`), never starts a model download on its own, and runs
  scenarios only when `available`. It prints one JSON evidence record that is committed under
  `specs/002-langchain-akarisp-integration-validation/evidence/`.
- A user click on the page provides user activation if the browser requires it. If the model is
  not available or the browser refuses, the record is `BLOCKED` per the spec's policy.
- AkariSP's own repo holds real Chrome 152 Prompt API results on this machine (2026-09-27), so
  availability is plausible but must be re-observed; nothing is assumed.
- **Alternative rejected**: Playwright `channel: 'chrome'` with a fresh profile — on-device model
  availability in a fresh automation profile is not guaranteed; may be tried, but the manual run
  is the evidence of record.

## R8. Message conversion

- **Decision**: LangChain `BaseMessage[]` → Prompt API message array
  `[{ role, content }]` with `human → user`, `ai → assistant`, `system → system`; string content
  only (non-string content → `TypeError`, no silent coercion).
- **Open (verified in browser, not assumed)**: whether the Prompt API accepts `system` role inside
  `prompt()` input. Spec scenarios use user messages only; the harness records system-message
  behavior as an extra observation. AkariSP's documented route for system instructions is
  `session`/`templates` (`initialPrompts`); exposing `template` through the bridge is deferred to
  Feature 003 when agents need it (YAGNI).

## R9. Counting (FR-015, FR-016)

- Logical model requests: counted by the bridge (one per `_call`), each with an application-owned
  `logicalRequestId`.
- Fallback requests and workflow operations: returned by `structuredOrFreeText`.
- Runtime constructions: counted by the harness/test that calls `createRuntime` (reuse evidence
  without private AkariSP state).
- Queued / active: `runtime.snapshot()`.
- Provider invocations: stand-in counts `prompt()` calls (stand-in evidence only); real provider →
  `NOT EXPOSED`.

## Notes summary

| ID | Note | Impact |
|---|---|---|
| N-1 | registry `gitHead` `bd5b66e` ≠ reference `7e8202e`; production source identical | none; baseline unchanged |
| N-2 | LangChain rejects the caller on abort before the model call settles | verification waits on `snapshot()` |
| N-3 | `withStructuredOutput` needs tool calling | application-local fallback helper |
| N-4 | AkariSP `run()` forwards only `signal` to `prompt()` | no constrained decoding via AkariSP; not required |
| N-5 | `createCoreRuntime`/`SessionProvider` not publicly exported | deterministic AkariSP tests use a platform stand-in |

No findings: nothing required by the spec is inexpressible through the public contracts.
