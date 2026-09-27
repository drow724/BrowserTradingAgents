# Research: Feature 001 — Original TradingAgents Reference Analysis

Canonical source-analysis artifact for Feature 001. Evidence class for every claim:
`STATIC_CODE_ANALYSIS`. All citations refer to the frozen commit below.

Permalink base (`PL`):
`https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/`

Status: COMPLETE (T001–T058; verification record §14.5–14.6). §1–§9 are source facts; §10–§12 are design judgments. Sections marked *Pending* are filled by later phases.

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
| BrowserTradingAgents | drow724/BrowserTradingAgents `main` @ `37b4fad41696c84bc49091eb4a9db36fcf92d564` (execution baseline; re-checked in T056 — progress commits `922be89`, `2af7bcc`) | T001 / T056: `git rev-parse HEAD`, `git log` |
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
(L7–10). At runtime `TradingAgentsGraph` passes `config["max_debate_rounds"]` and
`config["max_risk_discuss_rounds"]` (trading_graph.py L93–96), both default 1 (default_config.py
L115–116).

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

### 2.6 Compile and execution entry point (T038)

Source: `tradingagents/graph/trading_graph.py`.

| Step | SOURCE FACT | Evidence |
|---|---|---|
| Build | `TradingAgentsGraph.__init__` builds LLMs, `ConditionalLogic(max_debate_rounds, max_risk_discuss_rounds)` from config, `GraphSetup`, `Propagator(max_recur_limit)` | L61–106 |
| Compile | `self.workflow = setup_graph(selected_analysts)`; `self.graph = self.workflow.compile()` — no checkpointer by default | L112–113 |
| Entry | `propagate(company_name, trade_date, asset_type="stock", portfolio=None)` validates `trade_date` (canonical `YYYY-MM-DD`, not in the future, L29–40), enters `run_config` + `checkpoint_scope`, calls `_run_graph` | L157–180 |
| Initial state | `create_run_state` → `settle_pending` (pre-graph reflection) → `Propagator.create_initial_state(company, date, asset_type, past_context=memory_log…, instrument_context=resolve_instrument_context(...), portfolio_context=portfolio.render(...) or "")` | L260–278, L304 |
| Invoke | `graph.invoke(graph_input, stream_mode="values", config={"recursion_limit": …})`; debug mode uses `graph.stream(...)` and merges chunks | L305–334 |
| Final state | the dict returned by `invoke` (or merged stream chunks) | L330–334 |
| Decision extraction | `process_signal(final_state["final_trade_decision"])` → `parse_rating(...)`: 5-tier rating string or `"REVIEW"` when none is parseable (no LLM call) | L344, L388–390; agents/rating.py L81–88 |
| Return | `(final_state, signal)` | L344 |
| After graph | `_log_state` (JSON), `record_decision` (memory log), `clear_checkpoint_on_success` | L337–342 |

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
  max_recur_limit}` (constructor default 100, L9–11; runtime value `config["max_recur_limit"]`, default 100 — trading_graph.py L103–105, default_config.py L117) plus
  optional callbacks.

### 3.3 Per-field producer / consumer table (T015; Read/Written finalized in T040)

"Req. min graph" = *Required for minimum browser graph* — decided in T043 from §10–§12.

| Field | Initialized by | Read by | Written by | Purpose | Req. min graph |
|---|---|---|---|---|---|
| `messages` | propagation L31 | Market/News/Fundamentals (`chain.invoke(state["messages"])`), Sentiment (`format_messages`), R1 router (last message `tool_calls`), ToolNode (library), Msg Clear (context.py L222) | Market/News/Fundamentals (L85/63/65 `[result]`), Sentiment (L114), Trader (L96), ToolNode (library), Msg Clear (removes all + anchored placeholder, context.py L223–233) | analyst conversation / tool loop | NO — A7 |
| `company_of_interest` | L32 | Sentiment (L53 ticker), Trader (L26); `get_instrument_context_from_state` fallback (context.py L174–177); `resolve_instrument_context` before the graph | — | ticker | YES — fixture |
| `asset_type` | L33 | News (L23), Bull (L23), Bear (L23) | — | stock vs other wording | NO — stock-only fixture |
| `instrument_context` | L34 | all 12 nodes via `get_instrument_context_from_state` (context.py L162–177; run-start value else ticker-only fallback) | — | ticker identity text | PARTIAL — fixture string, no identity lookup (A3) |
| `trade_date` | L35 | Market (L17), News (L22), Fundamentals (L24), Sentiment (L54); Msg Clear (context.py L226); every ToolNode tool via `InjectedState` (tools.py) | — | "now" for analysis | YES — fixture |
| `sender` | — | **no reader found** in `tradingagents/` or `cli/` (repo search) | Trader (L98, `"Trader"`) | — (see N-04) | NO — no reader (N-04) |
| `market_report` | L62 | Bull, Bear, Trader, Aggressive, Conservative, Neutral | Market (L87) | analyst output | YES |
| `sentiment_report` | L64 | Bull, Bear, Aggressive, Conservative, Neutral | Sentiment (L115) | analyst output | NO — A2 |
| `news_report` | L65 | Bull, Bear, Aggressive, Conservative, Neutral | News (L65) | analyst output | YES |
| `fundamentals_report` | L63 | Bull, Bear, Aggressive, Conservative, Neutral | Fundamentals (L67) | analyst output | NO — A2 |
| `investment_debate_state.history` | L42 | Bull, Bear, Research Manager | Bull, Bear (append), RM (copy) | full debate transcript | YES |
| `investment_debate_state.bull_history` / `bear_history` | L40–41 | Bull reads own `bull_history`; Bear reads own `bear_history`; each copies the other | Bull / Bear (append own), RM (copy) | per-side transcript; not read by RM | NO — no prompt reader (A8) |
| `investment_debate_state.current_response` | L43 | Bull, Bear (as opponent's last argument), R2 router (prefix) | Bull (`"Bull Analyst: …"`), Bear (`"Bear Analyst: …"`), RM (= plan) | last turn + routing key | YES — Bull's argument for Bear |
| `investment_debate_state.count` | L45 | R2 router, Bull, Bear, RM | Bull, Bear (+1), RM (copy) | turn counter | NO — static edges at 1 round (A10) |
| `investment_debate_state.judge_decision` | L44 | after the run: `_log_state` (trading_graph.py L362), reporting / CLI | RM only (Bull/Bear omit the key — N-03) | RM output copy | NO — duplicates `investment_plan` (A8) |
| `investment_plan` | — | Trader (L28), Portfolio Manager (L35) | Research Manager (L72) | research → trader hand-off | YES |
| `trader_investment_plan` | — | Aggressive, Conservative, Neutral (L30), Portfolio Manager (L36) | Trader (L97) | trader proposal | YES |
| `risk_debate_state.history` | L53 | Aggressive, Conservative, Neutral, Portfolio Manager | risk ×3 (append), PM (copy) | full risk transcript | PARTIAL — replaced by one risk review field (A5) |
| `risk_debate_state.{aggressive,conservative,neutral}_history` | L50–52 | each risk node reads its own; PM copies | owning node (append), others/PM (copy) | per-side transcript; not read by PM prompt | NO — A5 |
| `risk_debate_state.latest_speaker` | L54 | R3 router | Aggressive `"Aggressive"`, Conservative `"Conservative"`, Neutral `"Neutral"`, PM `"Judge"` | routing key | NO — A5, A10 |
| `risk_debate_state.current_{aggressive,conservative,neutral}_response` | L55–57 | the two *other* risk nodes each read one | owning node (`"<Name> Analyst: …"`), others/PM (copy) | opponents' last arguments | NO — A5 |
| `risk_debate_state.count` | L59 | R3 router, risk ×3, PM | risk ×3 (+1), PM (copy) | turn counter | NO — A5, A10 |
| `risk_debate_state.judge_decision` | L58 | after the run: `_log_state` (trading_graph.py L372), reporting / CLI | PM only (risk nodes omit the key — N-03) | PM output copy | NO — duplicates final decision (A8) |
| `final_trade_decision` | — | after the run: `process_signal` (trading_graph.py L344), `record_decision` (L293), `_log_state` (L375) | Portfolio Manager (L104) | final output | YES |
| `past_context` | L36 | Portfolio Manager (L38) | — | memory lessons | NO — A14 |
| `portfolio_context` | L37 | Trader, Aggressive, Conservative, Neutral, Portfolio Manager (via `get_portfolio_context_from_state`, `context.py` L194–208) | — | caller holdings | NO — A9 |

Line numbers in "Initialized by" refer to `propagation.py`; in "Read/Written by" to the node's own
file unless stated.

T040 cross-check against §4 records, §5, §6: consistent. Rows finalized with Phase 8–9 evidence:
`messages` (Msg Clear removes all + adds anchored placeholder, §4.5a), `trade_date` (also injected
into every ToolNode tool via `InjectedState`, §6.3), `instrument_context` (built once before the
graph by `resolve_instrument_context`, §4.5a), `judge_decision` fields (read after the run by
`_log_state`, trading_graph.py L362/L372), `final_trade_decision` (read after the run by
`process_signal` L344, `record_decision` L293, `_log_state` L375).

### 3.4 Initial → final state flow (T038)

```text
propagate(company, date, asset_type, portfolio)
  → _validate_trade_date
  → create_run_state: settle_pending (pre-graph reflections)
      → create_initial_state(company, date, asset_type, past_context, instrument_context,
                             portfolio_context)            # §3.2
  → graph.invoke(initial_state, recursion_limit)            # §2
      analysts write *_report → debate writes investment_debate_state → RM writes
      investment_plan → Trader writes trader_investment_plan → risk writes risk_debate_state
      → PM writes final_trade_decision
  → final_state → parse_rating(final_trade_decision) → (final_state, signal)
  → _log_state, record_decision, clear checkpoint
