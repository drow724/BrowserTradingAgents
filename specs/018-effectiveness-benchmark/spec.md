# Feature Specification: Feature 018 — Effectiveness Benchmark (single-role baseline)

**Feature Branch**: `018-effectiveness-benchmark` (from `main` `4b027df`, the merge of constitution 1.2.0)

**Created**: 2026-09-30

**Status**: Draft

**Input**: Roadmap 018 "BrowserTradingAgents Effectiveness Benchmark" — reuses Feature 010's measurement set and the
corrected checker, and includes a single-role baseline: the final role given all facts directly vs the eight-role
graph, same model, set and checker, hypothesis and threshold registered before results (maintainer, after
constitution 1.2.0: "네 진행하시져").

## Purpose

Core question: **Does the eight-role graph give better-grounded answers than one role that sees the same facts
directly, with the same browser model?**

This is the first structural-variation experiment under constitution 1.2.0: one factor changes (role separation);
model, questions, facts, answer policy, number mode and checker stay fixed (Principle XV). It measures answer
behaviour and grounding, not trading quality (Principle VIII).

## Baseline

Measured at specification time (2026-09-30) on the Feature 017 held-out native capture (eight-role graph, Gemini
Nano, Chrome 154, 33 answers per repetition, 2 repetitions per mode; checker at `main` `4b027df`, numeric claims
only as since F017-R1):

| Measure | refs rep 1 / rep 2 | current rep 1 / rep 2 |
|---|---|---|
| Answers without an unsupported numeric claim | 0.939 / 1.000 | 0.818 / 0.939 |
| Unsupported numeric claims per answer | 0.061 / 0 | 0.394 / 0.091 |
| Trap questions handled | 1 / 1 | 0.833 / 1 |
| Hand-audited real errors (both repetitions, blind audit) | 9 in 66 answers | 14 in 66 answers |
| Median time per answer | 52.8 s | 53.8 s |

- Run-to-run variation within the same configuration is large: up to 12 percentage points in the clean-answer
  rate and a factor of four in unsupported claims per answer between two repetitions of current mode.
- The checker misses most meaning errors whose values exist in the facts (F017-R5: 8 of 9 in refs mode), so checker
  counts alone understate real errors; the hand audit is needed.
- In the eight-role graph the final role reads the risk review, research decision and trader plan, plus all of the
  run's facts in refs mode but only the holding facts in current mode (market and news facts reach it through the
  role reports); it never reads the market or news reports directly.

## Clarifications

### Session 2026-09-30

- Q: Does the single role get all of the run's facts in every mode, or exactly what the eight-role final role reads
  in that mode? → A: All facts in every mode (option A) — the comparison is "facts through the role reports" vs "facts
  directly", in both refs and current mode.
- Q: Who judges the blind audit, and how is it checked? → A: Claude judges every item; after the judged sheet is
  hashed, the maintainer re-judges a random 10 % of answers blind to structure and the agreement is reported
  against a pre-registered bar (option B).
- Q: How many repetitions per structure and mode? → A: 5 (option B) — 165 answers per structure and mode, 660 in
  total; a structure is better only if it is better in at least 4 of the 5 repetition pairs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compare role separation against one role on the same facts (Priority: P1)

As a BTA researcher, I want the same questions answered by the eight-role graph and by a single role that is given
all the facts directly, so that I can see whether the role structure changes how grounded the answers are.

**Why this priority**: it is the question the benchmark exists for; everything else supports its interpretation.

**Independent Test**: run the measurement set once with each structure in a stand-in provider and confirm both
produce one answer per question and holding, with the structure recorded on every answer.

**Acceptance Scenarios**:

1. **Given** the measurement set and a structure choice, **When** a measurement run starts, **Then** every answer
   records which structure produced it, how many model calls it used and how long it took.
2. **Given** the single-role structure, **When** it answers, **Then** it receives all of the run's facts, the user's
   question, the answer policy and the number-mode instruction, and nothing else.
3. **Given** the application used normally (not a measurement run), **When** a question is asked, **Then** the
   eight-role graph answers exactly as before.

---

### User Story 2 - A result that holds only if it was fixed in advance (Priority: P1)

As the maintainer, I want the hypothesis, metrics, sample size and decision rule written down before any answer is
collected, so that the result is evidence and not a story told after seeing the numbers (Principle XV).

**Why this priority**: without it the comparison cannot be trusted, whatever it shows.

