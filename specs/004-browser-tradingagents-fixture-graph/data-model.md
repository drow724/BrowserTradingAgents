# Data Model: Feature 004 — TradingAgents fixture graph

Feature 004 concepts only. No orders, positions, PnL or holdings.

## TradingFixture (`src/graph/trading-fixture.ts`)

| Field | Type | Rule |
|---|---|---|
| `id` | string | `tradingagents-fixture@1`; bump on content change |
| `subject` | string | fictional company name, no ticker |
| `marketFacts` | string | 2–3 facts, each tagged `(market fact M<n>)` |
| `newsFacts` | string | 2–3 facts, each tagged `(news fact N<n>)` |

Tags are unique sentinels for provenance tests. Test-only inputs (e.g. `STANDIN_FAIL` in
`newsFacts`) live in tests only.

## TradingGraphState

| Key | Written by | Read by |
|---|---|---|
| `input` | caller | Market (`subject`, `marketFacts`), News (`subject`, `newsFacts`), all roles (`subject`) |
| `marketReport` | Market Analyst | Bull, Bear, Trader, Risk Reviewer |
| `newsReport` | News Analyst | Bull, Bear, Risk Reviewer |
| `bullArgument` | Bull Researcher | Bear, Research Manager |
| `bearArgument` | Bear Researcher | Research Manager |
| `researchDecision` | Research Manager | Trader, Risk Reviewer, Final Decision |
| `traderPlan` | Trader | Risk Reviewer, Final Decision |
| `riskReview` | Risk Reviewer | Final Decision |
| `finalDecision` | Final Decision | caller |

All last-value, one writer each, no reducer, no `messages`.

## Role (constant table in `src/graph/trading-graph.ts`)

| Field | Meaning |
|---|---|
| `node` | graph node name (distinct from state keys) |
| `label` | display name (e.g. "Research Manager") |
| `writes` | the one state key it writes |
| `reads` | ordered list of state/input keys rendered into its prompt |
| `ask` | one- or two-sentence role instruction (plain-text answer) |

## NodeEvent / RoleExecutionObservation

As Feature 003: `{ node, event: 'start' | 'done' | 'error', seq }`; derived per node: status,
executions, modelRequests.

## GraphRun

As Feature 003: one runtime (`limit 1, queueCapacity 32`), one model, one `AbortController`;
outcome `success | cancelled | failed`; settlement on a `ready` runtime before shutdown.

## TradingGraphEvidence

See [contracts/evidence.md](contracts/evidence.md).
