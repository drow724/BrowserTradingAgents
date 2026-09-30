// Feature 015 (BROWSER_AUTOMATED, stand-in model + the Toss stand-in with a FICTIONAL account): import, Toss quotes,
// failures, secrets. The app server runs with fake Toss credentials (playwright.config.ts), never the real key.
import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { money } from '../src/analysis/facts.ts';
import { addDays, HISTORY, sessionDates } from '../test/fixtures/market/stub-bodies.ts';
import { FAKE } from '../test/fixtures/market/toss-bodies.ts';

const STUB = `http://127.0.0.1:${Number(process.env.STUB_PORT ?? Number(process.env.HARNESS_PORT ?? 5174) + 24)}`;
const stub = {
  use: async (o: Record<string, unknown>) => {
    await fetch(`${STUB}/__reset`, { method: 'POST' });
    await fetch(`${STUB}/__scenario`, { method: 'POST', body: JSON.stringify(o) });
  },
  stats: async () => (await (await fetch(`${STUB}/__stats`)).json()) as { bySymbol: Record<string, number>;
    toss: { paths: Record<string, number>; authPresent: boolean[] } },
};
const T = '2026-09-30T00:00:00.000Z';
const kr = (ticker: string) => ({ instrument: { kind: 'listing', assetClass: 'KR', ticker, name: `KR ${ticker}`, market: 'KOSPI', productType: 'stock' },
  quantity: 1, averagePrice: 100, currency: 'KRW', editedAt: T });
const us = (ticker: string) => ({ instrument: { kind: 'listing', assetClass: 'US', ticker, name: `US ${ticker}`, market: 'NASDAQ', productType: 'stock' },
  quantity: 1, averagePrice: 100, currency: 'USD', editedAt: T });
const ALLOWED = ['POST /oauth2/token', 'GET /api/v1/accounts', 'GET /api/v1/holdings', 'GET /api/v1/candles'];
const SECRETS = [FAKE.secret, FAKE.token, FAKE.seq, FAKE.accountNo, FAKE.id];

// Everything the browser sent or received on this page, to check no secret ever reaches it (SC-003).
function traffic(page: Page) {
  const seen: string[] = [];
  page.on('request', (r) => { seen.push(r.url(), JSON.stringify(r.headers()), r.postData() ?? ''); });
  page.on('response', async (r) => { try { seen.push(await r.text()); } catch { /* redirects, aborted */ } });
  return seen;
}
async function seed(page: Page, holdings: unknown[], sources?: unknown) {
  await page.goto('/?provider=standin');
  await page.evaluate(([h, s, at]) => {
    localStorage.setItem('bta.portfolio', JSON.stringify({ version: 1, onboardedAt: at, holdings: h }));
    if (s) localStorage.setItem('bta.sources', JSON.stringify(s)); else localStorage.removeItem('bta.sources');
  }, [holdings, sources, T] as const);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const w = window as unknown as { __records: unknown[] };
    w.__records = [];
    document.getElementById('run')!.addEventListener('bta-done', (e) => w.__records.push((e as CustomEvent).detail));
  });
}
type Rec = { outcome: string; dataSource: Record<string, unknown>; analysis: { holding: string; facts: { id: string; kind: string; text: string }[] } };
const records = (page: Page) => page.evaluate(() => (window as unknown as { __records: Rec[] }).__records);
async function analyseOne(page: Page, id: string) {
  if (!(await page.getByRole('dialog', { name: '포트폴리오' }).isVisible())) await page.getByRole('button', { name: '포트폴리오' }).click();
  await page.locator(`[data-holding="${id}"]`).getByRole('button', { name: '이 종목 분석' }).click();
  await expect(page.getByRole('dialog', { name: '답변' })).toBeVisible({ timeout: 60_000 });
  return (await records(page)).at(-1)!;
}

