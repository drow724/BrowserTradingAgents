# Research: Feature 009 — JRPG Fullscreen Shell, Portfolio Onboarding and Own Pixel Renderer

All findings are from documentation pages, installed packages and the local tree (2026-09-29).
No directory data endpoint was contacted. Real-source requests during planning: **0**.

## R1 — US listings source

- **Decision**: Nasdaq Trader Symbol Directory, two pipe-delimited files over HTTPS:
  `https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt` (Nasdaq-listed) and
  `https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt` (other US exchanges). Keyless.
- **Fields** (documented at nasdaqtrader.com `symboldirdefs`):
  - nasdaqlisted: Symbol, Security Name, Market Category, Test Issue, Financial Status, Round Lot Size,
    ETF (observed in published samples; the definitions page lists the other fields).
  - otherlisted: ACT Symbol, Security Name, Exchange (A = NYSE American, N = NYSE, P = NYSE Arca,
    Z = Cboe BZX, V = IEX), CQS Symbol, ETF (Y/N), Round Lot Size, Test Issue (Y/N), Nasdaq Symbol.
  - Last line: `File Creation Time: mmddyyyyhhmm` — used as the source as-of.
- **Normalization**: drop `Test Issue = Y` and the footer line; ETF from the ETF column; ETN and preferred
  from Security Name tokens ("ETN", "Exchange Traded Note", "Preferred", "Depositary Shares … Preferred")
  — best-effort (see R9); everything else `stock`.
- **Exchange coverage finding (P-1)**: most US ETFs list on NYSE Arca (P) or Cboe BZX (Z). Spec FR-016
  names only NYSE, Nasdaq and NYSE American. The plan includes **every exchange in the two files**
  (Nasdaq, N, A, P, Z, V) so that ETFs such as SPY (Arca) are searchable, as the clarification intends.
  FR-016 was amended to match (analyze C3, 2026-09-29).
