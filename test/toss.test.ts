// DETERMINISTIC_TEST (controlled): Feature 015 Toss client against an in-process stand-in (fictional account). No real
// Toss request is possible: fetch refuses the tossinvest host.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { resetToss, TOSS_ALLOWLIST, tossAvailable, tossPositions, tossRows } from '../src/server/toss.ts';
import { accounts, candles, FAKE, HOLDINGS, TOKEN } from './fixtures/market/toss-bodies.ts';
import { addDays, HISTORY, sessionDates } from './fixtures/market/stub-bodies.ts';
import { sessionDate, type MarketBundle } from '../src/market-bundle.ts';
import { clearQuoteCache } from '../src/server/market-provider.ts';
import { GET as market } from '../app/api/market/route.ts';
import { mapPositions } from '../src/toss-import.ts';
import type { Entry } from '../src/directory/parse.ts';

const realFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (/tossinvest\.com/.test(String(input instanceof Request ? input.url : input))) throw new Error('real Toss request attempted');
  return realFetch(input, init);
}) as typeof fetch;

type Seen = { method: string; path: string; auth: boolean; account: boolean; body: string };
const stub = { seen: [] as Seen[], status: 200, accounts: 1, count: HISTORY.length };
const endDate = () => addDays(sessionDate(Date.now() / 1000, 'America/New_York'), -1);
let server: Server;
before(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const u = new URL(req.url!, 'http://stub');
      stub.seen.push({ method: req.method!, path: u.pathname, auth: !!req.headers.authorization, account: !!req.headers['x-tossinvest-account'], body });
      if (stub.status !== 200) { res.writeHead(stub.status); return res.end('{}'); }
      const reply = u.pathname === '/oauth2/token' ? TOKEN : u.pathname === '/api/v1/accounts' ? accounts(stub.accounts)
        : u.pathname === '/api/v1/holdings' ? HOLDINGS
        : u.pathname === '/api/v1/candles' ? candles(u.searchParams.get('symbol')!, endDate(), u.searchParams.get('before') ?? undefined, stub.count)
        : { chart: { result: null, error: { code: 'not a Yahoo stand-in' } } };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(reply));
    });
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  process.env.BTA_TOSS_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.BTA_YAHOO_BASE_URL = process.env.BTA_TOSS_BASE_URL; // any Yahoo request would be seen here
});
after(() => { server.closeAllConnections(); server.close(); });
beforeEach(() => {
  Object.assign(process.env, { BTA_TOSS_CLIENT_ID: FAKE.id, BTA_TOSS_CLIENT_SECRET: FAKE.secret });
  delete process.env.BTA_TOSS_ACCOUNT_SEQ; delete process.env.VERCEL;
  stub.seen = []; stub.status = 200; stub.accounts = 1; stub.count = HISTORY.length; resetToss(); clearQuoteCache();
});
const signal = () => new AbortController().signal;

test('read-only by construction: the allowlist is exactly four read paths; no order path exists in the module (FR-004)', () => {
  assert.deepEqual([...TOSS_ALLOWLIST], ['POST /oauth2/token', 'GET /api/v1/accounts', 'GET /api/v1/holdings', 'GET /api/v1/candles']);
  const src = readFileSync('src/server/toss.ts', 'utf8');
  for (const forbidden of ['/orders', 'conditional-orders', 'wss:', 'DELETE', 'PUT', 'PATCH']) assert.ok(!src.includes(forbidden), forbidden);
});

test('positions: token once (form body), accounts discovered, account header on holdings only; reduced fields', async () => {
  const p = await tossPositions(signal());
  assert.ok(Array.isArray(p));
  assert.deepEqual(p[1], { code: 'ZZAP', country: 'US', name: 'Zeta Apple Test Inc.', quantity: '2.5', averagePrice: '180.123456', currency: 'USD' });
  assert.equal(p.length, 4);
  await tossPositions(signal()); // token reused
  assert.deepEqual(stub.seen.map((s) => `${s.method} ${s.path}`), ['POST /oauth2/token', 'GET /api/v1/accounts', 'GET /api/v1/holdings', 'GET /api/v1/accounts', 'GET /api/v1/holdings']);
  assert.match(stub.seen[0].body, /^grant_type=client_credentials&client_id=/);
  assert.deepEqual(stub.seen.map((s) => s.account), [false, false, true, false, true]);
  assert.ok(stub.seen.slice(1).every((s) => s.auth));
  assert.ok(!JSON.stringify(p).includes(FAKE.accountNo));
});

