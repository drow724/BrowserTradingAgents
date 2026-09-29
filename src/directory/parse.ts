// Feature 009 symbol directory parsers (research R1/R2, data-model.md). Pure: source bodies → compact entries.
// Names, tickers and markets pass through unchanged apart from field selection (R2 licence note). Product
// types for REITs, preferred shares and US ETNs come from name rules — best effort (finding F009-R1).
export type ProductType = 'stock' | 'preferred' | 'etf' | 'etn' | 'reit';
export type Entry = [assetClass: 'KR' | 'US', productType: ProductType, name: string, ticker: string, market: string];
export type Parsed = { asOf: string; entries: Entry[] };

// ---- Korea: data.go.kr 금융위원회 operations (JSON) ----
export type KrItem = { basDt: string; srtnCd: string; itmsNm: string; mrktCtg?: string };
type KrBody = { response?: { header?: { resultCode?: string }; body?: { totalCount?: number; items?: { item?: KrItem | KrItem[] } | '' } } };

// One page: its rows and the total, or an error for anything but a normal service response.
export function krPage(body: unknown): { items: KrItem[]; totalCount: number } {
  const r = (body as KrBody)?.response;
  if (r?.header?.resultCode !== '00' || !r.body) throw new Error('kr: not a normal service response');
  const item = r.body.items ? r.body.items.item : undefined; // an empty page has items: ""
  return { items: item ? (Array.isArray(item) ? item : [item]) : [], totalCount: Number(r.body.totalCount ?? 0) };
}
const date8 = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
const latest = (rows: KrItem[]) => { const top = rows.reduce((m, r) => (r.basDt > m ? r.basDt : m), ''); return rows.filter((r) => r.basDt === top); };
const krTicker = (c: string) => c.replace(/^A(?=\w{6}$)/, ''); // getItemInfo short codes carry an "A" prefix
const krType = (name: string): ProductType => (/리츠/.test(name) ? 'reit' : /우[BC]?$|\(전환\)$/.test(name) ? 'preferred' : 'stock');

export function parseKr(items: KrItem[], etfs: KrItem[], etns: KrItem[]): Parsed {
  const stocks = latest(items);
  if (!stocks.length) throw new Error('kr: no listed items');
  const entries: Entry[] = [
    ...stocks.map((r): Entry => ['KR', krType(r.itmsNm), r.itmsNm, krTicker(r.srtnCd), r.mrktCtg ?? 'KRX']),
    ...latest(etfs).map((r): Entry => ['KR', 'etf', r.itmsNm, krTicker(r.srtnCd), 'KOSPI']),
    ...latest(etns).map((r): Entry => ['KR', 'etn', r.itmsNm, krTicker(r.srtnCd), 'KOSPI']),
  ];
  return { asOf: date8(stocks[0].basDt), entries };
}

// ---- US: Nasdaq Trader symbol directory (pipe-delimited, header row, "File Creation Time" footer) ----
const EXCHANGE: Record<string, string> = { A: 'NYSE American', N: 'NYSE', P: 'NYSE Arca', Z: 'Cboe BZX', V: 'IEX' };

function table(text: string, file: string) {
  const lines = text.trim().split(/\r?\n/);
  const footer = lines.pop() ?? '';
  const m = footer.match(/^File Creation Time: (\d{2})(\d{2})(\d{4})\d{2}:?\d{2}/); // mmddyyyyhh:mm
  if (!m) throw new Error(`${file}: no File Creation Time footer`);
  const head = (lines.shift() ?? '').split('|');
  const rows = lines.map((l) => Object.fromEntries(l.split('|').map((v, i) => [head[i], v])) as Record<string, string>);
  return { asOf: `${m[3]}-${m[1]}-${m[2]}`, head, rows };
}
function need(head: string[], cols: string[], file: string) {
  for (const c of cols) if (!head.includes(c)) throw new Error(`${file}: missing column ${c}`);
}
const usType = (name: string, etf: string): ProductType =>
  etf === 'Y' ? 'etf' : /\bETNs?\b|Exchange Traded Note/i.test(name) ? 'etn' : /Preferred/i.test(name) ? 'preferred' : 'stock';

export function parseUs(nasdaqlisted: string, otherlisted: string): Parsed {
  const a = table(nasdaqlisted, 'nasdaqlisted'), b = table(otherlisted, 'otherlisted');
  need(a.head, ['Symbol', 'Security Name', 'Test Issue', 'ETF'], 'nasdaqlisted');
  need(b.head, ['ACT Symbol', 'Security Name', 'Exchange', 'ETF', 'Test Issue'], 'otherlisted');
  const entries: Entry[] = [
    ...a.rows.filter((r) => r['Test Issue'] !== 'Y').map((r): Entry => ['US', usType(r['Security Name'], r.ETF), r['Security Name'], r.Symbol, 'Nasdaq']),
    ...b.rows.filter((r) => r['Test Issue'] !== 'Y')
      .map((r): Entry => ['US', usType(r['Security Name'], r.ETF), r['Security Name'], r['ACT Symbol'], EXCHANGE[r.Exchange] ?? r.Exchange]),
  ];
  if (!entries.length) throw new Error('us: no listings');
  return { asOf: a.asOf > b.asOf ? a.asOf : b.asOf, entries };
}
