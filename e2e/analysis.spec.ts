// Feature 010 (BROWSER_AUTOMATED, stand-in): portfolio runs through the shell — one holding per run on the committed
// fictional facts (MD-8), no network request during a run, the Feature 004 lifecycle per run.
import { expect, test, type Page } from '@playwright/test';
import { loadExample } from './measure.ts';

const evidence = async (page: Page) => JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
const done = (page: Page) => expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });

// Analyse one holding from the 포트폴리오 window and return the record; counts non-asset requests meanwhile.
export async function analyse(page: Page, id: string) {
  const requests: string[] = [];
  const on = (r: { url(): string }) => { const p = new URL(r.url()).pathname; if (!p.startsWith('/_next/') && !p.startsWith('/office/') && !p.startsWith('/fonts/')) requests.push(p); };
  if (await page.getByRole('dialog', { name: '답변' }).isVisible()) await page.keyboard.press('Escape'); // opened by the last run
  if (!(await page.getByRole('dialog', { name: '포트폴리오' }).isVisible())) await page.getByRole('button', { name: '포트폴리오' }).click();
  page.on('request', on);
  await page.locator(`[data-holding="${id}"]`).getByRole('button', { name: '이 종목 분석' }).click();
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'running');
  await done(page);
  page.off('request', on);
  return { record: await evidence(page), requests };
}

test('T010 US2: each asset class runs on its facts — 8/0, settled, 0 requests during the run', async ({ page }) => {
  await loadExample(page);
  for (const id of ['BTC', 'KRX-GOLD', 'KR:900001', 'US:ZZSP']) {
    const { record: r, requests } = await analyse(page, id);
    expect(r.outcome, id).toBe('success');
    expect(r.dataSource).toEqual({ mode: 'portfolio-fixture', fixture: 'portfolio-fixture@1' });
    expect(r.analysis.holding).toBe(id);
    expect(r.analysis.factSetId).toBe(`portfolio-fixture@1:${id}`);
    expect(r.analysis.facts.map((f: { id: string }) => f.id)).toEqual(expect.arrayContaining(['H1', 'H2', 'H3', 'D1', 'D2', 'D3', 'M1', 'N1']));
    expect(r.analysis).not.toHaveProperty('knownTickers');
    expect(r.counts).toMatchObject({ graphRuns: 1, nodeExecutions: 8, logicalRequests: 8, fallbackRequests: 0 });
    expect(r.lifecycle.settledBeforeShutdown).toBe(true);
    expect(r.nodes.finalDecisionMaker.reads).toEqual(expect.arrayContaining(['holdingFacts', 'question']));
    expect(r.result.finalDecision).toContain('Answer the user\'s question in Korean'); // the stand-in echoes its prompt
    expect(requests, id).toEqual([]); // FR-024: nothing leaves the browser during a portfolio run
  }
});

test('T010 US2 FR-006: a holding without fixture facts → "Market data not available", no derived facts', async ({ page }) => {
  await page.goto('/?provider=standin&quotes=fixture');
  await page.evaluate(() => localStorage.setItem('bta.portfolio', JSON.stringify({ version: 1, onboardedAt: '2026-09-29T00:00:00.000Z', holdings: [
    { instrument: { kind: 'listing', assetClass: 'KR', ticker: '005930', name: '삼성전자', market: 'KOSPI', productType: 'stock' },
      quantity: 3, averagePrice: 70000, currency: 'KRW', editedAt: '2026-09-29T00:00:00.000Z' }] })));
  await page.reload();
  const { record: r } = await analyse(page, 'KR:005930');
  expect(r.outcome).toBe('success');
  expect(r.analysis.facts.filter((f: { kind: string }) => f.kind === 'derived')).toEqual([]);
  expect(r.analysis.facts.find((f: { kind: string }) => f.kind === 'market').text).toBe('Market data not available (시장 데이터 없음).');
});