```

## 4. Agent Analysis

Conventions for all records:
- "LLM class" = the constructor argument `setup_graph()` passes (`setup.py` L79–93); the
  quick/deep objects are built in `TradingAgentsGraph.__init__` (§5.1).
- "Can run in parallel in upstream" is answered from the §2.3 edge inventory only: **every node
  is NO** (no fan-out exists, §9.1).
- Structured-output nodes use `invoke_structured_or_freetext` (`structured.py` L59–89): one
  structured call; on exception or `None` result, **one more** plain call (free-text fallback).
  If `bind_structured` returned `None` at creation, every call is plain free text (§5.2).
- Classification fields were decided in T043 from §10–§12 (design judgment, not source fact).

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
Could be parallelized as BrowserTradingAgents adaptation: YES — reads no other analyst's report and starts from its own message thread (§4.1, §4.5a); adopted as A1
Depends on: run context + its own message thread; reads no other analyst's report
Writes to state: messages (append), market_report ("" while tool_calls present, L80–83;
  final content when the model answers without tool calls)
Conditional routing: R1 — tool_calls → tools_market, else → Msg Clear Market (setup.py L43–47)
Report completion condition: len(result.tool_calls) == 0 (L82)
Required for browser dogfood: YES
Reason: independent report producer and the only report the Trader also reads (§4.9); one of the two fan-out branches (§10.3, A1–A4)
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
Could be parallelized as BrowserTradingAgents adaptation: YES — input-independent like the other analysts (§4.2)
Depends on: run context + external fetchers; reads no other analyst's report
Writes to state: messages (append), sentiment_report
Conditional routing: none — direct edge to Msg Clear Sentiment (E04)
Structured/free-text: structured SentimentReport rendered by render_sentiment_report;
  free-text fallback returns response.content
Required for browser dogfood: NO
Reason: excluded initially (§10.1): its content is three live external feeds (Principle IX); upstream consumers already render a missing sentiment report as an absence marker; its no-tool data-in-prompt pattern is reused for fixtures (A4)
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
Could be parallelized as BrowserTradingAgents adaptation: YES — reads no other analyst's report (§4.3); adopted as A1
Depends on: run context + own message thread; reads no other analyst's report
Writes to state: messages (append), news_report ("" during tool turns, L58–61)
Conditional routing: R1 — tools_news or Msg Clear News
Required for browser dogfood: YES
Reason: second independent producer with a different domain from Market; makes fan-out/fan-in real (§10.3, A1, A2)
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
Could be parallelized as BrowserTradingAgents adaptation: YES — input-independent (§4.4)
Depends on: run context + own message thread; reads no other analyst's report
Writes to state: messages (append), fundamentals_report ("" during tool turns, L60–63)
Conditional routing: R1 — tools_fundamentals or Msg Clear Fundamentals
Required for browser dogfood: NO
Reason: excluded initially (§10.1): vendor-data heavy, not needed for role separation; upstream-supported subset; later fan-out branch candidate
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
Injected state: trade_date via InjectedState into every tool (§6.3)
Required for browser dogfood: NO
Reason: tool loop excluded initially (A4): depends on live vendors and on browser tool-calling support not yet evidenced (Principles VI, IX); analysts get fixture data in the prompt instead
```

### 4.5a Message-clear node (T034)

```text
Node: Msg Clear {Market,Sentiment,News,Fundamentals} — context.py L211–235, create_msg_delete();
  registered setup.py L99
Purpose: reset the message thread between analysts and anchor the next one
Input state: messages (L222), instrument_context via get_instrument_context_from_state (L225),
  trade_date (L226)
Output state: {"messages": [RemoveMessage(id=m.id) for every current message] + [HumanMessage(
  "Proceed with your assigned analysis for this workflow. <instrument_context> The analysis
  date is <trade_date>.")]} (L223–233)
Effect on MessagesState: with the add_messages reducer (library semantics) every existing
  message is removed and exactly one anchored HumanMessage remains
LLM calls: none
LLM class: none
Tools: none
Can run in parallel in upstream: NO
Depends on: the preceding analyst finishing (R1 → clear) or direct edge (Sentiment)
Writes to state: messages only; the finished analyst's report field is untouched
Conditional routing: none — direct edge to next analyst or Bull Researcher (E05/E06)
Required for browser dogfood: NO
Reason: it isolates a shared messages channel between sequential analysts; the minimum graph has no shared messages channel (A7), so isolation is structural
```

- **SOURCE FACT**: the first analyst starts from `messages=[("human", company_name)]`
  (propagation.py L31); every later analyst starts from the single anchored placeholder. No
  analyst sees a previous analyst's tool calls, tool results or report through `messages`.
  After the last clear node, `messages` holds only the placeholder; downstream nodes do not read
  `messages` (§3.3), and only the Trader appends to it again.
- **SOURCE FACT (context anchoring)**: every node gets the instrument text through
  `get_instrument_context_from_state` (context.py L162–177): the run-start
  `instrument_context` if non-empty, otherwise a ticker-only string built with no network call.
  The run-start value is built once by `TradingAgentsGraph.resolve_instrument_context`
  (trading_graph.py L117–128) from a cached, fail-open yfinance profile lookup
  (`resolve_instrument_identity`, context.py L57–96) — this is the only identity lookup, and it
  happens before the graph starts.
- **SOURCE FACT**: `get_language_instruction()` (context.py L17–30) reads the process-global
  config (`dataflows.config.get_config`) and is appended to every agent prompt; empty for English.

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
Could be parallelized as BrowserTradingAgents adaptation: NO — Bear consumes Bull's argument in the same round (§7.3); parallel Bull/Bear changes the debate semantics
Depends on: all four reports (or absence markers), opponent's previous argument, history
Writes to state: history += "\nBull Analyst: …"; bull_history += same; bear_history copied;
  current_response = "Bull Analyst: <content>" (L53, L59); count += 1 (L60);
  judge_decision key omitted (N-03)
Conditional routing: R2 (E07)
Required for browser dogfood: YES
Reason: adversarial reasoning with opponent-aware dependency is core (§10.1); 1 round = upstream default
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
Could be parallelized as BrowserTradingAgents adaptation: NO — reads Bull's latest argument (§7.3)
Depends on: four reports, the bull's previous argument, history
Writes to state: history += "\nBear Analyst: …"; bear_history += same; bull_history copied;
  current_response = "Bear Analyst: <content>" (L55, L61); count += 1 (L62);
  judge_decision key omitted (N-03)
Conditional routing: R2 (E08)
Required for browser dogfood: YES
Reason: as Bull; supplies the dependent half of the debate
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
Could be parallelized as BrowserTradingAgents adaptation: NO — needs the complete debate history (§4.8)
Depends on: complete debate history (runs only after R2 termination)
Writes to state: investment_plan; investment_debate_state (judge_decision, current_response)
Conditional routing: none — direct edge to Trader (E09)
Boundary to Trader: RM decides direction/conviction on a 5-tier scale from the debate only;
  it does not see holdings (ResearchPlan.strategic_actions description, schemas.py L119–125)
Required for browser dogfood: YES
Reason: sole debate → investment_plan synthesis boundary; the Trader never reads the debate (§8.4, §10.3)
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
Could be parallelized as BrowserTradingAgents adaptation: NO — needs investment_plan (§4.9)
Depends on: investment_plan (Research Manager), market_report, portfolio_context
Writes to state: messages (append), trader_investment_plan, sender
Conditional routing: none — direct edge to Aggressive Analyst (E10)
Required for browser dogfood: YES
Reason: distinct boundary: 5-tier research rating → 3-tier executable action grounded in the market report (§8.4, §10.3); smaller schema (A11)
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
Could be parallelized as BrowserTradingAgents adaptation: NO — reads the other two risk analysts' latest arguments (§8.3)
Depends on: trader_investment_plan, four reports, portfolio_context, the other two analysts'
  latest arguments, history
Writes to state: history/aggressive_history += "\nAggressive Analyst: …";
  latest_speaker = "Aggressive" (L57); current_aggressive_response = argument (L58);
  others copied; count += 1 (L63); judge_decision key omitted (N-03)
