// Feature 007 L3: a local stand-in for Yahoo's chart endpoint (test-only; never imported by app/ or src/).
// The Next server under test reaches it through BTA_YAHOO_BASE_URL (playwright.config.ts). Tests select
// the next reply with POST /__scenario and read what the server sent with GET /__stats.
import { createServer } from 'node:http';
import { addDays, scenario } from '../test/fixtures/market/stub-bodies.ts';

const port = Number(process.env.STUB_PORT ?? 5198);
const yesterdayET = () => addDays(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()), -1);
let current = { name: 'valid', endDate: undefined };
let stats = { requests: 0, lastPath: null, lastQuery: null, closedSockets: 0 };

const readJson = (req) => new Promise((ok) => { let s = ''; req.on('data', (c) => (s += c)); req.on('end', () => ok(s ? JSON.parse(s) : {})); });

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname === '/__stats') return res.end(JSON.stringify(stats));
  if (url.pathname === '/__reset') { stats = { requests: 0, lastPath: null, lastQuery: null, closedSockets: 0 }; current = { name: 'valid', endDate: undefined }; return res.end('{}'); }
  if (url.pathname === '/__scenario') { current = { name: 'valid', endDate: undefined, ...(await readJson(req)) }; return res.end('{}'); }
  if (!url.pathname.startsWith('/v8/finance/chart/')) { res.writeHead(404); return res.end(); }
  stats.requests++;
  stats.lastPath = url.pathname;
  stats.lastQuery = Object.fromEntries(url.searchParams);
  res.on('close', () => { if (!res.writableEnded) stats.closedSockets++; });
  const reply = scenario(current.name, current.endDate ?? yesterdayET());
  if (reply.destroy) return req.socket.destroy();
  if (reply.hang) return;
  res.writeHead(reply.status, { 'content-type': reply.type ?? 'application/json' });
  res.end(reply.body);
}).listen(port, '127.0.0.1');
