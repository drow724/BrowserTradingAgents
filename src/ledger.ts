// Feature 010 paper-trade ledger (data-model.md, FR-022, FR-023): browser-only, simulated, never an order. It never
// touches the portfolio and makes no request. Guarded like src/portfolio.ts (blocked storage throws).
export const LEDGER_KEY = 'bta.ledger';
export type PaperTrade = { id: string; at: string; holding: string; name: string; action: 'buy' | 'sell' | 'hold';
  quantity: number; priceBasis: { value: number; currency: 'KRW' | 'USD'; source: 'latest-fixture' | 'average' };
  question: string; runRef: string };
export type Ledger = { version: 1; entries: PaperTrade[] };
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const store = (): Store => globalThis.localStorage;

export function loadLedger(s?: Store): { state: 'ok'; ledger: Ledger } | { state: 'unavailable' | 'unreadable' } {
  let raw: string | null;
  try { raw = (s ?? store()).getItem(LEDGER_KEY); } catch { return { state: 'unavailable' }; }
  if (raw === null) return { state: 'ok', ledger: { version: 1, entries: [] } };
  try {
    const l = JSON.parse(raw) as Ledger;
    return l?.version === 1 && Array.isArray(l.entries) ? { state: 'ok', ledger: l } : { state: 'unreadable' };
  } catch { return { state: 'unreadable' }; }
}
export function saveLedger(l: Ledger, s?: Store): boolean {
  try { (s ?? store()).setItem(LEDGER_KEY, JSON.stringify(l)); return true; } catch { return false; }
}

// "quantity > 0 for buy/sell (0 allowed for hold)"; the price basis must be a positive finite number.
export function tradeError(t: Pick<PaperTrade, 'action' | 'quantity' | 'priceBasis'>): string | null {
  if (!Number.isFinite(t.quantity) || t.quantity < 0 || (t.action !== 'hold' && t.quantity === 0)) {
    return t.action === 'hold' ? '수량은 0 이상이어야 합니다.' : '매수·매도 수량은 0보다 커야 합니다.';
  }
  if (!Number.isFinite(t.priceBasis.value) || t.priceBasis.value <= 0) return '기준 가격이 올바르지 않습니다.';
  return null;
}
// Entries are recorded once and can only be deleted (FR-022).
export const addTrade = (l: Ledger, t: PaperTrade): Ledger => ({ ...l, entries: [...l.entries, t] });
export const removeTrade = (l: Ledger, id: string): Ledger => ({ ...l, entries: l.entries.filter((e) => e.id !== id) });
