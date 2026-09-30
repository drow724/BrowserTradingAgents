# Feature Specification: Feature 015 — Toss Securities as a Local Provider

**Feature Branch**: `015-toss-local-provider` (from `main` `9cfad0a`, the merge of Feature 014)

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Toss Securities integration: with the maintainer's own key, on the local machine only,
import holdings from the Toss account and optionally use Toss quotes; per-domain provider selection; orders never."

## Purpose

Core question: **Can the maintainer analyse their real Toss portfolio without typing it in — holdings read from their
own account, quotes from their own broker — while nothing leaves their machine except to Toss, and no order can ever
be placed?**

```text
today (014): holdings typed in by hand ──► quotes from Yahoo ──► analysis
015 (local): holdings read from the Toss account ──► quotes from Yahoo or Toss (chosen per domain) ──► analysis
```

## Baseline

Verified at specification time (2026-09-30):

| Item | Value |
|---|---|
| Base | `main` `9cfad0a` (Feature 014 merged) |
| Holdings | Typed in by the user, stored only in the browser (Feature 009 FR-012; Feature 010 FR-025; Feature 014 FR-018 lets only a symbol leave the browser for quotes) |
| Quotes | Feature 014: Yahoo (local/self-hosted research default), KOSPI/KOSDAQ/US; BTC, KRX gold spot, KONEX not quotable |
| Toss Securities Open API (official docs, read 2026-09-30) | Opened to all customers in August 2026; KRX and US stocks; quotes incl. daily candles; account and holdings queries; orders; OAuth 2.0 client credentials issued by the user in the Toss web app; calls only from registered IP addresses (others: 403); quote 15/s, chart 20/s (may change without notice) |
| Toss terms | Reported (secondary sources only) as personal investment use, no commercial use, no provision to third parties; the original terms were not read — the maintainer reads them when issuing the key |
| Governance | MD-1: paper trading only, no broker API, no real or simulated order placement. Constitution IX: broker APIs not introduced in the initial phase; external data only in a separate application Feature |
| Maintainer's real portfolio | KR and US stocks only (brainstorming 2026-09-30) |

## Clarifications

### Session 2026-09-30 (brainstorming, maintainer)

- Q: Where may broker APIs run? → A: Only as local options with the user's own key; the default path stays publicly
  deployable (Feature 014 premise B).
- Q: What may be used from Toss? → A: Account read and quotes; orders never (MD-1 / IX decision record needed).
- Q: KRX gold (Kiwoom)? → A: Deferred; the maintainer's portfolio has none.
- Q: Import semantics? → A: Replace the browser portfolio after a confirmation; then stored and editable like typed-in
  holdings (FR-006).
- Q: A Toss quote is unavailable — fall back to Yahoo? → A: No; "not available" with the reason, no provider chain
  (FR-010).
- Q: Provider selection? → A: Per domain (holdings / KR·US quotes); the selection UI is built when the second
  provider exists — this Feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import my holdings from Toss (Priority: P1)

On their own machine, with their own Toss key configured, the maintainer chooses "토스에서 가져오기" and sees their
Toss holdings (instrument, quantity, average price, currency) as the portfolio, ready to analyse.

**Why this priority**: Typing a real portfolio by hand is the main friction; this is the Feature's reason.

**Independent Test**: With a controlled Toss stand-in serving a fictional account, choose the import; the portfolio
equals the stand-in's holdings, mapped to the app's instruments, and nothing but the stand-in was contacted.

**Acceptance Scenarios**:

1. **Given** the Toss provider is configured locally, **When** the user imports, **Then** every KR and US stock
   holding appears with its quantity, average price and currency, mapped to the same instruments the directory uses.
2. **Given** a Toss holding the app cannot represent (e.g. an asset class it does not support), **When** importing,
   **Then** it is listed as skipped with the reason, and the rest are imported.
3. **Given** the import finished, **When** the user analyses, **Then** the runs use the imported holdings exactly as if
   they had been typed in (Feature 014 quotes, facts and checks unchanged).
4. **Given** the import, **Then** the portfolio changes as FR-006 defines.

