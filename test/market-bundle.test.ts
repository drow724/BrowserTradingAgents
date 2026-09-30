// DETERMINISTIC_TEST (L1): the Feature 007 market bundle without any network. Golden indicator values
// come from test/fixtures/market/generate-golden.py (observed stockstats 0.6.8 in the frozen
// TradingAgents venv) on a synthetic series; Python is not needed to run these tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import {
  computeIndicators, INDICATOR_NAMES, isFailure, marketFactsDigest, renderMarketFacts, replayArtifact,
  sessionDate, snapshotDigest, symbolInstrument, validateBundle, yahooSymbol, type MarketBundle, type Session,
} from '../src/market-bundle.ts';

globalThis.fetch = () => { throw new Error('network access attempted in an L1 test'); };

const history: Session[] = JSON.parse(readFileSync('test/fixtures/market/history.json', 'utf8'));
const golden: { rows: Record<string, Record<string, number>> } =
  JSON.parse(readFileSync('test/fixtures/market/golden.json', 'utf8'));

// |actual − expected| ≤ 1e-9 · max(1, |expected|); non-finite values are rejected first.
function near(actual: number, expected: number, what: string) {
  assert.ok(Number.isFinite(actual), `${what}: actual not finite (${actual})`);
  assert.ok(Number.isFinite(expected), `${what}: expected not finite (${expected})`);
  assert.ok(Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)),
    `${what}: ${actual} vs golden ${expected}`);
}

const FAMILIES: [string, string[]][] = [
  ['SMA', ['close_50_sma', 'close_200_sma']], ['EMA', ['close_10_ema']], ['MACD', ['macd', 'macds', 'macdh']],
  ['RSI', ['rsi']], ['Bollinger', ['boll', 'boll_ub', 'boll_lb']], ['ATR', ['atr']], ['VWMA', ['vwma']],
];
test('golden: the 12 names are the reference prompt set, and golden covers exactly them', () => {
  assert.equal(INDICATOR_NAMES.length, 12);
  assert.deepEqual(FAMILIES.flatMap(([, n]) => n).sort(), [...INDICATOR_NAMES].sort());
  for (const vals of Object.values(golden.rows)) assert.deepEqual(Object.keys(vals).sort(), [...INDICATOR_NAMES].sort());
});
for (const [family, names] of FAMILIES) {
  test(`golden ${family}: prefix computation equals stockstats at every golden row`, () => {
    for (const [row, vals] of Object.entries(golden.rows)) {
      const got = computeIndicators(history.slice(0, Number(row) + 1)); // causal: prefix up to the row
      for (const n of names) near(got[n as keyof typeof got], vals[n], `${n}@${row}`);
    }
  });
}
test('golden: values exist before a window fills (no warm-up N/A): 200 SMA at row 30', () => {
  const got = computeIndicators(history.slice(0, 31));
  assert.ok(Number.isFinite(got.close_200_sma));
  near(got.close_200_sma, golden.rows['30'].close_200_sma, 'close_200_sma@30');
});

// ---- a valid bundle built from the synthetic history ----
const recent = history.slice(-30);
const bundle = (): MarketBundle => ({
  symbol: 'IBM', currency: 'USD', provider: 'yahoo-chart@1', adjustment: 'split-dividend',
  analysisDate: '2026-01-09', marketAsOf: recent.at(-1)!.date, acquiredAt: '2026-01-09T15:00:00.000Z',
  historySessions: history.length, latest: { ...recent.at(-1)! }, indicators: computeIndicators(history),
  recent: recent.map((s) => ({ ...s })),
  range52w: { high: Math.max(...history.slice(-252).map((s) => s.high)), low: Math.min(...history.slice(-252).map((s) => s.low)) },
});
test('fixture sanity: the synthetic sessions satisfy the Session rules', () => {
  assert.ok(!isFailure(validateBundle(bundle())));
});

test('validate: a valid bundle passes and comes back in canonical key order', () => {
  const v = validateBundle({ ...bundle(), extra: 'dropped' });
  assert.ok(!isFailure(v));
  assert.deepEqual(Object.keys(v), ['symbol', 'currency', 'provider', 'adjustment', 'analysisDate', 'marketAsOf',
    'acquiredAt', 'historySessions', 'latest', 'indicators', 'recent', 'range52w']);
});

