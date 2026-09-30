# Feature Specification: Feature 014 — Live Quotes for Portfolio Analysis

**Feature Branch**: `014-live-portfolio-quotes` (from `main` `40fbdf2`, the merge of Feature 013)

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Live quotes for portfolio analysis with the Yahoo (yfinance-compatible) source as the
default: a user's real holdings are analysed against real recent market data in the same fact shape as the fixture;
the fixture stays for the measurement and the example portfolio. Toss, Kiwoom and provider selection are later
Features."

## Purpose

Core question: **When a user asks about their own holdings, can the answer rest on real recent market data — with
every number still checkable against the facts — instead of fictional fixture values?**

```text
today:  real holding (e.g. ORCL) ──► fictional fixture facts or "market data not available" ──► answer
014:    real holding ──► recent quotes (Yahoo) ──► facts, same shape as the fixture ──► answer + grounding check
```

## Baseline

Verified at specification time (2026-09-30):

| Item | Value |
|---|---|
| Base | `main` `afa653e`; Feature 013 (numbers by reference) implemented and measured, not yet merged |
| Portfolio analysis facts | Built from the fictional `portfolio-fixture@1` only (Feature 010 MD-8); a real holding not in the fixture gets "market data not available" |
| Market data boundary | Feature 007: same-origin server market boundary with a Yahoo (yfinance-compatible) adapter, returning a provider-independent market bundle (latest session, 30 recent sessions, 12 indicators); one configured instrument (IBM); used only by the demo graph's Market Analyst; real Yahoo validated (L4/L5) |
| Yahoo terms | Feature 007 recorded Yahoo Terms §2.4 (automated access) as a restriction the maintainer accepted for personal research; not a legal conclusion |
| Asset classes held | BTC, KRX gold spot, Korean listings (with KOSPI/KOSDAQ market), US listings |
| Reference | Tauric TradingAgents uses yfinance and states it is designed for research purposes and is not financial advice (Apache-2.0) |

## Clarifications

### Session 2026-09-30 (brainstorming, maintainer)

- Q: Who uses this, where? → A: The default path must be publicly deployable later; broker APIs are only ever
  local options with the user's own key.
- Q: Yahoo default and Toss option in one Feature? → A: Split. This Feature is the Yahoo default only; Toss
  (holdings import + quotes, local only) is the next Feature; Kiwoom (KRX gold) is deferred until needed.
- Q: Which facts? → A: The fixture's shape, no extra indicators.
- Q: KRX gold spot (not quoted by Yahoo)? → A: Not available in this Feature; the answer says so.
- Q: Structure? → A: The server returns the existing market bundle for holding symbols; facts are built in the
  browser in the fixture's shape; `quotes=live|fixture` selects the source, default live for portfolio analysis.
- Q: Yahoo's `BTC-KRW` daily bars are internally inconsistent (real check, F014-R3) — how to treat BTC? → A: Not
  quotable in this Feature, like KRX gold spot; exchange APIs are a later topic.
- Q: A quote needs the holding's symbol in a request, which Feature 009 FR-012 / Feature 010 FR-025 forbid → A:
  Re-specify for quotes only: the source symbol alone may be sent to the same-origin boundary and on to the source;
  nothing else about the holding is sent, and the symbol never appears in logs (FR-018).
- Q: The default path must be publicly deployable, but Yahoo Terms §2.4 was accepted only for personal research
  (Feature 007) — keep Yahoo? → A: Keep Yahoo as the local/self-hosted research default; a public deployment
  attaches a separately licensed source behind the same interface later (FR-015).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Answers about my holdings use real recent prices (Priority: P1)

A user who entered their real holdings (e.g. Samsung Electronics, Oracle) asks "오라클 지금 어때요?". The answer uses
the latest completed-session price, its date, the change against the user's average price, the 20-session change,
the position against the 50-day average and the 52-week range — all real — and each number can be traced to a fact.

**Why this priority**: Without it, analysis of a real portfolio has no real market data; this is the Feature's reason.

**Independent Test**: With the controlled market stand-in serving known sessions for a KR and a US symbol, ask about
each holding; every market number in the facts equals the value computed from the served sessions, and the answer
window shows the quote date and source.

**Acceptance Scenarios**:

1. **Given** a real US holding (e.g. ORCL, bought in USD), **When** the user asks about it, **Then** the facts
   contain the latest completed-session close and date, unrealised change, position value, 20-session change,
   position vs 50-day average and 52-week high/low, computed from real sessions, and no fixture value.
2. **Given** a real KOSPI or KOSDAQ holding, **When** the user asks about it, **Then** the same facts are built from
   that listing's sessions in KRW, with dates in the Korean market's calendar.
