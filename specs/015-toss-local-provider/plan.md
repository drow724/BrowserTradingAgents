# Implementation Plan: Feature 015 — Toss Securities as a Local Provider

**Branch**: `015-toss-local-provider` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-toss-local-provider/spec.md`

## Summary

First record the decision (ADR 0002) that amends MD-1 for a local, read-only Toss provider. Then a spike (S1) with
the maintainer's own key confirms the unknowns the overview leaves open (candles, symbol codes, holdings fields,
token lifetime). A server-only adapter with a frozen endpoint allowlist (token, accounts, holdings, candles — no
order path at all) serves two same-origin routes: a status route and a holdings route; the existing `/api/market`
gains `source=toss`, building the same bundle through a shared builder. In the browser, the 포트폴리오 window gets a
per-domain source section (holdings: manual/Toss import; KR·US quotes: Yahoo/Toss) stored only in the browser; import
replaces the portfolio after a preview and confirmation. Secrets, tokens and the account seq never leave the server.
Graph, prompts, checker and AkariSP are unchanged.

## Technical Context

**Language/Version**: TypeScript (Next.js 16.3.6, React 19.3.0); Node 23.9 for tests

**Primary Dependencies**: none new; Feature 007/014 market bundle and route; Feature 009 directory

**Storage**: server memory (token, quote cache); browser `localStorage` (`bta.portfolio`, new `bta.sources`)

**Testing**: `node --test` (allowlist, mapping, candles → bundle, failures, leak checks) with an in-process Toss
stand-in; Playwright with the Toss stand-in in `e2e/market-stub.mjs`; opt-in real check `BTA_REAL_TOSS=1`

**Target Platform**: the maintainer's Mac only (local Next server; Toss IP allowlist); public deployments never
expose Toss

**Project Type**: web application (single Next.js project)

**Performance Goals**: within Toss limits (ACCOUNT 1/s, MARKET_DATA 15/s); one holdings call per import; one
candles call per symbol per trading day (cache)

**Constraints**: no order path (FR-004); secrets server-only (FR-003); no provider chain (FR-010); fixture
measurement unchanged; AkariSP changes 0; Toss terms read by the maintainer (recorded, not a legal conclusion)

**Scale/Scope**: one account; KR and US stock positions; ≤ a few dozen holdings

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| II Deterministic fixtures | All automated tests use a fictional Toss stand-in; real calls opt-in with approval | PASS |
| III Application owns orchestration | Import, selection and quote building are application code outside the graph | PASS |
| IV / V AkariSP | Untouched | PASS |
| VI Browser first | Inference stays in the browser; the server only reads data (ADR 0001) | PASS |
| VII Reproducible runs | Records name the quote source per holding; no secret in records | PASS |
| VIII No trading-quality claims | Notice kept; no order capability | PASS |
| IX External data / broker APIs | Broker API introduced only by this separate Feature, after the maintainer-approved decision record (ADR 0002, FR-001), read-only, local only | PASS (with ADR 0002) |
| X Thin boundaries | Same bundle contract; one adapter module; no registry or chain | PASS |
| XI Reference semantics | Toss candles in the Feature 014 fact shape; any difference (e.g. adjustment) recorded as A-015-1 | PASS |
| XII Findings before fixes | Not applicable | PASS |

Post-design re-check: unchanged — PASS (ADR 0002 is task T001 and gates every Toss code task).

## Project Structure

### Documentation (this feature)

```text
specs/015-toss-local-provider/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R9, spike S1
├── data-model.md
├── quickstart.md
├── contracts/
│   └── toss.md          # routes, allowlist, env, failures
└── checklists/requirements.md
docs/adr/0002-toss-local-read-only.md   # decision record (FR-001)
```

### Source Code (repository root)

```text
src/server/toss.ts (new)            # allowlisted client: token cache, accounts, holdings, candles
src/server/market-provider.ts       # extract bundleFrom(sessions, instrument, analysisDate) for both sources
app/api/toss/status/route.ts (new)  # { available, reason }
app/api/toss/holdings/route.ts (new)# reduced positions, no-store
app/api/market/route.ts             # source=yahoo|toss; cache key with source
src/toss-import.ts (new)            # browser: map positions with the directory → holdings + skipped
src/sources.ts (new)                # bta.sources read/write (browser-only)
src/quotes.ts                       # pass the quote source; provider in dataSource
components/Portfolio.tsx, Shell.tsx # source section, import preview + confirm
components/Answer.tsx               # source line names 토스증권
e2e/market-stub.mjs                 # Toss stand-in (fictional)
test/toss.test.ts (new), e2e/toss.spec.ts (new)
```

**Structure Decision**: single Next.js project; Toss code confined to one server module and two routes.

## Complexity Tracking

No violations to justify.
