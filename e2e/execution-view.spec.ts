// Feature 008 Checkpoint D (BROWSER_AUTOMATED, stand-in): the execution view observes the page's status
// surface and projects it to the canonical text panel and the sandboxed Pixel Agents iframe. Truth order:
// the application's execution, then the text panel, then the canvas. Every non-local request is aborted.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type Frame, type Page } from '@playwright/test';
import { ROLE_IDENTITY } from '../src/view/pixel-adapter.ts';

const ROLES = ROLE_IDENTITY.map((r) => r.node);
const LABELS = ROLE_IDENTITY.map((r) => r.label);
const STUB = `http://127.0.0.1:${Number(process.env.STUB_PORT ?? Number(process.env.HARNESS_PORT ?? 5174) + 24)}`;
const stub = (name: string) => fetch(`${STUB}/__reset`, { method: 'POST' })
  .then(() => fetch(`${STUB}/__scenario`, { method: 'POST', body: JSON.stringify({ name }) }));
const stubRequests = async () => ((await (await fetch(`${STUB}/__stats`)).json()) as { requests: number }).requests;

type Panel = { run: string; roles: string[]; runtime: string; ds: Record<string, string> };
const done = (page: Page) => expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });
const evidence = async (page: Page) => JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
const runButton = (page: Page) => page.getByRole('button', { name: 'Run Graph', exact: true });
const standin = (page: Page, a: 'hold' | 'resume' | 'step') => page.evaluate((a) => {
  const s = (window as unknown as { __standin: Record<string, () => void> }).__standin;
  if (a === 'step') { s.resume(); s.hold(); } else s[a](); // step: answer what waits, hold what starts next
}, a);
const panel = (page: Page): Promise<Panel> => page.evaluate(() => ({
  run: document.getElementById('view-run')?.textContent ?? '',
  roles: Array.from(document.querySelectorAll<HTMLElement>('#view-roles li')).map((l) => l.dataset.state ?? ''),
  runtime: document.getElementById('view-runtime')?.textContent ?? '',
  ds: { ...document.getElementById('execution-view')?.dataset } as Record<string, string>,
}));
const states = (p: Panel) => p.roles.join(',');

