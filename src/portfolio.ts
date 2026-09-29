// Feature 009 portfolio (data-model.md, contracts/portfolio-storage.md): browser-only holdings in
// localStorage["bta.portfolio"]. Nothing here sends anything anywhere (FR-012). Every storage access is
// guarded: private windows and blocked site data throw.
export const KEY = 'bta.portfolio';
export type Currency = 'KRW' | 'USD';
export type ProductType = 'stock' | 'preferred' | 'etf' | 'etn' | 'reit';
export type InstrumentRef =
  | { kind: 'fixed'; id: 'BTC' | 'KRX-GOLD' }
  | { kind: 'listing'; assetClass: 'KR' | 'US'; ticker: string; name: string; market: string; productType: ProductType };
export type Holding = { instrument: InstrumentRef; quantity: number; averagePrice: number; currency: Currency; editedAt: string };
export type Portfolio = { version: 1; onboardedAt: string; holdings: Holding[] };
export type Loaded =
  | { state: 'first' }
  | { state: 'ok'; portfolio: Portfolio }
  | { state: 'unreadable' }
  | { state: 'unavailable' };

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
// Resolved inside each try: in a blocked context even reading `localStorage` throws.
const store = (): Store => globalThis.localStorage;

export function load(s?: Store): Loaded {
  let raw: string | null;
  try { raw = (s ?? store()).getItem(KEY); } catch { return { state: 'unavailable' }; }
  if (raw === null) return { state: 'first' };
  try {
    const p = JSON.parse(raw) as Portfolio;
    if (p?.version !== 1 || typeof p.onboardedAt !== 'string' || !Array.isArray(p.holdings)) return { state: 'unreadable' };
    return { state: 'ok', portfolio: p };
  } catch { return { state: 'unreadable' }; }
}
// Whole-document write: the last complete save wins (edge case "two tabs").
export function save(p: Portfolio, s?: Store): boolean {
  try { (s ?? store()).setItem(KEY, JSON.stringify(p)); return true; } catch { return false; }
}
export function reset(s?: Store): boolean {
  try { (s ?? store()).removeItem(KEY); return true; } catch { return false; }
}

export const identity = (i: InstrumentRef) => (i.kind === 'fixed' ? i.id : `${i.assetClass}:${i.ticker}`);
export const FIXED = { BTC: '비트코인', 'KRX-GOLD': 'KRX 금현물' } as const;
export const instrumentName = (i: InstrumentRef) => (i.kind === 'fixed' ? FIXED[i.id] : i.name);

// Per asset class (data-model.md): quantity decimals and allowed currencies.
function rules(i: InstrumentRef): { decimals: number; currencies: Currency[]; unit: string } {
  if (i.kind === 'fixed') return i.id === 'BTC' ? { decimals: 8, currencies: ['KRW', 'USD'], unit: 'BTC' } : { decimals: 2, currencies: ['KRW'], unit: 'g' };
  return i.assetClass === 'KR' ? { decimals: 0, currencies: ['KRW'], unit: '주' } : { decimals: 6, currencies: ['USD'], unit: '주' };
}
export const currenciesFor = (i: InstrumentRef) => rules(i).currencies;
export const unitFor = (i: InstrumentRef) => rules(i).unit;

const LIMIT = 1e12;
// Form text → a holding, or the first field error in Korean (FR-008).
export function parseHolding(input: { instrument: InstrumentRef; quantity: string; averagePrice: string; currency: Currency }, now = new Date()):
  { ok: Holding } | { error: { field: 'quantity' | 'averagePrice' | 'currency'; message: string } } {
  const r = rules(input.instrument);
  const num = (t: string) => (/^\d+(\.\d+)?$/.test(t.trim()) ? Number(t.trim()) : NaN);
  const q = num(input.quantity), p = num(input.averagePrice);
  const decimals = (t: string) => t.trim().split('.')[1]?.length ?? 0;
  if (!Number.isFinite(q) || q <= 0) return { error: { field: 'quantity', message: '수량은 0보다 큰 숫자여야 합니다.' } };
  if (q > LIMIT) return { error: { field: 'quantity', message: '수량이 너무 큽니다.' } };
  if (decimals(input.quantity) > r.decimals) {
    return { error: { field: 'quantity', message: r.decimals ? `수량은 소수점 ${r.decimals}자리까지 입력할 수 있습니다.` : '수량은 정수로 입력해야 합니다.' } };
  }
  if (!Number.isFinite(p) || p <= 0) return { error: { field: 'averagePrice', message: '평균 단가는 0보다 큰 숫자여야 합니다.' } };
  if (p > LIMIT) return { error: { field: 'averagePrice', message: '평균 단가가 너무 큽니다.' } };
  if (!r.currencies.includes(input.currency)) return { error: { field: 'currency', message: `통화는 ${r.currencies.join(' 또는 ')}만 가능합니다.` } };
  return { ok: { instrument: input.instrument, quantity: q, averagePrice: p, currency: input.currency, editedAt: now.toISOString() } };
}
