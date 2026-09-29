// BROWSER_AUTOMATED (stand-in): the canonical page (index.html → src/main.ts) running the TradingAgents
// graph in Playwright Chromium. Real LangGraph + AkariChatModel + akarisp in the browser bundle, where a
// node's model call does not inherit the graph's signal implicitly. Not Prompt API evidence. Role
// provenance is proven deterministically (test/trading-graph.test.ts), not here. Live-mode tests
// (Feature 007 L3) go through the app's /api/market to a local Yahoo stand-in with synthetic data; every
// non-local browser request is aborted, so no test reaches the real network.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page, type Request } from '@playwright/test';
import { REAL_YAHOO, realYahooEvidence } from './real-yahoo.ts';

const ROLES = ['marketAnalyst', 'newsAnalyst', 'bullResearcher', 'bearResearcher', 'researchManager', 'trader',
  'riskReviewer', 'finalDecisionMaker'];
const AFTER_ANALYSTS = ROLES.slice(2);

const done = (page: Page) =>
  expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });
const evidence = async (page: Page) => JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
const runButton = (page: Page) => page.getByRole('button', { name: 'Run Graph', exact: true });
const installed = (pkg: string) =>
  JSON.parse(readFileSync(`node_modules/${pkg}/package.json`, 'utf8')).version as string;
const standin = (page: Page, action: 'hold' | 'resume') =>
  page.evaluate((a) => (window as unknown as { __standin: Record<string, () => void> }).__standin[a](), action);