Conditional routing: R3 (E11)
Required for browser dogfood: PARTIAL
Reason: role collapsed into the single Risk Reviewer (A5): second-pass critique kept, high-reward stance and 3-way debate dropped
```

### 4.11 Conservative Risk Analyst (T028)

```text
Node: Conservative Analyst — tradingagents/agents/risk_mgmt/conservative_debator.py L10–70
Purpose: argue for the low-risk adjustment of the trader's decision
Input state: same shape as Aggressive, with opponents = current_aggressive_response and
  current_neutral_response (L16–21); trader_investment_plan; four reports; portfolio_context
Opponent dependency: YES — both other analysts' latest responses + history
Output state: {"risk_debate_state": {...}} (conservative_debator.py L52–68)
LLM calls: 1 plain llm.invoke per turn (conservative_debator.py L48)
LLM class: quick (setup.py L92)
Tools: none
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: NO — reads the other two risk analysts' latest arguments (§8.3)
Depends on: as Aggressive
Writes to state: history/conservative_history += "\nConservative Analyst: …";
  latest_speaker = "Conservative"; current_conservative_response = argument; count += 1;
  judge_decision key omitted (N-03)
Conditional routing: R3 (E12)
Required for browser dogfood: PARTIAL
Reason: role collapsed into the single Risk Reviewer (A5): low-risk stance dropped
```

(Source diff vs Aggressive differs only in prompt text, opponent fields, owned fields and label.)

### 4.12 Neutral Risk Analyst (T029)

```text
Node: Neutral Analyst — tradingagents/agents/risk_mgmt/neutral_debator.py L10–68
Purpose: argue for a balanced adjustment of the trader's decision
Input state: same shape, opponents = current_aggressive_response and
  current_conservative_response (L16–21); trader_investment_plan; four reports; portfolio_context
Opponent dependency: YES — both other analysts' latest responses + history
Output state: {"risk_debate_state": {...}} (neutral_debator.py L52–66)
LLM calls: 1 plain llm.invoke per turn (neutral_debator.py L48)
LLM class: quick (setup.py L91)
Tools: none
Can run in parallel in upstream: NO
Could be parallelized as BrowserTradingAgents adaptation: NO — reads the other two risk analysts' latest arguments (§8.3)
Depends on: as Aggressive
Writes to state: history/neutral_history += "\nNeutral Analyst: …";
  latest_speaker = "Neutral"; current_neutral_response = argument; count += 1;
  judge_decision key omitted (N-03)
