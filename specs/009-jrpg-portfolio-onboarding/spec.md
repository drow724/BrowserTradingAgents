# Feature Specification: Feature 009 — JRPG Fullscreen Shell, Portfolio Onboarding and Own Pixel Renderer

**Feature Branch**: `009-jrpg-portfolio-onboarding`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "The whole app becomes a JRPG-like fullscreen pixel-art UI. First visit:
portfolio onboarding (Bitcoin, KRX gold spot, Korean stocks, US stocks; symbol search over a directory
the server refreshes at most once a day and the browser caches; quantity and average purchase price).
Returning visit: straight into a fullscreen pixel office where the eight roles work at their desks,
drawn by our own lightweight renderer from the Feature 008 view state. Paper trading only. Specify only."

## Purpose

Core question: **Can a user open the app, describe what they hold in a game-like onboarding, and from
then on land directly in a fullscreen pixel office that shows the existing eight-role run as it
happens, while holdings never leave the browser and nothing about how the run executes changes?**

This Feature is the first step of the portfolio expansion. It delivers the visible shell and the
portfolio data the next Feature will analyse. It does not yet make the analysis portfolio-aware.

```text
first visit:     onboarding (JRPG) → portfolio stored in this browser → office
returning visit: office (fullscreen, own renderer) ← Feature 008 view state ← existing status surface
```

## Clarifications

### Session 2026-09-29

- Q: Should the symbol directory include ETFs and other listed products, not only common stocks? → A: C — every listed product the sources carry: common and preferred stocks, ETFs, ETNs, REITs, including KONEX (Korea) and NYSE/Nasdaq/NYSE American listings (US).
- Q: In which language should the JRPG shell's dialog, menus and onboarding text be written? → A: B — Korean for the new shell (onboarding, dialog box, menus, portfolio and results windows); role names, the Feature 008 text status and evidence records stay in English.
- Q: In which currency is Bitcoin's average purchase price entered? → A: C — chosen per holding, KRW or USD; the choice is stored with the holding.

## Maintainer decisions (2026-09-29)

| ID | Decision |
|---|---|
| MD-1 | Paper trading only. No broker API, no real order, no order-like action (Constitution IX, Non-Goals). |
| MD-2 | This expansion comes before the Effectiveness Benchmark. The benchmark moves to a later Feature number. |
| MD-3 | Renderer: an own lightweight renderer (spike option B) draws the fullscreen office. The upstream Pixel Agents webview is not the fullscreen view. |
| MD-4 | Feature 008 decision D5 ("Pixel canvas on demand, off by default") is re-decided: the fullscreen office view is **on by default**, drawn by the own renderer. The Feature 008 opt-in Pixel Agents toggle is not what is turned on. |
| MD-5 | The Feature 008 opt-in Pixel Agents view is retired (answer to Q1, option A). |
| MD-6 | The upstream Pixel Agents art is copied and used as the own renderer's temporary assets; once the renderer works, only the assets are replaced. The repository is public, so the copy stays local-only (F008-L1). |

### Spike findings (scratch, not committed, not gate evidence)

A throwaway page replayed committed Feature 008 traces through the Feature 008 reducer and drew the
same view state two ways. Dev server, headless Chromium, 1440×900 viewport, main-thread busy ratio
over 10 s, three repetitions, no model and no acquisition involved:

| Variant | Busy ratio (%) | Notes |
|---|---|---|
| Dialog box only (baseline) | 1.47 / 1.73 / 2.14 | no office drawn |
| Own renderer (B) | 2.07 / 1.92 / 2.25 | about +0.3 pp; 320×192 world scaled up with nearest-neighbour pixels; redrawn 4 times a second |
| Pixel Agents fullscreen (A) | 18.77 / 20.12 / 14.05 | about +16 pp; upstream +Agent / Layout / Settings controls and an "Updated to v1.4" notice visible; fixed-size office centred in the screen |

The in-app browser pane of the Claude desktop app did not boot the sandboxed Pixel Agents frame
(it booted without the sandbox); Playwright Chromium booted it. These findings informed MD-3/MD-4
and are recorded here only as context; the success criteria below are measured anew.

## Baseline

Verified at specification time (2026-09-29):

