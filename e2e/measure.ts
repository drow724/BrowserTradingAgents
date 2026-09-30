// Feature 010 measurement driver (contracts/measurement.md): asks every committed question through the UI (question
// box → holding runs → answer window) and builds the report from the finished evidence records. Shared by the
// stand-in spec (e2e/measurement.spec.ts) and the opt-in native run (e2e/prompt-api.spec.ts).
import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { aggregate, trapHandled, verdict, type MeasureRun } from '../src/analysis/report.ts';

// Opens the app with the stand-in and loads the fictional example portfolio (FR-007a).
export async function loadExample(page: Page, url = '/?provider=standin') {
  await page.goto(url);
  await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '포트폴리오' }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: '예시 포트폴리오' }).click();
  await expect(page.locator('[data-holding]')).toHaveCount(6);
}
export type Question = { id: string; text: string; kind: 'single' | 'multi' | 'trap'; expect: string[] };
export const QUESTIONS: Question[] = JSON.parse(readFileSync('test/fixtures/grounding/questions.json', 'utf8')).questions;

type Rec = { outcome: string; error?: string | null; evidenceClass: string; timing?: { graphMs?: number }; result?: { finalDecision?: string };
  analysis: { holding: string; grounding?: { counts: { unsupported: number; unrecognised: number; semanticMismatch?: number; interpretationUnsupported?: number } }; answerLanguage?: string;
    numbers?: { mode: 'current' | 'formatted' | 'refs'; raw?: string; rendered?: string; violations?: unknown[] } } };

// Feature 013: `mode` is the page's number mode (?numbers=); it only labels the runs, the page decides.
// `strict` (stand-in): the holdings of every question must be exactly the expected ones. Native (not strict): a run
// that ended the sequence early is recorded as it happened and the missing holdings as `not-run` (Feature 013).
export async function measure(page: Page, repetitions: number, meta: { model: string; browser: string }, mode?: 'current' | 'formatted' | 'refs', strict = true) {
  await page.evaluate(() => { // one listener per page, however often measure() runs
    const w = window as unknown as { __records?: unknown[] };
    if (w.__records) return;
    const records: unknown[] = (w.__records = []);
    document.getElementById('run')!.addEventListener('bta-done', (e) => records.push((e as CustomEvent).detail));
  });
  const runs: MeasureRun[] = [];
  for (let rep = 0; rep < repetitions; rep++) {
    for (const q of QUESTIONS) {
      const before = await page.evaluate(() => (window as unknown as { __records: unknown[] }).__records.length);
      if (await page.getByRole('dialog', { name: '답변' }).isVisible()) await page.keyboard.press('Escape');
      await page.getByLabel('질문').fill(q.text);
      await page.getByRole('button', { name: '질문하기' }).click();
      await expect(page.getByRole('dialog', { name: '답변' })).toBeVisible({ timeout: 15 * 60_000 });
      const recs = (await page.evaluate((n) => (window as unknown as { __records: unknown[] }).__records.slice(n), before)) as Rec[];
      if (strict) expect(recs.map((r) => r.analysis.holding), q.id).toEqual(q.expect);
      for (const h of q.expect.filter((h) => !recs.some((r) => r.analysis.holding === h))) {
        runs.push({ question: q.id, kind: q.kind, holding: h, outcome: 'not-run', unsupported: 0, unrecognised: 0,
          language: 'none', ms: 0, ...(mode ? { mode, violations: 0 } : {}) });
      }
      for (const r of recs) {
        const g = r.analysis.grounding?.counts, answer = r.analysis.numbers?.rendered ?? r.result?.finalDecision ?? '';
        runs.push({ question: q.id, kind: q.kind, holding: r.analysis.holding, outcome: r.outcome,
          unsupported: g?.unsupported ?? 0, unrecognised: g?.unrecognised ?? 0, mismatch: g?.semanticMismatch ?? 0, interpretation: g?.interpretationUnsupported ?? 0,
          ...(q.kind === 'trap' ? { trapHandled: r.outcome === 'success' && trapHandled(answer, g?.unsupported ?? 0) } : {}),
          language: r.analysis.answerLanguage ?? 'none', ms: r.timing?.graphMs ?? 0, answer,
          ...(r.outcome !== 'success' ? { error: r.error ?? null } : {}),
          ...(mode ? { mode, violations: r.analysis.numbers?.violations?.length ?? 0 } : {}),
          ...(r.analysis.numbers?.raw !== undefined ? { raw: r.analysis.numbers.raw } : {}) }); // Feature 017: citations re-scorable
      }
    }
  }
  const evidenceClass = (await page.evaluate(() => (window as unknown as { __records: { evidenceClass: string }[] }).__records[0]?.evidenceClass)) ?? 'unknown';
  const agg = aggregate(runs);
  return { evidenceClass, ...meta, ...(mode ? { mode } : {}), repetitions, questions: QUESTIONS.length, fixture: 'portfolio-fixture@1',
    generatedAt: new Date().toISOString(), aggregate: agg, verdict: verdict(agg, evidenceClass), runs };
}

// The report without what legitimately varies between two identical stand-in runs (SC-006).
export const stable = (r: Awaited<ReturnType<typeof measure>>) =>
  ({ ...r, generatedAt: undefined, runs: r.runs.map((x) => ({ ...x, ms: undefined })) });