Conditional routing: R3 (E13)
Required for browser dogfood: PARTIAL
Reason: role collapsed into the single Risk Reviewer (A5): balanced stance dropped
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
Could be parallelized as BrowserTradingAgents adaptation: NO — needs the finished risk stage, investment_plan and trader plan (§4.13)
Depends on: risk history, investment_plan, trader_investment_plan, optional past/portfolio
Writes to state: final_trade_decision; risk_debate_state.{judge_decision, latest_speaker}
Conditional routing: none — direct edge to END (E14)
Required for browser dogfood: YES
Reason: final risk-adjusted synthesis boundary, kept as Final Decision without past/portfolio context (A6, A9)
```

## 5. LLM Invocation Map

### 5.1 Model construction and injection (T036 / T037)

| Step | SOURCE FACT | Evidence |
|---|---|---|
| Config | `llm_provider="openai"`, `deep_think_llm="gpt-6-sol"`, `quick_think_llm="gpt-6-luna"` by default; env overrides via `TRADINGAGENTS_*` | default_config.py L10–29, L81–83 |
| Shared kwargs | `build_llm_kwargs(config)`: provider thinking/effort knob, `temperature`, `llm_max_retries` (SDK retry budget) — forwarded only when set; callbacks added if given | llm_clients/factory.py L90–120; trading_graph.py L70–73 |
| Creation | two clients from one provider: `create_llm_client(provider, model=deep_think_llm, …)` and `(…, model=quick_think_llm, …)`; `.get_llm()` returns the chat model objects | trading_graph.py L75–89 |
| Injection | `GraphSetup(quick_thinking_llm, deep_thinking_llm, conditional_logic)` | trading_graph.py L97–101 |
| Per node | deep → Research Manager, Portfolio Manager; quick → every analyst, Bull, Bear, Trader, three risk analysts | setup.py L79–93 |
| Outside the graph | `Reflector(quick_thinking_llm)` | trading_graph.py L106 |

Provider factory internals (`llm_clients/`) are not analyzed beyond this interface.

### 5.2 Structured output and fallback (T033)

Source: `tradingagents/agents/structured.py`
([PL](https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/tradingagents/agents/structured.py#L42-L89)).

- `bind_structured(llm, schema, name)` (L42–56) — called **once at node creation**:
  `llm.with_structured_output(schema)`; on `NotImplementedError` / `AttributeError` returns `None`
  (warning logged) and the node uses free text for every call.
- `invoke_structured_or_freetext(...)` (L59–89) — per node execution:

| Path | Condition | Logical LLM calls |
|---|---|---|
| Structured success | `structured_llm` not None, `invoke` returns a parsed object, `render(result)` succeeds | **1** |
| Structured failure → fallback | any `Exception` from `structured_llm.invoke`, a `None` result (L76–80), or an exception inside `render` (it runs inside the same `try`, L81) | **2** (structured + `plain_llm.invoke`) |
| Binding unsupported | `structured_llm is None` | **1** (plain only) |
| Fallback also fails | exception from `plain_llm.invoke` (L88) is not caught | error propagates out of the node |

Users: Sentiment Analyst, Research Manager, Trader, Portfolio Manager (the module docstring
names only the latter three — N-07).

### 5.3 Invocation map per logical node

"Turn" = one execution of the node. `k` = `max_debate_rounds`, `r` = `max_risk_discuss_rounds`
(both default 1, default_config.py L115–116).

| Node | LLM | Mechanism | Calls per turn | Turns per run | Evidence |
|---|---|---|---|---|---|
| Market / News / Fundamentals | quick | `prompt \| llm.bind_tools(TOOLS)` | 1 per visit; `N` tool rounds ⇒ `N+1` visits | 1 logical analyst, re-entered by the tool loop | §4.1–4.4 |
| Sentiment | quick | structured `SentimentReport` / free text | 1 or 2 | 1 | §4.2, §5.2 |
| Bull / Bear | quick | plain `llm.invoke(prompt)` | 1 | `k` each | §4.6–4.7 |
| Research Manager | deep | structured `ResearchPlan` / free text | 1 or 2 | 1 | §4.8 |
| Trader | quick | structured `TraderProposal` / free text | 1 or 2 | 1 | §4.9 |
| Aggressive / Conservative / Neutral | quick | plain `llm.invoke(prompt)` | 1 | `r` each | §4.10–4.12 |
| Portfolio Manager | deep | structured `PortfolioDecision` / free text | 1 or 2 | 1 | §4.13 |
| Reflector (before graph) | quick | plain `invoke` | 1 per settled pending decision of the same ticker | 0…P | §6.4 |

### 5.4 Maximum logical-node invocation patterns

- **SOURCE FACT — tool loop**: an analyst with tools makes `N+1` LLM calls for `N` tool-call
  rounds (R1 + E03). No per-analyst cap exists in the node or router; the loop ends when the model
  answers without tool calls.
- **Derived bound (source values + LangGraph semantics)**: the graph runs under
  `recursion_limit = max_recur_limit` (default 100; default_config.py L117 → trading_graph.py
  L103–105 → propagation.py L75). The default graph without tool rounds takes 16 node steps
  (4 analysts + 4 clear nodes + 2 debate + RM + Trader + 3 risk + PM, at `k = r = 1`). Each tool
  round adds 2 steps (ToolNode + analyst re-entry), so at most ⌊(100 − 16) / 2⌋ = 42 tool rounds
  fit in one run across all tool-using analysts before LangGraph's recursion limit aborts it.
  That the limit counts node steps is library semantics, stated as interpretation.
- **SOURCE FACT — structured fallback**: +1 call on any structured failure; never more than one
  retry at this layer (§5.2).
- **Combinations**: tool loop and structured fallback never combine in one node — tool-using
  analysts do not use structured output, and structured nodes bind no tools.
- **Hidden layer**: each logical call may be retried by the provider SDK (`llm_max_retries`;
  `None` = provider default, which the config comment calls "usually 2", default_config.py
  L99–102). These are transport retries, not additional logical invocations; not analyzed further.
- **Per-run logical total** (default 4 analysts): `4 + ΣN + 2k + 1 + 1 + 3r + 1 + F + P`, where
  `ΣN` = total tool rounds, `F ≤ 4` structured fallbacks (Sentiment, RM, Trader, PM),
  `P` = pre-graph reflections. At `k = r = 1`, `ΣN = 0`, `F = 0`, `P = 0`: **12 calls**.
- **SOURCE FACT — concurrency**: because every stage is sequential (§9), the upstream graph has at
  most **one logical LLM call in flight** at a time.
- **DESIGN INFERENCE**: a BrowserTradingAgents workload model cannot assume "one agent = one
  inference": a tool-using agent is `N+1`, a structured agent is 1–2, and the pre-graph reflection
  adds calls outside the graph.
- **STATUS**: application workload fact; no AkariSP change implied.

## 6. Tool/Data Invocation Map

### 6.1 Analyst tool/data paths (T020)

| Analyst | Mechanism | Tools / sources | Loop | Evidence |
|---|---|---|---|---|
| Market | ToolNode loop (`tools_market`) | get_stock_data, get_indicators, get_verified_market_snapshot | analyst ⇄ tools_market until no tool_calls | market_analyst.py L7–11, L76; setup.py L43–47, L115–119 |
| News | ToolNode loop (`tools_news`) | get_news, get_global_news, get_macro_indicators, get_prediction_markets | analyst ⇄ tools_news | news_analyst.py L12–17, L55 |
| Fundamentals | ToolNode loop (`tools_fundamentals`) | get_fundamentals, get_balance_sheet, get_cashflow, get_income_statement, get_insider_transactions | analyst ⇄ tools_fundamentals | fundamentals_analyst.py L13–19, L56 |
| Sentiment | **in-node pre-fetch**, no ToolNode, no bind_tools | get_news.func (called directly), jev_screen, fetch_stocktwits_messages, fetch_reddit_posts | none — one pass | sentiment_analyst.py L58–68, L100–102; analyst_execution.py L34–41 |

- **SOURCE FACT**: three analysts let the model decide which tools to call, in a graph-level loop
  bounded only by the model stopping (and the recursion limit, §5.4); the Sentiment analyst
  fetches a fixed set of sources in Python before a single model call.
- **SOURCE FACT**: tool calls only happen in the analyst stage. No node after the last Msg Clear
  node binds tools (all later prompts append `NO_EXTERNAL_TOOLS` or have no tools).

### 6.2 External dependencies (interface level only)

Named from node code and prompts only; vendor implementations not analyzed. Market data (price
series, indicators, verified snapshot), company news, global news, macro indicators (FRED named
in the News prompt), prediction markets, fundamentals statements, insider transactions, Yahoo
Finance news, StockTwits, Reddit, and the optional Jev post screen. Data calls go through
`route_to_vendor(...)` (vendor chain from `data_vendors` / `tool_vendors`, default_config.py
L138–149: yfinance by default, FRED for macro, Polymarket for prediction markets); vendor routing
internals are not analyzed.

### 6.3 Tool definitions and state injection (T035)

Source: `tradingagents/agents/tools.py`
([PL](https://github.com/TauricResearch/TradingAgents/blob/35543d0248bf89fcb92b17a15858ad0c0e940687/tradingagents/agents/tools.py)).

- **SOURCE FACT**: all 12 analyst tools are `@tool` functions with a parameter
  `trade_date: Annotated[str, InjectedState("trade_date")] = ""` (L22, 44, 77, 93, 112, 132, 152,
  172, 193, 215, 240, 268). The model does not supply it; LangGraph's ToolNode fills it from graph
  state (library semantics for `InjectedState`).
- **SOURCE FACT**: dated arguments are clamped with `as_of(requested, trade_date)` /
  `as_of_window(...)` (`dataflows/date_window.py` L72–95): the model's date is used only if it is
  not later than `trade_date`; otherwise `trade_date` is used. An empty `trade_date` passes the
  request through. `get_insider_transactions` and `get_prediction_markets` pass `trade_date`
  directly (L225, L284).
- **SOURCE FACT — Sentiment**: calls `get_news.func(ticker, start, end)` directly (sentiment
  L61), bypassing ToolNode, so `trade_date` stays `""` and no clamp applies; the window it passes
  already ends at `trade_date` (L54–55), so the result is equivalent (N-08).
- **Loop semantics**: see §6.1 and §5.4 — model-driven, ends when the analyst replies without
  tool calls.

### 6.4 Checkpoint, memory, reporting around the graph (T039)

| Component | What it does | When | Graph-semantic? | Evidence |
|---|---|---|---|---|
| Checkpointer (`SqliteSaver`) | recompiles the graph with a per-ticker SQLite saver; resumes a thread with input `None` | only if `checkpoint_enabled` (default **False**) | **No** — infrastructure (crash resume). Default compile has no checkpointer (L113) | default_config.py L108–110; trading_graph.py L182–235; checkpointer.py L42–47 |
| Memory log — settlement + reflection | before the run, settles same-ticker pending decisions, fetching returns and calling `Reflector` (quick LLM) per entry | every `create_run_state` | **No** for topology; adds pre-graph LLM calls | trading_graph.py L260–289; settlement.py L84–120; reflection.py L61 |
| Memory log — `past_context` | injects lessons into initial state; read only by Portfolio Manager when non-empty | every run | Input only (optional; `""` is valid) | trading_graph.py L273–275; portfolio_manager.py L38–43 |
| Memory log — `record_decision` | stores `final_trade_decision` after the run | after the graph | **No** | trading_graph.py L291–299, L339 |
| State JSON log | `_log_state` writes selected final-state fields to `results_dir` | after the graph | **No** — reporting | trading_graph.py L337, L346–386 |
| Report tree | `save_reports` → `write_report_tree` | only when called | **No** | trading_graph.py L245–258 |
| Global config | `set_config(self.config)`; `run_config(...)` scope around the run | construction / run | **No** for topology; affects prompts (language) and data vendors | trading_graph.py L65, L175 |

- **SOURCE FACT**: none of these components adds a node or edge; the topology in §2 is the same
  with or without them.
- **DESIGN INFERENCE**: all of them are candidates for exclusion from an initial browser
  workload; `past_context` / `portfolio_context` are optional inputs whose empty values the nodes
  already handle.
- **STATUS**: exclusion decision deferred to Phase 10.

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
| Max rounds source | `2 * self.max_debate_rounds`; constructor default 1; runtime `config["max_debate_rounds"]` default 1 | conditional_logic.py L7–9, L16; trading_graph.py L93–96; default_config.py L115 |
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
| Max rounds source | `3 * self.max_risk_discuss_rounds`; constructor default 1; runtime `config["max_risk_discuss_rounds"]` default 1 | conditional_logic.py L7–10, L26; trading_graph.py L93–96; default_config.py L116 |
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

From this section on, statements are **design judgments** for the initial BrowserTradingAgents
workload, built on the source facts in §2–§9. Every row cites the section it rests on.
Adaptation IDs (A1…) refer to §11.

Criteria (spec + this phase's instruction): keep role separation, explicit state transitions,
multiple model invocations, independent analysis, adversarial reasoning, synthesis, risk review
and final decision; do not optimize for investment quality, market-data quality, provider
ecosystem, Python infrastructure, persistence or backtesting (Principles I, II, VIII, IX).

Two source facts shape the analyst decisions:

- **SOURCE FACT**: the analyst set is a configuration input (`selected_analysts`, any non-empty
  subset, §2.1), and every downstream consumer renders a missing report as an explicit absence
  marker via `report_or_absent` (context.py L180–191; §4.6–4.12). A two-analyst run is therefore an
  **upstream-supported configuration**, not a topology change.
- **SOURCE FACT**: analysts read no other analyst's report and start from an isolated message
  thread (§4.1–4.4, §4.5a).

### 10.1 Classification table (T041)

| Component | Classification | Upstream role | Why | Semantic cost | Dogfood value |
|---|---|---|---|---|---|
| Market Analyst | **PRESERVE** (role) — inputs via fixture (A4) | technical report; the only report the Trader also reads (§4.1, §4.9) | independent report producer with a second downstream consumer (Trader) beyond the debate | none for the role; tool-driven data gathering replaced by fixture input (A4) | one of two independent concurrent requests (A1) |
| News Analyst | **PRESERVE** (role) — inputs via fixture (A4) | news/macro report (§4.3) | second independent producer with a different domain/prompt from Market | as Market | second concurrent request; makes fan-in real (A1) |
| Sentiment Analyst | **EXCLUDE** (initial) | report from three pre-fetched live social/news feeds (§4.2) | its content *is* live external feeds (Principle IX); dropping it is an upstream-supported subset | no sentiment perspective in the debate; consumers get the upstream absence marker | low now; re-add as a 3rd fan-out branch later |
| Fundamentals Analyst | **EXCLUDE** (initial) | financial-statements report (§4.4) | vendor-data heavy; not needed to show role separation; upstream-supported subset | no fundamentals perspective | low now; later fan-out branch |
| Bull Researcher | **PRESERVE** | pro case, rebuts bear (§4.6) | adversarial reasoning is a core semantic | — | sequential dependent inference |
| Bear Researcher | **PRESERVE** | con case, reads bull's last argument (§4.7) | as Bull | — | dependent on Bull's output |
| Alternating opponent-aware debate | **PRESERVE** at 1 round | R2 alternation, `2k` turns, ends on Bear (§7) | the data dependency *is* the semantics (§7.3); `k = 1` equals the upstream default (default_config.py L115) | none at `k = 1`; multi-round debate deferred | Bull → Bear dependency chain |
| Research Manager | **PRESERVE** | debate history → 5-tier `investment_plan` (§4.8, §7.4) | sole synthesis boundary; Trader never reads the debate (§8.4) | — | separate synthesis request; structured/fallback surface |
| Trader | **PRESERVE** (smaller schema) | plan + market report → Buy/Hold/Sell with levels (§4.9) | distinct input set and output scale from RM (§8.4) | smaller proposal schema (A11) | another dependent stage; structured/fallback surface |
| Aggressive Risk Analyst | **SIMPLIFY** → Risk Reviewer (A5) | high-reward stance (§4.10) | second-pass critique is kept by one reviewer; adversarial reasoning already exercised by Bull/Bear | stance lost | shape duplicates Bull/Bear; low extra value |
| Conservative Risk Analyst | **SIMPLIFY** → Risk Reviewer (A5) | low-risk stance (§4.11) | as above | stance lost | as above |
| Neutral Risk Analyst | **SIMPLIFY** → Risk Reviewer (A5) | balanced stance (§4.12) | as above | stance lost | as above |
| Portfolio Manager | **PRESERVE** boundary, **SIMPLIFY** name/inputs → Final Decision (A6, A9) | risk debate + plan + trader plan → 5-tier final (§4.13) | the final risk-adjusted synthesis boundary is core | past/portfolio context not used (A9) | final dependent request; structured/fallback surface |
| Explicit graph state | **PRESERVE** | `AgentState` channels (§3) | explicit state transitions are core | — | makes node inputs/outputs inspectable |
| `messages` channel | **EXCLUDE** (A7) | analyst tool-loop thread; post-analyst nodes do not read it (§3.3) | no tool loop (A4); a shared thread cannot serve concurrent analysts | none downstream (no reader after the analysts except Trader's append) | — |
| Analyst reports | **SIMPLIFY** (2 of 4) | four report fields (§3.3) | only Market/News kept | fewer debate inputs | — |
| Investment debate state | **SIMPLIFY** (A8) | `history`, per-side histories, `current_response`, `count`, `judge_decision` (§3.1) | RM reads only `history`; Bear reads `current_response`; per-side histories and `judge_decision` have no prompt reader (§3.3) | none at `k = 1` | — |
| Investment plan | **PRESERVE** | RM → Trader/PM (§3.3) | hand-off boundary | — | — |
| Trader investment plan | **PRESERVE** | Trader → risk/PM (§3.3) | hand-off boundary | — | — |
| Risk debate state | **SIMPLIFY** → single risk review field (A5, A8) | 3-way histories, labels, counter (§3.1) | one reviewer needs no routing state | multi-stance history lost | — |
| Final decision | **PRESERVE** | `final_trade_decision` (§4.13) | end result of the run | — | — |
| Structured output + one free-text fallback | **SIMPLIFY** (A11) | 4 nodes, 1–2 calls (§5.2) | keep the pattern with smaller schemas; whether a browser provider supports structured output needs browser evidence (Principle VI) | smaller schemas | fallback invocation surface |
| Router-based debate/risk loops (R2, R3) | **SIMPLIFY** → static edges (A10) | count/label routing (§2.4) | at `k = 1` R2 reduces to Bull → Bear → RM; single reviewer needs no R3 | multi-round configurability deferred | — |
| Quick/deep model split | **SIMPLIFY** (A12) | two clients, deep for RM/PM (§5.1) | a browser runtime may expose one model; keep "deep role" as metadata | possible quality difference, not evaluated (Principle VIII) | resource reuse across all nodes |
| Analyst ToolNode loop | **EXCLUDE** (initial) (A4) | model-driven `N+1` loop (§6.1, §5.4) | depends on live vendors and on browser tool-calling support not yet evidenced (Principles VI, IX) | no model-chosen tool calls | deferred candidate for repeated-request dogfood |
| Sentiment pre-fetch pattern | **SIMPLIFY** → fixture-in-prompt pattern (A4) | data fetched in Python, placed in prompt (§6.1) | upstream already has a no-tool, data-in-prompt analyst; fixtures fit it directly | sources become fixtures | deterministic inputs (Principle II) |
| Real external data vendors | **EXCLUDE** (A3) | `route_to_vendor`, yfinance/FRED/Polymarket, social feeds (§6.2) | Principles II, IX | no real data | — |
| Instrument identity lookup | **SIMPLIFY** → fixture-provided `instrument_context` (A3) | yfinance profile before the graph (§4.5a) | network call; fixture string suffices | — | — |
| Checkpoint | **EXCLUDE** (A13) | optional SQLite resume (§6.4) | infrastructure, off by default | — | — |
| Past context / reflection | **EXCLUDE** (A14) | pre-graph settlement + Reflector LLM calls; PM lessons (§6.4) | persistence + extra pre-graph calls; PM handles empty `past_context` | no lessons in final decision | — |
| Reporting / log tree | **EXCLUDE** (A13) | JSON log, report tree (§6.4) | post-graph infrastructure | — | — |
| Persistent decision memory | **EXCLUDE** (A14) | `record_decision` memory log (§6.4) | persistence | — | — |
| Portfolio context | **EXCLUDE** (A9) | caller holdings for Trader/risk/PM (§3.3) | upstream renders an explicit "not provided" notice when empty (context.py L194–208) | no holdings-aware sizing | — |
| `sender` | **EXCLUDE** | written by Trader, no reader (N-04) | dead field | none | — |

### 10.2 Summary lists

- **PRESERVE**: Market Analyst (role), News Analyst (role), Bull Researcher, Bear Researcher,
  opponent-aware debate (1 round), Research Manager, Trader, Portfolio Manager boundary (as Final
  Decision), explicit graph state, investment plan, trader investment plan, final decision.
- **SIMPLIFY**: 4 → 2 analysts, debate state, risk debate state → single review, 3-way risk
  debate → Risk Reviewer (Aggressive/Conservative/Neutral), structured schemas, routers → static
  edges, quick/deep split, Sentiment pre-fetch → fixture-in-prompt, instrument identity → fixture,
  PM name/inputs → Final Decision.
- **EXCLUDE**: Sentiment Analyst, Fundamentals Analyst, `messages` channel, analyst ToolNode loop,
  real external data vendors, checkpoint, past context/reflection, reporting/log tree, persistent
  decision memory, portfolio context, `sender`.

### 10.3 Stage decisions

**Analyst selection — Market + News.** Both are independent report producers (no cross-report
reads), have distinct domains/prompts, and Market has a second consumer (Trader). Two branches are
the minimum that makes fan-out and fan-in real. Dropping Sentiment/Fundamentals keeps the
TradingAgents core (independent analysis → adversarial debate → synthesis) because consumers
already handle absent reports. STATUS: intentional simplification (A2) via an upstream-supported
subset — not a reproduction of the default 4-analyst graph.

**Analyst parallelization.**

```text
Upstream behavior: SEQUENTIAL (§9.1)
Dependency independence: YES — no analyst reads another's report or message thread
  (§4.1–4.5a); each depends only on run context and its own inputs
