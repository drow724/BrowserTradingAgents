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

// Feature 013 T020 (BROWSER_AUTOMATED): the same set under each number mode; each report stable on a second pass.
test('Feature 013 T020: stand-in measurement per number mode (current, formatted, refs) — stable, NOT_APPLICABLE', async ({ page }, testInfo) => {
  test.setTimeout(15 * 60_000);
  const meta = { model: 'stand-in (echo)', browser: 'Playwright Chromium' };
  const compare: Record<string, unknown> = {};
  for (const [i, mode] of (['current', 'formatted', 'refs'] as const).entries()) {
    if (i === 0) await loadExample(page, `/?provider=standin&quotes=fixture&numbers=${mode}`);
    else { await page.goto(`/?provider=standin&quotes=fixture&numbers=${mode}`); await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled(); }
    await page.keyboard.press('Escape');
    const a = await measure(page, 1, meta, mode);
    const b = await measure(page, 1, meta, mode);
    expect(stable(b), mode).toEqual(stable(a));
    expect(a.verdict).toBe('NOT_APPLICABLE');
    expect(a.aggregate.failed).toBe(0);
    expect(a.runs.every((r) => r.mode === mode)).toBe(true);
    expect(a.aggregate.formatViolationRate === null).toBe(mode !== 'refs');
    writeFileSync(testInfo.outputPath(`measurement-standin-${mode}.json`), JSON.stringify(a, null, 2) + '\n');
    compare[mode] = a.aggregate;
  }
  writeFileSync(testInfo.outputPath('measurement-standin-compare.json'), JSON.stringify(compare, null, 2) + '\n');
  console.log('Feature 013 stand-in compare', JSON.stringify(compare));
});
