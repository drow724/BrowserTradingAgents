// BROWSER_AUTOMATED (stand-in): the canonical page (index.html → src/main.ts) running the TradingAgents
// graph in Playwright Chromium. Real LangGraph + AkariChatModel + akarisp in the browser bundle, where a
// node's model call does not inherit the graph's signal implicitly. Not Prompt API evidence. Role
// provenance is proven deterministically (test/trading-graph.test.ts), not here. Live-mode tests
// (Feature 005 L3) answer Massive requests with synthetic bodies via page.route; every other non-local
// request is aborted, so no test reaches the real network, and the key is a dummy string.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { expect, test, type Page, type Request, type Route } from '@playwright/test';

const ROLES = ['marketAnalyst', 'newsAnalyst', 'bullResearcher', 'bearResearcher', 'researchManager', 'trader',
  'riskReviewer', 'finalDecisionMaker'];
const AFTER_ANALYSTS = ROLES.slice(2);

const done = (page: Page) =>
  expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 60_000 });
const evidence = async (page: Page) => JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
const runButton = (page: Page) => page.getByRole('button', { name: 'Run Graph', exact: true });
const standin = (page: Page, action: 'hold' | 'resume') =>
  page.evaluate((a) => (window as unknown as { __standin: Record<string, () => void> }).__standin[a](), action);