// Test-side instruments (no production hook): every non-local request is aborted and recorded; the panel's
// state changes and the page's own status writes are timestamped; iframes created are counted; each frame
// logs the messages it receives (init scripts run in the sandboxed frame too).
async function instrument(page: Page) {
  const net = { external: [] as string[], api: 0, pixel: 0 };
  await page.route((url) => url.hostname !== 'localhost', (r) => { net.external.push(r.request().url()); return r.abort(); });
  page.on('request', (r) => {
    const path = new URL(r.url()).pathname;
    if (path === '/api/market') net.api++;
    if (path.startsWith('/pixel-agents/')) net.pixel++;
  });
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    if (window !== window.top) { const rx: unknown[] = (w.__rx = []); addEventListener('message', (e) => rx.push(e.data)); return; }
    const c = { iframesCreated: 0, observersCreated: 0, observersDisconnected: 0, messageListeners: 0, ioCreated: 0, ioDisconnected: 0 };
    w.__c = c;
    const create = Document.prototype.createElement;
    Document.prototype.createElement = function (this: Document, tag: string, ...a: []) {
      if (String(tag).toLowerCase() === 'iframe') c.iframesCreated++;
      return create.call(this, tag, ...a);
    } as typeof create;
    // Only observers created by the app's own code (/_next/ chunks), not by Playwright's injected script.
    const app = () => /\/_next\//.test(new Error().stack ?? '');
    const mine = new WeakSet<object>();
    const MO = window.MutationObserver;
    window.MutationObserver = class extends MO {
      constructor(cb: MutationCallback) { super(cb); if (app()) { mine.add(this); c.observersCreated++; } }
      disconnect() { if (mine.has(this)) c.observersDisconnected++; super.disconnect(); }
    };
    const IO = window.IntersectionObserver;
    window.IntersectionObserver = class extends IO {
      constructor(cb: IntersectionObserverCallback, o?: IntersectionObserverInit) { super(cb, o); if (app()) { mine.add(this); c.ioCreated++; } }
      disconnect() { if (mine.has(this)) c.ioDisconnected++; super.disconnect(); }
    };
    const add = window.addEventListener, remove = window.removeEventListener;
    window.addEventListener = function (this: Window, t: string, ...a: [EventListenerOrEventListenerObject, unknown?]) {
      if (t === 'message') c.messageListeners++;
      return add.call(this, t, ...(a as [EventListenerOrEventListenerObject]));
    } as typeof add;
    window.removeEventListener = function (this: Window, t: string, ...a: [EventListenerOrEventListenerObject, unknown?]) {
      if (t === 'message') c.messageListeners--;
      return remove.call(this, t, ...(a as [EventListenerOrEventListenerObject]));
    } as typeof remove;
  });
  return net;
}
const counters = (page: Page) => page.evaluate(() => ({ ...(window as unknown as { __c: Record<string, number> }).__c }));
async function recordTimeline(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __panel: unknown[]; __writes: unknown[] };
    w.__panel = []; w.__writes = [];
    const snap = () => {
      const roles = Array.from(document.querySelectorAll<HTMLElement>('#view-roles li')).map((l) => l.dataset.state).join(',');
      const run = document.getElementById('view-run')?.dataset.state;
      const last = w.__panel.at(-1) as { roles: string; run: string } | undefined;
      if (!last || last.roles !== roles || last.run !== run) w.__panel.push({ t: performance.now(), roles, run });
    };
    snap();
    new MutationObserver(snap).observe(document.getElementById('execution-view')!, { subtree: true, attributes: true, attributeFilter: ['data-state'] });
    const writes = new MutationObserver((rs) => {
      for (const r of rs) w.__writes.push({ t: performance.now(), id: (r.target as Element).id, text: (r.addedNodes[0] as Text | undefined)?.data });
    });
    for (const el of [document.getElementById('status')!, ...Array.from(document.querySelectorAll('[id^="node-"]'))]) writes.observe(el, { childList: true });
  });
}
const timeline = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { __panel: { t: number; roles: string; run: string }[]; __writes: { t: number; id: string; text: string }[] };
  return { panel: w.__panel, writes: w.__writes };
});
const pixelFrame = (page: Page): Frame => page.frames().find((f) => f.url().includes('/pixel-agents/index.html'))!;
// The iframe exists only while a run is `running` and its area is in the viewport (F008-011).
async function bootPixel(page: Page) {
  await page.locator('#view-stage').scrollIntoViewIfNeeded();
  await expect(page.locator('#execution-view')).toHaveAttribute('data-iframes', '1', { timeout: 30_000 });
  await page.frameLocator('#view-stage iframe').getByText(LABELS[7]).first().waitFor({ timeout: 30_000 });
}
// Pixel Agents is on demand (D5): the host-owned toggle, off on every load.
const pixelToggle = (page: Page) => page.locator('#view-pixel-toggle');
async function enablePixel(page: Page) {
  await expect(pixelToggle(page)).toHaveAttribute('aria-pressed', 'false');
  await pixelToggle(page).click();
  await expect(pixelToggle(page)).toHaveAttribute('aria-pressed', 'true');
}
async function startHeld(page: Page, { pixel = true } = {}) {
  if (pixel && (await pixelToggle(page).getAttribute('aria-pressed')) !== 'true') await enablePixel(page);
  await standin(page, 'hold');
  await runButton(page).click();
  await expect(page.locator('#view-run')).toHaveText('running');
  if (pixel) await bootPixel(page);
}
const canvasSize = (page: Page) => pixelFrame(page).evaluate(() => {
  const c = document.querySelector('canvas')!; return { width: c.width, height: c.height };
});
async function open(page: Page, url = '/?provider=standin') {
  const net = await instrument(page);
  await page.goto(url);
  await expect(runButton(page)).toBeEnabled();
  await expect(page.locator('#view-roles li')).toHaveCount(url.includes('viz=off') ? 0 : 8);
  return net;
}
// Evidence without exactly the INV-4 fields (tasks.md; contracts): nothing else is removed.
function strip(record: Record<string, unknown>) {
  const r = JSON.parse(JSON.stringify(record, (k, v) => (k === 'timing' || k === 'pollMs' ? undefined : v)));
  delete r.environment.date; delete r.environment.userAgent;
  for (const k of ['acquiredAt', 'receivedAt', 'usedAt']) delete r.dataSource[k];
  return r;
}
async function runOnce(page: Page, url: string) {
  await open(page, url);
  await runButton(page).click();
  await done(page);
  return evidence(page);
}
// Test-side failure injection: the stand-in session rejects a prompt addressed to one role.
const failRole = (page: Page, label: string) => page.evaluate((label) => {
  const LM = (window as unknown as { LanguageModel: { create: (...a: unknown[]) => Promise<{ clone: (o: unknown) => Promise<{ prompt: (i: unknown, o: unknown) => Promise<string> }> }> } }).LanguageModel;
  const create = LM.create.bind(LM);
  LM.create = async (...a) => {
    const base = await create(...a);
    const clone = base.clone.bind(base);
    base.clone = async (o) => {
      const s = await clone(o);
      return { ...s, prompt: (i: unknown, opts: unknown) => JSON.stringify(i).includes(`You are the ${label}.`)
        ? Promise.reject(new Error('injected role failure')) : s.prompt(i, opts) };
    };
    return base;
  };
}, label);

