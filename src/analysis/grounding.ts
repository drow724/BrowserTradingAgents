// Feature 010 grounding checker (contracts/grounding.md, research R5). Pure and deterministic: the same extractor
// reads the facts (building what is supported) and each output (what is claimed). A claim is supported only when a
// fact holds the same value at the precision the output shows; forms the rules cannot read are "unrecognised",
// never supported. No model is involved.
import type { Fact } from './facts.ts';

export type ClaimType = 'number' | 'ticker' | 'date';
export type ClaimStatus = 'supported' | 'unsupported' | 'unrecognised';
export type Claim = { text: string; type: ClaimType; value: string; status: ClaimStatus; factId?: string; start: number; end: number };
export type Grounding = { byRole: Record<string, Claim[]>; answer: Claim[];
  counts: { supported: number; unsupported: number; unrecognised: number } };

type Unit = 'pct' | 'KRW' | 'USD' | 'g' | 'kg' | 'BTC' | 'shares' | 'none';
type Raw = { text: string; start: number; end: number } & (
  | { type: 'number'; abs: number; step: number; unit: Unit }
  | { type: 'ticker' | 'date'; value: string }
  | { type: 'unrecognised' });

const UNIT: Record<string, Unit> = { '%': 'pct', '퍼센트': 'pct', '원': 'KRW', KRW: 'KRW', '₩': 'KRW', '$': 'USD', USD: 'USD', '달러': 'USD',
  g: 'g', '그램': 'g', kg: 'kg', BTC: 'BTC', '주': 'shares', shares: 'shares' };
// Upper-case words that are units, market names or common finance acronyms, never read as tickers.
const NOT_TICKERS = new Set(['KRW', 'USD', 'BTC', 'ETF', 'ETN', 'EPS', 'CEO', 'CFO', 'IPO', 'GDP', 'RSI', 'MACD', 'EMA', 'SMA', 'US',
  'KRX', 'KOSPI', 'KOSDAQ', 'KONEX', 'NYSE', 'AI', 'Q1', 'Q2', 'Q3', 'Q4', 'OK', 'PE', 'PER', 'PBR', 'ROE']);

const DATE = /(\d{4})-(\d{2})-(\d{2})|(\d{4})\.\s?(\d{1,2})\.\s?(\d{1,2})|(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g;
const NUMBER = /([+-])?([₩$])?\s?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)(?!\d|,\d)\s?(만|억)?\s?(%|퍼센트|원|KRW|USD|달러|kg|g(?![a-z])|그램|BTC|주|shares)?/g;
const KOREAN_NUMERAL = /(?:[일이삼사오육칠팔구]?[십백천만억]\s?)+[일이삼사오육칠팔구]?\s?(?:원|달러|퍼센트)|\d+\s?천\s?(?:원|달러)?/g;
const pad = (n: string) => n.padStart(2, '0');

