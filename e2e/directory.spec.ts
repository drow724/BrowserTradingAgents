// Feature 009 US5/US6 (BROWSER_AUTOMATED): the symbol directory through the app's own server and the local
// source stand-in (e2e/market-stub.mjs), and the holdings privacy sentinel. No real source is contacted.
// The server refreshes each source at most once per Seoul day (the count itself is proven in
// test/directory.test.ts under 100 concurrent calls); here: no further source request on a second visit.
import { expect, test, type Page } from '@playwright/test';

const STUB = `http://127.0.0.1:${Number(process.env.STUB_PORT ?? Number(process.env.HARNESS_PORT ?? 5174) + 24)}`;
const stats = async () => (await (await fetch(`${STUB}/__stats`)).json()) as { directory: Record<string, number>; requests: number };
const reset = () => fetch(`${STUB}/__reset`, { method: 'POST' });
const EMPTY = { cookies: [], origins: [] };
const shellAlert = (page: Page) => page.locator('[data-phase]').getByRole('alert');

function count(page: Page) {
  const n = { directory: 0, other: [] as string[] };
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname === '/api/directory') n.directory++;
    else if (!u.pathname.startsWith('/_next/') && r.resourceType() === 'fetch') n.other.push(u.pathname);
  });
  return n;
}
async function searchFor(page: Page, cls: '국내 주식' | '미국 주식', query: string) {
  await page.getByRole('button', { name: '+ 자산 추가' }).click();
  await page.getByRole('radio', { name: cls }).check();
  await page.getByLabel('종목 검색').fill(query);
}

test.describe('directory in the browser', () => {
  test.use({ storageState: EMPTY });

  test('T044 US5: one download per day per browser; typing sends nothing; as-of and attribution shown', async ({ page }) => {
    await reset();
    const n = count(page);
    await page.goto('/?provider=standin');
    await page.getByRole('button', { name: '시작하기' }).click();
    await searchFor(page, '국내 주식', '삼성');
    await expect(page.getByRole('list', { name: '검색 결과' }).getByRole('button')).toHaveCount(2);
    await expect(page.locator('[data-directory-status]')).toHaveText(/^2026-09-25 기준 · 출처: 공공데이터포털/);
    expect(n.directory).toBe(1);
    const sources = (await stats()).directory; // today's server refresh, whichever request triggered it
    const before = n.directory + n.other.length;
    await page.getByLabel('종목 검색').fill('');
    await page.getByLabel('종목 검색').pressSequentially('삼성테스트전자우'); // 8 keystrokes
    expect(n.directory + n.other.length).toBe(before); // SC-003: search is local
    await expect(page.getByRole('list', { name: '검색 결과' }).getByRole('button')).toHaveCount(1);
    await page.reload();
    await page.getByRole('button', { name: '시작하기' }).click();
    await searchFor(page, '미국 주식', 'ZZ');
    await expect(page.locator('[data-directory-status]')).toHaveText(/^2026-09-25 기준 · 출처: Nasdaq Trader/);
    expect(n.directory).toBe(1); // today's copy came from Cache Storage (SC-006, browser side)
    expect((await stats()).directory).toEqual(sources); // same day: no further source request (server side)
  });

  test('T044 US5 AS2/AS4: failed refresh keeps the old copy; no copy at all → "목록 없음", fixed instruments still addable', async ({ page }) => {
    await page.goto('/?provider=standin');
    await expect.poll(() => page.evaluate(async () => !!(await (await caches.open('bta-directory')).match('/api/directory')))).toBe(true);
    // Age the stored copy by a day, then make the refresh fail: the old copy stays in use.
    await page.evaluate(async () => {
      const c = await caches.open('bta-directory');
      const d = await (await c.match('/api/directory'))!.json();
      await c.put('/api/directory', new Response(JSON.stringify({ ...d, fetchedDay: '2000-01-01' })));
    });
    await page.route('**/api/directory', (r) => r.abort());
    const n = count(page);
    await page.reload();
    await page.getByRole('button', { name: '시작하기' }).click();
    await searchFor(page, '국내 주식', '가상');
    await expect(page.getByRole('list', { name: '검색 결과' }).getByRole('button').first()).toBeVisible();
    expect(n.directory).toBe(1); // one attempt, failed
    // A fresh browser with no copy and a failing server: stock search says so; BTC still works.
    const ctx = await page.context().browser()!.newContext({ storageState: EMPTY });
    const p2 = await ctx.newPage();
    await p2.route('**/api/directory', (r) => r.abort());
    await p2.goto('/?provider=standin');
    await p2.getByRole('button', { name: '시작하기' }).click();
    await searchFor(p2, '국내 주식', '가상');
    await expect(p2.locator('[data-directory-status]')).toHaveText(/목록 없음/);
    await p2.getByRole('radio', { name: '비트코인' }).check();
    await p2.getByLabel(/^수량/).fill('1');
    await p2.getByLabel('평균 매수가').fill('100');
    await p2.getByRole('button', { name: '추가', exact: true }).click();
    await expect(p2.locator('[data-holding="BTC"]')).toBeVisible();
    await ctx.close();
  });

  test('T032 US2: a Korean stock by Korean name and a US ETF by ticker; product type and market shown; reload keeps them', async ({ page }) => {
    await page.goto('/?provider=standin');
    await page.getByRole('button', { name: '시작하기' }).click();
    await searchFor(page, '국내 주식', '삼성테스트전자');
    const r = page.getByRole('list', { name: '검색 결과' }).getByRole('button');
    await expect(r.first()).toContainText('900001 · KOSPI · 주식');
    await expect(r.nth(1)).toContainText('900002 · KOSPI · 우선주');
    await r.first().click();
    await page.getByLabel(/^수량/).fill('10');
    await page.getByLabel('평균 매수가').fill('71000');
    await page.getByRole('button', { name: '추가', exact: true }).click();
    await searchFor(page, '미국 주식', 'zzsp');
    await page.getByRole('list', { name: '검색 결과' }).getByRole('button').first().click();
    await expect(page.getByText('선택:')).toContainText('ZZSP · NYSE Arca · ETF');
    await page.getByLabel(/^수량/).fill('2.5');
    await page.getByLabel('평균 매수가').fill('512.3');
    await page.getByRole('button', { name: '추가', exact: true }).click();
    await page.getByRole('button', { name: '다음' }).click();
    await page.getByRole('button', { name: '사무소 입장' }).click();
    await page.reload();
    await page.getByRole('button', { name: '포트폴리오' }).click();
    await expect(page.locator('[data-holding="KR:900001"]')).toContainText('삼성테스트전자');
    await expect(page.locator('[data-holding="US:ZZSP"]')).toContainText('2.5 주');
    await expect(page.locator('[data-holding]')).toHaveCount(2);
    await expect(shellAlert(page)).toHaveCount(0);
  });
});