Browser adaptation: PARALLEL (Market ‖ News → fan-in before Bull)
Reason: the only stage where concurrency does not change any node's inputs; the upstream
  message-clear isolation already gives each analyst an independent context
Dogfood value: two independent concurrent requests, queueing when the runtime's concurrency limit
  is below 2, and a fan-in join
Semantic cost: none on report content; the shared messages channel cannot be used concurrently,
  so each analyst builds its prompt from state + fixture (A7)
STATUS: intentional BrowserTradingAgents adaptation for concurrency/backpressure dogfooding
  (A1) — not upstream TradingAgents topology replication
```

**Bull/Bear — keep, sequential, one round.** `Bull → Bear → Research Manager` equals the upstream
default (`max_debate_rounds = 1`, §7.2). Parallel Bull/Bear is rejected: Bear reads Bull's
argument (§7.3).

**Research Manager — keep.** Removing it would (a) erase the only debate → plan synthesis step
(§7.4), and (b) force the Trader to read the debate history, changing the Trader's input set and
merging two boundaries with different output scales (§8.4). It also keeps a separate synthesis
request with a structured/fallback surface in the workload.

**Trader — keep (PRESERVE, smaller schema).** Not a duplicate: RM outputs a 5-tier research
rating from the debate; Trader outputs a 3-tier executable action with price levels grounded in
the market report (§8.4). Merge rejected; its semantic cost would be losing either the
debate/execution separation or the market-report grounding.

**Risk — option B, single Risk Reviewer.** Option A (full 3-way) repeats the Bull/Bear
dependent-chain shape with three more sequential calls; option C (two-sided) is the same shape
as Bull/Bear. Option B is the minimum that keeps a second-pass critique of the trader proposal,
an additional LLM stage, a state transition and a separate final synthesis. STATUS: intentional
simplification (A5); cost = loss of multi-stance risk debate.

**Final decision — keep the boundary, name it Final Decision.** The node keeps the upstream PM
semantics (reads risk review + investment plan + trader plan; outputs a 5-tier rating with
summary/thesis) without past/portfolio context. Naming it "Final Decision" avoids implying
portfolio awareness it will not have (A6).

## 11. Intentional Adaptations

Every row is a BrowserTradingAgents proposal (DESIGN INFERENCE), not upstream behavior.
Status for all: **proposed for the initial browser workload; not implemented** (Feature 001 is
research-only).

| ID | Adaptation | Upstream behavior (SOURCE FACT) | BrowserTradingAgents proposal | Why | Semantic cost | AkariSP dogfood value |
|---|---|---|---|---|---|---|
| A1 | Analyst sequential → parallel fan-out | chain START → A₁ → clear → A₂ … (§9.1) | Market ‖ News, join before Bull | analysts are input-independent (§10.3) | none on reports; ordering of report writes not meaningful | concurrent inference, queueing, fan-in |
| A2 | 4 analysts → 2 | default `market, social, news, fundamentals` (§2.1) | `market, news` | minimum for real fan-out; upstream-supported subset | no sentiment/fundamentals input to debate | — |
| A3 | Real external data → deterministic fixtures | vendor tools, social feeds, yfinance identity (§6.2, §4.5a) | committed small fixtures incl. instrument context | Principles II, IX | no real data (quality not evaluated, VIII) | isolates LLM lifecycle from network failures |
| A4 | ToolNode loops → fixture-in-prompt direct input | model-driven `N+1` tool loop (§5.4) | each analyst: one request with fixture data in the prompt (upstream Sentiment pattern) | removes vendor + unverified browser tool-calling dependency | no model-chosen tool calls; fewer requests per analyst | deterministic request count; tool loop is a later candidate for repeated requests |
| A5 | 3-way risk debate → single Risk Reviewer | A → C → N rotation, `3r` turns (§8) | one reviewer critiquing the trader proposal | minimum second-pass critique (§10.3) | multi-stance risk debate lost | one more sequential dependent request |
| A6 | Portfolio Manager → "Final Decision" naming | PM with portfolio/past context (§4.13) | same boundary, no portfolio claims | name matches inputs actually used | naming only | — |
| A7 | Shared `messages` channel removed | analysts use `messages`; clear nodes reset it (§4.5a) | per-node prompt built from state; no clear nodes | required for A1; no downstream reader | none downstream | enables concurrent analysts |
| A8 | Reduced graph state | full `AgentState` (§3.1) | run context, 2 reports, debate `history` + last argument, `investment_plan`, `trader_investment_plan`, risk review, final decision | only fields with a reader in the minimum graph | per-side histories, counters, labels dropped | smaller state per transition |
| A9 | No portfolio / past context | optional inputs to Trader/risk/PM (§3.3) | empty / absent | persistence + caller data excluded | holdings-aware sizing lost | — |
| A10 | Routers → static edges | R2/R3 count/label routing (§2.4) | Bull → Bear → RM, Trader → Risk Reviewer → Final | at 1 round and one reviewer routing is constant | multi-round configurability deferred | — |
| A11 | Smaller structured schemas, same fallback pattern | ResearchPlan / TraderProposal / PortfolioDecision + one fallback (§5.2) | minimal fields per stage; keep structured → one free-text fallback | smaller outputs; browser structured support unverified | fewer output fields | fallback invocation surface |
| A12 | Single model for all roles | quick/deep clients (§5.1) | one runtime model; deep/quick recorded as role metadata | browser runtime may expose one model | possible reasoning-quality difference (not evaluated) | resource reuse across all nodes |
| A13 | No checkpoint, no reporting tree / JSON log | optional SQLite; post-graph files (§6.4) | none | infrastructure | none on graph semantics | — |
| A14 | No reflection, no persistent memory | pre-graph Reflector calls; memory log (§6.4) | none | persistence; extra pre-graph calls | no lessons | removes calls outside the graph |

## 12. Minimum Browser Graph

Architecture proposal only (T044); not implemented.

```text
          ┌─ Market Analyst ─┐            (A1: intentional parallel adaptation)
