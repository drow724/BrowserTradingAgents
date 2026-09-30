// Feature 012 (BROWSER_AUTOMATED, stand-in): one AkariSP runtime kept for the page session with ?reuse=on, versus
// one runtime per run (default). Records come from the page's own `bta-done` events.
import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { loadExample } from './measure.ts';

type Snap = { state: string; active: number; queued: number };
type Rec = { outcome: string; error: string | null; analysis?: { holding: string; grounding?: { counts: unknown } };
  result?: Record<string, unknown>; counts?: { logicalRequests: number };
  lifecycle: { mode: string; runtimeId: number; prepared: boolean; settledAfterRun?: boolean; snapshotAfterRun?: Snap;
    replaced?: { reason: string }; discarded?: { reason: string } } | null;
  timing: { graphMs: number; runtimeCreateMs: number; shutdownMs?: number } };

const IDLE = { state: 'ready', active: 0, queued: 0 };
const STUB = `http://127.0.0.1:${Number(process.env.STUB_PORT ?? Number(process.env.HARNESS_PORT ?? 5174) + 24)}`;
const records = (page: Page) => page.evaluate(() => (window as unknown as { __records: unknown[] }).__records) as Promise<Rec[]>;
async function collect(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __records: unknown[] };
    w.__records = [];
    document.getElementById('run')!.addEventListener('bta-done', (e) => w.__records.push((e as CustomEvent).detail));
  });
}
const runButton = (page: Page) => page.getByRole('button', { name: 'Run Graph', exact: true });
async function runOnce(page: Page) {
  const n = (await records(page)).length;
  await runButton(page).click();
  await expect.poll(async () => (await records(page)).length, { timeout: 60_000 }).toBe(n + 1);
  return (await records(page)).at(-1)!;
}
// The example portfolio is loaded once; later pages in the same test find it in this origin's storage.
async function overview(page: Page, reuse: 'on' | 'off', load = true) {
  if (load) await loadExample(page, `/?provider=standin&quotes=fixture&reuse=${reuse}`);
  else {
    await page.goto(`/?provider=standin&quotes=fixture&reuse=${reuse}`);
    await expect(runButton(page)).toBeEnabled();
  }
  await collect(page);
  await page.keyboard.press('Escape');
  const t0 = Date.now();
  await page.getByRole('button', { name: '전체 점검' }).click();
  await expect(page.getByRole('dialog', { name: '답변' })).toBeVisible({ timeout: 120_000 });
  return { recs: await records(page), totalMs: Date.now() - t0 };
}

test('T004/T008/T009/T013 SC-001–SC-003: overview of 6 — reuse prepares once, per-run six times; identical results', async ({ page }, testInfo) => {
  const on = await overview(page, 'on');
  const off = await overview(page, 'off', false);
  for (const { recs } of [on, off]) expect(recs.map((r) => r.outcome)).toEqual(Array(6).fill('success'));

  // SC-001 / FR-001 / FR-008
  expect(on.recs.map((r) => r.lifecycle!.prepared)).toEqual([true, false, false, false, false, false]);
  expect(new Set(on.recs.map((r) => r.lifecycle!.runtimeId)).size).toBe(1);
  for (const r of on.recs.slice(1)) {
    expect(r.timing.runtimeCreateMs).toBe(0);
    expect(r.timing).not.toHaveProperty('shutdownMs');
  }
  expect(off.recs.map((r) => r.lifecycle!.prepared)).toEqual(Array(6).fill(true));
  expect(new Set(off.recs.map((r) => r.lifecycle!.runtimeId)).size).toBe(6);
  expect(off.recs.every((r) => r.lifecycle!.mode === 'per-run' && typeof r.timing.shutdownMs === 'number')).toBe(true);

  // SC-002 / FR-011: nothing carries over between runs
  const view = (r: Rec) => ({ holding: r.analysis?.holding, result: r.result, counts: r.analysis?.grounding?.counts, logical: r.counts?.logicalRequests });
  expect(on.recs.map(view)).toEqual(off.recs.map(view));
  expect(on.recs.every((r) => r.counts?.logicalRequests === 8)).toBe(true);

  // SC-003 / FR-003: idle after every run; no replacement before any run
  for (const r of on.recs) {
    expect(r.lifecycle).toMatchObject({ mode: 'reuse', settledAfterRun: true, snapshotAfterRun: IDLE });
    expect(r.lifecycle).not.toHaveProperty('replaced');
    expect(r.lifecycle).not.toHaveProperty('discarded');
  }

  // T013 / FR-012: stand-in comparison report (operational timings; the saving is a native-model question)
  const mode = ({ recs, totalMs }: typeof on) => ({ runs: recs.length, prepared: recs.filter((r) => r.lifecycle!.prepared).length,
    runtimeCreateMs: recs.map((r) => r.timing.runtimeCreateMs), graphMs: recs.map((r) => r.timing.graphMs), totalMs: [totalMs],
    outcomes: recs.map((r) => r.outcome), replacements: recs.filter((r) => r.lifecycle!.replaced || r.lifecycle!.discarded).length });
  writeFileSync(testInfo.outputPath('measurement-reuse-standin.json'), JSON.stringify({ provider: 'standin',
    evidenceClass: 'BROWSER_AUTOMATED', reps: 1, modes: { on: mode(on), off: mode(off) } }, null, 2) + '\n');
});

