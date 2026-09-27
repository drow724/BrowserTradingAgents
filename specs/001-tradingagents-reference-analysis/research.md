# Research: Feature 001 — Original TradingAgents Reference Analysis

Canonical source-analysis artifact for Feature 001. Evidence class for every claim:
`STATIC_CODE_ANALYSIS`. All citations refer to the frozen commit below.

Permalink base (`PL`):
`https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/`

Status: Phases 1–7 complete (T001–T032). Sections marked *Pending* are filled by later phases.

## 1. Reference Baseline

| Item | Value | Verified by |
|---|---|---|
| TradingAgents repository | TauricResearch/TradingAgents | T002 |
| Branch | main | spec (pinned) |
| Commit | `35543d0248bf89fcb92b17a15858ad0c0e940687` | T002: `git rev-parse HEAD` in `UP` → identical |
| Commit subject / date | "TradingAgents v0.5.1 release", 2026-09-24 | T002: `git log -1` |
| Version | `0.5.1` | T003: `pyproject.toml` L7 `version = "0.5.1"` ([PL](https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/pyproject.toml#L7)) |
| Graph library pin (context) | `langgraph>=0.4.8`, `langchain-core>=0.3.81` | `pyproject.toml` L12, L16 |
| Analysis date | 2026-09-28 | — |
| AkariSP baseline | drow724/akariSP `main` @ `7e8202e6ab91af386abc9e2416d9cb07fdfacecf`, `akarisp@0.1.0-alpha.2`, registry verification: match (as provided; recorded only, not analyzed) | T001 |
| BrowserTradingAgents | drow724/BrowserTradingAgents `main` @ `37b4fad41696c84bc49091eb4a9db36fcf92d564` (execution baseline) | T001: `git rev-parse HEAD` |
| Constitution | v1.0.0 (`.specify/memory/constitution.md`) | T001 |
| Active feature | `specs/001-tradingagents-reference-analysis` (`.specify/feature.json`) | T001 |
| Evidence class | `STATIC_CODE_ANALYSIS` only | — |

**Source acquisition (T002)**: `git init` → `git fetch --depth 1
https://github.com/TauricResearch/TradingAgents 35543d0248bf89fcb92b17a15858ad0c0e940687` →
`git checkout --detach FETCH_HEAD` in a session scratch directory outside this repository (`UP`).
No upstream file was copied into this repository.

**Pre-existing untracked paths at baseline (T001, excluded from T057)**: `.claude/`,
`.specify/.gitignore`, `.specify/init-options.json`, `.specify/integration.json`,
`.specify/integrations/`, `.specify/memory/.constitution-template.json`, `.specify/scripts/`,
`.specify/templates/`, `.specify/workflows/`, `CLAUDE.md`. (`.specify/feature.json` is gitignored by
Spec Kit.)

### Source-path validation (T004 / T005)

All 22 paths required by spec.md and plan.md exist at the frozen commit. No mapping or finding
needed (T005: no action).

| Path | Status | Lines |
|---|---|---|
| tradingagents/graph/setup.py | exact path present | 146 |
| tradingagents/graph/conditional_logic.py | exact path present | 33 |
| tradingagents/graph/analyst_execution.py | exact path present | 74 |
| tradingagents/graph/propagation.py | exact path present | 81 |
| tradingagents/graph/trading_graph.py | exact path present | 390 |
| tradingagents/agents/state.py | exact path present | 77 |
| tradingagents/agents/context.py | exact path present | 238 |
| tradingagents/agents/structured.py | exact path present | 89 |
| tradingagents/agents/tools.py | exact path present | 284 |
| tradingagents/default_config.py | exact path present | 173 |
| tradingagents/agents/analysts/market_analyst.py | exact path present | 90 |
| tradingagents/agents/analysts/news_analyst.py | exact path present | 68 |
| tradingagents/agents/analysts/sentiment_analyst.py | exact path present | 183 |
| tradingagents/agents/analysts/fundamentals_analyst.py | exact path present | 70 |
| tradingagents/agents/researchers/bull_researcher.py | exact path present | 65 |
| tradingagents/agents/researchers/bear_researcher.py | exact path present | 67 |
| tradingagents/agents/managers/research_manager.py | exact path present | 75 |
| tradingagents/agents/trader/trader.py | exact path present | 101 |
| tradingagents/agents/risk_mgmt/aggressive_debator.py | exact path present | 68 |
| tradingagents/agents/risk_mgmt/conservative_debator.py | exact path present | 70 |
| tradingagents/agents/risk_mgmt/neutral_debator.py | exact path present | 68 |
| tradingagents/agents/managers/portfolio_manager.py | exact path present | 107 |

Other files observed in the same directories (not required; consulted only if a later phase needs
them): `agents/schemas.py`, `agents/rating.py`, `agents/post_screen.py`, `graph/checkpointer.py`,
`graph/reflection.py`, `graph/settlement.py`.

## 2. Original Graph Topology

Graph is built in `GraphSetup.setup_graph()` (`tradingagents/graph/setup.py` L64–146) as
`StateGraph(AgentState)` (L95) and returned **uncompiled** (L146); compile/invoke is analyzed in
Phase 9 (T038). A repository-wide search of `tradingagents/` finds no `add_node` / `add_edge` /
`add_conditional_edges` / `Send(` outside `graph/setup.py` — all wiring is in this one function.

### 2.1 Analyst execution plan (T007)

**Claim**: Analyst order is exactly the caller-supplied order of `selected_analysts`; the plan is a
plain list with no grouping or concurrency metadata.
- Evidence class: STATIC_CODE_ANALYSIS
- Source: `tradingagents/graph/analyst_execution.py` L59–72, `build_analyst_execution_plan()`
  ([PL](https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/tradingagents/graph/analyst_execution.py#L59-L72))
- Observed: iterates `selected_analysts` in order, looks up `ANALYST_NODE_SPECS[key]` (unknown key →
  `ValueError`), appends to `specs`; empty selection → `ValueError`. No de-duplication, no sorting.
- Spec table `ANALYST_NODE_SPECS` (L26–56):

| key | agent_node | clear_node | report_key | tools | tool_node |
|---|---|---|---|---|---|
| `market` | Market Analyst | Msg Clear Market | `market_report` | `market_analyst.TOOLS` | `tools_market` |
| `social` | Sentiment Analyst | Msg Clear Sentiment | `sentiment_report` | none (comment L35–36: "fetches its sources before calling the model, so it has no tools") | none |
| `news` | News Analyst | Msg Clear News | `news_report` | `news_analyst.TOOLS` | `tools_news` |
| `fundamentals` | Fundamentals Analyst | Msg Clear Fundamentals | `fundamentals_report` | `fundamentals_analyst.TOOLS` | `tools_fundamentals` |

  `tool_node` is `f"tools_{key}"` only when `tools` is non-empty (L15–18).
- Default selection: `("market", "social", "news", "fundamentals")` in `setup_graph()` L65 and in
  `TradingAgentsGraph.__init__` (`graph/trading_graph.py` L48, passed through at L112).
- Implication: upstream analyst order is a configuration input, not a fixed topology.

### 2.2 Node inventory (T006)

Source: `tradingagents/graph/setup.py`.

| Node name | Created by | LLM passed | Registered at | Condition |
|---|---|---|---|---|
| Market Analyst | `create_market_analyst` | quick | L79, L98 | if `market` selected |
| Sentiment Analyst | `create_sentiment_analyst` | quick | L80, L98 | if `social` selected |
| News Analyst | `create_news_analyst` | quick | L81, L98 | if `news` selected |
| Fundamentals Analyst | `create_fundamentals_analyst` | quick | L82, L98 | if `fundamentals` selected |
| Msg Clear {Market,Sentiment,News,Fundamentals} | `create_msg_delete()` | none | L99 | one per selected analyst |
| tools_{market,news,fundamentals} | `ToolNode(list(spec.tools))` | none | L100–101 | only for selected analysts with tools |
| Bull Researcher | `create_bull_researcher` | quick | L85, L103 | always |
| Bear Researcher | `create_bear_researcher` | quick | L86, L104 | always |
| Research Manager | `create_research_manager` | **deep** | L87, L105 | always |
| Trader | `create_trader` | quick | L88, L106 | always |
| Aggressive Analyst | `create_aggressive_debator` | quick | L90, L107 | always |
| Neutral Analyst | `create_neutral_debator` | quick | L91, L108 | always |
| Conservative Analyst | `create_conservative_debator` | quick | L92, L109 | always |
| Portfolio Manager | `create_portfolio_manager` | **deep** | L93, L110 | always |

LLM column records only which constructor argument `setup_graph` passes (`self.quick_thinking_llm`
/ `self.deep_thinking_llm`); how those objects are built is Phase 9 (T037).

### 2.3 Edge inventory (T008 / T009)

`i` = position in the analyst plan; `N` = number of selected analysts. All in
`tradingagents/graph/setup.py` unless noted. Evidence class for every row: STATIC_CODE_ANALYSIS.

| ID | From | To | Type | Condition / router | Line range |
|---|---|---|---|---|---|
| E01 | START | `specs[0].agent_node` | direct | — | L112 |
| E02 | analyst with tools (`spec.agent_node`) | `spec.tool_node` **or** `spec.clear_node` | tool-loop (conditional) | `_tools_or_clear(spec)`: `tool_node` if `state["messages"][-1].tool_calls` else `clear_node` (L43–47); path list `[tool_node, clear_node]` | L115–118 |
| E03 | `spec.tool_node` | `spec.agent_node` | tool-loop (direct return) | — | L119 |
| E04 | analyst without tools (Sentiment) | `spec.clear_node` | direct | — | L120–121 |
| E05 | `specs[i].clear_node` (i < N−1) | `specs[i+1].agent_node` | direct | — | L123–125 |
| E06 | `specs[N−1].clear_node` | Bull Researcher | direct | — | L123–125 |
| E07 | Bull Researcher | Bull Researcher / Bear Researcher / Research Manager | conditional | `ConditionalLogic.should_continue_debate` (`conditional_logic.py` L12–21) with `DEBATE_PATH_MAP` (L30–34) | L127–133 |
| E08 | Bear Researcher | Bull Researcher / Bear Researcher / Research Manager | conditional | same as E07 | L127–133 |
| E09 | Research Manager | Trader | direct | — | L134 |
| E10 | Trader | Aggressive Analyst | direct | — | L135 |
| E11 | Aggressive Analyst | Aggressive / Conservative / Neutral Analyst / Portfolio Manager | conditional | `ConditionalLogic.should_continue_risk_analysis` (`conditional_logic.py` L23–33) with `RISK_ANALYSIS_PATH_MAP` (L35–40) | L136–142 |
| E12 | Conservative Analyst | same four targets | conditional | same as E11 | L136–142 |
| E13 | Neutral Analyst | same four targets | conditional | same as E11 | L136–142 |
| E14 | Portfolio Manager | END | direct | — | L144 |

### 2.4 Conditional routes (T009)

**R1 `_tools_or_clear(spec)`** — `setup.py` L43–47
([PL](https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/tradingagents/graph/setup.py#L43-L47)).
Returns `spec.tool_node` if the last message has `tool_calls`, else `spec.clear_node`. With E03
this forms the loop analyst → tools → analyst, exited only when the analyst's latest message has
no tool calls.

**R2 `should_continue_debate`** — `conditional_logic.py` L12–21
([PL](https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/tradingagents/graph/conditional_logic.py#L12-L21)).

| Order | Condition | Returns |
|---|---|---|
| 1 | `investment_debate_state["count"] >= 2 * max_debate_rounds` | Research Manager |
| 2 | `investment_debate_state["current_response"].startswith("Bull")` | Bear Researcher |
| 3 | otherwise | Bull Researcher |

`DEBATE_PATH_MAP` maps all three targets for both Bull and Bear (L127 comment, issue #1088), so
Bull→Bull and Bear→Bear are *declared* targets. Whether they are *reachable* depends on the speaker
prefix each researcher writes into `current_response` — resolved in §7.2: Bull→Bull and Bear→Bear are unreachable.

**R3 `should_continue_risk_analysis`** — `conditional_logic.py` L23–33
([PL](https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/tradingagents/graph/conditional_logic.py#L23-L33)).

| Order | Condition | Returns |
|---|---|---|
| 1 | `risk_debate_state["count"] >= 3 * max_risk_discuss_rounds` | Portfolio Manager |
| 2 | `risk_debate_state["latest_speaker"].startswith("Aggressive")` | Conservative Analyst |
| 3 | `latest_speaker.startswith("Conservative")` | Neutral Analyst |
| 4 | otherwise | Aggressive Analyst |

Reachability of each target depends on the `latest_speaker` values written by the risk nodes —
resolved in §8.2: only the forward cycle A→C→N→A and →Portfolio Manager are reachable.

`ConditionalLogic.__init__` defaults: `max_debate_rounds=1`, `max_risk_discuss_rounds=1`
(L7–10). The values actually passed at runtime come from configuration (Phase 8/9, T036/T037).

**N-01 Source-comment discrepancy (recorded, not a finding)**: the inline comments at L17 ("3 rounds of
back-and-forth between 2 agents") and L27 ("3 rounds of back-and-forth between 3 agents") do not
describe the expressions they annotate; the code terminates after `2 × max_debate_rounds` debate
turns and `3 × max_risk_discuss_rounds` risk turns (exact count semantics confirmed in Phase 5/7).
Per plan, source code is authoritative over comments.

### 2.5 Topology diagram (T011)

Drawn only from E01–E14. Default selection `market, social, news, fundamentals`:

```text
START
  │ E01
  ▼
Market Analyst ──E02(tool_calls)──▶ tools_market ──E03──┐
  │ ◀───────────────────────────────────────────────────┘
  │ E02(no tool_calls)
  ▼
Msg Clear Market ──E05──▶ Sentiment Analyst ──E04──▶ Msg Clear Sentiment
                                                          │ E05
  ┌───────────────────────────────────────────────────────┘
  ▼
News Analyst ──E02(tool_calls)──▶ tools_news ──E03──┐
  │ ◀───────────────────────────────────────────────┘
  │ E02(no tool_calls)
  ▼
Msg Clear News ──E05──▶ Fundamentals Analyst ──E02(tool_calls)──▶ tools_fundamentals ──E03──┐
                           │ ◀─────────────────────────────────────────────────────────────┘
                           │ E02(no tool_calls)
                           ▼
                      Msg Clear Fundamentals
                           │ E06
                           ▼
          ┌──────▶ Bull Researcher ──E07(R2)──┐
          │              ▲                    │
          │  E08(R2)     │ E08(R2)            │ E07(R2)
          │              │                    ▼
          └───────── Bear Researcher ◀────────┘
                  (either side, R2 count limit) ──▶ Research Manager
                                                       │ E09
                                                       ▼
                                                     Trader
                                                       │ E10
                                                       ▼
          Aggressive ──E11(R3)──▶ Conservative ──E12(R3)──▶ Neutral
               ▲                                              │
               └──────────────────E13(R3)─────────────────────┘
                  (any of the three, R3 count limit) ──▶ Portfolio Manager
                                                              │ E14
                                                              ▼
                                                             END
```

Declared self/backward routes (Bull→Bull, Bear→Bear, risk self/back routes) are omitted from the
drawing; they exist only in the path maps and are unreachable with the frozen node code (§7.2,
§8.2). Cross-check: every arrow above maps to one of E01–E14; no arrow was added
from docs or memory.

## 3. Graph State

### 3.1 State types (T013)

Source: `tradingagents/agents/state.py`
([PL](https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/tradingagents/agents/state.py)).

- `AgentState(MessagesState)` (L47–77). `messages` is inherited from LangGraph `MessagesState`,
  whose reducer appends/merges messages (library semantics). **No other field declares a reducer**:
  the `Annotated[..., "description"]` metadata are plain strings, so every other key — including
  the nested `investment_debate_state` / `risk_debate_state` dicts — is overwritten wholesale by
  the node that returns it (library semantics for un-reduced channels).
- `InvestDebateState(TypedDict)` (L8–18): `bull_history`, `bear_history`, `history`,
  `current_response`, `judge_decision` (str), `count` (int).
- `RiskDebateState(TypedDict)` (L22–44): `aggressive_history`, `conservative_history`,
  `neutral_history`, `history`, `latest_speaker`, `current_aggressive_response`,
  `current_conservative_response`, `current_neutral_response`, `judge_decision` (str), `count`
  (int).

Groups:

| Group | Fields |
|---|---|
| Run identity/context | `company_of_interest`, `asset_type`, `instrument_context`, `trade_date` (L48–51); `sender` (L53) |
| Messages | `messages` (inherited) |
| Analyst reports | `market_report`, `sentiment_report`, `news_report`, `fundamentals_report` (L56–61) |
| Investment debate state | `investment_debate_state: InvestDebateState` (L64–66) |
| Investment plan | `investment_plan` (L67) |
| Trader investment plan | `trader_investment_plan` (L69) |
| Risk debate state | `risk_debate_state: RiskDebateState` (L72–74) |
| Final trade decision | `final_trade_decision` (L75) |
| Past context | `past_context` (L76, "Memory log context injected at run start") |
| Portfolio context | `portfolio_context` (L77, "Caller-supplied holdings and cash … empty when not provided") |

### 3.2 Initial state and invocation args (T014)

Source: `tradingagents/graph/propagation.py`
([PL](https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/tradingagents/graph/propagation.py#L13-L81)).

- `Propagator.create_initial_state()` (L13–66) sets: `messages=[("human", company_name)]`,
  `company_of_interest`, `asset_type` (default `"stock"`), `instrument_context`, `trade_date`
  (stringified), `past_context`, `portfolio_context` (both default `""`); both debate states with
  all strings `""` and `count=0`; all four reports `""`.
- **Not initialized**: `sender`, `investment_plan`, `trader_investment_plan`,
  `final_trade_decision`. They exist only after their writer node runs.
- `get_graph_args()` (L68–81): `stream_mode="values"`, `config={"recursion_limit":
  max_recur_limit}` (constructor default 100, L9–11; runtime value from config — Phase 9) plus
  optional callbacks.

### 3.3 Per-field producer / consumer table (T015; Read/Written finalized in T040)

"Req. min graph" = *Required for minimum browser graph* — `TBD (Phase 10)` for every row.

| Field | Initialized by | Read by | Written by | Purpose | Req. min graph |
|---|---|---|---|---|---|
| `messages` | propagation L31 | Market/News/Fundamentals (`chain.invoke(state["messages"])`), Sentiment (`format_messages`), R1 router (last message `tool_calls`), ToolNode (library), Msg Clear (pending T034) | Market/News/Fundamentals (L85/63/65 `[result]`), Sentiment (L114), Trader (L96), ToolNode (library), Msg Clear (pending T034) | analyst conversation / tool loop | TBD (Phase 10) |
| `company_of_interest` | L32 | Sentiment (L53 ticker), Trader (L26); instrument helper (pending T034) | — | ticker | TBD (Phase 10) |
| `asset_type` | L33 | News (L23), Bull (L23), Bear (L23) | — | stock vs other wording | TBD (Phase 10) |
| `instrument_context` | L34 | all 12 nodes via `get_instrument_context_from_state` (helper body pending T034) | — | ticker identity text | TBD (Phase 10) |
| `trade_date` | L35 | Market (L17), News (L22), Fundamentals (L24), Sentiment (L54); tool injection pending T035 | — | "now" for analysis | TBD (Phase 10) |
| `sender` | — | **no reader found** in `tradingagents/` or `cli/` (repo search) | Trader (L98, `"Trader"`) | — (see N-04) | TBD (Phase 10) |
| `market_report` | L62 | Bull, Bear, Trader, Aggressive, Conservative, Neutral | Market (L87) | analyst output | TBD (Phase 10) |
| `sentiment_report` | L64 | Bull, Bear, Aggressive, Conservative, Neutral | Sentiment (L115) | analyst output | TBD (Phase 10) |
| `news_report` | L65 | Bull, Bear, Aggressive, Conservative, Neutral | News (L65) | analyst output | TBD (Phase 10) |
| `fundamentals_report` | L63 | Bull, Bear, Aggressive, Conservative, Neutral | Fundamentals (L67) | analyst output | TBD (Phase 10) |
| `investment_debate_state.history` | L42 | Bull, Bear, Research Manager | Bull, Bear (append), RM (copy) | full debate transcript | TBD (Phase 10) |
| `investment_debate_state.bull_history` / `bear_history` | L40–41 | Bull reads own `bull_history`; Bear reads own `bear_history`; each copies the other | Bull / Bear (append own), RM (copy) | per-side transcript; not read by RM | TBD (Phase 10) |
| `investment_debate_state.current_response` | L43 | Bull, Bear (as opponent's last argument), R2 router (prefix) | Bull (`"Bull Analyst: …"`), Bear (`"Bear Analyst: …"`), RM (= plan) | last turn + routing key | TBD (Phase 10) |
| `investment_debate_state.count` | L45 | R2 router, Bull, Bear, RM | Bull, Bear (+1), RM (copy) | turn counter | TBD (Phase 10) |
| `investment_debate_state.judge_decision` | L44 | reporting / CLI / `trading_graph.py` L362 (Phase 9) | RM only (Bull/Bear omit the key — N-03) | RM output copy | TBD (Phase 10) |
| `investment_plan` | — | Trader (L28), Portfolio Manager (L35) | Research Manager (L72) | research → trader hand-off | TBD (Phase 10) |
| `trader_investment_plan` | — | Aggressive, Conservative, Neutral (L30), Portfolio Manager (L36) | Trader (L97) | trader proposal | TBD (Phase 10) |
| `risk_debate_state.history` | L53 | Aggressive, Conservative, Neutral, Portfolio Manager | risk ×3 (append), PM (copy) | full risk transcript | TBD (Phase 10) |
| `risk_debate_state.{aggressive,conservative,neutral}_history` | L50–52 | each risk node reads its own; PM copies | owning node (append), others/PM (copy) | per-side transcript; not read by PM prompt | TBD (Phase 10) |
| `risk_debate_state.latest_speaker` | L54 | R3 router | Aggressive `"Aggressive"`, Conservative `"Conservative"`, Neutral `"Neutral"`, PM `"Judge"` | routing key | TBD (Phase 10) |
| `risk_debate_state.current_{aggressive,conservative,neutral}_response` | L55–57 | the two *other* risk nodes each read one | owning node (`"<Name> Analyst: …"`), others/PM (copy) | opponents' last arguments | TBD (Phase 10) |
| `risk_debate_state.count` | L59 | R3 router, risk ×3, PM | risk ×3 (+1), PM (copy) | turn counter | TBD (Phase 10) |
| `risk_debate_state.judge_decision` | L58 | reporting / CLI / `trading_graph.py` L372 (Phase 9) | PM only (risk nodes omit the key — N-03) | PM output copy | TBD (Phase 10) |
| `final_trade_decision` | — | `trading_graph.py` (Phase 9) | Portfolio Manager (L104) | final output | TBD (Phase 10) |
| `past_context` | L36 | Portfolio Manager (L38) | — | memory lessons | TBD (Phase 10) |
| `portfolio_context` | L37 | Trader, Aggressive, Conservative, Neutral, Portfolio Manager (via `get_portfolio_context_from_state`, `context.py` L194–208) | — | caller holdings | TBD (Phase 10) |

Line numbers in "Initialized by" refer to `propagation.py`; in "Read/Written by" to the node's own
file unless stated.

## 4. Agent Analysis

Conventions for all records:
- "LLM class" = the constructor argument `setup_graph()` passes (`setup.py` L79–93); how the
  quick/deep objects are built is pending T037.
- "Can run in parallel in upstream" is answered from the §2.3 edge inventory only: **every node
  is NO** (no fan-out exists, §9.1).
- Structured-output nodes use `invoke_structured_or_freetext` (`structured.py` L59–89): one
  structured call; on exception or `None` result, **one more** plain call (free-text fallback).
  `bind_structured` behavior (may return `None`) is pending T033.
- Classification fields are `TBD (Phase 10)` until T043.

### 4.1 Market Analyst (T016)

```text
Node: Market Analyst — tradingagents/agents/analysts/market_analyst.py L14–90
Purpose: technical-market report (indicators, price structure) using tools
Input state: trade_date (L17), instrument_context (L18), messages (L78)
Output state: {"messages": [result], "market_report": report} (L85–88)
LLM calls: 1 per node visit, chain = prompt | llm.bind_tools(TOOLS) (L76–78); re-entered after
  every ToolNode run (E03), so N tool rounds ⇒ N+1 calls
LLM class: quick (setup.py L79)
Tools: TOOLS = get_stock_data, get_indicators, get_verified_market_snapshot (L7–11)
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: TBD (Phase 10)
Depends on: run context + its own message thread; reads no other analyst's report
Writes to state: messages (append), market_report ("" while tool_calls present, L80–83;
  final content when the model answers without tool calls)
Conditional routing: R1 — tool_calls → tools_market, else → Msg Clear Market (setup.py L43–47)
Report completion condition: len(result.tool_calls) == 0 (L82)
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

### 4.2 Sentiment Analyst (T017)

```text
Node: Sentiment Analyst — tradingagents/agents/analysts/sentiment_analyst.py L42–118
Purpose: one sentiment report from three pre-fetched sources
Input state: company_of_interest (L53), trade_date (L54), instrument_context (L56), messages (L103)
Output state: {"messages": [AIMessage(report_text)], "sentiment_report": report_text} (L113–116)
LLM calls: 1 structured (SentimentReport) + 1 free-text fallback on failure (L105–111);
  no bind_tools (L100–102)
LLM class: quick (setup.py L80)
Tools: NONE as graph tools / ToolNode. In-node pre-fetch before the model call (L58–68):
  get_news.func(ticker, start, end) (news; module docstring: Yahoo Finance),
  jev_screen(ticker) (post screening; docstring: only with a TypeSafe key),
  fetch_stocktwits_messages(..., limit=30, window, screen),
  fetch_reddit_posts(..., window, screen). Window = trade_date − 7 days (L38–39, L55).
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: TBD (Phase 10)
Depends on: run context + external fetchers; reads no other analyst's report
Writes to state: messages (append), sentiment_report
Conditional routing: none — direct edge to Msg Clear Sentiment (E04)
Structured/free-text: structured SentimentReport rendered by render_sentiment_report;
  free-text fallback returns response.content
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

### 4.3 News Analyst (T018)

```text
Node: News Analyst — tradingagents/agents/analysts/news_analyst.py L20–68
Purpose: news / macro report using tools
Input state: trade_date (L22), asset_type (L23), instrument_context (L25), messages (L56)
Output state: {"messages": [result], "news_report": report} (L63–66)
LLM calls: 1 per visit, prompt | llm.bind_tools(TOOLS) (L55–56); N tool rounds ⇒ N+1 calls
LLM class: quick (setup.py L81)
Tools: get_news, get_global_news, get_macro_indicators, get_prediction_markets (L12–17);
  prompt names FRED as the macro-indicator source (L28)
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: TBD (Phase 10)
Depends on: run context + own message thread; reads no other analyst's report
Writes to state: messages (append), news_report ("" during tool turns, L58–61)
Conditional routing: R1 — tools_news or Msg Clear News
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

### 4.4 Fundamentals Analyst (T019)

```text
Node: Fundamentals Analyst — tradingagents/agents/analysts/fundamentals_analyst.py L22–70
Purpose: company fundamentals report using tools
Input state: trade_date (L24), instrument_context (L25), messages (L58)
Output state: {"messages": [result], "fundamentals_report": report} (L65–68)
LLM calls: 1 per visit, prompt | llm.bind_tools(TOOLS) (L56–58); N tool rounds ⇒ N+1 calls
LLM class: quick (setup.py L82)
Tools: get_fundamentals, get_balance_sheet, get_cashflow, get_income_statement,
  get_insider_transactions (L13–19)
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: TBD (Phase 10)
Depends on: run context + own message thread; reads no other analyst's report
Writes to state: messages (append), fundamentals_report ("" during tool turns, L60–63)
Conditional routing: R1 — tools_fundamentals or Msg Clear Fundamentals
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

### 4.5 ToolNode (T020)

```text
Node: tools_{market,news,fundamentals} — setup.py L100–101, ToolNode(list(spec.tools))
Purpose: execute the tool calls of the analyst's latest AIMessage (LangGraph prebuilt ToolNode)
Input state: messages (last AIMessage.tool_calls) — library semantics
Output state: tool result messages appended to messages — library semantics
LLM calls: none
LLM class: none
Tools: exactly the owning analyst's TOOLS tuple (analyst_execution.py L32, L47, L54)
Can run in parallel in upstream: NO (graph-level; internal execution of multiple tool calls
  inside one ToolNode step is library behavior, not analyzed)
Depends on: owning analyst's latest message
Writes to state: messages
Conditional routing: none — direct edge back to the owning analyst (E03, setup.py L119)
Injected state (e.g. trade date): pending T035
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

Message-clear node record: pending T034.

### 4.6 Bull Researcher (T021)

```text
Node: Bull Researcher — tradingagents/agents/researchers/bull_researcher.py L9–65
Purpose: argue for investing; rebut the bear
Input state: investment_debate_state.{history, bull_history, current_response, bear_history,
  count} (L11–16, L58, L60); market/sentiment/news/fundamentals reports via report_or_absent
  (L18–21); instrument_context (L22); asset_type (L23)
Opponent dependency: YES — current_response is inserted as "Last bear argument" (L15–16, L47);
  full shared history as "Conversation history of the debate" (L46). When current_response is
  empty (first turn), opponent_argument_or_opening returns an explicit "(The bear analyst has not
  spoken yet — open the debate …)" marker (context.py L33–44)
Output state: {"investment_debate_state": {history, bull_history, bear_history,
  current_response, count}} (L55–63)
LLM calls: 1 plain llm.invoke(prompt) per turn (L51); no tools, no structured output
LLM class: quick (setup.py L85)
Tools: none
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: TBD (Phase 10)
Depends on: all four reports (or absence markers), opponent's previous argument, history
Writes to state: history += "\nBull Analyst: …"; bull_history += same; bear_history copied;
  current_response = "Bull Analyst: <content>" (L53, L59); count += 1 (L60);
  judge_decision key omitted (N-03)
Conditional routing: R2 (E07)
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

### 4.7 Bear Researcher (T022)

```text
Node: Bear Researcher — tradingagents/agents/researchers/bear_researcher.py L9–67
Purpose: argue against investing; rebut the bull
Input state: investment_debate_state.{history, bear_history, current_response, bull_history,
  count} (L11–16, L60, L62); four reports via report_or_absent (L18–21); instrument_context;
  asset_type
Opponent dependency: YES — current_response inserted as "Last bull argument" (L15–16, L49);
  history as "Conversation history of the debate" (L48)
Output state: {"investment_debate_state": {history, bear_history, bull_history,
  current_response, count}} (L57–65)
LLM calls: 1 plain llm.invoke per turn (L53)
LLM class: quick (setup.py L86)
Tools: none
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: TBD (Phase 10)
Depends on: four reports, the bull's previous argument, history
Writes to state: history += "\nBear Analyst: …"; bear_history += same; bull_history copied;
  current_response = "Bear Analyst: <content>" (L55, L61); count += 1 (L62);
  judge_decision key omitted (N-03)
Conditional routing: R2 (E08)
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

### 4.8 Research Manager (T024)

```text
Node: Research Manager — tradingagents/agents/managers/research_manager.py L14–75
Purpose: judge the bull/bear debate and hand the trader an investment plan (module docstring L1)
Input state: investment_debate_state.history (L19) — the ONLY debate content in the prompt
  (L40–41); instrument_context (L18). Does NOT read the analyst reports, bull_history /
  bear_history separately, portfolio_context, or past_context.
Output state: {"investment_debate_state": {judge_decision = plan, current_response = plan,
  history/bull_history/bear_history/count copied}, "investment_plan": plan} (L61–73)
investment_plan form: structured ResearchPlan (schemas.py L95–127) =
  recommendation ∈ {Buy, Overweight, Hold, Underweight, Sell} (5-tier PortfolioRating,
  L66–73) + rationale + strategic_actions, rendered to markdown
  "**Recommendation**: … / **Rationale**: … / **Strategic Actions**: …" (L130–138);
  free-text fallback returns raw content with the same requested section order (prompt L43–49)
LLM calls: 1 structured + 1 free-text fallback on failure (L53–59)
LLM class: deep (setup.py L87)
Tools: none (prompt appends NO_EXTERNAL_TOOLS, L51)
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: TBD (Phase 10)
Depends on: complete debate history (runs only after R2 termination)
Writes to state: investment_plan; investment_debate_state (judge_decision, current_response)
Conditional routing: none — direct edge to Trader (E09)
Boundary to Trader: RM decides direction/conviction on a 5-tier scale from the debate only;
  it does not see holdings (ResearchPlan.strategic_actions description, schemas.py L119–125)
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

### 4.9 Trader (T026)

```text
Node: Trader — tradingagents/agents/trader/trader.py L22–101
Purpose: turn the research plan into a concrete transaction proposal (module docstring L1)
Input state: company_of_interest (L26), instrument_context (L27), investment_plan (L28),
  market_report (L34; included only when non-empty, L37–46), portfolio_context via helper (L35).
  Does NOT read sentiment/news/fundamentals reports or any debate state.
Output state: {"messages": [AIMessage(trader_plan)], "trader_investment_plan": trader_plan,
  "sender": "Trader"} (L95–99)
trader_investment_plan form: structured TraderProposal (schemas.py L146–188) =
  action ∈ {Buy, Hold, Sell} (3-tier TraderAction, L76–89) + reasoning + optional entry_price,
  stop_loss (absolute prices), position_sizing; rendered with a trailing
  "FINAL TRANSACTION PROPOSAL: **BUY|HOLD|SELL**" line (L191–216)
LLM calls: 1 structured + 1 free-text fallback on failure (L87–93)
LLM class: quick (setup.py L88)
Tools: none (NO_EXTERNAL_TOOLS, L62)
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: TBD (Phase 10)
Depends on: investment_plan (Research Manager), market_report, portfolio_context
Writes to state: messages (append), trader_investment_plan, sender
Conditional routing: none — direct edge to Aggressive Analyst (E10)
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

**Research Manager vs Trader (SOURCE FACT)**: distinct inputs, scales and outputs.

| | Research Manager | Trader |
|---|---|---|
| Reads | debate `history` only | `investment_plan`, `market_report`, `portfolio_context` |
| Scale | 5-tier rating (Buy…Sell) | 3-tier action (Buy/Hold/Sell); prompt maps Overweight→Buy, Underweight→Sell (L78–80) |
| Adds | which side won + strategic actions vs a standard allocation | price levels (entry, stop), sizing, grounded in market report and holdings |
| LLM | deep | quick |

### 4.10 Aggressive Risk Analyst (T027)

```text
Node: Aggressive Analyst — tradingagents/agents/risk_mgmt/aggressive_debator.py L10–68
Purpose: argue for the high-reward view of the trader's decision
Input state: risk_debate_state.{history, aggressive_history, current_conservative_response,
  current_neutral_response, conservative_history, neutral_history, count} (L12–21, L55–63);
  four reports via report_or_absent (L23–26); instrument_context; portfolio_context (L28);
  trader_investment_plan (L30)
Opponent dependency: YES — reads BOTH other analysts' latest responses (L16–21, prompt L44);
  opening marker when empty; full shared history (L44)
Output state: {"risk_debate_state": {...}} (L52–66)
LLM calls: 1 plain llm.invoke per turn (L48)
LLM class: quick (setup.py L90)
Tools: none
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: TBD (Phase 10)
Depends on: trader_investment_plan, four reports, portfolio_context, the other two analysts'
  latest arguments, history
Writes to state: history/aggressive_history += "\nAggressive Analyst: …";
  latest_speaker = "Aggressive" (L57); current_aggressive_response = argument (L58);
  others copied; count += 1 (L63); judge_decision key omitted (N-03)
Conditional routing: R3 (E11)
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

### 4.11 Conservative Risk Analyst (T028)

```text
Node: Conservative Analyst — tradingagents/agents/risk_mgmt/conservative_debator.py L10–70
Purpose: argue for the low-risk adjustment of the trader's decision
Input state: same shape as Aggressive, with opponents = current_aggressive_response and
  current_neutral_response (L16–21); trader_investment_plan; four reports; portfolio_context
Opponent dependency: YES — both other analysts' latest responses + history
Output state / LLM calls / Tools: as Aggressive (1 plain quick call per turn; setup.py L92)
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: TBD (Phase 10)
Depends on: as Aggressive
Writes to state: history/conservative_history += "\nConservative Analyst: …";
  latest_speaker = "Conservative"; current_conservative_response = argument; count += 1;
  judge_decision key omitted (N-03)
Conditional routing: R3 (E12)
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

(Source diff vs Aggressive differs only in prompt text, opponent fields, owned fields and label.)

### 4.12 Neutral Risk Analyst (T029)

```text
Node: Neutral Analyst — tradingagents/agents/risk_mgmt/neutral_debator.py L10–68
Purpose: argue for a balanced adjustment of the trader's decision
Input state: same shape, opponents = current_aggressive_response and
  current_conservative_response (L16–21); trader_investment_plan; four reports; portfolio_context
Opponent dependency: YES — both other analysts' latest responses + history
Output state / LLM calls / Tools: as Aggressive (1 plain quick call per turn; setup.py L91)
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: TBD (Phase 10)
Depends on: as Aggressive
Writes to state: history/neutral_history += "\nNeutral Analyst: …";
  latest_speaker = "Neutral"; current_neutral_response = argument; count += 1;
  judge_decision key omitted (N-03)
Conditional routing: R3 (E13)
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

### 4.13 Portfolio Manager (T031)

```text
Node: Portfolio Manager — tradingagents/agents/managers/portfolio_manager.py L26–107
Purpose: synthesize the risk debate into the final decision (module docstring L1)
Input state: risk_debate_state.history (L33) — per-analyst histories/current responses are only
  copied, not put in the prompt; investment_plan (L35); trader_investment_plan (L36);
  past_context (L38, included only when non-empty, L39–43); portfolio_context (L31);
  instrument_context (L30). Does NOT read the four analyst reports or the investment debate.
Output state: {"risk_debate_state": {judge_decision = decision, latest_speaker = "Judge",
  others copied}, "final_trade_decision": decision} (L89–105)
final_trade_decision form: structured PortfolioDecision (schemas.py L221–265) =
  rating ∈ 5-tier PortfolioRating + executive_summary + investment_thesis + optional
  price_target, time_horizon; rendered "**Rating**: … / **Executive Summary**: … /
  **Investment Thesis**: … / **Price Target**: … / **Time Horizon**: …" (L268–292)
LLM calls: 1 structured + 1 free-text fallback on failure (L81–87). Module docstring says
  "in a single call" (L3–4) — true for the structured path only (N-05)
LLM class: deep (setup.py L93)
Tools: none (NO_EXTERNAL_TOOLS, L79)
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: TBD (Phase 10)
Depends on: risk history, investment_plan, trader_investment_plan, optional past/portfolio
Writes to state: final_trade_decision; risk_debate_state.{judge_decision, latest_speaker}
Conditional routing: none — direct edge to END (E14)
Required for browser dogfood: TBD (Phase 10)
Reason: TBD (Phase 10)
```

## 5. LLM Invocation Map

*Pending — Phases 8–9 (T033, T036, T037).*

## 6. Tool/Data Invocation Map

### 6.1 Analyst tool/data paths (T020)

| Analyst | Mechanism | Tools / sources | Loop | Evidence |
|---|---|---|---|---|
| Market | ToolNode loop (`tools_market`) | get_stock_data, get_indicators, get_verified_market_snapshot | analyst ⇄ tools_market until no tool_calls | market_analyst.py L7–11, L76; setup.py L43–47, L115–119 |
| News | ToolNode loop (`tools_news`) | get_news, get_global_news, get_macro_indicators, get_prediction_markets | analyst ⇄ tools_news | news_analyst.py L12–17, L55 |
| Fundamentals | ToolNode loop (`tools_fundamentals`) | get_fundamentals, get_balance_sheet, get_cashflow, get_income_statement, get_insider_transactions | analyst ⇄ tools_fundamentals | fundamentals_analyst.py L13–19, L56 |
| Sentiment | **in-node pre-fetch**, no ToolNode, no bind_tools | get_news.func (called directly), jev_screen, fetch_stocktwits_messages, fetch_reddit_posts | none — one pass | sentiment_analyst.py L58–68, L100–102; analyst_execution.py L34–41 |

- **SOURCE FACT**: three analysts let the model decide which tools to call, in a graph-level loop
  bounded only by the model stopping (and the recursion limit, Phase 9); the Sentiment analyst
  fetches a fixed set of sources in Python before a single model call.
- **SOURCE FACT**: tool calls only happen in the analyst stage. No node after the last Msg Clear
  node binds tools (all later prompts append `NO_EXTERNAL_TOOLS` or have no tools).

### 6.2 External dependencies (interface level only)

Named from node code and prompts only; vendor implementations not analyzed. Market data (price
series, indicators, verified snapshot), company news, global news, macro indicators (FRED named
in the News prompt), prediction markets, fundamentals statements, insider transactions, Yahoo
Finance news, StockTwits, Reddit, and the optional Jev post screen. Tool definitions and injected
state: pending T035. Checkpoint/memory/reporting dependencies: pending T039.

## 7. Bull/Bear Debate Mechanics

Sources: `conditional_logic.py` L12–21 (R2), `bull_researcher.py`, `bear_researcher.py`,
`research_manager.py`, `setup.py` L124–133.

### 7.1 Router trace (T023)

| Item | SOURCE FACT | Evidence |
|---|---|---|
| First speaker | Bull Researcher — static edge from the last Msg Clear node | setup.py L124–125 (E06) |
| Speaker labels | Bull writes `current_response = "Bull Analyst: <content>"`; Bear writes `"Bear Analyst: <content>"` (fixed f-string prefixes) | bull_researcher.py L53, L59; bear_researcher.py L55, L61 |
| Next speaker | after Bull: prefix "Bull" → Bear; after Bear: prefix "Bear" is not "Bull" → fall-through → Bull | conditional_logic.py L19–21 |
| Counter | each Bull/Bear turn sets `count = count + 1`, starting from 0 | bull L60, bear L62; propagation.py L45 |
| Max rounds source | `2 * self.max_debate_rounds`; constructor default 1; runtime value pending T036/T037 | conditional_logic.py L7–9, L16 |
| Termination | router checked after every turn: `count >= 2 * max_debate_rounds` → Research Manager | conditional_logic.py L15–18 |
| Research Manager transition | only via R2 termination; RM → Trader is static | setup.py L127–134 |

### 7.2 Reachable routing (resolves §2.4 pending item)

- **Reachable**: Bull → Bear, Bear → Bull, Bull/Bear → Research Manager.
- **Declared but unreachable with the frozen node code**: Bull → Bull and Bear → Bear. The prefixes
  are hard-coded, so `current_response` after Bull always starts with "Bull" and after Bear never
  does. `DEBATE_PATH_MAP` lists all three targets only as a guard against label drift (setup.py
  L26–29 comment, #1088).
- Resulting sequence for `max_debate_rounds = k`: Bull, Bear, Bull, Bear, … — exactly `k` Bull
  turns and `k` Bear turns (`2k` total). The debate **always ends after a Bear turn**, because
  Bull opens and the threshold `2k` is even.

### 7.3 Opponent-response dependency (T025)

- **SOURCE FACT**: each researcher's prompt contains the opponent's latest argument
  (`current_response`, labelled "Last bear argument" / "Last bull argument") and the full shared
  `history`. The first Bull turn gets an explicit "has not spoken yet — open the debate" marker
  instead of an empty string (context.py L33–44).
- **SOURCE FACT**: turn *n+1* reads the `current_response` that turn *n* wrote; the two speakers
  therefore form a strict data dependency chain, not independent branches.
- **DESIGN INFERENCE**: running Bull and Bear concurrently would remove each side's access to the
  other's latest argument within a round, i.e. change the debate semantics rather than
  re-schedule them.
- **STATUS**: upstream behavior = sequential, opponent-aware alternation. Parallel Bull/Bear is
  **not** a semantics-preserving adaptation; any such proposal must be labeled as a semantic
  change (Phase 10).

### 7.4 Research Manager output (synthesis)

Research Manager reads only the combined debate `history` and produces `investment_plan` as a
5-tier recommendation + rationale + strategic actions (§4.8). It is the only node that turns the
debate into a single decision artifact consumed downstream (Trader, Portfolio Manager).

## 8. Risk Debate Mechanics

Sources: `conditional_logic.py` L23–33 (R3), the three `risk_mgmt/*_debator.py` files,
`portfolio_manager.py`, `setup.py` L135–144.

### 8.1 Router trace (T030)

| Item | SOURCE FACT | Evidence |
|---|---|---|
| Initial speaker | Aggressive Analyst — static edge Trader → Aggressive | setup.py L135 (E10) |
| Speaker labels | `latest_speaker` = `"Aggressive"` / `"Conservative"` / `"Neutral"` (exact literals); PM later writes `"Judge"` | aggressive L57, conservative/neutral (same position, see diff in §4.11/§4.12), PM L95 |
| Sequence | "Aggressive" → Conservative; "Conservative" → Neutral; "Neutral" (fall-through) → Aggressive | conditional_logic.py L29–33 |
| Previous-response dependencies | each speaker reads the two *other* speakers' `current_*_response` + shared `history`; opening marker when empty | aggressive L16–21, L44; conservative/neutral L16–21 |
| Counter | each risk turn `count + 1` from 0 | aggressive L63 (same in others); propagation.py L59 |
| Max rounds source | `3 * self.max_risk_discuss_rounds`; constructor default 1; runtime value pending T036/T037 | conditional_logic.py L7–10, L26 |
| Termination | `count >= 3 * max_risk_discuss_rounds` → Portfolio Manager, checked after every turn | conditional_logic.py L25–28 |
| PM transition | only via R3 termination; PM → END static | setup.py L136–144 |

### 8.2 Reachable routing (resolves §2.4 pending item)

- **Reachable**: Aggressive → Conservative, Conservative → Neutral, Neutral → Aggressive, and
  any of the three → Portfolio Manager when the count threshold is met.
- **Declared but unreachable with the frozen node code**: every self route (A→A, C→C, N→N) and
  every backward route (A→N, C→A, N→C). Labels are hard-coded literals, so R3 always selects the
  next speaker in the fixed cycle.
- For `max_risk_discuss_rounds = k`: `3k` turns in the order A, C, N repeated `k` times. The risk
  debate **always ends after a Neutral turn** (Aggressive opens, threshold is a multiple of 3).

### 8.3 Dependency and synthesis (T032)

- **SOURCE FACT**: in round 1, Aggressive sees opening markers for both opponents, Conservative
  sees Aggressive's argument (and a Neutral opening marker), Neutral sees both. From round 2 on,
  every speaker sees the other two's latest arguments. All three also read
  `trader_investment_plan`, the four reports and `portfolio_context`.
- **DESIGN INFERENCE**: the three risk speakers form a dependency chain within each round just
  like Bull/Bear; concurrent execution would change what each speaker can respond to.
- **STATUS**: upstream behavior = sequential 3-way rotation. Collapsing or parallelizing it is a
  semantic change to be labeled in Phase 10.

### 8.4 Research Manager / Trader / Portfolio Manager responsibilities (T032)

| | Research Manager | Trader | Portfolio Manager |
|---|---|---|---|
| Stage input | investment debate `history` | `investment_plan` + `market_report` + portfolio | risk debate `history` + `investment_plan` + `trader_investment_plan` + optional `past_context` + portfolio |
| Output field | `investment_plan` | `trader_investment_plan` | `final_trade_decision` |
| Output scale | 5-tier rating | 3-tier action + price levels + sizing | 5-tier rating + summary + thesis + optional target/horizon |
| LLM | deep | quick | deep |
| Sees analyst reports directly | no | market report only | no |
| Sees holdings | no | yes | yes |

- **SOURCE FACT**: each of the three writes a different state field consumed by a later stage;
  none of them re-reads the four analyst reports except the Trader (market report only).
- **DESIGN INFERENCE**: the three roles form three distinct boundaries — debate verdict →
  executable transaction → risk-reviewed final rating. Merging any two would drop an input set
  or an output scale.
- **STATUS**: source fact recorded; keep/merge decisions deferred to Phase 10.

## 9. Upstream Parallelism Analysis

### 9.1 Analyst stage verdict (T010): **SEQUENTIAL**

| Check | Observation | Evidence |
|---|---|---|
| START edge | exactly one edge, to `specs[0].agent_node` | setup.py L112 |
| Plan ordering | ordered list in caller order, no grouping | analyst_execution.py L59–72 |
| Edges leaving each clear node | exactly one direct edge, to the next analyst or (last) Bull Researcher | setup.py L123–125 |
| Fan-out | none: every node has one static outgoing edge or one conditional edge whose router returns a single node name (`str`); no `Send(` anywhere in `tradingagents/` | setup.py L43–47, L112–144; conditional_logic.py L12–33; repo search |
| Fan-in | nodes with multiple incoming edges exist (analyst ← predecessor + own ToolNode; Bull/Bear/Research Manager ← debate router; risk nodes / Portfolio Manager ← risk router) but none joins concurrent branches, because no fan-out exists | E02–E13 |
| Conditional behavior | R1, R2, R3 each select exactly one target per step | setup.py L43–47; conditional_logic.py L12–33 |

Library-semantics note: that a router returning a single node name yields a single next step is
LangGraph conditional-edge semantics (`langgraph>=0.4.8`), not upstream code; it is stated here as
the interpretation used, not as a runtime observation.

- **SOURCE FACT**: `setup_graph()` chains the selected analysts START → A₁ → (tools loop) → clear₁
  → A₂ → … → clear_N → Bull Researcher, one edge at a time; no parallel branches are declared.
- **DESIGN INFERENCE**: analysts do not appear to read each other's reports (to be confirmed from
  state reads in Phase 4), so their report production *could theoretically be independent*.
- **STATUS**: executes in parallel upstream — **NO**. Parallel analyst execution in
  BrowserTradingAgents would be an intentional adaptation, not upstream v0.5.1 behavior.

### 9.2 Debate and risk stages (topology-level, from T009)

- Research debate: R2 selects one speaker per step → **SEQUENTIAL** alternation at topology level.
  Each turn reads the opponent's previous argument (§7.3) — strict dependency chain.
- Risk debate: R3 selects one speaker per step, order Aggressive → Conservative → Neutral →
  Aggressive … → **SEQUENTIAL** at topology level. Each speaker reads the other two's latest
  arguments (§8.3) — dependency chain within each round.

## 10. BrowserTradingAgents Classification

*Pending — Phase 10 (T041).*

## 11. Intentional Adaptations

*Pending — Phase 10 (T042).*

## 12. Minimum Browser Graph

*Pending — Phase 10 (T044).*

## 13. Findings

### F001-001 (resolved in T012 — CONFIRMED)

```text
Finding ID: F001-001
Feature: 001-tradingagents-reference-analysis
Workload: Static reference analysis of TradingAgents v0.5.1 graph topology (no execution)
Observed: Selected analysts are wired as a single sequential chain
  (START → A1 → [tools loop] → Msg Clear 1 → A2 → … → Msg Clear N → Bull Researcher).
  No fan-out edges and no Send() exist; every router returns exactly one target.
Expected: The initial BrowserTradingAgents roadmap assumed parallel analyst execution as part of
  TradingAgents-style topology.
Reproduction: Check out 35543d0248bf89fcb92b17a15858ad0c0e940687; read
  tradingagents/graph/setup.py L97–125 and tradingagents/graph/analyst_execution.py L59–72;
  grep tradingagents/ for "add_edge|add_conditional_edges|Send(" → only setup.py matches, no Send(.
Evidence: STATIC_CODE_ANALYSIS — setup.py L112, L114–125, L43–47; analyst_execution.py L59–72.
AkariSP contract involved: None
Application workaround possible?: N/A — not a defect. Parallel analysts remain possible as an
  explicitly labeled BrowserTradingAgents adaptation (Principle XI).
Core change required?: NO
Confidence: HIGH
Classification: reference-semantics correction (not a defect)
```

Consistency with constitution Principle XI: the source confirms XI's statement that v0.5.1 analyst
execution is sequential. No constitution amendment candidate arises (T048 rule not triggered).
Phases 5 and 7 also confirm XI's statement that the Bull/Bear debate and the 3-way risk debate
are sequential alternating flows (§7, §8).

### New findings in Phases 3–7

None. No observation in T013–T032 contradicts an expected architecture or involves an AkariSP
contract; the items below are recorded as notes (source facts worth keeping), not findings.

### Notes

- **N-01 Router comments vs code** — see §2.4. Comments at `conditional_logic.py` L17/L27 say
  "3 rounds"; code terminates at `2×` / `3×` the configured rounds. Code is authoritative.
- **N-02 Unreachable declared routes** — `DEBATE_PATH_MAP` / `RISK_ANALYSIS_PATH_MAP`
  (`setup.py` L26–40) declare self and backward routes that the hard-coded speaker labels never
  select (§7.2, §8.2). They are a guard against label drift (#1088), not topology.
- **N-03 Nested debate dicts are replaced wholesale** — no reducer on
  `investment_debate_state` / `risk_debate_state` (§3.1). Bull/Bear and the three risk nodes
  return dicts **without** `judge_decision` (bull L55–61, bear L57–63, aggressive L52–64), so that
  key is absent between turns and reappears only when Research Manager / Portfolio Manager write
  it. Every reader found (`reporting.py`, `cli/`, `trading_graph.py` L362/L372) reads it after
  those writers run, so no reader observes the gap in the normal flow.
- **N-04 `sender` has a writer but no reader** — only the Trader writes it (`trader.py` L98);
  a search of `tradingagents/` and `cli/` finds no reader.
- **N-05 Docstrings vs node code** — `portfolio_manager.py` L3–4 says the decision is produced
  "in a single call"; the node can make a second, free-text call on structured failure (L81–87).
  `TraderProposal` docstring (`schemas.py` L147–152) says the trader reads "the analyst reports";
  `trader_node` reads only `market_report` among the reports (`trader.py` L34). Code is
  authoritative.

## 14. Feature 001 Final Deliverable

*Pending — Phase 11 (T046–T047) and Phase 12 (T049–T058).*
