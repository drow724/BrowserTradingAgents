// Feature 010 grounding checker (contracts/grounding.md, research R5). Pure and deterministic: the same extractor
// reads the facts (building what is supported) and each output (what is claimed). A claim is supported only when a
// fact holds the same value at the precision the output shows; forms the rules cannot read are "unrecognised",
// never supported. No model is involved.
// Feature 016 (contracts/semantic-grounding.md): a value match is supported only when the claim's cues (basis, metric,
// direction, subject) agree with the matching fact's meaning; otherwise it is a semantic mismatch. Valuation and
// long-term outlook statements need a fact of their evidence class. Every claim carries its evidence ids and a reason.
import type { Fact } from './facts.ts';
import { clauses, cuesIn, factSemantics, insufficient, NEWS, OUTLOOK, sameMetric, sentences, VALUATION, type Cue, type Semantic } from './semantics.ts';

export type ClaimType = 'number' | 'ticker' | 'date' | 'interpretation';
export type ClaimStatus = 'supported' | 'unsupported' | 'semantic-mismatch' | 'unrecognised';
export type Claim = { text: string; type: ClaimType; value: string; status: ClaimStatus; factId?: string; start: number; end: number;
  evidence: string[]; reason?: string; ambiguous?: true; kind?: 'valuation' | 'outlook' | 'news' | 'insufficient-evidence' };
