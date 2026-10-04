# Data Model: Feature 018

## Structure

`'eight-role' | 'single-role'`. It is chosen per run by the page parameter `roles` (`single`, or absent for the eight-role graph).

## Measured answer (`MeasureRun`, extended)

Feature 017 fields are kept. New fields:

| Field | Type | Meaning |
|---|---|---|
| `structure` | `'eight-role' \| 'single-role'` | which structure answered (absent in older reports = eight-role) |
| `calls` | number | model calls the run used (8 or 1 on success) |

The run record (page evidence) gains `structure` and, for the single role, `graph.version: 'single-role-baseline@1'`
and its topology string.

## Capture report

One report per (structure, mode, repetition), plus pooled reports per (structure, mode) and a comparison summary.
Each report carries the Feature 017 fields plus `structure` and `repetition`.

## Blind audit sheet

- `{ seed, entries: [{ id: 'e001', facts: string[], answer: string, items: Item[] }] }`
- `Item` is Feature 017's: `{ id, type: 'number' | 'interpretation', text, start, end, sentence, judgement?, note? }`.
  Item ids are `<entry id>:<n>`.
- The sheet has no mode, structure, repetition, question id, holding or checker output.

## Structure key

`{ seed, entries: { [entryId]: { report, run, structure, mode, repetition } } }`. It is stored apart and joined only
after the judged sheet's hash is recorded.

## Reliability sample

- `{ seed, entryIds: string[], sheet: <entries without judgements> }`: filled by the maintainer.
- The agreement result is `{ items, agreeRealOrNot, positives, agreeOnPositives, bar: { realOrNot: 0.95, positives: 0.7 }, met }`.

## Comparison report

Per mode and metric:

- `values: { eight: number[5], single: number[5] }`, pooled values, `pairsBetter: { eight, single }`, `maxWithinSpread`,
  `verdict: 'eight-role better' | 'single-role better' | 'no difference'`, and the counts behind each value.
- Primary metric verdicts are `'not established'` when the reliability bar is not met.
- Also `h1: 'holds' | 'does not hold' | 'not established'`.

Validation:

- `calls` is 1 for every successful single-role run and 8 for every successful eight-role run.
- Every sheet entry has a key entry, and every key entry has a sheet entry.
- Judgements are complete before comparison: the script refuses unjudged items, as `precision.ts` does.
