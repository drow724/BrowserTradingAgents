// DETERMINISTIC_TEST (L1): the Feature 005 market-data boundary without any network. Bodies are
// synthetic, in the documented Massive Custom Bars shape, with invented values — never captured
// market data (specs/005-…/research.md R6). A real fetch fails the test: see the stub below.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { FIXTURE, NEUTRAL_NEWS } from '../src/graph/trading-fixture.ts';
import {
  acquireDailyBars, ageHours, buildLiveInput, etDate, isFailure, LIVE_INSTRUMENT, marketFactsDigest, normalize,
  renderMarketFacts, replayArtifact, replyProvenance, snapshotDigest, type MarketSnapshot,
} from '../src/market-data.ts';

globalThis.fetch = () => { throw new Error('network access attempted in an L1 test'); };

const RECEIVED = new Date('2026-09-28T12:00:00Z');
// Midnight ET of an ET date, as Massive stamps a daily bar (EDT = UTC−4, EST = UTC−5).
const etMidnight = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return [4, 5].map((h) => Date.UTC(y, m - 1, d, h)).find((t) => etDate(t) === date && etDate(t - 3_600_000) !== date)!;
};
const bar = (date: string, o: number, h: number, l: number, c: number, v: number) =>
  ({ v, vw: c, o, c, h, l, t: etMidnight(date), n: 1 });
const BARS = [
  bar('2026-09-17', 95, 96, 94, 95.5, 800000),
  bar('2026-09-18', 96, 97, 95, 96.5, 850000),
  bar('2026-09-21', 100, 102, 99, 101, 1000000),
  bar('2026-09-22', 101, 103, 100, 102, 1200000),
  bar('2026-09-23', 102, 102.5, 99.5, 100.5, 900000),
  bar('2026-09-24', 100.5, 103.5, 100, 103.25, 1100000),
  bar('2026-09-25', 103.25, 105, 102, 104, 1300000),
];
const body = (results: unknown = BARS, status: unknown = 'OK') =>
  ({ ticker: 'IBM', queryCount: 7, resultsCount: 7, adjusted: true, results, status, request_id: 'synthetic', count: 7 });
const snap = () => normalize(body(), LIVE_INSTRUMENT, RECEIVED) as MarketSnapshot;
const kindOf = (x: unknown) => (isFailure(x) ? x.kind : 'ok');
const EXPECTED_FACTS =
  "On the 2026-09-25 close IBM traded at 104.00 USD, +0.73% from the previous session's 103.25 (market fact L1). " +
  'Over the last 5 sessions it ranged from 99.00 to 105.00 on average daily volume of 1100000 shares (market fact L2).';

// T008 — normalization ------------------------------------------------------------------------

