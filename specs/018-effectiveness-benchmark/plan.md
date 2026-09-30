# Implementation Plan: Feature 018 — Effectiveness Benchmark (single-role baseline)

**Branch**: `018-effectiveness-benchmark` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/018-effectiveness-benchmark/spec.md`

## Summary

Add one measurement-only structure: a single role that answers from all of the run's facts in one model call. It is
selected by a page parameter (`?roles=single`), in the same way as `?numbers=`. The eight-role graph, its prompts and
the default page stay unchanged. The single role reuses the final role's node name, answer policy and number-mode
instruction. Only its task line and its inputs differ: all facts directly instead of the role reports.

The native measurement loop gains a structure dimension. Structures and modes are interleaved and rotated, over 5
repetitions. Every answer records its structure and model calls.

The offline audit tooling is extended:
- A **blind multi-report sheet**: shuffled with a recorded seed, with no mode, structure or checker output. A
  separate key maps entries back.
- A **reliability sample**: 10 % of answers for the maintainer, with a recorded seed.
- A **comparison script**: it joins the judged sheet with the key after the hash, and applies the pre-registered
  decision rule and reliability bar.

The pre-registration (spec) and frozen hashes are recorded before the native capture. The checker is not changed.

## Technical Context

**Language/Version**: TypeScript (Next.js 16.3.6, React 19); Node 23.9 for tests and offline scripts

**Primary Dependencies**: none new (LangGraph.js for the single-node graph, as the eight-role graph)

**Storage**: committed JSON evidence (reports, blind sheets, keys, judged sheets, comparison)

**Testing**: `node --test` for the single-role prompt, the report fields, the blind-sheet shuffle/key, the
reliability sample and the decision rule on synthetic data; Playwright stand-in tests for `?roles=single` (one node,
one model call, the default page unchanged); the opt-in native capture (`BTA_MEASURE=1`,
`BTA_MEASURE_STRUCTURES=eight,single`, `BTA_MEASURE_MODES=refs,current`, `BTA_MEASURE_REPS=5`)

**Target Platform**: browser (Chrome Prompt API, Gemini Nano) for the capture; Node for the audit and comparison

**Project Type**: web application (single Next.js project)

**Performance Goals**: none new. The capture is expected to take about 5.5–6 h.

**Constraints**:
- The default run is unchanged: eight-role prompts are byte-identical to `main` `4b027df`.
- The checker is frozen: grounding.ts `896f5f7e…`, semantics.ts `a1598004…`.
- The single role gets all facts in both modes and one model call.
- The blind sheet carries no mode, structure or checker output.
- The judged sheet's hash is recorded before the key or the checker results are joined.
- AkariSP changes 0.

**Scale/Scope**: 5 repetitions × 2 modes × 2 structures × 33 answers = 660 answers. About 3,000 audit items are
expected (4.6 per answer on average in Feature 017). The maintainer re-judges about 66 answers.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I Dogfood before abstraction | One extra graph builder for one baseline; no structure registry or plugin mechanism | PASS |
| II Deterministic fixtures | Portfolio fixture@1 and the Feature 010 question set; stand-in tests for the new path | PASS |
| III Application owns orchestration | The structure choice lives in the application graph module | PASS |
| IV / V AkariSP | Untouched; the single role uses the same runtime and bridge | PASS |
| VI Browser first | The decision comes from `REAL_BROWSER_PROMPT_API` evidence only; stand-in runs verify plumbing | PASS |
| VII Reproducible runs | Every answer records structure, mode, repetition, model calls, time, revision, prompts source | PASS |
| VIII No trading-quality claims | No trading metric (no look-ahead-free window) | PASS |
| IX External data | None added | PASS |
| XI Reference semantics | The single role is documented as a measurement baseline and adaptation A-018-1, not TradingAgents semantics | PASS |
| XII Findings before fixes | Unexpected results are written up as findings; nothing in the checker is fixed here | PASS |
| XIII Inference tiers | Local tier only | PASS |
| XIV Deterministic grounding | The same frozen checker for both structures; no model judge | PASS |
| XV Pre-registered evaluation | Hypothesis, metrics, sample, decision rule and reliability bar in the spec before capture; frozen hashes; blind shuffled sheet; hash before join; "no difference" reported as such | PASS |

Post-design re-check: unchanged — PASS.

## Project Structure

### Documentation (this feature)

```text
specs/018-effectiveness-benchmark/
├── spec.md              # includes the pre-registration
├── plan.md              # this file
├── research.md          # R1–R7
├── data-model.md
├── quickstart.md
├── contracts/
│   └── structure-benchmark.md   # page parameter, single-role prompt, report fields, sheet/key/sample/comparison formats
├── evidence/            # capture reports, blind sheet + key, judged sheet, sample, comparison
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/graph/trading-graph.ts        # SINGLE_ROLE definition + buildSingleRoleGraph (same return shape as buildTradingGraph)
src/main.ts                       # ?roles=single → the single-role builder; record `structure`; nodes other than final stay waiting
e2e/measure.ts                    # structure and model calls per answer
src/analysis/report.ts            # MeasureRun.structure, MeasureRun.calls
e2e/prompt-api.spec.ts            # BTA_MEASURE_STRUCTURES loop: structures × modes interleaved, rotated per repetition
scripts/audit-sheet.ts            # multi-report blind sheet: shuffle with a seed, strip mode/structure, write key apart
scripts/reliability-sample.ts (new)  # 10 % answer sample for the maintainer (seeded), agreement vs the bar
scripts/compare-structures.ts (new)  # join judged sheet + key + checker; per-repetition metrics; decision rule
test/structures.test.ts (new), e2e/analysis.spec.ts (stand-in: ?roles=single)
```

**Structure Decision**: single Next.js project. The new structure is one more graph builder next to the existing one;
the audit and comparison are offline scripts next to Feature 017's.

## Complexity Tracking

No violations to justify.
