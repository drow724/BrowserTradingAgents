// Feature 018 (research R7): the pre-registered comparison of the eight-role graph and the single-role baseline.
// Joins the judged blind sheet with its structure key (only after the judged sheet's hash is recorded), computes the
// metrics per repetition, structure and mode, and applies the decision rule of the spec's pre-registration.
// Secondary and context metrics come from the capture reports (the page ran the frozen checker; hashes in T011/T012).
// Usage: node scripts/compare-structures.ts <judged-sheet.json> <key.json> <agreement.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { aggregate, type MeasureRun } from '../src/analysis/report.ts';
import type { Item } from './audit-sheet.ts';

export type Verdict = 'eight-role better' | 'single-role better' | 'no difference';
type Values = { eight: number[]; single: number[] };

// Better on a metric in a mode: better in ≥ 4 of 5 repetition pairs AND the pooled difference is larger than the
// largest difference between two repetitions of the same structure. Ties are not better.
export function decide(reps: Values, pooled: { eight: number; single: number }, better: 'lower' | 'higher') {
  const b = (x: number, y: number) => (better === 'lower' ? x < y : x > y);
  const pairsBetter = {
    eight: reps.eight.filter((v, i) => b(v, reps.single[i])).length,
    single: reps.single.filter((v, i) => b(v, reps.eight[i])).length,
  };
  const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
  const maxWithinSpread = Math.max(spread(reps.eight), spread(reps.single));
  const gap = Math.abs(pooled.eight - pooled.single), need = Math.ceil(reps.eight.length * 0.8); // 4 of 5
  const verdict: Verdict = pairsBetter.eight >= need && b(pooled.eight, pooled.single) && gap > maxWithinSpread ? 'eight-role better'
    : pairsBetter.single >= need && b(pooled.single, pooled.eight) && gap > maxWithinSpread ? 'single-role better' : 'no difference';
  return { reps, pooled, pairsBetter, maxWithinSpread, verdict };
}

// H1 holds only if the eight-role graph is better on the primary metric in both modes and the audit is reliable.
export function h1(primary: Record<string, Verdict>, reliable: boolean) {
  if (!reliable) return 'not established';
  return Object.values(primary).every((v) => v === 'eight-role better') ? 'holds' : 'does not hold';
}

type Key = { seed: number; entries: Record<string, { report: string; run: number; structure: string; mode: string; repetition: number }> };
type Sheet = { entries: { id: string; items: Item[] }[] };
const isError = (i: Item) => i.judgement === 'real-error' || (i.type === 'interpretation' && i.judgement === 'unsupported');

