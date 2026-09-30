# Verification: Feature 016 — Semantic Grounding Contract

## T001 — Baseline (2026-09-30)

- Base: `main` `d51126f` (Feature 015 merged); `npm test` 199 tests (198 pass, 1 skipped), `npm run test:browser`
  93 passed, 2 skipped (Feature 015 records).
- Hypothesis (research.md, before any change): per-value metric + basis + direction, read against the same cues in
  the claim's clause, prevent the ORCL mismatch; a finite lexicon plus the absence of any evidence class catches
  valuation and long-term outlook claims.

## T002 — Frozen fixtures

- `test/fixtures/grounding/semantic.json` written before any checker change: A (ORCL, fictional holding values,
  19 claims), B (QQQM, 2), C (same value 10 %, 5) — 26 claims.
- sha256 at freeze: `a1bd10b55bd0c8a6b34f8eb8065c0382e13cd09d583de5507dc144a9ffeadc76`.

### Current checker on the frozen claims (target span; before Feature 016)

| Fixture | Claim | Target | Expected | Current |
|---|---|---|---|---|
| A | 현재가는 137.79 USD입니다. | 137.79 USD | supported | supported (D1) |
| A | 보유 수량은 12주입니다. | 12주 | supported | supported (H2) |
| A | 평가액은 1,653.48 USD입니다. | 1,653.48 USD | supported | supported (D3) |
| A | 평균 매수가 대비 20.08% 하락해 있습니다. | 20.08% | supported | supported (D2) |
| A | 최근 20거래일 동안 7.6% 하락했습니다. | 7.6% | supported | supported (M1) |
| A | 현재가는 50일 이동평균인 142.70 USD보다 낮습니다. | 142.70 USD | supported | supported (M2) |
| A | 20일 동안 20.08% 하락했다. | 20.08% | semantic-mismatch | supported (D2) |
| A | ORCL fell 20.08% over the last 20 sessions. | 20.08% | semantic-mismatch | supported (D2) |
| A | 평균 매수가 대비 7.6% 하락했습니다. | 7.6% | semantic-mismatch | supported (M1) |
| A | QQQM은 20거래일 동안 7.6% 하락했습니다. | 7.6% | semantic-mismatch | supported (M1) |
| A | 평균 매수가 대비 약 20% 하락했습니다. | 20% | supported | supported (D2) |
| A | 최근 20거래일에는 7.6% 하락했고 현재가는 50일 이동평균 아래에 있습니다. | 7.6% | supported | supported (M1) |
| A | 뉴스 정보가 없습니다. | 뉴스 | supported | (not extracted) |
| A | 평균 매수 가격보다 저평가되어 있습니다. | 저평가 | unsupported | (not extracted) |
| A | ORCL is undervalued. | undervalued | unsupported | (not extracted) |
| A | 장기적인 상승 잠재력을 고려할 때 유지하는 것을 고려할 수 있습니다. | 장기 | unsupported | (not extracted) |
| A | ORCL has long-term upside potential. | long-term | unsupported | (not extracted) |
| A | Long-term recovery is likely. | Long-term | unsupported | (not extracted) |
| A | 현재 제공된 정보에는 실적, 밸류에이션, 최근 뉴스가 없어 장기 보유 여부를 판단하기에는 근거가 부족합니다. | 밸류에이션 | supported | (not extracted) |
| B | QQQM은 20일 동안 20% 상승했다. | 20% | unsupported | unsupported |
| B | QQQM은 최근 20거래일 동안 3.0% 상승했습니다. | 3.0% | supported | supported (M1) |
| C | 평균 매수가 대비 10% 상승했습니다. | 10% | supported | supported (D2) |
| C | 최근 20거래일 동안 10% 상승했습니다. | 10% | supported | supported (D2) |
| C | 30일 동안 10% 상승했습니다. | 10% | semantic-mismatch | supported (D2) |
| C | 10% 상승했습니다. | 10% | supported | supported (D2) |
| C | 최근 20거래일 동안 10% 하락했습니다. | 10% | semantic-mismatch | supported (D2) |

- Status agreement: **13 / 26**. All 6 semantic mismatches read as supported; all 7 interpretation / news sentences are
  not extracted at all; fixture C "최근 20거래일 동안 10% 상승" has the right status but the wrong evidence (D2 instead of
  M1) — value matching picks the first fact with that value.

## T003–T011 — Implementation on the frozen fixtures

- The fixture file is unchanged since the freeze (sha256 still `a1bd10b5…adc76`).
- `src/analysis/semantics.ts`: templates for every fact sentence the code writes (the fixture's `(fictional)` news
  lines are value-only, asserted); clause split; cue lists; interpretation lexicon.