const invalid: [string, (b: MarketBundle) => unknown][] = [
  ['not an object', () => null],
  ['non-increasing dates', (b) => { b.recent[5].date = b.recent[4].date; return b; }],
  ['latest after analysisDate', (b) => ({ ...b, analysisDate: '2020-01-01' })],
  ['price not > 0', (b) => { b.recent[0].open = 0; return b; }],
  ['non-finite price', (b) => { b.recent[0].close = Infinity; return b; }],
  ['low above min(open, close)', (b) => { b.recent[0].low = Math.min(b.recent[0].open, b.recent[0].close) + 1; return b; }],
  ['high below max(open, close)', (b) => { b.recent[0].high = Math.max(b.recent[0].open, b.recent[0].close) - 1; return b; }],
  ['volume not an integer', (b) => { b.recent[0].volume = 1.5; return b; }],
  ['volume negative', (b) => { b.recent[0].volume = -1; return b; }],
  ['recent empty', (b) => ({ ...b, recent: [] })],
  ['recent longer than 30', (b) => ({ ...b, recent: [history[0], ...b.recent] })],
  ['historySessions below 260', (b) => ({ ...b, historySessions: 259 })],
  ['indicator missing', (b) => { delete (b.indicators as Partial<MarketBundle['indicators']>).vwma; return b; }],
  ['indicator extra', (b) => ({ ...b, indicators: { ...b.indicators, mfi: 50 } })],
  ['indicator NaN', (b) => { b.indicators.rsi = NaN; return b; }],
  ['latest ≠ last recent', (b) => ({ ...b, latest: { ...b.recent[0] } })],
  ['marketAsOf ≠ latest date', (b) => ({ ...b, marketAsOf: b.recent[0].date })],
  ['wrong adjustment', (b) => ({ ...b, adjustment: 'none' })],
];
for (const [name, mutate] of invalid) {
  test(`validate: ${name} → invalid-data (normalization)`, () => {
    assert.deepEqual(validateBundle(mutate(bundle())), { boundary: 'market-data', stage: 'normalization', kind: 'invalid-data' });
  });
}

test('validate: an ulp-scale high < max(open, close) from the adjustment ratio is not a violation', () => {
  const b = bundle(); const s = b.recent.at(-1)!;
  s.high = Math.max(s.open, s.close) * (1 - 1e-15); b.latest = { ...s }; // ulp-scale shortfall
  assert.ok(!isFailure(validateBundle(b)));
});

test('render: every tag, two-decimal formatting only here, deterministic', () => {
  const b = bundle();
  const text = renderMarketFacts(b);
  for (const tag of ['market fact L1', 'market fact L2', 'market fact L3', 'market fact L4']) assert.ok(text.includes(tag), tag);
  assert.ok(text.includes(b.latest.close.toFixed(2)));
  assert.equal(renderMarketFacts(bundle()), text);
});

test('digests: stable for equal bundles, different when a value changes', async () => {
  assert.equal(await snapshotDigest(bundle()), await snapshotDigest(bundle()));
  const changed = bundle(); changed.indicators.rsi += 1e-6;
  assert.notEqual(await snapshotDigest(changed), await snapshotDigest(bundle()));
  assert.match(await marketFactsDigest('x'), /^sha256:[0-9a-f]{64}$/);
});

test('replay: an artifact re-renders and re-digests to itself', async () => {
  const r = await replayArtifact(bundle());
  assert.equal(renderMarketFacts(r.bundle), r.marketFacts);
  assert.equal(await snapshotDigest(r.bundle), r.snapshotDigest);
  assert.equal(await marketFactsDigest(r.marketFacts), r.marketFactsDigest);
});

test('time zone: session dates and digests are identical under TZ=UTC and TZ=Asia/Seoul (SC-011)', () => {
  const script = `import('./src/market-bundle.ts').then(async (m) => {
    const d = [1767968400, 1767985200, 1768003200].map((t) => m.sessionDate(t, 'America/New_York'));
    const h = JSON.parse(require('fs').readFileSync('test/fixtures/market/history.json', 'utf8'));
    const r = h.slice(-30);
    const b = { symbol: 'IBM', currency: 'USD', provider: 'p', adjustment: 'split-dividend', analysisDate: '2026-01-09',
      marketAsOf: r.at(-1).date, acquiredAt: 'x', historySessions: h.length, latest: r.at(-1),
      indicators: m.computeIndicators(h), recent: r, range52w: { high: 1e9, low: 1e-9 } };
    console.log(JSON.stringify([d, await m.snapshotDigest(b)]));
  });`;
  const run = (tz: string) => execFileSync(process.execPath, ['--no-warnings', '-e', script],
    { env: { ...process.env, TZ: tz }, encoding: 'utf8' });
  const utc = run('UTC');
  assert.equal(run('Asia/Seoul'), utc);
  // 2026-01-09 14:20Z (09:20 ET), 19:00Z (14:00 ET), 2026-01-10 00:00Z (19:00 ET, still Jan 9 in ET)
  assert.deepEqual(JSON.parse(utc)[0], ['2026-01-09', '2026-01-09', '2026-01-09']);
});

