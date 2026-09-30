# BrowserTradingAgents Roadmap Notes

Working notes, not governance. The constitution (`.specify/memory/constitution.md`) prevails.
Last updated: 2026-09-29 (Feature 009 JRPG shell, portfolio onboarding and own office renderer; the Effectiveness Benchmark moves after the portfolio expansion).

## Intended end state (candidate, not yet a Feature)

A user opens the app in a browser and runs a TradingAgents-style multi-agent analysis there:
input (ticker, date) → agents run in the browser → result shown on the page.

- Delivered as a **Next.js (App Router) application** (ADR 0001): browser + a server-capable
  runtime (Node or serverless, e.g. Vercel). The server side holds data acquisition and secrets;
  it does not run the agents. Feature 006 migrated the shell; Vite is retired. The Prompt API needs a secure context (`localhost` or HTTPS).
- LLM inference runs **in the browser** through AkariSP (Chrome Prompt API; WebLLM possible
  later). The Prompt API exists only in the user's Chrome. Browser/local inference is the default
  tier. A remote (cloud) tier would be an explicit, user-visible escalation owned by the
  application (constitution XIII, Inference Tiers; candidate implementation: Vercel AI
  Gateway). It is not planned in Features 005–007.
- Requires a Chrome with the Prompt API and an available on-device model; other browsers get an
  "unsupported" notice.
- First versions use **committed fixtures** as market/news input (Constitution II, IX; Feature 001
  adaptation A3).

## Feature sequence (candidates)