test('T016 US5/SC-003: a fabricated number in the answer is marked; supported ones are not; counts in the window and the dialog box', async ({ page }) => {
  await loadExample(page);
  // Test-side stand-in wrapper (as Feature 008 failRole): the final role answers with one fabricated price.
  await page.evaluate(() => {
    const LM = (window as unknown as { LanguageModel: { create: (...a: unknown[]) => Promise<{ clone: (o: unknown) => Promise<{ prompt: (i: unknown, o: unknown) => Promise<string> }> }> } }).LanguageModel;
    const create = LM.create.bind(LM);
    LM.create = async (...a) => {
      const base = await create(...a);
      const clone = base.clone.bind(base);
      base.clone = async (o) => {
        const s = await clone(o);
        return { ...s, prompt: (i: unknown, opts: unknown) => JSON.stringify(i).includes('You are the Final Decision.')
          ? Promise.resolve('삼성테스트전자는 평단 71,000원 대비 -8.00% 손실이며 목표가는 99,000원입니다.') : s.prompt(i, opts) };
      };
      return base;
    };
  });
  const { record: r } = await analyse(page, 'KR:900001');
  expect(r.analysis.grounding.counts).toEqual({ supported: 2, unsupported: 1, unrecognised: 0 });
  expect(r.analysis.answerLanguage).toBe('ko');
  const w = page.getByRole('dialog', { name: '답변' });
  await expect(w).toBeVisible();
  await expect(w.locator('mark[data-claim="unsupported"]')).toHaveCount(1);
  await expect(w.locator('mark[data-claim="unsupported"]')).toHaveText('99,000원 [근거 확인 안 됨]');
  await expect(w.locator('[data-answer]')).toContainText('71,000원 대비 -8.00% 손실');
  await expect(w.locator('[data-grounding-counts]')).toContainText('근거 확인 안 됨 1건');
  await expect(w.getByText('연구용이며 투자 조언이 아닙니다. 실제 주문은 하지 않습니다.', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-office-grounding]')).toHaveText('근거 확인 안 됨 1건');
});

// ---- Feature 013 T016: number modes ----
const finalAnswer = (page: Page, answer: string) => page.evaluate((answer) => {
  const LM = (window as unknown as { LanguageModel: { create: (...a: unknown[]) => Promise<{ clone: (o: unknown) => Promise<{ prompt: (i: unknown, o: unknown) => Promise<string> }> }> } }).LanguageModel;
  const create = LM.create.bind(LM);
  LM.create = async (...a) => {
    const base = await create(...a);
    const clone = base.clone.bind(base);
    base.clone = async (o) => {
      const s = await clone(o);
      return { ...s, prompt: (i: unknown, opts: unknown) => JSON.stringify(i).includes('You are the Final Decision.') ? Promise.resolve(answer) : s.prompt(i, opts) };
    };
    return base;
  };
}, answer);

test('Feature 013 T016 US2/SC-003: refs — references rendered by code with sources; every violation kind flagged', async ({ page }) => {
  await loadExample(page, '/?provider=standin&numbers=refs');
  await finalAnswer(page, '평균 매입가 {H3} 대비 {D2} 하락했고 현재 가치는 {D3}입니다. 목표가는 {D9}, 손실률은 D2, 가격은 9억 원입니다.');
  const { record: r } = await analyse(page, 'BTC');
  const n = r.analysis.numbers;
  expect(n.mode).toBe('refs');
  expect(n.rendered).toBe('평균 매입가 9,500만 원 대비 -3.95% 하락했고 현재 가치는 2,281만 2,500원입니다. 목표가는 {D9}, 손실률은 D2, 가격은 9억 원입니다.');
  expect(n.refs.map((x: { name: string }) => x.name)).toEqual(['H3', 'D2', 'D3']);
  expect(n.violations.map((v: { kind: string }) => v.kind)).toEqual(['unknown-reference', 'unbraced-reference', 'bare-number']);
  // SC-003 (stand-in side): every number shown is a fact value or flagged
  expect(r.analysis.grounding.counts.unsupported).toBe(1); // 9억 원, also a violation
  expect(r.result.finalDecision).toContain('{H3}'); // the raw model output is kept
  const w = page.getByRole('dialog', { name: '답변' });
  await expect(w.locator('mark[data-ref="H3"]')).toHaveText('9,500만 원 [H3]');
  await expect(w.locator('mark[data-violation]')).toHaveCount(3);
  await expect(w.locator('[data-grounding-counts]')).toContainText('형식 위반 3건');
});

test('Feature 013 T016: formatted — Korean readings in the final role\'s facts; the answer is checked as usual; current records only its mode', async ({ page }) => {
  await loadExample(page, '/?provider=standin&numbers=formatted');
  const { record: r } = await analyse(page, 'BTC');
  expect(r.outcome).toBe('success');
  expect(r.analysis.numbers).toEqual({ mode: 'formatted' });
  expect(r.result.finalDecision).toContain('95,000,000 KRW (9,500만 원)'); // the stand-in echoes the final prompt
  await page.goto('/?provider=standin&quotes=fixture');
  const { record: c } = await analyse(page, 'BTC');
  expect(c.analysis.numbers).toEqual({ mode: 'current' });
  expect(c.result.finalDecision).not.toContain('(9,500만 원)');
});

// ---- US1: questions ----
async function ask(page: Page, text: string) {
  if (await page.getByRole('dialog', { name: '답변' }).isVisible()) await page.keyboard.press('Escape');
  if (await page.getByRole('dialog', { name: '포트폴리오' }).isVisible()) await page.keyboard.press('Escape');
  await page.getByLabel('질문').fill(text);
  await page.getByRole('button', { name: '질문하기' }).click();
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- evidence records are checked field by field
type Rec = any;
const records = (page: Page): Promise<Rec[]> => page.evaluate(() => (window as unknown as { __records: unknown[] }).__records);
async function collect(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __records: unknown[] };
    w.__records = [];
    document.getElementById('run')!.addEventListener('bta-done', (e) => w.__records.push((e as CustomEvent).detail));
  });
}
// Test-side stand-in wrapper: a prompt containing every string in `when` is rejected with `error`.
const wrapPrompts = (page: Page, rules: { when: string[]; error: [string, string] }[]) => page.evaluate((rules) => {
  const LM = (window as unknown as { LanguageModel: { create: (...a: unknown[]) => Promise<{ clone: (o: unknown) => Promise<{ prompt: (i: unknown, o: unknown) => Promise<string> }> }> } }).LanguageModel;
  const create = LM.create.bind(LM);
  LM.create = async (...a) => {
    const base = await create(...a);
    const clone = base.clone.bind(base);
    base.clone = async (o) => {
      const s = await clone(o);
      return { ...s, prompt: (i: unknown, opts: unknown) => {
        const text = JSON.stringify(i);
        const rule = rules.find((r) => r.when.every((w) => text.includes(w)));
        return rule ? Promise.reject(rule.error[0] === 'Error' ? new Error(rule.error[1]) : new DOMException(rule.error[1], rule.error[0])) : s.prompt(i, opts);
      } };
    };
    return base;
  };
}, rules);

