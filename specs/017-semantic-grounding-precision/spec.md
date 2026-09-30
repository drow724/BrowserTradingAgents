# Feature Specification: Feature 017 — Semantic Grounding Precision

**Feature Branch**: `017-semantic-grounding-precision` (from `main` `065711d`, the merge of Feature 016)

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: follow-up of Feature 016 findings F016-R1 and F016-R2 (maintainer: "네 그걸로 진행해
주세요"). Use the model's own references (Feature 013 refs mode, citation style) as evidence where they help, reduce
false semantic mismatches from comparisons and labels written after the value, and stop interpretation claims from
passing merely because some fact of the evidence class exists. Goal: raise mismatch precision on real answers above
Feature 016's 9–17 %, so the maintainer can decide whether mismatches enter the verdict again (F016-R3).

## Purpose

Core question: **Can the semantic checker be precise enough on real model answers that a "semantic mismatch" is
usually a real error — without losing the errors Feature 016 already catches?**

This is a grounding research Feature. It changes how claims are read, not which facts exist.

## Baseline

Measured at specification time (2026-09-30) with the Feature 016 checker (`main` `065711d`) on the recorded Feature 013
native answers (297 answers, 99 per number mode; `specs/016-semantic-grounding-contract/evidence/`):

| Measure | Value |
|---|---|
| Distinct semantic mismatches (hand-audited) | 23: real 2, debatable 2, false positive 19 |
| Mismatch precision | 9 % (2 / 23), 17 % counting the debatable ones |
| Main false-positive causes | comparisons whose nearest cue names the other side ("평단 가격보다 … 더 낮은 65,320원", "201.00 USD보다 낮지만"); labels written after the value ("24.3배의 주가수익비율", "6.5% recent downturn"); current price next to a 52-week cue; refs-mode duplicates |
| Interpretation sentences | 24 (outlook 19, valuation 3, news 2) — **all supported**, because every measurement holding has one news fact and ZZAP has a P/E fact (e.g. "비트코인의 장기적인 근본 요인이 긍정적이라는 분석이 있으므로 …" supported by an exchange-withdrawal-halt news item) |
| Frozen fixtures A–C | 26 / 26 |
| Verdict use | mismatches reported separately, not in the clean rate or verdict (FR-020, decision A); since F017-R1 (2026-09-30) unsupported interpretation claims too (`interpretationUnsupported`) |

Other context: in refs mode the model mostly uses a reference as a **citation** — it writes the number itself and puts
`{M1a}` after it, often at the end of the sentence (Feature 013 spike); the renderer records every reference with its
fact id and position.

## Clarifications

### Session 2026-09-30

- Q: Which follow-up? → A: F016-R1 and F016-R2 improvement, as proposed after Feature 016 (maintainer).
- Q: Which number? → A: 017; the Effectiveness Benchmark moves to 018.
- Q: Is the held-out native capture required? → A: Yes (option A) — refs and current modes, run by the maintainer in
  Chrome after the rules are frozen, hand-audited; the FR-012 threshold is judged on it.
- Q: How is the held-out capture audited? → A: Blind (option A) — every numeric claim and interpretation sentence is
  judged before the checker's result is looked at; then precision and recall are computed from the comparison.
- Q: What precision threshold? → A: 80 % (option A), with every hand-identified real error caught.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A mismatch flag is usually a real error (Priority: P1)

As a BTA researcher, I want the checker to stop flagging correct sentences that compare two values or name the metric
after the number, so that a "의미 불일치" mark is worth reading.

**Why this priority**: 19 of 23 flags on real answers were false; the signal cannot enter the verdict like this.

**Independent Test**: The frozen development set (the 23 audited cases) runs without network or model and each case's
classification equals its frozen expectation; fixture D is scored once, after the rules are frozen.

**Acceptance Scenarios**:

1. **Given** the latest price and the average purchase price as facts, **When** "평단 가격보다 더 낮은 65,320원" is
   checked (65,320 = latest price), **Then** 65,320 is SUPPORTED by the latest-price fact — the cost-basis cue names the
   other side of the comparison.
2. **Given** a P/E fact of 24.3, **When** "현재 주가는 24.3배의 주가수익비율로 거래됩니다" is checked, **Then** 24.3 is
   SUPPORTED by the P/E fact — the label after the value names its metric.
3. **Given** the 52-week low and the latest price as different facts, **When** "52주 최저가가 65,320원입니다" is checked
   (65,320 = latest price), **Then** it stays SEMANTIC_MISMATCH (a real error from the audit).
4. **Given** a position value and an unrealised return, **When** "평가 손익은 22,812,500원의 손실" is checked (22,812,500 =
   position value), **Then** it stays SEMANTIC_MISMATCH (a real error from the audit).
5. **Given** frozen fixtures A–C, **When** they run, **Then** all 26 claims keep their Feature 016 expectations.

---

### User Story 2 - The model's own citations are used, and tested, as evidence (Priority: P1)

As a BTA researcher, I want to know whether a reference the model places next to a number (refs mode, or a fact id
such as "(M1)") helps the checker find the meant fact, and whether trusting it hides real errors.

**Why this priority**: Feature 016 research question 8 was answered only on fixtures ("the ORCL case is caught
without citations"); real answers carry citations, and refs had the most false flags (0.162 per answer).

**Independent Test**: The same frozen cases scored with and without citation evidence; the difference in true and false
mismatches is reported.

**Acceptance Scenarios**:

1. **Given** a number followed by a reference to the fact that holds it (copied value + citation), **When** it is
   checked, **Then** the cited fact is recorded as the model-declared evidence, and the claim's cues are checked against
   that fact.
2. **Given** a number whose citation names a fact with a different value, **When** it is checked, **Then** the
   disagreement is recorded (wrong reference), not silently resolved.
3. **Given** a cited number whose clause clearly states another metric (acceptance scenario US1-3 with a citation of
   the latest-price fact), **When** it is checked, **Then** it stays SEMANTIC_MISMATCH — a citation does not excuse a
   wrong label.
4. **Given** the development set and fixture D, **When** they are scored with and without citation evidence, **Then**
   the report states how many true and false mismatches each variant yields (research question 1).

---

### User Story 3 - An interpretation passes only on evidence about it (Priority: P1)

As a BTA researcher, I want valuation and long-term outlook judgements to be supported only by evidence that could
support that judgement, so that an unrelated news line or a bare P/E does not ground "long-term fundamentals are
positive" or "undervalued".

**Why this priority**: 24 of 24 interpretation sentences passed in real answers, including plainly unsupported ones.

**Independent Test**: A frozen interpretation set (the 24 real sentences plus fixture D cases) with expectations
written before the change.

**Acceptance Scenarios**:

1. **Given** only a news line about an exchange withdrawal halt, **When** "장기적인 근본 요인이 긍정적이라는 분석이
   있으므로 보유" is checked, **Then** it is UNSUPPORTED with a reason.
2. **Given** a P/E fact and no peer or historical valuation, **When** "주가수익비율 24.3배로 저평가되어 있다" is checked,
   **Then** the valuation judgement is UNSUPPORTED (a multiple alone has no benchmark), while 24.3 stays SUPPORTED.
3. **Given** a news fact, **When** a sentence restates that news ("거래소 출금 중단 소식이 있었습니다"), **Then** it is
   SUPPORTED by that news fact.
4. **Given** a sentence that says the evidence is insufficient for a long-term view, **When** it is checked, **Then** it
   passes (Feature 016 behaviour kept).

---

### User Story 4 - The maintainer can decide on the verdict with evidence (Priority: P2)

As the maintainer, I want precision and recall of mismatches measured on data the rules were not tuned on, against a
threshold fixed in advance, so that returning mismatches to the verdict (F016-R3) is a decision on evidence.

**Why this priority**: The rules will be tuned on the 23 audited cases; their numbers alone cannot show generalisation.

**Independent Test**: A new native capture (refs and current modes) audited by hand, plus fixture D written before any
rule change — scored once after the rules are frozen.

**Acceptance Scenarios**:

1. **Given** the rules are frozen and the blind judgements are recorded, **When** the held-out set is scored, **Then**
   mismatch precision and the recall of hand-identified real errors are reported with counts.
2. **Given** the result, **When** it is compared with the pre-registered threshold (FR-012), **Then** the report states
   whether the threshold is met; the verdict change itself stays a maintainer decision.

### Edge Cases

- A sentence compares two values and states both ("현재가 65,320원은 평단 71,000원보다 낮다"): each value keeps its own cue.
- A comparison with no second value ("평단보다 낮은 65,320원"): the cue before "보다/대비/than" names the reference side.
- A citation at the end of a sentence with several numbers: it is evidence only for a number of equal value.
- A combined citation ("{D1, D3}") or an unknown reference: recorded, never used as evidence for a different value.
- A fact-id citation of a fact with several numbers ("{M1}" for M1a/M1b): evidence only for a number that equals one of
  them.
- Refs-mode duplicates (the model writes the value and the rendered reference repeats it): counted once.
- An interpretation sentence with both a lexicon word and an insufficiency phrase: passes.
- Answers in current and formatted modes have no references: citation evidence is simply absent.
- The held-out native capture fails part-way: failed runs are reported as failures and excluded from precision, never
  retried with changed rules.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A cue that names the reference side of a comparison (before "보다", "대비", "than", "vs", "compared
  with") MUST NOT be taken as the meaning of a value on the other side.
- **FR-002**: A metric label written right after a value ("24.3배의 주가수익비율", "6.5% recent downturn") MUST be read as
  that value's metric.
- **FR-003**: A cue that is the subject of a sentence stating the value ("52주 최저가가 65,320원입니다") MUST stay attached
  to the value; the two real errors of the Feature 016 audit MUST remain SEMANTIC_MISMATCH.
- **FR-004**: A reference or fact-id citation placed by the model next to or after a number MUST be recorded as
  model-declared evidence when the cited fact holds that number's value; a citation of a fact with a different value
  MUST be recorded as a wrong reference.
- **FR-005**: A citation MUST NOT turn a clearly contradicting cue into support (US2 scenario 3).
- **FR-006**: The effect of citation evidence MUST be measured as a separate variant (with vs without) on the same
  frozen cases before it is adopted; if it does not reduce false mismatches without losing real ones, it is not adopted
  and the result is recorded.
- **FR-007**: Valuation judgements (under-/overvalued, cheap, expensive) MUST be SUPPORTED only by evidence that
  compares a valuation to a benchmark (peer, history, or model); a single multiple is not such evidence. No such
  evidence exists in the current data, so these judgements are UNSUPPORTED unless stated as insufficient.
- **FR-008**: Long-term outlook judgements (long-term potential, recovery, fundamentals) MUST be SUPPORTED only by
  evidence about the holding's long-term fundamentals; short-term news items and price facts are not such evidence.
- **FR-009**: A sentence that restates a supplied news item MUST be SUPPORTED by that news fact only when it refers to
  that item's content; mentioning "news" alone is not enough.
- **FR-010**: Feature 016 behaviour MUST be kept for frozen fixtures A–C (26 / 26), for value-level detection and for
  insufficient-evidence statements; any changed expectation in existing tests is listed with its reason.
- **FR-011**: Frozen sets MUST be written before the rule changes and never edited to fit results: (a) the
  development set — the 23 audited mismatch cases and the 24 real interpretation sentences, each with its hand
  judgement; (b) fixture D — new held-out cases for comparisons, labels after values, subject cues, citations (right,
  wrong, combined, id-only) and interpretations, with expectations; a case the rules cannot express is a finding.
- **FR-012**: A threshold for proposing that mismatches re-enter the verdict MUST be fixed in the spec before results:
  on the held-out native capture (FR-013), mismatch precision ≥ 80 % (a mismatch judged debatable counts as not a real
  error) and every hand-identified real error caught; fixtures A–C 26 / 26. The
  decision stays with the maintainer; this Feature does not change FR-020 of Feature 016 by itself.
- **FR-013**: A held-out native capture MUST be made after the rules are frozen: a new run of the Feature 013
  measurement set in the refs and current number modes, run by the maintainer in Chrome. The audit is blind: every
  numeric claim and every interpretation sentence is judged (correct meaning / real error / debatable) and the
  judgements are recorded before the checker's classification is looked at; precision (real errors among flagged
  mismatches) and recall (flagged among real errors) come from comparing the two. The FR-012 threshold is judged on this capture; fixture D is supporting
  evidence (it is written by the rule author).
- **FR-014**: The development and held-out results MUST be reported separately (development numbers are tuned and do
  not count as evidence of generalisation), with counts: true / false / debatable mismatches, real errors missed,
  interpretation sentences supported / unsupported and by which evidence.
- **FR-015**: Deterministic code only; no LLM judge; no new data source; no graph role change; AkariSP unchanged; the
  answer text shown to the user is unchanged (citation-style rewriting of refs answers stays a separate roadmap
  candidate).
- **FR-016**: The re-score of the recorded Feature 013 native reports MUST be repeated with the new rules, and the
  answer window keeps showing mismatches and unsupported interpretations with their reasons.
- **FR-017**: The Feature MUST record answers, with evidence, to its research questions: (1) do citations improve
  precision, and do they hide real errors; (2) which structural rules remove which false positives; (3) what remains
  that deterministic rules cannot read; (4) is the threshold met, and what would the verdict change mean for the 013
  verdicts.

### Key Entities

- **Citation**: a reference or fact id written by the model, its position, the fact it names, and whether that fact
  holds the cited number's value (right, wrong, combined, unknown).
- **Comparison**: a clause with a reference side (marked by "보다/대비/than/vs") and a subject side; each value belongs
  to one side.
- **Evidence requirement**: per interpretation class, what kind of fact could support it (valuation benchmark,
  long-term fundamentals, a specific news item).
- **Frozen set**: development set (tuned on) and fixture D (held out), each case with its expectation and a one-line
  hypothesis, written before the change.
- **Precision report**: per set and variant — true, false and debatable mismatches, real errors missed, interpretation
  outcomes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the development set, false mismatches fall from 19 to at most 5, and both real errors stay flagged.
- **SC-002**: On the held-out native capture (refs and current), mismatch precision and real-error recall are reported
  with counts, and the FR-012 threshold is stated as met or not met; fixture D results are reported alongside.
- **SC-003**: Frozen fixtures A–C stay 26 / 26.
- **SC-004**: Of the 24 real interpretation sentences, every long-term outlook judgement without long-term evidence and
  every valuation judgement without a benchmark is UNSUPPORTED; hand-audited agreement is reported.
- **SC-005**: The with/without-citation comparison is reported with counts on the same cases, and the adoption decision
  follows FR-006.
- **SC-006**: Existing deterministic tests pass, or each changed expectation is listed with its reason.
- **SC-007**: No data source, graph role, model or AkariSP change; the shown answer text is unchanged.
- **SC-008**: All frozen sets run without network access and without the native Prompt API.

## Assumptions

- The Feature 016 hand audit (23 cases) is the development set; its judgements are reused as recorded and extended
  only with the 24 interpretation sentences' judgements, written before the change.
- The held-out native capture needs the maintainer's Chrome with the Prompt API and roughly the time of one Feature 013
  measurement per mode (two modes); it is required (FR-013) and is the evidence for the threshold.
- The 80 % precision threshold was confirmed by the maintainer before any result; it is reported with its counts
  (a rate from few flagged cases is stated as such), and the verdict change still needs a maintainer decision.
- Measurement holdings keep their fictional news lines; no fundamentals or valuation benchmarks are added, so the
  expected outcome for valuation and long-term judgements on current data is UNSUPPORTED.
- News content matching (FR-009) covers the news lines of the committed fictional fixture; live runs carry only the
  "no news" absence fact (Feature 014), so no live news wording is in scope.
- Out of scope: citation-style rewriting of refs answers, a default number-mode change, new data, an LLM judge, general
  language understanding, the Effectiveness Benchmark (now 018).
- Constitution VIII applies: this measures grounding, not trading quality.