test('stand-in: full eight-role graph succeeds through LangGraph → AkariChatModel → AkariSP', async ({ page }, testInfo) => {
  const net = await guardNetwork(page);
  await page.goto('/?provider=standin');
  await expect(runButton(page)).toBeEnabled();
  await countCreates(page);
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
  expect(await creates(page)).toBe(1); // one click, one runtime
  // Build-time constants (next.config.ts compiler.define): raw values, never quoted.
  expect(r.revision.browserTradingAgents).toMatch(/^[0-9a-f]{40}(\+dirty)?$/);
  expect(r.revision.akarisp).toBe(installed('akarisp'));
  expect(r.revision.langchainCore).toBe(installed('@langchain/core'));
  expect(r.revision.langgraph).toBe(installed('@langchain/langgraph'));
  expect(r.evidenceClass).toBe('BROWSER_AUTOMATED');
  expect(r.provider).toBe('standin');
  expect(r.environment.availability).not.toBe('MODEL_AVAILABLE'); // describes the native API, not the stand-in
  expect(r.outcome).toBe('success');
  for (const n of ROLES) {
    expect(r.nodes[n], n).toMatchObject({ status: 'done', executions: 1, modelRequests: 1 });
    expect(Array.isArray(r.nodes[n].reads) && r.nodes[n].reads.length > 0, `${n}.reads`).toBe(true);
  }
  expect(r.counts.logicalRequests).toBe(8); // measured by the bridge
  expect(r.counts.nodeExecutions).toBe(8);
  expect(r.counts.fallbackRequests).toBe(0); // no fallback path; observed
  expect(r.counts.providerInvocations).toBe('NOT EXPOSED');
  // Measured after the bounded poll, not at bridge event #2; backpressure only, not native parallelism.
  expect(r.concurrency.akarisp.fanOutSnapshot.snapshot).toMatchObject({ state: 'ready', active: 1, queued: 1 });
  expect(r.concurrency.nativeProvider).toBe('not observed (out of scope)');
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  expect(r.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  expect(r.lifecycle.snapshotAfterShutdown).toEqual({ state: 'closed', active: 0, queued: 0 });
  expect(r.graph.version).toBe('tradingagents-fixture-graph@1');
  expect(r.fixture).toBe('tradingagents-fixture@1');
  expect(r.revision.langgraph).toBe('1.4.18');
  expect(r.runtimeOptions).toEqual({ limit: 1, queueCapacity: 32 });
  expect(typeof r.timing.graphMs).toBe('number');
  expect(r.result.finalDecision).toBeTruthy();
  await expect(page.locator('#result')).toHaveText(r.result.finalDecision);
  // Fixture mode is the Feature 004 path, labelled, with no market-data request of any kind.
  expect(r.dataSource).toEqual({ mode: 'fixture', fixture: 'tradingagents-fixture@1' });
  expect(r.input).toEqual({ id: 'tradingagents-fixture@1', news: 'tradingagents-fixture@1' });
  expect(r.result.finalDecision).toContain('Northwind Lamps Ltd. (fictional)');
  expect(r.result.finalDecision).toContain('news fact N1');
  expect(net.api).toHaveLength(0);
  expect(net.external).toEqual([]);
  // Routine runs never overwrite committed Feature evidence; copy this file there deliberately.
  writeFileSync(testInfo.outputPath('evidence.json'), JSON.stringify(r, null, 2) + '\n');
});

// Regression B in the browser: settlement must be observed on a `ready` runtime before shutdown().
test('stand-in: Cancel during the analysts → cancelled, AkariSP settles by itself before shutdown', async ({ page }) => {
  await page.goto('/?provider=standin');
  await expect(runButton(page)).toBeEnabled(); // stand-in installed
  await standin(page, 'hold');
  await runButton(page).click();
  const runtime = page.locator('#runtime');
  await expect(runtime).toHaveAttribute('data-active', '1');
  await expect(runtime).toHaveAttribute('data-queued', '1');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await done(page);
  await standin(page, 'resume');
  const r = await evidence(page);
  expect(r.evidenceClass).toBe('BROWSER_AUTOMATED');
  expect(r.outcome).toBe('cancelled');
  expect(r.result).toBeUndefined();
  for (const n of AFTER_ANALYSTS) expect(r.nodes[n].status, n).toBe('waiting');
  const ends = r.modelRequests.filter((e: { event: string }) => e.event !== 'start');
  expect(ends.map((e: { errorKind: string }) => e.errorKind)).toEqual(['cancelled', 'cancelled']);
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  expect(r.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  expect(r.lifecycle.snapshotAfterShutdown.state).toBe('closed');
});

test('native provider in Playwright Chromium: no model → BLOCKED, graph not run', async ({ page }) => {
  await page.goto('/');
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
  expect(r.provider).toBe('native');
  expect(r.environment.availability).not.toBe('MODEL_AVAILABLE');
  expect(r.evidenceClass).toBe('BLOCKED');
  expect(r.outcome).toBe('not-run');
  expect(r.blocked.reason).toContain(r.environment.availability);
  for (const n of ROLES) expect(r.nodes[n].status, n).toBe('waiting');
});

// createRuntime() creates the warm base session eagerly, so a LanguageModel.create failure surfaces
// there: the page must still finish with a failed record and a usable Run button.
test('stand-in: createRuntime failure → failed record, Run re-enabled', async ({ page }) => {
  await page.goto('/?provider=standin');
  await expect(runButton(page)).toBeEnabled();
  await page.evaluate(() => {
    (window as unknown as { LanguageModel: { create(): Promise<never> } }).LanguageModel.create =
      () => Promise.reject(new Error('create failed'));
  });
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
  expect(r.outcome).toBe('failed');
  expect(r.error).toContain('create failed');
  expect(r.result).toBeUndefined();
  await expect(runButton(page)).toBeEnabled();
});

// Each click owns a new runtime + model: run 1's runtime is closed, so run 2 can only succeed on a new
// one, and a shared model would report 16 logical requests.
test('stand-in: two consecutive runs are independent (new runtime and model per run)', async ({ page }) => {
  await page.goto('/?provider=standin');
  await runButton(page).click();
  await done(page);
  const first = await evidence(page);
  expect(first.outcome).toBe('success');
  expect(first.lifecycle.snapshotAfterShutdown.state).toBe('closed');
  await page.evaluate(() => { document.getElementById('evidence')!.textContent = ''; });
  await runButton(page).click();
  await expect(page.locator('#evidence')).not.toBeEmpty({ timeout: 60_000 });
  await done(page);
  const second = await evidence(page);
  expect(second.outcome).toBe('success');
  expect(second.counts.logicalRequests).toBe(8);
  expect(second.nodeEvents[0].seq).toBe(1);
  expect(second.nodeEvents.length).toBe(16); // 8 roles × (start, done) — this run only
  expect(second.lifecycle.settledBeforeShutdown).toBe(true);
  expect(second.lifecycle.snapshotAfterShutdown.state).toBe('closed');
});

// Only in the `chromium-dev` project (BTA_DEV_SMOKE=1, `next dev`): React Strict Mode runs effects
// twice in development; the entry module must still be evaluated once.
test('@dev stand-in + fixture under next dev (Strict Mode): one click = one runtime, one graph run', async ({ page }) => {
  await page.goto('/?provider=standin');
  await expect(runButton(page)).toBeEnabled();
  await countCreates(page);
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
  expect(await creates(page)).toBe(1);
  expect(r.counts.logicalRequests).toBe(8);
  expect(r.nodeEvents.length).toBe(16);
  for (const n of ROLES) expect(r.nodes[n].executions, n).toBe(1);
});

// ---------------------------------------------------------------------------------------------
// Feature 007 L3 — live mode through the app's own /api/market, which reaches the local Yahoo stand-in
// (e2e/market-stub.mjs via BTA_YAHOO_BASE_URL). The browser never contacts a provider; values are synthetic.

const STUB = `http://127.0.0.1:${Number(process.env.STUB_PORT ?? Number(process.env.HARNESS_PORT ?? 5174) + 24)}`;
const NEUTRAL = 'No company-specific news is supplied for this run';
const sha256 = (text: string) => `sha256:${createHash('sha256').update(text).digest('hex')}`;
type StubStats = { requests: number; lastPath: string | null; lastQuery: Record<string, string> | null; closedSockets: number };
const stub = {
  use: async (name: string, endDate?: string) => {
    await fetch(`${STUB}/__reset`, { method: 'POST' });
    await fetch(`${STUB}/__scenario`, { method: 'POST', body: JSON.stringify({ name, endDate }) });
  },
  stats: async (): Promise<StubStats> => (await fetch(`${STUB}/__stats`)).json(),
};
const todayET = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());

// Abort every non-local request (so no provider origin can be reached) and record them; record the
// browser's /api/market calls and any Authorization header it sends.
async function guardNetwork(page: Page) {
  const net = { external: [] as string[], api: [] as Request[], authorization: [] as string[] };
  await page.route((url) => url.hostname !== 'localhost', (route) => {
    net.external.push(route.request().url());
    return route.abort();
  });
  page.on('request', (r) => {
    if (new URL(r.url()).pathname === '/api/market') net.api.push(r);
    if (r.headers().authorization) net.authorization.push(r.url());
  });
  return net;
}
// Test-side instrumentation: count LanguageModel.create — AkariSP's createRuntime calls it eagerly.
const countCreates = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { LanguageModel: { create: (...a: unknown[]) => unknown }; __creates: number };
  const create = w.LanguageModel.create.bind(w.LanguageModel);
  w.__creates = 0;
  w.LanguageModel.create = (...a) => { w.__creates++; return create(...a); };
});
const creates = (page: Page) => page.evaluate(() => (window as unknown as { __creates: number }).__creates);

