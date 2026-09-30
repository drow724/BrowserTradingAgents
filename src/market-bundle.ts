// Feature 007 market bundle (specs/007-…/data-model.md): the provider-independent contract between
// `/api/market` and the browser, the indicator math the server runs to build it, and the browser-side
// validation, rendering and identities. No provider field name appears here. Runs in Node and the
// browser (crypto.subtle, Intl), so it has no Node-only import.

// The one configured live instrument (Feature 005/007). Currency and exchange time zone are configuration.
export const LIVE_INSTRUMENT = {
  symbol: 'IBM',
  name: 'International Business Machines Corp.',
  currency: 'USD',
  timeZone: 'America/New_York',
} as const;

// Feature 014 (research R1, R2): the symbols the boundary accepts and what each form implies.
export type QuoteInstrument = { symbol: string; currency: 'KRW' | 'USD'; timeZone: string };
export function symbolInstrument(symbol: string): QuoteInstrument | null {
  if (/^\d{6}\.(KS|KQ)$/.test(symbol)) return { symbol, currency: 'KRW', timeZone: 'Asia/Seoul' };
  if (/^[A-Z]{1,5}(-[A-Z]{1,2})?$/.test(symbol)) return { symbol, currency: 'USD', timeZone: 'America/New_York' };
  return null;
}
// The source symbol of a listing, or null when it cannot be quoted: KRX gold spot, BTC (Yahoo's crypto bars are
// inconsistent, F014-R3), KONEX, unusual US tickers.
type Instrument = { kind: 'fixed'; id: string } | { kind: 'listing'; assetClass: 'KR' | 'US'; ticker: string; market: string };
export function yahooSymbol(i: Instrument): string | null {
  const s = i.kind === 'fixed' ? ''
    : i.assetClass === 'KR' ? (i.market === 'KOSPI' ? `${i.ticker}.KS` : i.market === 'KOSDAQ' ? `${i.ticker}.KQ` : '')
    : i.ticker.replace('.', '-');
  return symbolInstrument(s) ? s : null;
}

export type Session = { date: string; open: number; high: number; low: number; close: number; volume: number };

// The 12 indicators the reference Market Analyst prompt offers (upstream market_analyst.py L23–43).
// The reference verified snapshot uses the first 11 of them — all but `vwma` (snapshot.py L21–25).
export const INDICATOR_NAMES = [
  'close_10_ema', 'close_50_sma', 'close_200_sma', 'macd', 'macds', 'macdh', 'rsi',
  'boll', 'boll_ub', 'boll_lb', 'atr', 'vwma',
] as const;
export type Indicators = Record<(typeof INDICATOR_NAMES)[number], number>;

export type MarketBundle = {
  symbol: string; currency: string;
  provider: string; // provenance only: client logic never branches on it
  adjustment: 'split-dividend';
  analysisDate: string; marketAsOf: string; acquiredAt: string;
  historySessions: number;
  latest: Session; indicators: Indicators; recent: Session[];
  range52w: { high: number; low: number }; // Feature 014: adjusted high/low over the last year of sessions
};

export type MarketDataFailure = {
  boundary: 'market-data';
  stage: 'request' | 'acquisition' | 'normalization';
  kind: 'credential-missing' | 'network' | 'unauthorized' | 'rate-limited' | 'provider-error' | 'timeout'
    | 'unavailable' | 'invalid-data' | 'cancelled' | 'invalid-request';
};
export const FAILURE_KINDS: MarketDataFailure['kind'][] = ['credential-missing', 'network', 'unauthorized',
  'rate-limited', 'provider-error', 'timeout', 'unavailable', 'invalid-data', 'cancelled', 'invalid-request'];
export const fail = (stage: MarketDataFailure['stage'], kind: MarketDataFailure['kind']): MarketDataFailure =>
  ({ boundary: 'market-data', stage, kind });
export const isFailure = (x: unknown): x is MarketDataFailure =>
  typeof x === 'object' && x !== null && (x as MarketDataFailure).boundary === 'market-data';

export const MIN_HISTORY_SESSIONS = 260;
export const RECENT_SESSIONS = 30;

// Session date (YYYY-MM-DD) of a Unix timestamp in the exchange time zone; the host zone never matters.
export const sessionDate = (epochSeconds: number, timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(epochSeconds * 1000));

// ---- indicators: the stockstats 0.6.8 definitions (research R0.3), on unrounded values ----
// Every series has a value from the first row (pandas min_periods ≤ 1): no warm-up N/A.