---

### User Story 2 - Choose the quote source per domain (Priority: P2)

In settings, the maintainer chooses the source for each domain: holdings (manual / Toss) and KR·US quotes (Yahoo /
Toss). The answer window names the source actually used.

**Why this priority**: Toss quotes come from the maintainer's own broker and need no unofficial access; but holdings
import is useful on its own.

**Independent Test**: With the Toss stand-in, select Toss for quotes; a KR and a US holding get facts from the
stand-in's candles in the same fact shape, and the source line says Toss; switching back uses Yahoo.

**Acceptance Scenarios**:

1. **Given** Toss is selected for quotes, **When** a holding is analysed, **Then** its market facts come from Toss in
   the Feature 014 fact shape (latest completed close and date, 20-session change, 50-day average, 52-week range)
   and the source line names Toss.
2. **Given** Toss cannot provide a measure (e.g. not enough daily history), **When** the holding is analysed,
   **Then** it is handled as FR-010 defines, with the reason shown.
3. **Given** the Toss provider is not configured, **When** settings open, **Then** only the manual / Yahoo options
   are offered and the Toss ones say why they are unavailable.

---

### User Story 3 - Orders are impossible, secrets stay on the server (Priority: P1)

No code path can place, modify or cancel an order; the Toss secret and the account identifier never reach the
browser, a log, an evidence record or the repository; the Toss options exist only on the local machine.

**Why this priority**: A broker API with order capability is the highest-risk integration in the project (MD-1).

**Independent Test**: Static and runtime checks: the Toss adapter contains no order endpoint; every outbound Toss
request is one of the allowed read endpoints; browser traffic, logs and records contain no secret or account id;
with the provider unconfigured, no Toss request is made.

**Acceptance Scenarios**:

1. **Given** any build, **When** the Toss adapter's outbound requests are enumerated, **Then** they are only token,
   holdings (account read) and quote/candle requests.
2. **Given** a run, **When** browser requests, server logs and the evidence record are inspected, **Then** no client
   secret, token or account identifier appears.
3. **Given** a public deployment configuration (no local Toss configuration), **When** the app runs, **Then** no Toss
   option is visible and no Toss request is possible.

### Edge Cases

- The key is wrong, expired or revoked, or the request comes from an unregistered IP (403): the import or quote
  fails visibly with the reason; the existing portfolio is untouched.
- The Toss rate limit is reached: the call fails visibly (no silent retry storm); quotes of other holdings continue.
- Toss changes its API or limits without notice: failures are typed; nothing falls back silently to fictional data.
- A holding with a fractional US quantity, or a KR ETF/ETN: mapped like typed-in holdings (Feature 009 rules).
- The Toss account holds something the app does not support (e.g. overseas ETFs outside US listings, bonds): skipped
  with a reason (US1 AS2).
- The machine's IP changes: 403 → "등록된 IP가 아닙니다" with what to do; no automatic change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Before any Toss code is written, a decision record MUST amend MD-1 and record Constitution IX's
  application for this Feature: Toss account **read** and quotes are allowed, locally, with the user's own key; any
  order, order modification or cancellation remains forbidden; this is a scope decision, not a legal conclusion.
- **FR-002**: The Toss provider MUST be available only when the local server has the user's own Toss credentials
  configured; otherwise no Toss option is shown and no Toss request is possible.
- **FR-003**: The client secret, access tokens and the account identifier MUST stay on the server; they MUST NOT be
  sent to the browser, written to any log, evidence record, replay or file in the repository.
- **FR-004**: The Toss adapter MUST call only the token endpoint, the holdings (account read) endpoint(s) and quote /
  candle endpoints; it MUST NOT contain any order-related endpoint; a test MUST enforce this list.
- **FR-005**: Holdings import MUST map each Toss holding to the app's instrument (KR listing with market, US listing),
  quantity, average price and currency, using the same directory as manual entry; unsupported holdings MUST be
  listed as skipped with a reason.
- **FR-006**: An import MUST replace the browser portfolio only after the user confirms; afterwards the imported
  holdings are stored and editable exactly like typed-in holdings; a failed or cancelled import leaves the portfolio
  unchanged.