**Independent Test**: the pre-registration section of this spec and the frozen checker hashes exist in the Feature's
record before the native capture starts; the capture's date is later.

**Acceptance Scenarios**:

1. **Given** the pre-registration, **When** results arrive, **Then** each metric is judged only by the rule written
   before, and a difference inside run-to-run variation is reported as "no difference".
2. **Given** a result against the hypothesis or no difference, **When** it is reported, **Then** it is reported as
   such, with counts, and no metric, rule or fixture is changed afterwards.

---

### User Story 3 - Real errors counted by a blind hand audit (Priority: P2)

As a BTA researcher, I want every answer's numbers and interpretation sentences judged by hand without knowing which
structure produced the answer, so that meaning errors the checker misses are counted and the judge cannot favour a
structure.

**Why this priority**: F017-R5 showed the checker misses most meaning errors; a comparison on checker counts alone
could hide the difference that matters.

**Independent Test**: the audit sheet for a small stand-in capture shows no structure label, no checker output and a
shuffled answer order; the key that maps items back to structures is kept separately and applied only after the
judged sheet is hashed.

**Acceptance Scenarios**:

1. **Given** the capture, **When** the audit sheet is made, **Then** answers from both structures are mixed in a
   fixed random order and carry no structure label or checker result.
2. **Given** the judged sheet, **When** its hash is recorded, **Then** and only then the structure key and the
   checker's results are joined to it.

---

### User Story 4 - Cost and behaviour beside grounding (Priority: P3)

As the maintainer, I want the time per answer, the number of model calls, the answer language, trap handling and the
number-format behaviour reported for both structures, so that a grounding difference can be weighed against what it
costs.

**Why this priority**: useful context, but not the benchmark's question.

**Independent Test**: the comparison report lists these measures per structure and mode.

**Acceptance Scenarios**:

1. **Given** a finished capture, **When** the report is produced, **Then** it shows per structure and mode: median
   time per answer, model calls per answer, Korean-answer rate, trap handling, format violations (refs mode) and
   semantic mismatches and unsupported interpretation claims (reported separately, as in Feature 017).

### Edge Cases

- A run fails or times out: it stays counted as a failure for its structure; a failed capture may be repeated only
  with the same frozen revision.
- A question names a second holding (comparison questions): both structures see the same facts the current
  measurement gives that answer; neither gets extra facts.
- Trap questions (the answer is not in the facts): measured the same way for both structures.
- The office view during a single-role run: only the final role is active; no other character shows work that did
  not happen.
- The two structures differ in speed by several times: the capture interleaves them so time-dependent browser or
  model changes affect both alike.
- An answer the auditor cannot judge from the shown facts: judged `debatable`, with a note.

## Pre-registration *(Principle XV — fixed before any answer is collected)*

- **Hypothesis H1 (role separation adds grounding)**: the eight-role graph produces fewer hand-audited real errors
  per answer than the single role.
- **Null H0**: no difference beyond run-to-run variation. Prior external evidence (MAST; study note §20.2) makes H0
  or the reverse direction plausible; either is a valid result.
- **Primary metric**: hand-audited real errors per answer (numbers and interpretation claims judged unsupported), per
  structure and number mode.
- **Secondary metrics**: checker clean-answer rate and unsupported numeric claims per answer; trap handling.
- **Context metrics** (no decision rule): time per answer, model calls, Korean rate, format violations, semantic
  mismatches, unsupported interpretation claims.
- **Sample**: both number modes (refs and current), 5 repetitions per structure and mode, 33 answers each —
  165 answers per structure and mode, 660 in total.
- **Decision rule**: a structure is better on a metric in a mode only if (a) its value is better in at least 4 of
  the 5 repetition pairs, and (b) the pooled difference is larger than the largest difference between two
  repetitions of the same structure in that mode. Otherwise the result is "no difference" for that metric and mode.
  H1 holds only if the eight-role graph is better on the primary metric in both modes.
- **Audit reliability bar**: on the re-judged sample, Claude and the maintainer agree on "real error or not" for at
  least 95 % of items, and on at least 70 % of the items either of them marked a real error. Below the bar the primary
  metric's result is reported as "not established" (secondary metrics still stand).
- **Frozen before capture**: the checker (hashes recorded), the measurement set, the answer policy and prompts, the
  audit rules of Feature 017 (T024), the capture order.
- **Not measured**: trading outcomes (no look-ahead-free historical window exists yet; Principle VIII requires one).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A measurement run MUST be able to choose the structure: the eight-role graph (default) or the single
  role.
