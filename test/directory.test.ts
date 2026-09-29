// Feature 009 L1 (T036, T039, T040, T042): directory parsers, the server cache over a local node:http stand-in,
// the import boundary and search. Fictional source files only (test/fixtures/directory); no real source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readdirSync, readFileSync } from 'node:fs';
import { krPage, parseKr, parseUs, type Entry } from '../src/directory/parse.ts';
import { createDirectory } from '../src/directory/server.ts';
import { search, statusLine } from '../src/directory/client.ts';

const F = 'test/fixtures/directory';
const kr = (f: string) => krPage(JSON.parse(readFileSync(`${F}/${f}`, 'utf8'))).items;
const txt = (f: string) => readFileSync(`${F}/${f}`, 'utf8');

test('parseKr: latest basDt only, "A" prefix dropped, types from operation and name rules, markets kept', () => {
  const { asOf, entries } = parseKr(kr('kr-items.json'), kr('kr-etf.json'), kr('kr-etn.json'));
  assert.equal(asOf, '2026-09-25');
  assert.equal(entries.length, 12 + 3 + 2); // the older 2026-09-24 row is ignored
  const by = (t: string) => entries.find((e) => e[3] === t)!;
  assert.deepEqual(by('900001'), ['KR', 'stock', '삼성테스트전자', '900001', 'KOSPI']);
  assert.equal(by('900002')[1], 'preferred'); // …우
  assert.equal(by('900004')[1], 'preferred'); // …우B
  assert.equal(by('900005')[1], 'reit');
  assert.equal(by('900009')[4], 'KONEX');
  assert.equal(by('900101')[1], 'etf');
  assert.equal(by('Q900201')[1], 'etn');
  assert.ok(!entries.some((e) => e[3] === '900099'));
  assert.throws(() => parseKr([], [], []), /no listed items/);
  assert.throws(() => krPage({ response: { header: { resultCode: '30' } } }), /normal service/);
  assert.deepEqual(krPage({ response: { header: { resultCode: '00' }, body: { totalCount: 0, items: '' } } }), { items: [], totalCount: 0 });
});

test('parseUs: all exchanges, test issues and footer dropped, ETF/ETN/preferred typed, as-of from the footer', () => {
  const { asOf, entries } = parseUs(txt('nasdaqlisted.txt'), txt('otherlisted.txt'));
  assert.equal(asOf, '2026-09-25');
  assert.deepEqual([...new Set(entries.map((e) => e[4]))].sort(), ['Cboe BZX', 'IEX', 'NYSE', 'NYSE American', 'NYSE Arca', 'Nasdaq']);
  const by = (t: string) => entries.find((e) => e[3] === t)!;
  assert.equal(by('ZZSP')[1], 'etf');
  assert.equal(by('ZZBZ')[1], 'etf');
  assert.equal(by('ZZQQ')[1], 'etf');
  assert.equal(by('ZZEN')[1], 'etn');
  assert.equal(by('ZZPR')[1], 'preferred');
  assert.equal(by('ZZRE')[1], 'stock'); // no REIT flag in the source (F009-R1)
  assert.ok(!entries.some((e) => e[3] === 'ZZTT' || e[3] === 'ZZX')); // test issues
  assert.throws(() => parseUs('Symbol|Security Name\nX|Y\n', txt('otherlisted.txt')), /footer/);
  assert.throws(() => parseUs('Symbol|Name|Test Issue|ETF\nX|Y|N|N\nFile Creation Time: 0925202617:02|||\n', txt('otherlisted.txt')), /missing column/);
});

