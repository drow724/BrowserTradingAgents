// Feature 015 (research R5, FR-005): Toss positions → the app's holdings, through the same symbol directory and the
// same entry rules as manual input (parseHolding); anything else is skipped with a Korean reason. Pure.
import type { Entry } from './directory/parse.ts';
import { parseHolding, type Currency, type Holding } from './portfolio.ts';

export type TossPosition = { code: string; country: string; name: string; quantity: string; averagePrice: string; currency: string };
export type ImportResult = { holdings: Holding[]; skipped: { name: string; reason: string }[] };

export function mapPositions(positions: TossPosition[], entries: Entry[], now = new Date()): ImportResult {
  const out: ImportResult = { holdings: [], skipped: [] };
  for (const p of positions) {
    if (p.country !== 'KR' && p.country !== 'US') { out.skipped.push({ name: p.name, reason: '지원하지 않는 자산' }); continue; }
    const e = entries.find(([assetClass, , , ticker]) => assetClass === p.country && ticker === p.code);
    if (!e) { out.skipped.push({ name: p.name, reason: '목록에 없는 종목' }); continue; }
    const [assetClass, productType, name, ticker, market] = e;
    const r = parseHolding({ instrument: { kind: 'listing', assetClass, ticker, name, market, productType },
      quantity: p.quantity, averagePrice: p.averagePrice, currency: p.currency as Currency }, now);
    if ('error' in r) out.skipped.push({ name: p.name, reason: r.error.message });
    else out.holdings.push(r.ok);
  }
  return out;
}
