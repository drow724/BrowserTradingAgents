# Feature Specification: Feature 016 — Semantic Grounding Contract

**Feature Branch**: `016-semantic-grounding-contract` (from `main` `d51126f`, the merge of Feature 015)

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Feature 014 — Semantic Grounding Contract" (numbered 016 here: 014 and 015 are taken by live
quotes and Toss). Extend the grounding checker from value/wording matches to the meaning of facts (subject, metric,
value, unit, horizon, as-of), so that a number that exists in the facts is not counted as grounded when it is used
with the wrong meaning; keep value-level detection; do not add data.

## Purpose

Core question: **Does a claim's subject, metric, value, unit, horizon and as-of actually match the fact that is supposed
to support it — not merely "does this number appear somewhere in the facts"?**

This is a grounding research Feature, not a data-enrichment Feature: make existing evidence semantically
trustworthy before increasing the amount of evidence.

## Baseline

Verified at specification time (2026-09-30) with the current checker on the reported cases:

| Claim | Current result |
|---|---|
| "20일 동안 20.08% 하락했다." (fixture A) | **supported** — `20` → M1, `20.08%` → D2 (value match only); the reported run had the same result with its real values |
| "평균 매수가 대비 20.08% 하락해 있다." | supported (D2) |
| "최근 20거래일 동안 7.6% 하락했다." | supported (M1) |
| "평균 매수 가격보다 저평가되어 있습니다." | **no claim extracted** (not checked at all) |
| "장기적인 상승 잠재력을 고려할 때 유지하는 것을 고려할 수 있습니다." | **no claim extracted** |
| "QQQM은 20일 동안 20% 상승했다." (fact: +3.0 % over 20 sessions) | `20%` unsupported (detected) |

Other context: facts are plain text with stable ids (H/D/M/N) built by code (`factSet`); the checker classifies
numbers, tickers and dates as supported / unsupported / unrecognised; the answer window shows
"근거 확인: 일치 N건 · 근거 확인 안 됨 N건 · 확인 불가 표기 N건"; Feature 013 found that the model tends to cite fact
references next to numbers; Feature 014/015 facts come from live quotes in the same shape.

## Clarifications

### Session 2026-09-30

- Q: The reported ORCL facts hold real holding values (quantity, average price); commit them? → A: Option C — keep
  ORCL and its public market facts, replace quantity and average purchase price with fictional values (12 shares,
  172.40 USD → D2 −20.08 %, D3 1,653.48 USD); the semantic structure of every case is kept (FR-019).