const rollingMean = (x: number[], w: number) =>
  x.map((_, i) => { const s = x.slice(Math.max(0, i - w + 1), i + 1); return s.reduce((a, b) => a + b, 0) / s.length; });
const rollingSum = (x: number[], w: number) =>
  x.map((_, i) => x.slice(Math.max(0, i - w + 1), i + 1).reduce((a, b) => a + b, 0));
const rollingStd = (x: number[], w: number) => x.map((_, i) => { // pandas sample std (ddof=1)
  const s = x.slice(Math.max(0, i - w + 1), i + 1);
  if (s.length < 2) return NaN;
  const m = s.reduce((a, b) => a + b, 0) / s.length;
  return Math.sqrt(s.reduce((a, b) => a + (b - m) ** 2, 0) / (s.length - 1));
});
// pandas ewm(adjust=True): weighted mean with weights (1−α)^i over the whole history.
const ewm = (x: number[], alpha: number) => {
  let num = 0, den = 0;
  return x.map((v) => { num = v + (1 - alpha) * num; den = 1 + (1 - alpha) * den; return num / den; });
};
const ema = (x: number[], span: number) => ewm(x, 2 / (span + 1));
const smma = (x: number[], w: number) => ewm(x, 1 / w);

// Values at the last session of `sessions` (indicators are causal, so a prefix gives row N's value).
export function computeIndicators(sessions: Session[]): Indicators {
  const close = sessions.map((s) => s.close);
  const last = <T>(a: T[]) => a[a.length - 1];
  const ema26 = ema(close, 26);
  const macd = ema(close, 12).map((v, i) => v - ema26[i]);
  const macds = ema(macd, 9);
  const diff = close.map((c, i) => (i === 0 ? 0 : c - close[i - 1]));
  const up = smma(diff.map((d) => (d > 0 ? d : 0)), 14);
  const down = smma(diff.map((d) => (d < 0 ? -d : 0)), 14);
  const rsi = up.map((u, i) => (i === 0 ? 50 : u + down[i] !== 0 ? 100 * (u / (u + down[i])) : 50));
  const boll = rollingMean(close, 20);
  const width = rollingStd(close, 20).map((s) => 2 * s);
  const tr = sessions.map((s, i) => { const pc = close[Math.max(0, i - 1)]; // stockstats: first prev close = own close
    return Math.max(s.high - s.low, Math.abs(s.high - pc), Math.abs(s.low - pc)); });
  const tpv = sessions.map((s) => s.volume * ((s.high + s.low + s.close) / 3));
  const vwma = rollingSum(tpv, 14).at(-1)! / rollingSum(sessions.map((s) => s.volume), 14).at(-1)!;
  return {
    close_10_ema: last(ema(close, 10)), close_50_sma: last(rollingMean(close, 50)),
    close_200_sma: last(rollingMean(close, 200)),
    macd: last(macd), macds: last(macds), macdh: last(macd) - last(macds), rsi: last(rsi),
    boll: last(boll), boll_ub: last(boll) + last(width), boll_lb: last(boll) - last(width),
    atr: last(smma(tr, 14)), vwma,
  };
}

// ---- browser-side validation: data-model.md rules; anything else is invalid-data ----

const isDate = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
// a ≤ b up to float rounding: adjusted O/H/L are raw × ratio while close is Yahoo's adjclose itself.
const le = (a: number, b: number) => a <= b + 1e-9 * Math.max(1, Math.abs(b));
const validSession = (s: unknown): s is Session => {
  const { date, open, high, low, close, volume } = (s ?? {}) as Record<string, unknown>;
  const p = [open, high, low, close];
  return isDate(date) && p.every((v) => typeof v === 'number' && Number.isFinite(v) && v > 0)
    && le(low as number, Math.min(open as number, close as number))
    && le(Math.max(open as number, close as number), high as number)
    && Number.isInteger(volume) && (volume as number) >= 0;
};

