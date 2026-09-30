// Feature 015 (contracts/toss.md): the user's Toss holdings, reduced to what the import needs — never the account
// number, totals, profit/loss or anything secret. Not cached.
import { isTossFailure, tossPositions, type TossKind } from '../../../../src/server/toss.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS: Partial<Record<TossKind, number>> = { 'not-configured': 503, 'rate-limited': 503, timeout: 504, cancelled: 499 };

export async function GET(request: Request) {
  const r = await tossPositions(request.signal);
  return isTossFailure(r)
    ? Response.json(r, { status: STATUS[r.kind] ?? 502, headers: { 'Cache-Control': 'no-store' } })
    : Response.json({ positions: r }, { headers: { 'Cache-Control': 'no-store' } });
}
