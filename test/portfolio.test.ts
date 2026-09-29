// Feature 009 L1 (T027): portfolio storage and validation. In-memory storage stand-ins; no DOM, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { identity, KEY, load, parseHolding, reset, save, type InstrumentRef, type Portfolio } from '../src/portfolio.ts';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m }; };
const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
const BTC: InstrumentRef = { kind: 'fixed', id: 'BTC' }, GOLD: InstrumentRef = { kind: 'fixed', id: 'KRX-GOLD' };
const KR: InstrumentRef = { kind: 'listing', assetClass: 'KR', ticker: '900001', name: '삼성테스트전자', market: 'KOSPI', productType: 'stock' };
const US: InstrumentRef = { kind: 'listing', assetClass: 'US', ticker: 'ZZSP', name: 'Zeta S&P 500 Test ETF Trust', market: 'NYSE Arca', productType: 'etf' };
const P = (instrument: InstrumentRef, quantity: string, averagePrice: string, currency: 'KRW' | 'USD') => parseHolding({ instrument, quantity, averagePrice, currency });
const field = (r: ReturnType<typeof parseHolding>) => ('error' in r ? r.error.field : 'ok');

test('load: first, ok, unreadable (bad JSON, version ≠ 1, wrong shape), unavailable (storage throws)', () => {
  const s = mem();
  assert.deepEqual(load(s), { state: 'first' });
  const p: Portfolio = { version: 1, onboardedAt: '2026-09-29T00:00:00.000Z', holdings: [] };
  assert.equal(save(p, s), true);
  assert.deepEqual(load(s), { state: 'ok', portfolio: p });
  for (const raw of ['{broken', '{"version":2,"onboardedAt":"x","holdings":[]}', '{"version":1,"holdings":{}}', 'null']) {
    s.m.set(KEY, raw);
    assert.deepEqual(load(s), { state: 'unreadable' }, raw);
  }
  assert.deepEqual(load(broken), { state: 'unavailable' });
  assert.equal(save(p, broken), false);
  assert.equal(reset(broken), false);
  assert.equal(reset(s), true);
  assert.deepEqual(load(s), { state: 'first' });
  // the default store is resolved inside the guard: a throwing `localStorage` getter is `unavailable`
  const d = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    assert.deepEqual(load(), { state: 'unavailable' });
    assert.equal(save(p), false);
    assert.equal(reset(), false);
  } finally { if (d) Object.defineProperty(globalThis, 'localStorage', d); else delete (globalThis as { localStorage?: unknown }).localStorage; }
});

test('parseHolding: quantity > 0, finite, ≤ 1e12, decimals BTC ≤ 8 / KRX-GOLD ≤ 2 / KR 0 / US ≤ 6', () => {
  assert.equal(field(P(BTC, '0.12345678', '95000000', 'KRW')), 'ok');
  assert.equal(field(P(BTC, '0.123456789', '95000000', 'KRW')), 'quantity');
  assert.equal(field(P(GOLD, '37.5', '150000', 'KRW')), 'ok');
  assert.equal(field(P(GOLD, '37.555', '150000', 'KRW')), 'quantity');
  assert.equal(field(P(KR, '10', '71000', 'KRW')), 'ok');
  assert.equal(field(P(KR, '10.5', '71000', 'KRW')), 'quantity');
  assert.equal(field(P(US, '1.123456', '500.25', 'USD')), 'ok');
  assert.equal(field(P(US, '1.1234567', '500', 'USD')), 'quantity');
  for (const q of ['', '0', '-1', 'abc', '1e3', 'NaN', 'Infinity', '1000000000001']) assert.equal(field(P(KR, q, '1', 'KRW')), 'quantity', q);
  assert.equal(field(P(KR, '1000000000000', '1', 'KRW')), 'ok'); // exactly 1e12
});

test('parseHolding: price > 0, finite, ≤ 1e12; currency KRW for KRX-GOLD/KR, USD for US, KRW|USD for BTC', () => {
  for (const p of ['', '0', '-5', 'x', '1000000000001']) assert.equal(field(P(KR, '1', p, 'KRW')), 'averagePrice', p);
  assert.equal(field(P(BTC, '1', '60000', 'USD')), 'ok');
  assert.equal(field(P(GOLD, '1', '1', 'USD')), 'currency');
  assert.equal(field(P(KR, '1', '1', 'USD')), 'currency');
  assert.equal(field(P(US, '1', '1', 'KRW')), 'currency');
  const ok = P(US, ' 2 ', '10.5', 'USD');
  assert.ok('ok' in ok && ok.ok.quantity === 2 && ok.ok.averagePrice === 10.5 && ok.ok.currency === 'USD');
  if ('error' in P(KR, '1.5', '1', 'KRW')) assert.match((P(KR, '1.5', '1', 'KRW') as { error: { message: string } }).error.message, /정수/);
});

test('identity: one holding per instrument (FR-010)', () => {
  assert.equal(identity(BTC), 'BTC');
  assert.equal(identity(GOLD), 'KRX-GOLD');
  assert.equal(identity(KR), 'KR:900001');
  assert.equal(identity({ ...KR, name: '다른 이름' }), identity(KR));
  assert.notEqual(identity({ ...US, ticker: '900001', assetClass: 'US' }), identity(KR));
});

// T034 (US6): the portfolio module stays out of every path that sends data.
test('privacy: no server route, directory module, main.ts or graph module imports src/portfolio.ts', () => {
  const files = [...readdirSync('app/api', { recursive: true }).map((f) => `app/api/${f}`), 'src/main.ts',
    ...readdirSync('src/graph').map((f) => `src/graph/${f}`),
    ...(readdirSync('src').includes('directory') ? readdirSync('src/directory').map((f) => `src/directory/${f}`) : [])]
    .filter((f) => /\.tsx?$/.test(f));
  assert.ok(files.length > 3);
  for (const f of files) assert.ok(!/portfolio/.test(readFileSync(f, 'utf8')), f);
});