- **FR-002**: The single role MUST receive all of the run's facts (holding, market and news facts, as the
  eight-role final role reads them in refs mode), the user's question, the answer policy and the number-mode
  instruction, in both number modes, and MUST produce the answer with one model call. The eight-role graph is
  unchanged: in current mode its final role still reads the holding facts and the role reports only.
- **FR-003**: Outside measurement runs the application MUST behave as before: the eight-role graph, unchanged
  prompts, unchanged office view.
- **FR-004**: Every measured answer MUST record its structure, model calls and time, and the answer or its report MUST
  record the number mode and repetition, in
  addition to what Feature 017 records (Principle VII).
- **FR-005**: The capture MUST interleave structures and modes within each repetition and rotate their order between
  repetitions.
- **FR-006**: The checker and all measurement fixtures MUST be frozen, with hashes recorded, before the native
  capture; no checker change in this Feature (Principle XV).
- **FR-007**: The audit sheet MUST mix both structures in a fixed random order and show no structure label and no
  checker output; the structure key MUST be stored separately.
- **FR-008**: The judged audit sheet MUST be hashed before the key and the checker's results are joined to it.
- **FR-008a**: After the hash, the maintainer MUST re-judge a random 10 % of the answers that have at least one item (fixed
  seed, recorded before sampling), blind to structure and to Claude's judgements; agreement MUST be reported against the pre-registered
  bar.
- **FR-009**: The comparison report MUST apply the pre-registered decision rule per metric and mode and state
  "better", "worse" or "no difference" with the counts behind it.
- **FR-010**: The report MUST include the context metrics of User Story 4 for both structures.
- **FR-011**: A result against H1 or a "no difference" MUST be reported as the result; metrics, rules, fixtures and
  judgements MUST NOT change after results are seen.
- **FR-012**: The single role MUST be documented as a measurement baseline and an adaptation, not as TradingAgents
  semantics (Principle XI).
- **FR-013**: The Feature MUST record findings for anything unexpected (Principle XII) and answer: (1) does role
  separation reduce real errors, (2) does it change what kind of errors occur, (3) what does it cost in time and
  calls.

### Key Entities

- **Structure**: eight-role graph or single role; recorded per answer.
- **Measured answer**: question, holding, number mode, structure, repetition, answer text (and the raw refs answer),
  outcome, checker counts, model calls, time.
- **Blind audit sheet**: shuffled items (numbers, interpretation sentences) with the facts and answer; no structure,
  no checker output. **Structure key**: maps each sheet entry to its structure; stored apart.
- **Comparison report**: per metric, structure and mode: values per repetition, pooled value, the decision-rule
  verdict and counts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 660 answers are captured (165 per structure and mode), with failures counted rather than dropped.
- **SC-002**: The pre-registration and frozen hashes are recorded before the first native answer (the record's dates
  show the order).
- **SC-003**: Every item in the audit sheet is judged, and the judged sheet's hash is recorded before the structure
  key is joined.
- **SC-003a**: The maintainer's re-judged sample (10 % of answers) and the agreement against the reliability bar are
  recorded before the primary-metric verdict is stated.
- **SC-004**: The report states a verdict for each primary and secondary metric in each mode under the decision rule,
  including "no difference", with counts.
- **SC-005**: Normal use of the application is unchanged: the existing regression suites pass and the default run's
  prompts are identical to before.
- **SC-006**: No AkariSP, model, data-source or checker change.

## Assumptions

- The number modes measured are refs and current, as in the Feature 017 held-out capture; formatted is not re-measured.
- Five repetitions follow from the observed variation (two repetitions differed by up to 12 percentage points) and
  from how rare real errors are (9–14 in 66 answers); the 4-of-5 rule keeps the direction requirement without
  letting one noisy repetition decide.
- The native capture takes about 5.5–6 hours (eight-role about 53 s per answer, single role an estimated few seconds)
  and is run by the maintainer in installed Chrome, as in Features 013 and 017.
- The hand audit uses Feature 017's judgement rules unchanged; Claude judges every item (each real error and
  debatable item with a note) and the maintainer re-judges a 10 % sample (about 66 answers).
- The Feature 017 held-out capture is not reused as data for this comparison (it has no single-role answers); it
  serves only as the baseline above.
- Trading-outcome metrics are out of scope until a Feature provides a historical fact window without look-ahead.
