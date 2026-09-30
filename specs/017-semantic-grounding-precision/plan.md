# Implementation Plan: Feature 017 — Semantic Grounding Precision

**Branch**: `017-semantic-grounding-precision` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/017-semantic-grounding-precision/spec.md`

## Summary

Freeze first: the development set (the 23 audited Feature 016 mismatches, the 24 real interpretation sentences, the
33 raw refs answers of the Feature 013 spike) and a new held-out fixture D, each case with its expectation and
hypothesis. Then change how claims are read, in the existing pure checker: a cue that names the reference side of a
comparison stays with that side; a metric label right after a value is that value's metric; citations the model
placed (a code-rendered reference, or a fact id written in the text) are recorded as model-declared evidence and
tested as a switchable variant; valuation and long-term outlook judgements need evidence classes that the current data
never has, and news restatements need to match the item's content. Freeze the rules, record the variant decision,
then run the held-out native capture (refs + current), audit it blind, and compare with the checker against the
pre-registered threshold (precision ≥ 80 %, every real error caught). No data, role, model, prompt or AkariSP change;
the shown answer text is unchanged.

## Technical Context

**Language/Version**: TypeScript (Next.js 16.3.6, React 19); Node 23.9 for tests and offline scripts

**Primary Dependencies**: none new

**Storage**: committed JSON fixtures, audit sheets and evidence reports

**Testing**: `node --test` — frozen development set and fixture D (expected vs actual, per variant), fixtures A–C
(26 / 26), existing labelled claims; offline re-score of the recorded Feature 013 reports; the opt-in native capture
(`BTA_MEASURE=1`) for the held-out set

**Target Platform**: browser (the checker runs in the page); tests and audit scripts in Node

**Project Type**: web application (single Next.js project)

**Performance Goals**: grounding of one answer stays under the existing speed check (< 50 ms)

**Constraints**: deterministic; frozen sets written before rule changes and never edited to fit results (hash
recorded); blind judgements recorded (hash) before the checker's held-out classification is computed; fixtures A–C
26 / 26; no LLM judge, no new data, no prompt change (the native capture uses the Feature 016 prompts), AkariSP changes 0

**Scale/Scope**: development set ≈ 23 + 24 cases + 33 raw answers; fixture D ≈ 25–35 cases; held-out capture 33
questions × 2 modes × 2 repetitions = 132 answers (≈ 2 h native; ≈ 600 numeric claims and interpretation sentences
to judge)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| II Deterministic fixtures | Frozen development set and fixture D; the proof of the rules runs without network or model | PASS |
| III Application owns orchestration | Checker only; graph unchanged | PASS |
| IV / V AkariSP | Untouched | PASS |
| VII Reproducible runs | Measurement records keep the raw refs answer so citations can be re-scored offline | PASS |
| VIII No trading-quality claims | Grounding precision only | PASS |
| IX External data | None added | PASS |
| XI Reference semantics | No prompt change (the capture uses the Feature 016 prompts) | PASS |
| XII Findings before fixes | Driven by F016-R1/R2; frozen sets, hypotheses and the threshold precede the change | PASS |

Post-design re-check: unchanged — PASS.

## Project Structure

### Documentation (this feature)

```text
specs/017-semantic-grounding-precision/
├── spec.md
├── plan.md              # this file
├── research.md          # R1–R9 (hypotheses first)
├── data-model.md
├── quickstart.md
├── contracts/
│   └── grounding-precision.md   # comparison / label / citation / interpretation rules, audit and scoring format
├── evidence/            # held-out capture, blind audit, comparison, re-scores
└── checklists/requirements.md
```

### Source Code (repository root)

```text
test/fixtures/grounding/precision-dev.json (new)  # development set: 23 mismatches, 24 interpretations, 33 raw refs answers (frozen)
test/fixtures/grounding/precision-d.json (new)    # held-out fixture D (frozen before the rule change)
src/analysis/semantics.ts                         # comparison markers, labels after values, valuation/outlook judgement lexicon, news content keys
src/analysis/grounding.ts                         # anchor choice, citation evidence (variant switch), interpretation evidence rules
src/analysis/references.ts                        # citations from rendered references (existing positions) — read only if needed
e2e/measure.ts, src/analysis/report.ts            # MeasureRun keeps `raw` (refs answer before rendering)
scripts/audit-sheet.ts (new)                      # held-out: claims and sentences without statuses → blind audit sheet
scripts/precision.ts (new)                        # blind judgements vs checker → precision, recall, per variant
scripts/rescore-measurement.ts                    # re-render raw refs answers when present; citations passed to the checker
test/precision.test.ts (new), test/semantic.test.ts, test/grounding.test.ts
```

**Structure Decision**: single Next.js project; changes stay in the two checker modules plus two small offline scripts.

## Complexity Tracking

No violations to justify.
