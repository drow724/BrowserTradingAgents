# ADR 0001 — Next.js as the long-term application shell

- **Status**: Accepted (maintainer decision, 2026-09-29)
- **Supersedes**:
  - roadmap "Architecture direction for real data" (static build + tiny proxy; Next.js "only with
    evidence")
  - roadmap "Decision 2026-09-29" question B (Next.js vs Vite + tiny server)
- **Affects**: roadmap Feature sequence (005 → 006 → 007), the future constitution amendment below

## Context

- BrowserTradingAgents is a Vite static page. Inference runs in the browser: LangGraph.js →
  `AkariChatModel` → AkariSP → Chrome Prompt API.
- Feature 005 showed that real market data needs a data source the browser can reach. Upstream
  TradingAgents fetches its data server-side. Its data surface is likely to grow beyond market data
  (news, fundamentals, indicators).
- Credential-bearing providers need a place where secrets never reach the client.

## Decision

- BrowserTradingAgents adopts **Next.js (App Router)** as its long-term application shell.
- **Inference stays client-executed**: LangGraph, `AkariChatModel`, AkariSP and the Prompt API (later
  WebLLM) run in the browser.
  - Their source modules (`src/graph`, `src/integration`) need not be `'use client'` files. They are
    imported from a client entry and must never execute during server rendering, because they touch
    `window.LanguageModel`.
- The server side of Next.js is used only for boundaries that belong there: data acquisition, and
  later an optional cloud-inference escalation (see below).

## Rationale

1. **Server data boundary**: future market, news and fundamentals data can live behind Route
   Handlers. This matches upstream TradingAgents' server-side data layer.
2. **Server-only secret boundary**: provider keys read from non-`NEXT_PUBLIC_` environment variables
   in `server-only` modules, never serialized to client responses, logs or errors.
3. **Client inference preserved**: LangGraph, AkariSP, the Prompt API and WebLLM keep running in the
   browser. The client/server split is explicit in the framework.
4. **Agent Town visualization**: a client-side visualization layer fits the App Router
   client/server boundary.
5. **Future optional cloud-inference boundary**: a server route is the natural place for an
   explicit remote-inference escalation, if that is ever adopted.
6. **Deployment ergonomics**: Next.js + Vercel (serverless Route Handlers) is the maintainer's
   preferred and most familiar deployment path.

CORS alone is not the rationale. A tiny proxy would solve that. The decision rests on the growing
server boundary, the secret boundary and deployment.

## Consequences

- **Hosting**: the app changes from static-file hosting to browser + a server-capable runtime (Node
  or serverless). The "static build" end state in the roadmap is replaced.
- **Migration** (Feature 006): Vite-specific machinery moves to Next.js:
  - revision/`+dirty` injection
  - the Feature 002 harness page
  - Playwright `webServer`
  - the stand-in mode and the installed-Chrome runner

  The canonical guarantees must reproduce exactly.
- **Rendering**: modules that touch `window.LanguageModel` load only on the client (client component
  + dynamic import, no server rendering of that path).
- **Constitution**: see the proposed inference-tier principle below; to be applied by a separate,
  explicit amendment.

## Proposed constitution amendment (not yet applied)

A vendor-neutral principle. No vendor is named in the constitution.

> **Inference Tiers.** Browser/local inference is the default tier. The application owns
> inference-tier routing. Remote (cloud) inference requires explicit escalation, visible to the user
> and recorded in evidence; it is never a silent fallback. AkariSP owns the local inference
> lifecycle, not routing semantics.

To be applied through the constitution's governance: reason, evidence, affected Features, workflow
impact, date and version change (expected MINOR, 1.0.0 → 1.1.0), in its own change. This ADR does
not amend the constitution.

## Roadmap-only candidate: Vercel AI Gateway

Vercel AI Gateway is a **candidate implementation** of the future remote-inference escalation tier
(one server-side entry point for many hosted models, so users need not manage one key per vendor).
It is not a constitution rule. It is not part of Features 005–007. Adopting it needs the amendment
above and its own Feature.

## Feature sequence after this decision

- **005 Market Data Boundary Experiment**: implementation complete. Massive is kept as an
  experimental browser adapter, not a canonical provider. P-1/L4/L5 stay DEFERRED.
- **006 Next.js Application Shell Migration** (`006-nextjs-application-shell`): see the roadmap.
- **007 Upstream-Compatible Server Data Boundary** (`007-upstream-server-data-boundary`): see the
  roadmap.
