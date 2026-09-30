# Implementation Plan: Feature 016 — Semantic Grounding Contract

**Branch**: `016-semantic-grounding-contract` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/016-semantic-grounding-contract/spec.md`

## Summary

Write the frozen fixtures A (ORCL, fictional holding values), B (QQQM) and C (same value, different metric) with their
expected classifications first. Then derive semantic metadata (metric, basis/horizon, unit, direction; subject and
as-of from the fact set) from the fact texts our own code produces, through one template table — the text stays the
single canonical source and fixture facts stay byte-identical. The checker reads the same cues from the clause around
each numeric claim and classifies SUPPORTED / UNSUPPORTED / SEMANTIC_MISMATCH with evidence ids and a reason;
a finite lexicon marks valuation and long-term-outlook claims, which the current fact classes cannot support, while
insufficient-evidence statements pass. The final role gets one policy sentence (A-016-1). Counts and the answer window
show mismatches separately. No data, role, model or AkariSP change.

## Technical Context

**Language/Version**: TypeScript (Next.js 16.3.6, React 19.3.0); Node 23.9 for tests and offline scripts

**Primary Dependencies**: none new

**Storage**: committed JSON fixtures and evidence (re-score reports)

**Testing**: `node --test` — frozen fixtures A–C (expected vs actual, counts), existing labelled claims, templates vs
every fact sentence the code produces (fixture and live); Playwright answer-window check with a canned answer; offline
re-score of recorded Feature 013 native reports

**Target Platform**: browser (the checker runs in the page); tests in Node

**Project Type**: web application (single Next.js project)

**Performance Goals**: grounding of one run stays within the existing speed check (< 50 ms per answer in the test)

**Constraints**: deterministic; no network, no native model for the proof (SC-011); fixture facts byte-identical;
value-level behaviour unchanged except where listed; no data source, no graph role, AkariSP changes 0

**Scale/Scope**: 3 frozen fixtures (≈ 20 claims), 99 existing measurement inputs, the recorded 013 native reports

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| II Deterministic fixtures | Frozen fixtures, pure checker, no network or model in the proof | PASS |
| III Application owns orchestration | Semantics and validation in application code; the graph is unchanged | PASS |
| IV / V AkariSP | Untouched | PASS |
| VII Reproducible runs | Records gain evidence ids, reasons and the mismatch count | PASS |
| VIII No trading-quality claims | Grounding only; the policy removes unsupported valuation/outlook claims | PASS |
| IX External data | None added (FR-017) | PASS |
| XI Reference semantics | Final-role policy sentence recorded as A-016-1; prompt tests updated with the reason | PASS |
| XII Findings before fixes | Driven by the recorded ORCL/QQQM run findings; fixtures and hypotheses before the change | PASS |

Post-design re-check: unchanged — PASS.

## Project Structure

### Documentation (this feature)

```text
specs/016-semantic-grounding-contract/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R10 (hypothesis first)
├── data-model.md
├── quickstart.md
├── contracts/
│   └── semantic-grounding.md   # templates, cue lists, classification rules, result shape
└── checklists/requirements.md
```

### Source Code (repository root)

```text
test/fixtures/grounding/semantic.json (new)  # frozen fixtures A–C + expected classes (written first)
src/analysis/semantics.ts (new)              # template table: fact text → per-value semantics; claim cues; lexicon
src/analysis/grounding.ts                    # classification SUPPORTED / UNSUPPORTED / SEMANTIC_MISMATCH, evidence, reason
src/analysis/report.ts                       # semanticMismatch in aggregate; zero-unsupported definition
src/graph/trading-graph.ts                   # final-role policy sentence (A-016-1)
components/Answer.tsx                        # "의미 불일치" marks and count
test/semantic.test.ts (new), test/grounding.test.ts, test/analysis.test.ts, test/trading-graph.test.ts
scripts/rescore-measurement.ts               # reused for the 013 native re-score
```

**Structure Decision**: single Next.js project; one new pure module next to the checker.

## Complexity Tracking

No violations to justify.