| Feature | Scope | Status |
|---|---|---|
| 001 | TradingAgents v0.5.1 reference analysis | complete |
| 002 | LangChain.js ↔ AkariSP integration validation (thin bridge) | complete — real Prompt API evidence (Chrome 152/153); carry-over: N-6 JSON code fences trigger the structured fallback, N-7 `system` role accepted but not a contract |
| 003 | LangGraph.js ↔ AkariSP: minimal graph, parallel branches, fan-in, sequential nodes | complete — canonical app `index.html` → `src/main.ts` (Feature 002 harness at `/harness/`); real Prompt API evidence (Chrome 153); carry-over: O-1 LangGraph's browser entry does not pass the graph's AbortSignal to models called inside nodes (forward `config.signal` explicitly), O-2 LangGraph rejects the caller before in-flight node work settles (check AkariSP settlement before `shutdown()`) |
| 004 | TradingAgents-style fixture graph on the canonical page: Market ‖ News → Bull → Bear → Research Manager → Trader → Risk Reviewer → Final Decision; reference role boundaries selectively preserved, documented browser adaptations, deterministic fixture `tradingagents-fixture@1` | complete — real Prompt API evidence (Chrome 153, `a0584fd`, 8 logical requests, ~26 s); carry-over: A11 deviation (all role outputs plain text, no structured fallback), A4 simplification (no tools; facts come from the fixture) |
| 005 | **Market Data Boundary Experiment** — browser market-data boundary: `?data=live` feeds only the Market Analyst from Massive end-of-day bars through acquire → normalize → render, independent of the LLM provider axis; fixture mode unchanged | implementation complete (L1–L3 controlled evidence; native + fixture `0543a69`); **authenticated provider validation (P-1, L4, L5) deferred** — Massive was chosen for pure-browser feasibility, not from the upstream data contract; permitted use unresolved; no real credential used |
| 006 | **Next.js Application Shell Migration** (`006-nextjs-application-shell`): move the Vite shell to Next.js App Router with no semantic change (see "Feature 006 scope") | implementation complete — Next.js 16 App Router shell (`/`, `/harness`); graph, AkariSP and Prompt API still run only in the browser; Vite retired; all prior browser guarantees re-proven on the production server; native gates PASS in installed Chrome 154 (pre-retirement `5eb4fc0`; final `a3031920`: native + fixture 8/8, 8 logical / 0 fallback, settled `{ready,0,0}` before shutdown) — **complete** |
| 007 | **Upstream-Compatible Server Market Data Boundary** (`007-upstream-server-market-data-boundary`): upstream Market Analyst data contract at `35543d0` → same-origin `/api/market` with a Yahoo/yfinance-compatible server adapter and a provider-independent market bundle | **complete** — controlled boundary validation PASS; native + fixture regression PASS (`4b4925f`); real Yahoo L4/L5 validation PASS; Feature 005 browser-direct Massive path retired; AkariSP changes 0 |
| 008 | **Pixel Agents Execution Visualization**: Pixel Agents as an execution-visualization / observability layer (LangGraph / AkariSP execution events → Pixel Agents; Pixel Agents never makes orchestration decisions). Delivered as an always-on text execution view plus an explicit opt-in Pixel Agents canvas (D5) | complete (local/research; public deployment deferred: F008-L1); the opt-in Pixel Agents canvas was retired in Feature 009 (MD-5) |
| 009 | **JRPG Fullscreen Shell, Portfolio Onboarding and Own Pixel Renderer** (`009-jrpg-portfolio-onboarding`): paper trading only; first-visit Korean onboarding; holdings (BTC, KRX gold spot, KR and US listings) stored only in the browser; `/api/directory` refreshed at most once per Seoul day from data.go.kr (keyed) and Nasdaq Trader; fullscreen office drawn by our own renderer from the Feature 008 view state | in progress (local/research; public deployment deferred: F008-L1) |
| 010 | **Portfolio-Aware Analysis with Grounding Checks** (`010-portfolio-grounded-analysis`): Korean questions resolved to holdings; one eight-role run per holding on committed fictional facts (MD-8; final answer in Korean, MD-9); deterministic grounding checker flags unsupported numbers, tickers and dates; overview with cancel; browser-only paper-trade ledger; committed measurement set (25 questions, 6 traps) with stand-in and opt-in native reports | in progress (native measurement pending) |
| 011 | **Own Office Art** (`011-own-office-art`): the temporary upstream Pixel Agents sprites are replaced by our own art (text pixel maps → committed PNGs, provenance per file); copy step and `pixel-agents` dependency removed; renderer and view state unchanged; closes F008-L1 | complete — F008-L1 closed |
| 012 | **Runtime Reuse Across Runs** (`012-runtime-reuse`): one AkariSP runtime kept for the page session instead of one per run (Feature 010 R3); isolation, cancel/failure recovery and a reuse on/off comparison | complete — `?reuse=on` opt-in, default off (maintainer); native: overview ≈ −8–11 %, preparation saving ≈ 0 after the first model load |
| 013 | **Numbers by Reference** (`013-numbers-by-reference`): grounding-checker fixes (Feature 010 re-scored: NOT_YET → LIMITED, equal to the hand audit); number modes current / formatted / refs for the final answer; three-mode native comparison | complete — default stays `current` (maintainer); native refs: unsupported 0.051 vs 0.283 per answer, format violations 78.8 % (prompt only; F-A); AkariSP regex constraint collapsed 9/33 answers → NO_CHANGE; post-processing spike: the model cites references rather than substituting them |
| 014 | **Live Quotes for Portfolio Analysis** (`014-live-portfolio-quotes`): real holdings analysed against recent Yahoo quotes in the fixture's fact shape; `quotes=live|fixture` (live default for portfolio analysis; measurement, tests and example stay fixture); Yahoo is the local/self-hosted research default (Terms §2.4 recorded, not resolved); only the holding's symbol leaves the browser | complete — real Yahoo check: 30/30 audited numbers equal; BTC not quotable (Yahoo bars inconsistent) |
| after 014 | **Citation-style references**: refs mode that accepts copied exact values, rewrites cited numbers into code-formatted values and treats fact-id citations as citations (Feature 013 spike: 26 → 3 of 33 answers flagged, offline) | candidate |
| 015 | **Toss Securities as a Local Provider** (`015-toss-local-provider`, ADR 0002): holdings import (preview → replace) and KR·US quotes from Toss with the user's own key, locally; read-only by construction (4 allowlisted paths, no order path); per-domain source selection | complete — real check: import 4/5 (KR needs the data.go.kr directory, F015-R1); Toss quotes 10/10 audited; Toss and Yahoo KR prices can differ (F015-R2) |
| 016 | **Semantic Grounding Contract** (`016-semantic-grounding-contract`): fact values carry metric, basis, direction (derived from the fact text by templates); claims classified SUPPORTED / UNSUPPORTED / SEMANTIC_MISMATCH with evidence ids; valuation/outlook claims need evidence; final-answer policy A-016-1 | complete — frozen fixtures 26/26 (baseline 13/26); on real native answers the mismatch precision is 9–17 % (F016-R1) and the evidence-class rule over-accepts (F016-R2); mismatches are a separate signal, not in the verdict, until precision improves (F016-R3, decision A) |
| 017 | **Semantic Grounding Precision** (`017-semantic-grounding-precision`): F016-R1/R2 follow-up — comparison and label-after-value rules, model citations tested as evidence, interpretation judgements need evidence about them; held-out fixture D and a pre-registered threshold for returning mismatches to the verdict | complete — threshold **not met** on the held-out native capture (132 answers, blind audit): false mismatches 11 → 3 vs the 016 checker, but refs mode missed 8 of 9 meaning errors whose values exist in the facts (F017-R5); citations neither helped nor hid errors; mismatches and unsupported interpretation claims stay outside the verdict and are reported apart (decisions 2026-09-30: rules kept; F017-R1 → reported separately, 013 verdicts unchanged) |
| after 017 | **Trust calibration in the UI** ([design note](research/2026-09-30-automation-bias-and-scaling.md)): (1) a one-step confirmation before recording a paper trade when the answer has unsupported claims or semantic mismatches ("이 답변에는 확인되지 않은 내용이 N건 있습니다") — against automation bias; (2) "모델이 생성한 글" and the grounding count next to each role and office character, so authority comes from the checker, not the debate form — against the ELIZA effect | candidate |
| 018 | **BrowserTradingAgents Effectiveness Benchmark** (was 009, 011, 013, 014, 015, 016, 017; moved after the portfolio expansion, MD-2): reuses Feature 010's measurement set and the corrected checker; **includes a single-role baseline** — the final role given all facts directly vs the eight-role graph, same model, set and checker, hypothesis and threshold registered before results (does role separation add independent information? [study note §20.2](research/2026-09-30-llm-scaling-failures-study-note.md)) | candidate (not started) |
| later | Live news, fundamentals, …; WebLLM; optional cloud-inference escalation (must satisfy constitution XIII) | deferred |

