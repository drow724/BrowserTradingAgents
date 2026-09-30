// Feature 014 (contracts/quotes.md): live quotes for portfolio analysis. The same-origin market boundary returns
// Feature 007 bundles; this module turns them into the fixture's InstrumentFacts shape, so factSet(), the graph,
// the checker and the number modes run unchanged on live facts (research R6). Only the source symbol leaves the
// browser (spec FR-018).
import { money } from './analysis/facts.ts';
import type { InstrumentFacts } from './analysis/portfolio-fixture.ts';
import { fail, isFailure, snapshotDigest, validateBundle, yahooSymbol, type MarketBundle } from './market-bundle.ts';
import { identity, type Holding } from './portfolio.ts';

export type QuoteResult = { symbol: string; bundle: MarketBundle } | { symbol: string | null; unavailable: string };

export function liveInstrumentFacts(b: MarketBundle): InstrumentFacts {
  const c = b.currency as 'KRW' | 'USD', close = b.latest.close, sma = b.indicators.close_50_sma;
  const change = (close / b.recent.at(-21)!.close - 1) * 100; // `recent` holds 30 sessions
  return { latestPrice: close, currency: c, asOf: b.marketAsOf, market: [
    `The price ${change >= 0 ? 'rose' : 'fell'} ${Math.abs(change).toFixed(1)}% over the last 20 sessions.`,
    `The price is ${close >= sma ? 'above' : 'below'} its 50-day moving average of ${money(sma, c)}.`,
    `The 52-week high is ${money(b.range52w.high, c)} and the 52-week low is ${money(b.range52w.low, c)}.`,
  ], news: ['No news is supplied for this holding.'] };
}

// The argument factSet(h, fixture) takes; holdings without a quote are absent, so factSet writes
// "Market data not available" for them (its existing branch).
export const liveFixture = (quotes: Map<string, QuoteResult>) => ({ id: 'yahoo-live', instruments: Object.fromEntries(
  [...quotes].flatMap(([id, q]) => ('bundle' in q ? [[id, liveInstrumentFacts(q.bundle)]] : []))) });

// One request per distinct quotable symbol, all in parallel; an abort rejects the whole phase (no run starts).
export async function fetchQuotes(holdings: Holding[], signal: AbortSignal, get: typeof fetch = fetch) {
  const symbols = new Map(holdings.map((h) => [identity(h.instrument), yahooSymbol(h.instrument)]));
  const one = async (symbol: string) => {
    try {
      const body: unknown = await (await get(`/api/market?symbol=${encodeURIComponent(symbol)}`, { signal, cache: 'no-store' })).json();
      return isFailure(body) ? body : validateBundle(body);
    } catch (e) {
      if (signal.aborted) throw signal.reason;
      return e instanceof SyntaxError ? fail('normalization', 'invalid-data') : fail('acquisition', 'network');
    }
  };
  const unique = [...new Set([...symbols.values()].filter((s): s is string => !!s))];
  const got = new Map(await Promise.all(unique.map(async (s) => [s, await one(s)] as const)));
  return new Map(holdings.map((h): [string, QuoteResult] => {
    const id = identity(h.instrument), symbol = symbols.get(id)!;
    if (!symbol) return [id, { symbol: null, unavailable: 'not-quotable' }];
    const r = got.get(symbol)!;
    if (isFailure(r)) return [id, { symbol, unavailable: r.kind }];
    return [id, r.currency === h.currency ? { symbol, bundle: r } : { symbol, unavailable: 'currency-mismatch' }];
  }));
}

// The evidence record's data source for one live run (data-model.md "Analysis dataSource").
export const liveDataSource = async (q: QuoteResult) => ('bundle' in q
  ? { mode: 'portfolio-live', provider: q.bundle.provider, symbol: q.symbol, marketAsOf: q.bundle.marketAsOf,
    snapshotDigest: await snapshotDigest(q.bundle) }
  : { mode: 'portfolio-live', symbol: q.symbol, unavailable: q.unavailable });