test('T021 US1/D5: Pixel is off by default; explicit opt-in shows the sandboxed 480×320 canvas during a run only', async ({ page }) => {
  const net = await open(page);
  const view = page.locator('#execution-view');
  await expect(pixelToggle(page)).toHaveText('Show Pixel Agents');
  await expect(pixelToggle(page)).toHaveAttribute('aria-pressed', 'false');
  // Default: a whole run with the text view only — no iframe, no Pixel request.
  await startHeld(page, { pixel: false });
  await page.locator('#view-stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  await expect(view).toHaveAttribute('data-iframes', '0');
  await standin(page, 'resume');
  await done(page);
  expect((await counters(page)).iframesCreated).toBe(0);
  expect(net.pixel).toBe(0);
  // Explicit opt-in before a run: idle still has no iframe; the running, visible run shows the canvas.
  await enablePixel(page);
  await expect(view).toHaveAttribute('data-iframes', '0');
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie])).toEqual([0, 0, '']); // never stored
  await startHeld(page);
  const f = page.locator('#view-stage iframe');
  await expect(f).toHaveAttribute('sandbox', 'allow-scripts'); // no allow-same-origin
  const frame = pixelFrame(page);
  expect(await frame.evaluate(() => { try { return String(Boolean(parent.document)); } catch (e) { return (e as Error).name; } })).toBe('SecurityError');
  expect(await canvasSize(page)).toEqual({ width: 480, height: 320 }); // real backing store, not a CSS scale
  const rx = await frame.evaluate(() => (window as unknown as { __rx: { type: string; [k: string]: unknown }[] }).__rx);
  const agents = rx.find((m) => m.type === 'existingAgents') as unknown as { agentMeta: Record<string, { seatId: string; palette: number; hueShift: number }> };
  expect(Object.values(agents.agentMeta)).toEqual(ROLE_IDENTITY.map(({ palette, hueShift, seatId }) => ({ palette, hueShift, seatId })));
  expect(rx.filter((m) => m.type === 'agentTeamInfo').map((m) => m.agentName)).toEqual(LABELS);
  for (const label of LABELS) await expect(page.frameLocator('#view-stage iframe').getByText(label).first()).toBeVisible();
  // Off during the run: only the canvas goes; on again: it remounts from the current snapshot.
  await pixelToggle(page).click();
  await expect(view).toHaveAttribute('data-iframes', '0');
  await expect(page.locator('#view-run')).toHaveText('running');
  await pixelToggle(page).click();
  await bootPixel(page);
  await expect(page.frameLocator('#view-stage iframe').getByText('working (graph)')).toHaveCount(2);
  await standin(page, 'resume');
  await done(page);
  const r = await evidence(page);
  expect(r.outcome).toBe('success');
  expect(r.counts).toMatchObject({ graphRuns: 1, nodeExecutions: 8, logicalRequests: 8, fallbackRequests: 0 });
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  await expect(page.locator('#view-run')).toHaveText('completed');
  const p = await panel(page);
  expect(p.roles).toEqual(Array(8).fill('completed'));
  expect(p.runtime).toBe('state closed · active 0 · queued 0');
  expect(p.ds).toMatchObject({ iframes: '0', observers: '1', anomalies: '0', health: 'ok' }); // terminal: unmounted
  // Next run, still enabled: mounted again while it runs.
  await startHeld(page);
  await standin(page, 'resume');
  await done(page);
  await expect(view).toHaveAttribute('data-iframes', '0');
  expect(net.external).toEqual([]);
  // A new page load starts off again.
  await page.reload();
  await expect(pixelToggle(page)).toHaveAttribute('aria-pressed', 'false');
});

