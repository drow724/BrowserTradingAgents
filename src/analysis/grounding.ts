// Feature 010 grounding checker (contracts/grounding.md, research R5). Pure and deterministic: the same extractor
// reads the facts (building what is supported) and each output (what is claimed). A claim is supported only when a
// fact holds the same value at the precision the output shows; forms the rules cannot read are "unrecognised",
// never supported. No model is involved.
// Feature 016 (contracts/semantic-grounding.md): a value match is supported only when the claim's cues (basis, metric,
// direction, subject) agree with the matching fact's meaning; otherwise it is a semantic mismatch. Valuation and
// long-term outlook statements need a fact of their evidence class. Every claim carries its evidence ids and a reason.
import type { Fact } from './facts.ts';
import { clauses, COMPARISON, cuesIn, factSemantics, HIGH_LOW, insufficient, LABEL_GAP, LONG_TERM, NEWS, NEWS_KEYS, OUTLOOK, sameMetric, sentences,
  SHORT_TERM, TIGHT_GAP, VALUATION, VALUATION_JUDGEMENT, VALUATION_NOUN, type Cue, type Semantic } from './semantics.ts';

export type ClaimType = 'number' | 'ticker' | 'date' | 'interpretation';
export type ClaimStatus = 'supported' | 'unsupported' | 'semantic-mismatch' | 'unrecognised';
export type Claim = { text: string; type: ClaimType; value: string; status: ClaimStatus; factId?: string; start: number; end: number;
  evidence: string[]; reason?: string; ambiguous?: true; kind?: 'valuation' | 'outlook' | 'news' | 'insufficient-evidence';
  citation?: Citation }; // Feature 017
// Feature 017 (research R4): a fact the model cited for a number — a rendered refs reference or a written fact id.
export type Citation = { factId: string; source: 'rendered' | 'written'; fit: 'right' | 'wrong' | 'id-only' };
export type ClaimOptions = { citations?: readonly { factId: string; start: number; end: number }[]; variant?: 'plain' | 'cite' };
export type Grounding = { byRole: Record<string, Claim[]>; answer: Claim[];
  counts: { supported: number; unsupported: number; semanticMismatch: number; unrecognised: number;
    interpretationUnsupported: number } }; // Feature 017 (F017-R1): numeric counts; interpretations reported apart

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

// Feature 016 (research R5): the value's meaning against the cues of its clause.
type Span = { start: number; end: number };
type Context = { text: string; cues: (Cue & { clause: number })[]; values: (Span & { pct: boolean })[]; clauseOf: (i: number) => number;
  foreign: (clause: number) => string | undefined };
