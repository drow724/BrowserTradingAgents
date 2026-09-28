# Contract: Feature 004 evidence record

Extends `specs/003-langgraph-akarisp-minimal-graph/contracts/evidence.md`. Field names, classes and
rules of that contract apply unless changed here. One JSON object per run, printed in `#evidence`
by the canonical page. Committed deliberately under
`specs/004-browser-tradingagents-fixture-graph/evidence/` as `<layer>-<date>-<sha>.json`.

## Changes from Feature 003

```json
{
  "feature": "004-browser-tradingagents-fixture-graph",
  "fixture": "tradingagents-fixture@1",
  "prompts": "src/graph/trading-graph.ts",
  "graph": {
    "version": "tradingagents-fixture-graph@1",
    "topology": "START→{marketAnalyst,newsAnalyst}; [marketAnalyst,newsAnalyst]→bullResearcher; bullResearcher→bearResearcher→researchManager→trader→riskReviewer→finalDecisionMaker→END",
    "entry": "@langchain/langgraph/web"
  },
  "nodes": {
    "marketAnalyst": { "status": "done", "executions": 1, "modelRequests": 1, "reads": ["subject", "marketFacts"] },
    "…": "one entry per role node (8), reads = the role table's field names"
  },
  "timing": { "graphMs": 0 },
  "result": {
    "marketReport": "…", "newsReport": "…", "bullArgument": "…", "bearArgument": "…",
    "researchDecision": "…", "traderPlan": "…", "riskReview": "…", "finalDecision": "…"
  }
}
```

Unchanged from Feature 003: `evidenceClass`, `provider`, `runner`, `environment`, `revision`
(incl. `langgraph`), `runtimeOptions`, `outcome`, `error`, `nodeEvents`, `modelRequests`, `counts`
(`graphRuns`, `nodeExecutions`, `logicalRequests`, `fallbackRequests`, `providerInvocations:
"NOT EXPOSED"`), `concurrency` (`graph`, `akarisp.fanOutSnapshot {snapshot, pollMs}`,
`nativeProvider: "not observed (out of scope)"`), `lifecycle` (`settledBeforeShutdown`,
`snapshotBeforeShutdown`, `snapshotAfterShutdown`), `blocked`.

## Rules (additions)

- `nodes.*.reads` comes from the same role table that builds the prompts; it is a summary, not a
  prompt transcript. Full prompts are never stored; request provenance is proven by deterministic
  tests (contracts/graph.md G2, G5–G9).
- `result` is present only for `outcome: "success"` and holds the eight role fields; wording is
  never evaluated.
- `timing.graphMs` = wall time of `graph.invoke` (operational evidence only).
- `counts.logicalRequests` is expected 8 and `fallbackRequests` 0 for a successful run — measured;
  a different value is kept and explained.
- The gate record for SC-016: `REAL_BROWSER_PROMPT_API`, `provider: native`,
  `availability: MODEL_AVAILABLE`, `outcome: success`, eight nodes `done`, clean revision.
- Feature 003 records keep their own contract and are never rewritten.