async function openLive(page: Page, url = '/?provider=standin&data=live') {
  await page.goto(url);
  await expect(runButton(page)).toBeEnabled();
  if (url.includes('provider=standin')) await countCreates(page);
}

test('stand-in + live via /api/market: eight roles, 8/0, provenance + digests, no values, no provider origin', async ({ page }, testInfo) => {
  await stub.use('valid');
  const net = await guardNetwork(page);
  await openLive(page);
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);

  // Network layers: the browser called only /api/market; the server made exactly one stub request.
  expect(net.api).toHaveLength(1);
  expect(net.api[0].method()).toBe('GET');
  expect(new URL(net.api[0].url()).search).toBe('?symbol=IBM');
  expect(net.external).toEqual([]);
  expect(net.authorization).toEqual([]);
  const s = await stub.stats();
  expect(s.requests).toBe(1);
  expect(s.lastPath).toBe('/v8/finance/chart/IBM');
  expect(s.lastQuery).toMatchObject({ interval: '1d', includePrePost: 'false', events: 'div,splits' });

  expect(r.evidenceClass).toBe('BROWSER_AUTOMATED');
  expect(r.provider).toBe('standin');
  expect(r.outcome).toBe('success');
  expect(r.failure).toBeUndefined();
  for (const n of ROLES) expect(r.nodes[n], n).toMatchObject({ status: 'done', executions: 1, modelRequests: 1 });
  expect(r.counts).toMatchObject({ logicalRequests: 8, fallbackRequests: 0, providerInvocations: 'NOT EXPOSED' });
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  expect(r.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  expect(r.lifecycle.snapshotAfterShutdown).toEqual({ state: 'closed', active: 0, queued: 0 });
  expect(await creates(page)).toBe(1);
  expect(r.input).toEqual({ id: 'live-market@2', news: 'neutral-news@1' });
  expect(r.fixture).toBeUndefined();
  expect(r.dataSource).toMatchObject({ mode: 'live', boundary: 'server', endpoint: '/api/market', symbol: 'IBM',
    provider: 'yahoo-chart@1', analysisDate: todayET(), sessions: 30 });
  expect(Object.keys(r.dataSource).sort()).toEqual(['acquiredAt', 'analysisDate', 'boundary', 'endpoint',
    'historySessions', 'marketAsOf', 'marketFactsDigest', 'mode', 'provider', 'receivedAt', 'sessions',
    'snapshotDigest', 'symbol', 'usedAt']);
  const { acquiredAt, receivedAt, usedAt } = r.dataSource;
  for (const t of [acquiredAt, receivedAt, usedAt]) expect(Date.parse(t)).not.toBeNaN();
  expect(Date.parse(acquiredAt)).toBeLessThanOrEqual(Date.parse(receivedAt));
  expect(Date.parse(receivedAt)).toBeLessThanOrEqual(Date.parse(usedAt));
  expect(typeof r.timing.acquisitionMs).toBe('number');

  // Replay: the validated bundle + its rendering + identities; the record carries identities only.
  const replayText = (await page.locator('#replay').textContent())!;
  const replay = JSON.parse(replayText);
  expect(Object.keys(replay)).toEqual(['bundle', 'marketFacts', 'snapshotDigest', 'marketFactsDigest']);
  expect(replay.bundle.marketAsOf).toBe(r.dataSource.marketAsOf);
  expect(replay.snapshotDigest).toBe(r.dataSource.snapshotDigest);
  expect(replay.marketFactsDigest).toBe(r.dataSource.marketFactsDigest);
  expect(sha256(JSON.stringify(replay.bundle))).toBe(replay.snapshotDigest);
  expect(sha256(replay.marketFacts)).toBe(replay.marketFactsDigest);
  expect(JSON.parse((await page.locator('#market').textContent())!)).toEqual(replay.bundle);
  const values = [replay.bundle.latest.close, replay.bundle.indicators.rsi, replay.bundle.indicators.close_50_sma]
    .map((v: number) => v.toFixed(2));
  const text = (await page.locator('#evidence').textContent())!;
  for (const leak of [...values, 'market fact L', 'stand-in reply', 'Authorization', 'Bearer', 'yahoo.com']) {
    expect(text, leak).not.toContain(leak);
  }
  for (const [field, v] of Object.entries(r.result)) {
    expect(v, field).toEqual({ present: true, length: expect.any(Number) });
  }

  // Market-provider credentials (Feature 005's key field is retired): no key/password input, nothing in
  // browser storage, no Authorization header on any browser request (asserted above).
  expect(await page.locator('input[type=password], #key, #key-row').count()).toBe(0);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);

  // The Market Analyst read the rendered marketFacts; news stayed the neutral fixture.
  const shown = (await page.locator('#result').textContent())!;
  expect(shown).toContain('International Business Machines Corp. (IBM)');
  expect(shown).toContain(NEUTRAL);
  expect(shown).not.toContain('Northwind');
  // Routine runs never overwrite committed Feature evidence; copy this file there deliberately.
  writeFileSync(testInfo.outputPath('evidence.json'), JSON.stringify(r, null, 2) + '\n');
});

