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

if (process.argv[1]?.endsWith('audit-sheet.ts')) {
  const [file, out] = process.argv.slice(2);
  const s = sheet(JSON.parse(readFileSync(file, 'utf8')));
  writeFileSync(out, JSON.stringify({ report: file, ...s }, null, 1) + '\n');
  console.log(`${s.runs.length} runs, ${s.runs.reduce((n, r) => n + r.items.length, 0)} items, ${s.failed.length} failed`);
}