test('T033 US6/SC-005: holding sentinels never leave the browser (requests, headers, bodies, console, evidence, replay)', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: EMPTY });
  const page = await ctx.newPage();
  const seen: string[] = [];
  page.on('request', (r) => seen.push(`${r.url()} ${JSON.stringify(r.headers())} ${r.postData() ?? ''}`));
  page.on('console', (m) => seen.push(m.text()));
  const SENTINELS = ['777777.77', '777777', '424242.42', '424242'];
  await page.goto('/?provider=standin');
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.getByRole('button', { name: '+ 자산 추가' }).click();
  await page.getByRole('radio', { name: '비트코인' }).check();
  await page.getByLabel(/^수량/).fill('777777.77');
  await page.getByLabel('평균 매수가').fill('424242.42');
  await page.getByRole('button', { name: '추가', exact: true }).click();
  await page.getByRole('button', { name: '다음' }).click();
  await page.getByRole('button', { name: '사무소 입장' }).click();
  await page.getByRole('button', { name: '포트폴리오' }).click(); // editing screen
  await page.getByRole('button', { name: '수정' }).click();
  await page.getByRole('button', { name: '저장' }).click();
  await page.keyboard.press('Escape');
  for (const url of ['/?provider=standin', '/?provider=standin&data=live']) {
    await fetch(`${STUB}/__reset`, { method: 'POST' });
    await page.goto(url);
    await page.getByRole('button', { name: 'Run Graph', exact: true }).click();
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });
    seen.push((await page.locator('#evidence').textContent()) ?? '', (await page.locator('#replay').textContent()) ?? '');
    expect(JSON.parse((await page.locator('#evidence').textContent())!).outcome).toBe('success');
  }
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('bta.portfolio')))!).holdings[0].quantity).toBe(777777.77); // it is stored locally
  expect(seen.length).toBeGreaterThan(10);
  for (const s of SENTINELS) expect(seen.filter((x) => x.includes(s)), s).toEqual([]);
  await ctx.close();
});