3. **Given** a BTC holding, **When** the user asks about it, **Then** no quote is requested and the facts say market
   data is not available (Yahoo's BTC bars are inconsistent, F014-R3).
4. **Given** any live run, **When** the answer is shown, **Then** it states the quote date and source
   ("시세 기준: <date> (Yahoo)") and the grounding checker runs on these facts as it does on fixture facts.

---

### User Story 2 - Honest answers when a quote is unavailable (Priority: P1)

A holding that cannot be quoted (KRX gold spot, a delisted or unknown symbol, a source failure, a currency mismatch)
is still analysed from the holding facts alone, and the answer says market data is not available. Fictional data is
never used for a real holding.

**Why this priority**: A wrong real-looking number is worse than no number; the live path must fail visibly.

**Independent Test**: With the stand-in returning a failure, an invalid response, or nothing for a symbol, ask about
the holding; the facts contain "market data not available", no fixture value appears, the run completes, and the
evidence records why.

**Acceptance Scenarios**:

1. **Given** a KRX gold spot holding, **When** the user asks about it, **Then** no quote is requested, the facts say
   market data is not available, and the answer says so.
2. **Given** the source fails, times out or returns invalid data for one holding of an overview, **When** the
   overview runs, **Then** that holding is analysed without market facts, the other holdings use their quotes, and
   the failure kind is recorded.
3. **Given** the user cancels while quotes are being fetched, **When** cancel is pressed, **Then** the pending quote
   requests stop and no analysis run starts.

---

### User Story 3 - Measurement and example stay reproducible (Priority: P1)

The committed measurement, all automated tests and the example portfolio keep using the fictional fixture, so
Feature 010/013 results stay comparable and no test depends on the network.

**Why this priority**: The project's evidence rests on deterministic fixtures (Constitution II); live data must not
leak into them.

**Independent Test**: The stand-in measurement and the existing browser suite pass unchanged with the fixture source
selected; no request reaches the market boundary during them.

**Acceptance Scenarios**:

1. **Given** the fixture source is selected, **When** any portfolio question runs, **Then** the facts are
   byte-identical to Feature 013 and no quote is requested.
2. **Given** the user loads the example portfolio, **When** they ask about it, **Then** the fixture source is used
   (its instruments are fictional, and BTC / KRX gold ids are shared with real holdings).
3. **Given** the demo graph's existing data option, **When** it is used, **Then** its behaviour is unchanged.

---

### User Story 4 - Research use is clear (Priority: P2)

Next to the answer, the user sees that the app is for research and is not investment advice, and which source and
date the prices come from.

**Why this priority**: Real prices make answers look authoritative; the disclaimer keeps Constitution VIII visible.

**Independent Test**: Open an answer from a live run and from a fixture run; the notice is present in both, and the
source line names the fixture or the live source.

**Acceptance Scenarios**:

1. **Given** any answer, **When** it is shown, **Then** a Korean notice states research use and not investment advice.
2. **Given** a fixture run, **When** the answer is shown, **Then** the source line says the data is fictional example
   data.

### Edge Cases

- A source response in a currency other than the symbol's (e.g. a KRX listing answered in USD): not available
  (invalid data); no conversion in this Feature.
- A listing with too little history for the Feature 007 minimum (about one year of sessions): not available
  (insufficient history), like any other unavailability; no partial window is presented as a full one.
- A market holiday or weekend: the latest completed session is the previous trading day; its date is shown.
- A question during market hours: the in-progress session is not used.
- The same symbol held twice or asked about repeatedly on one day: the quote is fetched once per symbol and trading
  day.
- The source does not answer: the holding becomes not available when the server's 20-second limit ends (or at once
  on cancel).
- The user loads the example portfolio and later edits their holdings: from that save on, the page uses `live`
  again, so a real BTC or KRX gold holding never receives the example's fictional price.
- A symbol request that does not match an accepted holding symbol form: rejected by the server without contacting
  the source.
- A split or dividend: prices follow the adjusted series as in Feature 007.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Portfolio analysis MUST support two quote sources, `live` and `fixture`, selected per page; the default
  for portfolio analysis MUST be `live`.
- **FR-002**: The measurement, all automated tests and the example portfolio MUST use `fixture`; saving holdings
  from the editor MUST switch the page back to `live`; with `fixture`, facts
  MUST be byte-identical to Feature 013 and no quote MUST be requested.
- **FR-003**: In `live`, for each holding the app MUST derive the source symbol from the holding: Korean listings from
  the code and the KOSPI/KOSDAQ market, US listings from the ticker. BTC (F014-R3), KRX gold spot and
  any holding without a symbol form MUST be not quotable.
- **FR-004**: The market boundary MUST accept only symbols matching the accepted forms of FR-003 and MUST reject any
  other request before contacting the source.
- **FR-005**: Each quote MUST use the latest completed session in the listing market's own time zone, adjusted as in
  Feature 007, and MUST include the 52-week high and low in addition to the Feature 007 bundle.