test('normalize: 7 bars → last 5, ascending, only application field names', () => {
  const s = snap();
  assert.deepEqual(Object.keys(s), ['symbol', 'currency', 'sessions', 'asOf']);
  for (const x of s.sessions) assert.deepEqual(Object.keys(x), ['date', 'open', 'high', 'low', 'close', 'volume']);
  assert.deepEqual(s.sessions.map((x) => x.date), ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']);
  assert.deepEqual(s.sessions[4], { date: '2026-09-25', open: 103.25, high: 105, low: 102, close: 104, volume: 1300000 });
  assert.equal(s.asOf, '2026-09-25');
  assert.equal(s.symbol, 'IBM');
  assert.equal(s.currency, 'USD');
});

test('normalize: 2 and 3 bars are kept whole', () => {
  assert.equal((normalize(body(BARS.slice(-2)), LIVE_INSTRUMENT, RECEIVED) as MarketSnapshot).sessions.length, 2);
  assert.equal((normalize(body(BARS.slice(-3)), LIVE_INSTRUMENT, RECEIVED) as MarketSnapshot).sessions.length, 3);
});

test('normalize: the same body twice gives a deep-equal snapshot', () => {
  assert.deepEqual(snap(), snap());
});

test('normalize: status other than "OK" → provider-error (incl. DELAYED)', () => {
  for (const status of ['DELAYED', 'ERROR', 'SOMETHING', 'ok', 1]) {
    assert.equal(kindOf(normalize(body(BARS, status), LIVE_INSTRUMENT, RECEIVED)), 'provider-error', String(status));
  }
  const { status: _, ...missing } = body();
  assert.equal(kindOf(normalize(missing, LIVE_INSTRUMENT, RECEIVED)), 'provider-error', 'missing status');
  assert.equal(kindOf(normalize(null, LIVE_INSTRUMENT, RECEIVED)), 'provider-error');
});

test('normalize: results missing/not an array → invalid-data; fewer than 2 bars → unavailable', () => {
  assert.equal(kindOf(normalize({ status: 'OK' }, LIVE_INSTRUMENT, RECEIVED)), 'invalid-data');
  assert.equal(kindOf(normalize(body({}), LIVE_INSTRUMENT, RECEIVED)), 'invalid-data');
  assert.equal(kindOf(normalize(body([]), LIVE_INSTRUMENT, RECEIVED)), 'unavailable');
  assert.equal(kindOf(normalize(body(BARS.slice(-1)), LIVE_INSTRUMENT, RECEIVED)), 'unavailable');
});

test('normalize: invalid values → invalid-data, never defaulted', () => {
  const last = BARS.at(-1)!;
  const cases: Record<string, unknown> = {
    'missing o': { ...last, o: undefined }, 'missing h': { ...last, h: undefined }, 'missing l': { ...last, l: undefined },
    'missing c': { ...last, c: undefined }, 'missing v': { ...last, v: undefined }, 'missing t': { ...last, t: undefined },
    'NaN price': { ...last, c: NaN }, 'Infinity price': { ...last, h: Infinity }, 'zero price': { ...last, o: 0 },
    'negative price': { ...last, l: -1 }, 'string price': { ...last, c: '104' }, 'negative volume': { ...last, v: -5 },
    'non-integer volume': { ...last, v: 1.5 }, 'non-integer t': { ...last, t: last.t + 0.5 }, 'null bar': null,
  };
  for (const [name, broken] of Object.entries(cases)) {
    assert.equal(kindOf(normalize(body([...BARS.slice(0, -1), broken]), LIVE_INSTRUMENT, RECEIVED)), 'invalid-data', name);
  }
});

test('normalize: descending, duplicate or future session dates → invalid-data', () => {
  const [a, b] = BARS.slice(-2);
  assert.equal(kindOf(normalize(body([b, a]), LIVE_INSTRUMENT, RECEIVED)), 'invalid-data', 'descending');
  assert.equal(kindOf(normalize(body([a, a]), LIVE_INSTRUMENT, RECEIVED)), 'invalid-data', 'duplicate');
  const future = bar('2026-09-29', 1, 1, 1, 1, 1);
  assert.equal(kindOf(normalize(body([b, future]), LIVE_INSTRUMENT, RECEIVED)), 'invalid-data', 'future');
  // Same ET day as receivedAt is not future.
  const today = bar('2026-09-28', 1, 1, 1, 1, 1);
  assert.equal(kindOf(normalize(body([b, today]), LIVE_INSTRUMENT, RECEIVED)), 'ok');
});

test('ET dates: midnight-ET `t` maps to its own date, across both DST changes, host time zone irrelevant', () => {
  assert.equal(etDate(Date.UTC(2026, 8, 24, 4)), '2026-09-24'); // EDT midnight
  assert.equal(etDate(Date.UTC(2026, 8, 24, 3, 59)), '2026-09-23');
  assert.equal(etDate(Date.UTC(2025, 9, 31, 4)), '2025-10-31'); // before DST ends (2025-11-02)
  assert.equal(etDate(Date.UTC(2025, 10, 3, 5)), '2025-11-03'); // EST midnight after DST ends
  assert.equal(etDate(Date.UTC(2026, 2, 6, 5)), '2026-03-06'); // EST before DST starts (2026-03-08)
  assert.equal(etDate(Date.UTC(2026, 2, 9, 4)), '2026-03-09'); // EDT midnight after DST starts
  const s = normalize(body([bar('2025-10-31', 1, 1, 1, 1, 1), bar('2025-11-03', 2, 2, 2, 2, 2)]), LIVE_INSTRUMENT, RECEIVED);
  assert.deepEqual((s as MarketSnapshot).sessions.map((x) => x.date), ['2025-10-31', '2025-11-03']);
});

test('ageHours / replyProvenance: evidence helpers (EDT and EST closes; no provider field names out)', () => {
  assert.equal(ageHours('2026-09-25', '2026-09-28T12:00:00.000Z'), 64); // close 20:00Z (EDT)
  assert.equal(ageHours('2025-11-03', '2025-11-03T22:30:00.000Z'), 1.5); // close 21:00Z (EST)
  assert.deepEqual(replyProvenance(body()), { providerStatus: 'OK', requestId: 'synthetic', bars: 7 });
  assert.deepEqual(replyProvenance('<html>'), { providerStatus: null, requestId: null, bars: null });
});

// T010 — rendering ----------------------------------------------------------------------------

test('renderMarketFacts: exact deterministic text with sentinels, no provider structure', () => {
  const facts = renderMarketFacts(snap());
  assert.equal(facts, EXPECTED_FACTS);
  assert.equal(renderMarketFacts(snap()), facts);
  for (const raw of ['"results"', '"vw"', '"t":', 'request_id', '{']) assert.ok(!facts.includes(raw), raw);
});

test('renderMarketFacts: negative change is rendered with its sign', () => {
  const s = normalize(body([bar('2026-09-24', 1, 11, 1, 10, 5), bar('2026-09-25', 1, 11, 1, 9.5, 6)]), LIVE_INSTRUMENT, RECEIVED);
  assert.match(renderMarketFacts(s as MarketSnapshot), /traded at 9\.50 USD, -5\.00% from the previous session's 10\.00/);
});

// T012 — identities ---------------------------------------------------------------------------

test('digests: stable, content-sensitive, carry no market value', async () => {
  const s = snap();
  const d = await snapshotDigest(s);
  assert.match(d, /^sha256:[0-9a-f]{64}$/);
  assert.equal(await snapshotDigest(snap()), d);
  // Same content built with a different key order → same digest (canonical serialization).
  const reordered = { asOf: s.asOf, sessions: s.sessions.map((x) => ({ ...x })), currency: s.currency, symbol: s.symbol };
  assert.equal(await snapshotDigest(reordered), d);
  const changed = { ...s, sessions: s.sessions.map((x, i) => (i === 4 ? { ...x, close: 104.01 } : x)) };
  assert.notEqual(await snapshotDigest(changed), d);
  const f = await marketFactsDigest(EXPECTED_FACTS);
  assert.equal(await marketFactsDigest(renderMarketFacts(snap())), f);
  assert.notEqual(await marketFactsDigest(EXPECTED_FACTS + ' '), f);
  for (const v of ['104', '103.25', '1100000']) assert.ok(!d.includes(v) && !f.includes(v));
});

// T013 — live input ---------------------------------------------------------------------------

test('buildLiveInput: real subject, rendered facts, neutral news; FIXTURE unchanged', () => {
  const input = buildLiveInput(snap());
  assert.deepEqual(input, {
    id: 'live-market@1',
    subject: 'International Business Machines Corp. (IBM)',
    marketFacts: EXPECTED_FACTS,
    newsFacts: NEUTRAL_NEWS.text,
  });
  assert.equal(NEUTRAL_NEWS.id, 'neutral-news@1');
  for (const name of ['IBM', 'International Business', 'Northwind']) assert.ok(!NEUTRAL_NEWS.text.includes(name), name);
  assert.ok(!input.subject.includes('Northwind'));
  assert.deepEqual(FIXTURE, {
    id: 'tradingagents-fixture@1',
    subject: 'Northwind Lamps Ltd. (fictional)',
    marketFacts: 'The share price rose 6% over the last quarter on average volume (market fact M1). ' +
      'The price is trading slightly above its 50-day moving average (market fact M2).',
    newsFacts: 'The company announced a new line of energy-efficient desk lamps (news fact N1). ' +
      'A regional supplier reported delays in glass components (news fact N2).',
  });
});

// T014 — acquisition --------------------------------------------------------------------------

const KEY = 'l1-dummy-key-not-real';
const NOW = () => new Date('2026-09-28T15:00:00Z');
function stubFetch(respond: (url: string, init: RequestInit) => Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = (url: string, init: RequestInit) => { calls.push({ url, init }); return respond(url, init); };
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}
const json = (status: number, b: unknown) => async () => new Response(JSON.stringify(b), { status });
const acquire = (f: typeof globalThis.fetch, key = KEY, signal = new AbortController().signal, limitMs = 30_000) =>
  acquireDailyBars(LIVE_INSTRUMENT, key, signal, { fetch: f, now: NOW, limitMs });

test('acquire: empty key → credential-missing with 0 fetch calls', async () => {
  const s = stubFetch(json(200, body()));
  assert.equal(kindOf(await acquire(s.fetch, '')), 'credential-missing');
  assert.equal(s.calls.length, 0);
});

test('acquire: one request, ET window, key only in the Authorization header', async () => {
  const s = stubFetch(json(200, body()));
  const r = await acquire(s.fetch);
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].url,
    'https://api.massive.com/v2/aggs/ticker/IBM/range/1/day/2026-09-18/2026-09-28?adjusted=true&sort=asc');
  assert.ok(!s.calls[0].url.includes(KEY));
  assert.deepEqual(s.calls[0].init.headers, { Authorization: `Bearer ${KEY}` });
  assert.ok(!isFailure(r));
  const { meta, body: b } = r as { meta: Record<string, unknown>; body: unknown };
  assert.deepEqual(meta, { requestedAt: '2026-09-28T15:00:00.000Z', receivedAt: '2026-09-28T15:00:00.000Z',
    httpStatus: 200, from: '2026-09-18', to: '2026-09-28' });
  assert.deepEqual(b, JSON.parse(JSON.stringify(body())));
  assert.ok(!JSON.stringify(r).includes(KEY));
});