- **Permitted use**: the Symbol Directory page states terms for Nasdaq Fund Network data ("internal
  non-commercial usage only unless separately licensed") and for Events data, but no explicit terms for
  the two directory files. **PERMITTED_USE = UNRESOLVED**; personal research scope; no legal conclusion.
  Constitution IX does not list Nasdaq Trader.
- **Alternatives**: SEC `company_tickers.json` (Constitution IX lists SEC EDGAR; stocks with CIK only, no
  ETF flag; 403 in the 2026-09-28 probe without identified User-Agent) — rejected. Yahoo search (per
  keystroke, undocumented) — rejected by FR-017.

## R2 — Korean listings source

- **Decision**: 공공데이터포털 (data.go.kr), 금융위원회 open APIs, keyed (`serviceKey`):
  - `금융위원회_KRX상장종목정보` (dataset 15094775, `GetKrxListedInfoService/getItemInfo`): itmsNm (Korean
    name), srtnCd (short code), isinCd, mrktCtg (KOSPI / KOSDAQ / KONEX), corpNm, basDt. Covers stocks,
    preferred shares and REITs listed as equities on KOSPI, KOSDAQ and KONEX.
  - `금융위원회_증권상품시세정보` (dataset 15094806, `GetSecuritiesProductInfoService`):
    `getETFPriceInfo`, `getETNPriceInfo` — item name and code per ETF/ETN (price fields ignored).
  - Parameters used: `serviceKey`, `resultType=json`, `numOfRows`, `pageNo`, `beginBasDt` (a 10-day
    window; the latest `basDt` present is kept, because data appears after 13:00 on the next business day).
- **Key**: required. Issued to the maintainer on data.go.kr (the maintainer issues it; Claude never
  creates accounts or handles the key). Server-only env `BTA_DATA_GO_KR_KEY`; never `NEXT_PUBLIC_*`,
  never logged, never in evidence. Missing key → Korean source status `credential-missing`, no request.
- **Traffic**: development tier 10,000 calls/day; this design needs a handful of paged calls per day.
- **Licence**: 공공누리 제4유형 (attribution, **no commercial use, no modification**). Personal
  non-commercial research; attribution shown in the search screen. Whether normalizing into a search
  directory is a "modification" is **UNRESOLVED** — recorded, no legal conclusion; raw values (names,
  codes, market) are passed through unchanged apart from field selection.
- **Constitution IX**: data.go.kr is not in the list. The Feature 007 precedent (R-L1) applies: external
  data enters through an application Feature with explicit maintainer approval of real requests.
- **Product type**: ETF/ETN from the operation that returned the item; preferred from the KRX naming
  convention (name ends in `우`, `우B`, `우C`, or `(전환)`-style suffixes); REIT from names containing
  `리츠` — best-effort (R9); everything else `stock`.
- **Alternatives**: KRX Data Marketplace web JSON (`data.krx.co.kr` getJsonData with OTP) — undocumented
  site internals, rejected (no scraping workarounds). KRX OPEN API (`openapi.krx.co.kr`) — key and
  separate approval; a candidate if data.go.kr proves insufficient. KIND corpList download — stocks only,
  no ETF/ETN.

## R3 — Fixed instruments

- **Bitcoin**: one fixed instrument `BTC` ("비트코인"); no price or exchange API (Constitution IX lists
  crypto exchange APIs; this Feature needs no prices).
- **KRX gold spot**: one fixed instrument `KRX-GOLD` ("KRX 금현물"), quantity in grams. KRX's gold market
  trades 1 kg and mini (100 g) contracts, both quoted per gram, so one per-gram instrument covers both.

## R4 — Daily refresh and caching

- **Server**: module-level cache per source: `{ day, snapshot, lastGood, inflight }`. "Day" is the
  Asia/Seoul calendar date (`Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' })`). The first
  request of a new day starts one refresh per source; concurrent requests await the same promise
  (single flight). A failed refresh keeps `lastGood` and does not retry until the next day
  (ponytail: per-instance memory — a serverless platform may run several instances, each contacting a
  source at most once per day; persistent storage if that ever matters). Upstream fetch timeout 20 s
  (Feature 007 R-value), `cache: 'no-store'`, route `dynamic = 'force-dynamic'`, `runtime = 'nodejs'`.
- **Browser**: the Cache Storage API (`caches`, available in secure contexts incl. localhost) keeps the
  last complete `/api/directory` response. On app open: if the cached response's fetch day (Seoul) is
  today, use it; otherwise fetch once, and only after the body has fully parsed `put` it into the cache
  (so an interrupted download never replaces the old copy). Search runs over the parsed array in memory.
  - Alternatives: HTTP cache with `max-age` until Seoul midnight — no guarantee to keep a stale copy when
    the refresh fails (`stale-if-error` unsupported in Chrome); IndexedDB — more code for one blob.

## R5 — Portfolio storage

- **Decision**: `localStorage` key `bta.portfolio`, one JSON document `{ version: 1, onboardedAt,
  holdings[] }`, written whole on each save (last complete save wins; two tabs see each other's saves on
  their next load). Every access in try/catch; unavailable storage → session-only mode with a notice.
- **Rationale**: a portfolio is tiny (≪ 5 MB); synchronous reads give the first-visit decision before the
  first paint (no flash of the wrong screen); tests can seed it through Playwright `storageState`.
- **Alternatives**: IndexedDB (async first read → loading state; seeding needs `storageState({ indexedDB })`)
  — more code, no benefit at this size.

## R6 — Pixel font with Hangul

- **Finding**: the upstream `FSPixelSansUnicode-Regular.ttf` (FontStruct, NZWStudios2024, names "Open
  Font License") has 6,702 glyphs and **0 of 11,172 Hangul syllables** (cmap scan). Unusable for the
  Korean shell (FR-001a).
- **Decision**: Galmuri11 (quiple/galmuri), SIL Open Font License 1.1 — redistribution allowed with the
  licence text. One woff2 file plus `OFL.txt` committed under `public/fonts/` (FR-033). Obtaining the file
  is a download → **APPROVAL REQUIRED** task at implementation; Hangul coverage is verified with the same
  cmap scan before commit.
- **Alternatives**: npm `galmuri` package (a dependency for one file); NeoDunggeunmo (OFL, less legible
  at small sizes); a system font fallback (not pixel-art).

## R7 — Temporary office art (MD-6)

- **Decision**: keep `pixel-agents@1.4.1` (exact devDependency) as the art source only. The copy script
  is rewritten to copy `node_modules/pixel-agents/dist/assets/{characters,floors,walls,furniture}` into
  git- and vercel-ignored `public/office-art/`, verified against a new pinned inventory digest of those
  directories; nothing is copied when `VERCEL` is set (public deployment shows "office unavailable").
- Sheet geometry (from Feature 008 T016, pinned SHA `3537e140`): characters 112×96 = 7 frames × 3 rows
  (down, up, right) of 16×32; frames 0–2 walk, 3–4 type, 5–6 read. Furniture sprites as listed in
  `furniture-catalog.json`. Floors are grey tiles meant to be tinted; the spike drew its own floor colours.
- The webview (HTML/JS/CSS), shim, message adapter and decoder are retired (FR-031).

## R8 — Renderer design (from the spike)

- 320×192 world canvas, drawn in world pixels, scaled by CSS with `image-rendering: pixelated` to the
  largest size that fits (integer scale when the viewport allows); name tags and state glyphs are DOM
  text over the canvas (crisp, readable, selectable by assistive tech).
- Redraw at 4 Hz with `setInterval`, skipped while `document.hidden`; under reduced motion no interval —
  one draw per view-state change. Measured cost in the spike ≈ +0.3 pp (SC-008 budget 2 pp).
- Eight desks in two rows; roles 7–8 reuse sheets 0–1 with `ctx.filter = 'hue-rotate(180deg)'`
  (Feature 008 identity rule `hueShift 180` for i ≥ 6).
- Scene and sprite layout are data (`office-scene.ts`), so replacing art means new files and new numbers.

## R9 — Product type limitation

- Neither source carries a REIT flag or (US) a preferred/ETN flag. Types for those come from documented
  name rules; misclassification only changes the label shown in search, never which instruments exist.
  Recorded as limitation F009-R1 (LOW).

## R10 — Hosting the status surface

- `src/main.ts` looks up fixed element ids. The shell keeps every one of them in the DOM at all times
  (inside the office HUD or inside closed `<dialog>` windows), so `src/main.ts` and `runGraph` keep their
  hashes (FR-035). Elements inside a closed `<dialog>` are not rendered but their text is written and
  read as before; Playwright text assertions do not require visibility.
- The onboarding overlays the office; the status surface is present but not reachable until onboarding
  ends, which blocks nothing because no run can start without a click on Run.

## R11 — Test seeding

- `playwright.config.ts` `use.storageState` gets an inline state with a finished portfolio for
  `http://localhost:${port}`; all existing suites therefore open into the office unchanged. Onboarding
  tests override it with an empty state.

## R12 — Deferred: scheduled directory build (maintainer discussion 2026-09-29)

- **Considered**: a daily scheduler (e.g. GitHub Actions with the key as a repository secret) that builds the
  directory file and deploys it.
- **Decision**: not in this Feature. The on-demand daily refresh (R4) gives the same freshness with no new
  infrastructure; committing the built directory to this public repository would publicly redistribute
  data whose permitted use is UNRESOLVED (R1, R2); public deployment is deferred (F008-L1).
- **Revisit when**: a public deployment exists and per-instance source calls or source outages matter —
  then a private store (not the repository) is the candidate. Follow-up candidate F009-F1.