test('T020 US1/SC-001: every single-holding question analyses exactly its holding and shows the answer with its facts', async ({ page }) => {
  test.setTimeout(120_000);
  const { questions } = JSON.parse(await (await import('node:fs/promises')).readFile('test/fixtures/grounding/questions.json', 'utf8')) as
    { questions: { id: string; text: string; kind: string; expect: string[] }[] };
  await loadExample(page);
  await collect(page);
  const singles = questions.filter((q) => q.kind !== 'multi');
  for (const q of singles) {
    await ask(page, q.text);
    const w = page.getByRole('dialog', { name: '답변' });
    await expect(w, q.id).toBeVisible({ timeout: 30_000 });
    await expect(w.locator('[data-answer-for]'), q.id).toHaveCount(1);
    await expect(w.locator('[data-answer-for]')).toHaveAttribute('data-answer-for', q.expect[0]);
    await expect(w.locator('[data-answer]')).not.toBeEmpty();
    await expect(w.getByText(/모델에 준 사실 \d+개/)).toBeVisible();
  }
  const rs = await records(page);
  expect(rs.map((r: { analysis: { holding: string } }) => r.analysis.holding)).toEqual(singles.map((q) => q.expect[0]));
  expect(rs.every((r: { outcome: string }) => r.outcome === 'success')).toBe(true);
});

