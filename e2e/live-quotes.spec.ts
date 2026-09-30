// Feature 014 (BROWSER_AUTOMATED, stand-in model + the Feature 007 market stand-in): live quotes for portfolio
// analysis. Holding symbols are unique per test: the app server caches successful quotes per trading day (R7).
import { expect, test, type Page } from '@playwright/test';
import { money } from '../src/analysis/facts.ts';
import { HISTORY, sessionDates } from '../test/fixtures/market/stub-bodies.ts';
import { loadExample } from './measure.ts';

const STUB = `http://127.0.0.1:${Number(process.env.STUB_PORT ?? Number(process.env.HARNESS_PORT ?? 5174) + 24)}`;
const stub = {
  use: async (o: { name: string; symbol?: string }) => {
    await fetch(`${STUB}/__reset`, { method: 'POST' });
    await fetch(`${STUB}/__scenario`, { method: 'POST', body: JSON.stringify(o) });
  },
  bySymbol: async (): Promise<Record<string, number>> => (await (await fetch(`${STUB}/__stats`)).json()).bySymbol,
};
const T = '2026-09-30T00:00:00.000Z';
const kr = (ticker: string, market = 'KOSPI') => ({ instrument: { kind: 'listing', assetClass: 'KR', ticker, name: `KR ${ticker}`, market, productType: 'stock' },
  quantity: 10, averagePrice: 100, currency: 'KRW', editedAt: T });
const us = (ticker: string) => ({ instrument: { kind: 'listing', assetClass: 'US', ticker, name: `US ${ticker}`, market: 'NASDAQ', productType: 'stock' },
  quantity: 2, averagePrice: 100, currency: 'USD', editedAt: T });
const fixed = (id: string, currency = 'KRW') => ({ instrument: { kind: 'fixed', id }, quantity: 1, averagePrice: 100, currency, editedAt: T });

// A real-looking portfolio in this origin, then the page without `quotes` (default live).
async function seed(page: Page, holdings: unknown[]) {
  await page.goto('/?provider=standin');
  await page.evaluate(([h, at]) => localStorage.setItem('bta.portfolio', JSON.stringify({ version: 1, onboardedAt: at, holdings: h })), [holdings, T] as const);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const w = window as unknown as { __records: unknown[] };
    w.__records = [];
    document.getElementById('run')!.addEventListener('bta-done', (e) => w.__records.push((e as CustomEvent).detail));
  });
}
type Rec = { outcome: string; dataSource: Record<string, unknown>; analysis: { holding: string; facts: { id: string; kind: string; text: string }[] };
  result?: Record<string, string> };
const records = (page: Page) => page.evaluate(() => (window as unknown as { __records: Rec[] }).__records);
async function analyseOne(page: Page, id: string) {
  if (!(await page.getByRole('dialog', { name: '포트폴리오' }).isVisible())) await page.getByRole('button', { name: '포트폴리오' }).click();
  await page.locator(`[data-holding="${id}"]`).getByRole('button', { name: '이 종목 분석' }).click();
  await expect(page.getByRole('dialog', { name: '답변' })).toBeVisible({ timeout: 60_000 });
  return (await records(page)).at(-1)!;
}

// The market facts computed independently from the stand-in's sessions (chart(): adjclose × 0.97 before the last 10).
function expected(currency: 'KRW' | 'USD', asOf: string, timeZone: string) {
  const n = HISTORY.length, adj = HISTORY.map((s, i) => { const f = i < n - 10 ? 0.97 : 1; return { high: s.high * f, low: s.low * f, close: s.close * f }; });
  const close = adj.at(-1)!.close, chg = (close / adj.at(-21)!.close - 1) * 100;
  const sma = adj.slice(-50).reduce((a, s) => a + s.close, 0) / 50;
  const dates = sessionDates(asOf, n); // 52-week range: unadjusted, one calendar year (F014-R2)
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date()).split('-'); // analysis date
  const year = HISTORY.filter((_, i) => dates[i] > `${Number(y) - 1}-${m}-${d}`);
  return { latest: money(close, currency), market: [
    `The price ${chg >= 0 ? 'rose' : 'fell'} ${Math.abs(chg).toFixed(1)}% over the last 20 sessions.`,
    `The price is ${close >= sma ? 'above' : 'below'} its 50-day moving average of ${money(sma, currency)}.`,
    `The 52-week high is ${money(Math.max(...year.map((s) => s.high)), currency)} and the 52-week low is ${money(Math.min(...year.map((s) => s.low)), currency)}.`,
  ] };
}