## Decision 2026-09-29 (latest): portfolio expansion first — Feature 009

- **MD-1** Paper trading only: no broker API, no real or simulated order placement. *Amended 2026-09-30 by [ADR 0002](adr/0002-toss-local-read-only.md): Toss Securities account read and market data, locally with the user's own key (Feature 015); orders never.*
- **MD-2** The portfolio expansion (Features 009, 010) comes before the Effectiveness Benchmark.
- **MD-3** Our own lightweight canvas renderer draws the fullscreen office (a scratch spike measured about
  +0.3 pp for it vs about +16 pp for Pixel Agents fullscreen).
- **MD-4** Feature 008 D5 is re-decided: the office view is on by default.
- **MD-5** The Feature 008 opt-in Pixel Agents iframe is retired.
- **MD-6** The upstream Pixel Agents sprites are the temporary office art, copied locally and never
  committed (the repository is public; F008-L1 open); replacing them changes asset files only.
- Follow-up candidate F009-F1: a scheduled directory build into a private store, only once a public
  deployment makes per-instance source calls matter.

## Decision 2026-09-29 (later): Next.js application shell — ADR 0001

**Decision**: the maintainer adopts Next.js (App Router) as the long-term application shell
([ADR 0001](adr/0001-nextjs-application-shell.md)). The rationale is not CORS but:
- a future market/news/fundamentals server data boundary
- a server-only secret boundary
- client-side LangGraph, AkariSP, Prompt API and WebLLM, which stay in the browser
- Agent Town client visualization
- a future optional cloud-inference boundary
- Vercel deployment ergonomics

