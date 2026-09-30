# Data Model: Feature 017 — Semantic Grounding Precision

Extends Feature 016 (`specs/016-semantic-grounding-contract/data-model.md`); fact ids and texts are unchanged.

## Claim (extended)

- Existing: `text`, `type`, `value`, `status` (`supported | unsupported | semantic-mismatch | unrecognised`), `start`,
  `end`, `evidence: string[]`, `reason?`, `ambiguous?`, `kind?`.
- New `citation?`: `{ factId: string; source: 'rendered' | 'written'; fit: 'right' | 'wrong' | 'id-only' }` — the fact
  the model cited for this value (R4). `wrong` adds a reason; it never changes the status by itself.
- New `side?`: `'reference'` when the value sits inside a comparison's reference phrase (R1); for the record only.
- `kind` for interpretations: `valuation | outlook | news | insufficient-evidence` (unchanged names); `reason` states
  the missing evidence class (`valuation_benchmark`, `fundamentals`, `news content not matched`).

## Citation

- From refs rendering (`Rendered.refs`: name, factId, start, end in the rendered text) or a fact id written in the
  text. Applies to the rendered span itself and to one written number of equal value in the same sentence.
- Combined or unknown references: recorded on the answer, never evidence.

## Checker variant

- `plain` (citations ignored) | `cite` (right citations narrow hits before the cue check). One is adopted per FR-006;
  the other stays available to the scoring script only.

## Frozen case (development set and fixture D)

- `id`, `set` (`dev` | `D`), `text` (sentence or answer), `facts` (fact ids + texts, or a fixture holding reference),
  `raw?` (refs answer before rendering), `target` (span), `expect` (`status`, `evidence`, optional `citation.fit`),
  `judgement` (`real-error | correct | debatable` for dev mismatches, from the Feature 016 audit), `hypothesis`.

## Measurement run (extended)

- `MeasureRun.raw?: string` — the final role's output before rendering (refs mode); other fields unchanged.

## Audit sheet (held-out)

- Per answer: `run` (mode, repetition, question, holding), the facts shown, and items:
  `{ id, type: 'number' | 'interpretation', text, sentence, judgement?: 'correct' | 'real-error' | 'debatable' |
  'supported' | 'unsupported', note? }`. No checker status or evidence in the sheet.
- `sha256` of the filled sheet recorded before scoring.

## Precision report

- Per mode, variant and total: `flagged`, `trueMismatch`, `falseMismatch`, `debatable`, `precision` (debatable as
  false), `realErrors`, `missed`, `recall`, interpretation `agree / total`, `failedRuns`, `threshold: met | not met`.