test('T013 US1/SC-001: KOSPI, KOSDAQ and US holdings get live facts from their own quote; source line; roles see only the facts', async ({ page }) => {
  await stub.use({ name: 'valid' });
  await seed(page, [kr('005930'), kr('247540', 'KOSDAQ'), us('ORCL')]);
  for (const [id, symbol, currency, zone] of [['KR:005930', '005930.KS', 'KRW', 'Asia/Seoul'], ['KR:247540', '247540.KQ', 'KRW', 'Asia/Seoul'], ['US:ORCL', 'ORCL', 'USD', 'America/New_York']] as const) {
    const r = await analyseOne(page, id);
    expect(r.outcome, id).toBe('success');
    expect(r.dataSource).toMatchObject({ mode: 'portfolio-live', provider: 'yahoo-chart@1', symbol });
    expect(r.dataSource.snapshotDigest).toMatch(/^sha256:/);
    const e = expected(currency, String(r.dataSource.marketAsOf), zone);
    expect(r.analysis.facts.find((f) => f.id === 'D1')!.text).toBe(`Latest price (${r.dataSource.marketAsOf}): ${e.latest}.`);
    expect(r.analysis.facts.filter((f) => f.kind === 'market').map((f) => f.text)).toEqual(e.market);
    expect(r.analysis.facts.find((f) => f.kind === 'news')!.text).toBe('No news is supplied for this holding.');
    // FR-007: the Market Analyst's prompt (echoed by the stand-in) carries exactly these market facts, nothing fictional.
    for (const m of e.market) expect(r.result!.marketReport).toContain(m);
    expect(JSON.stringify(r)).not.toContain('fictional');
    const w = page.getByRole('dialog', { name: '답변' });
    await expect(w.locator('[data-source="live"]')).toHaveText(`시세 기준: ${r.dataSource.marketAsOf} (Yahoo)`);
    await expect(w.locator('[data-notice]')).toContainText('연구용이며 투자 조언이 아닙니다.');
    await page.keyboard.press('Escape');
  }
  expect(await stub.bySymbol()).toEqual({ '005930.KS': 1, '247540.KQ': 1, ORCL: 1 });
});

test('T016 US2/SC-003: gold not requested; a failing and an invalid quote → not available, others quoted; no fixture value', async ({ page }) => {
  await stub.use({ name: 'server-error', symbol: '000660.KS' });
  await seed(page, [fixed('KRX-GOLD'), fixed('BTC'), kr('000660'), us('MSFT')]);
  await page.getByRole('button', { name: '전체 점검' }).click();
  await expect(page.getByRole('dialog', { name: '답변' })).toBeVisible({ timeout: 60_000 });
  const rs = await records(page);
  expect(rs.map((r) => [r.analysis.holding, r.outcome])).toEqual([['KRX-GOLD', 'success'], ['BTC', 'success'], ['KR:000660', 'success'], ['US:MSFT', 'success']]);
  expect(rs[0].dataSource).toEqual({ mode: 'portfolio-live', symbol: null, unavailable: 'not-quotable' });
  expect(rs[1].dataSource).toEqual({ mode: 'portfolio-live', symbol: null, unavailable: 'not-quotable' }); // F014-R3
  expect(rs[2].dataSource).toEqual({ mode: 'portfolio-live', symbol: '000660.KS', unavailable: 'provider-error' });
  expect(rs[3].dataSource).toMatchObject({ mode: 'portfolio-live', symbol: 'MSFT', provider: 'yahoo-chart@1' });
  for (const r of rs.slice(0, 3)) {
    expect(r.analysis.facts.find((f) => f.kind === 'market')!.text).toBe('Market data not available (시장 데이터 없음).');
    expect(r.analysis.facts.filter((f) => f.kind === 'derived')).toEqual([]);
  }
  expect(JSON.stringify(rs)).not.toMatch(/91,250,000|148,500|fictional/); // example-fixture values never reach a live run
  expect(await stub.bySymbol()).toEqual({ '000660.KS': 1, MSFT: 1 });
  const w = page.getByRole('dialog', { name: '답변' });
  await expect(w.locator('[data-source="unavailable"]')).toHaveCount(3);
  await expect(w.locator('[data-answer-for="KRX-GOLD"] [data-source]')).toHaveText('시세 없음: 이 자산은 시세를 조회할 수 없습니다');
  await page.keyboard.press('Escape');

  await stub.use({ name: 'non-json', symbol: '035720.KQ' });
  await seed(page, [kr('035720', 'KOSDAQ')]);
  const r = await analyseOne(page, 'KR:035720');
  expect(r.dataSource).toEqual({ mode: 'portfolio-live', symbol: '035720.KQ', unavailable: 'invalid-data' });
});

