// Feature 009 US3 (BROWSER_AUTOMATED): the office — the Feature 008 view state drawn by our own renderer.
// Traces are replayed as the same status-surface writes src/main.ts performs (e2e/replay-dom.ts); no model.
import { expect, test, type Page } from '@playwright/test';
import { ROLES } from '../src/graph/trading-graph.ts';
import type { ExecutionEvent } from '../src/view/execution-events.ts';
import { narrate } from '../src/view/narration.ts';
import { DESKS, SEAT, WORLD } from '../src/view/office-scene.ts';
import { initialViewState, reduce } from '../src/view/view-state.ts';
import { replayDom, trace } from './replay-dom.ts';

const office = (page: Page) => page.locator('[data-office]');
const tags = (page: Page) => page.locator('[data-office] [data-role]').evaluateAll((ts) => ts.map((t) => (t as HTMLElement).dataset.state));
const dialog = (page: Page) => page.locator('[data-office-dialog] p').allTextContents();
// Which desks have a character drawn: any non-floor pixel in the seat box left of the PC.
const seated = (page: Page) => page.evaluate(({ desks, seat }) => {
  const c = document.querySelector<HTMLCanvasElement>('[data-office] canvas')!;
  const px = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  const floor = new Set(['125,100,68', '138,111,77']);
  return desks.map((d) => {
    for (let y = d.y + seat.y; y < d.y; y++) for (let x = d.x + seat.x; x < d.x + seat.x + 16; x++) {
      const i = (y * c.width + x) * 4;
      if (!floor.has(`${px[i]},${px[i + 1]},${px[i + 2]}`)) return true;
    }
    return false;
  });
}, { desks: DESKS, seat: SEAT });

// Expected final state and last narration lines for a trace, computed with the same pure modules.
function expected(name: string) {
  const events = trace(name) as unknown as ExecutionEvent[];
  let s = initialViewState();
  const lines: string[] = [];
  for (const e of events) { const n = reduce(s, e); lines.push(...narrate(s, n, ROLES)); s = n; }
  return { roles: ROLES.map((r) => s.roles[r.node].state), last: lines.slice(-2) };
}

test('T018 US3/SC-002/FR-022: returning visit — office ready ≤ 2 s after load, eight characters seated before any run', async ({ page }) => {
  await page.goto('/?provider=standin');
  await expect(office(page)).toHaveAttribute('data-office', 'ready', { timeout: 2000 });
  expect(await tags(page)).toEqual(Array(8).fill('idle'));
  await expect.poll(() => seated(page)).toEqual(Array(8).fill(true));
  expect(await page.locator('[data-office] canvas').evaluate((c: HTMLCanvasElement) => [c.width, c.height])).toEqual([WORLD.w, WORLD.h]);
});

test('T018 US3/SC-007: replayed traces — final role states on the tags, narration in order', async ({ page }) => {
  for (const name of ['success', 'role-failure-bull', 'graph-cancel-analysts', 'ambiguous-sibling-error', 'acquisition-cancel']) {
    await page.goto('/');
    await expect(office(page)).toHaveAttribute('data-office', 'ready');
    await replayDom(page, trace(name), 0);
    const want = expected(name);
    await expect.poll(() => tags(page), name).toEqual(want.roles);
    await expect.poll(() => dialog(page), name).toEqual(want.last);
  }
});

test('T018 US3/FR-026: 375×812 — the office fits and every tag stays inside the viewport', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('/?provider=standin');
  await expect(office(page)).toHaveAttribute('data-office', 'ready');
  for (const t of await page.locator('[data-office] [data-role]').all()) {
    const b = (await t.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(375);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.close();
});

test('T018 FR-029: art missing → "office unavailable", the text view stays and a run still succeeds', async ({ page }) => {
  await page.route('**/office-art/**', (r) => r.fulfill({ status: 404 }));
  await page.goto('/?provider=standin');
  await expect(office(page)).toHaveAttribute('data-office', 'unavailable');
  await expect(page.getByText('오피스를 표시할 수 없습니다')).toBeVisible();
  await page.getByRole('button', { name: 'Run Graph', exact: true }).click();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });
  const r = JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
  expect(r.outcome).toBe('success');
  expect(await page.locator('#view-roles li').evaluateAll((ls) => ls.map((l) => (l as HTMLElement).dataset.state))).toEqual(Array(8).fill('completed'));
});

test('T018 FR-028: nothing is drawn while the page is hidden', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __draws: number; __hidden: boolean };
    w.__draws = 0; w.__hidden = false;
    Object.defineProperty(document, 'hidden', { get: () => w.__hidden });
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, ...a: Parameters<typeof draw>) {
      w.__draws++;
      return draw.apply(this, a);
    } as typeof draw;
  });
  await page.goto('/?provider=standin');
  await expect(office(page)).toHaveAttribute('data-office', 'ready');
  const draws = () => page.evaluate(() => (window as unknown as { __draws: number }).__draws);
  await expect.poll(draws).toBeGreaterThan(0); // visible: drawing at 4 Hz
  await page.evaluate(() => { (window as unknown as { __hidden: boolean }).__hidden = true; });
  const before = await draws();
  await page.waitForTimeout(2000);
  expect(await draws()).toBe(before);
});
