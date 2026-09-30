// Feature 017 (research R7, R8): the blind audit against the frozen checker — mismatch precision (real errors among
// flagged semantic mismatches; debatable counted as not real), recall of real errors (flagged as mismatch or
// unsupported), interpretation agreement, per mode and variant, and the pre-registered threshold (precision ≥ 0.8,
// no real error missed). Refuses to score a sheet with an unjudged item.
// Usage: node scripts/precision.ts <report.json> <sheet.json> [out.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { claims } from '../src/analysis/grounding.ts';
import type { MeasureRun } from '../src/analysis/report.ts';
import { runInput, type Item } from './audit-sheet.ts';

type Sheet = { runs: { index: number; mode?: string; items: Item[] }[]; failed: unknown[] };
const blank = () => ({ flagged: 0, trueMismatch: 0, falseMismatch: 0, debatable: 0, realErrors: 0, missed: 0, interpAgree: 0, interpTotal: 0 });

export function score(report: { runs: MeasureRun[] }, sheet: Sheet) {
  const unjudged = sheet.runs.flatMap((r) => r.items.filter((i) => !i.judgement).map((i) => i.id));
  if (unjudged.length) throw new Error(`unjudged items: ${unjudged.slice(0, 10).join(', ')}${unjudged.length > 10 ? ' …' : ''}`);
  const out: Record<string, Record<string, ReturnType<typeof blank> & { examples: string[] }>> = {};
  for (const variant of ['plain', 'cite'] as const) {
    for (const r of sheet.runs) {
      const { facts, answer, citations, known } = runInput(report.runs[r.index]);
      const got = claims(answer, facts, known, { citations, variant });
      for (const mode of [r.mode ?? 'none', 'total']) {
        const m = ((out[variant] ??= {})[mode] ??= { ...blank(), examples: [] });
        for (const i of r.items) {
          if (i.type === 'number') {
            const c = got.find((x) => x.start === i.start && x.end === i.end);
            if (i.judgement === 'real-error') {
              m.realErrors++;
              if (c?.status === 'semantic-mismatch') { m.flagged++; m.trueMismatch++; }
              else if (c?.status !== 'unsupported') { m.missed++; m.examples.push(`missed ${i.id}: ${i.sentence}`); }
            } else if (c?.status === 'semantic-mismatch') {
              m.flagged++;
              if (i.judgement === 'debatable') m.debatable++;
              else { m.falseMismatch++; m.examples.push(`false ${i.id}: ${i.text} — ${c.reason}`); }
            }
          } else {
            const c = got.find((x) => x.type === 'interpretation' && x.start >= i.start && x.end <= i.end);
            m.interpTotal++;
            if ((c?.status ?? 'none') === i.judgement) m.interpAgree++;
            else m.examples.push(`interpretation ${i.id}: judged ${i.judgement}, checker ${c?.status ?? 'none'} — ${i.sentence}`);
          }
        }
      }
    }
  }
  const rate = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 1000 : null);
  const result = Object.fromEntries(Object.entries(out).map(([v, modes]) => [v, Object.fromEntries(Object.entries(modes).map(([k, m]) => {
    const precision = rate(m.trueMismatch, m.flagged), recall = rate(m.realErrors - m.missed, m.realErrors);
    return [k, { ...m, precision, recall, threshold: precision !== null && precision >= 0.8 && m.missed === 0 ? 'met' : 'not met' }];
  }))]));
  return { result, failedRuns: sheet.failed.length };
}

if (process.argv[1]?.endsWith('precision.ts')) {
  const [file, sheetFile, out] = process.argv.slice(2);
  const s = score(JSON.parse(readFileSync(file, 'utf8')), JSON.parse(readFileSync(sheetFile, 'utf8')));
  if (out) writeFileSync(out, JSON.stringify({ report: file, sheet: sheetFile, ...s }, null, 1) + '\n');
  console.log(JSON.stringify(s.result, (k, v) => (k === 'examples' ? undefined : v), 1));
}
