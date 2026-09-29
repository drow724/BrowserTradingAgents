// Feature 007 server-side market data (specs/007-…/research.md R14): one Yahoo chart request, the
// yfinance-compatible adjustment, and the deterministic MarketBundle. Yahoo-compatible, not an identical
// implementation of Python yfinance (A-M10): no cookie, crumb, retry or cache. Imported only by
// app/api/market/route.ts; Yahoo field names never leave this file.
import {
  computeIndicators, fail, MIN_HISTORY_SESSIONS, RECENT_SESSIONS, sessionDate, validateBundle,
  type MarketBundle, type MarketDataFailure, type Session,
} from '../market-bundle.ts';

export const YAHOO_ORIGIN = 'https://query2.finance.yahoo.com';
export const ADAPTER_ID = 'yahoo-chart@1';
const STALE_DAYS = 10; // upstream MAX_OHLCV_STALE_DAYS; stale when strictly greater
const QUOTE_KEYS = ['open', 'high', 'low', 'close', 'volume'] as const;

type Instrument = { symbol: string; currency: string; timeZone: string };
type Options = { signal: AbortSignal; limitMs?: number; baseUrl?: string; now?: () => Date };

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;
const hourIn = (d: Date, timeZone: string) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(d));

export async function acquireYahoo(
  instrument: Instrument, analysisDate: string,
  { signal, limitMs = 20_000, baseUrl = YAHOO_ORIGIN, now = () => new Date() }: Options,
): Promise<MarketBundle | MarketDataFailure> {
  // Five years ending at the analysis date, in epoch seconds; period2 is exclusive, hence +1 day.
  const [y, m, d] = analysisDate.split('-').map(Number);
  const period1 = Date.UTC(y - 5, m - 1, d) / 1000, period2 = Date.UTC(y, m - 1, d + 1) / 1000;
  const url = `${baseUrl}/v8/finance/chart/${encodeURIComponent(instrument.symbol)}?period1=${period1}` +
    `&period2=${period2}&interval=1d&includePrePost=false&events=div,splits`;

  // The single timer of the whole acquisition; the caller's signal stays distinguishable from it.
  const limit = AbortSignal.timeout(limitMs);
  let text: string;
  try {
    const res = await fetch(url, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.any([signal, limit]) });
    if (res.status === 401 || res.status === 403) return fail('acquisition', 'unauthorized');
    if (res.status === 429) return fail('acquisition', 'rate-limited');
    if (!res.ok) return fail('acquisition', 'provider-error');
    text = await res.text();
  } catch {
    return fail('acquisition', signal.aborted ? 'cancelled' : limit.aborted ? 'timeout' : 'network');
  }
  const acquiredAt = now();
  let body: unknown;
  try { body = JSON.parse(text); } catch { return fail('normalization', 'invalid-data'); }
  return normalize(body, instrument, analysisDate, acquiredAt);
}

// Chart JSON → MarketBundle in the fixed order of research R14 (steps 1–7, then the bundle).
function normalize(body: unknown, instrument: Instrument, analysisDate: string, acquiredAt: Date) {
  const bad = fail('normalization', 'invalid-data');
  const chart = (body as { chart?: { result?: unknown; error?: unknown } } | null)?.chart;
  if (chart?.error) return fail('acquisition', 'provider-error');
  // 1. shape and alignment; strictly increasing timestamps; the configured exchange time zone
  const r = (Array.isArray(chart?.result) ? chart.result[0] : undefined) as {
    timestamp?: unknown; meta?: { exchangeTimezoneName?: unknown };
    indicators?: { quote?: Record<string, unknown>[]; adjclose?: { adjclose?: unknown }[] };
  } | undefined;
  const ts = r?.timestamp, q = r?.indicators?.quote?.[0], adj = r?.indicators?.adjclose?.[0]?.adjclose;
  if (!Array.isArray(ts) || !q || !Array.isArray(adj)) return bad;
  const cols = [...QUOTE_KEYS.map((k) => q[k]), adj];
  if (!cols.every((c) => Array.isArray(c) && c.length === ts.length)) return bad;
  if (!ts.every((t, i) => Number.isInteger(t) && (i === 0 || t > ts[i - 1]))) return bad;
  if (r?.meta?.exchangeTimezoneName !== instrument.timeZone) return bad;
  // 2. date every bar in the exchange time zone
  const c = q as Record<(typeof QUOTE_KEYS)[number], unknown[]>;
  let rows = ts.map((t, i) => ({ date: sessionDate(t as number, instrument.timeZone),
    open: c.open[i], high: c.high[i], low: c.low[i], close: c.close[i], volume: c.volume[i], adjclose: adj[i] })) as
    { date: string; open: unknown; high: unknown; low: unknown; close: unknown; volume: unknown; adjclose: unknown }[];
  // 3. the analysis-date session before 16:00 exchange time is unfinished
  // ponytail: fixed 16:00 cutoff ignores early-close days; use meta.currentTradingPeriod if that matters.
  if (rows.at(-1)?.date === analysisDate && hourIn(acquiredAt, instrument.timeZone) < 16) rows = rows.slice(0, -1);
  // 4. a final bar without a close is an unsettled session (upstream uses the last settled bar)
  if (rows.length && rows.at(-1)!.close == null) rows = rows.slice(0, -1);
  // 5. any remaining null or invalid value is invalid-data; no filling, no dropping
  const price = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
  for (const row of rows) {
    if (![row.open, row.high, row.low, row.close, row.adjclose].every(price)) return bad;
    if (!Number.isInteger(row.volume) || (row.volume as number) < 0 || row.date > analysisDate) return bad;
  }
  // 6. yfinance auto_adjust: O/H/L × adjclose/close, close = adjclose, volume unchanged; no rounding
  const sessions: Session[] = rows.map((row) => {
    const ratio = (row.adjclose as number) / (row.close as number);
    return { date: row.date, open: (row.open as number) * ratio, high: (row.high as number) * ratio,
      low: (row.low as number) * ratio, close: row.adjclose as number, volume: row.volume as number };
  });
  // 7. coverage: stale (strictly more than 10 days) or too little history
  const latest = sessions.at(-1);
  if (!latest || dayNumber(analysisDate) - dayNumber(latest.date) > STALE_DAYS
    || sessions.length < MIN_HISTORY_SESSIONS) return fail('normalization', 'unavailable');
  return validateBundle({
    symbol: instrument.symbol, currency: instrument.currency, provider: ADAPTER_ID, adjustment: 'split-dividend',
    analysisDate, marketAsOf: latest.date, acquiredAt: acquiredAt.toISOString(), historySessions: sessions.length,
    latest, indicators: computeIndicators(sessions), recent: sessions.slice(-RECENT_SESSIONS),
  } satisfies MarketBundle);
}
