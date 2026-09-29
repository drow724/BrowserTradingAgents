// Feature 009 directory server side (contracts/directory-api.md). Each source is refreshed at most once per
// Asia/Seoul day per server instance; concurrent requests share one refresh; a failed refresh keeps the last
// good copy and is not retried before the next day. The data.go.kr key is read here only and never logged,
// returned or put in an error. Server-only: imported by app/api/directory/route.ts alone.
import { krPage, parseKr, parseUs, type Entry, type KrItem, type Parsed } from './parse.ts';

export type SourceId = 'kr-data-go-kr' | 'us-nasdaq-trader';
export type SourceStatus = { id: SourceId; asOf: string | null; status: 'ok' | 'stale' | 'unavailable' | 'credential-missing'; attribution: string };
export type Directory = { fetchedDay: string; sources: SourceStatus[]; entries: Entry[] };

export const KR_BASE = 'https://apis.data.go.kr/1160100/service';
export const US_BASE = 'https://www.nasdaqtrader.com/dynamic/SymDir';
const TIMEOUT_MS = 20_000; // Feature 007's acquisition budget
const PAGE = 1000;
const ATTRIBUTION: Record<SourceId, string> = {
  'kr-data-go-kr': '공공데이터포털 · 금융위원회 (KRX상장종목정보, 증권상품시세정보)',
  'us-nasdaq-trader': 'Nasdaq Trader Symbol Directory',
};

export const seoulDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d);
const ymd = (d: Date) => seoulDay(d).replaceAll('-', '');

type Env = { BTA_DATA_GO_KR_KEY?: string; BTA_DATA_GO_KR_BASE_URL?: string; BTA_NASDAQ_TRADER_BASE_URL?: string };
type Cache = { day?: string; inflight?: Promise<void>; lastGood?: Parsed; status: SourceStatus['status'] };

export function createDirectory({ now = () => new Date(), env = process.env as Env, fetchImpl = globalThis.fetch } = {}) {
  const get = async (url: string) => {
    const r = await fetchImpl(url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  };

  async function kr(key: string): Promise<Parsed> {
    const base = env.BTA_DATA_GO_KR_BASE_URL ?? KR_BASE;
    const url = (op: string, q: Record<string, string | number>) =>
      `${base}/${op}?${new URLSearchParams({ serviceKey: key, resultType: 'json', ...Object.fromEntries(Object.entries(q).map(([k, v]) => [k, String(v)])) })}`;
    const ITEMS = 'GetKrxListedInfoService/getItemInfo';
    // The latest published day: data appears after 13:00 on the next business day (R2), so walk back ≤ 10 days.
    let basDt = '';
    for (let back = 1; back <= 10 && !basDt; back++) {
      const d = ymd(new Date(now().getTime() - back * 86_400_000));
      if (krPage(await (await get(url(ITEMS, { basDt: d, numOfRows: 1, pageNo: 1 }))).json()).totalCount > 0) basDt = d;
    }
    if (!basDt) throw new Error('kr: nothing published in 10 days');
    const all = async (op: string) => {
      const rows: KrItem[] = [];
      for (let page = 1; ; page++) {
        const p = krPage(await (await get(url(op, { basDt, numOfRows: PAGE, pageNo: page }))).json());
        rows.push(...p.items);
        if (!p.items.length || rows.length >= p.totalCount) return rows;
      }
    };
    return parseKr(await all(ITEMS), await all('GetSecuritiesProductInfoService/getETFPriceInfo'),
      await all('GetSecuritiesProductInfoService/getETNPriceInfo'));
  }
  async function us(): Promise<Parsed> {
    const base = env.BTA_NASDAQ_TRADER_BASE_URL ?? US_BASE;
    const [a, b] = await Promise.all([get(`${base}/nasdaqlisted.txt`), get(`${base}/otherlisted.txt`)]);
    return parseUs(await a.text(), await b.text());
  }

  const caches: Record<SourceId, Cache> = { 'kr-data-go-kr': { status: 'unavailable' }, 'us-nasdaq-trader': { status: 'unavailable' } };
  function ensure(id: SourceId) {
    const c = caches[id], day = seoulDay(now());
    if (c.day === day) return c.inflight; // today's refresh ran or is running: share it
    c.day = day;
    c.inflight = (async () => {
      const key = env.BTA_DATA_GO_KR_KEY;
      if (id === 'kr-data-go-kr' && !key) { c.status = c.lastGood ? 'stale' : 'credential-missing'; return; } // no request
      try {
        c.lastGood = id === 'kr-data-go-kr' ? await kr(key!) : await us();
        c.status = 'ok';
      } catch (e) {
        c.status = c.lastGood ? 'stale' : 'unavailable';
        // The error text never carries the key: URLs are not part of these messages.
        console.warn(JSON.stringify({ directory: id, refresh: 'failed', reason: e instanceof Error ? e.name : 'error' }));
      }
    })();
    return c.inflight;
  }

  return async function directory(): Promise<Directory> {
    const ids = Object.keys(caches) as SourceId[];
    await Promise.all(ids.map(ensure));
    return {
      fetchedDay: seoulDay(now()),
      sources: ids.map((id) => ({ id, asOf: caches[id].lastGood?.asOf ?? null, status: caches[id].status, attribution: ATTRIBUTION[id] })),
      entries: ids.flatMap((id) => caches[id].lastGood?.entries ?? []),
    };
  };
}

// One per server instance (ponytail: per-instance memory; a shared store only if several instances matter, F009-F1).
export const directory = createDirectory();
