# Research: Feature 017 — Semantic Grounding Precision

Base: `main` `065711d`. Checker: `src/analysis/grounding.ts` `semantic()` (nearest basis-or-metric cue in the clause =
anchor; nearest direction cue; foreign subject) and `interpretations()` (sentence lexicon; evidence = any fact of the
class). Recorded answers: Feature 013 native reports (rendered text only); the Feature 013 spike rows keep 33 raw refs
answers (`raw`, with `{ref}` citations).

Hypotheses (recorded before any rule change):

- H1: most false mismatches come from two structures — a comparison whose reference-side cue is nearest to the value,
  and a metric label written after the value — and fixing those two removes ≥ 14 of 19 development false positives
  without losing the 2 real errors.
- H2: a model citation of a fact that holds the value identifies the meant fact; using it as evidence removes refs
  duplicates and wrong-side anchors, but, if trusted over the clause cues, would hide real mislabels (US2-3).
- H3: interpretation over-acceptance is fixed by requiring evidence that could support the judgement; with current
  data no fact can, so valuation and long-term judgements become UNSUPPORTED, and news restatements stay SUPPORTED
  when they match the item's content.

## R1 — Comparison markers (FR-001)

- Decision: a comparison marker (`보다`, `대비`, `에 비해`, `than`, `vs`, `versus`, `compared with/to`) closes a
  **reference phrase**: the text from the clause start (or the previous value) up to the marker. Cues inside a
  reference phrase apply only to values inside that phrase; a value outside it chooses its anchor among the other cues
  (and has none if no other cue exists → value-only support).
- Examples: "평단 가격보다 더 낮은 65,320원" → 평단 is reference-side; 65,320 has no anchor → supported by value (D1).
  "평단 71,000원 대비 현재가는 65,320원" → 71,000 inside the reference phrase keeps 평단; 65,320 anchors on 현재가.
