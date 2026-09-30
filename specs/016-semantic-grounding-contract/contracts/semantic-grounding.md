# Contract: Semantic grounding

## Fact templates (the only source of fact semantics)

One table in `src/analysis/semantics.ts`, one row per sentence form our code or the committed fixture produces, e.g.:

| Template (simplified) | Values → metric, basis, direction |
|---|---|
| `Quantity held: {n} {unit}.` | quantity, latest |
| `Average purchase price: {p} {cur}[ per g].` | cost_basis |
| `Latest price ({date}): {p} {cur}.` | price, latest (asOf = date) |
| `Unrealised change vs. average purchase price: {±r}%.` | unrealised_return, since_average_purchase, sign |
| `Position value at the latest price: {v} {cur}.` | position_value, latest |
| `The (share )?price (rose|fell) {r}% over the last {N} sessions.` | price_return, sessions:N, verb |
| `The price is (above|below) its {N}-day moving average of {p} {cur}.` | moving_average, days:N; relation above/below |
| `The {N}-week (high|low) is {p} {cur}[ and the {N}-week low is {p} {cur}].` | range_high / range_low, weeks:N |
| `No news is supplied for this holding.` | news, value none |

A test runs every sentence that `factSet` produces for all fixture instruments and for live facts; each must match a
template, or it is listed as a finding (value-only grounding for it).

## Claim cues

Finite lists (Korean and English) for basis, metric and direction, read from the claim's clause (sentence ends, `,`,
`;`, and the connectives `고 `, `며 `, `지만 `, `는데 `). Lists live next to the templates and are part of this contract.

## Classification

1. no value match → `unsupported`
2. value match, no cue → `supported` (evidence = matching facts; `ambiguous` when their metrics differ)
3. value match + cues: a matching fact agreeing with every cue → `supported`; else `semantic-mismatch` with reason
4. interpretation lexicon (valuation, outlook) without an insufficiency phrase → `unsupported` (no evidence class);
   with one → `supported` as `insufficient-evidence`

## Result and display

- `Claim` gains `evidence`, `reason`, `ambiguous`; `status` gains `semantic-mismatch`; counts gain `semanticMismatch`.
- Answer window: "근거 확인: 일치 N건 · 의미 불일치 N건 · 근거 확인 안 됨 N건 · 확인 불가 표기 N건"; a mismatch is marked
  "[의미 불일치]"; the reason is the mark's title (research/debug); normal wording stays concise.