export function validateBundle(x: unknown): MarketBundle | MarketDataFailure {
  const bad = fail('normalization', 'invalid-data');
  const b = (x ?? {}) as Record<string, unknown>;
  const strings = ['symbol', 'currency', 'provider', 'acquiredAt'];
  if (typeof x !== 'object' || x === null || !strings.every((k) => typeof b[k] === 'string')) return bad;
  if (b.adjustment !== 'split-dividend' || !isDate(b.analysisDate) || !isDate(b.marketAsOf)) return bad;
  if (!Number.isInteger(b.historySessions) || (b.historySessions as number) < MIN_HISTORY_SESSIONS) return bad;
  const recent = b.recent;
  if (!Array.isArray(recent) || recent.length < 1 || recent.length > RECENT_SESSIONS || !recent.every(validSession)) return bad;
  for (let i = 1; i < recent.length; i++) if (recent[i].date <= recent[i - 1].date) return bad;
  const latest = b.latest;
  if (!validSession(latest) || latest.date !== b.marketAsOf || JSON.stringify(latest) !== JSON.stringify(recent.at(-1))) return bad;
  if (latest.date > (b.analysisDate as string)) return bad;
  const r = b.range52w as { high?: unknown; low?: unknown } | undefined;
  const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (!r || !fin(r.high) || !fin(r.low) || r.low <= 0 || !le(r.low, latest.low) || !le(latest.high, r.high)) return bad;
  const ind = b.indicators as Record<string, unknown>;
  if (typeof ind !== 'object' || ind === null || Object.keys(ind).length !== INDICATOR_NAMES.length
    || !INDICATOR_NAMES.every((k) => typeof ind[k] === 'number' && Number.isFinite(ind[k]))) return bad;
  return canonicalBundle(x as MarketBundle);
}

// ---- rendering (the only place with decimal formatting), identities, replay ----

const f2 = (v: number) => v.toFixed(2);
export function renderMarketFacts(b: MarketBundle) {
  const l = b.latest, prev = b.recent.at(-2);
  const chg = prev ? `, ${l.close >= prev.close ? '+' : ''}${f2((l.close / prev.close - 1) * 100)}% from the previous session's ${f2(prev.close)}` : '';
  const i = b.indicators;
  const low = Math.min(...b.recent.map((s) => s.low)), high = Math.max(...b.recent.map((s) => s.high));
  const avgVol = Math.round(b.recent.reduce((a, s) => a + s.volume, 0) / b.recent.length);
  return `On the ${b.marketAsOf} close ${b.symbol} traded at ${f2(l.close)} ${b.currency}${chg}; ` +
    `open ${f2(l.open)}, high ${f2(l.high)}, low ${f2(l.low)}, volume ${l.volume} (market fact L1). ` +
    `Moving averages: 10 EMA ${f2(i.close_10_ema)}, 50 SMA ${f2(i.close_50_sma)}, 200 SMA ${f2(i.close_200_sma)}, ` +
    `VWMA ${f2(i.vwma)} (market fact L2). ` +
    `Momentum and volatility: MACD ${f2(i.macd)}, signal ${f2(i.macds)}, histogram ${f2(i.macdh)}, RSI ${f2(i.rsi)}, ` +
    `Bollinger ${f2(i.boll_lb)}–${f2(i.boll)}–${f2(i.boll_ub)}, ATR ${f2(i.atr)} (market fact L3). ` +
    `Over the last ${b.recent.length} sessions it ranged from ${f2(low)} to ${f2(high)} on average daily volume ` +
    `of ${avgVol} shares; prices are split- and dividend-adjusted (market fact L4).`;
}

// Canonical form: keys in data-model.md order, built explicitly (not from incidental key order).
const canonSession = (s: Session): Session =>
  ({ date: s.date, open: s.open, high: s.high, low: s.low, close: s.close, volume: s.volume });
function canonicalBundle(b: MarketBundle): MarketBundle {
  return {
    symbol: b.symbol, currency: b.currency, provider: b.provider, adjustment: b.adjustment,
    analysisDate: b.analysisDate, marketAsOf: b.marketAsOf, acquiredAt: b.acquiredAt,
    historySessions: b.historySessions, latest: canonSession(b.latest),
    indicators: Object.fromEntries(INDICATOR_NAMES.map((k) => [k, b.indicators[k]])) as Indicators,
    recent: b.recent.map(canonSession),
    range52w: { high: b.range52w.high, low: b.range52w.low },
  };
}

async function sha256(text: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return `sha256:${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
export const snapshotDigest = (b: MarketBundle) => sha256(JSON.stringify(canonicalBundle(b)));
export const marketFactsDigest = (text: string) => sha256(text);

// Local, never-committed replay artifact: the bundle, its rendering and their identities; no raw body.
export async function replayArtifact(bundle: MarketBundle) {
  const marketFacts = renderMarketFacts(bundle);
  return { bundle: canonicalBundle(bundle), marketFacts, snapshotDigest: await snapshotDigest(bundle),
    marketFactsDigest: await marketFactsDigest(marketFacts) };
}