test('T022 US2/SC-001/SC-013: stepped run — each role works exactly once, in topology order, reflected ≤ 1 s after its write', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page);
  await recordTimeline(page);
  await startHeld(page);
  // Fan-out: both analysts working; AkariSP (limit 1) admits News only after Market, then one role per step.
  const expected = [[0, 1], [1], [2], [3], [4], [5], [6], [7]];
  for (const working of expected) {
    await expect.poll(async () => (await panel(page)).roles.map((s, i) => (s === 'working' ? i : -1)).filter((i) => i >= 0)).toEqual(working);
    await standin(page, 'step');
  }
  await standin(page, 'resume');
  await done(page);
  await expect(page.locator('#view-run')).toHaveText('completed');
  const { panel: pl, writes } = await timeline(page);
  for (let i = 0; i < 8; i++) {
    const seq = pl.map((s) => s.roles.split(',')[i]).filter((s, k, a) => k === 0 || s !== a[k - 1]);
    expect(seq.filter((s) => s === 'working'), ROLES[i]).toHaveLength(1);
    expect(seq.slice(-2), ROLES[i]).toEqual(['working', 'completed']);
  }
  const bullStart = pl.find((s) => s.roles.split(',')[2] === 'working')!;
  expect(bullStart.roles.split(',').slice(0, 2)).toEqual(['completed', 'completed']);
  const latency: { what: string; ms: number }[] = [];
  for (const w of writes) {
    const i = (ROLES as string[]).indexOf(w.id.replace('node-', ''));
    const want = w.id === 'status' ? (w.text.startsWith('done:') ? 'completed' : null) : w.text === 'running' ? 'working' : w.text === 'done' ? 'completed' : null;
    if (!want) continue;
    const hit = pl.find((s) => s.t >= w.t && (i < 0 ? s.run === want : s.roles.split(',')[i] === want));
    expect(hit, `${w.id} ${w.text}`).toBeTruthy();
    latency.push({ what: `${w.id}:${w.text}`, ms: Math.round((hit!.t - w.t) * 10) / 10 });
  }
  console.log('SC-013 latency (ms):', JSON.stringify(latency));
  expect(latency).toHaveLength(17); // 8 working + 8 completed + run completed
  for (const l of latency) expect(l.ms, l.what).toBeLessThanOrEqual(1000);
});

test('T023 US3/SC-003: fan-out — both analysts working (graph), runtime active 1 · queued 1, no role queued/inferring', async ({ page }) => {
  await open(page);
  await startHeld(page);
  await expect(page.locator('#runtime')).toHaveAttribute('data-queued', '1');
  await expect(page.locator('#view-runtime')).toHaveText('state ready · active 1 · queued 1');
  const p = await panel(page);
  expect(p.roles.slice(0, 2)).toEqual(['working', 'working']);
  expect(p.roles.filter((s) => s === 'queued' || s === 'inferring')).toEqual([]);
  await expect(page.locator('#view-roles li').nth(0)).toContainText('working (graph)');
  await expect(page.locator('#view-roles li').nth(1)).toContainText('working (graph)');
  await expect(page.frameLocator('#view-stage iframe').getByText('working (graph)')).toHaveCount(2);
  await standin(page, 'resume');
  await done(page);
});

test('T024 US4: live acquisition failure (stub server-error) → failed · acquisition, no role ever working', async ({ page }) => {
  await stub('server-error');
  await open(page, '/?provider=standin&data=live');
  await recordTimeline(page);
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
  expect(r.failure).toEqual({ boundary: 'market-data', stage: 'acquisition', kind: 'provider-error' });
  expect(r.counts.graphRuns).toBe(0);
  await expect(page.locator('#view-run')).toHaveText('failed · acquisition');
  expect((await panel(page)).roles).toEqual(Array(8).fill('not-run'));
  const { panel: pl } = await timeline(page);
  expect(pl.filter((s) => /working|queued|inferring/.test(s.roles))).toEqual([]);
  await expect(page.locator('#execution-view')).toHaveAttribute('data-iframes', '0');
});

test('T024 US4: live Cancel during acquisition → cancelled · acquisition, never working, terminal state stays', async ({ page }) => {
  await stub('hang');
  await open(page, '/?provider=standin&data=live');
  await recordTimeline(page);
  await runButton(page).click();
  await expect.poll(stubRequests).toBe(1);
  await enablePixel(page);
  await bootPixel(page); // the run is `running` while it acquires: the canvas shows, with nobody working
  await page.getByRole('button', { name: 'Cancel' }).click();
  await done(page);
  expect((await evidence(page)).failure).toEqual({ boundary: 'market-data', stage: 'acquisition', kind: 'cancelled' });
  await expect(page.locator('#view-run')).toHaveText('cancelled · acquisition');
  const after = await panel(page);
  expect(after.roles).toEqual(Array(8).fill('not-run'));
  await page.waitForTimeout(500);
  expect(await panel(page)).toEqual(after);
  expect(after.ds.iframes).toBe('0');
  expect((await timeline(page)).panel.filter((s) => /working|queued|inferring/.test(s.roles))).toEqual([]);
});

