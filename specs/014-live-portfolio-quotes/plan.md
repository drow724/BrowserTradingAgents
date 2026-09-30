# Implementation Plan: Feature 014 — Live Quotes for Portfolio Analysis

**Branch**: `014-live-portfolio-quotes` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-live-portfolio-quotes/spec.md`

## Summary

Widen the Feature 007 market boundary from its one configured instrument (IBM) to the symbols of real holdings
(KR `NNNNNN.KS/.KQ`, US tickers; BTC not quotable after the real check, F014-R3), add the 52-week range to the bundle, and cache successful
bundles per symbol and trading day. In the browser, a pure function turns a bundle into the fixture's
`InstrumentFacts` shape, so the existing `factSet(h, fixture)`, graph, checker and number modes run unchanged on
live facts. `?quotes=live|fixture` (default `live` for portfolio analysis) selects the source; the example
portfolio, the measurement and all tests use `fixture`. Quotes are fetched in parallel before the first run;
failures fall back to "market data not available", never to fixture values. The answer window shows the source,
the quote date and a research/not-advice notice. Graph, prompts, checker rules and AkariSP are unchanged.

## Technical Context

**Language/Version**: TypeScript (Next.js 16.3.6, React 19.3.0); Node 23.9 for tests

**Primary Dependencies**: none new; Feature 007 Yahoo adapter (`src/server/market-provider.ts`), market bundle
(`src/market-bundle.ts`)

**Storage**: in-memory server cache (per instance, success only); holdings stay in browser storage (Feature 009)

**Testing**: `node --test` (symbol mapping, bundle 52-week range, live facts, route acceptance and cache with the
controlled chart bodies); Playwright with the Feature 007 market stand-in (live KR/US, BTC and gold not quotable, failures, cancel,
fixture unchanged); opt-in real Yahoo check (`BTA_REAL_YAHOO=1`, maintainer approval)

**Target Platform**: installed Chrome (native) and Playwright Chromium (stand-in); Next.js Node server

**Project Type**: web application (single Next.js project)

**Performance Goals**: quote phase ≤ 5 s before the first run when the source responds (SC-004); cancel ≤ 1 s

**Constraints**: fixture facts byte-identical to Feature 013; demo `?data=` unchanged; graph, prompts, checker rules
unchanged; no fixture fallback for real holdings; Yahoo Terms §2.4 recorded, not resolved (FR-015); AkariSP changes 0

**Scale/Scope**: one quote per holding per question (≤ 6 for the example-sized overview); real check ≥ 5 answers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| II Deterministic fixtures | Measurement, tests and example stay on `portfolio-fixture@1`; live paths tested against the controlled stand-in; real source opt-in only | PASS |
| III Application owns orchestration | Quote phase, fact building and fallbacks are application code before the graph | PASS |
| IV / V AkariSP | Untouched | PASS |
| VI Browser first | Inference stays in the browser; the server only prepares data (ADR 0001) | PASS |
| VII Reproducible runs | Live records keep provider, quote date and bundle digest; facts are in the record | PASS |
| VIII No trading-quality claims | Research/not-advice notice on every answer; checks are grounding and data correctness only | PASS |
| IX External data | A separate application Feature; Yahoo was introduced in Feature 007 with the recorded §2.4 restriction; no news, broker or exchange API | PASS |
| X Thin boundaries | Provider-independent bundle and route kept; no registry or provider chain | PASS |
| XI Reference semantics | Upstream Market Analyst also uses yfinance daily data; facts keep the Feature 010 shape (adaptation A-014-1 records the reduced indicator set) | PASS |
| XII Findings before fixes | Not applicable (no fix of recorded findings) | PASS |

Post-design re-check: unchanged — PASS.

## Project Structure

### Documentation (this feature)

```text
specs/014-live-portfolio-quotes/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R11
├── data-model.md
├── quickstart.md
├── contracts/
│   └── quotes.md        # /api/market widening + browser quote functions
└── checklists/requirements.md
```

### Source Code (repository root)

```text
app/api/market/route.ts        # accept holding symbols (allowlist), per-symbol instrument, cache
src/market-bundle.ts           # range52w in bundle + validation; yahooSymbol() and symbol rules (shared)
src/server/market-provider.ts  # per-market unfinished-session rule, meta.currency check, range52w
src/quotes.ts (new)            # browser: fetchQuotes(), liveInstrumentFacts(), liveFixture()
components/Shell.tsx           # quotes mode, quote phase + cancel, example → fixture, ledger basis
components/Answer.tsx          # source line + research/not-advice notice
src/main.ts                    # record the analysis' dataSource instead of the fixed fixture one
src/ledger.ts, components/Ledger.tsx  # price basis 'latest-live'
e2e/market-stub.mjs, test/fixtures/market/stub-bodies.ts  # per-symbol time zone and currency
test/quotes.test.ts (new), test/market-*.test.ts  # unit tests
e2e/live-quotes.spec.ts (new)  # stand-in browser tests
e2e/*.spec.ts                  # portfolio tests pin quotes=fixture where they seed holdings directly
```

**Structure Decision**: single Next.js project, as since Feature 006. One new browser module (`src/quotes.ts`); the
symbol rules live next to the bundle because both the route and the browser need them.

## Complexity Tracking

No violations to justify.
