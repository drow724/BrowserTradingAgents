// Feature 008 main-thread busy ratio while a fixed synthetic trace is replayed as status writes. The measured
// window is an ACTIVE run: run-started and the analysts' starts are written before it, run-ended only after it.
// No run, model or acquisition takes part; load, Pixel boot, build and server start are outside the window.
//
// SC-014b (original, always-on ≤ 10 pp) is SUPERSEDED_BY_MAINTAINER_DECISION (D5): it FAILED, see verification.md.
// SC-014b1 (gate): the default page (text view, Pixel toggle untouched = off) vs ?viz=off — ≤ 2 percentage points,
//   with 0 Pixel iframes and 0 /pixel-agents requests in the default page.
// SC-014b2 (disclosure, no threshold): Pixel explicitly enabled, canvas visible and animating (≥ 20 fps), vs
//   ?viz=off — recorded as KNOWN_UPSTREAM_COST.
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { replayDom, trace } from './replay-dom.ts';

const WINDOW_MS = 10_000;
const REPS = 5;
const events = trace('success');
const PRE = events.slice(0, 3); // run-started, Market started, News started
const WINDOW = events.slice(3, -1); // everything up to, not including, run-ended
const POST = events.slice(-1);
type Mode = 'off' | 'default' | 'pixel';

async function taskSeconds(sessions: CDPSession[]) {
  let s = 0;
  for (const c of sessions) {
    const { metrics } = await c.send('Performance.getMetrics');
    s += metrics.find((m: { name: string }) => m.name === 'TaskDuration')!.value;
  }
  return s;
}
const pixelFrame = (page: Page) => page.frames().find((f) => f.url().includes('/pixel-agents/'));

async function sample(page: Page, mode: Mode) {
  let pixelRequests = 0;
  const count = (r: { url(): string }) => { if (new URL(r.url()).pathname.startsWith('/pixel-agents/')) pixelRequests++; };
  page.on('request', count);
  await page.goto(mode === 'off' ? '/?viz=off' : '/');
  await expect(page.locator('#run')).toBeEnabled({ timeout: 30_000 }); // provider: native (Playwright Chromium) — never clicked
  if (mode !== 'off') await expect(page.locator('#view-roles li')).toHaveCount(8);
  if (mode === 'pixel') await page.locator('#view-pixel-toggle').click();
  await replayDom(page, PRE, 0);
  let fps = 0, canvas = null as { width: number; height: number } | null;
  if (mode === 'pixel') {
    await page.locator('#view-stage').scrollIntoViewIfNeeded();
    await expect(page.locator('#execution-view')).toHaveAttribute('data-iframes', '1', { timeout: 30_000 });
    await page.frameLocator('#view-stage iframe').getByText('Final Decision').first().waitFor({ timeout: 30_000 });
    fps = await pixelFrame(page)!.evaluate(() => new Promise<number>((r) => {
      let n = 0; const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(tick); else r(n); };
      requestAnimationFrame(tick);
    }));
    expect(fps, 'the Pixel frame animates in the viewport').toBeGreaterThan(20);
    canvas = await pixelFrame(page)!.evaluate(() => { const c = document.querySelector('canvas')!; return { width: c.width, height: c.height }; });
  } else if (mode === 'default') {
    await page.locator('#view-stage').scrollIntoViewIfNeeded(); // same position as `pixel`: nothing may mount
  } else {
    await page.locator('#result').scrollIntoViewIfNeeded();
  }
  const sessions = [await page.context().newCDPSession(page)];
  // A sandboxed (opaque-origin) frame may run in its own renderer process: measure it too when it does.
  const frame = pixelFrame(page);
  if (frame) await page.context().newCDPSession(frame).then((s) => sessions.push(s), () => {});
  for (const s of sessions) await s.send('Performance.enable');
  const t0 = await taskSeconds(sessions), w0 = Date.now();
  await replayDom(page, WINDOW, WINDOW_MS);
  const busy = (await taskSeconds(sessions)) - t0, wall = (Date.now() - w0) / 1000;
  const iframesAtEnd = mode === 'off' ? '0' : await page.locator('#execution-view').getAttribute('data-iframes');
  const iframesInDom = await page.locator('iframe').count();
  for (const s of sessions) await s.detach();
  await replayDom(page, POST, 0);
  page.off('request', count);
  if (mode === 'pixel') expect(iframesAtEnd, 'the canvas stayed mounted for the whole window').toBe('1');
  if (mode === 'default') {
    expect(iframesInDom, 'default mode creates no Pixel iframe').toBe(0);
    expect(pixelRequests, 'default mode requests nothing from /pixel-agents').toBe(0);
  }
  return { busyRatio: busy / wall, separateFrameProcess: sessions.length === 2, fps, canvas };
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2; };
async function compare(page: Page, mode: Mode) {
  const off: number[] = [], on: number[] = [], fps: number[] = [];
  let separate = false, canvas = null as { width: number; height: number } | null;
  for (let i = 0; i < REPS; i++) { // alternating, same browser process
    off.push((await sample(page, 'off')).busyRatio);
    const s = await sample(page, mode);
    on.push(s.busyRatio); fps.push(s.fps); separate ||= s.separateFrameProcess; canvas = s.canvas;
  }
  return { windowMs: WINDOW_MS, off, on, medianOff: median(off), medianOn: median(on),
    deltaPercentagePoints: (median(on) - median(off)) * 100, pixelFrameInSeparateProcess: separate, pixelFrameFps: fps, canvasBacking: canvas };
}

test('T030 SC-014b1: default mode (text view, Pixel off) vs ?viz=off — median busy-ratio increase ≤ 2 percentage points', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const r = await compare(page, 'default');
  console.log('SC-014b1 raw', JSON.stringify(r));
  expect(r.deltaPercentagePoints).toBeLessThanOrEqual(2);
});

test('T030 SC-014b2: explicit Pixel mode cost, active and visible (KNOWN_UPSTREAM_COST; disclosed, no threshold)', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const r = await compare(page, 'pixel');
  console.log('SC-014b2 KNOWN_UPSTREAM_COST raw', JSON.stringify(r));
  expect(r.canvasBacking).toEqual({ width: 480, height: 320 }); // the compact backing store was measured
});