export function extract(text: string, known: Iterable<string> = []): Raw[] {
  const out: Raw[] = [];
  const taken: [number, number][] = [];
  const free = (s: number, e: number) => !taken.some(([a, b]) => s < b && e > a);
  const take = (r: Raw) => { out.push(r); taken.push([r.start, r.end]); };

  for (const m of text.matchAll(DATE)) {
    const [y, mo, d] = m[1] ? [m[1], m[2], m[3]] : m[4] ? [m[4], m[5], m[6]] : [m[7], m[8], m[9]];
    take({ type: 'date', value: `${y}-${pad(mo)}-${pad(d)}`, text: m[0], start: m.index!, end: m.index! + m[0].length });
  }
  for (const m of text.matchAll(KOREAN_NUMERAL)) {
    const s = m.index!, e = s + m[0].trimEnd().length;
    if (free(s, e) && /[일이삼사오육칠팔구십백천]/.test(m[0])) take({ type: 'unrecognised', text: m[0].trimEnd(), start: s, end: e });
  }
  for (const m of text.matchAll(NUMBER)) {
    const [whole, , sym, digits, mag, suffix] = m;
    const s = m.index! + whole.search(/[₩$\d]/), e = m.index! + whole.trimEnd().length;
    if (!free(s, e) || /[A-Za-z\d.]/.test(text[s - 1] ?? '')) continue; // part of a word, fact id (H3) or decimal
    const plain = digits.replaceAll(',', '');
    const dec = plain.split('.')[1]?.length ?? 0;
    const unit = UNIT[suffix ?? sym ?? ''] ?? 'none';
    if (!mag && unit === 'none' && dec === 0 && !digits.includes(',')) {
      if (/^\d{6}$/.test(plain)) { take({ type: 'ticker', value: plain, text: plain, start: s, end: s + 6 }); continue; } // KR code
      if (Number(plain) <= 10) continue; // counts such as "3 reasons" (committed rule)
    }
    const k = mag === '만' ? 1e4 : mag === '억' ? 1e8 : 1;
    take({ type: 'number', abs: Math.abs(Number(plain)) * k, step: 10 ** -dec * k, unit, text: text.slice(s, e), start: s, end: e });
  }
  // US tickers: upper-case tokens that are known tickers (facts, holdings, directory), one pass over the text.
  const set = known instanceof Set ? known : new Set(known);
  for (const m of text.matchAll(/(?<![A-Za-z0-9])[A-Z][A-Z.]{0,5}(?![A-Za-z0-9])/g)) {
    const t = m[0].replace(/\.$/, ''), s = m.index!;
    if (t.length >= 2 && set.has(t) && !NOT_TICKERS.has(t) && free(s, s + t.length)) take({ type: 'ticker', value: t, text: t, start: s, end: s + t.length });
  }
  return out.sort((a, b) => a.start - b.start);
}

// What the facts support: every value the same extractor finds in them, with its fact id.
function supportedBy(facts: readonly Fact[], known: Iterable<string>) {
  return facts.flatMap((f) => extract(f.text, known).map((r) => ({ r, id: f.id })));
}

function check(raw: Raw, support: ReturnType<typeof supportedBy>): Claim {
  const base = { text: raw.text, start: raw.start, end: raw.end };
  if (raw.type === 'unrecognised') return { ...base, type: 'number', value: raw.text, status: 'unrecognised' };
  if (raw.type !== 'number') {
    const hit = support.find(({ r }) => r.type === raw.type && r.value === raw.value);
    return { ...base, type: raw.type, value: raw.value, status: hit ? 'supported' : 'unsupported', ...(hit ? { factId: hit.id } : {}) };
  }
  // The fact value rounded to the precision the claim shows (e.g. 65,320 → "6.5만"; -8.00% → "8%").
  // A unit-less claim against a fact with a unit must be exact (no rounding): "11월" is not "11.2%".
  const hit = support.find(({ r }) => r.type === 'number' && (
    raw.unit === r.unit || r.unit === 'none'
      ? Math.abs(Math.round(r.abs / raw.step) * raw.step - raw.abs) < raw.step / 1000
      : raw.unit === 'none' && r.abs === raw.abs));
  const value = `${+raw.abs.toPrecision(12)}${raw.unit === 'none' ? '' : ` ${raw.unit}`}`;
  return { ...base, type: 'number', value, status: hit ? 'supported' : 'unsupported', ...(hit ? { factId: hit.id } : {}) };
}

export function claims(text: string, facts: readonly Fact[], known: Iterable<string> = []): Claim[] {
  const support = supportedBy(facts, known);
  return extract(text, known).map((r) => check(r, support));
}

export function ground(outputs: readonly { role: string; text: string }[], answer: string, facts: readonly Fact[],
  knownTickers: Iterable<string> = []): Grounding {
  const known = new Set(knownTickers);
  const byRole = Object.fromEntries(outputs.map((o) => [o.role, claims(o.text, facts, known)]));
  const a = claims(answer, facts, known);
  const n = (s: ClaimStatus) => a.filter((c) => c.status === s).length;
  return { byRole, answer: a, counts: { supported: n('supported'), unsupported: n('unsupported'), unrecognised: n('unrecognised') } };
}
