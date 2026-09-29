// Feature 008 main-thread busy ratio while a fixed synthetic trace is replayed as status writes. The measured
// window is an ACTIVE run: run-started and the analysts' starts are written before it, run-ended only after it.
// No run, model or acquisition takes part; load, office art, build and server start are outside the window.
//
// SC-014b (original, always-on ≤ 10 pp) is SUPERSEDED_BY_MAINTAINER_DECISION (D5): it FAILED, see verification.md.
// Feature 009 SC-008 (gate; continues SC-014b1): the default page — text view plus the office, visible and
// animating — vs ?viz=off, ≤ 2 percentage points, with 0 iframes. SC-014b2 (Pixel Agents) was retired (MD-5).
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { replayDom, trace } from './replay-dom.ts';

const WINDOW_MS = 10_000;
const REPS = 5;
const events = trace('success');
const PRE = events.slice(0, 3); // run-started, Market started, News started
const WINDOW = events.slice(3, -1); // everything up to, not including, run-ended
const POST = events.slice(-1);
type Mode = 'off' | 'default';

async function taskSeconds(sessions: CDPSession[]) {
  let s = 0;
  for (const c of sessions) {
    const { metrics } = await c.send('Performance.getMetrics');
    s += metrics.find((m: { name: string }) => m.name === 'TaskDuration')!.value;
  }
  return s;
}

async function sample(page: Page, mode: Mode) {
  await page.goto(mode === 'off' ? '/?viz=off' : '/');
  await expect(page.locator('#run')).toBeEnabled({ timeout: 30_000 }); // provider: native (Playwright Chromium) — never clicked
  if (mode !== 'off') await expect(page.locator('[data-office]')).toHaveAttribute('data-office', 'ready');
  await replayDom(page, PRE, 0);
  await page.locator(mode === 'off' ? '#status' : '[data-office] canvas').scrollIntoViewIfNeeded(); // #result now sits in the closed 결과 window
  let paintsPerSecond = 0;
  if (mode === 'default') { // the office is on screen and animating (one wall fill per paint)
    const paints = () => page.evaluate(() => (window as unknown as { __paints: number }).__paints);
    const p0 = await paints(); await page.waitForTimeout(1000); paintsPerSecond = (await paints()) - p0;
    expect(paintsPerSecond, 'the office animates while measured').toBeGreaterThanOrEqual(3);
  }
  const session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');
  const t0 = await taskSeconds([session]), w0 = Date.now();
  await replayDom(page, WINDOW, WINDOW_MS);
  const busy = (await taskSeconds([session])) - t0, wall = (Date.now() - w0) / 1000;
  const iframesInDom = await page.locator('iframe').count();
  await session.detach();
  await replayDom(page, POST, 0);
  if (mode === 'default') expect(iframesInDom, 'default mode creates no iframe').toBe(0);
  return { busyRatio: busy / wall, paintsPerSecond };
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2; };
async function compare(page: Page, mode: Mode) {
  await page.addInitScript(() => { // test-side paint counter (no production hook)
    const w = window as unknown as { __paints: number };
    w.__paints = 0;
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (this: CanvasRenderingContext2D, x: number, y: number, ww: number, h: number) {
      if (x === 0 && y === 0) w.__paints++;
      return fill.call(this, x, y, ww, h);
    };
  });
  const off: number[] = [], on: number[] = [], paints: number[] = [];
  for (let i = 0; i < REPS; i++) { // alternating, same browser process
    off.push((await sample(page, 'off')).busyRatio);
    const s = await sample(page, mode);
    on.push(s.busyRatio); paints.push(s.paintsPerSecond);
  }
  return { windowMs: WINDOW_MS, off, on, paintsPerSecond: paints, medianOff: median(off), medianOn: median(on), deltaPercentagePoints: (median(on) - median(off)) * 100 };
}

test('Feature 009 T019 SC-008 (was T030 SC-014b1): default office view vs ?viz=off — median busy-ratio increase ≤ 2 percentage points', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  const r = await compare(page, 'default');
  console.log('SC-008 raw', JSON.stringify(r));
  expect(r.deltaPercentagePoints).toBeLessThanOrEqual(2);
});
