// BROWSER_AUTOMATED (stand-in): the harness in Playwright Chromium. Not Prompt API evidence.
import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

async function run(page: Page, url: string) {
  await page.goto(url);
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });
  return JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
}

test('stand-in provider: S1–S5 and S7 PASS, S6 observed', async ({ page }, testInfo) => {
  const record = await run(page, '/harness/?provider=standin');
  const s = record.scenarios;
  expect(record.evidenceClass).toBe('BROWSER_AUTOMATED');
  expect(record.provider).toBe('standin');
  // Availability describes this browser's native Prompt API, never the stand-in's.
  expect(record.environment.availability).not.toBe('MODEL_AVAILABLE');
  for (const name of ['S1_single', 'S2_reuse', 'S3_concurrent2', 'S4_cancel', 'S5_structured', 'S7_cleanup']) {
    expect(s[name].outcome, `${name}: ${JSON.stringify(s[name])}`).toBe('PASS');
  }
  expect(s.S6_systemRole.outcome).toBe('OBSERVED');
  expect(s.S6_systemRole.observation).toMatch(/\(standin\)$/);
  expect(s.S3_concurrent2.snapshotWhileRunning).toMatchObject({ active: 1, queued: 1 });
  expect(s.S4_cancel.snapshotAfter).toMatchObject({ active: 0, queued: 0 });
  expect(s.S4_cancel.taskErrorCode).toBe('cancelled');
  expect(s.S4_cancel.active.callerError).toMatch(/^TaskError:cancelled/);
  expect(s.S4_cancel.active.snapshotAfter).toMatchObject({ active: 0, queued: 0 });
  expect(s.S4_cancel.active.requestAfter).toBe('PASS');
  expect(s.S5_structured.fallbacks).toBeLessThanOrEqual(1);
  expect(s.S7_cleanup.snapshotAfterShutdown).toEqual({ state: 'closed', active: 0, queued: 0 });
  // Routine runs never overwrite committed Feature evidence; copy this file there deliberately.
  writeFileSync(testInfo.outputPath('evidence.json'), JSON.stringify(record, null, 2) + '\n');
});

test('native provider in Playwright Chromium: no Prompt API model → BLOCKED, nothing PASS', async ({ page }) => {
  const record = await run(page, '/harness/');
  expect(record.provider).toBe('native');
  expect(record.environment.availability).not.toBe('MODEL_AVAILABLE');
  expect(record.evidenceClass).toBe('BLOCKED');
  expect(record.blocked.reason).toContain(record.environment.availability);
  for (const scenario of Object.values(record.scenarios) as { outcome: string }[]) {
    expect(scenario.outcome).toBe('BLOCKED');
  }
});