START ────┤                  ├─ fan-in ─→ Bull Researcher
          └─ News Analyst ───┘                  │ (sequential; Bear reads Bull's argument)
                                                ▼
                                          Bear Researcher
                                                │
                                                ▼
                                         Research Manager
                                                │
                                                ▼
                                             Trader
                                                │
                                                ▼
                                          Risk Reviewer   (A5: simplification)
                                                │
                                                ▼
                                          Final Decision  (A6: PM boundary, renamed)
                                                │
                                                ▼
                                               END
```

8 logical nodes (each writes one state field group). No routers (A10), no tool nodes (A4), no clear
nodes (A7).

| Node | Role | Why present | Input | Output | Expected invocation pattern | Upstream equivalent | Status |
|---|---|---|---|---|---|---|---|
| Market Analyst | technical report | independent analysis; Trader grounding | run context + market fixture | `market_report` | 1 request (concurrent with News) | Market Analyst (§4.1) | Preserved role, Adapted input (A3, A4) and scheduling (A1) |
| News Analyst | news/macro report | independent analysis | run context + news fixture | `news_report` | 1 request (concurrent with Market) | News Analyst (§4.3) | Preserved role, Adapted (A1, A3, A4) |
| Bull Researcher | pro case | adversarial reasoning | 2 reports (absent-marker semantics for missing ones) + opening marker | debate `history`, last argument | 1 request, after fan-in | Bull (§4.6) | Preserved |
| Bear Researcher | con case, rebuts Bull | opponent-aware dependency | 2 reports + Bull's argument + `history` | debate `history`, last argument | 1 request, after Bull | Bear (§4.7) | Preserved |
| Research Manager | debate synthesis | debate → plan boundary | debate `history` | `investment_plan` (5-tier + rationale + actions, smaller) | 1 request, +1 on structured failure | RM (§4.8) | Preserved (A11 schema) |
| Trader | executable proposal | plan → action boundary | `investment_plan` + `market_report` | `trader_investment_plan` (Buy/Hold/Sell + reasoning + optional levels) | 1, +1 on structured failure | Trader (§4.9) | Preserved (A9 no portfolio, A11) |
| Risk Reviewer | second-pass critique | risk review stage | `trader_investment_plan` + `investment_plan` + 2 reports | risk review text | 1 request | 3-way risk debate (§8) | Simplified (A5) |
| Final Decision | final synthesis | final decision boundary | risk review + `investment_plan` + `trader_investment_plan` | final decision (5-tier + summary + thesis, smaller) | 1, +1 on structured failure | Portfolio Manager (§4.13) | Simplified (A6, A9, A11) |

Risk Reviewer inputs mirror what the upstream risk analysts read (trader plan + reports, §4.10);
adding `investment_plan` is part of A5 so a single reviewer can see the research rationale that
three debaters would otherwise surface among themselves.

### 12.1 Invocation model (graph node count ≠ inference count)

- Logical requests per run: **8 minimum, 11 maximum** (3 structured nodes × at most one fallback).
- Peak concurrent logical requests: **2** (analyst stage); **1** everywhere else.
- Contrast with upstream default: 12 minimum logical calls, unbounded-by-node tool loops, 0
  concurrency (§5.4).

AkariSP workload coverage of this proposal (no AkariSP change implied):

| Workload | Provided by |
|---|---|
| Independent concurrent inference | Market ‖ News |
| Bounded concurrency pressure / queueing | 2 concurrent requests against the runtime's concurrency limit (e.g. limit 1 ⇒ one queued) |
| Fan-in | join before Bull |
| Sequential dependent inference | Bull → Bear → RM → Trader → Risk → Final |
| Multiple repeated requests on one warm resource | 8–11 requests per run through one runtime (A12) |
| Cancellation surface | any in-flight or queued request can be aborted mid-run |
| Structured failure / fallback | RM, Trader, Final Decision |
| Resource reuse across agents | all nodes share one runtime (A12) |

Pressure beyond 2 concurrent requests (e.g. re-adding Sentiment/Fundamentals as fixture-fed
branches, or the tool loop) is deferred; it does not all have to land in one later Feature.

### 12.2 Workload accounting recommendation

Future BrowserTradingAgents Features should measure these separately, because the source shows
they diverge (§5.4): graph node executions; logical model requests; provider invocations
(including fallback and any SDK/runtime retries); queued requests; active requests; cancellations;
fallback invocations. This is an application-level measurement recommendation, not an AkariSP
core change request (Principles IV, V).

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

### New findings in Phases 8–9

None. Phase 8–9 sources did not contradict any earlier conclusion (topology, speaker labels,
dependencies, responsibilities) and involve no AkariSP contract.

- **N-06 Debug-stream comment vs stream mode** — `trading_graph.py` L328–329 calls the streamed
  chunks "per-node deltas" and merges them with `dict.update`; the graph args request
  `stream_mode="values"` (propagation.py L79), which in LangGraph yields full state snapshots
  (library semantics). The merged result equals the last snapshot either way; only the comment is
  inaccurate. Debug path only.
- **N-07 Config/docstring drift on language and structured users** — `default_config.py` L112
  says "Internal agent debate stays in English", but `get_language_instruction()` is appended to
  the Bull/Bear and all three risk prompts (e.g. `bull_researcher.py` L49,
  `aggressive_debator.py` L46) and its docstring lists researchers and debaters (context.py
  L21–23). `structured.py` L3 names three structured users; Sentiment is a fourth
  (`sentiment_analyst.py` L28–32). Code is authoritative.
- **N-08 Sentiment bypasses tool state injection** — it calls `get_news.func(...)` directly
  (sentiment L61), so `InjectedState("trade_date")` is not applied and `trade_date` stays `""`;
  the passed window already ends at the run's `trade_date` (L54–55), so the effective window is
  the same.

### Final findings status (T045)

| ID | Kind | Status | Notes |
|---|---|---|---|
| F001-001 | Finding — reference-semantics correction | **CONFIRMED** (no new evidence changes it) | analysts sequential upstream; parallel analysts only as A1 |
| N-01 | Note — comment vs code | final | router comments |
| N-02 | Note — declared unreachable routes | final | label-drift guard |
| N-03 | Note — nested dict replacement drops `judge_decision` mid-debate | final | no reader affected |
| N-04 | Note — `sender` unread | final | excluded in §10 |
| N-05 | Note — docstrings vs code (PM single call, Trader reads reports) | final | code authoritative |
| N-06 | Note — debug-stream comment | final | debug path only |
| N-07 | Note — language / structured-users doc drift | final | code authoritative |
| N-08 | Note — Sentiment bypasses `InjectedState` | final | equivalent window |

No new findings in Phases 10–11. Notes N-01…N-08 are upstream code/documentation observations,
not BrowserTradingAgents defects, and none involves an AkariSP contract. Constitution XI remains
consistent with the source; no amendment candidate.

## 14. Feature 001 Final Deliverable

### 14.1 Success questions (T046)

| # | Question | Answer | Evidence |
|---|---|---|---|
| 1 | What is the original topology? | START → selected analysts in order, each with its own tool loop (Market/News/Fundamentals) and a message-clear node → Bull ⇄ Bear (R2) → Research Manager → Trader → Aggressive → Conservative → Neutral (R3) → Portfolio Manager → END | §2.3–2.5 |
| 2 | What agents exist? | 12 roles: 4 analysts, Bull, Bear, Research Manager, Trader, 3 risk analysts, Portfolio Manager; plus ToolNodes and message-clear nodes | §2.2, §4 |
| 3 | What state connects them? | `AgentState` (MessagesState + run context, 4 reports, `investment_debate_state`, `investment_plan`, `trader_investment_plan`, `risk_debate_state`, `final_trade_decision`, `past_context`, `portfolio_context`) | §3 |
| 4 | Which nodes invoke LLMs? | all 12 roles (quick: analysts, Bull, Bear, Trader, risk ×3; deep: RM, PM) + pre-graph Reflector | §5.1, §5.3 |
| 5 | Which nodes invoke tools? | Market, News, Fundamentals via ToolNodes; Sentiment pre-fetches in-node without ToolNode | §6.1, §6.3 |
| 6 | Which loops are tool loops? | analyst ⇄ `tools_{market,news,fundamentals}` (R1 + E03) | §2.4 R1 |
| 7 | How does Bull/Bear debate work? | Bull opens; strict alternation by speaker prefix; each reads opponent's last argument + history; `count` +1 per turn | §7.1–7.3 |
| 8 | How does risk debate work? | Aggressive → Conservative → Neutral cycle by `latest_speaker`; each reads the other two's latest arguments + history | §8.1–8.3 |
| 9 | What terminates each debate? | `count ≥ 2·max_debate_rounds` → RM (ends after Bear); `count ≥ 3·max_risk_discuss_rounds` → PM (ends after Neutral); both default 1 | §7.1–7.2, §8.1–8.2 |
| 10 | What does Research Manager add? | debate history → `investment_plan` (5-tier rating + rationale + strategic actions), deep LLM | §4.8, §7.4 |
| 11 | What does Trader add? | plan + market report + portfolio → Buy/Hold/Sell with entry/stop/sizing (`trader_investment_plan`) | §4.9, §8.4 |
| 12 | What does Portfolio Manager add? | risk history + plan + trader plan (+ past/portfolio) → final 5-tier decision with summary/thesis | §4.13, §8.4 |
| 13 | Are upstream analyst paths parallel? | **No — SEQUENTIAL**; no fan-out anywhere; at most one LLM call in flight | §9.1, §5.4, F001-001 |
| 14 | Which semantics must BrowserTradingAgents preserve? | role separation, independent analyst reports, opponent-aware Bull → Bear debate, debate synthesis (RM), executable proposal (Trader), risk review, final synthesis, explicit state | §10.2 |
| 15 | Which components can be simplified? | analyst set, debate/risk state, 3-way risk → reviewer, schemas, routers, quick/deep split, pre-fetch → fixtures, PM naming | §10.2, §11 |
| 16 | Which infrastructure should be excluded? | ToolNode loop, real vendors, checkpoint, reflection/past context, reporting, persistent memory, portfolio context, `messages` channel, `sender` | §10.2 |
| 17 | What is the minimum browser graph? | (Market ‖ News) → Bull → Bear → RM → Trader → Risk Reviewer → Final Decision; 8 nodes, 8–11 requests, peak concurrency 2 | §12 |

### 14.2 Required Final Deliverable (T047)

```text
Original TradingAgents analyzed: YES

Reference revision:
  repository: TauricResearch/TradingAgents
  branch: main
  commit: 35543d0248bf89fcb92b17a15858ad0c0e940687
  version: 0.5.1
  analysis date: 2026-09-28

AkariSP dogfood baseline:
  package: akarisp@0.1.0-alpha.2
  commit: 7e8202e6ab91af386abc9e2416d9cb07fdfacecf

BrowserTradingAgents execution baseline: 37b4fad41696c84bc49091eb4a9db36fcf92d564
  (final revision re-checked in T056)

Graph topology:
  Single sequential chain built in GraphSetup.setup_graph(): START → analysts in configured order
  (tool loop + message clear each) → Bull ⇄ Bear → Research Manager → Trader → Aggressive →
  Conservative → Neutral (cycled) → Portfolio Manager → END. Edges E01–E14. (§2)

Agents:
  Market, Sentiment, News, Fundamentals analysts; Bull, Bear researchers; Research Manager;
  Trader; Aggressive, Conservative, Neutral risk analysts; Portfolio Manager. (§4)

Graph state:
  AgentState(MessagesState): run context, 4 reports, InvestDebateState, investment_plan,
  trader_investment_plan, RiskDebateState, final_trade_decision, past_context, portfolio_context;
  only messages has a reducer. (§3)

Conditional edges:
  R1 _tools_or_clear (analyst → ToolNode | clear), R2 should_continue_debate, R3
  should_continue_risk_analysis; self/backward targets declared but unreachable (N-02). (§2.4)

Tool loops:
  Market, News, Fundamentals ⇄ their ToolNodes; N rounds ⇒ N+1 LLM calls; trade_date injected
  and clamped. Sentiment: in-node pre-fetch, no loop. (§6)

Parallel paths in upstream:
  NONE. (§9, F001-001)

Bull/Bear debate mechanics:
  Bull first; alternation by "Bull Analyst:"/"Bear Analyst:" prefix; opponent's last argument +
  shared history in every prompt; 2k turns; ends after Bear → Research Manager. (§7)

Risk debate mechanics:
  Aggressive first; "Aggressive" → Conservative → Neutral → Aggressive; each reads the other two's
  latest arguments + history, trader plan, reports, portfolio; 3r turns; ends after Neutral →
  Portfolio Manager. (§8)

Research Manager responsibility:
  Debate history → investment_plan (5-tier rating, rationale, strategic actions); deep LLM;
  structured + one fallback. (§4.8)

Trader responsibility:
  investment_plan + market_report + portfolio → trader_investment_plan (Buy/Hold/Sell, reasoning,
  entry/stop/sizing); quick LLM; structured + one fallback. (§4.9)

Portfolio Manager responsibility:
  Risk history + investment_plan + trader plan (+ past/portfolio) → final_trade_decision (5-tier,
  summary, thesis, optional target/horizon); deep LLM; structured + one fallback. (§4.13)

LLM invocation points:
  Analysts (tool-bound, N+1 per analyst), Sentiment (structured 1–2), Bull/Bear (1 per turn), RM
  (1–2), Trader (1–2), risk ×3 (1 per turn), PM (1–2), Reflector before the graph (per pending
  entry). Default minimum 12 logical calls; max 1 in flight. (§5)

Tool invocation points:
  ToolNodes for Market (3 tools), News (4), Fundamentals (5); Sentiment calls fetchers directly.
  (§6.1, §6.3)

External dependencies:
  Vendor-routed market data, news, macro (FRED), prediction markets (Polymarket), fundamentals,
  insider data, Yahoo news, StockTwits, Reddit, optional Jev screen, yfinance identity; LLM
  provider clients; SQLite checkpoint (optional); memory log and report files. (§6.2, §6.4)

Required for BrowserTradingAgents:
  Market + News analysts, Bull, Bear (1 round), Research Manager, Trader, a risk review stage,
  a final decision stage, explicit state with the fields marked YES in §3.3. (§10, §12)

Explicitly excluded:
  Sentiment and Fundamentals analysts (initially), ToolNode loops, real data vendors, checkpoint,
  reflection/past context, reporting/log tree, persistent decision memory, portfolio context,
  shared messages channel, sender. (§10.2)

What will be simplified:
  4 → 2 analysts; 3-way risk debate → single Risk Reviewer; smaller debate/risk state; smaller
  structured schemas; routers → static edges; one model for all roles; fixture-in-prompt inputs;
  Portfolio Manager → Final Decision. (§10.2, §11)

What must preserve semantics:
  Independent analyst reports; opponent-aware sequential Bull → Bear; debate synthesis into an
  investment plan; separate executable trader proposal; risk review of that proposal; final
  synthesis; explicit state transitions. (§10.2)

Intentional BrowserTradingAgents adaptations:
  A1 parallel Market ‖ News fan-out (concurrency/backpressure dogfooding, not upstream topology);
  A2–A14 as listed in §11. None implemented.

Findings:
  F001-001 CONFIRMED (upstream analysts sequential; reference-semantics correction). No other
  findings. Notes N-01…N-08. (§13)

AkariSP production changes:
0

BrowserTradingAgents implementation changes:
0

Recommended Feature 002 scope:
  See 14.3 (recommendation only).
```

### 14.3 Recommended Feature 002 scope (recommendation only)

**Feature 002 — LangChain.js ↔ AkariSP Integration Validation.**

```text
LangChain.js → thin application-local ChatModel bridge (e.g. src/integration/akari-chat-model.ts)
             → akarisp@0.1.0-alpha.2 → Chrome Prompt API
```

Recommended to validate, because Feature 001 shows the minimum graph depends on them:

- single request through the bridge (every node in §12 is one or more such requests);
- structured-output attempt and one free-text fallback path (RM, Trader, Final Decision; §5.2);
- two concurrent requests and their queueing under a concurrency limit (the A1 fan-out shape);
- cancellation of an in-flight and a queued request;
- runtime reuse across sequential requests (A12);
- separate accounting of logical requests vs provider invocations (§12.2);
- evidence classes kept apart: `DETERMINISTIC_TEST` / `NODE_INTEGRATION` vs
  `REAL_BROWSER_PROMPT_API` (Principle VI).

Recommended out of scope for Feature 002: LangGraph.js, agents/graph, fixtures of market data,
tool calling, `@akarisp/langchain` or any adapter package (Principles I, X). AkariSP changes
expected: 0.

### 14.4 Factual-correction check (T048)

No statement in `spec.md` or `plan.md` is contradicted by T001–T047: the spec's expected baseline
topology, Sentiment pre-fetch description, Research Manager boundary and pre-established finding
all match the source. **No correction needed.** Constitution Principle XI is consistent with the
source (analysts, Bull/Bear and risk debates sequential); no amendment candidate.

### 14.5 Verification record (Phase 12, T049–T058)

| Gate | Task | Result | Evidence |
|---|---|---|---|
| V-01 | T049 | PASS | `UP` HEAD = `35543d0248bf89fcb92b17a15858ad0c0e940687`, clean checkout; `pyproject.toml` L7 `version = "0.5.1"`; every permalink in this file uses that one SHA |
| V-02 | T050 | PASS | §1 path table: 22/22 spec/plan paths "exact path present"; no mapping or finding needed |
| V-03 | T051 | PASS after fix | 12 agent records + ToolNode + message-clear record, all spec fields present; 26 state rows, no empty cells; unresolved Phase-10 placeholders = 0. Fix: Conservative/Neutral records had a combined "Output state / LLM calls / Tools" line — split into separate fields with their own citations (conservative L48, L52–68; neutral L48, L52–66) and re-checked |
| V-04 / V-05 | T052 | PASS | all 10 edge-registration sites in `setup.py` (L112, 116, 119, 121, 125, 129, 134, 135, 138, 144) map to E01–E14; the §2.5 diagram uses exactly E01–E14; R1–R3 each list router, conditions, targets, citation |
| V-06 | T053 | PASS | see sampled claims below; evidence class for all Feature 001 claims is `STATIC_CODE_ANALYSIS` (other class names appear only in the Feature 002 recommendation, §14.3) |
| V-07 / V-08 | T054 | PASS | every §10.1 row has a reason; 14 adaptations (A1–A14) each with upstream behavior / proposal / why / cost / value; §1–§9 contain no claim that upstream runs anything in parallel; A1 is labeled "not upstream topology" |
| V-09 | T055 | PASS | 17/17 success questions answered with section references (§14.1); all 26 Final Deliverable fields present (§14.2); F001-001 CONFIRMED |
| V-10 | T056 | PASS | execution baseline `37b4fad41696c84bc49091eb4a9db36fcf92d564` unchanged; research progress commits after it: `922be89` (agent semantics), `2af7bcc` (browser adaptation); the Feature 001 completion commit follows this record |
| V-11 / V-12 | T057 | PASS | `git diff --name-only 37b4fad` → only `research.md`, `tasks.md` under `specs/001-tradingagents-reference-analysis/`; untracked paths identical to the T001 snapshot; no `src/`, no `package.json`; no upstream file copied into the repository |

**Sampled source re-checks (T053, SC-006)** — each cited range re-opened in `UP`; all match:

| Section | Claim | Source re-opened |
|---|---|---|
| §2 topology | last clear node → Bull Researcher | setup.py L124–125 |
| §3 state | `AgentState(MessagesState)`; initial `messages=[("human", company)]` | state.py L47; propagation.py L31 |
| §4 analysts | report only when no tool calls; Sentiment calls `get_news.func` directly | market_analyst.py L82–83; sentiment_analyst.py L61 |
| §7 Bull/Bear | `"Bull Analyst: "` / `"Bear Analyst: "` prefixes; prefix routing | bull L53; bear L55; conditional_logic.py L19–21 |
| §4.8 Research Manager | reads debate `history`; writes `investment_plan` | research_manager.py L19, L72 |
| §4.9 Trader | reads `investment_plan`, `market_report`, portfolio; writes `trader_investment_plan` | trader.py L28, L34–35, L97 |
| §8 risk | `latest_speaker = "Aggressive"`; A → C → N routing | aggressive_debator.py L57; conditional_logic.py L29–33 |
| §4.13 Portfolio Manager | reads risk history, plan, trader plan; writes `final_trade_decision` | portfolio_manager.py L33–36, L104 |
| §5.2 / §4.5a helpers | structured → one free-text fallback; clear removes all messages | structured.py L73–88; context.py L223–227 |
| §6.3 tools | `InjectedState("trade_date")` | tools.py L22 |
| §2.6 / §5.1 TradingAgentsGraph | GraphSetup(quick, deep, logic); compile without checkpointer; decision extraction | trading_graph.py L97–101, L113, L344 |
| §5.4 config | debate/risk rounds 1, recursion limit 100 | default_config.py L115–117 |

**Verification observation (not a finding)**: a local checkout `../akariSP` exists with a clean
working tree at `78804aa`, one commit *behind* the recorded AkariSP baseline `7e8202e` (the
baseline commit exists locally; `78804aa` is its parent-side ancestor). Feature 001 neither read
nor modified AkariSP; the baseline is recorded as provided. Relevant only for Feature 002, which
should consume `akarisp@0.1.0-alpha.2` / `7e8202e` explicitly.

### 14.6 Completion record (T058)

```text
T001–T058: COMPLETE
Original TradingAgents analyzed: YES
Frozen source analysis: COMPLETE
12 agent records: COMPLETE
ToolNode / message-clear records: COMPLETE
Graph topology: fully evidence-backed
Conditional routing: fully evidence-backed
Upstream analyst parallelism: SEQUENTIAL
Bull/Bear semantics: resolved
Risk semantics: resolved
F001-001: CONFIRMED
PRESERVE/SIMPLIFY/EXCLUDE: complete
Intentional Browser adaptations: explicitly separated
Minimum Browser graph: proposed, not implemented
Unresolved Phase-10 placeholders: 0
AkariSP production changes: 0
BrowserTradingAgents application source changes: 0
Feature 001: COMPLETE
```