| Item | Value |
|---|---|
| Branch | `009-jrpg-portfolio-onboarding`, created from `main` |
| Base | `f92e6cc` — merge of PR #9 (Feature 008) |
| Working tree | clean apart from unrelated untracked Spec Kit/Claude tooling |
| Page | one page: title, explanation, availability/mode lines, Run/Cancel, a status line, an eight-row role table, the Feature 008 execution view, result, runtime, market snapshot, evidence, replay |
| Status surface | `src/main.ts` writes run state into fixed page elements; Feature 008 observes them read-only |
| Protected | `src/main.ts` sha256 `bd34bf98…32d4bf`; `runGraph` section sha256 `922db752…f38ec8` |
| Feature 008 | text execution view always on; Pixel Agents canvas opt-in (D5); F008-L1 (upstream sprite licence for public redistribution) OPEN; F008-008 cosmetic OPEN |
| Run input | one symbol (IBM in practice, Feature 007 R-L3), fixture or live data, stand-in or native model |
| Portfolio | none; no storage of user holdings anywhere |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — First visit opens the onboarding (Priority: P1)

A user opens the app for the first time in this browser. Instead of the current plain page, a
fullscreen pixel-art screen greets them in a JRPG style (framed dialog box, pixel font) and leads them
into describing their portfolio.

**Why this priority**: This is the entry point of the new product and the first thing anyone sees.

**Independent Test**: Open the app in a browser profile with no stored portfolio; the onboarding
appears fullscreen, and no office or run controls are shown until onboarding ends.

**Acceptance Scenarios**:

1. **Given** no portfolio and no onboarding record in this browser, **When** the user opens the app,
   **Then** the fullscreen onboarding is shown.
2. **Given** the onboarding is shown, **When** the user finishes it with at least one holding,
   **Then** the portfolio is stored in this browser and the office is shown.
3. **Given** the onboarding is shown, **When** the user chooses to skip, **Then** an empty portfolio
   is recorded as "onboarding finished" and the office is shown; the user can add holdings later.
4. **Given** the user reloads the page in the middle of onboarding, **Then** the onboarding starts
   again and nothing half-entered is treated as a finished portfolio.

---

### User Story 2 — Enter holdings (Priority: P1)

The user adds holdings from four asset classes: Bitcoin, KRX gold spot, Korean stocks and US stocks.
For stocks they search by name or ticker (Korean names for Korean stocks). For every holding they
enter a quantity and an average purchase price.

**Why this priority**: The portfolio is the data every later Feature builds on.

**Independent Test**: With a controlled symbol directory, add one holding from each asset class,
finish, reload, and see the same four holdings with the same quantities and prices.

**Acceptance Scenarios**:

1. **Given** the directory is available, **When** the user types "삼성" in the Korean stock search,
   **Then** matching Korean stocks (for example 삼성전자) are listed with name, ticker and market.
2. **Given** the user types a US ticker or company name (for example "AAPL" or "Apple"), **Then**
   matching US stocks are listed.
3. **Given** Bitcoin or KRX gold spot is chosen, **Then** no search is needed; the user enters only
   quantity and average price.
4. **Given** a quantity or price that is empty, zero, negative or not a number, **Then** the holding
   cannot be saved and the field says why.
5. **Given** a stored portfolio, **When** the user opens the portfolio screen from the office, **Then**
   they can add, edit and remove holdings, and the change persists.
6. **Given** the same instrument is added twice, **Then** the user is told it already exists and is
   offered to edit the existing holding instead.

---

### User Story 3 — Returning visit lands in the office (Priority: P1)

