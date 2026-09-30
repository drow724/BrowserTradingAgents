# Implementation Plan: Feature 013 — Numbers by Reference

**Branch**: `013-numbers-by-reference` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-numbers-by-reference/spec.md`

## Summary

First fix the grounding checker (Korean refusals, compound Korean amounts, Korean↔English months, no rounding across
units) and re-score the recorded Feature 010 native report offline. Then add a number mode chosen per page with
`?numbers=current|formatted|refs` (default `current`): **formatted** adds the app's Korean reading to amounts in the
facts; **refs** gives every number in the facts a reference and asks the final role to write references only — the
app replaces them with values formatted by code and flags bare numbers and unknown references as format violations.
The measurement driver runs the 25 questions under all three modes (stand-in in the suite, native opt-in). Seven
roles, the graph topology and AkariSP are unchanged.

## Technical Context

**Language/Version**: TypeScript (Next.js 16.3.6, React 19.3.0); Node 23.9 for offline scripts

**Primary Dependencies**: none new; AkariSP 0.1.0-alpha.2 (public API, unchanged), LangGraph.js

**Storage**: committed JSON evidence (re-score, reports, hand audits)

**Testing**: `node --test` (checker cases, formatter, references, re-score), Playwright stand-in (three modes,
deterministic), opt-in native comparison (`BTA_MEASURE=1 BTA_MEASURE_MODES=current,formatted,refs`)

**Target Platform**: installed Chrome with the Prompt API (native), Playwright Chromium (stand-in)

**Project Type**: web application (single Next.js project)

**Performance Goals**: none; native comparison ≈ 3 × 99 runs × ~52 s ≈ 4.3 h (opt-in)

**Constraints**: final role only (Q1); demo prompts byte-identical; `current` mode prompts byte-identical to Feature
010; no model tool calling or per-call constraints; AkariSP changes 0

**Scale/Scope**: 25 questions × 3 modes × 3 repetitions native; ≥ 20 hand-audited answers per native mode

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| II Deterministic fixtures | Formatter, references, checker and re-score are pure; stand-in comparison reproducible | PASS |
| III Application owns orchestration | Numbers are computed and formatted by the app; the model only points at them | PASS |
| IV / V AkariSP lifecycle, evidence before core change | AkariSP untouched; format-violation rates become the evidence on F-A | PASS |
| VI Browser first | Native evidence in installed Chrome; stand-in in the suite; classes separate | PASS |
| VII Reproducible runs | Records keep the raw answer, the rendered answer, the mode, references and violations | PASS |
| VIII No trading-quality claims | Grounding and format only | PASS |
| IX External data | None added | PASS |
| XI Reference semantics | Prompt change for the final role recorded as adaptation A-013-1; `current` reproduces Feature 010 prompts | PASS |
| XII Findings before fixes | Checker fixes come with labelled cases and before/after numbers (FR-005, FR-006) | PASS |

Post-design re-check: unchanged — PASS.

## Project Structure

### Documentation (this feature)

```text
specs/013-numbers-by-reference/
├── plan.md  research.md  data-model.md  quickstart.md
├── contracts/references.md  contracts/checker-changes.md
├── evidence/                       # re-score, stand-in and native reports, hand audits
└── tasks.md                        # /speckit-tasks
```

### Source Code (repository root)

```text
src/analysis/grounding.ts      # FR-002 compound amounts, FR-003 months, FR-004 unit rule
src/analysis/report.ts         # FR-001 refusals; aggregate + formatViolationRate; per-mode reports
src/analysis/format.ts         # NEW: Korean display of a fact value (KRW 만/억, USD, %, g, BTC, shares, dates)
src/analysis/references.ts     # NEW: reference table for a fact set; render(raw answer) → text, refs, violations
src/analysis/facts.ts          # fact text per mode; toInput(…, mode) adds `answerFacts` (all facts) in formatted/refs
src/graph/trading-graph.ts     # final role reads answerFacts when present + refs instruction; seven roles unchanged
src/main.ts                    # ?numbers=…; render + record for portfolio runs
components/Shell.tsx           # passes the page's mode into toInput
components/Answer.tsx          # rendered answer, value sources, "형식 위반" marks
scripts/rescore-measurement.ts # NEW: re-score a recorded report with the current checker (offline)
test/grounding.test.ts, test/fixtures/grounding/claims.json   # new labelled cases
test/references.test.ts, test/format.test.ts                  # NEW
e2e/measure.ts, e2e/measurement.spec.ts, e2e/prompt-api.spec.ts # modes in the driver and reports
```

**Structure Decision**: two small pure modules (format, references) next to the existing analysis modules; no new
layer.

## Complexity Tracking

No constitution violations.
