// Feature 010 US6 (BROWSER_AUTOMATED): the committed measurement set through the UI with the stand-in. The stand-in
// echoes its prompt, so this proves the pipeline and its determinism (SC-006), not model quality (NOT_APPLICABLE).
import { writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { loadExample, measure, QUESTIONS, stable } from './measure.ts';

test('T024 US6/SC-006: stand-in measurement — every question, report identical on a second pass, verdict NOT_APPLICABLE', async ({ page }, testInfo) => {
  test.setTimeout(5 * 60_000);
  await loadExample(page);
  await page.keyboard.press('Escape');
  const meta = { model: 'stand-in (echo)', browser: 'Playwright Chromium' };
  const a = await measure(page, 1, meta);
  const b = await measure(page, 1, meta);
  expect(stable(b)).toEqual(stable(a));
  expect(a.evidenceClass).toBe('BROWSER_AUTOMATED');
  expect(a.verdict).toBe('NOT_APPLICABLE');
  expect(a.aggregate.failed).toBe(0);
  expect(a.runs.length).toBe(QUESTIONS.reduce((n, q) => n + q.expect.length, 0));
  writeFileSync(testInfo.outputPath('measurement-standin.json'), JSON.stringify(a, null, 2) + '\n');
  console.log('T024 stand-in aggregate', JSON.stringify(a.aggregate));
});