test('an explicit BTA_TOSS_ACCOUNT_SEQ skips the account list; several accounts without it → ambiguous-account', async () => {
  process.env.BTA_TOSS_ACCOUNT_SEQ = FAKE.seq;
  await tossPositions(signal());
  assert.ok(!stub.seen.some((s) => s.path === '/api/v1/accounts'));
  delete process.env.BTA_TOSS_ACCOUNT_SEQ; resetToss(); stub.accounts = 2;
  assert.deepEqual(await tossPositions(signal()), { boundary: 'toss', kind: 'ambiguous-account' });
});

test('not configured (no id or secret, or a hosted VERCEL environment) → not-configured with 0 requests (FR-002)', async () => {
  delete process.env.BTA_TOSS_CLIENT_SECRET;
  assert.equal(tossAvailable(), false);
  assert.deepEqual(await tossPositions(signal()), { boundary: 'toss', kind: 'not-configured' });
  Object.assign(process.env, { BTA_TOSS_CLIENT_SECRET: FAKE.secret, VERCEL: '1' });
  assert.equal(tossAvailable(), false);
  assert.deepEqual(await tossRows('900001', 'Asia/Seoul', signal()), { boundary: 'toss', kind: 'not-configured' });
  assert.equal(stub.seen.length, 0);
});

test('status codes are typed: 401 unauthorized, 403 forbidden-ip, 429 rate-limited, 500 provider-error (FR-012)', async () => {
  for (const [status, kind] of [[401, 'unauthorized'], [403, 'forbidden-ip'], [429, 'rate-limited'], [500, 'provider-error']] as const) {
    resetToss(); stub.status = status;
    assert.deepEqual(await tossPositions(signal()), { boundary: 'toss', kind });
  }
});

test('candles: three pages back, oldest first, session dates in the exchange zone, prices as numbers', async () => {
  const kr = await tossRows('900001', 'Asia/Seoul', signal());
  assert.ok(Array.isArray(kr));
  assert.equal(kr.length, 300);
  assert.equal(kr.at(-1)!.date, endDate());
  assert.ok(kr.every((r, i) => i === 0 || r.date > kr[i - 1].date));
  assert.equal(kr.at(-1)!.close, HISTORY.at(-1)!.close);
  assert.equal(kr.at(-1)!.adjclose, kr.at(-1)!.close);
  const us = await tossRows('ZZAP', 'America/New_York', signal());
  assert.ok(Array.isArray(us) && us.at(-1)!.date === endDate()); // 13:00+09:00 → 00:00 New York, same date
  assert.equal(stub.seen.filter((s) => s.path === '/api/v1/candles').length, 6);
  assert.ok(stub.seen.every((s) => TOSS_ALLOWLIST.includes(`${s.method} ${s.path}`)));
});

test('no secret, token, account seq or account number in the server log (FR-003)', async () => {
  const lines: string[] = [], info = console.info;
  console.info = (...a: unknown[]) => { lines.push(a.join(' ')); };
  try { await tossPositions(signal()); await tossRows('ZZAP', 'America/New_York', signal(), 1); } finally { console.info = info; }
  assert.ok(lines.length >= 4);
  for (const l of lines) for (const s of [FAKE.id, FAKE.secret, FAKE.token, FAKE.seq, FAKE.accountNo, '900001', 'ZZAP']) assert.ok(!l.includes(s), `${s} in ${l}`);
});