// Every contract row the stub can produce. Stale uses a report 11 days old.
const FAILURES: [string, string, string, string?][] = [
  ['network', 'acquisition', 'network'],
  ['unauthorized', 'acquisition', 'unauthorized'],
  ['forbidden', 'acquisition', 'unauthorized'],
  ['rate-limited', 'acquisition', 'rate-limited'],
  ['server-error', 'acquisition', 'provider-error'],
  ['chart-error', 'acquisition', 'provider-error'],
  ['non-json', 'normalization', 'invalid-data'],
  ['missing-adjclose', 'normalization', 'invalid-data'],
  ['historical-null', 'normalization', 'invalid-data'],
  ['length-mismatch', 'normalization', 'invalid-data'],
  ['duplicate-timestamp', 'normalization', 'invalid-data'],
  ['wrong-time-zone', 'normalization', 'invalid-data'],
  ['future-bar', 'normalization', 'invalid-data'],
  ['short', 'normalization', 'unavailable'],
  ['valid', 'normalization', 'unavailable', 'stale'],
];
for (const [name, stage, kind, label] of FAILURES) {
  test(`stand-in + live: ${label ?? name} → market-data ${stage}/${kind}; no runtime, no model request, no fixture`, async ({ page }) => {
    const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d);
    await stub.use(name, label === 'stale' ? ymd(new Date(Date.now() - 11 * 86_400_000)) : undefined);
    const net = await guardNetwork(page);
    await openLive(page);
    await runButton(page).click();
    await done(page);
    const r = await evidence(page);
    expect(r.outcome).toBe('failed');
    expect(r.failure).toEqual({ boundary: 'market-data', stage, kind });
    expect(await creates(page)).toBe(0);
    expect(r.counts.logicalRequests).toBe(0);
    expect(r.counts.graphRuns).toBe(0);
    expect(r.lifecycle).toBeNull();
    for (const n of ROLES) expect(r.nodes[n].status, n).toBe('waiting');
    expect(r.result).toBeUndefined();
    expect(r.fixture).toBeUndefined();
    expect(r.dataSource).toEqual({ mode: 'live', boundary: 'server', endpoint: '/api/market', symbol: 'IBM' });
    expect(net.api).toHaveLength(1);
    expect((await stub.stats()).requests).toBe(1); // no retry
    expect(net.external).toEqual([]);
    await expect(page.locator('#result')).toBeEmpty();
    await expect(page.locator('#replay')).toBeEmpty();
    await expect(page.locator('#market')).toBeEmpty();
    await expect(runButton(page)).toBeEnabled();
  });
}

