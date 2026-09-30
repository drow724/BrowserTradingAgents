# Data Model: Feature 014 — Live Quotes for Portfolio Analysis

## QuoteSource

`'live' | 'fixture'` — from `?quotes=` at run time; default `live`. The example-portfolio button sets `fixture`;
saving holdings from the editor removes it (back to `live`).

## SourceSymbol (R1)

| Holding | Symbol | Currency | Exchange time zone |
|---|---|---|---|
| KR listing, market KOSPI | `<6 digits>.KS` | KRW | Asia/Seoul |
| KR listing, market KOSDAQ | `<6 digits>.KQ` | KRW | Asia/Seoul |
| US listing | ticker, `.` → `-`, `^[A-Z]{1,5}(-[A-Z]{1,2})?$` | USD | America/New_York |
| BTC (F014-R3), KRX gold spot, KONEX, other | not quotable | – | – |

## MarketBundle (Feature 007) — additions

- `range52w: { high: number; low: number }` — max unadjusted high / min unadjusted low of the sessions within one
  calendar year before the analysis date (Yahoo's own 52-week window). Validation: finite, `low > 0`, `low ≤ latest.low`,
  `high ≥ latest.high`.
- Everything else unchanged (`symbol`, `currency`, `provider`, `marketAsOf`, `latest`, `indicators`, `recent[≤30]`, …).

## QuoteResult (browser)

`{ symbol, bundle }` or `{ symbol | null, unavailable: 'not-quotable' | MarketDataFailure['kind'] | 'currency-mismatch' }`,
one per holding identity.

## Live InstrumentFacts (R6)

The fixture's `InstrumentFacts`: `{ latestPrice, currency, asOf, market: [3 lines], news: ['No news is supplied for
this holding.'] }`. `liveFixture` has the id `yahoo-live`, so a live fact set id is `yahoo-live:<holding identity>`;
each holding's quote date is in its `dataSource.marketAsOf` (KR and US dates can differ within one overview).

## Analysis dataSource (evidence)

- fixture: `{ mode: 'portfolio-fixture', fixture: 'portfolio-fixture@1' }` (unchanged)
- live, quoted: `{ mode: 'portfolio-live', provider: 'yahoo-chart@1', symbol, marketAsOf, snapshotDigest }`
- live, unavailable: `{ mode: 'portfolio-live', symbol: string | null, unavailable: <kind> }`

## Ledger price basis

`source: 'latest-fixture' | 'latest-live' | 'average'` — `latest-live` = the run's live latest price;
`latest-fixture` only for fixture runs.
