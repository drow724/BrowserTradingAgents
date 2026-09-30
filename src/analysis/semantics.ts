// Feature 016 (contracts/semantic-grounding.md, research R1–R6): what each fact value means and what a claim says it
// means. The fact text stays the only source: one template per sentence form our code (or the committed fixture)
// writes gives each value its metric, basis and direction. Claim cues are finite lists read from the claim's clause.
// Pure and deterministic; no model.
import type { Fact } from './facts.ts';
import { TRAP_PHRASES } from './report.ts';

export type Semantic = { metric: string; basis?: string; direction?: 'up' | 'down'; absent?: true; start: number; end: number };

type Group = { metric: string; basis?: string | ((g: Record<string, string>) => string); direction?: (g: Record<string, string>) => 'up' | 'down' | undefined };
const dirOf = (w?: string) => (w && /fell|below|-/.test(w) ? 'down' as const : w && /rose|above|\+/.test(w) ? 'up' as const : undefined);
const UNIT = String.raw`[\d.,]+ (?:KRW|USD)`;
// Each template: a regex with named groups `v…` for the values it gives meaning to (other numbers in the sentence,
// such as the 20 of "20 sessions", are horizon mentions and keep value-only checks).
const TEMPLATES: [RegExp, Record<string, Group>][] = [
  [/^Quantity held: (?<v>[\d.,]+) \S+\.$/d, { v: { metric: 'quantity', basis: 'latest' } }],
  [new RegExp(String.raw`^Average purchase price: (?<v>${UNIT})(?: per g)?\.$`, 'd'), { v: { metric: 'cost_basis', basis: 'since_average_purchase' } }],
  [new RegExp(String.raw`^Latest price \(\d{4}-\d\d-\d\d\): (?<v>${UNIT})\.$`, 'd'), { v: { metric: 'price', basis: 'latest' } }],
  [/^Unrealised change vs\. average purchase price: (?<v>(?<s>[+-]?)[\d.]+%)\.$/d,
    { v: { metric: 'unrealised_return', basis: 'since_average_purchase', direction: (g) => (g.s === '-' ? 'down' : 'up') } }],
  [new RegExp(String.raw`^Position value at the latest price: (?<v>${UNIT})\.$`, 'd'), { v: { metric: 'position_value', basis: 'latest' } }],
  [/^(?:The (?:share )?price|The ETF|Bitcoin|KRX gold spot) (?<w>rose|fell) (?<v>[\d.]+%) over the last (?<n>\d+) (?<u>sessions|days)\.$/d,
    { v: { metric: 'price_return', basis: (g) => `${g.u === 'sessions' ? 'sessions' : 'days'}:${g.n}`, direction: (g) => dirOf(g.w) } }],
  [new RegExp(String.raw`^The price is (?<w>above|below) its (?<n>\d+)-day moving average of (?<v>${UNIT})\.$`, 'd'),
    { v: { metric: 'moving_average', basis: (g) => `days:${g.n}`, direction: (g) => dirOf(g.w) } }],
  [new RegExp(String.raw`^The (?<n>\d+)-week (?<k>high|low) is (?<v>${UNIT})(?: and the \d+-week (?<k2>high|low) is (?<v2>${UNIT}))?\.$`, 'd'),
    { v: { metric: 'range_', basis: (g) => `weeks:${g.n}` }, v2: { metric: 'range_', basis: (g) => `weeks:${g.n}` } }],
  [new RegExp(String.raw`^The (?<n>\d+)-day high was (?<v>${UNIT}) on \S+\.$`, 'd'), { v: { metric: 'range_high', basis: (g) => `days:${g.n}` } }],
  [/^Daily trading volume averaged (?<v>[\d.,]+ \S+) over the last (?<n>\d+) sessions\.$/d, { v: { metric: 'volume', basis: (g) => `sessions:${g.n}` } }],
  [/^Trading volume was (?<v>[\d.]+) times its (?<n>\d+)-day average on \S+\.$/d, { v: { metric: 'volume_ratio', basis: (g) => `days:${g.n}` } }],
  [new RegExp(String.raw`^The ETF is (?<v>[\d.]+%) (?<w>below|above) its all-time high of (?<v2>${UNIT})\.$`, 'd'),
    { v: { metric: 'distance_from_high', basis: 'all_time', direction: (g) => dirOf(g.w) }, v2: { metric: 'range_high', basis: 'all_time' } }],
  [/^The stock trades at (?<v>[\d.]+) times trailing earnings\.$/d, { v: { metric: 'valuation_multiple' } }],
];
// Sentences whose values keep value-only grounding (no template yet): the fictional fixture's news lines. A finding,
// not a silent gap (research R1); the coverage test asserts nothing else is uncovered.
export const VALUE_ONLY: RegExp[] = [/\(fictional\)\.$/];

export function factSemantics(f: Fact): Semantic[] {
  if (/^Holding: /.test(f.text)) return [{ metric: 'holding', start: 0, end: f.text.length }];
  if (/^No news is supplied/.test(f.text)) return [{ metric: 'news', absent: true, start: 0, end: f.text.length }];
  if (/^Market data not available/.test(f.text)) return [{ metric: 'market', absent: true, start: 0, end: f.text.length }];
  if (f.kind === 'news') return [{ metric: 'news', start: 0, end: f.text.length }]; // news items: evidence class news
  for (const [re, groups] of TEMPLATES) {
    const m = re.exec(f.text);
    if (!m?.groups || !m.indices?.groups) continue;
    const g = m.groups;
    return Object.entries(groups).filter(([k]) => g[k] !== undefined).map(([k, s]) => {
      const [start, end] = m.indices!.groups![k]!;
      const metric = s.metric === 'range_' ? `range_${k === 'v' ? g.k : g.k2}` : s.metric;
      const basis = typeof s.basis === 'function' ? s.basis(g) : s.basis;
      const direction = s.direction?.(g);
      return { metric, ...(basis ? { basis } : {}), ...(direction ? { direction } : {}), start, end };
    });
  }
  return [];
}

