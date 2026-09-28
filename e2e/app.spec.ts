// BROWSER_AUTOMATED (stand-in): the canonical page (index.html → src/main.ts) running the Feature 004
// TradingAgents fixture graph in Playwright Chromium. Real LangGraph + AkariChatModel + akarisp in the
// browser bundle, where a node's model call does not inherit the graph's signal implicitly. Not Prompt
// API evidence. Role provenance is proven deterministically (test/trading-graph.test.ts), not here.
import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const ROLES = ['marketAnalyst', 'newsAnalyst', 'bullResearcher', 'bearResearcher', 'researchManager', 'trader',
  'riskReviewer', 'finalDecisionMaker'];
const AFTER_ANALYSTS = ROLES.slice(2);

const done = (page: Page) =>
  expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });
const evidence = async (page: Page) => JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
const runButton = (page: Page) => page.getByRole('button', { name: 'Run Graph', exact: true });
const standin = (page: Page, action: 'hold' | 'resume') =>
  page.evaluate((a) => (window as unknown as { __standin: Record<string, () => void> }).__standin[a](), action);

test('stand-in: full eight-role graph succeeds through LangGraph → AkariChatModel → AkariSP', async ({ page }, testInfo) => {
  await page.goto('/?provider=standin');
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
  expect(r.evidenceClass).toBe('BROWSER_AUTOMATED');
  expect(r.provider).toBe('standin');
  expect(r.environment.availability).not.toBe('MODEL_AVAILABLE'); // describes the native API, not the stand-in
  expect(r.outcome).toBe('success');
  for (const n of ROLES) {
    expect(r.nodes[n], n).toMatchObject({ status: 'done', executions: 1, modelRequests: 1 });
    expect(Array.isArray(r.nodes[n].reads) && r.nodes[n].reads.length > 0, `${n}.reads`).toBe(true);
  }
  expect(r.counts.logicalRequests).toBe(8); // measured by the bridge
  expect(r.counts.nodeExecutions).toBe(8);
  expect(r.counts.fallbackRequests).toBe(0); // no fallback path; observed
  expect(r.counts.providerInvocations).toBe('NOT EXPOSED');
  // Measured after the bounded poll, not at bridge event #2; backpressure only, not native parallelism.
  expect(r.concurrency.akarisp.fanOutSnapshot.snapshot).toMatchObject({ state: 'ready', active: 1, queued: 1 });
  expect(r.concurrency.nativeProvider).toBe('not observed (out of scope)');
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  expect(r.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  expect(r.lifecycle.snapshotAfterShutdown).toEqual({ state: 'closed', active: 0, queued: 0 });
  expect(r.graph.version).toBe('tradingagents-fixture-graph@1');
  expect(r.fixture).toBe('tradingagents-fixture@1');
  expect(r.revision.langgraph).toBe('1.4.18');
  expect(r.runtimeOptions).toEqual({ limit: 1, queueCapacity: 32 });
  expect(typeof r.timing.graphMs).toBe('number');
  expect(r.result.finalDecision).toBeTruthy();
  await expect(page.locator('#result')).toHaveText(r.result.finalDecision);
  // Routine runs never overwrite committed Feature evidence; copy this file there deliberately.
  writeFileSync(testInfo.outputPath('evidence.json'), JSON.stringify(r, null, 2) + '\n');
});

// Regression B in the browser: settlement must be observed on a `ready` runtime before shutdown().
test('stand-in: Cancel during the analysts → cancelled, AkariSP settles by itself before shutdown', async ({ page }) => {
  await page.goto('/?provider=standin');
  await expect(runButton(page)).toBeEnabled(); // stand-in installed
  await standin(page, 'hold');
  await runButton(page).click();
  const runtime = page.locator('#runtime');
  await expect(runtime).toHaveAttribute('data-active', '1');
  await expect(runtime).toHaveAttribute('data-queued', '1');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await done(page);
  await standin(page, 'resume');
  const r = await evidence(page);
  expect(r.evidenceClass).toBe('BROWSER_AUTOMATED');
  expect(r.outcome).toBe('cancelled');
  expect(r.result).toBeUndefined();
  for (const n of AFTER_ANALYSTS) expect(r.nodes[n].status, n).toBe('waiting');
  const ends = r.modelRequests.filter((e: { event: string }) => e.event !== 'start');
  expect(ends.map((e: { errorKind: string }) => e.errorKind)).toEqual(['cancelled', 'cancelled']);
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  expect(r.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  expect(r.lifecycle.snapshotAfterShutdown.state).toBe('closed');
});

test('native provider in Playwright Chromium: no model → BLOCKED, graph not run', async ({ page }) => {
  await page.goto('/');
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
  expect(r.provider).toBe('native');
  expect(r.environment.availability).not.toBe('MODEL_AVAILABLE');
  expect(r.evidenceClass).toBe('BLOCKED');
  expect(r.outcome).toBe('not-run');
  expect(r.blocked.reason).toContain(r.environment.availability);
  for (const n of ROLES) expect(r.nodes[n].status, n).toBe('waiting');
});

// createRuntime() creates the warm base session eagerly, so a LanguageModel.create failure surfaces
// there: the page must still finish with a failed record and a usable Run button.
test('stand-in: createRuntime failure → failed record, Run re-enabled', async ({ page }) => {
  await page.goto('/?provider=standin');
  await expect(runButton(page)).toBeEnabled();
  await page.evaluate(() => {
    (window as unknown as { LanguageModel: { create(): Promise<never> } }).LanguageModel.create =
      () => Promise.reject(new Error('create failed'));
  });
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
  expect(r.outcome).toBe('failed');
  expect(r.error).toContain('create failed');
  expect(r.result).toBeUndefined();
  await expect(runButton(page)).toBeEnabled();
});

// Each click owns a new runtime + model: run 1's runtime is closed, so run 2 can only succeed on a new
// one, and a shared model would report 16 logical requests.
test('stand-in: two consecutive runs are independent (new runtime and model per run)', async ({ page }) => {
  await page.goto('/?provider=standin');
  await runButton(page).click();
  await done(page);
  const first = await evidence(page);
  expect(first.outcome).toBe('success');
  expect(first.lifecycle.snapshotAfterShutdown.state).toBe('closed');
  await page.evaluate(() => { document.getElementById('evidence')!.textContent = ''; });
  await runButton(page).click();
  await expect(page.locator('#evidence')).not.toBeEmpty({ timeout: 60_000 });
  await done(page);
  const second = await evidence(page);
  expect(second.outcome).toBe('success');
  expect(second.counts.logicalRequests).toBe(8);
  expect(second.nodeEvents[0].seq).toBe(1);
  expect(second.nodeEvents.length).toBe(16); // 8 roles × (start, done) — this run only
  expect(second.lifecycle.settledBeforeShutdown).toBe(true);
  expect(second.lifecycle.snapshotAfterShutdown.state).toBe('closed');
});