test('T024 US4/SC-006: graph Cancel with Bull working → analysts completed, Bull cancelled, rest not run; lifecycle intact', async ({ page }) => {
  await open(page);
  await startHeld(page);
  await expect.poll(async () => (await panel(page)).roles.slice(0, 2)).toEqual(['working', 'working']);
  await standin(page, 'step'); // Market answered; News admitted and held
  await expect.poll(async () => (await panel(page)).roles.slice(0, 2)).toEqual(['completed', 'working']);
  await standin(page, 'step'); // News answered; Bull starts and is held
  await expect.poll(async () => (await panel(page)).roles[2]).toBe('working');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await done(page);
  await standin(page, 'resume');
  const r = await evidence(page);
  expect(r.outcome).toBe('cancelled');
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  expect(r.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  expect(r.lifecycle.snapshotAfterShutdown).toEqual({ state: 'closed', active: 0, queued: 0 });
  await expect(page.locator('#view-run')).toHaveText('cancelled · graph');
  const after = await panel(page);
  expect(after.roles).toEqual(['completed', 'completed', 'cancelled', 'not-run', 'not-run', 'not-run', 'not-run', 'not-run']);
  await page.waitForTimeout(500);
  expect(await panel(page)).toEqual(after); // no late change
  expect(after.ds.iframes).toBe('0');
  await expect(page.locator('#view-roles li').nth(2)).toContainText('cancelled');
});

test('T024 US4: role failure (Bull, test-injected) → Bull failed (record: one failed error), downstream not run', async ({ page }) => {
  await open(page);
  await failRole(page, 'Bull Researcher');
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
  expect(r.outcome).toBe('failed');
  expect(r.failure.boundary).toBe('inference');
  await expect(page.locator('#view-run')).toHaveText('failed · graph');
  expect((await panel(page)).roles).toEqual(['completed', 'completed', 'failed', 'not-run', 'not-run', 'not-run', 'not-run', 'not-run']);
  await expect(page.locator('#view-roles li').nth(2)).toContainText('failed');
  await expect(page.locator('#view-roles li').nth(3)).toContainText('not run');
});

test('T024 US4/F008-009: Market fails while News is in flight → both unattributable errors are shown as unclear, not guessed', async ({ page }) => {
  await open(page);
  await failRole(page, 'Market Analyst');
  await standin(page, 'hold'); // News is admitted after Market and held
  await runButton(page).click();
  await done(page);
  await standin(page, 'resume');
  const r = await evidence(page);
  expect(r.outcome).toBe('failed');
  expect(r.nodes.marketAnalyst.status).toBe('error');
  expect(r.nodes.newsAnalyst.status).toBe('error'); // the page writes `error` for both …
  expect(r.modelRequests.filter((e: { event: string }) => e.event === 'error').map((e: { errorKind: string }) => e.errorKind))
    .toEqual(['failed', 'cancelled']); // … and the record cannot say which role had which kind
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  const p = await panel(page);
  expect(p.roles).toEqual(['stopped', 'stopped', 'not-run', 'not-run', 'not-run', 'not-run', 'not-run', 'not-run']);
  await expect(page.locator('#view-roles li').nth(0)).toContainText('error (failed/cancelled unclear)');
  await expect(page.locator('#view-roles li').nth(1)).toContainText('error (failed/cancelled unclear)');
  await expect(page.locator('#view-run')).toHaveText('failed · graph');
});

test('T024 US4: createRuntime failure, native BLOCKED (same-task running→done), and a second run reset', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const w = window as unknown as { LanguageModel: { create(): Promise<never> } };
    const original = w.LanguageModel.create;
    w.LanguageModel.create = () => { w.LanguageModel.create = original; return Promise.reject(new Error('create failed')); };
  });
  await runButton(page).click();
  await done(page);
  await expect(page.locator('#view-run')).toHaveText('failed · graph');
  expect((await panel(page)).roles).toEqual(Array(8).fill('not-run'));
  await runButton(page).click(); // second run: a full reset, then success
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'running');
  await done(page);
  await expect(page.locator('#view-run')).toHaveText('completed');
  expect((await panel(page)).roles).toEqual(Array(8).fill('completed'));

  await page.goto('/'); // native provider in Playwright Chromium: BLOCKED, written in one task
  await expect(runButton(page)).toBeEnabled();
  await runButton(page).click();
  await done(page);
  await expect(page.locator('#view-run')).toHaveText('not run (blocked)');
  const p = await panel(page);
  expect(p.roles).toEqual(Array(8).fill('not-run'));
  expect(p.ds.anomalies).toBe('0'); // run-started was not lost (H1)
});

