# Contract: Quotes for portfolio analysis

## GET /api/market?symbol=<symbol>

- Accepted: the forms in data-model.md "SourceSymbol" (including `IBM`, the demo instrument). Anything else →
  `400 { boundary: 'market-data', stage: 'request', kind: 'invalid-request' }`, no outbound request.
- 200: a `MarketBundle` with `range52w` (validated server-side by `validateBundle`).
- Failures: unchanged status mapping of Feature 007 (`unavailable` also covers insufficient history and stale data;
  `invalid-data` covers a time zone or currency different from the symbol's form).
- Cache (holding symbols; the demo instrument `IBM` stays uncached as in Feature 007): a successful bundle is served from memory for the same `symbol` and analysis date (at most one source
  request per symbol per trading day per instance); failures are not cached.
- `Cache-Control: no-store` as before; the source's field names never leave the adapter.
- Privacy (spec FR-018): the request carries the symbol only; the route's log line keeps adapter, time, status class
  and failure kind — never the symbol.

## Browser (src/quotes.ts)

- `yahooSymbol(instrument, currency): string | null` (shared, pure)
- `liveInstrumentFacts(bundle): InstrumentFacts` (pure)
- `fetchQuotes(holdings, signal): Promise<Map<identity, QuoteResult>>` — one request per distinct symbol, parallel;
  a non-quotable holding makes no request; abort → rejects with the abort reason, no run starts.
- `liveFixture(quotes): { id: 'yahoo-live', instruments }` — the argument `factSet(h, fixture)` already takes; holdings without a
  bundle are absent, so `factSet` writes "Market data not available" (existing branch).

## bta-analyze detail

Adds `dataSource` (data-model.md); `src/main.ts` copies it into the record.