export type Grounding = { byRole: Record<string, Claim[]>; answer: Claim[];
  counts: { supported: number; unsupported: number; semanticMismatch: number; unrecognised: number } };

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
// Feature 013 FR-002: digits with Korean units, read as one amount ("73만 8천 원", "2억 2천 8백만 원", "2,281만 2,500원").
const COMPOUND = /(?:\d[\d,]*(?:\.\d+)?\s?(?:[천백십]\s?)?(?:[만억](?![가-힣]))?\s?)+(?:\d[\d,]*\s?(?=원|달러))?(원|KRW|달러|USD)?/g;
const PART = /(\d[\d,]*(?:\.\d+)?)\s?([천백십])?\s?([만억])?/g;
const SMALL: Record<string, number> = { 천: 1e3, 백: 1e2, 십: 10 };
// Feature 013 FR-003: year-month without a day, in Korean and in English.
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH = /(\d{4})년\s*(\d{1,2})월(?!\s*\d)|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/g;
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
  for (const m of text.matchAll(MONTH)) {
    const [y, mo] = m[1] ? [m[1], m[2]] : [m[4], String(MONTHS.indexOf(m[3].toLowerCase()) + 1)];
    const s = m.index!, e = s + m[0].length;
    if (free(s, e)) take({ type: 'date', value: `${y}-${pad(mo)}`, text: m[0], start: s, end: e });
  }
  for (const m of text.matchAll(COMPOUND)) {
    const whole = m[0].trimEnd(), s = m.index!, e = s + whole.length;
    const parts = [...whole.matchAll(PART)].filter((p) => p[0].trim());
    // Needs a Korean unit; plain digits ("30 30") and a single 만/억 amount are left to the number pass below.
    if (!parts.some((p) => p[2] || p[3]) || (parts.length < 2 && !parts[0][2])) continue;
    if (!free(s, e) || /[A-Za-z\d.]/.test(text[s - 1] ?? '')) continue;
    let total = 0, group = 0, step = Infinity;
    for (const [, d, small, big] of parts) {
      const dec = d.split('.')[1]?.length ?? 0, scale = (small ? SMALL[small] : 1) * (big === '억' ? 1e8 : big === '만' ? 1e4 : 1);
      group += Number(d.replaceAll(',', '')) * (small ? SMALL[small] : 1);
      step = Math.min(step, 10 ** -dec * scale);
      if (big) { total += group * (big === '억' ? 1e8 : 1e4); group = 0; }
    }
    total += group;
    take({ type: 'number', abs: total, step, unit: UNIT[m[1] ?? ''] ?? 'none', text: whole, start: s, end: e });
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

// What the facts support: every value the same extractor finds in them, with its fact id and (Feature 016) meaning.
function supportedBy(facts: readonly Fact[], known: Iterable<string>) {
  return facts.flatMap((f) => {
    const sems = factSemantics(f);
    return extract(f.text, known).map((r) => ({ r, id: f.id, sem: sems.find((s) => r.start >= s.start && r.end <= s.end) as Semantic | undefined }));
  });
}
type Support = ReturnType<typeof supportedBy>;
const ids = (xs: { id: string }[]) => [...new Set(xs.map((x) => x.id))];

function check(raw: Raw, support: Support): Claim {
  const base = { text: raw.text, start: raw.start, end: raw.end };
  if (raw.type === 'unrecognised') return { ...base, type: 'number', value: raw.text, status: 'unrecognised', evidence: [] };
  if (raw.type !== 'number') {
    // A month (2026-11) is supported by the same month or by a full date in it (Feature 013 FR-003).
    const hit = support.find(({ r }) => r.type === raw.type && (r.value === raw.value || (raw.type === 'date' && raw.value.length === 7 && r.value.startsWith(raw.value))));
    return { ...base, type: raw.type, value: raw.value, status: hit ? 'supported' : 'unsupported', evidence: hit ? [hit.id] : [], ...(hit ? { factId: hit.id } : {}) };
  }
  // The fact value rounded to the precision the claim shows (e.g. 65,320 → "6.5만"; -8.00% → "8%").
  // A unit-less claim against a fact with a unit must be exact (no rounding): "11월" is not "11.2%". A claim with a
  // unit is never supported by a unit-less fact: "20%" is not "20 sessions" (Feature 013 FR-004, F010-R1) — except
  // 주, which also means "week" ("52주 최저" ↔ "52-week low"), and then only when exact.
  const hits = support.filter(({ r }) => r.type === 'number' && (
    raw.unit === r.unit
      ? Math.abs(Math.round(r.abs / raw.step) * raw.step - raw.abs) < raw.step / 1000
      : (raw.unit === 'none' || (raw.unit === 'shares' && r.unit === 'none')) && r.abs === raw.abs));
  const value = `${+raw.abs.toPrecision(12)}${raw.unit === 'none' ? '' : ` ${raw.unit}`}`;
  return { ...base, type: 'number', value, status: hits.length ? 'supported' : 'unsupported', evidence: ids(hits),
    ...(hits.length ? { factId: hits[0].id } : {}), hits } as Claim & { hits: Support };
}

// Feature 016 (research R5): the value's meaning against the nearest cues of its clause.
type Context = { cues: (Cue & { clause: number })[]; clauseOf: (i: number) => number; foreign: (clause: number) => string | undefined };
const distance = (c: Cue, r: { start: number; end: number }) => (c.end <= r.start ? r.start - c.end : c.start >= r.end ? c.start - r.end : 0);
function semantic(claim: Claim & { hits?: Support }, raw: Raw, ctx: Context): Claim {
  const { hits, ...c } = claim;
  if (raw.type !== 'number' || !hits?.length) return c;
  const clause = ctx.clauseOf(raw.start);
  const mine = ctx.cues.filter((q) => q.clause === clause);
  if (mine.some((q) => q.basis && q.start <= raw.start && raw.end <= q.end)) return c; // a horizon mention ("20" of "20일")
  const near = (f: (q: Cue) => unknown) => mine.filter(f).sort((a, b) => distance(a, raw) - distance(b, raw))[0];
  // The anchor is the nearest cue that names a basis or a metric; its basis and metric apply together ("평단 71,000원 대비
  // 현재가는 65,320원": 71,000 anchors on 평단, 65,320 on 현재가). Direction is read separately.
  const anchor = near((q) => q.basis || q.metric), direction = near((q) => q.direction), foreign = ctx.foreign(clause);
  const basis = anchor?.basis ? anchor : undefined, metric = anchor?.metric ? anchor : undefined;
  const basisOk = (s?: Semantic) => !basis || !s || (!!s.basis && basis.basis!.includes(s.basis));
  const ok = (s?: Semantic) => !foreign && basisOk(s) && (!metric || !s || sameMetric(metric.metric!, s.metric))
    && (!direction || !s?.direction || s.direction === direction.direction);
  const agree = hits.filter((h) => ok(h.sem));
  const metrics = new Set(agree.map((h) => h.sem?.metric).filter(Boolean));
  if (agree.length) return { ...c, evidence: ids(agree), factId: agree[0].id, ...(metrics.size > 1 ? { ambiguous: true } : {}) };
  const partial = hits.filter((h) => basisOk(h.sem));
  const blame = partial.length ? partial : hits;
  const said = [basis && `basis ${basis.basis!.join('|')}`, metric && `metric ${metric.metric}`, direction && `direction ${direction.direction}`,
    foreign && `subject ${foreign}`].filter(Boolean).join(', ');
  const means = blame.map((h) => `${h.id} is ${h.sem?.metric ?? 'value'}${h.sem?.basis ? ` (${h.sem.basis})` : ''}${h.sem?.direction ? ` ${h.sem.direction}` : ''}`).join('; ');
  return { ...c, status: 'semantic-mismatch', evidence: ids(blame), factId: blame[0].id, reason: `claim says ${said}; ${means}` };
}

// Feature 016 (research R6): valuation / long-term outlook / news statements, one per sentence, need a fact of their
// evidence class; a sentence that says the evidence is insufficient passes.
function interpretations(text: string, facts: readonly Fact[]): Claim[] {
  const sems = facts.map((f) => ({ id: f.id, s: factSemantics(f) }));
  const of = (p: (s: Semantic) => boolean) => sems.filter((x) => x.s.some(p)).map((x) => x.id);
  const out: Claim[] = [];
  for (const s of sentences(text)) {
    const hits = [VALUATION, OUTLOOK, NEWS].map((re) => re.exec(s.text)).filter((m): m is RegExpExecArray => !!m);
    if (!hits.length) continue;
    const first = hits.sort((a, b) => a.index - b.index)[0];
    const base = { text: first[0], type: 'interpretation' as const, value: s.text.trim(), start: s.start + first.index, end: s.start + first.index + first[0].length };
    if (insufficient(s.text)) {
      const evidence = NEWS.test(s.text) ? of((x) => x.metric === 'news' && !!x.absent) : [];
      out.push({ ...base, status: 'supported', kind: 'insufficient-evidence', evidence });
      continue;
    }
    const kind = VALUATION.test(s.text) ? 'valuation' : OUTLOOK.test(s.text) ? 'outlook' : 'news';
    const evidence = kind === 'valuation' ? of((x) => x.metric === 'valuation_multiple') : of((x) => x.metric === 'news' && !x.absent);
    out.push(evidence.length ? { ...base, status: 'supported', kind, evidence }
      : { ...base, status: 'unsupported', kind, evidence, reason: kind === 'valuation' ? 'no valuation evidence among the facts (cost basis and price are not valuation)'
        : 'no fundamental or news evidence among the facts' });
  }
  return out;
}

export function claims(text: string, facts: readonly Fact[], known: Iterable<string> = []): Claim[] {
  const support = supportedBy(facts, known);
  const knownSet = known instanceof Set ? known : new Set(known);
  const subject = facts.map((f) => /^Holding: .*\(([^)]+)\)/.exec(f.text)?.[1]).find(Boolean);
  const cl = clauses(text);
  const clauseOf = (i: number) => cl.reduce((k, c, j) => (c.start <= i ? j : k), -1);
  // Another holding named in the clause (a known ticker or KR code other than the subject): tokens looked up in the set,
  // once per clause.
  const foreign = cl.map((c) => (subject ? [...c.text.matchAll(/(?<![A-Za-z0-9])(?:[A-Z][A-Z.]{1,5}|\d{6})(?![A-Za-z0-9])/g)]
    .map((m) => m[0]).find((t) => t !== subject && knownSet.has(t)) : undefined));
  const ctx: Context = { cues: cl.flatMap((c, k) => cuesIn(c.text, c.start).map((q) => ({ ...q, clause: k }))), clauseOf,
    foreign: (k) => foreign[k] };
  const numeric = extract(text, knownSet).map((r) => semantic(check(r, support), r, ctx));
  return [...numeric, ...interpretations(text, facts)].sort((a, b) => a.start - b.start);
}

export function ground(outputs: readonly { role: string; text: string }[], answer: string, facts: readonly Fact[],
  knownTickers: Iterable<string> = []): Grounding {
  const known = new Set(knownTickers);
  const byRole = Object.fromEntries(outputs.map((o) => [o.role, claims(o.text, facts, known)]));
  const a = claims(answer, facts, known);
  const n = (s: ClaimStatus) => a.filter((c) => c.status === s).length;
  return { byRole, answer: a, counts: { supported: n('supported'), unsupported: n('unsupported'), semanticMismatch: n('semantic-mismatch'),
    unrecognised: n('unrecognised') } };
}
