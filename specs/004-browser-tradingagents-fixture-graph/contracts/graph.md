# Contract: TradingAgents fixture graph (topology, role provenance, observable guarantees)

Application-internal contract of `src/graph/trading-graph.ts` as used by `src/main.ts` and tests.

## Interface

```text
buildTradingGraph(model: AkariChatModel, onNode?: (e: NodeEvent) => void)
  → { graph, modelRequests }        graph from '@langchain/langgraph/web'
graph.invoke({ input: TradingFixture }, { signal?: AbortSignal })
  → resolves: TradingGraphState (all nine fields)   → rejects: abort or any role error
ROLES: the role table below (node, writes, reads, ask) — exported for main.ts and evidence
```

Every node: `model.invoke([new HumanMessage(prompt)], { signal: config.signal })` exactly once;
prompt = the role's `ask` + one labelled line per `reads` key, nothing else. Plain text; no
`system` message, no structured parsing, no tools. `src/graph/` imports nothing from `akarisp`.

## Topology

```text
START → marketAnalyst, START → newsAnalyst
[marketAnalyst, newsAnalyst] → bullResearcher        (barrier fan-in)
bullResearcher → bearResearcher → researchManager → trader → riskReviewer → finalDecisionMaker → END
```

## Role provenance (authoritative for tests)

Sentinels: `M1…` = market fact tags, `N1…` = news fact tags; in deterministic tests each role's
fake output is a unique token (e.g. `out-marketReport`).

| Node | Role | Reads | Must not contain | Writes |
|---|---|---|---|---|
| `marketAnalyst` | Market Analyst | `subject`, `marketFacts` | N-sentinels, any role output | `marketReport` |
| `newsAnalyst` | News Analyst | `subject`, `newsFacts` | M-sentinels, any role output | `newsReport` |
| `bullResearcher` | Bull Researcher | `subject`, `marketReport`, `newsReport` | M/N-sentinels, later outputs | `bullArgument` |
| `bearResearcher` | Bear Researcher | `subject`, `marketReport`, `newsReport`, `bullArgument` | M/N-sentinels, later outputs | `bearArgument` |
| `researchManager` | Research Manager | `subject`, `bullArgument`, `bearArgument` | M/N-sentinels, `marketReport`, `newsReport`, later outputs | `researchDecision` |
| `trader` | Trader | `subject`, `researchDecision`, `marketReport` | M/N-sentinels, `newsReport`, `bullArgument`, `bearArgument`, later outputs | `traderPlan` |
| `riskReviewer` | Risk Reviewer | `subject`, `traderPlan`, `researchDecision`, `marketReport`, `newsReport` | M/N-sentinels, `bullArgument`, `bearArgument` | `riskReview` |
| `finalDecisionMaker` | Final Decision | `subject`, `riskReview`, `researchDecision`, `traderPlan` | M/N-sentinels, `marketReport`, `newsReport`, `bullArgument`, `bearArgument` | `finalDecision` |

## Deterministic guarantees (fake `Runtime` behind the real `AkariChatModel`)

Fake runtime as Feature 003: per-call deferred, records input and signal, rejects
`TaskError('cancelled')` on abort (immediately if pre-aborted), bounded 2 s settlement wait failing
`run() not settled — orphaned`.

| # | Guarantee | Assertion |
|---|---|---|
| G1 | success | all nine state fields filled; each of 8 roles executed once; each field equals its role's output token |
| G2 | analyst independence | Market request has M-sentinels, no N-sentinel; News the reverse; neither has a role output |
| G3 | fan-out | both analyst requests exist before either resolves |
| G4 | fan-in barrier | Market done, News held → Bull executions 0; release → 1. Same with News first |
| G5 | Bull, then Bear | Bull's request contains both report tokens and the "bear has not spoken yet" instruction, no M/N sentinels; Bear's request exists only after Bull's `done` and contains the actual `out-bullArgument` plus both report tokens, no M/N sentinels |
| G6 | Research Manager | contains Bull + Bear tokens; no report tokens, no sentinels |
| G7 | Trader | starts after RM done; contains `out-researchDecision` + `out-marketReport`; no `out-newsReport`, Bull/Bear tokens, sentinels |
| G8 | Risk Reviewer | starts after Trader done; contains trader plan, research decision, both reports; no Bull/Bear tokens, sentinels |
| G9 | Final Decision | starts after Risk done; contains risk review, research decision, trader plan; no reports, Bull/Bear tokens, sentinels |
| G10 | accounting | `model.logicalRequests` 8 = Σ `modelRequests` = number of `run()` calls; fallback = 0 (no path); every call one `user` message |
| G11 | signal forwarding (Regression A) | every `run()` received a signal; aborts with the caller |
| G12 | cancel, analyst phase (C1) | abort with both analysts in flight → rejects; then bounded settle: both `cancelled`; roles after analysts 0 |
| G13 | cancel, sequential phase (C2) | Trader held → abort → rejects; Trader run settles `cancelled`; Risk, Final 0; no `finalDecision` |
| G14 | early failure (F1) | News rejects `TaskError('failed')` → caller gets same object; Bull…Final 0; Market's signal aborted and settled |
| G15 | late failure (F2) | Trader rejects → same object; Risk, Final 0; earlier roles' executions recorded |
| G16 | empty analyst output | News returns `''` → run completes; Bull's request has the News label with empty value |

## Runtime guarantees (NODE_INTEGRATION: real akarisp + stand-in; limit 1)

| # | Guarantee | Assertion |
|---|---|---|
| L1 | success, one runtime | 8 requests `done`, `logicalRequests` 8, `ready 0/0` before shutdown |
| L2 | backpressure | stand-in held, after 2 bridge starts poll ≤ 1 s → `active 1, queued 1` |
| L3 | C1 settles | abort at L2 state → rejects; both `cancelled`; `ready 0/0` before shutdown (Regression B) |
| L4 | C2 settles | hold on Trader `start` → abort → Trader `cancelled`; 5 earlier `done` (Market, News, Bull, Bear, RM); Risk/Final 0; `ready 0/0` before shutdown |
| L5 | F1 settles | `STANDIN_FAIL` in `newsFacts` → `TaskError('failed')`; Bull…Final 0; runtime `ready`; `ready 0/0` before shutdown |
| L6 | shutdown | after success, `shutdown()` twice → `closed 0/0` |

Caller rejection and task settlement are asserted separately (Feature 003 O-2).
