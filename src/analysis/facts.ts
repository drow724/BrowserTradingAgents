// Feature 010 fact set (data-model.md, research R4): everything one portfolio run gives the model, each fact with
// a stable id. Derived values are computed here, never by the model (FR-004). No fixture entry → an explicit
// "market data not available" fact and no derived facts (FR-006). Pure.
import type { TradingFixture } from '../graph/trading-fixture.ts';
import { identity, instrumentName, unitFor, type Holding } from '../portfolio.ts';
import { krw } from './format.ts';
import { PORTFOLIO_FIXTURE, type InstrumentFacts } from './portfolio-fixture.ts';
import { annotate, numbersIn, refTable } from './references.ts';

export type Fact = { id: string; kind: 'holding' | 'derived' | 'market' | 'news' | 'question'; text: string };
export type FactSet = { id: string; holding: string; facts: Fact[] };

const CLASS = { BTC: 'Bitcoin', 'KRX-GOLD': 'KRX gold spot', KR: 'Korean listing', US: 'US listing' } as const;
// Money as shown in facts: KRW whole units, USD two decimals, both with thousand separators.
export const money = (v: number, c: 'KRW' | 'USD') =>
  `${v.toLocaleString('en-US', c === 'USD' ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 })} ${c}`;
const qty = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 8 });
const unitEn = (u: string) => (u === '주' ? 'shares' : u);

export function factSet(h: Holding, fixture: { id: string; instruments: Record<string, InstrumentFacts> } = PORTFOLIO_FIXTURE): FactSet {
  const id = identity(h.instrument), i = h.instrument;
  const ticker = i.kind === 'fixed' ? i.id : i.ticker;
  const facts: Fact[] = [];
  const add = (kind: Fact['kind'], prefix: string, text: string) =>
    facts.push({ id: `${prefix}${facts.filter((f) => f.kind === kind).length + 1}`, kind, text });

  add('holding', 'H', `Holding: ${instrumentName(i)} (${ticker}), ${CLASS[i.kind === 'fixed' ? i.id : i.assetClass]}.`);
  add('holding', 'H', `Quantity held: ${qty(h.quantity)} ${unitEn(unitFor(i))}.`);
  add('holding', 'H', `Average purchase price: ${money(h.averagePrice, h.currency)}${i.kind === 'fixed' && i.id === 'KRX-GOLD' ? ' per g' : ''}.`);
  const f = (fixture.instruments as Record<string, InstrumentFacts | undefined>)[id];
  if (f && f.currency === h.currency) {
    const change = ((f.latestPrice - h.averagePrice) / h.averagePrice) * 100;
    add('derived', 'D', `Latest price (${f.asOf}): ${money(f.latestPrice, f.currency)}.`);
    add('derived', 'D', `Unrealised change vs. average purchase price: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%.`);
    add('derived', 'D', `Position value at the latest price: ${money(h.quantity * f.latestPrice, f.currency)}.`);
    for (const m of f.market) add('market', 'M', m);
    for (const n of f.news) add('news', 'N', n);
  } else {
    add('market', 'M', 'Market data not available (시장 데이터 없음).');
    add('news', 'N', 'No news is supplied for this holding.');
  }
  return { id: `${fixture.id}:${id}`, holding: id, facts };
}

const lines = (s: FactSet, ...kinds: Fact['kind'][]) =>
  s.facts.filter((f) => kinds.includes(f.kind)).map((f) => `${f.text} (fact ${f.id})`).join(' ');

// Feature 013 number modes (research R5/R6). formatted: each KRW amount followed by the app's Korean reading;
// refs: each number followed by its reference name. current: today's text.
export type NumberMode = 'current' | 'formatted' | 'refs';
function modeText(f: Fact, mode: NumberMode, table: ReturnType<typeof refTable>) {
  if (mode === 'refs') return annotate(f, table);
  let out = '', from = 0;
  for (const x of numbersIn(f.text).filter((x) => x.unit === 'KRW')) {
    out += `${f.text.slice(from, x.end)} (${krw(Number(x.value))})`;
    from = x.end;
  }
  return out + f.text.slice(from);
}

// Fact set → the graph input (Feature 004 shape + the two portfolio fields; Feature 013: answerFacts per mode).
export function toInput(s: FactSet, h: Holding, question: string, mode: NumberMode = 'current'): TradingFixture {
  const i = h.instrument;
  const table = refTable(s.facts);
  const extra = mode === 'current' ? {} : { numberMode: mode,
    answerFacts: s.facts.map((f) => `${modeText(f, mode, table)} (fact ${f.id})`).join(' ') };
  return {
    id: s.id,
    subject: `${instrumentName(i)} (${i.kind === 'fixed' ? i.id : i.ticker})`,
    marketFacts: lines(s, 'market'),
    newsFacts: lines(s, 'news'),
    holdingFacts: lines(s, 'holding', 'derived'),
    question,
    ...extra,
  };
}