- Alternative: dropping every cue before a comparison marker — rejected (loses 71,000's own cue).

## R2 — Labels after values (FR-002)

- Decision: a metric cue that follows the value within a short joiner (`의`, `인`, `짜리`, `of`, `in`, a space, or
  nothing) is that value's anchor, ahead of a nearer cue before it. New metric cues: `주가수익비율`, `PER`, `P/E`,
  `배` after a number → `valuation_multiple`; English labels after a percentage (`decline`, `downturn`, `drop`,
  `gain`) set only the direction.
- Example: "현재 주가는 24.3배의 주가수익비율로" → 24.3 anchors on 주가수익비율 (M2), not on 현재 주가.

## R3 — Subject cues stay (FR-003)

- Decision: the default nearest-anchor rule is kept for a cue that is the subject of the clause stating the value
  ("52주 최저가가 65,320원입니다", "평가 손익은 22,812,500원의 손실"). R1 and R2 only take effect when a marker or a
  following label exists, so these stay SEMANTIC_MISMATCH. Frozen as development cases with expectation mismatch.

## R4 — Citations (FR-004–FR-006)

- Sources: (a) refs mode — a code-rendered reference span (`Rendered.refs`: fact id, position) is a citation of that
  fact for itself, and for a written number of equal value earlier in the same sentence (the citation style "11.2%
  하락했습니다 {M1a}"); (b) any mode — a fact id written in the text (`M1`, `(D2)`, `[H3]`) is a citation for a number of
  equal value in the same sentence. Combined (`{D1, D3}`) and unknown references are recorded, never used.
- Classification of a citation: `right` (the cited fact holds the value), `wrong` (it does not; recorded as a finding
  on the claim), `id-only` (the fact has several numbers; right only if one equals the value).
- Use (variant `cite`): a right citation narrows the value's hits to the cited fact **before** the cue check; the cues
  still decide (US2-3: a citation never excuses a contradicting anchor). Variant `plain` ignores citations.
- Adoption rule (FR-006): `cite` is adopted only if, on the development set, it has fewer false mismatches than
  `plain` and no additional missed real error; otherwise `plain` stays and the counts are recorded. Fixture D is scored
  for both variants only after the rules are frozen (report, not a decision input).
- Refs duplicates: a written number and the rendered reference of equal value in one sentence are one claim for the
  counts (the rendered span is the claim; the written number inherits its result).
- Recorded runs keep the rendered answer only; the capture adds `raw` (refs answer before rendering) so citations can
  be recomputed offline (re-render with the run's reference table).

## R5 — Interpretation evidence (FR-007–FR-009)

- Valuation **judgement** lexicon (`저평가`, `고평가`, `저렴`, `비싸`, `싸다`, `undervalued`, `overvalued`, `cheap`,
  `expensive`) needs class `valuation_benchmark` (peer, history or model); no current fact has it → UNSUPPORTED
  ("a multiple alone has no benchmark" when a P/E fact exists). A mention of the multiple is a numeric claim, not a
  judgement; `밸류에이션` without a judgement word is not an interpretation claim unless it states one.
- Long-term **outlook** lexicon (`장기`, `잠재력`, `성장성`, `펀더멘털`/`근본`, `recover`, `long-term`, `upside`,
  `potential`) needs class `fundamentals`; none exists → UNSUPPORTED. News and price facts are never this class.
  `회복`/`반등` count as outlook only with a long-term word in the sentence (short-term rebounds are price talk).
- **News restatement**: supported by a news fact only when the sentence shares a number or date with it, or one of
  the item's content keys (a finite bilingual key list per fixture news line, e.g. withdrawal halt ↔ 출금 중단,
  buyback ↔ 자사주 매입, guidance ↔ 가이던스/전망, trial ↔ 임상, gold purchases ↔ 금 매입); else UNSUPPORTED with
  reason "news content not matched". Live runs have only the absence fact (Feature 014).
- Insufficient-evidence sentences pass (unchanged).

## R6 — Frozen sets (FR-011)

- Development set `precision-dev.json`: the 23 distinct audited mismatches (sentence, holding, facts id set,
  Feature 016 hand judgement real / debatable / false), the 24 interpretation sentences with a judgement written now
  (before the change), and the 33 raw refs answers with the spike's per-number notes. Tuned on; not evidence of
  generalisation.
- Fixture D `precision-d.json` (held out from tuning, written by the rule author before the change): comparisons with
  and without a second value, labels after values, subject cues that must stay mismatches, citations right / wrong /
  combined / id-only / contradicting, refs duplicates, valuation and outlook judgements with and without a P/E fact,
  news restatements with and without content match, insufficient-evidence sentences. Each case: expectation,
  hypothesis. sha256 of both files recorded before the rule change. D is first run at the rules freeze; its failures
  are findings, never fixed in this Feature.

## R7 — Held-out native capture and blind audit (FR-013)

- Run after the rules and the variant decision are frozen (commit hash recorded):
  `BTA_MEASURE=1 BTA_MEASURE_MODES=refs,current BTA_MEASURE_REPS=2 npm run test:prompt-api -- -g measurement`
  (≈ 2 h, maintainer's Chrome). Prompts are the Feature 016 prompts — no prompt change in this Feature.
- `scripts/audit-sheet.ts` lists, per answer, every numeric claim (text, value, sentence) and every sentence with an
  interpretation-lexicon word, **without** statuses or evidence. The author fills `judgement` (correct / real-error /
  debatable, and for interpretations supported / unsupported by the facts shown) and the facts are shown so the
  meaning can be judged. The filled sheet's sha256 is recorded before `scripts/precision.ts` runs.
- `scripts/precision.ts`: precision = real errors among SEMANTIC_MISMATCH / all SEMANTIC_MISMATCH; recall = real
  errors flagged (mismatch or unsupported) / all real errors; debatable reported separately (counted both ways);
  interpretation agreement; per mode and total. Failed runs are excluded and counted.

## R8 — Threshold and decision (FR-012)

- Met when, on the held-out capture: precision ≥ 80 % (debatable counted as false for this test), every real error
  flagged, and fixtures A–C 26 / 26. The report states the count behind the rate. The verdict change (Feature 016
  FR-020) stays a maintainer decision after the report; this Feature does not change `aggregate()` semantics.

## R9 — Re-score and UI (FR-016)

- `scripts/rescore-measurement.ts` re-scores the Feature 013 reports with the new rules (rendered text only: `plain`
  citations for refs, since raw is absent there) and the held-out capture (with `raw`: both variants).
- The answer window keeps its marks; a wrong citation is shown in the mark title (reason), no new UI element.
