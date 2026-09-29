// Feature 009 US1/US2/US4 (BROWSER_AUTOMATED): the shell, first visit, holdings. Stand-in provider; fixture data.
import { expect, test, type Page } from '@playwright/test';

const EMPTY = { cookies: [], origins: [] };
// Next's route announcer is also role=alert: look only inside the shell.
const alert = (page: Page) => page.locator('[data-phase]').getByRole('alert');
const stored = (page: Page) => page.evaluate(() => localStorage.getItem('bta.portfolio'));
const run = (page: Page) => page.getByRole('button', { name: 'Run Graph', exact: true });
const done = (page: Page) => expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });

async function addFixed(page: Page, kind: '비트코인' | 'KRX 금현물', quantity: string, price: string, currency?: 'KRW' | 'USD') {
  await page.getByRole('button', { name: '+ 자산 추가' }).click();
  await page.getByRole('radio', { name: kind }).check();
  await page.getByLabel(/^수량/).fill(quantity);
  await page.getByLabel('평균 매수가').fill(price);
  if (currency) await page.getByLabel('통화').selectOption(currency);
  await page.getByRole('button', { name: '추가', exact: true }).click();
}

test.describe('first visit (empty storage)', () => {
  test.use({ storageState: EMPTY });

  test('T029 US1 AS1/AS3: onboarding covers the page; skip → office, finished record stored', async ({ page }) => {
    await page.goto('/?provider=standin');
    await expect(page.locator('[data-onboarding="hello"]')).toBeVisible();
    await expect(run(page)).toBeHidden(); // the HUD exists (src/main.ts needs it) but is not reachable
    expect(await stored(page)).toBeNull();
    await page.getByRole('button', { name: '건너뛰기' }).click();
    await expect(page.locator('[data-onboarding]')).toHaveCount(0);
    await expect(run(page)).toBeVisible();
    await expect(page.locator('[data-office]')).toHaveAttribute('data-office', 'ready');
    expect(JSON.parse((await stored(page))!)).toMatchObject({ version: 1, holdings: [] });
    await page.reload();
    await expect(page.locator('[data-onboarding]')).toHaveCount(0); // US3 AS1: returning visit
  });

  test('T029 US1 AS4: reload in the middle of onboarding → onboarding again, nothing stored', async ({ page }) => {
    await page.goto('/?provider=standin');
    await page.getByRole('button', { name: '시작하기' }).click();
    await addFixed(page, '비트코인', '0.5', '90000000');
    expect(await stored(page)).toBeNull();
    await page.reload();
    await expect(page.locator('[data-onboarding="hello"]')).toBeVisible();
    expect(await stored(page)).toBeNull();
  });

  test('T032 US2: fixed instruments, validation messages, duplicate → edit; reload and a new context keep them (SC-004)', async ({ page, browser }) => {
    await page.goto('/?provider=standin');
    await page.getByRole('button', { name: '시작하기' }).click();
    // invalid values are rejected with a reason
    await page.getByRole('button', { name: '+ 자산 추가' }).click();
    await page.getByRole('radio', { name: '비트코인' }).check();
    await page.getByLabel(/^수량/).fill('0');
    await page.getByLabel('평균 매수가').fill('1');
    await page.getByRole('button', { name: '추가', exact: true }).click();
    await expect(alert(page)).toHaveText('수량은 0보다 큰 숫자여야 합니다.');
    await page.getByLabel(/^수량/).fill('0.123456789');
    await page.getByRole('button', { name: '추가', exact: true }).click();
    await expect(alert(page)).toHaveText('수량은 소수점 8자리까지 입력할 수 있습니다.');
    await page.getByLabel(/^수량/).fill('0.25');
    await page.getByLabel('평균 매수가').fill('-3');
    await page.getByRole('button', { name: '추가', exact: true }).click();
    await expect(alert(page)).toHaveText('평균 단가는 0보다 큰 숫자여야 합니다.');
    await page.getByLabel('평균 매수가').fill('61000.5');
    await page.getByLabel('통화').selectOption('USD');
    await page.getByRole('button', { name: '추가', exact: true }).click();
    await addFixed(page, 'KRX 금현물', '37.5', '152000');
    // duplicate → offered to edit the existing holding
    await page.getByRole('button', { name: '+ 자산 추가' }).click();
    await page.getByRole('radio', { name: '비트코인' }).check();
    await expect(alert(page)).toContainText('이미 있는 종목입니다.');
    await page.getByRole('button', { name: '수정하기' }).click();
    await expect(page.getByLabel(/^수량/)).toHaveValue('0.25');
    await page.getByRole('button', { name: '취소' }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '사무소 입장' }).click();
    const expected = [
      { instrument: { kind: 'fixed', id: 'BTC' }, quantity: 0.25, averagePrice: 61000.5, currency: 'USD' },
      { instrument: { kind: 'fixed', id: 'KRX-GOLD' }, quantity: 37.5, averagePrice: 152000, currency: 'KRW' },
    ];
    expect(JSON.parse((await stored(page))!).holdings).toMatchObject(expected);
    await page.reload();
    await page.getByRole('button', { name: '포트폴리오' }).click();
    await expect(page.locator('[data-holding]')).toHaveCount(2);
    // "browser restart": a new context from the same storage (C8)
    const state = await page.context().storageState();
    const again = await browser.newContext({ storageState: state });
    const p2 = await again.newPage();
    await p2.goto('/?provider=standin');
    expect(JSON.parse((await p2.evaluate(() => localStorage.getItem('bta.portfolio')))!).holdings).toMatchObject(expected);
    await again.close();
  });

  test('T029 edge: storage throws → onboarding with a session-only notice, nothing sent', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
    });
    await page.goto('/?provider=standin');
    await expect(page.getByRole('status').filter({ hasText: '이번 방문 동안만 유지됩니다' })).toBeVisible();
    await page.getByRole('button', { name: '건너뛰기' }).click();
    await expect(run(page)).toBeVisible();
    await expect(page.getByText('이 브라우저에 저장할 수 없어 이번 방문 동안만 유지됩니다.')).toBeVisible();
  });
});

