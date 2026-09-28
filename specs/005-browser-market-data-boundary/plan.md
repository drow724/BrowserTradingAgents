# Implementation Plan: Feature 005 — Browser Market Data Boundary

**Branch**: `005-browser-market-data-boundary` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-browser-market-data-boundary/spec.md`

## Summary

Add one application-local market-data step in front of the unchanged Feature 004 graph.

**Live mode**
- The page fetches daily bars at run time for one configured instrument (IBM) from **Massive**
  (`api.massive.com`, free Stocks Basic tier), using a key the owner types at run time. The data is
  **end-of-day**: "live" in this Feature means fetched at execution time, not real-time
  (research R0).
- It normalizes the response into a minimal snapshot and renders `marketFacts` from it.
- It builds a graph input with the real instrument as subject and a committed **neutral news
  fixture**.
- It then runs the eight-role graph exactly as Feature 004 does.

**Fixture mode** is Feature 004 byte for byte.

**Verdicts** ([research.md](research.md) R3):

| Axis | Verdict |
|---|---|
| `TECHNICAL_PURE_BROWSER_VIABILITY` | CONDITIONAL PASS, no server component; R0 browser check pending; success-path CORS proven only at L4 |
| `PERMITTED_USE_VIABILITY` | **UNRESOLVED** (F005-P1); prerequisite P-1 before any authenticated request (L4/L5) |

F005-P2 (SC-009 wording) is closed: the spec now requires reproducible identification plus a local
replay artifact. F005-P1 remains an open prerequisite for L4/L5 only.

**What does not change**
- `src/graph/trading-graph.ts`, `AkariChatModel`, AkariSP and the dependencies
- Graph version `tradingagents-fixture-graph@1`

Committed evidence records market provenance and snapshot + `marketFacts` digests, never market
values. Replay uses a local, gitignored artifact (R6).

## Technical Context

**Language/Version**: TypeScript (ESM), Node 23.9.0; Google Chrome 153 with the Prompt API.

**Primary Dependencies**: unchanged (`akarisp@0.1.0-alpha.2`, `@langchain/core@1.2.13`,
`@langchain/langgraph@1.4.18`). Browser `fetch`, `AbortSignal`, `crypto.subtle.digest` and
`Intl.DateTimeFormat` are platform features, not dependencies.

**External service**: Massive REST, `GET /v2/aggs/ticker/IBM/range/1/day/{from}/{to}`, sent with
`Authorization: Bearer`. It is the only network data request, and only in live mode.

**Storage**: none. The key is held in memory only.

**Testing**:
- `node --test` covers normalization (L1) and the existing suites.
- Playwright `chromium` project uses `page.route`-controlled responses (L3).
- Owner-run L4/L5 in installed Chrome.

**Target Platform**: browser, local `localhost` page, personal use.

**Project Type**: single static browser app.

**Performance Goals**: none. `timing.acquisitionMs` and `timing.graphMs` are recorded.

**Constraints**
- Exactly one source and one request per run.
- No retry, cache, proxy or tool calling.
- No key in source, bundle, URL, storage, evidence, logs or test output.
- Fixture mode stays byte-identical.

**Scale/Scope**

| Area | Files |
|---|---|
| New source | `src/market-data.ts` (acquire, normalize, render; Massive-specific, about 100 lines) |
| New fixture | `NEUTRAL_NEWS` in `src/graph/trading-fixture.ts`; `FIXTURE` untouched |
| Edited source | `src/main.ts` (data axis, key input, acquisition before runtime, evidence, replay), `index.html` (data-mode line, key field, snapshot and replay display) |
| Repo config | `.gitignore` + `.local/` |
| Tests | `test/market-data.test.ts` (new), `e2e/app.spec.ts` (live cases added), `e2e/prompt-api.spec.ts` (owner-run live gate) |
| Docs | `docs/testing.md`, `docs/roadmap.md` |

No NEEDS CLARIFICATION remains (research R1–R11).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Dogfood Before Abstraction | one source in one file; no provider interface, registry or factory (FR-024) | PASS |
| II. Deterministic Fixtures First | fixture mode unchanged and the default; normalization proven on synthetic bodies (L1); network only in live mode | PASS |
| III. Application Owns Orchestration | acquisition, normalization and rendering in `src/` | PASS |
| IV. AkariSP Owns Inference Lifecycle | no runtime exists until market data is ready; AkariSP untouched | PASS |
| V. Evidence Before Core Change | AkariSP changes 0; findings first | PASS |
| VI. Browser First | pure browser (R3); L5 real Chrome + native gate; R0 confirms preflight + error-path CORS in a browser; L4 confirms the authenticated success path | PASS |
| VII. Reproducible Agent Runs | source, symbol, times, `asOf`, `request_id`, two digests, versions, provider, class; replay via the local artifact (SC-009) | PASS |
| VIII. No Trading-Quality Claims | live outputs never asserted; live `result` stores presence and length only | PASS |
| IX. External Data Deferred | Feature 005 is the separate Feature; market data only; the chosen source is not on the principle's named list | PASS (tension recorded in spec) |
| X. Thin Integration Boundaries | `AkariChatModel` unchanged; the data step is not an integration layer | PASS |
| XI. Preserve Reference Semantics | A4 kept: the app acquires data and the model never calls tools; the A3 gap narrows for market data only | PASS |
| XII. Findings Before Fixes | R0 failure → F005-001 and stop; a source switch would also need a finding | PASS |

Post-design re-check: PASS. There are no violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/005-browser-market-data-boundary/
├── spec.md
├── plan.md               # this file
├── research.md           # R1–R11
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── market-data.md    # acquisition, normalization, rendering, failure kinds
│   └── evidence.md       # extension of the Feature 004 evidence contract
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
index.html                     # + data-mode line, live key field, snapshot display
src/
├── main.ts                    # + ?data axis, acquisition before createRuntime, evidence
├── market-data.ts             # new: acquireDailyBars, normalize, renderMarketFacts, digest
├── graph/
│   ├── trading-graph.ts       # unchanged
│   └── trading-fixture.ts     # + NEUTRAL_NEWS, LIVE_INSTRUMENT; FIXTURE unchanged
└── integration/               # unchanged
test/market-data.test.ts       # new (L1)
e2e/app.spec.ts                # + live-mode cases with page.route (L3)
e2e/prompt-api.spec.ts         # + owner-run native live test (L5), skipped without a key
```

