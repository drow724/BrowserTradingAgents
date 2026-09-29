// Feature 010 question → holdings (research R7, FR-002, FR-003). Deterministic string matching only; no model
// decides which holdings are analysed. Longest match wins, so "삼성테스트전자우" never also selects "삼성테스트전자".
import type { Entry } from '../directory/parse.ts';
import { identity, type Holding } from '../portfolio.ts';

export type Resolution =
  | { kind: 'holdings'; identities: string[] }   // one run each, in portfolio order
  | { kind: 'not-held'; name: string }            // no run
  | { kind: 'choose' };                           // the user picks before any run

const ALL = ['전체', '모든종목', '모든자산'];
const FIXED_NAMES: Record<string, string[]> = { BTC: ['비트코인', 'bitcoin', 'btc'], 'KRX-GOLD': ['금현물', 'krx금', 'krx-gold', 'gold'] };
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

// Non-overlapping occurrences, longest first.
function matches(q: string, candidates: { key: string; id: string }[]) {
  const hits: { start: number; end: number; id: string }[] = [];
  for (const c of candidates) for (let i = q.indexOf(c.key); i >= 0; i = q.indexOf(c.key, i + 1)) hits.push({ start: i, end: i + c.key.length, id: c.id });
  hits.sort((a, b) => b.end - b.start - (a.end - a.start));
  const taken: typeof hits = [];
  for (const h of hits) if (!taken.some((t) => h.start < t.end && h.end > t.start)) taken.push(h);
  return taken;
}

export function resolve(question: string, holdings: readonly Holding[], directory?: readonly Entry[]): Resolution {
  const q = norm(question);
  if (!holdings.length) return { kind: 'choose' };
  if (ALL.some((w) => q.includes(w))) return { kind: 'holdings', identities: holdings.map((h) => identity(h.instrument)) };
  const candidates = holdings.flatMap((h) => {
    const i = h.instrument, id = identity(i);
    const keys = i.kind === 'fixed' ? FIXED_NAMES[i.id] : [i.name, i.ticker];
    return keys.map((k) => ({ key: norm(k), id }));
  });
  const found = new Set(matches(q, candidates).map((m) => m.id));
  if (found.size) return { kind: 'holdings', identities: holdings.map((h) => identity(h.instrument)).filter((id) => found.has(id)) };
  // Not held: a directory name (3+ characters, to avoid common words) or ticker in the question. Without a
  // directory this cannot be told apart from "no name at all" (FR-003) → the picker.
  if (directory?.length) {
    const upper = new Set(question.match(/(?<![A-Za-z0-9])[A-Z]{2,5}(?![A-Za-z0-9])|(?<!\d)\d{6}(?!\d)/g) ?? []);
    const hit = directory.find((e) => upper.has(e[3])) ?? directory.find((e) => e[2].length >= 3 && q.includes(norm(e[2])));
    if (hit) return { kind: 'not-held', name: hit[2] };
  }
  return { kind: 'choose' };
}