test('T025 US5/SC-002/SC-012: fixture evidence is equal with the view on (canvas shown), off, webview failing, decoder failing, host failing', async ({ browser }) => {
  test.setTimeout(150_000);
  const run = async (url: string, setup?: (p: Page) => Promise<unknown>, pixel = true) => {
    const page = await browser.newPage();
    await setup?.(page);
    const net = await instrument(page);
    await page.goto(url);
    await expect(runButton(page)).toBeEnabled();
    const viz = !url.includes('viz=off');
    if (viz) await expect(page.locator('#view-roles li')).toHaveCount(8);
    if (viz && pixel) await enablePixel(page);
    await standin(page, 'hold');
    await runButton(page).click();
    if (viz) {
      await expect(page.locator('#view-run')).toHaveText('running');
      await page.locator('#view-stage').scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000); // give the canvas (or its failure) time to happen during the run
    }
    const iframesDuringRun = viz ? await page.locator('#execution-view').getAttribute('data-iframes') : null;
    await standin(page, 'resume');
    await done(page);
    const r = await evidence(page);
    const out = { r, p: viz ? await panel(page) : null, external: net.external, iframesDuringRun };
    await page.close();
    return out;
  };
  const on = await run('/?provider=standin'); // Pixel explicitly enabled: canvas during the run
  const text = await run('/?provider=standin', undefined, false); // default: text view only
  const off = await run('/?provider=standin&viz=off');
  const noWebview = await run('/?provider=standin', (p) => p.route('**/pixel-agents/**', (r) => r.fulfill({ status: 404 })));
  const badAsset = await run('/?provider=standin', (p) => p.route('**/pixel-agents/assets/characters/char_0.png', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: 'not a png' })));
  const hostError = await run('/?provider=standin', (p) => p.addInitScript(() => {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { get: () => ({ postMessage() { throw new Error('injected host error'); } }) });
  }));
  expect(on.r.counts).toMatchObject({ graphRuns: 1, logicalRequests: 8, fallbackRequests: 0 });
  for (const other of [text, off, noWebview, badAsset, hostError]) expect(strip(other.r)).toEqual(strip(on.r)); // fixture keeps snapshotDigest
  for (const x of [on, text, noWebview, badAsset, hostError]) {
    expect(x.p!.run).toBe('completed');
    expect(x.p!.roles).toEqual(Array(8).fill('completed'));
    expect(x.external).toEqual([]);
  }
  expect(on.iframesDuringRun).toBe('1');
  expect(text.iframesDuringRun).toBe('0');
  expect(noWebview.iframesDuringRun).toBe('0');
  expect(badAsset.iframesDuringRun).toBe('0');
  console.log('T025 iframes during run:', JSON.stringify({ on: on.iframesDuringRun, text: text.iframesDuringRun, noWebview: noWebview.iframesDuringRun, badAsset: badAsset.iframesDuringRun, hostError: hostError.iframesDuringRun }));
});

test('T025 US5/SC-002/F008-010: live evidence on vs off — only the INV-4 fields and the live snapshotDigest removed, the rest proven equal', async ({ browser }) => {
  test.setTimeout(90_000);
  const run = async (url: string) => {
    await stub('valid');
    const page = await browser.newPage();
    const r = await runOnce(page, url);
    const replay = JSON.parse((await page.locator('#replay').textContent()) ?? '{}');
    await page.close();
    return { r, replay };
  };
  const on = await run('/?provider=standin&data=live');
  const off = await run('/?provider=standin&data=live&viz=off');
  expect(on.r.outcome).toBe('success');
  expect(on.r.counts).toMatchObject({ graphRuns: 1, logicalRequests: 8 });
  // snapshotDigest covers the bundle's acquiredAt (Feature 007 data-model): prove that is the only cause …
  const sha = (x: unknown) => `sha256:${createHash('sha256').update(JSON.stringify(x)).digest('hex')}`;
  expect(sha(on.replay.bundle)).toBe(on.r.dataSource.snapshotDigest);
  expect(sha({ ...on.replay.bundle, acquiredAt: off.replay.bundle.acquiredAt })).toBe(off.r.dataSource.snapshotDigest);
  // … and check the substance directly (F008-010).
  const { acquiredAt: _a, ...bundleOn } = on.replay.bundle, { acquiredAt: _b, ...bundleOff } = off.replay.bundle;
  expect(bundleOn).toEqual(bundleOff); // normalized market payload
  expect(on.replay.marketFacts).toBe(off.replay.marketFacts);
  for (const k of ['marketFactsDigest', 'marketAsOf', 'analysisDate', 'sessions', 'historySessions', 'provider']) expect(on.r.dataSource[k], k).toEqual(off.r.dataSource[k]);
  expect(on.r.result).toEqual(off.r.result);
  expect(on.r.lifecycle).toEqual(off.r.lifecycle);
  const a = strip(on.r), b = strip(off.r);
  delete a.dataSource.snapshotDigest; delete b.dataSource.snapshotDigest; // live only; the fixture test keeps it
  expect(a).toEqual(b);
});