- **FR-006**: From a quote, the app MUST build facts in the fixture's shape: latest completed-session close and date,
  unrealised change vs the average price, position value, 20-session change, position vs the 50-day average, 52-week
  high and low, and a statement that no news is supplied. It MUST NOT add other indicators.
- **FR-007**: Every number shown to any role in a live run MUST be in that run's fact set, so the grounding checker
  and the number modes of Feature 013 apply unchanged.
- **FR-008**: When a quote is not available (not quotable, failure, timeout, invalid data, currency mismatch,
  insufficient history), the holding MUST be analysed with "market data not available" and MUST NOT receive fixture
  values; the failure kind MUST be recorded.
- **FR-009**: Quotes needed for a question or overview MUST be requested before the first run starts, concurrently;
  cancel MUST stop pending quote requests and start no run.
- **FR-010**: The same symbol MUST be fetched from the source at most once per trading day per server instance.
- **FR-011**: The evidence record of a live run MUST include the source mode, provider, quote date and a digest of the
  quote data; a fixture run records the fixture as today.
- **FR-012**: The answer window MUST show the quote source and date, and a Korean notice that the app is for research
  and is not investment advice.
- **FR-013**: The demo graph's existing data option, the graph topology, all role prompts, the checker rules and the
  model library MUST stay unchanged (AkariSP changes 0).
- **FR-014**: The default live source MUST be the Feature 007 Yahoo-compatible adapter; no provider registry,
  selection UI or fallback chain is built. The quote interface MUST stay provider-independent so a later source can
  attach behind it.
- **FR-015**: The Yahoo default is for local and self-hosted research use; Yahoo Terms §2.4 (automated access)
  stays a recorded restriction accepted for personal research (Feature 007), not a legal conclusion. A public
  deployment MUST use a separately licensed source attached behind the same quote interface; choosing it is outside
  this Feature. Documentation MUST NOT claim the restriction is resolved.
- **FR-016**: A real-source check MUST be opt-in and run only with the maintainer's approval; it is a small hand audit
  of live answers, not a verdict.
- **FR-017**: A paper trade recorded from a live answer MUST use that run's live latest price as its price basis
  (else the average purchase price); a fixture price MUST never be the basis for a live run.
- **FR-018**: This re-specifies Feature 010 FR-025 for quotes: the source symbol of a quotable holding MAY be sent
  in a same-origin request and by the server to the quote source; quantity, average price, currency choice and any
  other holding data MUST NOT be sent; the symbol MUST NOT appear in any server log; the answer window's notice MUST
  say that holding symbols are sent to look up quotes.

### Key Entities

- **Quote source**: `live` or `fixture` for a page; decides where market facts come from.
- **Source symbol**: the symbol derived from a holding (FR-003), or "not quotable".
- **Quote**: one symbol's adjusted sessions up to the latest completed session, with the Feature 007 measures and the
  52-week high/low; carries its date and provenance.
- **Live fact set**: the holding facts plus facts derived from a quote, in the fixture's shape (FR-006); identified by
  source and quote date.
- **Quote failure**: the kind of unavailability for a holding (not quotable, network, timeout, invalid data, currency
  mismatch, insufficient history).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With controlled served sessions for a KOSPI, a KOSDAQ and a US listing, 100% of market numbers in the
  live facts equal the values computed from those sessions.
- **SC-002**: With `fixture`, all existing automated checks pass and the facts of the 25-question measurement set are
  byte-identical to Feature 013; 0 quote requests are made.
- **SC-003**: In every failure case of FR-008, the run completes, the facts contain no fixture value, and the answer
  window and evidence show that market data was not available and why.
- **SC-004**: Quote fetching adds at most 5 seconds before the first run of a question or overview when the source
  responds (at most the 20-second limit when it does not), and cancel stops it within 1 second.
- **SC-005**: A repeated question about the same holding on the same trading day makes 0 additional source requests.
- **SC-006**: In the opt-in real-source check (≥ 5 live answers over KR and US holdings, maintainer approval), every
  market number in the facts is confirmed by hand against the source's own chart for that date, and the rule/hand
  agreement on unsupported numbers is reported.
- **SC-007**: The research/not-advice notice and the source line are present on 100% of answers.

## Assumptions

- The maintainer's real portfolio is Korean and US listings only; KRX gold spot without quotes is acceptable here.
- The Feature 007 adapter's session, adjustment and indicator rules are reused; only the symbol set, time zones,
  52-week range and caching are added.
- No news source is added (Constitution IX); news questions are answered as not given.
- Real holdings live only in the browser (Feature 009); no real holding or live quote is committed.
- Automated verification uses the Feature 007 market stand-in; the real source is contacted only in the opt-in check.
- Toss Securities (holdings import and quotes, local only), Kiwoom (KRX gold), a provider selection UI, extra
  indicators, public deployment and the Effectiveness Benchmark (now Feature 015) are out of scope.
- Constitution VIII applies: nothing here claims trading quality; real prices do not make the analysis advice.