test('acquire: HTTP status mapping, no retry', async () => {
  for (const [status, kind] of [[401, 'unauthorized'], [403, 'unauthorized'], [429, 'rate-limited'], [500, 'provider-error'], [404, 'provider-error']] as const) {
    const s = stubFetch(json(status, { status: 'ERROR' }));
    assert.equal(kindOf(await acquire(s.fetch)), kind, String(status));
    assert.equal(s.calls.length, 1, `retry after ${status}`);
  }
  const s = stubFetch(async () => new Response('<html>not json</html>', { status: 200 }));
  assert.equal(kindOf(await acquire(s.fetch)), 'invalid-data');
});

test('acquire: rejection → network; run abort → cancelled; limit → timeout', async () => {
  assert.equal(kindOf(await acquire(stubFetch(async () => { throw new TypeError('Failed to fetch'); }).fetch)), 'network');

  const hang = stubFetch((_u, init) => new Promise((_r, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))));
  const run = new AbortController();
  const pending = acquire(hang.fetch, KEY, run.signal);
  run.abort(new Error('cancelled by user'));
  assert.equal(kindOf(await pending), 'cancelled');

  assert.equal(kindOf(await acquire(hang.fetch, KEY, new AbortController().signal, 20)), 'timeout');
});

// T016 — replay ---------------------------------------------------------------------------------