- Q: Which number? → A: 016 (the user's title said 014; 014 and 015 are taken). The Effectiveness Benchmark moves to 017.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A right number with the wrong meaning is caught (Priority: P1)

As a BTA researcher, I want a claim that uses a number from one fact with the metric or horizon of another fact to be
classified as a semantic mismatch, while the same number used with its own meaning stays supported.

**Why this priority**: The ORCL run showed a real error that the checker counted as grounded; this is the Feature's
reason.

**Independent Test**: Frozen fixture A (ORCL) and C (same value, different metric) run without network or model; every
claim's classification equals the frozen expectation.

**Acceptance Scenarios**:

1. **Given** fixture A, **When** "ORCL fell 20.08% over the last 20 sessions" (or "20일 동안 20.08% 하락했다") is
   checked, **Then** it is SEMANTIC_MISMATCH against D2 (unrealised return since the average purchase), not supported.
2. **Given** fixture A, **When** "ORCL is down 20.08% relative to the average purchase price" is checked, **Then** it
   is SUPPORTED by D2.
3. **Given** fixture A, **When** "ORCL fell 7.6% over the last 20 sessions" is checked, **Then** it is SUPPORTED by M1.
4. **Given** fixture A, **When** the current price 137.79 USD, the quantity 12, the position value 1,653.48 USD and
   "below the 50-day moving average of 142.70 USD" are checked, **Then** each is SUPPORTED by D1, H2, D3, M2.
5. **Given** fixture C (two different metrics share the same value, e.g. unrealised return 10 % and 20-session return
   10 %), **When** a claim states either metric, **Then** it resolves to the fact of that metric and horizon, and a
   claim that pairs the value with a third, unstated metric is not supported.

---

### User Story 2 - Unsupported interpretations are not counted as grounded (Priority: P1)

As a BTA researcher, I want valuation and long-term outlook statements that the facts cannot support to be flagged,
so that "price below average cost" is never read as "undervalued" and no long-term story passes silently.

**Why this priority**: These claims currently are not checked at all; they are the most misleading kind of answer.

**Independent Test**: Fixture A with the frozen interpretation claims; each is UNSUPPORTED (or missing evidence) with a
reason naming what evidence is absent.

**Acceptance Scenarios**:

1. **Given** fixture A, **When** "ORCL is undervalued" / "평균 매수가보다 낮으므로 저평가입니다" is checked, **Then** it is
   UNSUPPORTED — purchase-cost facts are not valuation evidence.
2. **Given** fixture A, **When** "ORCL has long-term upside potential" / "long-term recovery is likely" /
   "장기 상승 잠재력이 있으므로 보유해야 합니다" is checked, **Then** it is UNSUPPORTED — no fundamental or news evidence exists.
3. **Given** a material rationale claim with no supporting evidence reference, **When** grounding runs, **Then** it is
   distinguishable from a supported claim (not silently passed).

---

### User Story 3 - Value-level detection stays (Priority: P1)

As a BTA researcher, I want the existing value checks (numbers, units, dates, rounding) to keep catching invented
numbers.

**Independent Test**: Fixture B (QQQM) and the existing labelled claim set pass unchanged.

**Acceptance Scenarios**:

1. **Given** fixture B (20-session return +3.0 %), **When** "QQQM rose 20% over the last 20 sessions" is checked,
   **Then** it is UNSUPPORTED.
2. **Given** the existing labelled grounding cases, **When** they run, **Then** every expected result holds, or each
   change is listed with its reason.

---

### User Story 4 - Answers may say where the evidence stops (Priority: P2)

As a user asking "오라클은 계속 가지고 있는 게 맞을까요?" with only holding, price, momentum and range facts and no news,
I get the supported facts and a clear statement that the evidence is insufficient for a confident long-term decision —
not a manufactured Buy/Hold/Sell story.

**Independent Test**: The final-answer policy (fact reporting / interpretation / decision rationale / insufficient
evidence) is stated to the final role; a canned answer following it passes grounding; one promoting an unsupported
interpretation is flagged.

**Acceptance Scenarios**:

1. **Given** fixture A, **When** the answer says "최근 20거래일에는 7.6% 하락했고 현재가는 50일 이동평균 아래에 있습니다" and
   "현재 제공된 정보에는 실적, 밸류에이션, 최근 뉴스가 없어 장기 보유 여부를 판단하기에는 근거가 부족합니다", **Then** both pass.
2. **Given** the research view, **When** an answer is checked, **Then** semantic mismatches are counted separately
   from supported and unsupported claims (e.g. "일치 5건 · 의미 불일치 1건 · 근거 확인 안 됨 2건").

### Edge Cases

- A claim with a value but no stated metric or horizon (e.g. "20.08% 하락"): matched against the fact whose value and
  direction it shares; ambiguity (two facts with that value and different meanings) is reported, not guessed.
- A claim naming a horizon in another wording ("최근 20거래일", "지난 20일", "over the last 20 sessions") resolves to the
  same horizon; the accepted wordings are a documented, finite list.
- Signs and direction words ("하락", "fell", "-7.6%") must agree with the fact's sign.
- Qualitative facts ("No news is supplied for this holding") support only absence statements ("뉴스 정보가 없다") and
  never a news-based claim.
- A claim about a different subject than the fact (another holding in a multi-holding answer) is a mismatch.
- Claims inside the question are given (as today) and never counted as model claims.
- Rounded restatements ("약 27% 하락") follow the existing rounding rules, now within the matched metric only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Facts participating in grounding MUST expose semantic metadata sufficient to distinguish at least
  subject, metric, value, unit, horizon/period and as-of; not every fact needs every field; non-numeric (qualitative)
  facts MUST be expressible; existing fact ids (H1, D2, M1, N1, …) MUST stay stable unless a migration reason is
  documented.
- **FR-002**: Human-readable fact text MUST remain understandable in the existing views; the semantic metadata is an
  additional grounding representation, not a replacement of the text in the UI.
- **FR-003**: The grounding result MUST distinguish at least SUPPORTED, UNSUPPORTED and SEMANTIC_MISMATCH (a plausible
  supporting fact shares a value or surface form but differs in a material semantic property).
- **FR-004**: "ORCL fell 7.6% over the last 20 sessions" MUST be SUPPORTED by M1 in fixture A.
- **FR-005**: "ORCL is down 20.08% relative to the average purchase price" MUST be SUPPORTED by D2; the fix MUST NOT
  work by suppressing that value.
- **FR-006**: In fixture A, a valuation claim ("undervalued") MUST NOT be SUPPORTED because the latest price is below
  the average purchase price; purchase-cost facts MUST NOT count as valuation evidence. No valuation model is built.
- **FR-007**: In fixture A, long-term outlook claims ("long-term upside potential", "should recover in the long term")
  MUST NOT be SUPPORTED; no data is added to make them supportable.
- **FR-008**: The final role MUST be allowed — by a written final-answer policy distinguishing fact reporting,
  interpretation, decision rationale and insufficient evidence — to state that the evidence is insufficient instead
  of producing a Buy/Hold/Sell narrative; supported facts are still reported.
- **FR-009**: Grounding MUST be able to determine which fact ids the system believes support each material claim (a
  claim → evidence mapping); the serialization is a plan decision; evidence ids are not required in the normal
  user-facing answer.
- **FR-010**: A material factual or investment-rationale claim with no supporting evidence MUST be distinguishable from
  a supported claim.
- **FR-011**: Existing value-level detection MUST be preserved (fixture B: "+20%" vs a +3.0 % fact → UNSUPPORTED).
- **FR-012**: Existing number, unit, date and rounding behaviour MUST NOT change silently; a weakness found outside this
  Feature's scope is recorded as a finding, not fixed in passing.
- **FR-013**: Frozen deterministic fixtures A (ORCL), B (QQQM) and C (same value, different metric) MUST exist with
  expected classifications written before results are seen and never edited to make tests pass; a case the design
  cannot express is a finding.
- **FR-014**: The research output (answer window debug counts and the record) MUST show semantic mismatches separately
  from supported claims; normal user-facing wording stays concise.
- **FR-015**: Deterministic code MUST own numeric calculation, fact identity, semantic metadata, evidence provenance
  and grounding validation where feasible; no additional LLM judge is introduced unless deterministic validation is
  shown insufficient and the trade-off is documented.
- **FR-016**: Existing fact generation (fixture and live, Features 010/014/015) MUST keep working with one canonical
  source for each fact (metadata and text derived from the same data, not two independently edited representations).
- **FR-017**: No fundamental, valuation, news, portfolio, sector, macro or new market data source is added; no graph
  role is added or removed; AkariSP is unchanged.
- **FR-018**: The Feature MUST record answers, with evidence, to its research questions (minimum metadata; determinism
  for current fact classes; generic vs metric-specific horizon; qualitative facts; which claims need explicit evidence
  ids; deriving text from metadata; checker findings made obsolete, open or clearer; whether evidence references add
  detection beyond metadata alone).
- **FR-019**: Fixture A MUST keep ORCL and its public market facts (137.79 USD on 2026-09-29, −7.6 % over 20 sessions,
  50-day average 142.70 USD, 52-week 322.54 / 114.50 USD, no news) but use FICTIONAL holding values — quantity 12 shares,
  average purchase price 172.40 USD — so D2 = −20.08 % and D3 = 1,653.48 USD (computed by the fact code). The real
  holding values of the reported run are not committed. The mismatch case keeps its structure: the unrealised return
  (D2) stated as a 20-session return.
- **FR-020** (revised after F016-R3, maintainer decision A): The measurement MUST report semantic mismatches per answer
  as a separate research signal; they MUST NOT enter the clean-answer rate, trap handling or the verdict until the
  mismatch precision on real answers is improved (F016-R1). Before/after numbers are reported on recorded runs.

### Key Entities

- **Semantic fact**: id, human-readable text, and metadata — subject, metric, value (number or qualitative), unit,
  horizon/period, as-of, provenance when available.
- **Claim**: a span of a role output or the answer with its extracted value (if any), stated metric/horizon/subject cues,
  and its kind (numeric fact claim, interpretation, decision rationale, insufficient-evidence statement).
- **Classification**: SUPPORTED, UNSUPPORTED, SEMANTIC_MISMATCH (plus the existing unrecognised form), with the
  supporting or conflicting fact ids and a reason.
- **Evidence mapping**: claim → supporting fact ids → classification → reason (the research/debug record).
- **Frozen fixture**: facts + claims + expected classifications, written before results.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: "20일 동안 20.08% 하락했다" (fixture A; the reported mismatch with fictional holding values) is not
  counted as supported; it is SEMANTIC_MISMATCH.
- **SC-002**: "평균 매수가 대비 20.08% 하락해 있다" stays SUPPORTED.
- **SC-003**: "최근 20거래일 동안 7.6% 하락했다" is SUPPORTED.
- **SC-004**: "current price below average purchase price" alone does not support "undervalued".
- **SC-005**: Fixture A supports no long-term upside or recovery claim.
- **SC-006**: The QQQM 20 % claim stays UNSUPPORTED against a 3.0 % fact.
- **SC-007**: In fixture C, 100 % of claims resolve to the fact of their own metric/horizon despite the shared value.
- **SC-008**: Existing deterministic grounding tests pass, or each changed expectation is listed with its reason.
- **SC-009**: No fundamental, news or portfolio data source is added.
- **SC-010**: No graph role is added or removed.
- **SC-011**: Fixtures A–C run without network access and without the native Prompt API.
- **SC-012**: A documented mapping (claim → supporting fact ids → classification → reason) exists for every frozen
  claim; expected-vs-actual agreement is reported with counts (claims, SUPPORTED, UNSUPPORTED, SEMANTIC_MISMATCH).

## Assumptions

- Evaluation is first on frozen claims; any native model run is secondary behavioural validation, not the proof.
- The current fact classes (holding, derived, market, news; fixture and live) are small and code-built, so their
  semantics can be attached where the facts are made.
- Korean and English claim wordings are both in scope for the frozen claims; the accepted wordings for metrics and
  horizons are a finite documented list, not general language understanding.
- Detecting interpretation/rationale claims (valuation, long-term outlook) is limited to the cases the frozen fixtures
  name plus their documented synonyms; a general classifier is out of scope.
- Out of scope: fundamental/news analysts or data, portfolio aggregation, sector analysis, valuation models,
  recommendation scoring, Buy/Hold/Sell optimisation, TradingAgents parity or comparison, new providers or models,
  prompt-performance work, general ontologies, knowledge graphs, theorem proving, an LLM-as-judge pipeline.
- Constitution VIII applies: this measures grounding, not trading quality.