test('stand-in + live: page limit (page clock +30 s) → market-data timeout, no runtime', async ({ page }) => {
  await stub.use('hang');
  await page.clock.install();
  const net = await guardNetwork(page);
  await openLive(page);
  await runButton(page).click();
  await expect.poll(async () => (await stub.stats()).requests).toBe(1);
  await page.clock.fastForward(30_000);
  await done(page);
  const r = await evidence(page);
  expect(r.failure).toEqual({ boundary: 'market-data', stage: 'acquisition', kind: 'timeout' });
  expect(await creates(page)).toBe(0);
  expect(r.counts.logicalRequests).toBe(0);
  expect(net.external).toEqual([]);
  await expect.poll(async () => (await stub.stats()).closedSockets).toBe(1); // the server stopped too
});

test('stand-in + live: Cancel during acquisition → cancelled; the abort reaches the provider stand-in; no runtime', async ({ page }) => {
  await stub.use('hang');
  const net = await guardNetwork(page);
  await openLive(page);
  await runButton(page).click();
  await expect.poll(async () => (await stub.stats()).requests).toBe(1);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await done(page);
  const r = await evidence(page);
  expect(r.outcome).toBe('cancelled');
  expect(r.failure).toEqual({ boundary: 'market-data', stage: 'acquisition', kind: 'cancelled' });
  expect(await creates(page)).toBe(0);
  expect(r.counts.logicalRequests).toBe(0);
  expect(r.lifecycle).toBeNull();
  expect(net.api).toHaveLength(1);
  // browser abort → /api/market request.signal → acquireYahoo → the stand-in sees its socket close
  await expect.poll(async () => (await stub.stats()).closedSockets).toBe(1);
});

