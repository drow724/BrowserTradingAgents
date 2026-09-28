# BrowserTradingAgents Roadmap Notes

Working notes, not governance. The constitution (`.specify/memory/constitution.md`) prevails.
Last updated: 2026-09-28 (Feature 003).

## Intended end state (candidate, not yet a Feature)

A user opens the app in a browser and runs a TradingAgents-style multi-agent analysis there:
input (ticker, date) → agents run in the browser → result shown on the page.

- Delivered as a **static build** (`npm run build` → `dist/`) served over `http(s)` (localhost or
  static hosting). Opening `index.html` via `file://` will not work: the Prompt API needs a secure
  context and npm packages need bundling.
- LLM inference runs **in the browser** through AkariSP (Chrome Prompt API; WebLLM possible
  later). It cannot move to a server: the Prompt API exists only in the user's Chrome.
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
| 00N | User-runnable browser app: Feature 001 minimum graph (Market ‖ News → Bull → Bear → Research Manager → Trader → Risk Reviewer → Final Decision) on fixtures, static build, result page | candidate |
| later | Real market/news data (see below) | deferred (Constitution IX) |

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
