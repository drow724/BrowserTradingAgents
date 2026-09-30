// DETERMINISTIC_TEST: Feature 014 live quotes in the browser — bundle → fixture-shaped facts, the quote phase with a
// fake fetch, and the fixture facts unchanged (SC-002). No network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { factSet, money, toInput } from '../src/analysis/facts.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';
import { computeIndicators, type MarketBundle, type Session } from '../src/market-bundle.ts';
import { identity, type Holding } from '../src/portfolio.ts';
import { fetchQuotes, liveDataSource, liveFixture, liveInstrumentFacts, type QuoteResult } from '../src/quotes.ts';

const history: Session[] = JSON.parse(readFileSync('test/fixtures/market/history.json', 'utf8'));
const bundle = (symbol: string, currency: string, scale = 1): MarketBundle => {
  const h = history.map((s) => ({ ...s, open: s.open * scale, high: s.high * scale, low: s.low * scale, close: s.close * scale }));
  return { symbol, currency, provider: 'yahoo-chart@1', adjustment: 'split-dividend', analysisDate: '2026-01-09',
    marketAsOf: h.at(-1)!.date, acquiredAt: '2026-01-09T08:00:00.000Z', historySessions: h.length, latest: h.at(-1)!,
    indicators: computeIndicators(h), recent: h.slice(-30),
    range52w: { high: Math.max(...h.slice(-252).map((s) => s.high)), low: Math.min(...h.slice(-252).map((s) => s.low)) } };
};
const T = '2026-09-30T00:00:00.000Z';
const samsung: Holding = { instrument: { kind: 'listing', assetClass: 'KR', ticker: '005930', name: '삼성전자', market: 'KOSPI', productType: 'stock' }, quantity: 10, averagePrice: 70_000, currency: 'KRW', editedAt: T };
const oracle: Holding = { instrument: { kind: 'listing', assetClass: 'US', ticker: 'ORCL', name: 'Oracle', market: 'NYSE', productType: 'stock' }, quantity: 3, averagePrice: 150, currency: 'USD', editedAt: T };
const gold: Holding = { instrument: { kind: 'fixed', id: 'KRX-GOLD' }, quantity: 10, averagePrice: 130_000, currency: 'KRW', editedAt: T };

test('liveInstrumentFacts: latest close and date, the three market lines of R6, no news', () => {
  const b = bundle('005930.KS', 'KRW', 1000), r = b.recent;
  const f = liveInstrumentFacts(b);
  const chg = (r.at(-1)!.close / r.at(-21)!.close - 1) * 100, sma = b.indicators.close_50_sma;
  assert.equal(f.latestPrice, b.latest.close);
  assert.equal(f.asOf, b.marketAsOf);
  assert.equal(f.currency, 'KRW');
  assert.deepEqual(f.market, [
    `The price ${chg >= 0 ? 'rose' : 'fell'} ${Math.abs(chg).toFixed(1)}% over the last 20 sessions.`,
    `The price is ${b.latest.close >= sma ? 'above' : 'below'} its 50-day moving average of ${money(sma, 'KRW')}.`,
    `The 52-week high is ${money(b.range52w.high, 'KRW')} and the 52-week low is ${money(b.range52w.low, 'KRW')}.`,
  ]);
  assert.deepEqual(f.news, ['No news is supplied for this holding.']);
});

test('factSet on live facts: holding, derived, three market facts and one news fact, values from the bundle', () => {
  const b = bundle('005930.KS', 'KRW', 1000);
  const q = new Map<string, QuoteResult>([[identity(samsung.instrument), { symbol: '005930.KS', bundle: b }]]);
  const fx = liveFixture(q);
  assert.equal(fx.id, 'yahoo-live');
  const s = factSet(samsung, fx);
  assert.equal(s.id, 'yahoo-live:KR:005930');
  assert.deepEqual(s.facts.map((f) => f.id), ['H1', 'H2', 'H3', 'D1', 'D2', 'D3', 'M1', 'M2', 'M3', 'N1']);
  assert.equal(s.facts[3].text, `Latest price (${b.marketAsOf}): ${money(b.latest.close, 'KRW')}.`);
  assert.ok(!s.facts.some((f) => /fictional/.test(f.text)));
});

