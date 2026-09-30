---
description: "Task list for Feature 015 — Toss Securities as a Local Provider"
---

# Tasks: Feature 015 — Toss Securities as a Local Provider

**Input**: Design documents from `specs/015-toss-local-provider/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R9, S1), data-model.md, contracts/toss.md, quickstart.md

**Tests**: included — SC-001–SC-006 are verified by unit tests with an in-process Toss stand-in, browser tests with the
Toss stand-in, and an opt-in real check.

**Gates**: T001 (decision record) before any Toss code; T002 (spike, real Toss calls) and T023 (real check) need the
maintainer's approval; every commit needs approval. The implementer never reads, prints or copies `.env.local`.

## Phase 1: Setup

- [X] T001 Write docs/adr/0002-toss-local-read-only.md (FR-001, research R1): amends MD-1 for this Feature — Toss account read (`/api/v1/accounts`, `/api/v1/holdings`) and market data (`/api/v1/candles`) allowed, only locally, only with the user's own key; orders, order modification/cancellation, order queries, conditional orders and WebSocket never; a scope decision, not a legal conclusion; Toss terms (reported: personal use, no third-party provision) read by the maintainer; Constitution IX applied by this separate Feature. Point docs/roadmap.md MD-1 to it; record the base (`main` `9cfad0a`) and baseline checks in specs/015-toss-local-provider/verification.md
- [X] T002 **APPROVAL REQUIRED** Spike S1 (research S1): a throwaway script in the scratchpad, run by the implementer, that loads `.env.local` itself without printing it and calls token, accounts, holdings, and daily candles for one KR and one US listing; prints only shapes and counts (field names, value types, number of candles, first/last dates, presence of an adjusted field, token lifetime field, number of accounts) — never values, account numbers, codes held or tokens; record the answers in research.md (S1 results) and adjust R4/R5/R7

## Phase 2: Foundational — safety boundary (US3, blocks US1 and US2)

**Purpose**: the only Toss client, read-only by construction; secrets never leave the server; tests can never reach
the real Toss.

- [X] T003 playwright.config.ts: the app server's env always sets `BTA_TOSS_BASE_URL` to the stand-in and fake `BTA_TOSS_CLIENT_ID` / `BTA_TOSS_CLIENT_SECRET` / `BTA_TOSS_ACCOUNT_SEQ` values (process env overrides `.env.local`), so no test sends the real key anywhere; except under `BTA_REAL_TOSS=1`
- [X] T004 [P] [US3] Write tests first in test/toss.test.ts with an in-process Toss stand-in (fictional account): the allowlist is exactly `POST /oauth2/token`, `GET /api/v1/accounts`, `GET /api/v1/holdings`, `GET /api/v1/candles` and any other method/path is rejected before a request is sent; the module source contains no `orders`, `conditional-orders` or `wss:` string; the token is requested once and reused until expiry; the account header is sent on holdings only; not configured (missing id or secret, or `VERCEL` set) → `not-configured` with 0 requests; several accounts without `BTA_TOSS_ACCOUNT_SEQ` → `ambiguous-account`; 401 → `unauthorized`, 403 → `forbidden-ip`, 429 → `rate-limited`, 5xx → `provider-error`, bad JSON → `invalid-data`, limit → `timeout`; captured console output never contains the fake secret, token or account seq
- [X] T005 [US3] src/server/toss.ts: the allowlisted client per contracts/toss.md and research R2/R3 (one request function; token cache in memory; `accountSeq` from env or the single account; typed failures of data-model.md; log line `{ provider: 'toss', ms, status, kind }` only)
- [X] T006 [US3] e2e/market-stub.mjs: Toss stand-in routes (token, accounts, holdings, candles) with a fictional account — KR and US positions, one unsupported asset, fictional daily candles; `/__stats` records for Toss only request counts and whether the Authorization / account headers were present (never values); `/__scenario` `{ toss: 'ok' | 'unauthorized' | 'forbidden-ip' | 'rate-limited' | 'server-error' | 'several-accounts' | 'short-history' }`
- [X] T007 [US3] app/api/toss/status/route.ts: `{ available, reason }` (no secret, token or account data)

**Checkpoint**: `npm test` proves read-only by construction and no secret in logs.

## Phase 3: User Story 1 — Import my holdings from Toss (P1) 🎯 MVP

**Goal**: preview → confirm → the portfolio is replaced by the Toss holdings, mapped with the directory.

**Independent Test**: with the stand-in, import; the portfolio equals the supported positions; the unsupported one is
listed as skipped; nothing but the stand-in was contacted.

- [X] T008 [P] [US1] Write tests first in test/toss.test.ts: `mapPositions(positions, directory)` → KR position with its KOSPI/KOSDAQ market and product type from the directory, US position, currency KRW/USD by market, quantity and average price exact; not in the directory, unsupported asset type, zero quantity → skipped with the Korean reasons of data-model.md
- [X] T009 [US1] app/api/toss/holdings/route.ts: reduced positions `{ code, market?, name, quantity, averagePrice, currency }` (field mapping from S1), `no-store`, failures per contracts/toss.md
- [X] T010 [US1] src/toss-import.ts: `mapPositions` (research R5)
- [X] T011 [US1] components/Portfolio.tsx and components/Shell.tsx: a "토스에서 가져오기" button (shown only when status is available), a preview window listing holdings and skipped entries, "가져오기" replaces the portfolio through `persist()` and clears `quotes=fixture`; cancel or failure leaves the portfolio unchanged with the reason shown (FR-006, FR-012)
- [X] T012 [US1] e2e/toss.spec.ts (new): import with the stand-in → preview → confirm → the portfolio equals the supported positions, one skipped with its reason; then analysing a holding works as in Feature 014 (SC-001); a failed import (`unauthorized`, `forbidden-ip`) shows the Korean reason and leaves `bta.portfolio` byte-identical (SC-005)

**Checkpoint**: MVP — the maintainer's holdings can be imported (stand-in).

## Phase 4: User Story 2 — Choose the quote source per domain (P2)

**Goal**: KR·US quotes from Yahoo or Toss, chosen in the browser; same fact shape; no fallback.

**Independent Test**: select Toss for quotes; a KR and a US holding get facts computed from the stand-in's candles and
the line says 토스증권; switching back uses Yahoo.

- [X] T013 [P] [US2] Write tests first: test/market-route.test.ts — `source=toss` builds a bundle from the Toss stand-in's candles with the Feature 014 rules (latest completed session, 20-session change, 50-day average, 52-week range over one calendar year before the analysis date) and `provider: 'toss-candles@1'`; unavailable → 503 `not-configured`; short history → `unavailable`; the cache key includes the source; test/quotes.test.ts — `fetchQuotes(…, source)` passes `source=toss`; no Yahoo request when Toss fails (FR-010)
- [X] T014 [US2] src/server/market-provider.ts: extract `bundleFrom(rows, instrument, analysisDate, provider)` (steps 4b–7 and the bundle) shared by Yahoo and Toss; Yahoo behaviour unchanged (existing tests pass as they are)
- [X] T015 [US2] src/server/toss.ts + app/api/market/route.ts: Toss daily candles → rows → `bundleFrom` (symbol form → Toss code per S1; adjustment per S1, difference recorded as A-015-1 in verification.md); `source` query parameter, default `yahoo`
- [X] T016 [US2] src/sources.ts (new): `loadSources()` / `saveSources()` over `localStorage['bta.sources']`, default `{ holdings: 'manual', quotes: 'yahoo' }`, unreadable → default; src/quotes.ts passes the quote source; components/Portfolio.tsx "데이터 소스" section (holdings: 수동 입력 / 토스증권; KR·US 시세: Yahoo / 토스증권), Toss options disabled with the status reason when unavailable (FR-008)
- [X] T017 [US2] components/Answer.tsx: source line `(토스증권)` for `toss-candles@1`; the notice names the services that receive holding symbols (Yahoo or 토스증권) (FR-011)
- [X] T018 [US2] e2e/toss.spec.ts: Toss selected → KR and US facts equal values computed from the stand-in candles, line says 토스증권 (SC-002); `short-history` → "시세 없음" and 0 Yahoo requests (FR-010); switching back → Yahoo

## Phase 5: User Story 3 — Orders impossible, secrets on the server (P1, cross-checks)

- [X] T019 [US3] e2e/toss.spec.ts: across import and Toss quotes, the fake secret, token and account seq never appear in browser requests/responses, the answer window, evidence records or the page; the stand-in saw only allowlisted paths (SC-003)
- [X] T020 [US3] e2e/toss.spec.ts: with the provider not configured (a server started without the Toss variables, or status mocked unavailable), no Toss option is shown and the stand-in counts 0 Toss requests; Feature 014 suites pass unchanged (SC-004)

## Phase 6: Polish & Cross-Cutting

- [X] T021 Run `npm run typecheck && npm test && npm run test:browser` and the native gate; record in verification.md
- [X] T022 [P] docs/testing.md (Toss stand-in, `BTA_REAL_TOSS`, env override) and docs/roadmap.md (015 status; Benchmark → 016)
- [X] T023 **APPROVAL REQUIRED** Real check (FR-014, SC-006): opt-in `BTA_REAL_TOSS=1` test with the maintainer's key and IP — import count vs the account's KR/US stock positions, and one date of Toss quote numbers vs the Toss app; recorded as counts and pass/fail only, no account data, quantities or prices
- [X] T024 Present results to the maintainer

## Dependencies & Execution Order

- T001 → T002 (approval) → T003 → Phase 2 (T004 → T005; T006, T007 after T005) → US1 (T008 → T009 → T010 → T011 → T012) → US2 (T013 → T014 → T015 → T016 → T017 → T018) → US3 checks (T019, T020) → T021 → T022 → T023 (approval) → T024.
- If S1 shows the Toss candles cannot cover a year + 50 sessions, US2 delivers "not available" for Toss quotes by design (FR-010) and the finding is recorded; US1 is unaffected.

## Parallel Example

```text
T004 test/toss.test.ts (safety) | T006 Toss stand-in (after T005)
T008 mapping tests               | T013 route/quotes tests (different files)
```

## Implementation Strategy

- MVP: T001–T012 (decision record, spike, safety boundary, holdings import).
- Then US2 (Toss quotes and per-domain selection) and the cross-checks.
- The real check closes the Feature.
