# Contract: numbers by reference (refs mode, final answer only)

## What the model sees (final role, `refs`)

```text
Answer facts: … Average purchase price: 95,000,000 KRW {H3}. (fact H3) Latest price (2026-09-25 {D1a}):
91,250,000 KRW {D1b}. (fact D1) Unrealised change vs. average purchase price: -3.95% {D2}. (fact D2) …
User question: 비트코인 지금 들고 있어도 될까요?

Answer the user's question in Korean, in at most three sentences, using only the facts given. If the facts do not
contain the answer, say so. Never write a number yourself. When you mention a value from the facts, write only its
reference in braces, e.g. {D2}. If a value you need is not in the facts, say that it is not given.
```

## What the model writes → what the user sees

| Raw | Rendered | Result |
|---|---|---|
| `평균 매입가 {H3} 대비 {D2} 하락했습니다.` | `평균 매입가 9,500만 원 대비 -3.95% 하락했습니다.` | 2 refs, 0 violations |
| `현재 가치는 {D9}입니다.` | `현재 가치는 {D9}입니다.` | `unknown-reference` |
| `현재 가격은 9억 1천 2백만 원입니다.` | unchanged | `bare-number` + checker: unsupported |
| `{ d2 }` | `-3.95%` | forgiven (case, spaces) |
| `손실률은 D2입니다.` | unchanged | `unbraced-reference` |

## Evidence

`analysis.numbers = { mode: 'refs', raw, rendered, refs: [{ name: 'H3', factId: 'H3', start, end }, …],
violations: [] }`; `analysis.grounding` on `rendered`.

## Invariants

- `current`: prompts and records identical to Feature 010 (plus `analysis.numbers.mode`).
- Demo (non-portfolio) runs: prompts byte-identical to `e9b2425` (Feature 010 check reused).
- Only the final role differs by mode: in `formatted` and `refs` it reads `answerFacts` (all facts, mode text)
  instead of `holdingFacts`, plus the `refs` instruction; the seven other roles' prompts are identical in every mode
  (adaptation A-013-1).
