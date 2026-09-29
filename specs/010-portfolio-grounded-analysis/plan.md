# Implementation Plan: Feature 010 — Portfolio-Aware Analysis with Grounding Checks

**Branch**: `010-portfolio-grounded-analysis` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-portfolio-grounded-analysis/spec.md`

## Summary

Portfolio runs reuse the existing eight-role graph and run path. The shell resolves a Korean question to
holdings, builds a fact set per holding from the committed fictional portfolio fixture plus the user's own
position (MD-8), and starts one ordinary run per holding through a `bta-analyze` event. The graph input gains
two optional fields (`holdingFacts`, `question`) that only portfolio runs set, so demo prompts and evidence stay
byte-identical; only the final role answers in Korean (MD-9). A deterministic grounding checker classifies every
number, ticker and date in role outputs and the answer; the UI flags unsupported ones. A committed question set
measures grounding with the stand-in (automated) and natively (opt-in, ≥ 3 repetitions) and gives a verdict. A
browser-only paper-trade ledger records final decisions, never orders.

## Technical Context

**Language/Version**: TypeScript (strict), existing toolchain

**Primary Dependencies**: existing only (Next.js 16.3.6, React 19.3.0, LangGraph.js, akarisp 0.1.0-alpha.2). New: 0

**Storage**: browser `localStorage` (`bta.portfolio` from Feature 009, new `bta.ledger`)

**Testing**: `node --test` L1 (resolution, facts, grounding with ≥ 60 labelled claims, ledger, report/verdict),
Playwright (stand-in portfolio runs, overview + cancel, flags, ledger, privacy sentinel, stand-in measurement),
installed Chrome (native fixture gate unchanged; opt-in native measurement)

**Target Platform**: Chrome with the Prompt API (native); Playwright Chromium (stand-in)

**Project Type**: existing single Next.js web app

**Performance Goals**: grounding check < 50 ms per run; native run ≈ 1 min per holding (measured, not a gate)

**Constraints**: no network request in portfolio runs; holdings/questions/answers/ledger never in any request;
Feature 004/007 lifecycle per run; AkariSP 0 changes; graph topology 0 changes

**Scale/Scope**: portfolios of a few to a few dozen holdings; measurement set 20–30 questions

## Constitution Check

| Principle | Check | Status |
|---|---|---|
| I Dogfood before abstraction | No agent framework, no router model, no store layer; pure modules + the existing run path | PASS |
| II Deterministic fixtures first | Committed fictional portfolio fixture and labelled claims; native measurement opt-in only | PASS |
| III Application owns orchestration | Holding resolution and overview sequencing in the app; AkariSP unaware of holdings | PASS |
| IV / V AkariSP lifecycle; evidence before core change | One runtime per run as in Feature 004 (R3); AkariSP 0 changes; observations recorded | PASS |
| VI Browser first | Grounding UI and runs proven in the browser; stand-in and native reports separate | PASS |
| VII Reproducible runs | Evidence adds the fact set, question and grounding; revision recorded as today | PASS |
| VIII No trading-quality claims | Metrics are grounding and trap handling only; ledger has no PnL | PASS |
| IX External data deferred | No new data source (MD-8); portfolio runs make no network request | PASS |
| X Thin integration boundaries | Bridge unchanged | PASS |
| XI Preserve reference semantics | Prompt additions recorded as adaptation A-010-1; topology unchanged | PASS |
| XII Findings before fixes | P-1 (FR-010 runtime wording) recorded for analyze | PASS |
| XIII Inference tiers | Local tier only | PASS |

Post-design re-check: PASS.

## Design decisions

- **D1 Input** (R1): `TradingFixture` gains optional `holdingFacts`, `question`; `readsFor(role, input)` adds the
  portfolio extras only when present; the final role's Korean instruction only when `question` is present.
  Files: `src/graph/trading-fixture.ts`, `src/graph/trading-graph.ts` (prompt builder, evidence reads).
- **D2 Run trigger** (R2, contracts/analysis-events.md): `bta-analyze` / `bta-done` events on `#run`;
  `src/main.ts` `run(analysis?)`; record gains `analysis` (facts, question, grounding, answer language) and keeps
  full role outputs for portfolio runs. `src/main.ts` and `runGraph` hashes change; new hashes recorded (FR-030).
- **D3 Overview** (R3, spec FR-010 as amended by analyze C1): shell-driven sequence of runs; one runtime per run; cancel = flag + `#cancel`.
  Dogfooding evidence: per-run create/shutdown ms, settle flag, cancel latency, context-length failures.
- **D4 Facts** (R4): `src/analysis/portfolio-fixture.ts` (committed fictional data, runtime input per MD-8) and
  `src/analysis/facts.ts` (fact set + derived values, pure).
- **D5 Resolution** (R7): `src/analysis/resolve.ts` (pure).
- **D6 Grounding** (R5, contracts/grounding.md): `src/analysis/grounding.ts` (pure), called by `src/main.ts` after a
  portfolio run; UI marks in `components/Answer.tsx`.
- **D7 Measurement** (R6, contracts/measurement.md): `test/fixtures/grounding/{claims,questions}.json`,
  `src/analysis/report.ts` (aggregate + verdict, pure), `e2e/measurement.spec.ts` (stand-in), opt-in test in
  `e2e/prompt-api.spec.ts` (native).
- **D8 Ledger** (R8): `src/ledger.ts` + 모의 거래 window in `components/Shell.tsx`.
- **D9 UI**: question input and overview progress in the HUD (`components/Shell.tsx`), answer window with facts
  and flags (`components/Answer.tsx`), office narration unchanged (view state only).

## Checkpoints (for /speckit-tasks)

- **A** Baseline (hashes, counts).
- **B** Pure modules + L1: fixture, facts, resolve, grounding (labelled claims), report/verdict, ledger.
- **C** Graph input + `src/main.ts` events; demo prompts/evidence byte-identical proof; new hashes.
- **D** UI: question → resolution → single run → answer with facts and flags; ledger; privacy sentinel.
- **E** Overview + cancel; AkariSP observations.
- **F** Stand-in measurement (automated, deterministic).
- **G** Regression: typecheck, build, `npm test`, `test:browser`, dev smoke, native fixture gate.
- **H** Native measurement (opt-in, installed Chrome, ≥ 3 × every question) → report + verdict.
- **I** Docs, verification, commit on approval.

## Project Structure

### Documentation (this feature)

```text
specs/010-portfolio-grounded-analysis/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/{analysis-events,grounding,measurement}.md
├── checklists/requirements.md
├── evidence/            # native measurement report (H)
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/graph/trading-fixture.ts, trading-graph.ts   # optional input fields, readsFor, Korean final instruction
src/main.ts                                      # bta-analyze / bta-done, analysis block, grounding call
src/analysis/{portfolio-fixture,facts,resolve,grounding,report}.ts   # new, pure
src/ledger.ts                                    # new
components/Shell.tsx, components/Answer.tsx      # question, progress, answer window, ledger window
test/{analysis,grounding,ledger}.test.ts, test/fixtures/grounding/*
e2e/{analysis,measurement}.spec.ts; e2e/prompt-api.spec.ts (opt-in measurement)
```

**Structure Decision**: the existing single Next.js app; new pure modules under `src/analysis/`.

## Complexity Tracking

None.