const distance = (c: Span, r: Span) => (c.end <= r.start ? r.start - c.end : c.start >= r.end ? c.start - r.end : 0);
// Feature 017 (research R1, R2): which value of the clause a basis/metric cue belongs to. A label right after a value is
// that value's; a cue followed by a comparison marker names the other side ("평단보다 낮은 65,320원"), except for a change
// right after it ("평균 매수가 대비 8.00% 하락"); otherwise the cue labels the next value — but not a value that is itself
// the other side of a comparison unless it sits right next to it ("현재 주가가 201.00 USD보다" vs "평단 71,000원 대비"),
// nor a change measured against something else ("현재 주가는 구입 가격보다 6.27% 감소"); with no value after it, the one
// before. A Korean label after a bare space starts a new phrase ("-3.95% 현재 가격은"), so it needs 의/인/짜리/배.
function owner(q: Cue, vals: (Span & { pct: boolean })[], text: string): { v?: Span; label?: true } {
  const before = vals.filter((v) => v.end <= q.start).at(-1), after = vals.find((v) => v.start >= q.end);
  const gap = before && text.slice(before.end, q.start);
  if (gap !== undefined && LABEL_GAP.test(gap) && (/[의인짜배]/.test(gap) || /^(?:배|[A-Za-z])/.test(text.slice(q.start, q.end)))) return { v: before, label: true };
  if (COMPARISON.test(text.slice(q.end))) {
    return after && after.pct && !/[.!?\n]/.test(text.slice(q.end, after.start)) ? { v: after } : {};
  }
  if (after) {
    const between = text.slice(q.end, after.start);
    if (after.pct && /보다|대비|에\s*비해|than|compared/i.test(between)) return {};
    return COMPARISON.test(text.slice(after.end)) && !TIGHT_GAP.test(between) ? {} : { v: after };
  }
  return before ? { v: before } : {};
}
function semantic(claim: Claim & { hits?: Support }, raw: Raw, ctx: Context): Claim {
  const { hits, ...c } = claim;
  if (raw.type !== 'number' || !hits?.length) return c;
  const clause = ctx.clauseOf(raw.start);
  const mine = ctx.cues.filter((q) => q.clause === clause);
  if (mine.some((q) => q.basis && q.start <= raw.start && raw.end <= q.end)) return c; // a horizon mention ("20" of "20일")
  const vals = ctx.values.filter((v) => ctx.clauseOf(v.start) === clause);
  const owned = mine.filter((q) => q.basis || q.metric).map((q) => ({ q, o: owner(q, vals, ctx.text) })).filter(({ o }) => o.v?.start === raw.start);
  const labels = owned.filter(({ o }) => o.label);
  // The anchor is the value's own cue (a label after it first, else the nearest); its basis and metric apply together.
  const anchor = (labels.length ? labels : owned).map(({ q }) => q).sort((a, b) => distance(a, raw) - distance(b, raw))[0];
  const direction = mine.filter((q) => q.direction).sort((a, b) => distance(a, raw) - distance(b, raw))[0], foreign = ctx.foreign(clause);
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

// Feature 016 (research R6), Feature 017 (research R5): valuation / long-term outlook / news statements, one per sentence.
// A judgement needs evidence that could support it: a valuation benchmark, or long-term fundamentals — no current fact
// class is either, so such judgements are unsupported. A news restatement needs a news item it matches (a shared number or
// date, or one of the item's content keys). A sentence that says the evidence is insufficient passes; a lexicon word
// without a judgement ("potential losses", "밸류에이션 비율은 24.3") is no claim.
function interpretations(text: string, facts: readonly Fact[], numeric: readonly Claim[]): Claim[] {
  const sems = facts.map((f) => ({ id: f.id, s: factSemantics(f) }));
  const of = (p: (s: Semantic) => boolean) => sems.filter((x) => x.s.some(p)).map((x) => x.id);
  const news = facts.filter((f) => f.kind === 'news' && factSemantics(f).some((x) => !x.absent))
    .map((f) => ({ id: f.id, keys: NEWS_KEYS.filter(([fact]) => fact.test(f.text)).map(([, key]) => key) }));
  const out: Claim[] = [];
  for (const s of sentences(text)) {
    const hits = [VALUATION, OUTLOOK, NEWS, ...news.flatMap((n) => n.keys)].map((re) => re.exec(s.text)).filter((m): m is RegExpExecArray => !!m);
    if (!hits.length) continue;
    const first = hits.sort((a, b) => a.index - b.index)[0];
    const base = { text: first[0], type: 'interpretation' as const, value: s.text.trim(), start: s.start + first.index, end: s.start + first.index + first[0].length };
    if (insufficient(s.text)) {
      const evidence = NEWS.test(s.text) ? of((x) => x.metric === 'news' && !!x.absent) : [];
      out.push({ ...base, status: 'supported', kind: 'insufficient-evidence', evidence });
      continue;
    }
    if (VALUATION_JUDGEMENT.test(s.text) || (VALUATION_NOUN.test(s.text) && HIGH_LOW.test(s.text))) {
      out.push({ ...base, status: 'unsupported', kind: 'valuation', evidence: [], reason: of((x) => x.metric === 'valuation_multiple').length
        ? 'a valuation multiple alone has no benchmark (peer, history or model)' : 'no valuation evidence among the facts (cost basis and price are not valuation)' });
      continue;
    }
    if (LONG_TERM.test(s.text) && !(SHORT_TERM.test(s.text) && !/장기|long[- ]term/i.test(s.text))) {
      out.push({ ...base, status: 'unsupported', kind: 'outlook', evidence: [], reason: 'no long-term fundamental evidence (news and price facts are not)' });
      continue;
    }
    const inSentence = numeric.filter((c) => c.start >= s.start && c.end <= s.start + s.text.length);
    const said = news.filter((n) => n.keys.some((k) => k.test(s.text)) || inSentence.some((c) => c.status === 'supported' && c.evidence.includes(n.id)));
    // A restatement with a value no fact holds ("영업이익이 25% 감소" vs 18 %) does not restate the item.
    const wrong = inSentence.some((c) => c.status === 'unsupported' || c.status === 'semantic-mismatch');
    if (said.length && !wrong) out.push({ ...base, status: 'supported', kind: 'news', evidence: said.map((n) => n.id) });
    else if (said.length || NEWS.test(s.text)) {
      out.push({ ...base, status: 'unsupported', kind: 'news', evidence: [], reason: said.length ? 'news restated with a value the facts do not hold' : 'news content not matched' });
    }
  }
  return out;
}

// Feature 017 (research R4): which number each citation belongs to. A rendered reference cites itself and the nearest
// written number of equal value in its sentence (or, right at a sentence start, in the sentence before) — that pair is
// one claim, so the rendered copy is dropped. A written fact id ("M1", "(D2)", "[H3]") cites the nearest equal number or
// date of its sentence; an id without a letter for a fact with several numbers is `id-only`. A citation right after a
// number of another value is `wrong` — for a rendered reference only when it closes the sentence ("65,320원입니다 {H3}."),
// since a rendered reference inside a sentence is a value ("매수 가격 {H3}보다 8.00%"). Combined or unknown references are
// never rendered, so never cite.
const NEXT_TO = /^\s*[가-힣]{0,4}[.,]?\s*$/;
function cite(text: string, checked: (Claim & { hits?: Support })[], support: Support, rendered: readonly { factId: string; start: number; end: number }[]) {
  const ss = sentences(text);
  const sentOf = (i: number) => ss.findIndex((x) => x.start <= i && i < x.start + x.text.length);
  const inRendered = (c: Span) => rendered.some((r) => c.start >= r.start && c.end <= r.end);
  const written = checked.map((c, i) => ({ c, i })).filter(({ c }) => (c.type === 'number' || c.type === 'date') && !inRendered(c));
  const out = new Map<number, Citation>(), drop = new Set<number>();
  const gapOf = (a: Span, b: Span) => text.slice(Math.min(a.end, b.end), Math.max(a.start, b.start));
  // `value`: the rendered reference's own value — a fact with several numbers (M1a 11.2, M1b 20) is matched by that value.
  const assign = (at: Span, factId: string, source: Citation['source'], several: boolean, value?: string) => {
    const k = sentOf(at.start), atStart = !text.slice(ss[k]?.start ?? 0, at.start).trim();
    const pool = written.filter(({ c, i }) => !out.has(i) && (sentOf(c.start) === k || (atStart && sentOf(c.start) === k - 1)))
      .sort((a, b) => distance(a.c, at) - distance(b.c, at));
    const equal = pool.find(({ c }) => c.evidence.includes(factId) && (value === undefined || c.value === value));
    if (equal) { out.set(equal.i, { factId, source, fit: several ? 'id-only' : 'right' }); return true; }
    if (source === 'rendered' && !/^[\s.!?]*$/.test(text.slice(at.end, ss[k] ? ss[k].start + ss[k].text.length : text.length))) return false;
    const next = pool.find(({ c }) => c.end <= at.start && NEXT_TO.test(gapOf(c, at)));
    if (next) out.set(next.i, { factId, source, fit: 'wrong' });
    return false;
  };
  for (const r of rendered) {
    const self = checked.findIndex((c) => c.type === 'number' && c.start >= r.start && c.end <= r.end);
    if (assign(r, r.factId, 'rendered', false, checked[self]?.value) && self >= 0) drop.add(self);
    else if (self >= 0) out.set(self, { factId: r.factId, source: 'rendered', fit: 'right' });
  }
  const ids = new Set(support.map((x) => x.id));
  const braces = [...text.matchAll(/\{[^}]*\}/g)].map((m) => ({ start: m.index!, end: m.index! + m[0].length }));
  for (const m of text.matchAll(/(?<![A-Za-z0-9{])([HDMN]\d+)([a-z])?(?![A-Za-z0-9}])/g)) {
    const at = { start: m.index!, end: m.index! + m[0].length };
    if (!ids.has(m[1]) || braces.some((b) => at.start >= b.start && at.end <= b.end) || inRendered(at)) continue;
    assign(at, m[1], 'written', !m[2] && support.filter((x) => x.id === m[1] && x.r.type === 'number').length > 1);
  }
  return { out, drop };
}