test('T011 SC-004 FR-006/FR-005: after Cancel the runtime is reused; after pagehide it is replaced (closed)', async ({ page }) => {
  await page.goto('/?provider=standin&quotes=fixture&reuse=on');
  await expect(runButton(page)).toBeEnabled();
  await collect(page);
  const first = await runOnce(page);
  expect(first.lifecycle).toMatchObject({ prepared: true, runtimeId: 1 });

  await page.evaluate(() => (window as unknown as { __standin: { hold(): void } }).__standin.hold());
  await runButton(page).click();
  await expect(page.locator('#runtime')).toHaveAttribute('data-active', '1');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect.poll(async () => (await records(page)).length).toBe(2);
  await page.evaluate(() => (window as unknown as { __standin: { resume(): void } }).__standin.resume());
  const cancelled = (await records(page))[1];
  expect(cancelled.outcome).toBe('cancelled');
  expect(cancelled.lifecycle).toMatchObject({ prepared: false, runtimeId: 1, settledAfterRun: true, snapshotAfterRun: IDLE });

  const next = await runOnce(page);
  expect(next.outcome).toBe('success');
  expect(next.lifecycle).toMatchObject({ prepared: false, runtimeId: 1 });

  await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
  const replaced = await runOnce(page);
  expect(replaced.outcome).toBe('success');
  expect(replaced.lifecycle).toMatchObject({ prepared: true, runtimeId: 2, replaced: { reason: 'closed' } });
});

test('T012 SC-004: a model failure in one run does not stop the next; the settled runtime is reused', async ({ page }) => {
  await page.goto('/?provider=standin&quotes=fixture&reuse=on');
  await expect(runButton(page)).toBeEnabled();
  // Before any runtime exists: task sessions reject the Trader's prompt while `__failTrader` is set.
  await page.evaluate(() => {
    const w = window as unknown as { __failTrader: boolean; LanguageModel: { create: (...a: unknown[]) => Promise<{ clone: (o: unknown) => Promise<{ prompt: (i: unknown, o: unknown) => Promise<string> }> }> } };
    const create = w.LanguageModel.create.bind(w.LanguageModel);
    w.LanguageModel.create = async (...a) => {
      const base = await create(...a);
      const clone = base.clone.bind(base);
      base.clone = async (o) => {
        const s = await clone(o);
        return { ...s, prompt: (i: unknown, opts: unknown) => w.__failTrader && JSON.stringify(i).includes('You are the Trader.')
          ? Promise.reject(new Error('injected model failure')) : s.prompt(i, opts) };
      };
      return base;
    };
  });
  await collect(page);
  await runOnce(page);
  await page.evaluate(() => { (window as unknown as { __failTrader: boolean }).__failTrader = true; });
  const failed = await runOnce(page);
  await page.evaluate(() => { (window as unknown as { __failTrader: boolean }).__failTrader = false; });
  expect(failed.outcome).toBe('failed');
  expect(failed.lifecycle).toMatchObject({ runtimeId: 1, prepared: false, settledAfterRun: true });
  const next = await runOnce(page);
  expect(next.outcome).toBe('success');
  expect(next.lifecycle).toMatchObject({ runtimeId: 1, prepared: false });
});

test('T011 FR-007: live data with reuse — a failed acquisition prepares no runtime', async ({ page }) => {
  const scenario = async (name: string) => {
    await fetch(`${STUB}/__reset`, { method: 'POST' });
    await fetch(`${STUB}/__scenario`, { method: 'POST', body: JSON.stringify({ name }) });
  };
  await scenario('server-error');
  await page.goto('/?provider=standin&data=live&reuse=on');
  await expect(runButton(page)).toBeEnabled();
  await collect(page);
  const failed = await runOnce(page);
  expect(failed.outcome).toBe('failed');
  expect(failed.lifecycle).toBeNull(); // acquisition failed: no runtime, no lifecycle (unchanged record shape)
  await scenario('valid');
  const ok = await runOnce(page);
  expect(ok.outcome).toBe('success');
  expect(ok.lifecycle).toMatchObject({ mode: 'reuse', prepared: true, runtimeId: 1 });
});
