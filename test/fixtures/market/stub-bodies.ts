// Feature 007 controlled Yahoo responses (research R8, R14). Synthetic chart JSON built from the golden
// history (fake values, never captured market data), in the Yahoo chart shape that
// src/server/market-provider.ts reads. Shared by the L2 route tests and the L3 browser stub.
import { readFileSync } from 'node:fs';
import { symbolInstrument, type Session } from '../../../src/market-bundle.ts';

export const HISTORY: Session[] = JSON.parse(
  readFileSync(new URL('./history.json', import.meta.url), 'utf8'));
export const LEAK = 'PROVIDER-INTERNAL-TEXT-must-not-reach-the-browser';

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
export const addDays = (date: string, n: number) => iso(dayMs(date) + n * 86_400_000);

// `count` session dates ending at `endDate` (included), weekdays only before it, ascending.
export function sessionDates(endDate: string, count: number) {
  const out = [endDate];
  for (let t = dayMs(endDate) - 86_400_000; out.length < count; t -= 86_400_000) {
    const wd = new Date(t).getUTCDay();
    if (wd !== 0 && wd !== 6) out.unshift(iso(t));
  }
  return out;
}
// 14:30 UTC is 09:30 or 10:30 in New York: the bar's New York date is its calendar date.
const stamp = (date: string) => dayMs(date) / 1000 + 14.5 * 3600;

// Raw (unadjusted) bars and Yahoo's adjclose. `factor` < 1 before the last 10 bars mimics a dividend.
// Feature 014: meta (symbol, currency, exchange zone) follows the requested symbol's form (research R2).
export function chart(endDate: string, { count = HISTORY.length, factor = (i: number) => (i < count - 10 ? 0.97 : 1), symbol = 'IBM' } = {}) {
  const inst = symbolInstrument(symbol) ?? symbolInstrument('IBM')!;
  const src = HISTORY.slice(-count);
  const dates = sessionDates(endDate, count);
  return {
    chart: {
      result: [{
        meta: { currency: inst.currency as string, symbol, exchangeTimezoneName: inst.timeZone },
        timestamp: dates.map(stamp),
        indicators: {
          quote: [{
            open: src.map((s) => s.open), high: src.map((s) => s.high), low: src.map((s) => s.low),
            close: src.map((s) => s.close), volume: src.map((s) => s.volume),
          }],
          adjclose: [{ adjclose: src.map((s, i) => s.close * factor(i)) }],
        },
      }],
      error: null,
    },
  };
}
type Chart = ReturnType<typeof chart>;
const edit = (c: Chart, f: (r: Chart['chart']['result'][0]) => void) => { f(c.chart.result[0]); return c; };

export type Reply = { status: number; type?: string; body?: string; hang?: boolean; destroy?: boolean };
const json = (status: number, body: unknown): Reply => ({ status, type: 'application/json', body: JSON.stringify(body) });

// Every controlled scenario. `endDate` is the last session date the stub reports.
export function scenario(name: string, endDate: string, symbol = 'IBM'): Reply {
  const chart_ = (end: string, o: Parameters<typeof chart>[1] = {}) => chart(end, { ...o, symbol });
  switch (name) {
    case 'valid': return json(200, chart_(endDate));
    case 'wrong-currency': return json(200, edit(chart_(endDate), (r) => { r.meta.currency = r.meta.currency === 'USD' ? 'EUR' : 'USD'; }));
    case 'valid-unadjusted': return json(200, chart_(endDate, { factor: () => 1 }));
    case 'unsettled-final': return json(200, edit(chart_(endDate), (r) => {
      const q = r.indicators.quote[0], last = r.timestamp.length - 1;
      (q.close as (number | null)[])[last] = null; (q.high as (number | null)[])[last] = null;
      (r.indicators.adjclose[0].adjclose as (number | null)[])[last] = null;
    }));
    case 'null-row': return json(200, edit(chart_(endDate), (r) => { // Feature 014 F014-R1: a bar with every field null
      const q = r.indicators.quote[0] as Record<string, (number | null)[]>;
      for (const k of ['open', 'high', 'low', 'close', 'volume']) q[k][100] = null;
      (r.indicators.adjclose[0].adjclose as (number | null)[])[100] = null;
    }));
    case 'historical-null': return json(200, edit(chart_(endDate), (r) => { (r.indicators.quote[0].open as (number | null)[])[100] = null; }));
    case 'length-mismatch': return json(200, edit(chart_(endDate), (r) => { r.indicators.quote[0].volume.pop(); }));
    case 'duplicate-timestamp': return json(200, edit(chart_(endDate), (r) => { r.timestamp[50] = r.timestamp[49]; }));
    case 'non-monotonic': return json(200, edit(chart_(endDate), (r) => { [r.timestamp[50], r.timestamp[51]] = [r.timestamp[51], r.timestamp[50]]; }));
    case 'wrong-time-zone': return json(200, edit(chart_(endDate), (r) => { r.meta.exchangeTimezoneName = 'Europe/London'; }));
    case 'missing-adjclose': return json(200, edit(chart_(endDate), (r) => { delete (r.indicators as Partial<typeof r.indicators>).adjclose; }));
    case 'future-bar': return json(200, chart_(addDays(endDate, 7)));
    case 'short': return json(200, chart_(endDate, { count: 259 }));
    case 'chart-error': return json(404, { chart: { result: null, error: { code: 'Not Found', description: LEAK } } });
    case 'chart-error-200': return json(200, { chart: { result: null, error: { code: 'Bad Request', description: LEAK } } });
    case 'unauthorized': return json(401, { finance: { error: { description: LEAK } } });
    case 'forbidden': return json(403, { finance: { error: { description: LEAK } } });
    case 'rate-limited': return { status: 429, type: 'text/plain', body: `Too Many Requests ${LEAK}` };
    case 'server-error': return { status: 500, type: 'text/html', body: `<html>${LEAK}</html>` };
    case 'non-json': return { status: 200, type: 'text/html', body: `<html>${LEAK}</html>` };
    case 'hang': return { status: 200, hang: true };
    case 'network': return { status: 0, destroy: true };
    default: throw new Error(`unknown stub scenario ${name}`);
  }
}