**Structure Decision**: single project. There is one new file because acquisition, normalization
and rendering serve one source and one caller; splitting them further would be speculative
(Principle I).

## Design

### Run sequence (`src/main.ts`)

```text
click Run → controller = new AbortController()
  ├─ provider = native && !MODEL_AVAILABLE → BLOCKED record (no fetch, no runtime)     [unchanged]
  │    (provider = stand-in: no native availability gate; the stand-in is already installed)
  ├─ data = fixture → input = FIXTURE                                                 [unchanged]
  └─ data = live
       ├─ no key → failed {boundary: market-data, kind: credential-missing}
       ├─ acquireDailyBars(IBM, key, signal + 30 s limit) → body | market-data failure
       ├─ normalize(body) → snapshot | market-data failure (invalid-data / unavailable)
       └─ input = { id: live-market@1, subject: LIVE_INSTRUMENT label,
                    marketFacts: renderMarketFacts(snapshot), newsFacts: NEUTRAL_NEWS.text }
  → runGraph(input)   # Feature 004 body: createRuntime (selected provider), watchdog 180 s,
                    # invoke, settle, shutdown
```

A market-data failure or cancel returns before `createRuntime`: 0 runtimes, 0 model requests. After
that point, every Feature 004 lifecycle rule applies unchanged (FR-018).

### Mode axes

`?provider` and `?data` are parsed independently (R9). The default is native + fixture, which is
Feature 004's default. The page shows `provider: … · data: …` before a run.

### Key handling

- The password field shows only when `data=live`. Its value is read at click time and passed to
  `acquireDailyBars` as an argument.
- The value is never assigned to globals, storage, URL, `console` or the record. It goes only into
  the `Authorization` header.
- Tests use a dummy key string and assert that it is absent from `#evidence` and from console
  messages (SC-011).
- A bundler environment variable is not used for the key (R3).

### Normalization and rendering

Contract: [contracts/market-data.md](contracts/market-data.md). Model: [data-model.md](data-model.md).

`marketFacts` template (2 sentences, deterministic, with sentinel tags as in the Feature 004
fixture):

> On the <asOf> close <SYMBOL> traded at <close> <CUR>, <±chg>% from the previous session's
> <prevClose> (market fact L1). Over the last <n> sessions it ranged from <low> to <high> on average
> daily volume of <avgVol> shares (market fact L2).

Here <low> is the minimum of `low`, <high> the maximum of `high`, and <avgVol> the rounded mean of
`volume`.

### Evidence and replay

Contract: [contracts/evidence.md](contracts/evidence.md). What it adds and changes:
- `dataSource` block
- `input.id`
- `failure {boundary, kind}`
- `timing.acquisitionMs`
- live-mode `result` redaction
- `marketFactsDigest`, plus the local replay artifact in `#replay` (gitignored `.local/replay/`)

Fixture-mode records equal Feature 004 records plus `dataSource: {mode: 'fixture', …}`.

### Validation ladder (research R10)

| Layer | Content |
|---|---|
| R0 | browser CORS check, keyless |
| L1 | synthetic normalization and live-input construction |
| L2 | Feature 004 suites |
| L3 | Playwright live-mode matrix with controlled responses |
| native + fixture | clean-revision native gate after the implementation commit, no credential, before P-1 |
| P-1 | owner: resolve F005-P1 before any authenticated request |
| L4 | owner live + stand-in (first authenticated success-path CORS proof) |
| L5 | owner live + native at a clean revision (SC-016) |

L4 and L5 are MANUAL (credential entry is the owner's). If they cannot run, they are recorded as
`BLOCKED`, never replaced.

## Complexity Tracking

No violations.
