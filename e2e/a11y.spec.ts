// Feature 009 US7 (BROWSER_AUTOMATED): keyboard only, reduced motion, text for every state (SC-010).
import { expect, test, type Page } from '@playwright/test';

const EMPTY = { cookies: [], origins: [] };
// Press Tab until the focused element has this accessible name (role optional); fails after 60 presses.
async function tabTo(page: Page, name: string | RegExp, role?: string) {
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const e = document.activeElement as HTMLInputElement | null;
      const label = e?.getAttribute('aria-label') ?? (e?.labels?.[0]?.textContent ?? e?.textContent ?? '');
      return { label: label.trim(), tag: e?.tagName.toLowerCase(), type: (e as HTMLInputElement | null)?.type };
    });
    const hit = typeof name === 'string' ? f.label === name || f.label.startsWith(name) : name.test(f.label);
    if (hit && (!role || f.tag === role || f.type === role)) return;
  }
  throw new Error(`no focusable "${name}"`);
}

test.describe('keyboard only', () => {
  test.use({ storageState: EMPTY });

  test('T047/T048 SC-010: onboarding with BTC and a searched Korean stock, Run, Cancel, 결과 open/close — keyboard only', async ({ page }) => {
    await page.goto('/?provider=standin&quotes=fixture');
    await expect(page.getByRole('button', { name: '시작하기' })).toBeFocused(); // autofocus on the greeting
    await page.keyboard.press('Enter');
    await tabTo(page, '+ 자산 추가'); await page.keyboard.press('Enter');
    await tabTo(page, '비트코인', 'radio'); // the checked radio of the group
    await tabTo(page, /^수량/); await page.keyboard.type('0.5');
    await tabTo(page, '평균 매수가'); await page.keyboard.type('90000000');
    await tabTo(page, '추가'); await page.keyboard.press('Enter');
    await expect(page.locator('[data-holding="BTC"]')).toBeVisible();
    await tabTo(page, '+ 자산 추가'); await page.keyboard.press('Enter');
    await tabTo(page, '비트코인', 'radio');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); // → 국내 주식
    await expect(page.getByRole('radio', { name: '국내 주식' })).toBeChecked();
    await tabTo(page, '종목 검색'); await page.keyboard.type('삼성테스트전자');
    await tabTo(page, /^삼성테스트전자 900001/); await page.keyboard.press('Enter');
    await tabTo(page, /^수량/); await page.keyboard.type('3');
    await tabTo(page, '평균 매수가'); await page.keyboard.type('70000');
    await tabTo(page, '추가'); await page.keyboard.press('Enter');
    await expect(page.locator('[data-holding="KR:900001"]')).toBeVisible();
    await tabTo(page, '다음'); await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: '사무소 입장' })).toBeFocused();
    await page.keyboard.press('Enter');
    // The office: Run, Cancel, 결과 — keyboard only.
    await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled();
    await page.evaluate(() => (window as unknown as { __standin: { hold(): void } }).__standin.hold());
    await tabTo(page, 'Run Graph'); await page.keyboard.press('Enter');
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'running');
    await tabTo(page, 'Cancel'); await page.keyboard.press('Enter');
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });
    await page.evaluate(() => (window as unknown as { __standin: { resume(): void } }).__standin.resume());
    expect(JSON.parse((await page.locator('#evidence').textContent())!).outcome).toBe('cancelled');
    await tabTo(page, '결과'); await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: '결과' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: '결과' })).toBeHidden();
    await expect(page.getByRole('button', { name: '결과' })).toBeFocused(); // focus returns to the opener
  });
});

test('T047 US7 AS2/AS3: reduced motion — no redraw between identical states, no running animation; states readable as text', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const w = window as unknown as { __paints: number };
    w.__paints = 0;
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (this: CanvasRenderingContext2D, x: number, y: number, ww: number, h: number) {
      if (x === 0 && y === 0) w.__paints++;
      return fill.call(this, x, y, ww, h);
    };
  });
  await page.goto('/?provider=standin&quotes=fixture');
  await expect(page.locator('[data-office]')).toHaveAttribute('data-office', 'ready');
  const paints = () => page.evaluate(() => (window as unknown as { __paints: number }).__paints);
  const p0 = await paints();
  await page.waitForTimeout(2000);
  expect(await paints()).toBe(p0); // identical state: no redraw
  expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
  await page.getByRole('button', { name: 'Run Graph', exact: true }).click();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });
  expect(await paints()).toBeGreaterThan(p0); // one draw per state change
  await expect(page.locator('[data-office] canvas')).toHaveAttribute('aria-hidden', 'true');
  for (const li of await page.locator('#view-roles li').all()) await expect(li).toContainText(': completed');
  await expect(page.locator('[data-office] [data-role="trader"]')).toHaveText('✓ Trader');
});

test('T034 Feature 010: question, answer window and ledger — keyboard only; flags carry text', async ({ page }) => {
  await page.goto('/?provider=standin&quotes=fixture');
  await page.evaluate(() => localStorage.setItem('bta.portfolio', JSON.stringify({ version: 1, onboardedAt: '2026-09-29T00:00:00.000Z', holdings: [
    { instrument: { kind: 'fixed', id: 'BTC' }, quantity: 0.25, averagePrice: 95000000, currency: 'KRW', editedAt: '2026-09-29T00:00:00.000Z' }] })));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled();
  await tabTo(page, '질문'); await page.keyboard.type('비트코인 괜찮나요?'); await page.keyboard.press('Enter');
  const w = page.getByRole('dialog', { name: '답변' });
  await expect(w).toBeVisible();
  await tabTo(page, '모의 거래로 기록'); await page.keyboard.press('Enter');
  const l = page.getByRole('dialog', { name: '모의 거래' });
  await expect(l).toBeVisible();
  await tabTo(page, '기록'); await page.keyboard.press('Enter');
  await expect(l.locator('[data-trade]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(l).toBeHidden();
});