A returning user opens the app and goes straight into a fullscreen pixel office. The eight roles of
the existing graph sit at their desks. When a run starts, the roles visibly start working, finish or
fail as the run proceeds, and a JRPG dialog box narrates each change in Korean (for example "Bull Researcher가 작업을
시작했습니다.").

**Why this priority**: This is the "see it happen" payoff that motivates the whole expansion.

**Independent Test**: With a stored portfolio, open the app; the office is shown fullscreen. Replay a
committed Feature 008 trace (or run the stand-in graph) and see every role change reflected in the
office and the dialog box in order.

**Acceptance Scenarios**:

1. **Given** onboarding finished in this browser, **When** the user opens the app, **Then** the office
   is shown fullscreen without the onboarding.
2. **Given** the office is shown, **When** the user starts a run with the existing controls, **Then**
   the run executes exactly as before and the office reflects each role state of the Feature 008 view
   state (working roles animate; completed, failed, cancelled, stopped and not-run roles are visibly
   distinct).
3. **Given** a run is in progress, **Then** the dialog box shows the latest transitions in order,
   in plain words, and never claims more than the view state knows (no per-role inference or queue
   claims, Feature 008 F008-O1).
4. **Given** the office is shown, **Then** the Feature 008 runtime line (AkariSP state, active,
   queued) is visible as whole-runtime information, not attributed to any role.
5. **Given** the viewport is resized (including a phone-width window), **Then** the office scales to
   fill the available space with crisp pixels and all controls stay reachable.

---

### User Story 4 — Existing controls and outputs stay available (Priority: P1)

Everything a user can do today — pick data and model mode via the existing URL parameters, run,
cancel, read the final decision, runtime, market snapshot, evidence and replay — still works from
inside the new shell.

**Why this priority**: The shell must not break the product that already exists (Features 004–008).

**Independent Test**: The existing browser suites that drive Run/Cancel and read the status surface,
result, evidence and replay pass against the new shell with at most selector-location changes in
tests, and no behaviour change.

**Acceptance Scenarios**:

1. **Given** the office, **When** the user presses Run and then Cancel, **Then** the run starts and is
   cancelled with the same outcomes and evidence as on the current page.
2. **Given** a finished run, **When** the user opens the results panel (a JRPG menu window), **Then**
   the final decision, runtime, evidence record and, in live mode, the market snapshot and replay text
   are shown, with the existing "not investment advice" statement.
3. **Given** `?viz=off`, **Then** no office is drawn and the page still runs with the text status.

---

### User Story 5 — Symbol directory stays fresh without hammering sources (Priority: P2)

The stock search is backed by a directory of Korean and US listings. The app's own server refreshes
it from public sources at most once a day; the browser keeps a local copy, refreshes it at most once
a day and searches it locally.

**Why this priority**: Search must be fast and cheap, and the sources' terms and limits must be
respected; the onboarding still works with a slightly old directory.

**Independent Test**: With controlled source stubs, open the app twice on the same day and once on
the next day; the sources are contacted once per day, the browser downloads the directory once per
day, and typing in search makes no network request.

**Acceptance Scenarios**:

1. **Given** the browser has today's directory, **When** the user types in search, **Then** no network
   request is made.
2. **Given** the browser's copy is from a previous day, **When** the app opens, **Then** it fetches the
   directory once from the app's own server and keeps using the old copy until the new one is stored.
3. **Given** the server's copy is older than a day, **When** the directory is requested, **Then** the
   server refreshes it from the sources once, even if many requests arrive together.
4. **Given** a source is unavailable, **Then** the server keeps serving its last good copy with its
   as-of date; if there has never been a good copy, stock search reports "directory unavailable" and
   Bitcoin and KRX gold spot can still be added.
5. **Given** the directory is shown, **Then** its as-of date is visible in the search screen.

---

### User Story 6 — Holdings stay private (Priority: P2)

Quantities and average prices are personal. They stay in the user's browser.

**Why this priority**: Privacy is a trust boundary; the server has no need for holdings in this Feature.

**Independent Test**: Enter sentinel values for quantity and price; inspect every request the page
makes during onboarding, editing, directory refresh and a full run; none contains the sentinels.

**Acceptance Scenarios**:

1. **Given** holdings with sentinel values, **When** the user uses every screen and runs the graph,
   **Then** no request, URL, header, evidence record or replay text contains the sentinels.
2. **Given** the user chooses "reset portfolio" and confirms, **Then** the stored portfolio and the
   onboarding record are removed from this browser and the next visit starts at onboarding.

---

### User Story 7 — Accessible and calm (Priority: P2)

The shell is keyboard operable and readable by assistive technology, and respects reduced motion.

**Why this priority**: A fullscreen canvas must not lock out users who cannot see or do not want motion.

**Independent Test**: Complete onboarding and start and cancel a run using only the keyboard; with
reduced motion preferred, the office shows static frames; a screen reader reads role states from the
text status.

**Acceptance Scenarios**:

1. **Given** keyboard only, **Then** every onboarding step, the portfolio screen, Run, Cancel and the
   results panel are reachable and operable in a logical order with visible focus.
2. **Given** reduced motion is preferred, **Then** no character or screen animates; states are still
   distinguishable.
3. **Given** a screen reader, **Then** the office canvas is decorative and the Feature 008 text status
   (run, eight roles, runtime) is available as text.

### Edge Cases

- Local storage unavailable (private window, blocked site data, storage error): onboarding still
  works for the session; the user is told the portfolio cannot be saved; the next visit starts at
  onboarding again. Nothing is sent to the server as a fallback.
- Stored portfolio from an unknown future version or unreadable: the app does not crash; it offers to
  reset or keep it read-only and records an anomaly.
- A holding's instrument disappears from a later directory (delisted, renamed): the holding stays as
  entered and is marked "not in current directory".
- Very large quantity or price, or many decimal places: accepted within stated limits (see Assumptions);
  beyond them the field says why.
- Two tabs open: edits in one tab are seen by the other on its next load; no corruption from
  concurrent saves (the last complete save wins).
- A run is in progress while the user opens the portfolio or results window: the run continues; the
  office keeps updating when the window closes.
- Directory download interrupted: the previous local copy stays in use; no half directory is used.
- Sprite or font asset missing: the office falls back to the text status and says the office is
  unavailable; runs are unaffected.
- `?viz=off` combined with first visit: onboarding still appears (it is not the office).

## Requirements *(mandatory)*

### Functional Requirements

**Shell and flow**

- **FR-001**: The app MUST present a fullscreen JRPG-style shell: pixel-art presentation, framed dialog
  and menu windows, and a pixel font covering Latin and Hangul text.
- **FR-001a**: Text written for the new shell (onboarding, dialog box narration, menus, portfolio and
  results window labels, error and empty states) MUST be Korean. Role names (for example "Bull
  Researcher"), the Feature 008 text status, run status values and evidence records MUST stay in English
  and unchanged.
- **FR-002**: On open, the app MUST show the onboarding when this browser has no finished-onboarding
  record, and the office otherwise. The decision MUST use only data stored in this browser.
- **FR-003**: Finishing onboarding (with holdings or by skipping) MUST store a finished-onboarding
  record; an interrupted onboarding MUST NOT.
- **FR-004**: The office MUST offer, at minimum: Run, Cancel, a portfolio window, a results window, and
  the text status. The existing availability and mode lines MUST remain visible or one step away.

**Portfolio**

- **FR-005**: Users MUST be able to add holdings of four asset classes: Bitcoin, KRX gold spot, Korean
  stocks, US stocks.
- **FR-006**: Korean and US stock holdings MUST be chosen from the symbol directory by searching name
  or ticker; Korean stocks MUST be searchable by Korean name. Free-text instruments MUST NOT be accepted.
- **FR-007**: Bitcoin and KRX gold spot MUST be available as fixed instruments without directory search.
- **FR-008**: Each holding MUST have a quantity > 0 and an average purchase price > 0, in the unit and
  currency of its asset class (see Assumptions); for Bitcoin the user MUST choose KRW or USD for the
  average price, and the chosen currency MUST be stored and shown with the holding; invalid values MUST be rejected with a reason.
- **FR-009**: Users MUST be able to add, edit and remove holdings after onboarding; each change MUST
  persist in this browser when saved.
- **FR-010**: One holding per instrument: adding an existing instrument MUST lead to editing it.
- **FR-011**: Users MUST be able to reset the portfolio after an explicit confirmation; reset removes
  the portfolio and the finished-onboarding record.

**Privacy**

- **FR-012**: Holdings (instrument choice, quantity, average price) MUST be stored only in this browser
  and MUST NOT be sent in any request, URL, header, evidence record, replay text or log.
- **FR-013**: The run's inputs, evidence and replay MUST be unchanged by the existence of a portfolio
  in this Feature.

**Symbol directory**

- **FR-014**: The app's own server MUST provide the directory of Korean and US listings through a
  same-origin endpoint; the browser MUST NOT contact directory sources directly.
- **FR-015**: The server MUST contact each directory source at most once per calendar day (per
  deployment instance), including under concurrent requests, and MUST keep its last good copy.
- **FR-016**: The directory MUST cover every listed product the chosen sources carry: common and
  preferred stocks, ETFs, ETNs and REITs, on KOSPI, KOSDAQ and KONEX (Korea) and on every US exchange the sources list: Nasdaq,
  NYSE, NYSE American, NYSE Arca, Cboe BZX and IEX (most US ETFs list on NYSE Arca or Cboe BZX). Each entry MUST carry at least: asset class, product type (stock, preferred,
  ETF, ETN, REIT), display name (Korean name for Korean listings), ticker, market or exchange. The
  directory MUST carry its as-of date. Search results MUST show the product type.
- **FR-017**: The browser MUST store the directory locally, refresh it at most once per day, replace it
  only with a complete download, and search it locally without a network request per keystroke.
- **FR-018**: Directory failures MUST be typed and user-visible ("directory unavailable", "directory
  from <date>") and MUST NOT block adding Bitcoin or KRX gold spot or entering the office.
- **FR-019**: Directory sources, their terms, rate limits and any key requirements MUST be researched
  and recorded before any real source is contacted; contacting a real source MUST be an explicit
  maintainer-approved step, and any key MUST live only in server-side configuration.
- **FR-020**: Controlled tests MUST exercise the directory through controlled source stubs; completion
  MUST NOT depend on real sources being reachable.

**Office (own renderer)**

- **FR-021**: The office MUST be drawn by the application's own renderer from the Feature 008 view
  state, produced by the unchanged Feature 008 observer and reducer from the unchanged status surface.
- **FR-022**: The office MUST show eight distinct characters, one per role in the Feature 004 role
  order, each at a fixed desk with its role name.
- **FR-023**: Every Feature 008 role state that can occur MUST be visually distinct in the office and
  also carried by text (name tag or status), so colour alone never carries meaning.
- **FR-024**: The dialog box MUST narrate run and role transitions in order from the same view state
  and MUST NOT state role-level inference or queueing (Feature 008 FR-011 / F008-O1).
- **FR-025**: The office MUST be on by default whenever the office is shown; `?viz=off` MUST remove it
  (and the Feature 008 view) entirely.
- **FR-026**: The office MUST fill the available screen at an integer pixel scale where possible,
  keep pixels crisp, and keep controls reachable at phone width.
- **FR-027**: Characters, furniture and tiles MUST be loaded as replaceable sprite assets described by
  a small documented layout (frame size, frames, directions), so art can be swapped without renderer
  changes.
- **FR-028**: The renderer MUST stop drawing while the page is hidden and MUST draw static frames when
  reduced motion is preferred.
- **FR-029**: A renderer or asset failure MUST leave the text status and runs working and MUST show
  "office unavailable".
- **FR-030**: The office MUST NOT write to the status surface, start or cancel runs by itself, or
  influence graph, model or AkariSP behaviour (Feature 008 one-way rule).

**Feature 008 Pixel Agents view**

- **FR-031**: The Feature 008 opt-in Pixel Agents view MUST be retired (MD-5): the toggle, the iframe
  path, the Pixel message adapter and sprite decoder, the copied webview (HTML, scripts, styles), the
  scoped cross-origin header and the tests that only cover them are removed. The Feature 008 observer,
  events, reducer and text semantics stay. Feature 008 specs and evidence are not rewritten; the
  retirement is recorded as this Feature's decision.
- **FR-031a**: Until replacement art exists, the own renderer MUST use the upstream Pixel Agents art
  (characters, furniture, floors, walls, pixel font) as its temporary assets (MD-6). They MUST be copied
  at development/build time from the pinned `pixel-agents` package into a git-ignored location, never
  committed to this public repository and never served by a public deployment. The package stays a
  pinned development dependency only as this asset source. Replacing the art MUST need only new asset
  files and their layout description (FR-027), not renderer changes.

**Art, fonts and licensing**

- **FR-032**: Upstream Pixel Agents sprites MAY be used for local/research use only; F008-L1 stays
  OPEN and public deployment stays deferred until replacement art with a verified licence exists.
- **FR-033**: The licence of every font and asset shipped by this Feature MUST be recorded before it
  is committed or served; no asset without a recorded licence may be committed.

**Execution and governance**

- **FR-034**: Graph topology, role prompts, AkariSP, the model modes and the data modes MUST NOT change.
- **FR-035**: `src/main.ts` and the `runGraph` section SHOULD keep their protected hashes; if the shell
  cannot host the status surface without changing `src/main.ts`, that MUST be recorded as a finding
  with the smallest change before it is made.
- **FR-036**: No output, window or narration may present analysis as investment advice or suggest an
  order; the existing "not investment advice" statement MUST stay visible in the results window.
- **FR-037**: The roadmap MUST record MD-2 (benchmark moved later), MD-4 (D5 re-decided), MD-5 (Pixel Agents view retired) and MD-6 (temporary upstream art); historical
  Feature 001–008 specs and evidence MUST NOT be rewritten.

### Key Entities

- **Holding**: one instrument the user holds — asset class, instrument (directory entry or fixed
  instrument), quantity, average purchase price, unit and currency (fixed per asset class, except Bitcoin: KRW or USD chosen per holding), last edited
  time. Browser only.
- **Portfolio**: the set of holdings plus a format version and a finished-onboarding record. Browser only.
- **Instrument**: an asset the user can hold — fixed (Bitcoin, KRX gold spot) or a directory entry.
- **Directory entry**: asset class, product type (stock, preferred, ETF, ETN, REIT), display name (Korean name for Korean listings), ticker, market.
- **Symbol directory**: all entries plus as-of date and source provenance; a server copy and a browser copy.
- **Office scene**: the fixed layout of eight desks and decorations and the sprite assets it uses.
- **Narration line**: a plain-words sentence derived from one view-state transition.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user completes onboarding with one holding of each asset class in under
  3 minutes, using mouse or keyboard only (a human measure: verified by the maintainer with the
  quickstart, not by an automated timer).
- **SC-002**: A returning user sees the office within 2 seconds of the page becoming interactive,
  with no onboarding step.
- **SC-003**: Stock search shows matching results within 100 ms of each keystroke for a directory of
  the full Korean and US listings, with 0 network requests while typing.
- **SC-004**: Holdings survive reload and browser restart: 100 % of saved holdings reappear with
  identical quantity and price.
- **SC-005**: 0 requests, URLs, headers, evidence records or replay texts contain holding sentinel
  values across onboarding, editing, directory refresh and one full run.
- **SC-006**: Directory sources are contacted at most once per calendar day per server instance under
  100 concurrent directory requests (controlled stubs); the browser downloads the directory at most
  once per day.
- **SC-007**: For every committed Feature 008 execution trace, the office shows each role's final
  state correctly and the dialog narrates every run and role transition in order (100 % of traces).
- **SC-008**: The default office view adds at most 2 percentage points of main-thread busy ratio
  versus `?viz=off` during an active replayed run, with the office visible and animating.
- **SC-009**: The existing deterministic, integration and browser suites pass with no behaviour change;
  the native Prompt API fixture gate completes 8/8 in the new shell.
- **SC-010**: Onboarding, portfolio editing, Run, Cancel and the results window are fully operable by
  keyboard, and with reduced motion preferred no animation runs.
- **SC-011**: `src/main.ts` and `runGraph` hashes unchanged (or a recorded finding per FR-035);
  AkariSP changes 0; graph topology changes 0; new dependencies 0 unless justified in the plan.
- **SC-012**: Every committed font and asset has a recorded licence; public deployment status remains
  "deferred" while F008-L1 is open.

## Constraints

- Constitution IX lists crypto exchange APIs and SEC EDGAR among sources the initial phase must not
  introduce. This Feature needs no prices, so it introduces no crypto exchange or price API. If
  research selects a source listed in IX for the directory, that choice needs the same explicit
  maintainer decision Feature 007 made for Yahoo (R-L1 wording).
- Real directory sources are contacted only after maintainer approval, counted and recorded; no
  scraping workarounds, no credential in the browser.
- Feature 008 contracts (observer, events, reducer, text semantics) are reused, not redefined.

## Assumptions

- Units and currencies per asset class: Bitcoin — quantity in BTC (up to 8 decimals), average price in
  KRW or USD, chosen per holding (clarified 2026-09-29); KRX gold spot — quantity in grams, average price in KRW per gram; Korean stocks — shares, KRW;
  US stocks — shares (fractional allowed, up to 6 decimals), USD.
- Onboarding may be skipped; a skipped onboarding counts as finished with an empty portfolio.
- The run keeps analysing one symbol chosen as today; choosing the run symbol from holdings is
  Feature 010.
- "Once per day" uses the calendar day in Asia/Seoul for both server and browser.
- One portfolio per browser profile; no accounts, sync or export in this Feature.
- The fullscreen office uses a fixed eight-desk room; walking, room editing and multiple rooms are out
  of scope.
- Only Korean is provided for the new shell text; a language switch is out of scope.
- Directory size, including ETFs, ETNs, REITs and preferred shares, is in the low tens of thousands of entries, small enough to keep in the browser.

## Non-Goals

- Prices, valuation, profit and loss, charts, alerts or monitoring of holdings (Feature 010 or later).
- A portfolio-aware graph, question input, paper-trade ledger (Feature 010).
- Any real or simulated order placement in this Feature; any broker or exchange integration.
- Walking characters, pathfinding, room editor, sound.
- Replacing the upstream sprites with new art (tracked by F008-L1; separate work).
- Public deployment.

## Roadmap context

- Features 001–008 complete. This Feature is 009. The Effectiveness Benchmark moves after the
  portfolio expansion (MD-2).
- Planned follow-up: Feature 010 — portfolio-aware analysis with question input and a paper-trade
  ledger, shown in the same office.
