# Feature Specification: Feature 013 — Numbers by Reference

**Feature Branch**: `013-numbers-by-reference`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Numbers by reference (option C): the model writes references to facts instead of
numbers, and the app fills in the values, formatted by code. Fix the grounding checker's known defects first and
report before/after numbers. Compare against the current prompts and a cheaper pre-formatted-facts condition on the
Feature 010 measurement set."

## Purpose

Core question: **If the in-browser model never writes a number itself — only points at the fact that holds it — do
the number errors seen in Feature 010 disappear, and can the model keep to that format?**

```text
today:  facts ──► model writes "9억 5천만 원" (wrong, 10×) ──► checker flags it
C:      facts ──► model writes "{H3}" ──► app shows "9,500만 원" (from the fact, formatted by code)
```

## Baseline

Verified at specification time (2026-09-30):

| Item | Value |
|---|---|
| Branch | `013-numbers-by-reference`, created from `main` `afa653e` (merge of PR #14) |
| Feature 010 native result | 99 runs; rule verdict NOT_YET (zero-unsupported 0.859, trap 0.333); hand-classified LIMITED (0.889 / 0.889) |
| Real number errors (F010-N1) | 11 answers: 9 Korean large-unit conversions (억/만, 10× off), 2 arithmetic or unit slips; verbatim digits copied correctly |
| Checker defects | F010-N2: Korean refusals missed by the trap phrase list; F010-N3: compound Korean amounts ("73만 8천 원") not read as one number; "2026년 11월" not matched to "November 2026"; F010-R1: a unit claim supported by a unit-less fact through rounding |
| Measurement set | 25 questions (6 traps), fictional `portfolio-fixture@1`, stand-in and opt-in native runs |
| Graph | 8 roles, topology unchanged since Feature 004; the final role answers in Korean (Feature 010 A-010-1) |
| Model library | AkariSP 0.1.0-alpha.2; per-call output constraints cannot be passed through it today (finding candidate F-A) |

## Clarifications

### Session 2026-09-30

- Q: Which roles write references? → A: A — the final answer only; the seven other roles keep today's prompts.
- Q: Which conditions are measured? → A: B — current prompts vs pre-formatted facts (Korean units added by code) vs references.
- Q: How is the product default decided after the measurement? → A: A — by the maintainer after reading the report.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trustworthy checker first (Priority: P1)

The maintainer re-scores the recorded Feature 010 native report with a corrected checker and sees, side by side,
the old and new numbers, and how far the new rule result is from the hand classification.

**Why this priority**: Every later comparison depends on the checker; a checker that under-counts trap handling
four-fold cannot judge the new conditions.

**Independent Test**: Re-score the committed Feature 010 native report; compare with the recorded hand
classification.

**Acceptance Scenarios**:

1. **Given** the recorded Feature 010 native report, **When** it is re-scored, **Then** the report lists old and new
   rule values and verdicts next to the hand-classified values, without editing the original report.
2. **Given** the answers the hand audit classified, **When** the corrected checker scores them, **Then** refusals
   such as "제공된 정보에는 … 내용이 없습니다" count as handled traps, and "73만 8천 원" is read as 738,000.

---

### User Story 2 - Answers whose numbers come from the facts (Priority: P1)

A user asks about a holding. The answer's numbers are exactly the facts' values, written in a readable Korean form
chosen by the app (for example "9,500만 원"), never a number the model computed or converted.

**Why this priority**: It removes the error class that made up most real errors in Feature 010.

**Independent Test**: Ask the BTC question from the measurement set; every number shown equals a fact value, and the
answer marks which fact each number came from.

**Acceptance Scenarios**:

1. **Given** the reference condition, **When** the model writes a reference to an existing fact, **Then** the
   answer shows that fact's value in the app's format and the reference is marked as supported.
2. **Given** the reference condition, **When** the model writes a number itself, or a reference to a fact that does
   not exist, **Then** that is flagged as a format violation in the answer and counted in the measurement.
3. **Given** a question whose answer is not in the facts, **When** the model answers, **Then** trap handling works as
   before (the model says the information is not given).

---

### User Story 3 - Measured comparison (Priority: P1)

The maintainer gets one report comparing the conditions on the same 25 questions, with the same corrected checker,
for the stand-in (deterministic) and the native model (repeated runs), evidence classes kept separate.

**Why this priority**: The decision whether to adopt references by default must rest on measurement (Constitution V).

**Independent Test**: The stand-in comparison runs in the automated suite; the native comparison is an opt-in run.

**Acceptance Scenarios**:

1. **Given** the comparison run, **When** it finishes, **Then** for each condition the report shows zero-unsupported
   rate, trap handling rate, format-violation rate (reference condition), Korean rate, run time, and the verdict.
2. **Given** the native results, **When** they are recorded, **Then** a sample of answers per condition is
   hand-audited and the rule/hand agreement is reported.

---

### User Story 4 - Evidence for the model library (Priority: P3)

The maintainer sees how often the model breaks the reference format when only asked in the prompt, and whether that
is evidence for letting the model library pass per-call output constraints (finding candidate F-A).

**Why this priority**: Dogfooding value; no library change happens in this Feature.

**Independent Test**: The verification record states the violation rate and the conclusion on F-A.

**Acceptance Scenarios**:

1. **Given** the native results, **When** they are recorded, **Then** F-A is recorded as supported, not supported,
   or inconclusive, with the numbers.

### Edge Cases

- The model writes a reference with a typo (`{D 2}`, `{d2}`, `D2` without braces): counted as a format violation
  unless it can be matched without doubt; how is decided in the plan and applied the same way in every condition.
- The question itself contains a number (e.g. "10주 더 사면?"): numbers from the question stay allowed (the question
  is a fact, Feature 010 `Q1`).
- An answer needs a number that no fact holds (e.g. a sum across holdings): it is a violation or unsupported; the
  model is expected to say it cannot compute it.
- A fact holds several numbers in one sentence (market and news facts): each number must be referable on its own.
- Small counts and ordinals ("세 가지 이유", bare integers ≤ 10) stay ignored as today.

## Requirements *(mandatory)*

### Functional Requirements

**Checker (US1)**

- **FR-001**: The trap check MUST recognise common Korean refusals, including at least "내용이 없", "명시되어 있지
  않", "나와 있지 않", "포함되어 있지 않", "답변할 수 없", "말씀드릴 수 없".
- **FR-002**: The checker MUST read compound Korean amounts ("73만 8천 원", "9천 5백만 원", "2억 2천 8백만 원") as
  one value, so correct ones are supported and wrong ones are unsupported.
- **FR-003**: The checker MUST match Korean year-month dates to the same month written in English ("2026년 11월" ↔
  "November 2026").
- **FR-004**: The checker MUST NOT let a claim with a unit be supported by a unit-less fact through rounding
  (F010-R1).
- **FR-005**: Every checker change MUST come with labelled cases in the committed claim set, and the existing labelled
  cases MUST keep their expected results unless a change is recorded with its reason.
- **FR-006**: The recorded Feature 010 native report MUST be re-scored with the corrected checker; the result MUST
  list old rule, new rule and hand-classified values and verdicts side by side; the original report stays unedited.

**References (US2)**

- **FR-007**: In the reference condition, every number given to the model MUST be addressable by a reference, and the
  prompt MUST instruct the model to write references instead of numbers.
- **FR-008**: References MUST be applied to the final answer only; the seven other roles keep their current prompts
  and outputs, and their numbers are checked as today.
- **FR-009**: When an answer is shown, every valid reference MUST be replaced by the fact's value formatted by the
  app (Korean large units for KRW amounts, fixed decimals for percentages, currency marks), and the answer MUST show
  which fact each value came from.
- **FR-010**: A number written by the model (not from the question, not a small count) and a reference to a missing
  fact MUST each be flagged as a format violation, shown in the answer and counted in the measurement.
- **FR-011**: The grounding result of a reference-condition answer MUST treat substituted values as supported by
  their facts; format violations are reported separately from unsupported claims.

**Measurement (US3, US4)**

- **FR-012**: The comparison MUST measure three conditions on the same 25 questions with the corrected checker:
  **current** (Feature 010 prompts), **pre-formatted** (facts additionally carry the app's readable Korean form of
  each amount; the model still writes numbers), and **references** (FR-007–FR-011).
- **FR-013**: The stand-in comparison MUST run in the automated suite and be reproducible; the native comparison
  MUST be opt-in, repeat each question at least 3 times per condition, and alternate condition order.
- **FR-014**: For each native condition, at least 20 answers (including every trap answer of one repetition) MUST be
  hand-audited and the rule/hand agreement reported.
- **FR-015**: The product default after the measurement MUST be decided by the maintainer after reading the report;
  until then the default stays **current**, and the other conditions are selectable for comparison.
- **FR-016**: The graph topology, the model library and the measurement set's questions and facts MUST stay
  unchanged; prompt changes MUST be recorded as an adaptation (Constitution XI) with the Feature 010 prompts kept
  reproducible for the baseline condition.
- **FR-017**: The verification record MUST state F-A as supported, not supported, or inconclusive, with the
  format-violation numbers.

Condition names used in the plan and records: **current** = current prompts, **formatted** = pre-formatted facts,
**refs** = references.

### Key Entities

- **Fact reference**: the name of one number in the facts given to a run (e.g. `{H3}` or a finer name for numbers
  inside a sentence); resolves to a value and a unit.
- **Format violation**: a number the model wrote itself, or a reference that resolves to nothing.
- **Condition**: a named prompt/format setting the measurement compares (current, pre-formatted, references).
- **Re-score record**: old rule, new rule and hand-classified values for a recorded report.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the recorded Feature 010 native report, the corrected checker's trap handling rate is within 0.1 of
  the hand-classified 0.889, and its zero-unsupported rate within 0.05 of the hand-classified 0.889.
- **SC-002**: 100% of the committed labelled claims (existing and new) are scored as labelled.
- **SC-003**: In the reference condition, 100% of numbers shown in answers either equal a fact value or are flagged
  (checked on the stand-in and on every audited native answer).
- **SC-004**: The native comparison report gives, for each of the three conditions, zero-unsupported rate, trap handling rate,
  format-violation rate, Korean rate and median run time over ≥ 75 runs, and rule/hand agreement on ≥ 20 audited
  answers.
- **SC-005**: The Korean large-unit error class (F010-N1) occurs in 0 reference-condition answers among the audited
  native answers.
- **SC-006**: Existing checks (unit, browser, native gate) pass; demo prompts stay byte-identical when the reference
  condition is off.

## Assumptions

- Formatting rules for displayed values are fixed by code and stated in the plan (e.g. KRW ≥ 10,000 in 만/억 with
  digits, percentages to 2 decimals as in the facts).
- The stand-in echoes its prompt, so its numbers are deterministic but not model-like; native results decide.
- The hand audit is done by the implementer and recorded with the answers; the maintainer can review it.
- No constitution amendment is needed: prompts change as a recorded adaptation; no data source or library changes.

## Out of Scope

- Model tool calling, per-call output constraints (would need a library change; F-A is only assessed here).
- Live market data, larger models (WebLLM), runtime reuse changes.
- The Effectiveness Benchmark (moves to Feature 014).

## Roadmap context

Feature 010 found the number errors and the checker defects; Feature 012 left the runtime default per run. This
Feature is 013; the Effectiveness Benchmark becomes 014.