This closes question B below. Questions A and C move to Feature 007.

**Sequence**: 005 Market Data Boundary Experiment → 006 Next.js Application Shell Migration → 007
Upstream-Compatible Server Data Boundary.

### Feature 006 scope — `006-nextjs-application-shell`

Move the Vite application shell to Next.js App Router **without changing any BrowserTradingAgents
semantics**.

- **Preserve**:
  - the eight-role graph
  - fixture mode, including the Feature 005 data axis as implemented
  - the stand-in provider and the native Prompt API
  - LangGraph client execution, `AkariChatModel`, AkariSP
  - explicit AbortSignal forwarding and settlement-before-shutdown
  - evidence and revision (`+dirty`) provenance
  - the Feature 002 harness guarantees (how the protected harness files are hosted is a plan
    decision; the files stay byte-identical unless the Feature records a deliberate
    historical-file decision)
  - the canonical Playwright suites and the installed-Chrome native test
- **Non-goals**:
  - a real market provider or production `/api/market` semantics
  - the upstream data contract implementation
  - news or fundamentals APIs
  - WebLLM, Agent Town, the Vercel AI SDK/Gateway, cloud inference
  - new agent semantics, AkariSP changes
  - A trivial Route Handler probe (no market or domain semantics) is allowed only to show that the
    Next.js server boundary exists.
- **Success criteria (proposed)**:
  - Every canonical guarantee from the Vite shell reproduces under Next.js client execution:
    deterministic + Node integration suites unchanged; the browser suite (fixture, stand-in,
    BLOCKED, Feature 005 controlled live cases, harness) passes on the Next.js server.
  - LangGraph and AkariSP never execute during server rendering.
  - Revision provenance, including `+dirty`, is equivalent.
  - The installed-Chrome native Prompt API fixture graph completes **8/8** at a **clean Next.js
    revision** (8 logical, 0 fallback, settled before shutdown).
  - `src/graph/trading-graph.ts`, `src/integration/*` and AkariSP are unchanged.

### Feature 007 scope — `007-upstream-server-data-boundary` (candidate)

- **First** (plan/research): the actual market-data/tool contract of TauricResearch/TradingAgents at
  a pinned upstream SHA: what each analyst reads, granularity, history window, freshness, and
  provider-specific assumptions.
- **Then**: the `/api/market` contract, the server normalization boundary, the provider choice
  (Yahoo/yfinance-equivalent such as server-side `yahoo-finance2`, Alpha Vantage, others), and
  permitted-use constraints. Each provider records TECHNICAL_VIABILITY and PERMITTED_USE separately;
  without an official basis, PERMITTED_USE = UNRESOLVED.
- Massive stays Feature 005's experimental adapter and is not the canonical provider. Its
  P-1/L4/L5 stay DEFERRED.

## Decision 2026-09-29: research the data contract before choosing a provider

> Partly superseded the same day by ADR 0001: B is decided (Next.js); A and C move to Feature 007;
> Feature 006 is the shell migration, not this research.

- **Previous direction**: Feature 005 Massive browser boundary → Feature 006 live News boundary.
- **New direction**: Feature 005 implementation preserved, authenticated validation deferred →
  Feature 006 research (upstream data contract + server-side data boundary) → architecture and
  provider decision → market/news/fundamentals/… implementation Features afterwards.
