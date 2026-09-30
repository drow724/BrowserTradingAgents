// Feature 017 (research R7): a blind audit sheet for a measurement report — per successful run the facts the model was
// given, the answer as shown, and one item per number/date and per sentence with an interpretation word. No checker
// status, evidence, reason or citation is written: the auditor judges each item before the checker is run on these
// answers (scripts/precision.ts).
// Usage: node scripts/audit-sheet.ts <report.json> <sheet.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { factSet, type Fact } from '../src/analysis/facts.ts';
import { extract } from '../src/analysis/grounding.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';
import { refTable, render } from '../src/analysis/references.ts';
import type { MeasureRun } from '../src/analysis/report.ts';
import { NEWS, NEWS_KEYS, OUTLOOK, sentences, VALUATION } from '../src/analysis/semantics.ts';
import { identity, type Holding } from '../src/portfolio.ts';

const QUESTIONS = new Map((JSON.parse(readFileSync('test/fixtures/grounding/questions.json', 'utf8')).questions as { id: string; text: string }[])
  .map((q) => [q.id, q.text]));
export const TICKERS = Object.keys(PORTFOLIO_FIXTURE.instruments).map((k) => k.split(':').at(-1)!);

// The run's facts (as the checker sees them) and its answer as shown (a refs answer re-rendered from `raw`).
export function runInput(r: MeasureRun) {
  const h = (PORTFOLIO_FIXTURE.portfolio as Holding[]).find((x) => identity(x.instrument) === r.holding)!;
  const own = factSet(h).facts, question = QUESTIONS.get(r.question)!;
  const facts: Fact[] = [...own, { id: 'Q1', kind: 'question', text: question }];
  const shown = r.raw !== undefined ? render(r.raw, refTable(own), question) : { rendered: r.answer ?? '', refs: [] };
  return { facts, answer: shown.rendered, citations: shown.refs, known: [...TICKERS, r.holding.split(':').at(-1)!] };
}

export type Item = { id: string; type: 'number' | 'interpretation'; text: string; start: number; end: number; sentence: string;
  judgement?: 'correct' | 'real-error' | 'debatable' | 'supported' | 'unsupported' | 'none'; note?: string };

export function sheet(report: { runs: MeasureRun[] }) {
  const runs = report.runs.flatMap((r, index) => {
    if (r.outcome !== 'success') return [];
    const { facts, answer, known } = runInput(r);
    const ss = sentences(answer);
    const sentenceOf = (i: number) => ss.find((s) => s.start <= i && i < s.start + s.text.length)?.text.trim() ?? '';
    const keys = NEWS_KEYS.filter(([f]) => facts.some((x) => x.kind === 'news' && f.test(x.text))).map(([, k]) => k);
    const items: Item[] = [
      ...extract(answer, known).filter((x) => x.type === 'number' || x.type === 'date')
        .map((x) => ({ type: 'number' as const, text: x.text, start: x.start, end: x.end, sentence: sentenceOf(x.start) })),
      ...ss.filter((s) => [VALUATION, OUTLOOK, NEWS, ...keys].some((re) => re.test(s.text)))
        .map((s) => ({ type: 'interpretation' as const, text: s.text.trim(), start: s.start, end: s.start + s.text.length, sentence: s.text.trim() })),
    ].map((x, n) => ({ id: `${index}:${n}`, ...x }));
    return [{ index, mode: r.mode, question: r.question, holding: r.holding, facts: facts.map((f) => `${f.id} ${f.text}`), answer, items }];
  });
  const failed = report.runs.map((r, index) => ({ index, question: r.question, holding: r.holding, outcome: r.outcome, error: r.error ?? null }))
    .filter((r) => r.outcome !== 'success');
  return { runs, failed };
}

// Feature 018 (research R5): a seeded shuffle (mulberry32), so a recorded seed reproduces the order.
export function shuffle<T>(xs: readonly T[], seed: number): T[] {
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; };
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// Feature 018 (research R5): one blind sheet over several capture reports — answers mixed in a seeded order under
// opaque ids, with no mode, structure, repetition, question id, holding or checker output; the key maps them back.
export type BlindEntry = { id: string; facts: string[]; answer: string; items: Item[] };
export type KeyEntry = { report: string; run: number; structure: string; mode: string; repetition: number };
export function blindSheet(reports: { file: string; report: { runs: MeasureRun[]; structure?: string; mode?: string; repetition?: number } }[], seed: number) {
  const all = reports.flatMap(({ file, report }) => sheet(report).runs.map((r) => ({ r, key: { report: file, run: r.index,
    structure: report.structure ?? 'eight-role', mode: report.mode ?? 'current', repetition: report.repetition ?? 1 } })));
  const entries: BlindEntry[] = [], key: Record<string, KeyEntry> = {};
  shuffle(all, seed).forEach(({ r, key: k }, n) => {
    const id = `e${String(n + 1).padStart(3, '0')}`;
    entries.push({ id, facts: r.facts, answer: r.answer, items: r.items.map((i, m) => ({ ...i, id: `${id}:${m}` })) });
    key[id] = k;
  });
  return { sheet: { seed, entries }, key: { seed, entries: key } };
}

if (process.argv[1]?.endsWith('audit-sheet.ts')) {
  const args = process.argv.slice(2);
  if (args[0] === '--seed') { // Feature 018: --seed <n> <sheet> <key> <report>...
    const [, seed, sheetOut, keyOut, ...files] = args;
    const b = blindSheet(files.map((file) => ({ file, report: JSON.parse(readFileSync(file, 'utf8')) })), Number(seed));
    writeFileSync(sheetOut, JSON.stringify(b.sheet, null, 1) + '\n');
    writeFileSync(keyOut, JSON.stringify(b.key, null, 1) + '\n');
    console.log(`${b.sheet.entries.length} answers, ${b.sheet.entries.reduce((n, e) => n + e.items.length, 0)} items, seed ${seed}`);
  } else {
    const [file, out] = args;
    const s = sheet(JSON.parse(readFileSync(file, 'utf8')));
    writeFileSync(out, JSON.stringify({ report: file, ...s }, null, 1) + '\n');
    console.log(`${s.runs.length} runs, ${s.runs.reduce((n, r) => n + r.items.length, 0)} items, ${s.failed.length} failed`);
  }
}