test('sessionDate: a New York session date does not depend on UTC midnight', () => {
  assert.equal(sessionDate(1768003200, 'America/New_York'), '2026-01-09');
  assert.equal(sessionDate(1768003200, 'UTC'), '2026-01-10');
});

test('replay: local .local/replay/*.json bundle artifacts re-render and re-digest to themselves (no network)', async (t) => {
  const dir = '.local/replay';
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  const artifacts = files.map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))).filter((r) => r.bundle);
  if (!artifacts.length) { t.skip('no local Feature 007 replay artifact in .local/replay/'); return; }
  for (const r of artifacts) {
    assert.ok(!isFailure(validateBundle(r.bundle)));
    assert.equal(renderMarketFacts(r.bundle), r.marketFacts);
    assert.equal(await snapshotDigest(r.bundle), r.snapshotDigest);
    assert.equal(await marketFactsDigest(r.marketFacts), r.marketFactsDigest);
  }
});

// ---- Feature 014: holding symbols (research R1, R2) and the 52-week range (R4) ----
const kr = (ticker: string, market: string) => ({ kind: 'listing', assetClass: 'KR', ticker, name: 'x', market, productType: 'stock' }) as const;
const us = (ticker: string) => ({ kind: 'listing', assetClass: 'US', ticker, name: 'x', market: 'NASDAQ', productType: 'stock' }) as const;
test('yahooSymbol: KR by market, US class shares; BTC, gold and others not quotable', () => {
  assert.equal(yahooSymbol(kr('005930', 'KOSPI')), '005930.KS');
  assert.equal(yahooSymbol(kr('035720', 'KOSDAQ')), '035720.KQ');
  assert.equal(yahooSymbol(kr('123456', 'KONEX')), null);
  assert.equal(yahooSymbol(us('ORCL')), 'ORCL');
  assert.equal(yahooSymbol(us('BRK.B')), 'BRK-B');
  assert.equal(yahooSymbol(us('ABC$D')), null);
  assert.equal(yahooSymbol(us('TOOLONG')), null);
  assert.equal(yahooSymbol({ kind: 'fixed', id: 'BTC' }), null); // F014-R3
  assert.equal(yahooSymbol({ kind: 'fixed', id: 'KRX-GOLD' }), null);
});
test('symbolInstrument: currency and zone per symbol form; anything else null', () => {
  assert.deepEqual(symbolInstrument('005930.KS'), { symbol: '005930.KS', currency: 'KRW', timeZone: 'Asia/Seoul' });
  assert.equal(symbolInstrument('035720.KQ')?.timeZone, 'Asia/Seoul');
  assert.deepEqual(symbolInstrument('IBM'), { symbol: 'IBM', currency: 'USD', timeZone: 'America/New_York' });
  assert.equal(symbolInstrument('BRK-B')?.currency, 'USD');
  for (const bad of ['', 'ibm', '5930.KS', '005930.KX', 'BTC-KRW', 'BTC-EUR', 'IBM/../', 'A B', '../x']) assert.equal(symbolInstrument(bad), null, bad);
});
test('validateBundle: range52w is required, finite and encloses the latest session', () => {
  const { range52w: _, ...without } = bundle();
  assert.ok(isFailure(validateBundle(without)));
  const b = bundle();
  assert.ok(isFailure(validateBundle({ ...b, range52w: { high: b.latest.high - 1, low: b.range52w.low } })));
  assert.ok(isFailure(validateBundle({ ...b, range52w: { high: b.range52w.high, low: b.latest.low + 1 } })));
  assert.ok(isFailure(validateBundle({ ...b, range52w: { high: Infinity, low: b.range52w.low } })));
  assert.deepEqual((validateBundle(b) as MarketBundle).range52w, b.range52w);
});