- **FR-007**: Imported holdings MUST be treated exactly as typed-in holdings afterwards (Feature 009/010/014 rules:
  stored only in the browser if stored at all; only the symbol leaves the browser for quotes).
- **FR-008**: The user MUST be able to choose, per domain, the holdings source (manual / Toss) and the KR·US quote
  source (Yahoo / Toss); the choice is stored only in the browser; defaults stay manual and Yahoo.
- **FR-009**: Toss quotes MUST produce the Feature 014 fact shape with the same rules (latest completed session,
  20-session change, 50-day average on adjusted closes where Toss provides adjustment, 52-week range as shown to
  users); if Toss cannot supply a measure, the holding follows FR-010.
- **FR-010**: When a Toss quote is not available, the holding MUST be "not available" with the reason; there is no
  fallback to Yahoo or any other source (no provider chain, as Feature 014 FR-014).
- **FR-011**: The answer window and the evidence record MUST name the quote source actually used per holding
  (e.g. `시세 기준: <date> (토스증권)`), and the notice MUST say which services receive holding symbols.
- **FR-012**: Toss failures (auth, forbidden IP, rate limit, provider error, invalid data, timeout) MUST be typed and
  shown with a reason the user can act on; the existing portfolio MUST stay unchanged on a failed import.
- **FR-013**: All automated tests MUST use a controlled Toss stand-in with fictional accounts and prices; no real Toss
  request is made without the maintainer's approval; no real account data is ever committed.
- **FR-014**: A real-account check MUST be opt-in, run by the maintainer's approval on their machine, and recorded
  without account identifiers, quantities or prices of the real portfolio (counts and pass/fail only).
- **FR-015**: Graph, prompts, checker rules, number modes, the fixture measurement and AkariSP MUST stay unchanged.

### Key Entities

- **Provider selection**: per domain — holdings: manual | Toss; KR·US quotes: Yahoo | Toss; browser-only.
- **Toss credentials**: client id, client secret, account identifier — server-side local configuration only.
- **Imported holding**: a Toss position mapped to the app's `Holding`, or a skipped entry with a reason.
- **Toss quote**: daily candles for one listing, turned into the Feature 014 bundle / fact shape, with provenance.
- **Toss failure**: auth, forbidden IP, rate limit, provider error, invalid data, timeout, not configured.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the Toss stand-in, 100% of supported holdings of a fictional account are imported with exact
  quantity, average price and currency; unsupported ones are listed as skipped.
- **SC-002**: With Toss selected for quotes, 100% of market numbers in the facts equal values computed from the
  stand-in's candles.
- **SC-003**: 0 order-related endpoints exist in the adapter (enforced by a test), and 0 secrets, tokens or account
  identifiers appear in browser traffic, logs or records across the automated suite.
- **SC-004**: Without local Toss configuration, 0 Toss options are shown and 0 Toss requests are made; all Feature
  014 checks pass unchanged.
- **SC-005**: Every Toss failure kind produces a visible, actionable Korean reason, and a failed import leaves the
  portfolio byte-identical.
- **SC-006**: In the opt-in real check (maintainer's own account and key), the import count matches the account's
  KR/US stock positions and every audited Toss quote number matches the Toss app for that date — recorded as counts
  and pass/fail only.

## Assumptions

- The maintainer issues the Toss key, registers the local IP and puts the credentials into the local server
  environment themselves; the implementer never handles or prints them.
- The maintainer reads the Toss Open API terms before use; the project records the reported restriction (personal
  use, no third-party provision) as a scope limit, not a legal conclusion.
- Toss daily candles cover about a year for KR and US listings; to be confirmed by a spike before planning the
  quote part (if not, FR-010 applies).
- The maintainer's Toss portfolio is KR and US stocks only; BTC, KRX gold, bonds and funds are out of scope.
- Out of scope: any order function, real-time streaming, Kiwoom, exchange APIs, public deployment of Toss features,
  changes to the graph, prompts, checker or AkariSP.
- Constitution VIII applies: nothing here claims trading quality.
