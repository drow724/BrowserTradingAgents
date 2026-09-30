// Feature 007 L3: a local stand-in for Yahoo's chart endpoint (test-only; never imported by app/ or src/).
// The Next server under test reaches it through BTA_YAHOO_BASE_URL (playwright.config.ts). Tests select
// the next reply with POST /__scenario and read what the server sent with GET /__stats.
// Feature 009: also stands in for the directory sources (data.go.kr operations, Nasdaq Trader files) with
// the fictional files in test/fixtures/directory; `directory` in /__scenario selects ok | fail-kr | fail-us | hang.
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { addDays, scenario } from '../test/fixtures/market/stub-bodies.ts';
import { accounts, candles, HOLDINGS, TOKEN } from '../test/fixtures/market/toss-bodies.ts';

const port = Number(process.env.STUB_PORT ?? 5198);
const yesterdayET = () => addDays(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()), -1);
let current = { name: 'valid', endDate: undefined, directory: 'ok', toss: 'ok' };
const freshStats = () => ({ requests: 0, lastPath: null, lastQuery: null, closedSockets: 0, directory: {}, directoryKeyPresent: null, bySymbol: {},
  toss: { paths: {}, authPresent: [], accountHeaderPresent: [] } });
let stats = freshStats();
const DIR = 'test/fixtures/directory';
const KR = { '/1160100/service/GetKrxListedInfoService/getItemInfo': 'kr-items.json',
  '/1160100/service/GetSecuritiesProductInfoService/getETFPriceInfo': 'kr-etf.json',
  '/1160100/service/GetSecuritiesProductInfoService/getETNPriceInfo': 'kr-etn.json' };
const US = { '/dynamic/SymDir/nasdaqlisted.txt': 'nasdaqlisted.txt', '/dynamic/SymDir/otherlisted.txt': 'otherlisted.txt' };
// One page of a data.go.kr JSON response (pageNo/numOfRows over the fixture's items).
function krPage(file, q) {
  const body = JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8'));
  const all = body.response.body.items.item, n = Number(q.get('numOfRows') ?? 10), p = Number(q.get('pageNo') ?? 1);
  Object.assign(body.response.body, { numOfRows: n, pageNo: p, totalCount: all.length, items: { item: all.slice((p - 1) * n, p * n) } });
  return JSON.stringify(body);
}

const readJson = (req) => new Promise((ok) => { let s = ''; req.on('data', (c) => (s += c)); req.on('end', () => ok(s ? JSON.parse(s) : {})); });

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname === '/__stats') return res.end(JSON.stringify(stats));
  if (url.pathname === '/__reset') { stats = freshStats(); current = { name: 'valid', endDate: undefined, directory: 'ok', toss: 'ok' }; return res.end('{}'); }
  if (url.pathname === '/__scenario') { current = { name: 'valid', endDate: undefined, directory: 'ok', toss: 'ok', ...(await readJson(req)) }; return res.end('{}'); }
  // Feature 015: Toss Securities stand-in (fictional account). Stats keep counts and header presence, never values.
  if (url.pathname.startsWith('/toss/')) {
    const path = url.pathname.slice('/toss'.length);
    stats.toss.paths[`${req.method} ${path}`] = (stats.toss.paths[`${req.method} ${path}`] ?? 0) + 1;
    stats.toss.authPresent.push(!!req.headers.authorization);
    stats.toss.accountHeaderPresent.push(!!req.headers['x-tossinvest-account']);
    await new Promise((ok) => { req.resume(); req.on('end', ok); }); // drain (the token body is form-encoded)
    const fail = { unauthorized: 401, 'forbidden-ip': 403, 'rate-limited': 429, 'server-error': 500 }[current.toss];
    if (fail) { res.writeHead(fail, { 'content-type': 'application/json' }); return res.end('{}'); }
    const body = path === '/oauth2/token' ? TOKEN : path === '/api/v1/accounts' ? accounts(current.toss === 'several-accounts' ? 2 : 1)
      : path === '/api/v1/holdings' ? HOLDINGS
      : path === '/api/v1/candles' ? candles(url.searchParams.get('symbol'), current.endDate ?? yesterdayET(), url.searchParams.get('before') ?? undefined,
        current.toss === 'short-history' ? 120 : undefined)
      : undefined;
    if (!body) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(body));
  }
  const kr = KR[url.pathname], us = US[url.pathname];
  if (kr || us) {
    stats.directory[url.pathname] = (stats.directory[url.pathname] ?? 0) + 1;
    if (kr) stats.directoryKeyPresent = url.searchParams.has('serviceKey'); // presence only, never the value
    const d = current.directory;
    if (d === 'hang') return;
    if ((kr && d === 'fail-kr') || (us && d === 'fail-us')) { res.writeHead(500); return res.end('stub failure'); }
    res.writeHead(200, { 'content-type': kr ? 'application/json' : 'text/plain' });
    return res.end(kr ? krPage(kr, url.searchParams) : readFileSync(`${DIR}/${us}`, 'utf8'));
  }
  if (!url.pathname.startsWith('/v8/finance/chart/')) { res.writeHead(404); return res.end(); }
  // Feature 014: replies follow the requested symbol's form; `symbol` in /__scenario limits the scenario to that
  // symbol (every other symbol gets 'valid'); requests are counted per symbol.
  const symbol = decodeURIComponent(url.pathname.slice('/v8/finance/chart/'.length));
  stats.bySymbol[symbol] = (stats.bySymbol[symbol] ?? 0) + 1;
  stats.requests++;
  stats.lastPath = url.pathname;
  stats.lastQuery = Object.fromEntries(url.searchParams);
  res.on('close', () => { if (!res.writableEnded) stats.closedSockets++; });
  const name = current.symbol && current.symbol !== symbol ? 'valid' : current.name;
  const reply = scenario(name, current.endDate ?? yesterdayET(), symbol);
  if (reply.destroy) return req.socket.destroy();
  if (reply.hang) return;
  res.writeHead(reply.status, { 'content-type': reply.type ?? 'application/json' });
  res.end(reply.body);
}).listen(port, '127.0.0.1');