test('T020 US1: not held → no run; no name → picker, nothing runs until chosen; Cancel → cancelled, lifecycle intact', async ({ page }) => {
  await loadExample(page);
  await collect(page);
  await expect.poll(() => page.evaluate(async () => !!(await (await caches.open('bta-directory')).match('/api/directory')))).toBe(true);
  await ask(page, '한빛가상화학 전망은 어떤가요?');
  await expect(page.locator('[data-ask-notice]')).toHaveText('보유하지 않은 종목입니다: 한빛가상화학');
  await ask(page, '요즘 시장 분위기 어때요?');
  const picker = page.getByRole('dialog', { name: '종목 선택' });
  await expect(picker).toBeVisible();
  expect(await records(page)).toEqual([]);
  await picker.getByLabel('비트코인').check();
  await picker.getByRole('button', { name: '분석' }).click();
  await expect(page.getByRole('dialog', { name: '답변' }).locator('[data-answer-for]')).toHaveAttribute('data-answer-for', 'BTC');
  // Cancel during a run
  await page.evaluate(() => (window as unknown as { __standin: { hold(): void } }).__standin.hold());
  await ask(page, '삼성테스트전자 괜찮나요?');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'running');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await done(page);
  await page.evaluate(() => (window as unknown as { __standin: { resume(): void } }).__standin.resume());
  const last = (await records(page)).at(-1) as { outcome: string; lifecycle: { settledBeforeShutdown: boolean; snapshotBeforeShutdown: unknown } };
  expect(last.outcome).toBe('cancelled');
  expect(last.lifecycle.settledBeforeShutdown).toBe(true);
  expect(last.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  await expect(page.getByRole('dialog', { name: '답변' }).locator('[data-answer]')).toHaveCount(0); // no answer recorded
});

// ---- US3: overview ----
test('T028 US3/SC-004: overview of 6 in order; cancel during run 3 → 2 answered, 1 cancelled, rest not run', async ({ page }) => {
  await loadExample(page);
  await collect(page);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { let n = 0; document.getElementById('run')!.addEventListener('bta-analyze', () => {
    if (++n === 3) (window as unknown as { __standin: { hold(): void } }).__standin.hold(); }); });
  await page.getByRole('button', { name: '전체 점검' }).click();
  await expect(page.locator('[data-analysing]')).toContainText('(3 / 6)');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'running');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog', { name: '답변' })).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => (window as unknown as { __standin: { resume(): void } }).__standin.resume());
  const rs = (await records(page)) as { outcome: string; analysis: { holding: string }; lifecycle: { settledBeforeShutdown: boolean }; timing: { runtimeCreateMs: number; shutdownMs: number } }[];
  expect(rs.map((r) => [r.analysis.holding, r.outcome])).toEqual([['BTC', 'success'], ['KRX-GOLD', 'success'], ['KR:900001', 'cancelled']]);
  for (const r of rs) {
    expect(r.lifecycle.settledBeforeShutdown).toBe(true);
    expect(r.timing.runtimeCreateMs).toBeGreaterThanOrEqual(0);
    expect(r.timing.shutdownMs).toBeGreaterThanOrEqual(0);
  }
  const w = page.getByRole('dialog', { name: '답변' });
  await expect(w.locator('[data-summary-row]')).toHaveCount(3);
  await expect(w.locator('[data-cancel-ms]')).toBeVisible();
  console.log('T027 AkariSP observations', JSON.stringify({ perRun: rs.map((r) => r.timing), cancelMs: await w.locator('[data-cancel-ms]').getAttribute('data-cancel-ms') }));
});

test('T028 US3 FR-013 / Edge: a failing holding does not stop the overview; a context-length error is recorded typed', async ({ page }) => {
  await loadExample(page);
  await collect(page);
  await page.keyboard.press('Escape');
  await wrapPrompts(page, [
    { when: ['Holding: 테스트바이오 (900006)'], error: ['Error', 'injected holding failure'] },
    { when: ['You are the Final Decision.', 'Holding: Zeta Apple Test Inc.'], error: ['QuotaExceededError', 'The input is too large.'] },
  ]);
  await page.getByRole('button', { name: '전체 점검' }).click();
  await expect(page.getByRole('dialog', { name: '답변' })).toBeVisible({ timeout: 60_000 });
  const rs = (await records(page)) as { outcome: string; error: string; failure?: { kind: string }; analysis: { holding: string } }[];
  expect(rs.map((r) => [r.analysis.holding, r.outcome])).toEqual([['BTC', 'success'], ['KRX-GOLD', 'success'], ['KR:900001', 'success'],
    ['KR:900006', 'failed'], ['US:ZZSP', 'success'], ['US:ZZAP', 'failed']]);
  const ctx = rs[5];
  expect(ctx.failure?.kind).toBe('model');
  expect(ctx.error).toContain('QuotaExceededError'); // AkariSP folds it into TaskError('failed'); the cause is kept
  const w = page.getByRole('dialog', { name: '답변' });
  await expect(w.locator('[data-summary-row="KR:900006"]')).toHaveAttribute('data-outcome', 'failed');
});