export function compare(sheet: Sheet, key: Key, reports: Record<string, { runs: MeasureRun[] }>, reliable: boolean) {
  const unjudged = sheet.entries.flatMap((e) => e.items.filter((i) => !i.judgement).map((i) => i.id));
  if (unjudged.length) throw new Error(`unjudged items: ${unjudged.slice(0, 10).join(', ')}${unjudged.length > 10 ? ' …' : ''}`);
  const errors = new Map(sheet.entries.map((e) => [e.id, e.items.filter(isError).length]));
  // One cell per structure, mode and repetition: the answers the key assigns to it and their capture runs.
  const cells = new Map<string, { answers: number; errors: number; runs: MeasureRun[] }>();
  const cellOf = (s: string, m: string, r: number) => `${s}|${m}|${r}`;
  for (const [id, k] of Object.entries(key.entries)) {
    const c = cells.get(cellOf(k.structure, k.mode, k.repetition)) ?? { answers: 0, errors: 0, runs: [] };
    c.answers++; c.errors += errors.get(id) ?? 0;
    cells.set(cellOf(k.structure, k.mode, k.repetition), c);
  }
  for (const [file, rep] of Object.entries(reports)) {
    const any = Object.values(key.entries).find((k) => k.report === file);
    if (!any) continue;
    const c = cells.get(cellOf(any.structure, any.mode, any.repetition)) ?? { answers: 0, errors: 0, runs: [] };
    c.runs = rep.runs;
    cells.set(cellOf(any.structure, any.mode, any.repetition), c);
  }
  const modes = [...new Set(Object.values(key.entries).map((k) => k.mode))].sort();
  const repsOf = [...new Set(Object.values(key.entries).map((k) => k.repetition))].sort((a, b) => a - b);
  const metric = (m: string, f: (c: { answers: number; errors: number; runs: MeasureRun[] }) => number) =>
    ({ eight: repsOf.map((r) => f(cells.get(cellOf('eight-role', m, r))!)), single: repsOf.map((r) => f(cells.get(cellOf('single-role', m, r))!)) });
  const pool = (m: string, s: string) => {
    const cs = repsOf.map((r) => cells.get(cellOf(s, m, r))!);
    return { answers: cs.reduce((a, c) => a + c.answers, 0), errors: cs.reduce((a, c) => a + c.errors, 0), runs: cs.flatMap((c) => c.runs) };
  };
  const round = (x: number) => Math.round(x * 1000) / 1000;
  const errRate = (c: { answers: number; errors: number }) => round(c.errors / c.answers);
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
  const out: Record<string, unknown> = {};
  const primary: Record<string, Verdict> = {};
  for (const m of modes) {
    const both = (f: (c: { answers: number; errors: number; runs: MeasureRun[] }) => number) =>
      ({ eight: f(pool(m, 'eight-role')), single: f(pool(m, 'single-role')) });
    const agg = (c: { runs: MeasureRun[] }) => aggregate(c.runs);
    const realErrors = decide(metric(m, errRate), both(errRate), 'lower');
    primary[m] = realErrors.verdict;
    out[m] = {
      counts: { eight: { answers: pool(m, 'eight-role').answers, realErrors: pool(m, 'eight-role').errors },
        single: { answers: pool(m, 'single-role').answers, realErrors: pool(m, 'single-role').errors } },
      primary: { realErrorsPerAnswer: reliable ? realErrors : { ...realErrors, verdict: 'not established' } },
      secondary: {
        zeroUnsupportedRate: decide(metric(m, (c) => agg(c).zeroUnsupportedRate), both((c) => agg(c).zeroUnsupportedRate), 'higher'),
        unsupportedPerAnswer: decide(metric(m, (c) => agg(c).unsupportedPerAnswer), both((c) => agg(c).unsupportedPerAnswer), 'lower'),
        trapHandledRate: decide(metric(m, (c) => agg(c).trapHandledRate), both((c) => agg(c).trapHandledRate), 'higher'),
      },
      context: Object.fromEntries((['eight-role', 'single-role'] as const).map((s) => {
        const p = pool(m, s), a = agg(p), ok = p.runs.filter((r) => r.outcome === 'success');
        return [s, { failed: a.failed, medianMs: median(ok.map((r) => r.ms)), callsPerAnswer: round(ok.reduce((x, r) => x + (r.calls ?? 0), 0) / (ok.length || 1)),
          koreanRate: a.koreanRate, formatViolationRate: a.formatViolationRate ?? null, semanticMismatchPerAnswer: a.semanticMismatchPerAnswer ?? null,
          interpretationUnsupportedPerAnswer: a.interpretationUnsupportedPerAnswer ?? null }];
      })),
    };
  }
  return { reliable, h1: h1(primary, reliable), modes: out };
}

if (process.argv[1]?.endsWith('compare-structures.ts')) {
  const [sheetFile, keyFile, agreementFile, outFile] = process.argv.slice(2);
  const key = JSON.parse(readFileSync(keyFile, 'utf8')) as Key;
  const reports = Object.fromEntries([...new Set(Object.values(key.entries).map((k) => k.report))]
    .map((f) => [f, JSON.parse(readFileSync(f, 'utf8'))]));
  const agreement = JSON.parse(readFileSync(agreementFile, 'utf8')) as { met: boolean };
  const result = compare(JSON.parse(readFileSync(sheetFile, 'utf8')), key, reports, agreement.met);
  writeFileSync(outFile, JSON.stringify({ sheet: sheetFile, key: keyFile, agreement: agreementFile, ...result }, null, 1) + '\n');
  console.log(JSON.stringify({ h1: result.h1, reliable: result.reliable,
    primary: Object.fromEntries(Object.entries(result.modes).map(([m, v]) => [m, (v as { primary: { realErrorsPerAnswer: { verdict: string } } }).primary.realErrorsPerAnswer.verdict])) }));
}