- `src/analysis/grounding.ts`: value match (unchanged rules) → the nearest **anchor** cue (basis or metric) of the
  claim's clause, the nearest direction cue and any other known subject in the clause decide SUPPORTED vs
  SEMANTIC_MISMATCH; valuation / outlook / news sentences need a fact of their evidence class; insufficient-evidence
  sentences pass. Every claim carries `evidence` and, for failures, a `reason`.

### Design corrections found by the existing labelled claims (before the final run; fixtures untouched)

| Case | Problem | Correction |
|---|---|---|
| "평단 71,000원 대비 현재가는 65,320원입니다." | basis and metric cues chosen independently gave 71,000 the metric of 현재가 | one nearest **anchor** cue carries basis and metric together |
| "… 즉 65,320 KRW이고 평가액은 653,200원" | the copula connective 이고 did not split the clause | 이고/이며 added as clause boundaries |
| 3,000-character speed check with 13,000 known tickers | the other-subject check built one RegExp per ticker per claim (2.7 s) | tokens of the clause looked up in the set, once per clause (back under 50 ms) |
| "7.6%", "20.08%" | '.' between digits was read as a sentence end | '.' and ',' between digits are not boundaries |

### Changed labelled expectation (FR-012)

- "현재가 7.1만원은 평단과 같습니다." `7.1만원`: supported → **semantic-mismatch** — 7.1만원 is the average purchase
  price (H3), stated as the current price (D1 = 65,320). Recorded in `claims.json` with `changed`. All other labelled
  claims keep their expectations; the speed check passes.

### Frozen fixtures — expected vs actual (SC-012)

| Fixture | Claim | Target | Expected | Actual | Reason |
| A | 현재가는 137.79 USD입니다. | 137.79 USD | supported [D1] | supported [D1] |  |
| A | 보유 수량은 12주입니다. | 12주 | supported [H2] | supported [H2] |  |
| A | 평가액은 1,653.48 USD입니다. | 1,653.48 USD | supported [D3] | supported [D3] |  |
| A | 평균 매수가 대비 20.08% 하락해 있습니다. | 20.08% | supported [D2] | supported [D2] |  |
| A | 최근 20거래일 동안 7.6% 하락했습니다. | 7.6% | supported [M1] | supported [M1] |  |
| A | 현재가는 50일 이동평균인 142.70 USD보다 낮습니다. | 142.70 USD | supported [M2] | supported [M2] |  |
| A | 20일 동안 20.08% 하락했다. | 20.08% | semantic-mismatch [D2] | semantic-mismatch [D2] | claim says basis days:20|sessions:20, direction down; D2 is unrealised_return (since_average_purchase) down |
| A | ORCL fell 20.08% over the last 20 sessions. | 20.08% | semantic-mismatch [D2] | semantic-mismatch [D2] | claim says basis sessions:20, direction down; D2 is unrealised_return (since_average_purchase) down |
| A | 평균 매수가 대비 7.6% 하락했습니다. | 7.6% | semantic-mismatch [M1] | semantic-mismatch [M1] | claim says basis since_average_purchase, direction down; M1 is price_return (sessions:20) down |
| A | QQQM은 20거래일 동안 7.6% 하락했습니다. | 7.6% | semantic-mismatch [M1] | semantic-mismatch [M1] | claim says basis sessions:20, direction down, subject QQQM; M1 is price_return (sessions:20) down |
| A | 평균 매수가 대비 약 20% 하락했습니다. | 20% | supported [D2] | supported [D2] |  |
| A | 최근 20거래일에는 7.6% 하락했고 현재가는 50일 이동평균 아래에 있습니다. | 7.6% | supported [M1] | supported [M1] |  |
| A | 뉴스 정보가 없습니다. | 뉴스 | supported [N1] | supported [N1] |  |
| A | 평균 매수 가격보다 저평가되어 있습니다. | 저평가 | unsupported [] | unsupported [] | no valuation evidence among the facts (cost basis and price are not valuation) |
| A | ORCL is undervalued. | undervalued | unsupported [] | unsupported [] | no valuation evidence among the facts (cost basis and price are not valuation) |
| A | 장기적인 상승 잠재력을 고려할 때 유지하는 것을 고려할 수 있습니다. | 장기 | unsupported [] | unsupported [] | no fundamental or news evidence among the facts |
| A | ORCL has long-term upside potential. | long-term | unsupported [] | unsupported [] | no fundamental or news evidence among the facts |
| A | Long-term recovery is likely. | Long-term | unsupported [] | unsupported [] | no fundamental or news evidence among the facts |
| A | 현재 제공된 정보에는 실적, 밸류에이션, 최근 뉴스가 없어 장기 보유 여부를 판단하기에는 근거가 부족합니다. | 밸류에이션 | supported [N1] | supported [N1] |  |
| B | QQQM은 20일 동안 20% 상승했다. | 20% | unsupported [] | unsupported [] |  |
| B | QQQM은 최근 20거래일 동안 3.0% 상승했습니다. | 3.0% | supported [M1] | supported [M1] |  |
| C | 평균 매수가 대비 10% 상승했습니다. | 10% | supported [D2] | supported [D2] |  |
| C | 최근 20거래일 동안 10% 상승했습니다. | 10% | supported [M1] | supported [M1] |  |
| C | 30일 동안 10% 상승했습니다. | 10% | semantic-mismatch [D2,M1] | semantic-mismatch [D2,M1] | claim says basis days:30|sessions:30, direction up; D2 is unrealised_return (since_average_purchase) up; M1 is price_return (sessions:20) up |
| C | 10% 상승했습니다. | 10% | supported [D2,M1] | supported [D2,M1] |  |
| C | 최근 20거래일 동안 10% 하락했습니다. | 10% | semantic-mismatch [M1] | semantic-mismatch [M1] | claim says basis sessions:20, direction down; M1 is price_return (sessions:20) up |
Feature 016 fixtures {"claims":26,"agreement":26,"supported":14,"semantic-mismatch":6,"unsupported":6}