test('T016 US2/SC-004: cancel during the quote phase → no run starts, within 1 s', async ({ page }) => {
  await stub.use({ name: 'hang', symbol: '051910.KS' });
  await seed(page, [kr('051910')]);
  await page.getByRole('button', { name: '포트폴리오' }).click();
  await page.locator('[data-holding="KR:051910"]').getByRole('button', { name: '이 종목 분석' }).click();
  await expect(page.locator('[data-analysing]')).toContainText('시세 조회');
  const t0 = Date.now();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('[data-ask-notice]')).toContainText('시세 조회를 취소했습니다');
  expect(Date.now() - t0).toBeLessThan(1000);
  await expect(page.locator('[data-analysing]')).toHaveCount(0);
  expect(await records(page)).toEqual([]);
  await expect(page.locator('#status')).not.toHaveAttribute('data-state', 'running');
});

test('T017 US2/SC-004/SC-005: the same holding twice → one source request; the quote phase is short', async ({ page }) => {
  await stub.use({ name: 'valid' });
  await seed(page, [us('NVDA')]);
  await page.getByRole('button', { name: '포트폴리오' }).click();
  const button = page.locator('[data-holding="US:NVDA"]').getByRole('button', { name: '이 종목 분석' });
  // Quote phase = from the click to the run's start (bta-analyze), measured in the page.
  await page.evaluate(() => {
    const w = window as unknown as { __t: number[] };
    w.__t = [];
    document.querySelector('[data-holding="US:NVDA"] button')!.addEventListener('click', () => w.__t.push(performance.now()), { capture: true });
    document.getElementById('run')!.addEventListener('bta-analyze', () => w.__t.push(performance.now()), { once: true });
  });
  await button.click();
  await expect(page.getByRole('dialog', { name: '답변' })).toBeVisible({ timeout: 60_000 });
  const [clicked, started] = await page.evaluate(() => (window as unknown as { __t: number[] }).__t);
  expect(started - clicked).toBeLessThan(5000);
  await page.keyboard.press('Escape');
  await analyseOne(page, 'US:NVDA');
  expect(await stub.bySymbol()).toEqual({ NVDA: 1 });
  expect((await records(page)).map((r) => r.dataSource.mode)).toEqual(['portfolio-live', 'portfolio-live']);
});

test('T020 US3/SC-002: the example stays on fixture facts with 0 quote requests; editing holdings returns to live', async ({ page }) => {
  await stub.use({ name: 'valid' });
  await loadExample(page); // the example button sets quotes=fixture
  expect(new URL(page.url()).searchParams.get('quotes')).toBe('fixture');
  await page.evaluate(() => {
    const w = window as unknown as { __records: unknown[] };
    w.__records = [];
    document.getElementById('run')!.addEventListener('bta-done', (e) => w.__records.push((e as CustomEvent).detail));
  });
  const r = await analyseOne(page, 'BTC');
  expect(r.dataSource).toEqual({ mode: 'portfolio-fixture', fixture: 'portfolio-fixture@1' });
  expect(r.analysis.facts.find((f) => f.id === 'D1')!.text).toBe('Latest price (2026-09-25): 91,250,000 KRW.');
  const w = page.getByRole('dialog', { name: '답변' });
  await expect(w.locator('[data-source="fixture"]')).toHaveText('가상 예시 데이터');
  await expect(w.locator('[data-notice]')).toContainText('연구용이며 투자 조언이 아닙니다.');
  expect(await stub.bySymbol()).toEqual({});
  await page.keyboard.press('Escape');

  // Editing holdings (removing one) saves from the editor → live again; BTC is treated as real now: never the
  // example's 91,250,000 (and not quotable, F014-R3).
  await page.getByRole('button', { name: '포트폴리오' }).click();
  await page.locator('[data-holding="US:ZZAP"]').getByRole('button', { name: '삭제' }).click();
  expect(new URL(page.url()).searchParams.get('quotes')).toBeNull();
  const live = await analyseOne(page, 'BTC');
  expect(live.dataSource).toEqual({ mode: 'portfolio-live', symbol: null, unavailable: 'not-quotable' });
  expect(JSON.stringify(live.analysis.facts)).not.toContain('91,250,000');
});
