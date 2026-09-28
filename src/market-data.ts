// Feature 005 market-data step (specs/005-…/contracts/market-data.md): one source — Massive daily
// aggregates — for one committed instrument. Application-local and Massive-specific on purpose: no
// provider interface (Constitution I). Massive field names (`status`, `results`, `o`…`t`) stay in this
// file; callers only see MarketSnapshot, the rendered marketFacts and the graph input.
import { NEUTRAL_NEWS, type TradingFixture } from './graph/trading-fixture.ts';

export const LIVE_INSTRUMENT = {
  symbol: 'IBM',
  name: 'International Business Machines Corp.',
  currency: 'USD', // configured for this US listing; the source does not state it
  timeZone: 'America/New_York',
} as const;
export type Instrument = typeof LIVE_INSTRUMENT;

export type Session = { date: string; open: number; high: number; low: number; close: number; volume: number };
export type MarketSnapshot = { symbol: string; currency: string; sessions: Session[]; asOf: string };
export type MarketDataFailure = {
  boundary: 'market-data';
  kind: 'credential-missing' | 'network' | 'unauthorized' | 'rate-limited' | 'provider-error' | 'timeout'
    | 'unavailable' | 'invalid-data' | 'cancelled';
};

const fail = (kind: MarketDataFailure['kind']): MarketDataFailure => ({ boundary: 'market-data', kind });
export const isFailure = (x: unknown): x is MarketDataFailure =>
  typeof x === 'object' && x !== null && (x as MarketDataFailure).boundary === 'market-data';

// Session date in ET, independent of the host time zone. `en-CA` formats as YYYY-MM-DD.
const ET = new Intl.DateTimeFormat('en-CA', { timeZone: LIVE_INSTRUMENT.timeZone });
export const etDate = (ms: number) => ET.format(new Date(ms));

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 10; // covers weekends and a 3-day holiday; the last 5 bars are kept
const MAX_SESSIONS = 5;

export async function acquireDailyBars(
  instrument: Instrument,
  key: string,
  signal: AbortSignal,
  { fetch = globalThis.fetch, now = () => new Date(), limitMs = 30_000 } = {},
) {
  if (!key) return fail('credential-missing');
  const start = now();
  const from = etDate(start.getTime() - WINDOW_DAYS * DAY_MS);
  const to = etDate(start.getTime());
  const url = `https://api.massive.com/v2/aggs/ticker/${instrument.symbol}/range/1/day/${from}/${to}?adjusted=true&sort=asc`;

  // One request, no retry. The limit is page protection only (a setTimeout, so tests can drive it).
  const local = new AbortController();
  const onAbort = () => local.abort(signal.reason);
  signal.addEventListener('abort', onAbort);
  if (signal.aborted) onAbort();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; local.abort(new Error('acquisition limit')); }, limitMs);
  const aborted = () => (signal.aborted ? fail('cancelled') : timedOut ? fail('timeout') : undefined);
  try {
    let res: Response;
    try {
      res = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, signal: local.signal });
    } catch {
      return aborted() ?? fail('network');
    }
    const meta = { requestedAt: start.toISOString(), receivedAt: now().toISOString(), httpStatus: res.status, from, to };
    if (res.status === 401 || res.status === 403) return fail('unauthorized');
    if (res.status === 429) return fail('rate-limited');
    if (!res.ok) return fail('provider-error');
    try {
      return { body: (await res.json()) as unknown, meta };
    } catch {
      return aborted() ?? fail('invalid-data');
    }
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  }
}

// Evidence provenance from a reply, so callers never read Massive field names (contracts/evidence.md).
export function replyProvenance(body: unknown) {
  const b = (typeof body === 'object' && body !== null ? body : {}) as { status?: unknown; request_id?: unknown; results?: unknown };
  return {
    providerStatus: typeof b.status === 'string' ? b.status : null,
    requestId: typeof b.request_id === 'string' ? b.request_id : null,
    bars: Array.isArray(b.results) ? b.results.length : null,
  };
}

