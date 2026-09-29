// L2 (controlled): GET /api/market and the Yahoo adapter against an in-process stub standing in for
// Yahoo (BTA_YAHOO_BASE_URL). No real Yahoo request is possible: fetch refuses any yahoo.com host.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { isFailure, sessionDate, type MarketBundle } from '../src/market-bundle.ts';
import { acquireYahoo } from '../src/server/market-provider.ts';
import { GET } from '../app/api/market/route.ts';
import { addDays, chart, HISTORY, LEAK, scenario, sessionDates, type Reply } from './fixtures/market/stub-bodies.ts';

const realFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (/yahoo\.com/.test(String(input instanceof Request ? input.url : input))) throw new Error('real Yahoo request attempted');
  return realFetch(input, init);
}) as typeof fetch;

const stub = { reply: undefined as Reply | undefined, requests: [] as URL[], closed: 0 };
let server: Server;
let base = '';
before(async () => {
  server = createServer((req, res) => {
    stub.requests.push(new URL(req.url!, 'http://stub'));
    res.on('close', () => { if (!res.writableEnded) stub.closed++; });
    const r = stub.reply!;
    if (r.destroy) { req.socket.destroy(); return; }
    if (r.hang) return;
    res.writeHead(r.status, { 'content-type': r.type ?? 'application/json' });
    res.end(r.body);
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.BTA_YAHOO_BASE_URL = base;
});
after(() => { server.closeAllConnections(); server.close(); });

const IBM = { symbol: 'IBM', currency: 'USD', timeZone: 'America/New_York' };
const today = () => sessionDate(Date.now() / 1000, 'America/New_York');
const use = (name: string, endDate = addDays(today(), -1)) => {
  stub.reply = scenario(name, endDate); stub.requests = []; stub.closed = 0;
};
const call = (query = '?symbol=IBM', init?: RequestInit) => GET(new Request(`http://app/api/market${query}`, init));
const until = async (ok: () => boolean) => { for (let i = 0; i < 100 && !ok(); i++) await new Promise((r) => setTimeout(r, 10)); };
const golden: { rows: Record<string, Record<string, number>> } =
  JSON.parse(readFileSync('test/fixtures/market/golden.json', 'utf8'));

test('valid → 200 bundle, no-store, exactly one request with the planned path and query', async () => {
  use('valid');
  const res = await call();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const b = await res.json() as MarketBundle;
  assert.ok(!isFailure(b));
  assert.equal(b.provider, 'yahoo-chart@1');
  assert.equal(b.analysisDate, today());
  assert.equal(b.marketAsOf, addDays(today(), -1));
  assert.equal(b.historySessions, HISTORY.length);
  assert.equal(b.recent.length, 30);
  assert.equal(stub.requests.length, 1);
  const u = stub.requests[0];
  assert.equal(u.pathname, '/v8/finance/chart/IBM');
  const [y, m, d] = today().split('-').map(Number);
  assert.equal(u.searchParams.get('period1'), String(Date.UTC(y - 5, m - 1, d) / 1000));
  assert.equal(u.searchParams.get('period2'), String(Date.UTC(y, m - 1, d + 1) / 1000));
  assert.equal(u.searchParams.get('interval'), '1d');
  assert.equal(u.searchParams.get('includePrePost'), 'false');
  assert.equal(u.searchParams.get('events'), 'div,splits');
  assert.equal([...u.searchParams.keys()].length, 5);
});

test('adjustment: O/H/L × adjclose/close, close = adjclose, volume raw (yfinance auto_adjust)', async () => {
  use('valid');
  const res = await call();
  assert.equal(res.status, 200);
  const b = await res.json() as MarketBundle;
  const raw = chart(addDays(today(), -1)).chart.result[0];
  const n = raw.timestamp.length;
  b.recent.forEach((s, k) => {
    const i = n - 30 + k, q = raw.indicators.quote[0], adj = raw.indicators.adjclose[0].adjclose[i];
    const ratio = adj / q.close[i];
    assert.equal(s.open, q.open[i] * ratio); assert.equal(s.high, q.high[i] * ratio);
    assert.equal(s.low, q.low[i] * ratio); assert.equal(s.close, adj); assert.equal(s.volume, q.volume[i]);
  });
  assert.ok(b.recent.some((s, k) => s.close !== raw.indicators.quote[0].close[n - 30 + k]), 'some recent rows are adjusted');
});

test('golden parity through the route: unadjusted synthetic history → the stockstats values', async () => {
  use('valid-unadjusted');
  const b = await (await call()).json() as MarketBundle;
  for (const [k, v] of Object.entries(golden.rows[String(HISTORY.length - 1)])) {
    const got = b.indicators[k as keyof MarketBundle['indicators']];
    assert.ok(Number.isFinite(got) && Math.abs(got - v) <= 1e-9 * Math.max(1, Math.abs(v)), `${k}: ${got} vs ${v}`);
  }
});

test('unsettled final bar (null close) is dropped: the bundle ends at the previous completed session', async () => {
  use('unsettled-final');
  const res = await call();
  assert.equal(res.status, 200);
  const b = await res.json() as MarketBundle;
  const dates = sessionDates(addDays(today(), -1), HISTORY.length);
  assert.equal(b.marketAsOf, dates.at(-2));
  assert.equal(b.historySessions, HISTORY.length - 1);
});

test('analysis-date bar: dropped before 16:00 New York, kept after (injected clock)', async () => {
  const signal = new AbortController().signal;
  use('valid', '2026-01-09');
  const before16 = await acquireYahoo(IBM, '2026-01-09', { signal, baseUrl: base, now: () => new Date('2026-01-09T20:00:00Z') });
  assert.ok(!isFailure(before16)); assert.equal(before16.marketAsOf, '2026-01-08');
  use('valid', '2026-01-09');
  const after16 = await acquireYahoo(IBM, '2026-01-09', { signal, baseUrl: base, now: () => new Date('2026-01-09T21:30:00Z') });
  assert.ok(!isFailure(after16)); assert.equal(after16.marketAsOf, '2026-01-09');
});

const FAILURES: [string, number, string, string, string?][] = [
  ['historical-null', 502, 'normalization', 'invalid-data'],
  ['length-mismatch', 502, 'normalization', 'invalid-data'],
  ['duplicate-timestamp', 502, 'normalization', 'invalid-data'],
  ['non-monotonic', 502, 'normalization', 'invalid-data'],
  ['wrong-time-zone', 502, 'normalization', 'invalid-data'],
  ['missing-adjclose', 502, 'normalization', 'invalid-data'],
  ['future-bar', 502, 'normalization', 'invalid-data'],
  ['non-json', 502, 'normalization', 'invalid-data'],
  ['short', 502, 'normalization', 'unavailable'],
  ['valid', 502, 'normalization', 'unavailable', 'stale'],
  ['chart-error', 502, 'acquisition', 'provider-error'],
  ['chart-error-200', 502, 'acquisition', 'provider-error'],
  ['server-error', 502, 'acquisition', 'provider-error'],
  ['unauthorized', 502, 'acquisition', 'unauthorized'],
  ['forbidden', 502, 'acquisition', 'unauthorized'],
  ['rate-limited', 503, 'acquisition', 'rate-limited'],
  ['network', 502, 'acquisition', 'network'],
];
for (const [name, status, stage, kind, label] of FAILURES) {
  test(`${label ?? name} → ${status} ${stage}/${kind}, one request, no provider text`, async () => {
    use(name, label === 'stale' ? addDays(today(), -11) : undefined);
    const res = await call();
    const text = await res.text();
    assert.equal(res.status, status);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.deepEqual(JSON.parse(text), { boundary: 'market-data', stage, kind });
    assert.ok(!text.includes(LEAK));
    assert.equal(stub.requests.length, 1, 'no retry');
  });
}

test('staleness boundary: exactly 10 days old is accepted (stale only when strictly greater)', async () => {
  use('valid', addDays(today(), -10));
  assert.equal((await call()).status, 200);
});

test('invalid symbol → 400 request/invalid-request with no provider request', async () => {
  for (const q of ['?symbol=AAPL', '', `?symbol=IBM%2F..%2F&base=${encodeURIComponent('http://evil')}`]) {
    use('valid');
    const res = await call(q);
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { boundary: 'market-data', stage: 'request', kind: 'invalid-request' });
    assert.equal(stub.requests.length, 0);
  }
});

test('no caching: the same request twice reaches the stub twice', async () => {
  use('valid');
  await call(); await call();
  assert.equal(stub.requests.length, 2);
});

test('cancellation: an aborted request is forwarded; the stub sees its socket close', async () => {
  use('hang');
  const ac = new AbortController();
  const pending = call('?symbol=IBM', { signal: ac.signal });
  await until(() => stub.requests.length === 1);
  ac.abort();
  const res = await pending;
  assert.deepEqual(await res.json(), { boundary: 'market-data', stage: 'acquisition', kind: 'cancelled' });
  await until(() => stub.closed === 1);
  assert.equal(stub.closed, 1);
});

test('timeout: the provider limit (injected 50 ms) is typed as timeout, distinct from cancellation', async () => {
  use('hang');
  const r = await acquireYahoo(IBM, today(), { signal: new AbortController().signal, baseUrl: base, limitMs: 50 });
  assert.deepEqual(r, { boundary: 'market-data', stage: 'acquisition', kind: 'timeout' });
  await until(() => stub.closed === 1);
  assert.equal(stub.closed, 1);
});

test('credential-missing is never produced on the keyless Yahoo path', async () => {
  for (const [name] of FAILURES) {
    use(name);
    assert.notEqual(((await (await call()).json()) as { kind?: string }).kind, 'credential-missing');
  }
});
