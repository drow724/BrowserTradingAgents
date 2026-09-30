// Feature 013 (research R3, R4): numbers by reference. Every number (and date) in a run's facts gets a name — the
// fact id when the fact holds one, else the id plus a, b, c in reading order. The final role writes `{name}`; the
// app replaces it with the value formatted by code and flags what the model wrote itself. Pure.
import type { Fact } from './facts.ts';
import { formatValue, type ValueUnit } from './format.ts';
import { claims, extract } from './grounding.ts';

export type Ref = { name: string; factId: string; value: number | string; unit: ValueUnit; text: string };
export type Violation = { kind: 'bare-number' | 'unknown-reference' | 'unbraced-reference'; text: string; start: number; end: number };
export type Rendered = { rendered: string; refs: { name: string; factId: string; start: number; end: number }[]; violations: Violation[] };

const UNITS = new Set<string>(['KRW', 'USD', 'pct', 'g', 'kg', 'BTC', 'shares']);

// The numbers and dates of one text, with their positions; a sign right before a number belongs to it.
type Found = { start: number; end: number; value: number | string; unit: ValueUnit; text: string };
export function numbersIn(text: string): Found[] {
  return extract(text).flatMap((r): Found[] => {
    if (r.type === 'date') return [{ start: r.start, end: r.end, value: r.value, unit: 'date' as ValueUnit, text: r.value }];
    if (r.type !== 'number') return [];
    const signed = /[+-]/.test(text[r.start - 1] ?? '') ? text[r.start - 1] : '';
    const digits = r.text.match(/\d[\d,]*(?:\.\d+)?/)![0].replaceAll(',', '');
    const unit = (UNITS.has(r.unit) ? r.unit : 'none') as ValueUnit;
    return [{ start: r.start, end: r.end, value: Number(`${signed === '-' ? '-' : ''}${r.abs}`), unit, text: `${signed}${digits}` }];
  });
}

export function refTable(facts: readonly Fact[]): Ref[] {
  return facts.filter((f) => f.kind !== 'question').flatMap((f) => {
    const found = numbersIn(f.text);
    return found.map((x, i) => ({ name: found.length === 1 ? f.id : `${f.id}${String.fromCharCode(97 + i)}`,
      factId: f.id, value: x.value, unit: x.unit, text: x.text }));
  });
}

// Fact text for the `refs` mode: each number followed by its name, e.g. "91,250,000 KRW {D1b}".
export function annotate(fact: Fact, table: readonly Ref[]): string {
  const mine = table.filter((r) => r.factId === fact.id);
  const at = numbersIn(fact.text);
  let out = '', from = 0;
  at.forEach((x, i) => { out += `${fact.text.slice(from, x.end)} {${mine[i].name}}`; from = x.end; });
  return out + fact.text.slice(from);
}

const REF = /\{\s*([A-Za-z]\d+[a-zA-Z]?)\s*\}/g;
const norm = (s: string) => s[0].toUpperCase() + s.slice(1).replace(/[A-Z]$/, (c) => c.toLowerCase());

export function render(raw: string, table: readonly Ref[], question = ''): Rendered {
  const byName = new Map(table.map((r) => [r.name, r]));
  const refs: Rendered['refs'] = [], violations: Violation[] = [];
  let rendered = '', from = 0;
  for (const m of raw.matchAll(REF)) {
    const ref = byName.get(norm(m[1]));
    rendered += raw.slice(from, m.index);
    const start = rendered.length;
    if (ref) {
      rendered += formatValue(ref.value, ref.unit, ref.text);
      refs.push({ name: ref.name, factId: ref.factId, start, end: rendered.length });
    } else {
      rendered += m[0];
      violations.push({ kind: 'unknown-reference', text: m[0], start, end: rendered.length });
    }
    from = m.index! + m[0].length;
  }
  rendered += raw.slice(from);
  const inRef = (s: number, e: number) => refs.some((r) => s < r.end && e > r.start) || violations.some((v) => s < v.end && e > v.start);
  for (const m of rendered.matchAll(/(?<![A-Za-z0-9{])([HDMN]\d+[a-z]?)(?![A-Za-z0-9}])/g)) {
    if (byName.has(m[1]) && !inRef(m.index!, m.index! + m[1].length)) {
      violations.push({ kind: 'unbraced-reference', text: m[1], start: m.index!, end: m.index! + m[1].length });
    }
  }
  // Numbers the model wrote itself; numbers from the question stay allowed, counts ≤ 10 are never extracted.
  const q: Fact[] = [{ id: 'Q1', kind: 'question', text: question }];
  for (const c of claims(rendered, q)) {
    if (c.type === 'ticker' || c.status === 'supported' || inRef(c.start, c.end)) continue;
    violations.push({ kind: 'bare-number', text: c.text, start: c.start, end: c.end });
  }
  return { rendered, refs, violations: violations.sort((a, b) => a.start - b.start) };
}