test('fetchQuotes: one request per distinct symbol, in parallel; gold not requested; failures and mismatches typed', async () => {
  const asked: string[] = [];
  let open = 0, peak = 0;
  const get = (async (url: string) => {
    const symbol = new URL(url, 'http://app').searchParams.get('symbol')!;
    asked.push(symbol); open++; peak = Math.max(peak, open);
    await new Promise((r) => setTimeout(r, 10)); open--;
    if (symbol === 'ORCL') return Response.json({ boundary: 'market-data', stage: 'acquisition', kind: 'timeout' }, { status: 504 });
    return Response.json(bundle(symbol, /\.K[SQ]$/.test(symbol) ? 'KRW' : 'USD'));
  }) as unknown as typeof fetch;
  const btc: Holding = { instrument: { kind: 'fixed', id: 'BTC' }, quantity: 1, averagePrice: 1, currency: 'KRW', editedAt: T };
  const kakaoInUsd: Holding = { ...samsung, instrument: { ...samsung.instrument, ticker: '035720' } as Holding['instrument'], currency: 'USD' };
  const q = await fetchQuotes([samsung, samsung, oracle, gold, btc, kakaoInUsd], new AbortController().signal, get);
  assert.deepEqual(asked.sort(), ['005930.KS', '035720.KS', 'ORCL']);
  assert.equal(peak, 3);
  assert.equal((q.get('KR:005930') as { bundle: MarketBundle }).bundle.symbol, '005930.KS');
  assert.deepEqual(q.get('US:ORCL'), { symbol: 'ORCL', unavailable: 'timeout' });
  assert.deepEqual(q.get('KRX-GOLD'), { symbol: null, unavailable: 'not-quotable' });
  assert.deepEqual(q.get('BTC'), { symbol: null, unavailable: 'not-quotable' }); // F014-R3
  assert.deepEqual(q.get('KR:035720'), { symbol: '035720.KS', unavailable: 'currency-mismatch' }); // served in USD here
  assert.deepEqual(Object.keys(liveFixture(q).instruments), ['KR:005930']);
});

test('fetchQuotes: an invalid body is invalid-data; abort rejects', async () => {
  const bad = (async () => Response.json({ symbol: 'x' })) as unknown as typeof fetch;
  assert.deepEqual((await fetchQuotes([samsung], new AbortController().signal, bad)).get('KR:005930'),
    { symbol: '005930.KS', unavailable: 'invalid-data' });
  const ac = new AbortController();
  const hang = ((_: string, init: RequestInit) => new Promise((_, no) => init.signal!.addEventListener('abort', () => no(init.signal!.reason)))) as unknown as typeof fetch;
  const pending = fetchQuotes([samsung], ac.signal, hang);
  ac.abort(new Error('cancelled by user'));
  await assert.rejects(pending, /cancelled by user/);
});

test('liveDataSource: provider, symbol, date and digest for a quote; the kind for an unavailable one', async () => {
  const b = bundle('ORCL', 'USD');
  const d = await liveDataSource({ symbol: 'ORCL', bundle: b });
  assert.equal(d.mode, 'portfolio-live');
  assert.deepEqual({ ...d, snapshotDigest: undefined }, { mode: 'portfolio-live', provider: 'yahoo-chart@1', symbol: 'ORCL', marketAsOf: b.marketAsOf, snapshotDigest: undefined });
  assert.match(String(d.snapshotDigest), /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(await liveDataSource({ symbol: null, unavailable: 'not-quotable' }), { mode: 'portfolio-live', symbol: null, unavailable: 'not-quotable' });
});

test('SC-002: fixture facts of the measurement set are byte-identical to Feature 013', () => {
  const qs = JSON.parse(readFileSync('test/fixtures/grounding/questions.json', 'utf8')).questions as { id: string; text: string; expect: string[] }[];
  const lines: string[] = [];
  for (const q of qs) for (const id of q.expect) for (const mode of ['current', 'formatted', 'refs'] as const) {
    const h = (PORTFOLIO_FIXTURE.portfolio as Holding[]).find((x) => identity(x.instrument) === id)!;
    lines.push(JSON.stringify([q.id, id, mode, factSet(h), toInput(factSet(h), h, q.text, mode)]));
  }
  assert.equal(lines.length, 99);
  assert.equal(`sha256:${createHash('sha256').update(lines.join('\n')).digest('hex')}`,
    'sha256:12e42276354494221a26f0fc1cb59c26698f8262bc2ecdb73ee3fa9e2586f66b');
});
