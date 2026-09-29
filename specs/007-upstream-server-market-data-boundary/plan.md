# Implementation Plan: Feature 007 — Upstream-Compatible Server Market Data Boundary

**Branch**: `007-upstream-server-market-data-boundary` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-upstream-server-market-data-boundary/spec.md`

**Plan status**: design complete. The maintainer chose the provider on 2026-09-29: Yahoo,
yfinance-compatible, keyless (research R10, R14). A manual approval gate C0
(`LOCAL_NODE_REACHABILITY`, one real Yahoo chart request from local Node) precedes the adapter
work. No production code, dependency or credential was touched.

## Summary

The upstream audit ([research.md](research.md) R0) was done against the frozen source
(`35543d0`). It shows that the reference Market Analyst is a model-driven tool loop over three
tools:
- adjusted daily OHLCV (`get_stock_data`)
- 13 locally computed `stockstats` indicators, 12 of which the prompt offers (`get_indicators`)
- a deterministic Yahoo-only "verified snapshot": latest row, 11 indicators and 30 recent closes

It needs no fundamentals or news.

Feature 007 reproduces the **data** of that contract:
- adjusted daily history of 5 years or more
- the 12 offered indicators with the reference definitions
- the snapshot content

The server delivers this through one same-origin `GET /api/market`. The browser renders
`marketFacts` from the returned bundle and runs the unchanged graph. The tool loop stays adapted
(A4, A-M1).

The canonical provider is Yahoo, accessed with a server-side raw `fetch` of the same chart endpoint
yfinance uses, applying yfinance's `auto_adjust` formula. This path is Yahoo-compatible; it is not an
identical implementation (A-M10). It needs no key, signup or deployment secret. Tiingo, Alpha
Vantage and Massive are future optional providers and are not built.

## Technical Context

- **Language/Version**: TypeScript 5.9.3 (ESM, erasable syntax). Node 23.9 locally; Next requires
  Node 20.9 or later.
- **Primary Dependencies**:
  - unchanged: `next@16.3.6`, `react@19.3.0`, `akarisp@0.1.0-alpha.2`, `@langchain/core@1.2.13`,
    `@langchain/langgraph@1.4.18`
  - **No new dependency**: no provider SDK, no `server-only`, no indicator library (R9)
- **Storage**: none. The local replay goes to `.local/replay/` (gitignored). No cache.
- **Testing**:
  - `node --test` (L1 and L2; the local stub runs in-process)
  - Playwright `chromium` on `next build && next start`, plus a local provider stub as a second
    `webServer` (L3)
  - the native + fixture gate is unchanged
- **Target Platform**: browser plus the Next.js Node server runtime. The route declares `export const runtime = 'nodejs'` (research R9).
- **Project Type**: single Next.js App Router application. It gains one Route Handler.
- **Performance Goals**: none. The limits are protection only: 20 s is owned by `acquireYahoo` and is the only server timer; 30 s is the existing browser page limit.
- **Constraints**:
  - the server does deterministic data preparation only (FR-006): acquisition, normalization,
    indicators, snapshot
  - graph, AkariSP, Prompt API and inference stay in the browser
  - one provider request per run, with no retry and no cache
  - no browser-side provider access or credential
  - fixture mode is independent of the server route
- **Scale/Scope**:

| Status | Files |
|---|---|
| New | `app/api/market/route.ts`, `src/server/market-provider.ts` (the one adapter), `src/market-bundle.ts` (types, validation, indicators, rendering, digests; shared by server and browser), `test/market-bundle.test.ts`, `test/market-route.test.ts`, `test/fixtures/market/*` (synthetic history, golden values, stub bodies), `e2e/market-stub.mjs` |
| Edited | `src/main.ts` (live acquisition step and key UI only), `src/market-data.ts` (reduced to what the browser still needs), `app/page.tsx` (key row removed at retirement), `e2e/app.spec.ts` (live cases on the server path), `playwright.config.ts` (stub `webServer`), `next.config.ts` (code-path list gains nothing new: `src`/`app`/`e2e` already covered), `docs/testing.md`, `docs/roadmap.md` |
| Unchanged | `src/graph/*`, `src/integration/*`, `harness/*`, `test/standin.ts`, the fixture, `runGraph` and settlement code in `src/main.ts` |

No NEEDS CLARIFICATION remains. The one open item is the provider decision, which belongs to the
maintainer (FR-010).

## Constitution Check

| Principle | Check | Result |
|---|---|---|
| I. Dogfood Before Abstraction | one concrete adapter; the only seam is the configurable base URL used by the stub; no registry | PASS |
| II. Deterministic Fixtures First | fixture stays default and server-independent; controlled L1–L3 before any real provider | PASS |
| III. Application Owns Orchestration | acquisition ordering stays in `src/main.ts`; the server only acquires | PASS |
| IV. AkariSP Owns Inference Lifecycle | AkariSP untouched; runtime created only after the bundle | PASS |
| V. Evidence Before Core Change | AkariSP changes 0 | PASS |
| VI. Browser First | graph/inference in the browser; server is data-only | PASS |
| VII. Reproducible Agent Runs | revision, digests, freshness fields, local replay | PASS |
| VIII. No Trading-Quality Claims | none | PASS |
| IX. External Data Deferred | IX defers external live data during the initial deterministic stages and lets it enter as a separate Feature once the deterministic workload is stable. Its "initial phase MUST NOT" list (which names Yahoo) applies to those stages. Feature 005 is the precedent for the transition (an external-data boundary as its own Feature after 001–004). Feature 007 is a separately scoped Feature after 001–006, the fixture stays default, and real Yahoo runs only at approval gates C0/G, so it is constitution-compatible. No amendment is made here; if the wording itself is judged contradictory, it is recorded as a finding | PASS |
| X. Thin Integration Boundaries | `AkariChatModel` unchanged | PASS |
| XI. Preserve Reference Semantics Explicitly | R0 audit + ledger A-M1…A-M8 | PASS |
| XII. Findings Before Fixes | F007-R1, F007-R2 recorded; stop conditions below | PASS |
| XIII. Inference Tiers | local tier only | PASS |

Post-design re-check: PASS. Complexity Tracking is empty.

## Project Structure

### Documentation

```text
specs/007-upstream-server-market-data-boundary/
├── spec.md, checklists/requirements.md
├── plan.md            # this file
├── research.md        # R0 upstream audit … R13 retirement
├── data-model.md      # MarketBundle, failures, evidence, replay
├── contracts/market-data-api.md, contracts/market-data-errors.md
├── quickstart.md
└── tasks.md           # /speckit-tasks (after the provider decision for C onward)
```

### Source

```text
app/api/market/route.ts      # GET; dynamic; symbol check; calls the adapter; no-store; typed errors
src/server/market-provider.ts# approved provider: fetch(baseUrl, {signal, cache:'no-store'}), key from env
src/market-bundle.ts         # MarketBundle types, validation, session dating, indicators, render, digests
src/main.ts                  # prepareLive: fetch('/api/market?symbol=…', {signal}) → validate → render
e2e/market-stub.mjs          # local provider stub (L3) recording requests
```

## Design

### Flow (live)

```text
Browser Run ─► fetch /api/market (run signal) ─► route (request.signal) ─► acquireYahoo (signal + limitMs 20 s) ─► provider
   │                                                       │
   │◄──── MarketBundle | {market-data, stage, kind} ◄───────┘
   ├─ validate → renderMarketFacts → digests/replay → aborted? → failure (creates 0)
   └─ runGraph(input)  (unchanged: runtime → graph → settle {ready,0,0} → shutdown)
```

Fixture mode never calls `/api/market`.

### Key decisions (details in research)

| Topic | Decision | Ref |
|---|---|---|
| Fidelity | reproduce the data: history, 12 indicators with stockstats definitions, snapshot content. Adapt the loop and selection | R0.6, R1 |
| Endpoint | `GET /api/market?symbol=`; server fixes `analysisDate` | R2 |
| Caching | default not cached (docs + spike `ƒ`), made explicit: `force-dynamic`, `no-store` fetch and response; test: 2 calls → 2 stub requests | R3 |
| Time zone | exchange-local session dates via `Intl`; no current open session; stale > 10 days → `unavailable`; SC-011 under two `TZ` | R4 |
| Cancellation | route passes `request.signal`; `acquireYahoo` owns the single `limitMs` (20 s) timer. Spike: browser abort → route abort → upstream socket closed about 1 ms later. Application guarantee independent of sockets | R5 |
| Failures | Feature 005 kinds + `invalid-request`; `stage`; HTTP mapping table | R6 |
| Feature 005 code | reuse ordering, digests, replay, rendering pattern; retire browser Massive fetch, key field, `ageHours` | R7, R13 |
| Tests | L1 golden indicators (generated offline from frozen-venv `stockstats 0.6.8`), L2 route + in-process stub, L3 browser + stub `webServer` | R8 |
| Provider | Yahoo chart endpoint via raw `fetch`, no cookie/crumb/key, yfinance `auto_adjust` ratio; missing `adjclose` → `invalid-data`; base URL is server config for the stub | R14 |
| Secret | none on the canonical path; the Feature 005 key field is retired; adapter import scan; no `server-only` dependency; future key providers follow FR-024 | R9 |
| Evidence | `dataSource` gains `boundary`, `provider`, `analysisDate`, `marketAsOf`, `acquiredAt`, `receivedAt`, `usedAt`, counts, digests; no values | R11 |

### Protected invariants

- **INV-1**: hashes of Feature 001–006 specs, verification and evidence stay unchanged
  (baseline taken at Checkpoint A).
- **INV-2**: `src/graph/*`, `src/integration/*`, `harness/*`, `test/standin.ts`, the fixture,
  AkariSP and the `runGraph`/settlement section of `src/main.ts` stay unchanged.
- **INV-3**: live acquisition happens before runtime creation. Every market-data failure or cancel
  has creates 0 and model requests 0.
- **INV-4**: no silent fallback. A live failure never shows or records fixture data as live.
- **INV-5**: no provider origin, secret or provider field reaches the browser.
- **INV-6**: build, test and dev commands never modify tracked files (the Feature 006 rule).

## Checkpoints and states

| Checkpoint | Content | State |
|---|---|---|
| A | baseline (branch, HEAD, `npm test` 62, browser 28 + dev 1); INV-1/INV-2 hashes; upstream audit accepted | `UPSTREAM_CONTRACT_FROZEN` |
| B | `src/market-bundle.ts` + L1 tests (golden indicators, validation, TZ, digests, render) — provider-independent | `SERVER_CONTRACT_DEFINED` |
| C0 (manual, approval) | exactly one unauthenticated Yahoo chart request from **local** Node `fetch` (0 retries, 0 fallbacks, 0 credentials). Outcome class per research R14a: PASS / BLOCKED_RAW_FETCH / RATE_LIMITED_INCONCLUSIVE / ENVIRONMENT / CONTRACT_INCOMPATIBLE. No body committed. Not a Vercel proof. Anything but PASS → STOP, maintainer decision, no automatic crumb/cookie/TLS workaround | `LOCAL_NODE_REACHABILITY` |
| C | Yahoo adapter + route + L2 (stub in-process): every contract row, abort, no-store, adjustment formula | — |
| D | browser live via `/api/market` + stub `webServer` (L3): 8/8, failure matrix creates 0, cancel in acquisition, graph-stage settlement, provider-origin requests 0 | `CONTROLLED_BOUNDARY_VALIDATED` |
| E | security checks (0 provider-origin requests, no key field, import scan), evidence/replay, retire the direct browser path and key field (R13), docs, **default-skipped** real-Yahoo tests, mutation guards A–C | `DIRECT_BROWSER_PATH_RETIRED` |
| F | full regression (`npm test`, browser ×3, dev smoke), approval commit, native + fixture gate (approval), hashes | `IMPLEMENTATION_COMPLETE` |
| G (manual, approval) | real Yahoo L4 (stand-in + live) and L5 (native + live) runs **on the exact clean F-commit SHA**; no key; evidence without values; then a docs/evidence closeout commit | `REAL_PROVIDER_VALIDATED` / `BLOCKED` / `DEFERRED` |

Mutation guards (E; each applied, shown to fail for the intended reason, restored, re-passed, with
diff/hash residue 0):

| Mutation | Change | Designated failing test |
|---|---|---|
| A | adjustment ratio not applied | L2 adjustment test (and golden-based normalization) |
| B | `request.signal` not forwarded by the route or provider | L2 abort test (stub sees no socket close) |
| C | runtime created before the live bundle is acquired and validated | L3 failure/cancel tests (`creates !== 0`) |

Transitional UI: between the live-path switch (D) and retirement (E), the legacy key input can
still render. It is not read by the canonical live path, and it is removed at retirement.

`FEATURE_COMPLETE` requires F plus a *recorded* G outcome (SC-017). Correctness rests on the
controlled gates (B–F). C0 and G are real-Yahoo evidence and never the only proof.

**Direct-path retirement condition** (R13): D and E pass. That means:
- L3 8/8
- provider-origin requests 0
- the failure matrix passes
- cancellation passes
- no credential surface remains
- the evidence/replay checks pass

Only then are the browser Massive fetch and the key field removed.

## Stop conditions (finding first; no workaround)

- a change to an INV-2 file, the graph, prompts, `AkariChatModel` or AkariSP appears necessary
- cancellation cannot keep creates at 0 for acquisition-stage cancels
- `/api/market` responses are cached or reused (the two-call test fails)
- the browser contacts a provider origin, or market values reach evidence or logs
- C0 returns anything other than PASS
- golden indicator values cannot be matched with the documented definitions
- Yahoo's response lacks `adjclose` or history of 5 years or more (the fidelity target falls)
- a Feature 001–006 hash changes

## Provider decision (recorded)

**2026-09-29, maintainer**: the canonical provider is **Yahoo, yfinance-compatible**.

Reasons:
- personal research scope
- the Vercel deployment is the maintainer's own access
- zero-config: end-user keys 0, signup 0, browser credential input 0, deployment secret 0
- closest to the upstream `yfinance` default

| Provider | Status |
|---|---|
| Yahoo (yfinance-compatible) | DEFAULT / CANONICAL |
| Tiingo, Alpha Vantage, Massive | FUTURE OPTIONAL PROVIDER (separate Feature; not built) |

- Yahoo Terms §2.4 (automated access) is a recorded restriction that the maintainer accepts for
  personal research. It is not a legal conclusion and it is not claimed to be resolved (FR-025).
- Failures: typed, with no fixture fallback, no fallback to another provider, creates 0 and model
  requests 0.
- Future `Yahoo default + optional user-configured provider` (for example `BTA_MARKET_PROVIDER`,
  `BTA_TIINGO_API_KEY`) is out of scope.

## Complexity Tracking

No violations.
