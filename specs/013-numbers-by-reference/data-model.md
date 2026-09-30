# Data Model: Feature 013 — Numbers by Reference

## Number mode

- `'current' | 'formatted' | 'refs'`; from `?numbers=`; default `current`.

## Graph input addition

- `answerFacts?: string` — set only in `formatted`/`refs`; read by the final role instead of `holdingFacts`.

## Reference table (per run, from the fact set + question)

- Entry: `{ name: string; factId: string; value: number | string; unit: 'KRW' | 'USD' | 'pct' | 'g' | 'kg' | 'BTC' |
  'shares' | 'date' | 'none'; source: string }`.
- `name`: `<factId>` when the fact holds one number, else `<factId><a|b|c…>` in reading order. Unique per run.

## Render result

- `{ rendered: string; refs: { name, factId, start, end }[]; violations: { kind: 'bare-number' | 'unknown-reference' | 'unbraced-reference';
  text: string; start: number; end: number }[] }` — positions refer to `rendered`.

## Run record additions (portfolio runs)

- `analysis.numbers`: `{ mode, raw?, rendered?, refs?, violations? }` — `raw`, `rendered`, `refs` and `violations`
  only in `refs` mode (FR-010); `current`/`formatted` record the mode only.
- `analysis.grounding` is computed on `rendered` in `refs` mode, on the answer otherwise (unchanged).

## Measurement run (extends Feature 010 `MeasureRun`)

- `mode`, `violations: number`. Aggregate adds `formatViolationRate` (share of completed answers with ≥ 1 violation) for
  `refs`; `null` for the other modes.

## Re-score record

- `{ report, checker: { before: <commit>, after: <commit> }, old: Aggregate & { verdict }, new: Aggregate &
  { verdict }, hand: { zeroUnsupportedRate: 0.889, trapHandledRate: 0.889, verdict: 'LIMITED' }, changedRuns: [...] }`.

## Hand audit

- Per mode: `[{ question, repetition, holding, realUnsupported: number, trapHandled?: boolean, violations: number,
  note?: string }]`.