test('T026 US5/M6: webview controls and forged messages during a run never reach execution', async ({ page }) => {
  const net = await open(page);
  await startHeld(page);
  const view = page.locator('#execution-view');
  const frame = page.frameLocator('#view-stage iframe');
  const ignored0 = Number(await view.getAttribute('data-ignored-requests'));
  await frame.getByRole('button', { name: '+ Agent' }).click();
  await frame.getByRole('button', { name: 'Settings' }).click();
  await page.waitForTimeout(500);
  expect(Number(await view.getAttribute('data-ignored-requests'))).toBeGreaterThan(ignored0); // launchAgent seen, ignored
  await page.evaluate(() => {
    window.postMessage({ source: 'pixel-agents', message: { type: 'webviewReady' } }, '*');
    window.postMessage({ source: 'pixel-agents', message: { type: 'launchAgent' } }, '*');
  });
  const ignored1 = Number(await view.getAttribute('data-ignored-requests'));
  await pixelFrame(page).evaluate(() => {
    parent.postMessage({ source: 'someone-else', message: { type: 'webviewReady' } }, '*');
    parent.postMessage({ source: 'pixel-agents', message: {} }, '*');
    parent.postMessage({ source: 'pixel-agents', message: { type: 7 } }, '*');
    parent.postMessage({ source: 'pixel-agents', message: { type: 'runGraph' } }, '*');
    parent.postMessage('webviewReady', '*');
  });
  await page.waitForTimeout(500);
  expect(Number(await view.getAttribute('data-ignored-requests'))).toBe(ignored1 + 1); // only the well-formed unknown type counts
  const ready = await pixelFrame(page).evaluate(() => (window as unknown as { __rx: { type: string }[] }).__rx.filter((m) => m.type === 'settingsLoaded').length);
  expect(ready).toBe(1); // no forged webviewReady was answered
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'running'); // the one run, not restarted
  expect(net.api).toBe(0);
  await standin(page, 'resume');
  await done(page);
  const r = await evidence(page);
  expect(r.counts).toMatchObject({ graphRuns: 1, nodeExecutions: 8, logicalRequests: 8, fallbackRequests: 0 });
  expect(r.nodeEvents.length).toBe(16); // no extra node ran
  expect(net.api).toBe(0);
});

test('T026 F008-011: off-screen unmount and on-screen remount during a run change nothing in execution', async ({ page }) => {
  const net = await open(page);
  const view = page.locator('#execution-view');
  await startHeld(page);
  await page.locator('#run').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(view).toHaveAttribute('data-iframes', '0'); // off-screen: unmounted
  await bootPixel(page); // back on screen: remounted from the current snapshot
  await expect(page.frameLocator('#view-stage iframe').getByText('working (graph)')).toHaveCount(2);
  const c = await counters(page);
  expect(c.iframesCreated).toBe(2);
  await standin(page, 'resume');
  await done(page);
  const r = await evidence(page);
  expect(r.counts).toMatchObject({ graphRuns: 1, nodeExecutions: 8, logicalRequests: 8, fallbackRequests: 0 });
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  expect(r.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  expect(net.api).toBe(0);
  await expect(view).toHaveAttribute('data-iframes', '0');
});

test('T027 US6: fixture and live give the same role-state sequence shape; the mode line is right', async ({ browser }) => {
  const shape = async (url: string) => {
    await stub('valid');
    const page = await browser.newPage();
    await open(page, url);
    await recordTimeline(page);
    await runButton(page).click();
    await done(page);
    const mode = await page.locator('#view-mode').textContent();
    const seq = (await timeline(page)).panel.map((s) => s.run);
    await page.close();
    return { mode, final: seq.at(-1) };
  };
  expect(await shape('/?provider=standin')).toEqual({ mode: 'provider: standin · data: fixture', final: 'completed' });
  expect(await shape('/?provider=standin&data=live')).toEqual({ mode: 'provider: standin · data: live', final: 'completed' });
});

test('@dev T028 SC-007: Strict Mode — mount, cleanup, mount; one click = 1 graph run, 8 requests, ≤ 1 observer and iframe', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  const view = page.locator('#execution-view');
  await expect(view).toHaveAttribute('data-mounts', '2', { timeout: 60_000 }); // effect ran twice
  await expect(view).toHaveAttribute('data-observers', '1');
  await expect(view).toHaveAttribute('data-iframes', '0');
  await expect(pixelToggle(page)).toHaveAttribute('aria-pressed', 'false');
  await startHeld(page); // enables Pixel, then runs
  await expect(view).toHaveAttribute('data-observers', '1');
  expect(await page.locator('iframe').count()).toBe(1);
  await standin(page, 'resume');
  await done(page);
  const r = await evidence(page);
  expect(r.counts).toMatchObject({ graphRuns: 1, logicalRequests: 8 });
  await expect(view).toHaveAttribute('data-observers', '1');
  await expect(view).toHaveAttribute('data-iframes', '0');
});

