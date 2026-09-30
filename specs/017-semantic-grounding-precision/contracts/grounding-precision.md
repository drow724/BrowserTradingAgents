# Contract: Grounding Precision (Feature 017)

Extends `specs/016-semantic-grounding-contract/contracts/semantic-grounding.md`. Pure, deterministic, no model.

## `claims(text, facts, known, options?)`

- `options.citations?`: rendered reference spans (`{ factId, start, end }[]`) for refs answers.
- `options.variant?`: `'plain' | 'cite'` (default = the adopted variant, R4).
- Returns `Claim[]` (data-model.md); `ground()` passes the rendered spans from the run's `numbers.refs`.

## Anchor choice for a numeric claim (in order)

1. Horizon mention inside a basis cue ("20" of "20일") → value-only (unchanged).
2. Label after the value (R2) → that label is the anchor.
3. Comparison (R1): cues inside a reference phrase apply only to values inside it.
4. Otherwise the nearest basis-or-metric cue in the clause (Feature 016).
5. Direction: nearest direction cue, excluding cues inside another value's reference phrase.

With variant `cite` and a `right` citation, hits are narrowed to the cited fact before steps 2–5; the cue check still
decides the status.

## Interpretations (per sentence)

| Class | Trigger | Evidence needed | Current data |
|---|---|---|---|
| insufficient-evidence | lexicon word + insufficiency phrase | none | SUPPORTED |
| valuation judgement | 저평가, 고평가, 저렴, 비싸, 싸다, undervalued, overvalued, cheap, expensive | `valuation_benchmark` | UNSUPPORTED |
| long-term outlook | 장기, 잠재력, 성장성, 펀더멘털, 근본, long-term, upside, potential, recover; 회복/반등 only with a long-term word | `fundamentals` | UNSUPPORTED |
| news restatement | 뉴스/news/소식/보도 or a content key | a news fact sharing a number, date or content key | per match |

## Offline scripts

- `node scripts/audit-sheet.ts <report.json> <sheet.json>` — blind sheet (no statuses).
- `node scripts/precision.ts <report.json> <sheet.json> [out.json]` — precision report per mode and variant; refuses
  to run if the sheet has unjudged items.
- `node scripts/rescore-measurement.ts <report> [out]` — unchanged interface; uses `raw` when present.

## Shown text

- No change to the rendered answer. Mark titles carry the reason (wrong citation, missing evidence class).