// ---- US1: import mapping (browser, pure) ----
const DIR: Entry[] = [['KR', 'stock', '삼성테스트전자', '900001', 'KOSPI'], ['US', 'stock', 'Zeta Apple Test Inc.', 'ZZAP', 'NASDAQ']];
test('mapPositions: KR with its market and product type, US with decimals; unknown, unsupported and zero skipped (FR-005)', () => {
  const positions = HOLDINGS.result.items.map((i) => ({ code: i.symbol, country: i.marketCountry, name: i.name, quantity: i.quantity,
    averagePrice: i.averagePurchasePrice, currency: i.currency }));
  const r = mapPositions([...positions, { ...positions[0], name: '수량0', quantity: '0' }], DIR, new Date('2026-09-30T00:00:00Z'));
  assert.deepEqual(r.holdings, [
    { instrument: { kind: 'listing', assetClass: 'KR', ticker: '900001', name: '삼성테스트전자', market: 'KOSPI', productType: 'stock' },
      quantity: 10, averagePrice: 70000, currency: 'KRW', editedAt: '2026-09-30T00:00:00.000Z' },
    { instrument: { kind: 'listing', assetClass: 'US', ticker: 'ZZAP', name: 'Zeta Apple Test Inc.', market: 'NASDAQ', productType: 'stock' },
      quantity: 2.5, averagePrice: 180.123456, currency: 'USD', editedAt: '2026-09-30T00:00:00.000Z' },
  ]);
  assert.deepEqual(r.skipped, [{ name: '목록에없는테스트', reason: '목록에 없는 종목' }, { name: 'Japan Test KK', reason: '지원하지 않는 자산' },
    { name: '수량0', reason: '수량은 0보다 큰 숫자여야 합니다.' }]);
});

// ---- US2: /api/market?source=toss (research R4, R7) ----
const call = (q: string) => market(new Request(`http://app/api/market${q}`));
test('source=toss: the Feature 014 bundle from three pages of Toss candles, provider toss-candles@1; cached per source', async () => {
  const res = await call('?symbol=900001.KS&source=toss');
  assert.equal(res.status, 200);
  const b = await res.json() as MarketBundle;
  assert.equal(b.provider, 'toss-candles@1');
  assert.deepEqual([b.symbol, b.currency, b.historySessions, b.marketAsOf], ['900001.KS', 'KRW', 300, endDate()]);
  assert.equal(b.latest.close, HISTORY.at(-1)!.close);
  const [y, m, d] = b.analysisDate.split('-'), from = `${Number(y) - 1}-${m}-${d}`;
  const dates = sessionDates(endDate(), HISTORY.length);
  const year = HISTORY.filter((_, i) => i >= HISTORY.length - 300 && dates[i] > from); // the 300 fetched sessions, last year
  assert.deepEqual(b.range52w, { high: Math.max(...year.map((s) => s.high)), low: Math.min(...year.map((s) => s.low)) });
  const candlesBefore = stub.seen.filter((s) => s.path === '/api/v1/candles').length;
  assert.equal(candlesBefore, 3);
  await call('?symbol=900001.KS&source=toss');
  assert.equal(stub.seen.filter((s) => s.path === '/api/v1/candles').length, 3, 'served from the cache');
  await call('?symbol=900001.KS'); // Yahoo is a different cache entry
  assert.equal(stub.seen.filter((s) => s.path.startsWith('/v8/finance/chart/')).length, 1);
});
test('source=toss without local credentials → 503 credential-missing, 0 requests', async () => {
  delete process.env.BTA_TOSS_CLIENT_ID;
  const res = await call('?symbol=ZZAP&source=toss');
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { boundary: 'market-data', stage: 'request', kind: 'credential-missing' });
  assert.equal(stub.seen.length, 0);
});
test('Toss unavailable → a typed failure, never a Yahoo request (FR-010); short history → unavailable', async () => {
  stub.status = 403;
  assert.deepEqual(await (await call('?symbol=ZZAP&source=toss')).json(), { boundary: 'market-data', stage: 'acquisition', kind: 'unauthorized' });
  stub.status = 200; stub.count = 120; resetToss();
  assert.deepEqual(await (await call('?symbol=ZZAP&source=toss')).json(), { boundary: 'market-data', stage: 'normalization', kind: 'unavailable' });
  assert.ok(!stub.seen.some((s) => s.path.startsWith('/v8/')));
});