test('stand-in + live: Cancel during the graph → inference cancelled, AkariSP settles before shutdown', async ({ page }) => {
  await stub.use('valid');
  await guardNetwork(page);
  await openLive(page);
  await standin(page, 'hold');
  await runButton(page).click();
  const runtime = page.locator('#runtime');
  await expect(runtime).toHaveAttribute('data-active', '1');
  await expect(runtime).toHaveAttribute('data-queued', '1');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await done(page);
  await standin(page, 'resume');
  const r = await evidence(page);
  expect(r.outcome).toBe('cancelled');
  expect(r.failure).toEqual({ boundary: 'inference', kind: 'cancelled' });
  expect(await creates(page)).toBe(1);
  const ends = r.modelRequests.filter((e: { event: string }) => e.event !== 'start');
  expect(ends.map((e: { errorKind: string }) => e.errorKind)).toEqual(['cancelled', 'cancelled']);
  for (const n of AFTER_ANALYSTS) expect(r.nodes[n].status, n).toBe('waiting');
  expect(r.result).toBeUndefined();
  expect(r.dataSource.snapshotDigest).toMatch(/^sha256:/); // acquisition succeeded before the graph
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  expect(r.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  expect(r.lifecycle.snapshotAfterShutdown).toEqual({ state: 'closed', active: 0, queued: 0 });
});

test('native + live in Playwright Chromium: BLOCKED before any market-data request', async ({ page }) => {
  await stub.use('valid');
  const net = await guardNetwork(page);
  await openLive(page, '/?data=live');
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
  expect(r.provider).toBe('native');
  expect(r.evidenceClass).toBe('BLOCKED');
  expect(r.outcome).toBe('not-run');
  expect(r.failure).toEqual({ boundary: 'inference', kind: 'native-unavailable' });
  expect(r.dataSource).toEqual({ mode: 'live' });
  expect(net.api).toHaveLength(0);
  expect((await stub.stats()).requests).toBe(0);
});

test('stand-in + live: two consecutive runs → two /api/market calls, two provider requests (no caching)', async ({ page }) => {
  await stub.use('valid');
  const net = await guardNetwork(page);
  await openLive(page);
  for (let i = 0; i < 2; i++) {
    await runButton(page).click();
    await done(page);
    expect((await evidence(page)).outcome).toBe('success');
  }
  expect(net.api).toHaveLength(2);
  expect((await stub.stats()).requests).toBe(2);
  expect(await creates(page)).toBe(2);
});

// Mode axes are independently selectable. In Chromium the two native modes are BLOCKED by design:
// their real proofs are the installed-Chrome gates.
for (const [url, provider, data, cls] of [
  ['/?provider=standin', 'standin', 'fixture', 'BROWSER_AUTOMATED'],
  ['/', 'native', 'fixture', 'BLOCKED'],
  ['/?provider=standin&data=live', 'standin', 'live', 'BROWSER_AUTOMATED'],
  ['/?data=live', 'native', 'live', 'BLOCKED'],
] as const) {
  test(`mode axes: ${url} → provider ${provider}, data ${data}`, async ({ page }) => {
    await stub.use('valid');
    const net = await guardNetwork(page);
    await openLive(page, url);
    await expect(page.locator('#mode')).toHaveText(`provider: ${provider} · data: ${data}`);
    await runButton(page).click();
    await done(page);
    const r = await evidence(page);
    expect(r.provider).toBe(provider);
    expect(r.dataSource.mode).toBe(data);
    expect(r.evidenceClass).toBe(cls);
    expect(net.api).toHaveLength(data === 'live' && provider === 'standin' ? 1 : 0); // fixture never calls it
    expect(net.external).toEqual([]);
  });
}

// Feature 007 G gate, L4 (opt-in; skipped unless BTA_REAL_YAHOO=1, which also removes the stand-in):
// stand-in model + live data from real Yahoo through /api/market. A typed market-data failure is
// recorded as BLOCKED, never as PASS.
test('real Yahoo L4: stand-in + live through /api/market (BTA_REAL_YAHOO=1 only)', async ({ page, browser }, testInfo) => {
  test.skip(!REAL_YAHOO, 'approval-gated real-Yahoo run only (BTA_REAL_YAHOO=1)');
  const net = await guardNetwork(page);
  await openLive(page);
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
  const out = realYahooEvidence('L4', r, { chrome: browser.version(),
    browserYahooRequests: net.external.filter((u) => /yahoo\./.test(new URL(u).hostname)).length });
  writeFileSync(testInfo.outputPath('real-yahoo-evidence.json'), JSON.stringify(out, null, 2) + '\n');
  expect(net.external).toEqual([]);
  expect(net.api).toHaveLength(1);
  if (r.outcome === 'success') {
    for (const n of ROLES) expect(r.nodes[n].status, n).toBe('done');
    expect(r.counts).toMatchObject({ logicalRequests: 8, fallbackRequests: 0 });
    expect(r.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  } else {
    expect(r.failure?.boundary, JSON.stringify(r.failure)).toBe('market-data');
    expect(await creates(page)).toBe(0);
  }
});