- **Questions for the research** (answers not decided here):
  - **A. Upstream data contract**: what the Market and News analysts actually read; whether
    fundamentals or technical indicators are needed; granularity, history window and freshness per
    data kind; provider-specific assumptions in the upstream Python code.
  - **B. Server boundary**: Next.js Route Handler/BFF vs a Vite frontend + tiny Node or serverless
    backend. Criteria: number of endpoints, shared server logic, number of credential-bearing
    providers, caching/rate-limit needs, deployment topology, separation of the browser-only
    Prompt API part from the server part, and local development complexity. Next.js migration is
    not decided before the research.
  - **C. Providers**: server-side `yahoo-finance2`, Alpha Vantage, and Massive (Feature 005
    baseline), each with TECHNICAL_VIABILITY and PERMITTED_USE recorded separately. Without an
    official basis, PERMITTED_USE = UNRESOLVED. No risk-size judgement is recorded.
  - **D. Invariant**: inference runs in the browser. LangGraph, `AkariChatModel` and AkariSP execute
    client-side; their sources (`src/graph`, `src/integration`) need not be `'use client'` files.
    A server may only acquire data (market/news/…).
- The "static build" end state above may change to browser + server-capable runtime, depending on B.

## Real external data: what we learned (2026-09-28)

Upstream TradingAgents fetches data **server-side (Python)**. Findings from the frozen upstream
source (`35543d0`) and a CORS header probe:

| Source | Key / setup (upstream code) | CORS probe from `Origin: http://localhost:5173` |
|---|---|---|
| Yahoo Finance (unofficial `query2` endpoints, `yfinance`) | none | 200, **no** `Access-Control-Allow-Origin` → blocked in browser |
| Reddit (RSS search feed) | none (identified User-Agent) | 200, **no** ACAO → blocked |
| SEC EDGAR (`data.sec.gov`) | `SEC_EDGAR_USER_AGENT` | 200, **no** ACAO → blocked; `company_tickers.json` 403 |
| StockTwits | none (identified User-Agent) | 403 → refused before CORS applies |
| Polymarket Gamma | none ("no key, no auth") | 451 → region-blocked from the probe location |
| FRED | `FRED_API_KEY` | 400 without key; keyed response not probed |
| Alpha Vantage (optional vendor) | `ALPHA_VANTAGE_API_KEY` | 200, `ACAO: *` → callable, but the key is exposed in the browser |
| LLM provider (upstream default OpenAI) | API key | not applicable: BrowserTradingAgents uses the in-browser Prompt API |

Probe method: one `curl` GET per endpoint with an `Origin` header, checking response headers.
This is an HTTP header check, not browser evidence; results depend on network location and
User-Agent. Terms of use and rate limits were not reviewed.

**Conclusion**: the upstream data layer cannot be moved into the browser as is.

## Architecture direction for real data (recommendation, decide in that Feature)

> Superseded by ADR 0001 (2026-09-29): Next.js App Router is the application shell; data
> acquisition goes behind Next.js Route Handlers (Feature 007). Kept below as the earlier reasoning.

```text
Browser:  UI + LangChain/LangGraph + AkariSP + Prompt API   (inference stays here)
   ↓ fetch
Thin server-side data proxy: external API calls only (CORS, keys, User-Agent)
```

- What is needed is **server-side fetching**, not server-side rendering.
- Evaluate first: serverless functions (e.g. Cloudflare Workers, Vercel/Netlify Functions) or a
  small Node proxy, with the app itself kept as a static build.
- Next.js (Route Handlers / Server Actions) is possible but brings a whole framework for a proxy;
  choose it only with evidence (Constitution I). If used, the AkariSP runtime must still be
  created in client code only (AkariSP README).
- Serverless-free alternatives: CORS-enabled sources only (key exposure, quotas); user-supplied
  data (upload/paste); a Chrome extension (`host_permissions` bypass CORS and the Prompt API is
  available there) — a different distribution model.