export function claims(text: string, facts: readonly Fact[], known: Iterable<string> = [], options: ClaimOptions = {}): Claim[] {
  const support = supportedBy(facts, known);
  const knownSet = known instanceof Set ? known : new Set(known);
  const subject = facts.map((f) => /^Holding: .*\(([^)]+)\)/.exec(f.text)?.[1]).find(Boolean);
  const cl = clauses(text);
  const clauseOf = (i: number) => cl.reduce((k, c, j) => (c.start <= i ? j : k), -1);
  // Another holding named in the clause (a known ticker or KR code other than the subject): tokens looked up in the set,
  // once per clause.
  const foreign = cl.map((c) => (subject ? [...c.text.matchAll(/(?<![A-Za-z0-9])(?:[A-Z][A-Z.]{1,5}|\d{6})(?![A-Za-z0-9])/g)]
    .map((m) => m[0]).find((t) => t !== subject && knownSet.has(t)) : undefined));
  const cues = cl.flatMap((c, k) => cuesIn(c.text, c.start).map((q) => ({ ...q, clause: k })));
  const raws = extract(text, knownSet);
  // Values a cue can label: numbers that are not horizon mentions inside a basis cue.
  const values = raws.filter((r) => r.type === 'number' && !cues.some((q) => q.basis && q.start <= r.start && r.end <= q.end))
    .map((r) => ({ start: r.start, end: r.end, pct: r.type === 'number' && r.unit === 'pct' }));
  const ctx: Context = { text, cues, values, clauseOf, foreign: (k) => foreign[k] };
  const checked = raws.map((r) => check(r, support));
  const { out: cited, drop } = cite(text, checked, support, options.citations ?? []);
  // Variant `cite`: a right citation narrows the value's facts to the cited one before the cue check (research R4).
  const narrow = (c: Claim & { hits?: Support }, k: Citation | undefined) => (options.variant === 'cite' && k && k.fit !== 'wrong'
    && c.hits?.some((h) => h.id === k.factId) ? { ...c, hits: c.hits.filter((h) => h.id === k.factId) } : c);
  const numeric = raws.map((r, i) => {
    const k = cited.get(i), c = semantic(narrow(checked[i], k), r, ctx);
    return k ? { ...c, citation: k, ...(k.fit === 'wrong' && !c.reason ? { reason: `cites ${k.factId}, which does not hold this value` } : {}) } : c;
  }).filter((_, i) => !drop.has(i));
  // A refs-mode duplicate ("24.3 24.3배", "1.8% 1.8%"): a number right before an equal one takes that one's result.
  for (let i = numeric.length - 2; i >= 0; i--) {
    const a = numeric[i], b = numeric[i + 1];
    if (a.type === 'number' && b.type === 'number' && a.value === b.value && !text.slice(a.end, b.start).trim()) {
      const { text: _t, start: _s, end: _e, ...rest } = b;
      numeric[i] = { ...a, ...rest };
    }
  }
  return [...numeric, ...interpretations(text, facts, numeric)].sort((a, b) => a.start - b.start);
}

export function ground(outputs: readonly { role: string; text: string }[], answer: string, facts: readonly Fact[],
  knownTickers: Iterable<string> = [], citations: ClaimOptions['citations'] = []): Grounding {
  const known = new Set(knownTickers);
  const byRole = Object.fromEntries(outputs.map((o) => [o.role, claims(o.text, facts, known)]));
  const a = claims(answer, facts, known, { citations }); // Feature 017: the rendered refs of a refs answer
  const n = (s: ClaimStatus) => a.filter((c) => c.status === s && c.type !== 'interpretation').length;
  return { byRole, answer: a, counts: { supported: n('supported'), unsupported: n('unsupported'), semanticMismatch: n('semantic-mismatch'),
    unrecognised: n('unrecognised'), interpretationUnsupported: a.filter((c) => c.type === 'interpretation' && c.status === 'unsupported').length } };
}