// A local stand-in for both sources, counting requests per path; `mode` switches failures.
async function stub() {
  const counts: Record<string, number> = {}; let mode = 'ok'; let keySeen: string | null = null;
  const krBody = (f: string, q: URLSearchParams) => {
    const body = JSON.parse(txt(f)); const all = body.response.body.items.item;
    const n = Number(q.get('numOfRows')), p = Number(q.get('pageNo'));
    Object.assign(body.response.body, { totalCount: all.length, items: { item: all.slice((p - 1) * n, p * n) } });
    return JSON.stringify(body);
  };
  const files: Record<string, string> = { getItemInfo: 'kr-items.json', getETFPriceInfo: 'kr-etf.json', getETNPriceInfo: 'kr-etn.json' };
  const server = createServer((req, res) => {
    const u = new URL(req.url!, 'http://x');
    counts[u.pathname] = (counts[u.pathname] ?? 0) + 1;
    const krOp = files[u.pathname.split('/').at(-1)!];
    if (krOp) keySeen = u.searchParams.get('serviceKey');
    if ((mode === 'fail-kr' && krOp) || (mode === 'fail-us' && !krOp)) { res.writeHead(500); return res.end('boom'); }
    setTimeout(() => res.end(krOp ? krBody(krOp, u.searchParams) : txt(u.pathname.split('/').at(-1)!)), 20);
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { base, counts, setMode: (m: string) => { mode = m; }, key: () => keySeen, close: () => server.close() };
}
const total = (c: Record<string, number>, part: string) => Object.entries(c).filter(([k]) => k.includes(part)).reduce((s, [, n]) => s + n, 0);

test('server: 100 concurrent calls → one refresh per source; next Seoul day → one more; failures keep the last good copy', async () => {
  const s = await stub();
  let t = new Date('2026-09-29T03:00:00Z');
  const env = { BTA_DATA_GO_KR_KEY: 'test-key-not-real', BTA_DATA_GO_KR_BASE_URL: `${s.base}/1160100/service`, BTA_NASDAQ_TRADER_BASE_URL: `${s.base}/dynamic/SymDir` };
  const warn = console.warn; const warned: string[] = []; console.warn = (m: string) => warned.push(m);
  try {
    const dir = createDirectory({ now: () => t, env });
    const all = await Promise.all(Array.from({ length: 100 }, () => dir()));
    const kr1 = total(s.counts, '1160100'), us1 = total(s.counts, 'SymDir');
    assert.equal(kr1, 4); // 1 date probe + 3 operations × 1 page
    assert.equal(us1, 2);
    assert.equal(s.key(), 'test-key-not-real'); // sent to the source only
    assert.equal(all[0].fetchedDay, '2026-09-29');
    assert.deepEqual(all[0].sources.map((x) => [x.id, x.status, x.asOf]), [['kr-data-go-kr', 'ok', '2026-09-25'], ['us-nasdaq-trader', 'ok', '2026-09-25']]);
    assert.equal(all[0].entries.length, 17 + 10); // US: 12 rows − 2 test issues
    assert.ok(!JSON.stringify(all[0]).includes('test-key-not-real'));
    await dir(); // same day: no request
    assert.equal(total(s.counts, '1160100') + total(s.counts, 'SymDir'), 6);
    // next Seoul day, Korean source failing: stale, previous entries kept; US refreshed once
    t = new Date('2026-09-29T15:30:00Z'); // 00:30 on 2026-09-30 in Seoul
    s.setMode('fail-kr');
    const d2 = await dir();
    assert.equal(d2.fetchedDay, '2026-09-30');
    assert.deepEqual(d2.sources.map((x) => x.status), ['stale', 'ok']);
    assert.equal(d2.entries.filter((e) => e[0] === 'KR').length, 17);
    assert.equal(total(s.counts, 'SymDir'), 4);
    const kr2 = total(s.counts, '1160100');
    await dir(); // no retry on the same day
    assert.equal(total(s.counts, '1160100'), kr2);
    assert.ok(warned.length > 0 && warned.every((w) => !w.includes('test-key-not-real') && !w.includes('serviceKey')));
  } finally { console.warn = warn; s.close(); }
});

test('server: first-ever failure → unavailable; missing key → credential-missing with 0 Korean requests', async () => {
  const s = await stub();
  const warn = console.warn; console.warn = () => {};
  try {
    s.setMode('fail-us');
    const d = await createDirectory({ env: { BTA_NASDAQ_TRADER_BASE_URL: `${s.base}/dynamic/SymDir`, BTA_DATA_GO_KR_BASE_URL: `${s.base}/1160100/service` } })();
    assert.deepEqual(d.sources.map((x) => x.status), ['credential-missing', 'unavailable']);
    assert.equal(total(s.counts, '1160100'), 0);
    assert.deepEqual(d.entries, []);
  } finally { console.warn = warn; s.close(); }
});

test('boundary: only the route imports the server module; the key name appears only there (T040)', () => {
  const code = [...readdirSync('app', { recursive: true }).map((f) => `app/${f}`), ...readdirSync('components').map((f) => `components/${f}`),
    ...readdirSync('src', { recursive: true }).map((f) => `src/${f}`)].filter((f) => /\.tsx?$/.test(f));
  for (const f of code) {
    const s = readFileSync(f, 'utf8');
    const imports = s.match(/^import (?!type ).*directory\/server(\.ts)?['"]/m);
    if (f !== 'app/api/directory/route.ts') assert.ok(!imports, `${f} imports the directory server at runtime`);
    if (f !== 'src/directory/server.ts') assert.ok(!s.includes('BTA_DATA_GO_KR_KEY'), f);
  }
});

test('search: ticker prefix first, then name substring; per asset class; ≤ 100 ms over 25,000 rows (SC-003)', () => {
  const e: Entry[] = [['KR', 'stock', '삼성테스트전자', '900001', 'KOSPI'], ['KR', 'etf', '테스트 삼성그룹', '900101', 'KOSPI'],
    ['US', 'etf', 'Zeta S&P 500 Test ETF Trust', 'ZZSP', 'NYSE Arca'], ['US', 'stock', 'Apple ZZSP Holdings', 'AAZ', 'NYSE']];
  assert.deepEqual(search(e, 'KR', ' 삼성 ').map((x) => x[3]), ['900001', '900101']);
  assert.deepEqual(search(e, 'US', 'zzsp').map((x) => x[3]), ['ZZSP', 'AAZ']); // ticker match before name match
  assert.deepEqual(search(e, 'US', ''), []);
  assert.deepEqual(search(e, 'KR', 'zzsp'), []);
  const big: Entry[] = Array.from({ length: 25_000 }, (_, i) => [i % 2 ? 'KR' : 'US', 'stock', `가상종목 ${i} Test Corp`, `T${i}`, 'KOSPI']);
  const t0 = performance.now();
  for (const q of ['가', '가상종목 2', 'test', 'T1', 'zzzz']) search(big, 'KR', q);
  assert.ok((performance.now() - t0) / 5 <= 100, `${(performance.now() - t0) / 5} ms per search`);
  assert.equal(search(big, 'US', 'test', 20).length, 20);
});

test('statusLine: as-of, stale, unavailable, missing key, attribution', () => {
  const src = (status: 'ok' | 'stale' | 'unavailable' | 'credential-missing') => [{ id: 'kr-data-go-kr' as const, asOf: '2026-09-25', status, attribution: 'A' }];
  assert.equal(statusLine(src('ok'), 'KR', false), '2026-09-25 기준 · 출처: A');
  assert.equal(statusLine(src('stale'), 'KR', false), '2026-09-25 기준 (갱신 실패) · 출처: A');
  assert.equal(statusLine(src('credential-missing'), 'KR', false), '인증키 없음 · 출처: A');
  assert.match(statusLine([], 'US', true), /목록 없음/);
});