test('stand-in: full eight-role graph succeeds through LangGraph → AkariChatModel → AkariSP', async ({ page }, testInfo) => {
  const net = await guardNetwork(page);
  await page.goto('/?provider=standin');
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
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
  // Feature 005: fixture mode is the Feature 004 path, labelled, with no market-data request.
  expect(r.dataSource).toEqual({ mode: 'fixture', fixture: 'tradingagents-fixture@1' });
  expect(r.input).toEqual({ id: 'tradingagents-fixture@1', news: 'tradingagents-fixture@1' });
  expect(r.result.finalDecision).toContain('Northwind Lamps Ltd. (fictional)');
  expect(r.result.finalDecision).toContain('news fact N1');
  expect(net.massive).toHaveLength(0);
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

// ---------------------------------------------------------------------------------------------
// Feature 005 L3 — live mode on controlled responses (specs/005-…/tasks.md T026–T033)

const DUMMY_KEY = 'l3-dummy-key-not-real';
const LEAK_VALUES = ['184.61', '183.29', '178.30', '185.40', '4200000', 'market fact L'];
const EXPECTED_FACTS = "On the 2026-09-25 close IBM traded at 184.61 USD, +0.72% from the previous session's 183.29 " +
  '(market fact L1). Over the last 5 sessions it ranged from 178.30 to 185.40 on average daily volume of 4200000 ' +
  'shares (market fact L2).';
const NEUTRAL = 'No company-specific news is supplied for this run';
// Synthetic Massive Custom Bars body (invented values; `t` = midnight ET of each session date).
const T = [1789617600000, 1789704000000, 1789963200000, 1790049600000, 1790136000000, 1790222400000, 1790308800000];
const OHLCV = [[170.00, 171.50, 169.40, 170.11, 3100000], [170.20, 172.10, 169.90, 171.22, 3200000],
  [179.00, 181.90, 178.30, 181.17, 4100000], [181.20, 183.10, 180.60, 182.53, 4300000],
  [182.40, 182.90, 179.10, 179.88, 3900000], [180.00, 183.70, 179.60, 183.29, 4200000],
  [183.30, 185.40, 182.80, 184.61, 4500000]];
const BARS = OHLCV.map(([o, h, l, c, v], i) => ({ v, vw: c, o, c, h, l, t: T[i], n: 1 }));
const body = (results: unknown[] = BARS, status = 'OK') =>
  ({ ticker: 'IBM', queryCount: results.length, resultsCount: results.length, adjusted: true, results, status, request_id: 'synthetic-l3', count: results.length });
const CORS = { 'access-control-allow-origin': '*' };
const reply = (status: number, b: unknown) => (route: Route) => route.fulfill({ status, headers: CORS, json: b });
const etDate = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(ms));
const sha256 = (text: string) => `sha256:${createHash('sha256').update(text).digest('hex')}`;

// Abort every non-local request; record Massive requests (answered by `massive()` routes).
async function guardNetwork(page: Page) {
  const net = { external: [] as string[], massive: [] as Request[] };
  await page.route((url) => url.hostname !== 'localhost', (route) => {
    net.external.push(route.request().url());
    return route.abort();
  });
  page.on('request', (r) => { if (r.url().startsWith('https://api.massive.com/')) net.massive.push(r); });
  return net;
}
const massive = (page: Page, handler: (route: Route) => unknown) => page.route('https://api.massive.com/**', handler);
// Test-side instrumentation: count LanguageModel.create — AkariSP's createRuntime calls it eagerly.
const countCreates = (page: Page) => page.evaluate(() => {
  const w = window as unknown as { LanguageModel: { create: (...a: unknown[]) => unknown }; __creates: number };
  const create = w.LanguageModel.create.bind(w.LanguageModel);
  w.__creates = 0;
  w.LanguageModel.create = (...a) => { w.__creates++; return create(...a); };
});
const creates = (page: Page) => page.evaluate(() => (window as unknown as { __creates: number }).__creates);

async function openLive(page: Page, url = '/?provider=standin&data=live', key = DUMMY_KEY) {
  await page.goto(url);
  await expect(runButton(page)).toBeEnabled();
  if (url.includes('provider=standin')) await countCreates(page);
  if (key) await page.fill('#key', key);
}

test('stand-in + live: controlled Massive reply → eight roles, 8/0, provenance + digests, no values in the record', async ({ page }) => {
  const net = await guardNetwork(page);
  await massive(page, reply(200, body()));
  await openLive(page);
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);

  // Request contract: one GET, ET window, key only in the Authorization header, no retry.
  expect(net.massive).toHaveLength(1);
  const req = net.massive[0];
  const now = Date.now();
  expect(req.method()).toBe('GET');
  expect(req.url()).toBe(`https://api.massive.com/v2/aggs/ticker/IBM/range/1/day/${etDate(now - 10 * 86_400_000)}/${etDate(now)}?adjusted=true&sort=asc`);
  expect(req.url()).not.toContain(DUMMY_KEY);
  expect(req.headers().authorization).toBe(`Bearer ${DUMMY_KEY}`);
  expect(net.external).toEqual([]);

  expect(r.evidenceClass).toBe('BROWSER_AUTOMATED');
  expect(r.provider).toBe('standin');
  expect(r.outcome).toBe('success');
  expect(r.failure).toBeUndefined();
  for (const n of ROLES) expect(r.nodes[n], n).toMatchObject({ status: 'done', executions: 1, modelRequests: 1 });
  expect(r.counts).toMatchObject({ logicalRequests: 8, fallbackRequests: 0, providerInvocations: 'NOT EXPOSED' });
  expect(r.lifecycle.settledBeforeShutdown).toBe(true);
  expect(r.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
  expect(r.lifecycle.snapshotAfterShutdown.state).toBe('closed');
  expect(await creates(page)).toBe(1);
  expect(r.input).toEqual({ id: 'live-market@1', news: 'neutral-news@1' });
  expect(r.fixture).toBeUndefined();
  expect(r.dataSource).toMatchObject({ mode: 'live', source: 'massive', symbol: 'IBM',
    endpoint: '/v2/aggs/ticker/{symbol}/range/1/day/{from}/{to}', httpStatus: 200, providerStatus: 'OK',
    requestId: 'synthetic-l3', bars: 7, asOf: '2026-09-25' });
  for (const k of ['requestedAt', 'receivedAt']) expect(Date.parse(r.dataSource[k]), k).not.toBeNaN();
  expect(typeof r.dataSource.ageHours).toBe('number');
  expect(typeof r.timing.acquisitionMs).toBe('number');

  // Redaction: live mode keeps presence and length only, whatever the provider.
  for (const [field, v] of Object.entries(r.result)) {
    expect(v, field).toEqual({ present: true, length: expect.any(Number) });
    expect((v as { length: number }).length, field).toBeGreaterThan(0);
  }
  const text = (await page.locator('#evidence').textContent())!;
  for (const leak of [...LEAK_VALUES, 'stand-in reply', 'Authorization', 'Bearer', DUMMY_KEY]) expect(text, leak).not.toContain(leak);

  // Replay: values + identities, re-derivable, no credential.
  const replayText = (await page.locator('#replay').textContent())!;
  const replay = JSON.parse(replayText);
  expect(Object.keys(replay)).toEqual(['snapshot', 'marketFacts', 'snapshotDigest', 'marketFactsDigest']);
  expect(replay.marketFacts).toBe(EXPECTED_FACTS);
  expect(replay.snapshotDigest).toBe(r.dataSource.snapshotDigest);
  expect(replay.marketFactsDigest).toBe(r.dataSource.marketFactsDigest);
  expect(sha256(JSON.stringify(replay.snapshot))).toBe(replay.snapshotDigest);
  expect(sha256(replay.marketFacts)).toBe(replay.marketFactsDigest);
  expect(replay.snapshot.sessions.map((x: { date: string }) => x.date)).toEqual(['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']);
  for (const leak of ['Authorization', 'Bearer', DUMMY_KEY]) expect(replayText, leak).not.toContain(leak);
  expect(JSON.parse((await page.locator('#market').textContent())!)).toEqual(replay.snapshot);

  // Roles saw the real subject and the neutral news (the stand-in echoes the Final Decision prompt,
  // which nests the risk review → news report → news facts).
  const shown = (await page.locator('#result').textContent())!;
  expect(shown).toContain('International Business Machines Corp. (IBM)');
  expect(shown).toContain(NEUTRAL);
  expect(shown).not.toContain('Northwind');
  expect(shown).not.toContain('news fact N');
});

const FAILURES: [string, ((route: Route) => unknown) | null, string][] = [
  ['network error', (route) => route.abort('failed'), 'network'],
  ['HTTP 401', reply(401, { status: 'ERROR', error: 'Unknown API Key' }), 'unauthorized'],
  ['HTTP 403', reply(403, { status: 'NOT_AUTHORIZED' }), 'unauthorized'],
  ['HTTP 429', reply(429, { status: 'ERROR', error: 'rate limit' }), 'rate-limited'],
  ['HTTP 500', reply(500, { status: 'ERROR' }), 'provider-error'],
  ['200 with status ERROR', reply(200, body(BARS, 'ERROR')), 'provider-error'],
  ['200 with status DELAYED', reply(200, body(BARS, 'DELAYED')), 'provider-error'],
  ['200 with an invalid price', reply(200, body([...BARS.slice(0, -1), { ...BARS.at(-1), c: 'x' }])), 'invalid-data'],
  ['200 with one bar', reply(200, body(BARS.slice(-1))), 'unavailable'],
  ['200 with a non-JSON body', (route) => route.fulfill({ status: 200, headers: CORS, contentType: 'text/html', body: '<html>' }), 'invalid-data'],
  ['empty key', null, 'credential-missing'],
];

for (const [name, handler, kind] of FAILURES) {
  test(`stand-in + live: ${name} → market-data ${kind}; no runtime, no model request, no fixture fallback`, async ({ page }) => {
    const net = await guardNetwork(page);
    await massive(page, handler ?? reply(200, body()));
    await openLive(page, undefined, handler ? DUMMY_KEY : '');
    await runButton(page).click();
    await done(page);
    const r = await evidence(page);
    expect(r.outcome).toBe('failed');
    expect(r.failure).toEqual({ boundary: 'market-data', kind });
    expect(await creates(page)).toBe(0);
    expect(r.counts.logicalRequests).toBe(0);
    expect(r.lifecycle).toBeNull();
    for (const n of ROLES) expect(r.nodes[n].status, n).toBe('waiting');
    expect(r.result).toBeUndefined();
    expect(r.fixture).toBeUndefined();
    expect(r.dataSource.mode).toBe('live');
    expect(r.dataSource.snapshotDigest).toBeUndefined();
    expect(net.massive).toHaveLength(handler ? 1 : 0); // no retry
    expect(net.external).toEqual([]);
    await expect(page.locator('#result')).not.toContainText('Northwind');
    await expect(page.locator('#replay')).toBeEmpty();
    await expect(runButton(page)).toBeEnabled();
  });
}

test('stand-in + live: acquisition limit (page clock +30 s) → market-data timeout, no runtime', async ({ page }) => {
  await page.clock.install();
  const net = await guardNetwork(page);
  await massive(page, () => {}); // never answers
  await openLive(page);
  await runButton(page).click();
  await expect.poll(() => net.massive.length).toBe(1);
  await page.clock.fastForward(30_000);
  await done(page);
  const r = await evidence(page);
  expect(r.failure).toEqual({ boundary: 'market-data', kind: 'timeout' });
  expect(await creates(page)).toBe(0);
  expect(r.counts.logicalRequests).toBe(0);
});

test('stand-in + live: Cancel during acquisition → market-data cancelled, no runtime', async ({ page }) => {
  const net = await guardNetwork(page);
  let release!: () => void;
  const held = new Promise<void>((r) => { release = r; });
  await massive(page, async (route) => { await held; await route.fulfill({ status: 200, headers: CORS, json: body() }).catch(() => {}); });
  await openLive(page);
  await runButton(page).click();
  await expect.poll(() => net.massive.length).toBe(1);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await done(page);
  release();
  const r = await evidence(page);
  expect(r.outcome).toBe('cancelled');
  expect(r.failure).toEqual({ boundary: 'market-data', kind: 'cancelled' });
  expect(await creates(page)).toBe(0);
  expect(r.counts.logicalRequests).toBe(0);
  expect(r.lifecycle).toBeNull();
});

test('stand-in + live: Cancel during the graph → inference cancelled, AkariSP settles before shutdown', async ({ page }) => {
  await guardNetwork(page);
  await massive(page, reply(200, body()));
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
  expect(r.lifecycle.snapshotAfterShutdown.state).toBe('closed');
});

test('native + live in Playwright Chromium: BLOCKED before any market-data request', async ({ page }) => {
  const net = await guardNetwork(page);
  await massive(page, reply(200, body()));
  await openLive(page, '/?data=live');
  await runButton(page).click();
  await done(page);
  const r = await evidence(page);
  expect(r.provider).toBe('native');
  expect(r.evidenceClass).toBe('BLOCKED');
  expect(r.outcome).toBe('not-run');
  expect(r.failure).toEqual({ boundary: 'inference', kind: 'native-unavailable' });
  expect(r.dataSource).toEqual({ mode: 'live' });
  expect(net.massive).toHaveLength(0);
});

// Mode axes are independently selectable. In Chromium the two native modes are BLOCKED by design:
// their real proofs are the installed-Chrome gates (T044 native + fixture, T051 native + live).
for (const [url, provider, data, cls] of [
  ['/?provider=standin', 'standin', 'fixture', 'BROWSER_AUTOMATED'],
  ['/', 'native', 'fixture', 'BLOCKED'],
  ['/?provider=standin&data=live', 'standin', 'live', 'BROWSER_AUTOMATED'],
  ['/?data=live', 'native', 'live', 'BLOCKED'],
] as const) {
  test(`mode axes: ${url} → provider ${provider}, data ${data}`, async ({ page }) => {
    await guardNetwork(page);
    await massive(page, reply(200, body()));
    await openLive(page, url, data === 'live' ? DUMMY_KEY : '');
    await expect(page.locator('#mode')).toHaveText(`provider: ${provider} · data: ${data}`);
    await expect(page.locator('#key-row')).toBeVisible({ visible: data === 'live' });
    await runButton(page).click();
    await done(page);
    const r = await evidence(page);
    expect(r.provider).toBe(provider);
    expect(r.dataSource.mode).toBe(data);
    expect(r.evidenceClass).toBe(cls);
  });
}

test('stand-in + live: the dummy key appears nowhere but the outgoing Authorization header', async ({ page, context }) => {
  const net = await guardNetwork(page);
  const consoleText: string[] = [];
  page.on('console', (m) => consoleText.push(m.text()));
  let calls = 0;
  await massive(page, (route) => (calls++ === 0 ? reply(200, body())(route) : reply(401, { status: 'ERROR' })(route)));
  await openLive(page);
  for (let i = 0; i < 2; i++) { // one success, then one failure
    await runButton(page).click();
    await done(page);
    const text = (await page.locator('#evidence').textContent())!;
    for (const leak of [DUMMY_KEY, 'Authorization', 'Bearer']) expect(text, `evidence run ${i}`).not.toContain(leak);
  }
  expect(net.massive).toHaveLength(2);
  for (const req of net.massive) {
    expect(req.url()).not.toContain(DUMMY_KEY);
    expect(req.headers().authorization).toBe(`Bearer ${DUMMY_KEY}`);
  }
  const surfaces = await page.evaluate(() => ({
    local: JSON.stringify({ ...localStorage }), session: JSON.stringify({ ...sessionStorage }), cookie: document.cookie,
    html: document.documentElement.outerHTML, // serialization, not the live `value` property of the key field
  }));
  for (const [name, value] of Object.entries(surfaces)) expect(value, name).not.toContain(DUMMY_KEY);
  for (const id of ['#replay', '#market', '#result']) await expect(page.locator(id), id).not.toContainText(DUMMY_KEY);
  expect(page.url()).not.toContain(DUMMY_KEY);
  expect(consoleText.join('\n')).not.toContain(DUMMY_KEY);
  expect(JSON.stringify(await context.cookies())).not.toContain(DUMMY_KEY);
});