- **Agreement 26 / 26** (baseline 13 / 26): SUPPORTED 14, SEMANTIC_MISMATCH 6, UNSUPPORTED 6. SC-001–SC-007 PASS on
  the frozen fixtures; SC-011: no network, no model.

## T012–T015 — Answer policy and display

- **A-016-1** (Constitution XI): the final role's Korean-answer instruction gains "You may interpret the facts, but do
  not call the stock under- or overvalued or state a long-term outlook unless the facts contain such evidence; if they
  do not, say that the evidence is insufficient." — all number modes; pinned by `test/analysis.test.ts`. No existing
  prompt test pinned the old full sentence.
- Answer window: "근거 확인: 일치 N건 · 의미 불일치 N건 · 근거 확인 안 됨 N건 · 확인 불가 표기 N건"; marks "[의미 불일치]"
  (title = reason) and "[근거 없음]" for unsupported interpretations. `e2e/analysis.spec.ts` (canned answer on the
  fixture holding KR:900001): 8.00% as a 20-session fall → one "[의미 불일치]" with the D2 reason; "저평가" → "[근거 없음]";
  the insufficient-evidence sentence unmarked.
- Measurement (FR-020, revised by decision A on F016-R3): `MeasureRun.mismatch`; `aggregate()` adds
  `semanticMismatchPerAnswer`; `zeroUnsupportedRate` and trap handling keep counting unsupported claims only.

## T016 — Re-score of the recorded Feature 013 native reports (secondary evidence)

`evidence/rescore-013-native-{current,formatted,refs}.json` (297 answers, 99 per mode; final rules; regenerated after
decision A, so their verdicts equal the "before" column and the mismatches appear as `semanticMismatchPerAnswer`):

| Mode | zero-unsupported before | if mismatches counted (option B, not adopted) | mismatches / answer | unsupported / answer | trap handled | rule verdict |
|---|---|---|---|---|---|---|
| current | 0.859 | 0.828 | 0.051 | 0.283 → 0.283 | 0.889 → 0.889 | LIMITED → LIMITED |
| formatted | 0.909 | 0.848 | 0.061 | 0.111 → 0.111 | 1 → 1 | USABLE → **LIMITED** |
| refs | 0.970 | 0.859 | 0.162 | 0.051 → 0.051 | 0.944 → 0.944 | USABLE → **LIMITED** |

### Hand audit of every distinct mismatch in those answers (23)

- **Real semantic errors: 2** — "52주 최저가가 65,320원입니다" (65,320 is the latest price; the 52-week low is 61,500);
  "비트코인 평가 손익은 22,812,500 원의 손실" (22,812,500 is the position value, not the loss).
- **Debatable: 2** — "현재 주가는 188.40 USD로 6.27% 하락했습니다" (6.27 % is vs the average price, stated as a fall);
  a refs-mode value appended to an unrelated sentence.
