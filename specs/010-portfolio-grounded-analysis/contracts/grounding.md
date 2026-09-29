# Contract: grounding checker

`ground(outputs: { role: NodeName; text: string }[], answer: string, facts: Fact[], known: { tickers: string[] }) → Grounding`

- Pure and deterministic (FR-014): same inputs → identical result.
- Extraction and normalisation rules: research R5. Supported only on equality after normalisation, at the fact's
  shown precision (FR-016). Unparsable numeric forms → `unrecognised`, never `supported`.
- Ignored: bare integers ≤ 10 with no unit.
- UI: each unsupported claim in the displayed answer is wrapped in a mark with the visible label
  "근거 확인 안 됨"; unrecognised ones "확인 불가 표기"; the dialog box shows the counts (FR-015).
- Verified by `test/fixtures/grounding/claims.json`: ≥ 60 labelled claims across every rule (SC-002).
