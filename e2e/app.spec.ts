// BROWSER_AUTOMATED (stand-in): the canonical page (index.html → src/main.ts) in Playwright
// Chromium. Real LangGraph + AkariChatModel + akarisp in the browser bundle, where a node's model
// call does not inherit the graph's signal implicitly. Not Prompt API evidence.
import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const done = (page: Page) =>
  expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });
const evidence = async (page: Page) => JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
const runGraph = (page: Page) => page.getByRole('button', { name: 'Run Graph', exact: true }).click();

test('stand-in: full graph succeeds through LangGraph → AkariChatModel → AkariSP', async ({ page }, testInfo) => {
  await page.goto('/?provider=standin');
  await runGraph(page);
  await done(page);
  const r = await evidence(page);
  expect(r.evidenceClass).toBe('BROWSER_AUTOMATED');
  expect(r.provider).toBe('standin');
  expect(r.environment.availability).not.toBe('MODEL_AVAILABLE'); // describes the native API, not the stand-in
  expect(r.outcome).toBe('success');
  for (const n of ['branchA', 'branchB', 'synthesize', 'decide']) {
    expect(r.nodes[n], n).toEqual({ status: 'done', executions: 1, modelRequests: 1 });
  }
  expect(r.counts.logicalRequests).toBe(4); // measured by the bridge
  expect(r.counts.fallbackRequests).toBe(0); // no fallback path; observed
  expect(r.counts.providerInvocations).toBe('NOT EXPOSED');
  // Measured after the bounded poll, not at bridge event #2; backpressure only, not native parallelism.
  expect(r.concurrency.akarisp.fanOutSnapshot.snapshot).toMatchObject({ state: 'ready', active: 1, queued: 1 });
  expect(r.concurrency.nativeProvider).toBe('not observed (out of scope)');
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  expect(r.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  expect(r.lifecycle.snapshotAfterShutdown).toEqual({ state: 'closed', active: 0, queued: 0 });
  expect(r.revision.langgraph).toBe('1.4.18');
  expect(r.fixture).toBe('minimal-graph-fixture@1');
  expect(r.runtimeOptions).toEqual({ limit: 1, queueCapacity: 32 });
  expect(r.result.decision).toBeTruthy();
  // Routine runs never overwrite committed Feature evidence; copy this file there deliberately.
  writeFileSync(testInfo.outputPath('evidence.json'), JSON.stringify(r, null, 2) + '\n');
});

// Regression B in the browser: settlement must be observed on a `ready` runtime before shutdown().
test('stand-in: Cancel during branches → cancelled, AkariSP settles by itself before shutdown', async ({ page }) => {
  await page.goto('/?provider=standin');
  await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled(); // stand-in installed
  await page.evaluate(() => (window as unknown as { __standin: { hold(): void } }).__standin.hold());
  await runGraph(page);
  const runtime = page.locator('#runtime');
  await expect(runtime).toHaveAttribute('data-active', '1');
  await expect(runtime).toHaveAttribute('data-queued', '1');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await done(page);
  await page.evaluate(() => (window as unknown as { __standin: { resume(): void } }).__standin.resume());
  const r = await evidence(page);
  expect(r.evidenceClass).toBe('BROWSER_AUTOMATED');
  expect(r.outcome).toBe('cancelled');
  expect(r.result).toBeUndefined();
  expect(r.nodes.synthesize.status).toBe('waiting');
  expect(r.nodes.decide.status).toBe('waiting');
  const ends = r.modelRequests.filter((e: { event: string }) => e.event !== 'start');
  expect(ends.map((e: { errorKind: string }) => e.errorKind)).toEqual(['cancelled', 'cancelled']);
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  expect(r.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  expect(r.lifecycle.snapshotAfterShutdown.state).toBe('closed');
});

test('native provider in Playwright Chromium: no model → BLOCKED, graph not run', async ({ page }) => {
  await page.goto('/');
  await runGraph(page);
  await done(page);
  const r = await evidence(page);
  expect(r.provider).toBe('native');
  expect(r.environment.availability).not.toBe('MODEL_AVAILABLE');
  expect(r.evidenceClass).toBe('BLOCKED');
  expect(r.outcome).toBe('not-run');
  expect(r.blocked.reason).toContain(r.environment.availability);
  for (const n of ['branchA', 'branchB', 'synthesize', 'decide']) expect(r.nodes[n].status).toBe('waiting');
});

// createRuntime() creates the warm base session eagerly, so a LanguageModel.create failure surfaces
// there: the page must still finish with a failed record and a usable Run button.
test('stand-in: createRuntime failure → failed record, Run re-enabled', async ({ page }) => {
  await page.goto('/?provider=standin');
  const run = page.getByRole('button', { name: 'Run Graph', exact: true });
  await expect(run).toBeEnabled();
  await page.evaluate(() => {
    (window as unknown as { LanguageModel: { create(): Promise<never> } }).LanguageModel.create =
      () => Promise.reject(new Error('create failed'));
  });
  await run.click();
  await done(page);
  const r = await evidence(page);
  expect(r.outcome).toBe('failed');
  expect(r.error).toContain('create failed');
  expect(r.result).toBeUndefined();
  await expect(run).toBeEnabled();
});