type Replay = Awaited<ReturnType<typeof replayArtifact>>;
async function checkReplay(r: Replay, raw: string) {
  assert.equal(await snapshotDigest(r.snapshot), r.snapshotDigest);
  assert.equal(await marketFactsDigest(r.marketFacts), r.marketFactsDigest);
  assert.equal(renderMarketFacts(r.snapshot), r.marketFacts);
  assert.ok(!/Bearer|Authorization/.test(raw), 'credential material in a replay artifact');
}

test('replay: a synthetic artifact re-renders and re-digests to itself, without credentials', async () => {
  const r = await replayArtifact(snap());
  assert.deepEqual(Object.keys(r), ['snapshot', 'marketFacts', 'snapshotDigest', 'marketFactsDigest']);
  await checkReplay(r, JSON.stringify(r));
});

test('replay: local .local/replay/*.json files match a committed evidence record', async (t) => {
  const dir = '.local/replay';
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  if (!files.length) return t.skip('no local replay artifact (created only by owner-run live runs)');
  const evidenceDir = 'specs/005-browser-market-data-boundary/evidence';
  const committed = existsSync(evidenceDir)
    ? readdirSync(evidenceDir).map((f) => readFileSync(`${evidenceDir}/${f}`, 'utf8')) : [];
  for (const f of files) {
    const raw = readFileSync(`${dir}/${f}`, 'utf8');
    const r = JSON.parse(raw) as Replay;
    await checkReplay(r, raw);
    assert.ok(committed.some((e) => e.includes(r.snapshotDigest) && e.includes(r.marketFactsDigest)), `${f}: no committed record`);
  }
});
