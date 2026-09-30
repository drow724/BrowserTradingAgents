// Feature 013 (research R5): how the app writes a fact value in a Korean answer. Pure. Every output is read back by
// the grounding checker as the same value (test/format.test.ts), so a substituted value is always supported.
export type ValueUnit = 'KRW' | 'USD' | 'pct' | 'g' | 'kg' | 'BTC' | 'shares' | 'date' | 'none';

const n = (v: number, digits = 8) => v.toLocaleString('en-US', { maximumFractionDigits: digits });

// 95,000,000 → "9,500만 원"; 22,812,500 → "2,281만 2,500원"; 950,000,000 → "9억 5,000만 원"; 9,500 → "9,500원".
export function krw(v: number): string {
  const a = Math.round(Math.abs(v)), sign = v < 0 ? '-' : '';
  if (a < 10_000) return `${sign}${n(a)}원`;
  const eok = Math.floor(a / 1e8), man = Math.floor((a % 1e8) / 1e4), rest = a % 1e4;
  const parts = [eok && `${n(eok)}억`, man && `${n(man)}만`, rest && n(rest)].filter(Boolean);
  return `${sign}${parts.join(' ')}${rest ? '원' : ' 원'}`;
}

const date = (v: string) => {
  const [y, m, d] = v.split('-');
  return d ? `${y}년 ${Number(m)}월 ${Number(d)}일` : `${y}년 ${Number(m)}월`;
};

// `text` is the number as written in the fact (keeps a percentage's sign and decimals, e.g. "-3.95").
export function formatValue(value: number | string, unit: ValueUnit, text = String(value)): string {
  switch (unit) {
    case 'KRW': return krw(Number(value));
    case 'USD': return `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}달러`;
    case 'pct': return `${text}%`;
    case 'g': case 'kg': return `${n(Number(value))}${unit}`;
    case 'BTC': return `${n(Number(value))} BTC`;
    case 'shares': return `${n(Number(value))}주`;
    case 'date': return date(String(value));
    default: return text;
  }
}