test('T012 US1/SC-001: import from Toss — preview, skipped with reasons, confirm replaces the portfolio; analysis works', async ({ page }) => {
  await stub.use({ name: 'valid' });
  const seen = traffic(page);
  await seed(page, [us('MSFT')]);
  await page.getByRole('button', { name: '포트폴리오' }).click();
  const w = page.getByRole('dialog', { name: '포트폴리오' });
  await w.getByRole('radio', { name: '토스증권' }).first().check();
  await w.getByRole('button', { name: '토스에서 가져오기' }).click();
  const preview = w.locator('[data-toss-preview]');
  await expect(preview).toContainText('가져올 종목 2개');
  await expect(preview.locator('[data-skipped] li')).toHaveText(['제외: 목록에없는테스트 — 목록에 없는 종목', '제외: Japan Test KK — 지원하지 않는 자산']);
  await preview.getByRole('button', { name: '가져오기' }).click();
  await expect(w.locator('[data-holding]')).toHaveCount(2);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bta.portfolio')!).holdings);
  expect(stored.map((h: { instrument: { ticker: string }; quantity: number; averagePrice: number; currency: string }) =>
    [h.instrument.ticker, h.quantity, h.averagePrice, h.currency])).toEqual([['900001', 10, 70000, 'KRW'], ['ZZAP', 2.5, 180.123456, 'USD']]);
  const r = await analyseOne(page, 'KR:900001'); // the imported holding runs like a typed-in one (Feature 014 quotes)
  expect(r.outcome).toBe('success');
  expect(r.dataSource).toMatchObject({ mode: 'portfolio-live', symbol: '900001.KS', provider: 'yahoo-chart@1' });
  const s = await stub.stats();
  expect(Object.keys(s.toss.paths).every((p) => ALLOWED.includes(p))).toBe(true);
  expect(s.toss.paths['GET /api/v1/holdings']).toBe(1);
  for (const secret of SECRETS) expect(seen.join('\n'), secret).not.toContain(secret);
});

test('T012 US1/SC-005: a failed import shows an actionable reason and leaves the portfolio byte-identical', async ({ page }) => {
  for (const [toss, reason] of [['forbidden-ip', '등록된 IP가 아닙니다'], ['unauthorized', '토스증권 인증에 실패했습니다'], ['several-accounts', '계좌가 여러 개입니다']] as const) {
    await stub.use({ name: 'valid', toss });
    await seed(page, [us('MSFT')], { holdings: 'toss', quotes: 'yahoo' });
    const before = await page.evaluate(() => localStorage.getItem('bta.portfolio'));
    await page.getByRole('button', { name: '포트폴리오' }).click();
    const w = page.getByRole('dialog', { name: '포트폴리오' });
    await w.getByRole('button', { name: '토스에서 가져오기' }).click();
    await expect(w.locator('[data-toss-error]'), toss).toContainText(reason);
    await expect(w.locator('[data-toss-preview]')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('bta.portfolio'))).toBe(before);
  }
});

// The facts computed independently from the Toss stand-in's candles: the last 300 sessions, as reported (A-015-1).
function expected(currency: 'KRW' | 'USD', timeZone: string) {
  const n = HISTORY.length, rows = HISTORY.slice(-300);
  const end = new Date();
  const dates = sessionDates(addDays(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(end), -1), n).slice(-300); // the stand-in's end date
  const close = rows.at(-1)!.close, chg = (close / rows.at(-21)!.close - 1) * 100, sma = rows.slice(-50).reduce((a, s) => a + s.close, 0) / 50;
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone }).format(end).split('-');
  const year = rows.filter((_, i) => dates[i] > `${Number(y) - 1}-${m}-${d}`);
  return [`The price ${chg >= 0 ? 'rose' : 'fell'} ${Math.abs(chg).toFixed(1)}% over the last 20 sessions.`,
    `The price is ${close >= sma ? 'above' : 'below'} its 50-day moving average of ${money(sma, currency)}.`,
    `The 52-week high is ${money(Math.max(...year.map((s) => s.high)), currency)} and the 52-week low is ${money(Math.min(...year.map((s) => s.low)), currency)}.`];
}

test('T018 US2/SC-002: Toss selected for quotes — facts from the Toss candles, line says 토스증권; no Yahoo request', async ({ page }) => {
  await stub.use({ name: 'valid' });
  const seen = traffic(page);
  await seed(page, [kr('900001'), us('ZZAP')], { holdings: 'manual', quotes: 'toss' });
  for (const [id, symbol, currency, zone] of [['KR:900001', '900001.KS', 'KRW', 'Asia/Seoul'], ['US:ZZAP', 'ZZAP', 'USD', 'America/New_York']] as const) {
    const r = await analyseOne(page, id);
    expect(r.dataSource).toMatchObject({ mode: 'portfolio-live', provider: 'toss-candles@1', symbol });
    expect(r.analysis.facts.filter((f) => f.kind === 'market').map((f) => f.text)).toEqual(expected(currency, zone));
    await expect(page.getByRole('dialog', { name: '답변' }).locator('[data-source="live"]')).toContainText('(토스증권)');
    await page.keyboard.press('Escape');
  }
  expect((await stub.stats()).bySymbol).toEqual({}); // Yahoo never asked
  // T019/SC-003: no secret, token or account data in traffic, records or the page; only allowlisted Toss paths.
  const evidence = JSON.stringify(await records(page)) + (await page.content());
  for (const secret of SECRETS) { expect(seen.join('\n'), secret).not.toContain(secret); expect(evidence, secret).not.toContain(secret); }
  expect(Object.keys((await stub.stats()).toss.paths).every((p) => ALLOWED.includes(p))).toBe(true);
});

