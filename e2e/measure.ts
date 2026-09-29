// Feature 010 measurement driver (contracts/measurement.md): asks every committed question through the UI (question
// box → holding runs → answer window) and builds the report from the finished evidence records. Shared by the
// stand-in spec (e2e/measurement.spec.ts) and the opt-in native run (e2e/prompt-api.spec.ts).
import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { aggregate, trapHandled, verdict, type MeasureRun } from '../src/analysis/report.ts';

// Opens the app with the stand-in and loads the fictional example portfolio (FR-007a).
export async function loadExample(page: Page) {
  await page.goto('/?provider=standin');
  await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '포트폴리오' }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: '예시 포트폴리오' }).click();
  await expect(page.locator('[data-holding]')).toHaveCount(6);
}
export type Question = { id: string; text: string; kind: 'single' | 'multi' | 'trap'; expect: string[] };
export const QUESTIONS: Question[] = JSON.parse(readFileSync('test/fixtures/grounding/questions.json', 'utf8')).questions;

type Rec = { outcome: string; evidenceClass: string; timing?: { graphMs?: number }; result?: { finalDecision?: string };
  analysis: { holding: string; grounding?: { counts: { unsupported: number; unrecognised: number } }; answerLanguage?: string } };

export async function measure(page: Page, repetitions: number, meta: { model: string; browser: string }) {
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
      expect(recs.map((r) => r.analysis.holding), q.id).toEqual(q.expect);
      for (const r of recs) {
        const g = r.analysis.grounding?.counts, answer = r.result?.finalDecision ?? '';
        runs.push({ question: q.id, kind: q.kind, holding: r.analysis.holding, outcome: r.outcome,
          unsupported: g?.unsupported ?? 0, unrecognised: g?.unrecognised ?? 0,
          ...(q.kind === 'trap' ? { trapHandled: r.outcome === 'success' && trapHandled(answer, g?.unsupported ?? 0) } : {}),
          language: r.analysis.answerLanguage ?? 'none', ms: r.timing?.graphMs ?? 0, answer });
      }
    }
  }
  const evidenceClass = (await page.evaluate(() => (window as unknown as { __records: { evidenceClass: string }[] }).__records[0]?.evidenceClass)) ?? 'unknown';
  const agg = aggregate(runs);
  return { evidenceClass, ...meta, repetitions, questions: QUESTIONS.length, fixture: 'portfolio-fixture@1',
    generatedAt: new Date().toISOString(), aggregate: agg, verdict: verdict(agg, evidenceClass), runs };
}

// The report without what legitimately varies between two identical stand-in runs (SC-006).
export const stable = (r: Awaited<ReturnType<typeof measure>>) =>
  ({ ...r, generatedAt: undefined, runs: r.runs.map((x) => ({ ...x, ms: undefined })) });