test('T029 SC-014a: 10 canvas-showing runs and 5 reloads — listeners, observers and iframes return to the baseline', async ({ page }) => {
  test.setTimeout(240_000);
  await open(page);
  const base = await counters(page); // idle: the view's observers, no iframe, no message listener of the view
  const view = page.locator('#execution-view');
  for (let i = 0; i < 10; i++) {
    await startHeld(page); // mount
    expect((await counters(page)).messageListeners - base.messageListeners, `run ${i} mounted`).toBe(1);
    await standin(page, 'resume');
    await done(page); // terminal: unmount
    await expect(runButton(page)).toBeEnabled();
    const c = await counters(page);
    expect(c.messageListeners - base.messageListeners, `run ${i}`).toBe(0);
    expect(c.iframesCreated - base.iframesCreated, `run ${i}`).toBe(i + 1); // exactly one per run
    expect(await page.locator('iframe').count()).toBe(0);
    expect(c.observersCreated - c.observersDisconnected).toBe(base.observersCreated - base.observersDisconnected);
    expect(c.ioCreated - c.ioDisconnected).toBe(base.ioCreated - base.ioDisconnected);
    await expect(view).toHaveAttribute('data-observers', '1');
    await expect(view).toHaveAttribute('data-iframes', '0');
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  const heap = await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize);
  console.log('SC-014a usedJSHeapSize after 10 runs:', heap, 'baseline counters:', JSON.stringify(base));
  for (let i = 0; i < 5; i++) {
    await page.reload();
    await expect(page.locator('#view-roles li')).toHaveCount(8);
    expect(await counters(page)).toEqual(base);
  }
  expect(readFileSync('components/ExecutionView.tsx', 'utf8')).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/);
});

test('T031 SC-015/16, FR-029/033: reduced motion, viz=off, 375 px, text first, no off-origin request', async ({ browser }) => {
  // reduced motion: even during a run with the area on screen, the canvas is never created
  const rm = await browser.newPage();
  await rm.emulateMedia({ reducedMotion: 'reduce' });
  const rmNet = await open(rm);
  await expect(pixelToggle(rm)).toBeDisabled();
  await expect(rm.locator('#view-pixel-note')).toHaveText('unavailable: reduced motion is preferred');
  await standin(rm, 'hold');
  await runButton(rm).click();
  await rm.locator('#view-stage').scrollIntoViewIfNeeded();
  await rm.waitForTimeout(1500);
  expect((await counters(rm)).iframesCreated).toBe(0);
  expect(rmNet.pixel).toBe(0); // no Pixel asset was even requested
  await standin(rm, 'resume');
  await done(rm);
  expect((await evidence(rm)).counts).toMatchObject({ graphRuns: 1, logicalRequests: 8 });
  for (let i = 0; i < 8; i++) await expect(rm.locator('#view-roles li').nth(i)).toContainText(`${LABELS[i]}: completed`); // text, not color
  await rm.close();

  const off = await browser.newPage();
  const offNet = await open(off, '/?provider=standin&viz=off');
  await runButton(off).click();
  await done(off);
  await expect(off.locator('#execution-view')).toHaveCount(0);
  expect((await counters(off)).iframesCreated).toBe(0);
  expect(offNet.pixel).toBe(0);
  await off.close();

  // 375 px: the canvas fits and its labels render; controls stay uncovered; the view adds no page width
  const widths: Record<string, number> = {};
  for (const url of ['/?provider=standin&viz=off', '/?provider=standin']) {
    const n = await browser.newPage({ viewport: { width: 375, height: 800 } });
    const net = await open(n, url);
    if (!url.includes('viz=off')) await enablePixel(n);
    await standin(n, 'hold');
    await runButton(n).click();
    if (!url.includes('viz=off')) {
      await bootPixel(n);
      const box = (await n.locator('#view-stage iframe').boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(375);
      console.log('T031 375px canvas backing:', JSON.stringify(await canvasSize(n)));
      for (let i = 0; i < 8; i++) await expect(n.locator('#view-roles li').nth(i)).toBeVisible();
      expect(net.external).toEqual([]);
    }
    widths[url] = await n.evaluate(() => document.documentElement.scrollWidth);
    await n.evaluate(() => window.scrollTo(0, 0));
    for (const id of ['run', 'cancel']) {
      const hit = await n.evaluate((id) => {
        const b = document.getElementById(id)!.getBoundingClientRect();
        return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.id;
      }, id);
      expect(hit, id).toBe(id);
    }
    await standin(n, 'resume');
    await done(n);
    await n.close();
  }
  expect(widths['/?provider=standin']).toBeLessThanOrEqual(widths['/?provider=standin&viz=off']);
});
