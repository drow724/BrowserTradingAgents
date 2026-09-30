// Feature 013 (FR-006): re-score a recorded measurement report with the current grounding checker. Offline and pure;
// the recorded report is only read. Facts are rebuilt from portfolio-fixture@1 (+ the question as Q1); known tickers
// are the fixture instruments + the holding's own ticker (the original runs also had the symbol directory).
// Usage: node scripts/rescore-measurement.ts <report.json> [out.json] [hand-zeroUnsupported] [hand-trap]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { factSet } from '../src/analysis/facts.ts';
import { claims } from '../src/analysis/grounding.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';
import { aggregate, trapHandled, verdict, type MeasureRun } from '../src/analysis/report.ts';
import { identity, type Holding } from '../src/portfolio.ts';

const [file, out, handZ = '0.889', handT = '0.889'] = process.argv.slice(2);
const report = JSON.parse(readFileSync(file, 'utf8')) as { evidenceClass: string; runs: MeasureRun[] };
const questions = new Map((JSON.parse(readFileSync('test/fixtures/grounding/questions.json', 'utf8')).questions as { id: string; text: string }[])
  .map((q) => [q.id, q.text]));
const holdings = PORTFOLIO_FIXTURE.portfolio as Holding[];
const fixtureTickers = Object.keys(PORTFOLIO_FIXTURE.instruments).map((k) => k.split(':').at(-1)!);

const changedRuns: unknown[] = [];
const runs = report.runs.map((r, i) => {
  if (r.outcome !== 'success' || r.answer === undefined) return r;
  const h = holdings.find((x) => identity(x.instrument) === r.holding)!;
  const facts = [...factSet(h).facts, { id: 'Q1', kind: 'question' as const, text: questions.get(r.question)! }];
  const c = claims(r.answer, facts, [...fixtureTickers, r.holding.split(':').at(-1)!]);
  const unsupported = c.filter((x) => x.status === 'unsupported').length;
  const unrecognised = c.filter((x) => x.status === 'unrecognised').length;
  const next = { ...r, unsupported, unrecognised, ...(r.kind === 'trap' ? { trapHandled: trapHandled(r.answer, unsupported) } : {}) };
  if (next.unsupported !== r.unsupported || next.unrecognised !== r.unrecognised || next.trapHandled !== r.trapHandled) {
    changedRuns.push({ index: i, question: r.question, holding: r.holding,
      old: { unsupported: r.unsupported, unrecognised: r.unrecognised, trapHandled: r.trapHandled },
      new: { unsupported, unrecognised, trapHandled: next.trapHandled },
      unsupportedClaims: c.filter((x) => x.status === 'unsupported').map((x) => x.text) });
  }
  return next;
});

const old = aggregate(report.runs), now = aggregate(runs);
const rev = (() => { try { return execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim(); } catch { return 'unknown'; } })();
const result = {
  report: file, checker: { after: `${rev}+working-tree` },
  old: { ...old, verdict: verdict(old, report.evidenceClass) },
  new: { ...now, verdict: verdict(now, report.evidenceClass) },
  hand: { zeroUnsupportedRate: Number(handZ), trapHandledRate: Number(handT),
    verdict: verdict({ ...now, zeroUnsupportedRate: Number(handZ), trapHandledRate: Number(handT) }, report.evidenceClass) },
  changedRuns,
};
if (out) writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ old: result.old, new: result.new, hand: result.hand, changed: changedRuns.length }, null, 1));
