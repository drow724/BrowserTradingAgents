# Data Model: Feature 016 — Semantic Grounding Contract

## Semantic value (derived per fact, R1/R2)

`{ factId, subject, metric, value?, unit, basis?, direction?, asOf? }`

- `metric`: `holding | quantity | cost_basis | price | unrealised_return | position_value | price_return |
  moving_average | range_high | range_low | volume | volume_ratio | valuation_multiple | news` (closed; extended only
  with a template)
- `basis`: `latest | since_average_purchase | sessions:N | days:N | weeks:N | all_time` (closed vocabulary)
- `direction`: `up | down | none` (from the sign or the verb of the template)
- `value`: number, or `none` for an absence fact (`No news is supplied`)
- A fact may hold several values (M3: `range_high` and `range_low`); ids stay H1…N1.

## Claim result (extends the Feature 010 claim)

`{ text, start, end, type: 'number' | 'ticker' | 'date' | 'interpretation', value, status, evidence: string[],
reason?, ambiguous?, cues? }`

- `status`: `supported | unsupported | semantic-mismatch | unrecognised` (`SUPPORTED`, `UNSUPPORTED`,
  `SEMANTIC_MISMATCH` in the spec; the existing `unrecognised` kept)
- `interpretation` claims: `kind: valuation | outlook | insufficient-evidence`
- `reason`: e.g. `"value belongs to D2 (unrealised_return, since_average_purchase); claimed basis sessions:20 → M1 is
  -7.6"`, `"no valuation evidence among the facts"`

## Grounding counts

`{ supported, unsupported, semanticMismatch, unrecognised }` (answer claims); byRole unchanged in shape.

## Frozen fixture (`test/fixtures/grounding/semantic.json`)

`{ fixtures: [{ id: 'A' | 'B' | 'C', subject, facts: Fact[], claims: [{ text, target, expect: { status, evidence },
spans?: [{ text, status }], hypothesis }] }] }` — `target` is the span the claim is about (e.g. `"20.08%"`); `spans`
gives the expected class of every other span extracted from the sentence (e.g. the horizon mention `20`). Committed
before the checker change; never edited to fit results.

## Measurement

`aggregate()` adds `semanticMismatchPerAnswer`; `zeroUnsupportedRate` = share of completed answers with 0 unsupported
and 0 semantic mismatches (documented change).
  **Revised (F016-R3, decision A):** mismatches are reported as `semanticMismatchPerAnswer` only; the clean rate and
  trap handling keep counting unsupported claims.