- **False positives: 19** — comparisons whose nearest cue is the other side ("평단 가격보다 … 더 낮은 65,320원", "현재
  주가가 201.00 USD보다 낮지만"); labels after the value ("6.5% recent downturn", "24.3배의 주가수익비율" after "현재
  주가"); current price next to a 52-week cue; refs-mode duplicates; "보유 가치", "…에 매수하여" not in the lists.
- **Precision on real answers: 2 / 23 (9 %), 4 / 23 (17 %) counting the debatable ones.**
- Cue-list iteration on these answers (recorded, fixtures untouched): added clear synonyms (매수/매입/구매 가격,
  미실현/unrealized, 포지션/포트폴리오 가치, 현재 주가, the 거래량 family covering volume ratios); tried and **reverted**
  bare 주가 and "현재" before a number (they overrode horizon cues: many new false positives). The lists are tuned on
  this data; their generalisation is not established.

### Interpretation claims in the same answers

- 24 interpretation sentences: outlook 19, valuation 3, news 2 — **all classified supported**, because every
  measurement holding has one (fictional) news fact and ZZAP has a P/E fact, and the rule accepts any fact of the
  evidence class. Examples include "비트코인의 장기적인 근본 요인이 긍정적이라는 분석이 있으므로 …" (the only BTC news is an
  exchange withdrawal halt) — plainly not supported.

## Findings

- **F016-R1 (HIGH)**: the nearest-cue rule classifies the frozen fixtures correctly (26 / 26) but has 9–17 % precision
  on real native answers; comparisons and postpositive labels are the main causes.
- **F016-R2 (HIGH)**: "a fact of the evidence class exists" over-accepts valuation and outlook claims whenever any news
  or valuation fact exists; it only works when the class is absent (fixture A).
- **F016-R3 (decided: A)**: counting mismatches as unclean would drop the re-scored 013 verdicts from USABLE to
  LIMITED for formatted and refs, driven mostly by F016-R1 false positives. Decision (maintainer, 2026-09-30):
  mismatches stay a separate research signal (`semanticMismatchPerAnswer`) and do not enter the verdict until their
  precision improves; FR-020 revised. With the decision the 013 verdicts are unchanged (table: "before" column).
- **F016-R4**: non-numeric comparisons outside the lexicon ("현재가가 평균 매수가보다 낮다") are not extracted.
- **F016-R5**: the fixture's `(fictional)` news lines keep value-only semantics (no template).

## T017 — Research questions (FR-018)

1. **Minimum metadata** for the ORCL mismatch: `basis` (horizon/reference) alone separates D2 from M1; `direction`
   is needed for the fixture C direction case; `metric` for same-basis values (52-week high vs low, position value vs
   price); `subject` for another holding's value. All four were needed by at least one frozen case.
2. **Deterministic?** For the current fact classes yes — every fact sentence is a code template (news lines
   excepted, F016-R5). Claims are the limit: deterministic cues reach 26 / 26 on frozen claims but 9–17 % precision on
   real answers (F016-R1).
3. **Horizon**: one generic `basis` vocabulary (`sessions:N`, `days:N`, `weeks:N`, `latest`, `since_average_purchase`,
   `all_time`) sufficed; metric-specific structures were not needed. "N일" had to accept both days and sessions.
4. **Qualitative facts**: an absence value (`news`, absent) supports only absence / insufficient-evidence statements;
   it worked for "뉴스 정보가 없습니다" and the insufficient-evidence sentence.
5. **Which claims need evidence ids?** Numeric claims get them from the value match (no model citation needed);
   interpretation claims cannot inherit support from surrounding facts — the class rule is too coarse (F016-R2).
6. **Text from metadata?** Possible for H/D and live market lines; not without rewriting the fixture's free-text
   lines. Kept the text as the source and derived metadata by templates (research R1).
7. **Checker findings**: F010-N1/N3 (unit conversion, compound amounts) unaffected; one labelled claim changed
   ("현재가 7.1만원", now a mismatch); new F016-R1…R5 recorded.
8. **Do evidence references add detection?** On the frozen set, derived evidence caught every case without model
   citations. On real answers, the refs-mode citations sit next to values (Feature 013) and could disambiguate
   comparisons and postpositive labels — the main F016-R1 causes; not tested here.

## T018 — Regression (2026-09-30)

| Check | Result |
|---|---|
| `npm run typecheck` | 0 |
| `npm test` | 231 tests: 230 pass, 1 skipped (+32: frozen fixtures A–C 26 claims, templates, coverage, clause split, summary, aggregate, policy) |
| `npm run test:browser` | **94 passed, 3 skipped** (+1: the Feature 016 answer-window test; one older assertion now includes `semanticMismatch: 0` in the counts shape) |
| `npm run test:prompt-api` (native gate) | 2 passed, 4 skipped |

| Criterion | Evidence | Result |
|---|---|---|
| SC-001 / SC-002 / SC-003 | frozen fixture A | PASS |
| SC-004 / SC-005 | fixture A interpretation claims | PASS (frozen); see F016-R2 for real answers |
| SC-006 | fixture B | PASS |
| SC-007 | fixture C (5 claims, shared value) | PASS |
| SC-008 | labelled claims pass; one changed with its reason | PASS |
| SC-009 / SC-010 | no data source, no graph role added | PASS |
| SC-011 | fixtures run with no network and no model | PASS |
| SC-012 | mapping table above | PASS |