// ---- claims ----

// Clauses: sentence ends, `,` `;`, and the connectives 고/며/지만/는데 after a verb or copula ending (했고, 있으며, 했지만, 이고).
export function clauses(text: string): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = [];
  // A '.' or ',' between digits (7.6, 1,653.48) is part of a number, not a boundary.
  const re = /(?:[^.!?\n,;]|[.,](?=\d))+?(?:(?:했|였|이었|았|었|있|없|하|이)(?:고|으며|며|지만|는데)(?=\s)|[.!?\n,;](?!\d)|$)/g;
  for (const m of text.matchAll(re)) if (m[0].trim()) out.push({ text: m[0], start: m.index! });
  return out;
}
export const sentences = (text: string) => [...text.matchAll(/(?:[^.!?\n]|\.(?=\d))+[.!?]?/g)].map((m) => ({ text: m[0], start: m.index! }));

export type Cue = { start: number; end: number; basis?: string[]; metric?: string; direction?: 'up' | 'down' };
const n = (m: RegExpMatchArray) => m.slice(1).find((x) => x !== undefined)!;
// Basis cues (with the metric they imply) and metric/direction cues; Korean and English; finite lists.
const BASIS: [RegExp, (m: RegExpMatchArray) => Omit<Cue, 'start' | 'end'>][] = [
  [/(\d+)\s*일\s*이동\s*평균|(\d+)-day moving average|(\d+)일선/g, (m) => ({ basis: [`days:${n(m)}`], metric: 'moving_average' })],
  [/(\d+)\s*주\s*(?:최고|고가|신고가)|(\d+)-week high/g, (m) => ({ basis: [`weeks:${n(m)}`], metric: 'range_high' })],
  [/(\d+)\s*주\s*(?:최저|저가|신저가)|(\d+)-week low/g, (m) => ({ basis: [`weeks:${n(m)}`], metric: 'range_low' })],
  [/(\d+)\s*거래일|(\d+)\s*(?:sessions?|trading days)/g, (m) => ({ basis: [`sessions:${n(m)}`] })],
  [/(?:지난|최근)\s*(\d+)\s*일|(\d+)\s*일\s*(?:동안|간|새)|(\d+)\s*days?/g, (m) => ({ basis: [`days:${n(m)}`, `sessions:${n(m)}`] })],
  [/평균\s*매(?:수|입)\s*(?:가격|단가|가)?|평단|매(?:입|수)\s*(?:가격|단가|가)|구매\s*(?:가격|가)|취득\s*단가|average purchase(?: price)?|cost basis/gi, () => ({ basis: ['since_average_purchase'] })],
  [/미실현|무실현|평가\s*손익|unreali[sz]ed/gi, () => ({ basis: ['since_average_purchase'], metric: 'unrealised_return' })],
  [/현재가|현재\s*(?:주가|가격)|최신\s*가격?|최근\s*종가|latest price|current price/gi, () => ({ basis: ['latest'], metric: 'price' })],
];
// A metric cue may name a family: 거래량 covers the volume and its ratio to an average.
const METRIC: [RegExp, string][] = [
  [/평가액|평가\s*금액|(?:포지션|포트폴리오|보유\s*자산)(?:의)?\s*(?:전체\s*)?가치|position value/gi, 'position_value'],
  [/보유\s*수량|수량|shares held/gi, 'quantity'], [/거래량|volume/gi, 'volume'],
];
export const sameMetric = (cue: string, fact: string) => cue === fact || (cue === 'volume' && fact === 'volume_ratio');
const DOWN = /하락|떨어|내려|감소|손실|낮|fell|down|decline|drop|lost|below/gi, UP = /상승|올랐|오른|올라|증가|이익|높|rose|gain|above|\bup\b/gi;

export function cuesIn(text: string, offset: number): Cue[] {
  const out: Cue[] = [];
  for (const [re, f] of BASIS) for (const m of text.matchAll(re)) out.push({ start: offset + m.index!, end: offset + m.index! + m[0].length, ...f(m) });
  for (const [re, metric] of METRIC) for (const m of text.matchAll(re)) out.push({ start: offset + m.index!, end: offset + m.index! + m[0].length, metric });
  for (const [re, direction] of [[DOWN, 'down'], [UP, 'up']] as const) for (const m of text.matchAll(re)) {
    out.push({ start: offset + m.index!, end: offset + m.index! + m[0].length, direction });
  }
  return out;
}

// Interpretation lexicon (research R6) and insufficiency phrases (shared with the trap phrase list).
export const VALUATION = /저평가|고평가|저렴|싸다|싼 편|밸류에이션|가치\s*평가|undervalued|overvalued|cheap|valuation/i;
export const OUTLOOK = /장기|잠재력|회복|성장성|반등|upside|recover|long-term|potential|rebound/i;
export const NEWS = /뉴스|news/i;
const INSUFFICIENT = [...TRAP_PHRASES, '근거가 부족', '판단하기에는', '판단하기 어렵', '없어 ', '없습니다', 'insufficient', 'not enough', 'no news'];
export const insufficient = (s: string) => INSUFFICIENT.some((p) => s.toLowerCase().includes(p.toLowerCase()));
