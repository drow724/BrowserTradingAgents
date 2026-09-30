# Research: Feature 018 — Effectiveness Benchmark

## R1 — How the single role is selected

- **Decision**: a page parameter `?roles=single`, read in the page script with the other run parameters (`provider`, `reuse`). It applies only when present. The
  default is the eight-role graph.
- **Rationale**: it is the same mechanism the Feature 013 measurement uses for number modes, so the measurement loop
  only adds one parameter. Normal use (FR-003) cannot reach the baseline by accident.
- **Alternatives**:
  - A UI toggle: rejected. The baseline is a measurement instrument, not a product choice.
  - A build flag: rejected. It could not be interleaved in one capture.

## R2 — Single-role prompt

- **Decision**: reuse the final role's label ("Final Decision") and the three-sentence line. The task line becomes
  "Give the final decision from these facts." (the eight-role line mentions a risk review that does not exist here).
  Reads:
  - refs mode: `subject`, `answerFacts` (all facts with references), `question`.
  - current mode: `subject`, `holdingFacts`, `marketFacts`, `newsFacts`, `question`.
  
  The Korean answer policy (A-016-1) and the refs instruction are appended exactly as for the eight-role final role.
- **Rationale**: FR-002 and clarification Q1. The only differences from the eight-role final role are the task line
  and where the facts come from. In refs mode `answerFacts` already holds every fact. In current mode the three
  plain fact lines together are every fact, as the model sees them in the eight-role graph.
- **Alternatives**:
  - A neutral analyst persona: rejected. It changes a second factor (persona).
  - Keeping the eight-role task line verbatim: rejected. It refers to a risk review the role never gets.

## R3 — Graph shape of the baseline

- **Decision**: a one-node LangGraph (START → finalDecisionMaker → END) that writes `finalDecision`. It has the same
  return shape as `buildTradingGraph` (`{ graph, modelRequests }`) and the same node name.
- **Rationale**: the record, office view, grounding and measurement read `finalDecision` and node events by name.
  Reusing the node name means the other seven characters simply stay "waiting" (spec edge case) with no view change.
  It runs through the same AkariChatModel and runtime, so latency and lifecycle are comparable.
- **Alternatives**: a direct `model.invoke` outside LangGraph: rejected. The record, cancellation and node events
  would differ from the eight-role path.

## R4 — Capture order

- **Decision**: in repetition *r*, run the four (structure, mode) cells in a fixed base order rotated by *r*. Base
  order: (eight, refs), (single, refs), (eight, current), (single, current). Each cell is one full pass of the 33
  answers. One report per cell per repetition is written at once, plus pooled reports per cell.
- **Rationale**: FR-005. Rotation spreads time-of-run effects (browser, model warm state) across cells, and finished
  cells are never lost (as in Feature 017).
- **Alternatives**:
  - Randomised order: rejected. It is not reproducible without a seed and gains nothing over rotation.
  - Per-question interleaving: rejected. It needs a page reload per answer, which changes runtime reuse behaviour.

## R5 — Blind multi-report sheet and key

- **Decision**: `scripts/audit-sheet.ts` accepts several reports and a seed. It builds entries per answer as today
  (facts, shown answer, items), then shuffles the entries with a seeded PRNG (the seed is recorded in verification.md
  before shuffling). Entry ids are opaque (`e001…`). Mode, structure, repetition, question and holding stay out of the
  sheet: the facts and answer are enough to judge. A separate key file maps each id to report, run index, structure,
  mode and repetition. The sheet is hashed before judging; the judged sheet is hashed before the key is opened.
- **Rationale**: FR-007, FR-008. The question id and holding could reveal little, but hiding them costs nothing.
  Hiding the mode avoids refs-format cues suggesting a structure. Refs answers are shown rendered, as in 017.
- **Limit (recorded, not solved)**: answer style can still hint at the structure (e.g. appended "Final Decision:"
  text). The maintainer's blind re-judgement (R6) bounds the effect of any auditor bias.

## R6 — Reliability sample

- **Decision**: `scripts/reliability-sample.ts` picks ⌈10 %⌉ of the entries (answers) that have at least one item, with a seeded PRNG (seed
  recorded before sampling). It writes a copy of those entries with no judgements. After the maintainer fills it, it
  computes item agreement on "real error or not" (real error = number `real-error` or interpretation `unsupported`) and
  agreement on the items either side marked a real error, against the bar (≥ 95 % and ≥ 70 %).
- **Rationale**: clarification Q2 and FR-008a. The agreement is measured on the metric the verdict uses, not on all
  labels.
- **Alternative**: Cohen's κ: rejected. It is unstable with rare positives (about 0.15 real errors per answer) and
  harder to read. Raw agreements match the pre-registered bar.

## R7 — Decision rule computation

- **Decision**: `scripts/compare-structures.ts` computes per repetition, structure and mode:
  - real errors per answer (primary);
  - the checker's clean-answer rate and unsupported numeric claims per answer, from the frozen checker;
  - trap handling;
  - the context metrics.
  
  For each metric and mode it applies the rule: a structure is better only if it is better in ≥ 4 of 5 repetition
  pairs (pairs by repetition index) **and** the pooled difference exceeds the largest difference between two
  repetitions of the same structure in that mode. Otherwise the result is "no difference". H1 holds only if eight-role
  is better on the primary metric in both modes, and only if the reliability bar is met. Otherwise the primary result
  is "not established".
- **Rationale**: this is the pre-registration, implemented literally. Ties count as not better.
- **Alternative**: significance tests: not pre-registered. They could be reported as context, but they are not
  added, to keep the rule single.