test('T018 US2/FR-010: a Toss quote with too little history → 시세 없음, no fallback to Yahoo', async ({ page }) => {
  await stub.use({ name: 'valid', toss: 'short-history' });
  await seed(page, [kr('900006')], { holdings: 'manual', quotes: 'toss' });
  const r = await analyseOne(page, 'KR:900006');
  expect(r.dataSource).toEqual({ mode: 'portfolio-live', symbol: '900006.KS', unavailable: 'unavailable' });
  await expect(page.getByRole('dialog', { name: '답변' }).locator('[data-source="unavailable"]')).toBeVisible();
  expect((await stub.stats()).bySymbol).toEqual({});
});

test('T020 US3/SC-004: without a local Toss provider no Toss option is usable and no Toss request is made', async ({ page }) => {
  await stub.use({ name: 'valid' });
  await page.route('**/api/toss/status', (r) => r.fulfill({ json: { available: false, reason: '토스증권 연동이 설정되지 않았습니다.' } }));
  await seed(page, [us('AMZN')]);
  await page.getByRole('button', { name: '포트폴리오' }).click();
  const w = page.getByRole('dialog', { name: '포트폴리오' });
  for (const radio of await w.getByRole('radio', { name: '토스증권' }).all()) await expect(radio).toBeDisabled();
  await expect(w.locator('[data-toss-reason]')).toContainText('설정되지 않았습니다');
  await expect(w.getByRole('button', { name: '토스에서 가져오기' })).toHaveCount(0);
  await analyseOne(page, 'US:AMZN');
  expect((await stub.stats()).toss.paths).toEqual({});
});

// Feature 015 T023 (opt-in; BTA_REAL_TOSS=1 with BTA_REAL_YAHOO=1, maintainer approval): the maintainer's own key and
// IP, the real directory. Import: counts and skip reasons only — no names, codes, quantities or prices of the account.
// Quotes: public tickers (005930, AAPL) through Toss, written to test-results for an independent recomputation.
test('real Toss L7: import counts and Toss quotes (BTA_REAL_TOSS=1 only)', async ({ page }, testInfo) => {
  test.skip(process.env.BTA_REAL_TOSS !== '1', 'approval-gated real Toss run only (BTA_REAL_TOSS=1)');
  test.setTimeout(5 * 60_000);
  await seed(page, [], { holdings: 'toss', quotes: 'toss' });
  await page.getByRole('button', { name: '포트폴리오' }).click();
  const w = page.getByRole('dialog', { name: '포트폴리오' });
  await w.getByRole('button', { name: '토스에서 가져오기' }).click({ timeout: 120_000 }); // enabled once the directory is loaded
  await expect(w.locator('[data-toss-preview], [data-toss-error]')).toBeVisible({ timeout: 60_000 });
  const error = (await w.locator('[data-toss-error]').count()) ? await w.locator('[data-toss-error]').textContent() : null;
  const imported = await w.locator('[data-toss-preview] > ul:not([data-skipped]) li').count();
  const reasons = (await w.locator('[data-skipped] li').allTextContents()).map((t) => t.split(' — ').at(-1));
  await page.keyboard.press('Escape');
  await seed(page, [kr('005930'), us('AAPL')], { holdings: 'manual', quotes: 'toss' });
  const quotes = [];
  for (const id of ['KR:005930', 'US:AAPL']) {
    const r = await analyseOne(page, id);
    quotes.push({ id, dataSource: r.dataSource, facts: r.analysis.facts.filter((f) => f.id === 'D1' || f.kind === 'market').map((f) => f.text) });
    await page.keyboard.press('Escape');
  }
  const out = { level: 'L7', executedAt: new Date().toISOString(), import: { error, imported,
    skipped: Object.fromEntries([...new Set(reasons)].map((x) => [x, reasons.filter((y) => y === x).length])) }, quotes };
  writeFileSync(testInfo.outputPath('real-toss-l7.json'), JSON.stringify(out, null, 2) + '\n');
  console.log('Feature 015 L7', JSON.stringify(out));
});