// ---- US4: paper-trade ledger ----
test('T032 US4/SC-009: record a paper trade after a run; it survives reload, is labelled simulated, deletable; portfolio unchanged', async ({ page }) => {
  await loadExample(page);
  const portfolioBefore = await page.evaluate(() => localStorage.getItem('bta.portfolio'));
  await ask(page, '삼성테스트전자 괜찮나요?');
  const w = page.getByRole('dialog', { name: '답변' });
  await w.getByRole('button', { name: '모의 거래로 기록' }).click();
  const l = page.getByRole('dialog', { name: '모의 거래' });
  await expect(l.getByText('기준 가격 65,320 KRW (예시 데이터 최신가)')).toBeVisible();
  await l.getByLabel('행동').selectOption('buy');
  await l.getByLabel('수량').fill('0');
  await l.getByRole('button', { name: '기록' }).click();
  await expect(l.locator('[data-ledger]').getByRole('alert')).toHaveText('매수·매도 수량은 0보다 커야 합니다.');
  await l.getByLabel('수량').fill('3');
  await l.getByRole('button', { name: '기록' }).click();
  await expect(l.locator('[data-trade]')).toHaveCount(1);
  await expect(l.locator('[data-trade]')).toContainText('[모의 거래 (실제 주문 아님)]');
  await expect(l.locator('[data-trade]')).toContainText('삼성테스트전자 · 모의 매수 3');
  expect(await page.evaluate(() => localStorage.getItem('bta.portfolio'))).toBe(portfolioBefore); // never changes holdings
  await page.reload();
  await page.getByRole('button', { name: '모의 거래' }).click();
  await expect(page.getByRole('dialog', { name: '모의 거래' }).locator('[data-trade]')).toHaveCount(1);
  await expect(page.getByRole('dialog', { name: '모의 거래' }).getByText('모의 거래 (실제 주문 아님) — 기록만 남기며 어떤 주문도 보내지 않습니다.')).toBeVisible();
  await page.getByRole('dialog', { name: '모의 거래' }).getByRole('button', { name: '삭제' }).click();
  await expect(page.getByRole('dialog', { name: '모의 거래' }).locator('[data-trade]')).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('bta.ledger')))!).entries).toEqual([]);
});

// ---- FR-024 / SC-005: privacy sentinel ----
test('T033 SC-005: holding values, the question, the answer and the ledger never leave the browser', async ({ page }) => {
  const seen: string[] = [];
  page.on('request', (r) => seen.push(`${r.url()} ${JSON.stringify(r.headers())} ${r.postData() ?? ''}`));
  page.on('console', (m) => seen.push(m.text()));
  await page.goto('/?provider=standin&quotes=fixture');
  await page.evaluate(() => localStorage.setItem('bta.portfolio', JSON.stringify({ version: 1, onboardedAt: '2026-09-29T00:00:00.000Z', holdings: [
    { instrument: { kind: 'fixed', id: 'BTC' }, quantity: 0.77777777, averagePrice: 42424242, currency: 'KRW', editedAt: '2026-09-29T00:00:00.000Z' }] })));
  await page.reload();
  await ask(page, '비트코인 센티넬질문XYZ 괜찮나요?');
  const w = page.getByRole('dialog', { name: '답변' });
  await expect(w.locator('[data-answer]')).toBeVisible();
  const answer = (await w.locator('[data-answer]').textContent())!;
  await w.getByRole('button', { name: '모의 거래로 기록' }).click();
  await page.getByRole('dialog', { name: '모의 거래' }).getByRole('button', { name: '기록' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '전체 점검' }).click();
  await expect(page.getByRole('dialog', { name: '답변' })).toBeVisible();
  const sentinels = ['0.77777777', '77777777', '42424242', '42,424,242', '센티넬질문XYZ', answer.slice(0, 40)];
  expect(seen.length).toBeGreaterThan(3);
  for (const s of sentinels) expect(seen.filter((x) => x.includes(s)), s).toEqual([]);
});