// Hours from the as-of session's 16:00 ET close to receipt (observation only; end-of-day data).
const ET_HOUR = new Intl.DateTimeFormat('en-US', { timeZone: LIVE_INSTRUMENT.timeZone, hour: '2-digit', hourCycle: 'h23' });
export function ageHours(asOf: string, receivedAt: string) {
  const [y, m, d] = asOf.split('-').map(Number);
  const close = [20, 21].map((h) => Date.UTC(y, m - 1, d, h)).find((t) => ET_HOUR.format(t) === '16')!;
  return Math.round((Date.parse(receivedAt) - close) / 360_000) / 10;
}

const price = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0;

// Massive body → MarketSnapshot. Nothing is defaulted: any gap is a failure.
export function normalize(body: unknown, instrument: Instrument, receivedAt: Date): MarketSnapshot | MarketDataFailure {
  const b = body as { status?: unknown; results?: unknown } | null;
  if (typeof b !== 'object' || b === null || b.status !== 'OK') return fail('provider-error');
  if (!Array.isArray(b.results)) return fail('invalid-data');
  if (b.results.length < 2) return fail('unavailable');
  const today = etDate(receivedAt.getTime());
  const sessions: Session[] = [];
  for (const bar of b.results.slice(-MAX_SESSIONS) as Record<string, unknown>[]) {
    const { o, h, l, c, v, t } = bar ?? {};
    if (!price(o) || !price(h) || !price(l) || !price(c)) return fail('invalid-data');
    if (!Number.isInteger(v) || (v as number) < 0 || !Number.isInteger(t)) return fail('invalid-data');
    const date = etDate(t as number);
    if (date > today || (sessions.length && date <= sessions.at(-1)!.date)) return fail('invalid-data');
    sessions.push({ date, open: o, high: h, low: l, close: c, volume: v as number });
  }
  return { symbol: instrument.symbol, currency: instrument.currency, sessions, asOf: sessions.at(-1)!.date };
}

export function renderMarketFacts(s: MarketSnapshot) {
  const last = s.sessions.at(-1)!;
  const prev = s.sessions.at(-2)!;
  const chg = (last.close / prev.close - 1) * 100;
  const low = Math.min(...s.sessions.map((x) => x.low));
  const high = Math.max(...s.sessions.map((x) => x.high));
  const avgVol = Math.round(s.sessions.reduce((a, x) => a + x.volume, 0) / s.sessions.length);
  return `On the ${s.asOf} close ${s.symbol} traded at ${last.close.toFixed(2)} ${s.currency}, ` +
    `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}% from the previous session's ${prev.close.toFixed(2)} (market fact L1). ` +
    `Over the last ${s.sessions.length} sessions it ranged from ${low.toFixed(2)} to ${high.toFixed(2)} ` +
    `on average daily volume of ${avgVol} shares (market fact L2).`;
}

// Canonical JSON with keys in data-model order, built explicitly (not from incidental key order).
const canonical = (s: MarketSnapshot) => JSON.stringify({
  symbol: s.symbol, currency: s.currency,
  sessions: s.sessions.map((x) => ({ date: x.date, open: x.open, high: x.high, low: x.low, close: x.close, volume: x.volume })),
  asOf: s.asOf,
});

async function sha256(text: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return `sha256:${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
export const snapshotDigest = (s: MarketSnapshot) => sha256(canonical(s));
export const marketFactsDigest = (text: string) => sha256(text);

// Local, never-committed replay artifact (SC-009): values + their identities; no credential, no raw body.
export async function replayArtifact(snapshot: MarketSnapshot) {
  const marketFacts = renderMarketFacts(snapshot);
  return { snapshot, marketFacts, snapshotDigest: await snapshotDigest(snapshot), marketFactsDigest: await marketFactsDigest(marketFacts) };
}

export function buildLiveInput(snapshot: MarketSnapshot): TradingFixture {
  return {
    id: 'live-market@1',
    subject: `${LIVE_INSTRUMENT.name} (${LIVE_INSTRUMENT.symbol})`,
    marketFacts: renderMarketFacts(snapshot),
    newsFacts: NEUTRAL_NEWS.text,
  };
}