test.describe('stored portfolio', () => {
  test('T029 edge: unreadable portfolio → notice with reset and read-only', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [{ origin: test.info().project.use.baseURL!, localStorage: [{ name: 'bta.portfolio', value: '{broken' }] }] } });
    const page = await ctx.newPage();
    await page.goto('/?provider=standin');
    await expect(alert(page)).toContainText('저장된 포트폴리오를 읽을 수 없습니다.');
    await page.getByRole('button', { name: '읽기 전용으로 유지' }).click();
    await expect(alert(page)).toHaveCount(0);
    await expect(run(page)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('bta.portfolio'))).toBe('{broken'); // untouched
    await page.reload();
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: '초기화' }).first().click();
    await expect(page.locator('[data-onboarding="hello"]')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('bta.portfolio'))).toBeNull();
    await ctx.close();
  });

  test('T024 US4: HUD run; 결과 window shows decision, evidence and the advice statement; windows open mid-run change nothing', async ({ page }) => {
    await page.goto('/?provider=standin');
    await expect(run(page)).toBeEnabled();
    await page.evaluate(() => (window as unknown as { __standin: { hold(): void } }).__standin.hold());
    await run(page).click();
    await page.getByRole('button', { name: '상태' }).click(); // C13: a window during the run
    await expect(page.getByRole('dialog', { name: '상태' }).locator('#node-marketAnalyst')).toHaveText('running');
    await page.keyboard.press('Escape');
    await page.evaluate(() => (window as unknown as { __standin: { resume(): void } }).__standin.resume());
    await done(page);
    const r = JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
    expect(r.outcome).toBe('success');
    expect(r.counts).toMatchObject({ graphRuns: 1, logicalRequests: 8, fallbackRequests: 0 });
    await page.getByRole('button', { name: '결과' }).click();
    const w = page.getByRole('dialog', { name: '결과' });
    await expect(w.getByText('이 결과는 분석이며 투자 조언이 아닙니다.')).toBeVisible();
    await expect(w.getByText(/No output is investment advice/)).toBeVisible();
    await expect(w.locator('#result')).not.toBeEmpty();
    await expect(w.locator('#evidence')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(w).toBeHidden();
  });

  test('T024 US4 AS3: ?viz=off — no office, the run works', async ({ page }) => {
    await page.goto('/?provider=standin&viz=off');
    await expect(run(page)).toBeEnabled();
    await expect(page.locator('[data-office]')).toHaveCount(0);
    await run(page).click();
    await done(page);
    expect(JSON.parse((await page.locator('#evidence').textContent()) ?? '{}').outcome).toBe('success');
  });
});
