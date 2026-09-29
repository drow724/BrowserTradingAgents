// Feature 009 directory in the browser (research R4, FR-017): the last complete /api/directory response is
// kept in Cache Storage and refreshed at most once per Asia/Seoul day; search runs in memory with no request.
import type { Entry } from './parse.ts';
import type { Directory, SourceStatus } from './server.ts';

const CACHE = 'bta-directory', URL_ = '/api/directory';
const seoulDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d);

export type Loaded = { directory?: Directory; sources: SourceStatus[]; failed: boolean };

export async function loadDirectory(now = new Date()): Promise<Loaded> {
  // No `caches` outside a secure context (e.g. http on a LAN address): memory only for this page.
  let cache: Cache | undefined;
  try { cache = await caches.open(CACHE); } catch { /* memory only */ }
  let old: Directory | undefined;
  try { old = await (await cache?.match(URL_))?.json(); } catch { /* unreadable copy: refetch */ }
  if (old && old.fetchedDay === seoulDay(now)) return { directory: old, sources: old.sources, failed: false };
  try {
    const r = await fetch(URL_);
    const body = await r.clone().json();
    if (!r.ok || !Array.isArray(body.entries)) return { directory: old, sources: body.sources ?? old?.sources ?? [], failed: true };
    await cache?.put(URL_, r).catch(() => {}); // only after the whole body parsed (FR-017)
    return { directory: body, sources: body.sources, failed: false };
  } catch {
    return { directory: old, sources: old?.sources ?? [], failed: true };
  }
}

// Ticker prefix first, then name substring; case-insensitive; trimmed (data-model.md "Search").
export function search(entries: Entry[], assetClass: 'KR' | 'US', query: string, limit = 20): Entry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const byTicker: Entry[] = [], byName: Entry[] = [];
  for (const e of entries) {
    if (e[0] !== assetClass) continue;
    if (e[3].toLowerCase().startsWith(q)) byTicker.push(e);
    else if (e[2].toLowerCase().includes(q)) byName.push(e);
  }
  return [...byTicker, ...byName].slice(0, limit);
}

const STATUS: Record<SourceStatus['status'], (s: SourceStatus) => string> = {
  ok: (s) => `${s.asOf} 기준`,
  stale: (s) => `${s.asOf} 기준 (갱신 실패)`,
  unavailable: () => '목록 없음',
  'credential-missing': () => '인증키 없음',
};
// The line under the search box: as-of date or failure, and the attribution (FR-018, US5 AS5).
export function statusLine(sources: SourceStatus[], assetClass: 'KR' | 'US', failed: boolean): string {
  const s = sources.find((x) => x.id === (assetClass === 'KR' ? 'kr-data-go-kr' : 'us-nasdaq-trader'));
  if (!s) return failed ? '목록 없음 (종목 목록을 불러오지 못했습니다)' : '종목 목록을 불러오는 중입니다.';
  return `${STATUS[s.status](s)} · 출처: ${s.attribution}`;
}
