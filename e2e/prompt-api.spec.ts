// REAL_BROWSER_PROMPT_API with runner "playwright": the Feature 002 harness (/harness) and the
// canonical page (/) in the installed Google Chrome with the native Prompt API, on a per-run APFS clone of the golden profile built by
// scripts/prepare-prompt-api-profile.sh. macOS, on the machine that holds the model.
// Run with `npm run test:prompt-api`; it is not part of `npm run test:browser`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { chromium, expect, test, type TestInfo } from '@playwright/test';
import { REAL_YAHOO, realYahooEvidence } from './real-yahoo.ts';
import { measure, QUESTIONS } from './measure.ts';
import { aggregate, verdict } from '../src/analysis/report.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';

// No trace, video or screenshot for any test here (these are also the config defaults). The tests use
// their own persistent context, which those fixtures would not record anyway.
test.use({ trace: 'off', video: 'off', screenshot: 'off' });

const GOLDEN = process.env.PROMPT_API_PROFILE ?? `${homedir()}/.cache/browser-trading-agents/prompt-api-profile`;

// Playwright passes the features it disables as ONE `--disable-features=` argument, and that list
// includes OptimizationHints, which the on-device model needs. The only way to re-enable just that
// feature is to replace the exact argument. Playwright's other defaults (no component updates, no
// background networking) stay on, so Chrome cannot start a model download during a test.
// ponytail: list copied from playwright-core 1.63.0; the version check below fails on upgrade.
const PLAYWRIGHT_VERSION = '1.63.0';
const PLAYWRIGHT_DISABLED_FEATURES = [
  'AvoidUnnecessaryBeforeUnloadCheckSync', 'DestroyProfileOnBrowserClose', 'DialMediaRouteProvider',
  'GlobalMediaControls', 'HttpsUpgrades', 'LensOverlay', 'MediaRouter', 'PaintHolding',
  'ThirdPartyStoragePartitioning', 'BlockOriginHeaderModificationOnRedirect', 'Translate',
  'AutoDeElevate', 'OptimizationHints', 'msForceBrowserSignIn', 'msEdgeUpdateLaunchServicesPreferredVersion',
];

// Installed Google Chrome on a per-run APFS clone of the golden profile, OptimizationHints re-enabled.
async function launchNativeChrome(testInfo: TestInfo) {
  const installed = JSON.parse(readFileSync('node_modules/@playwright/test/package.json', 'utf8')).version;
  expect(installed, 'update PLAYWRIGHT_DISABLED_FEATURES for this Playwright version').toBe(PLAYWRIGHT_VERSION);
  expect(existsSync(`${GOLDEN}/OptGuideOnDeviceModel`), `run scripts/prepare-prompt-api-profile.sh (${GOLDEN})`).toBe(true);

  const profile = testInfo.outputPath('profile');
  execFileSync('cp', ['-c', '-R', GOLDEN, profile]); // APFS clone: per-run copy, ~0 extra disk
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chrome',
    headless: true,
    ignoreDefaultArgs: [`--disable-features=${PLAYWRIGHT_DISABLED_FEATURES.join(',')}`],
    args: [`--disable-features=${PLAYWRIGHT_DISABLED_FEATURES.filter((f) => f !== 'OptimizationHints').join(',')}`],
  });
  // Feature 009 T007a: a persistent context does not get the config's storageState; seed the same finished
  // empty portfolio so the canonical page opens into the office, not the onboarding.
  await context.addInitScript(() => localStorage.setItem('bta.portfolio', '{"version":1,"onboardedAt":"2026-09-29T00:00:00.000Z","holdings":[]}'));
  const close = async () => {
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  };
  return { context, close };
}

test('native Prompt API: S1–S5 and S7 PASS in installed Google Chrome', async ({ baseURL }, testInfo) => {
  test.setTimeout(10 * 60_000);
  const { context, close } = await launchNativeChrome(testInfo);
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/harness?runner=playwright`);
    await page.getByRole('button', { name: 'Run' }).click();
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 9 * 60_000 });
    const record = JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
    writeFileSync(testInfo.outputPath('evidence.json'), JSON.stringify(record, null, 2) + '\n');

    expect(record.environment.availability).toBe('MODEL_AVAILABLE');
    expect(record.evidenceClass).toBe('REAL_BROWSER_PROMPT_API');
    expect(record.provider).toBe('native');
    expect(record.runner).toBe('playwright');
    for (const name of ['S1_single', 'S2_reuse', 'S3_concurrent2', 'S4_cancel', 'S5_structured', 'S7_cleanup']) {
      expect(record.scenarios[name].outcome, `${name}: ${JSON.stringify(record.scenarios[name])}`).toBe('PASS');
    }
    expect(record.scenarios.S6_systemRole.outcome).toBe('OBSERVED');
  } finally {
    await close();
  }
});

// Feature 004 canonical page (index.html → src/main.ts, eight-role fixture graph) on the native Prompt
// API. Asserts the run, not the model's wording; logicalRequests is measured and validated separately
// (specs/004…/tasks.md T059), with the default view. Feature 008 T034's scenario B (Pixel Agents explicitly
// enabled) was retired with the iframe in Feature 009 (MD-5). The runtime's `{ready,1,1}` at fan-out is
// AkariSP admission, not evidence of native parallel inference.
const ROLE_NODES = ['marketAnalyst', 'newsAnalyst', 'bullResearcher', 'bearResearcher', 'researchManager', 'trader',
  'riskReviewer', 'finalDecisionMaker'];

async function nativeFixtureRun(baseURL: string | undefined, testInfo: TestInfo) {
  const { context, close } = await launchNativeChrome(testInfo);
  try {
    const page = await context.newPage();
    // Test-side counters (top frame only): iframes created; page requests to /api/market.
    await page.addInitScript(() => {
      if (window !== window.top) return;
      const w = window as unknown as { __iframes: number };
      w.__iframes = 0;
      const create = Document.prototype.createElement;
      Document.prototype.createElement = function (this: Document, tag: string, ...a: []) {
        if (String(tag).toLowerCase() === 'iframe') w.__iframes++;
        return create.call(this, tag, ...a);
      } as typeof create;
    });
    const net = { api: 0 };
    page.on('request', (r) => { if (new URL(r.url()).pathname === '/api/market') net.api++; });
    const view = page.locator('#execution-view');
    await page.goto(`${baseURL}/?runner=playwright`);
    await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled({ timeout: 60_000 });
    await expect(page.locator('#view-roles li')).toHaveCount(8);
    await expect(page.locator('[data-office]')).toHaveAttribute('data-office', 'ready'); // Feature 009: the office is shown
    await page.getByRole('button', { name: 'Run Graph', exact: true }).click();
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 9 * 60_000 });
    const record = JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
    writeFileSync(testInfo.outputPath('evidence.json'), JSON.stringify(record, null, 2) + '\n');
    const view008 = {
      scenario: 'default view',
      iframesCreated: await page.evaluate(() => (window as unknown as { __iframes: number }).__iframes),
      apiMarketRequests: net.api,
      textRun: await page.locator('#view-run').textContent(),
      textRoles: await page.locator('#view-roles li').evaluateAll((ls) => ls.map((l) => (l as HTMLElement).dataset.state)),
      anomalies: await view.getAttribute('data-anomalies'),
      officeTags: await page.locator('[data-office] [data-role]').evaluateAll((ts) => ts.map((t) => (t as HTMLElement).dataset.state)),
    };
    writeFileSync(testInfo.outputPath('view-008.json'), JSON.stringify(view008, null, 2) + '\n');

    // The execution invariants.
    expect(record.evidenceClass).toBe('REAL_BROWSER_PROMPT_API');
    expect(record.provider).toBe('native');
    expect(record.environment.availability).toBe('MODEL_AVAILABLE');
    expect(record.runner).toBe('playwright');
    expect(record.outcome, JSON.stringify(record.error)).toBe('success');
    expect(record.graph.version).toBe('tradingagents-fixture-graph@1');
    for (const n of ROLE_NODES) expect(record.nodes[n].status, n).toBe('done');
    expect(record.result.finalDecision).toBeTruthy();
    expect(record.dataSource.mode).toBe('fixture'); // Feature 005: credential-free native + fixture gate
    expect(record.fixture).toBe('tradingagents-fixture@1');
    expect(record.counts).toMatchObject({ graphRuns: 1, nodeExecutions: 8, logicalRequests: 8, fallbackRequests: 0 });
    expect(record.nodeEvents).toHaveLength(16); // no extra node execution
    expect(record.lifecycle.settledBeforeShutdown).toBe(true);
    expect(record.lifecycle.snapshotBeforeShutdown).toEqual({ state: 'ready', active: 0, queued: 0 });
    expect(record.lifecycle.snapshotAfterShutdown).toEqual({ state: 'closed', active: 0, queued: 0 });
    expect(net.api).toBe(0); // no market acquisition in fixture mode
    // The view: text is canonical; no iframe.
    expect(view008.textRun).toBe('completed');
    expect(view008.textRoles).toEqual(Array(8).fill('completed'));
    expect(view008.anomalies).toBe('0');
    expect(view008.iframesCreated).toBe(0);
    expect(view008.officeTags).toEqual(Array(8).fill('completed'));
  } finally {
    await close();
  }
}

test('native Prompt API: canonical eight-role fixture graph completes in installed Google Chrome', async ({ baseURL }, testInfo) => {
  test.setTimeout(10 * 60_000);
  await nativeFixtureRun(baseURL, testInfo);
});

// Feature 007 G gate, L5 (opt-in; skipped unless BTA_REAL_YAHOO=1): native Prompt API + live data from
// real Yahoo through /api/market; no key. The title contains neither "eight-role" nor "canonical", so the
// native + fixture gate (-g "eight-role") never selects it. A typed market-data failure is BLOCKED.
test('real Yahoo L5: native Prompt API + live through /api/market (BTA_REAL_YAHOO=1 only)', async ({ baseURL }, testInfo) => {
  test.skip(!REAL_YAHOO, 'approval-gated real-Yahoo run only (BTA_REAL_YAHOO=1)');
  test.setTimeout(10 * 60_000);
  const { context, close } = await launchNativeChrome(testInfo);
  try {
    const page = await context.newPage();
    const external: string[] = [];
    await page.route((url) => url.hostname !== 'localhost', (route) => { external.push(route.request().url()); return route.abort(); });
    await page.goto(`${baseURL}/?data=live&runner=playwright`);
    await page.getByRole('button', { name: 'Run Graph', exact: true }).click();
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 9 * 60_000 });
    const record = JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
    let chrome = 'unknown';
    try { chrome = execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--version'], { encoding: 'utf8' }).trim(); } catch {}
    const out = realYahooEvidence('L5', record, { chrome,
      browserYahooRequests: external.filter((u) => /yahoo\./.test(new URL(u).hostname)).length });
    writeFileSync(testInfo.outputPath('real-yahoo-evidence.json'), JSON.stringify(out, null, 2) + '\n');
    expect(external).toEqual([]);
    expect(record.provider).toBe('native');
    expect(record.dataSource.mode).toBe('live');
    if (record.outcome === 'success') {
      for (const n of ['marketAnalyst', 'newsAnalyst', 'bullResearcher', 'bearResearcher', 'researchManager', 'trader',
        'riskReviewer', 'finalDecisionMaker']) expect(record.nodes[n].status, n).toBe('done');
      expect(record.lifecycle.settledBeforeShutdown).toBe(true);
    } else {
      expect(record.failure?.boundary, JSON.stringify(record.failure)).toBe('market-data');
    }
  } finally {
    await close();
  }
});

// Feature 010 T025 (opt-in, never in CI): the committed measurement set on the native model, BTA_MEASURE_REPS
// repetitions (default 3) of every question, on the fictional example portfolio; fixture facts only, no network data.
// The title contains neither "eight-role" nor "canonical", so the native fixture gate never selects it.
test('native Prompt API: hallucination measurement (BTA_MEASURE=1 only)', async ({ baseURL }, testInfo) => {
  test.skip(!process.env.BTA_MEASURE, 'opt-in native measurement only (BTA_MEASURE=1)');
  test.setTimeout(8 * 60 * 60_000); // Feature 013: three modes ≈ 4.5 h
  const reps = Number(process.env.BTA_MEASURE_REPS ?? 3);
  const { context, close } = await launchNativeChrome(testInfo);
  try {
    const example = JSON.stringify({ version: 1, onboardedAt: '2026-09-29T00:00:00.000Z', holdings: PORTFOLIO_FIXTURE.portfolio });
    await context.addInitScript((v) => localStorage.setItem('bta.portfolio', v), example); // after the empty seed
    const page = await context.newPage();
    await page.goto(`${baseURL}/?runner=playwright&quotes=fixture`);
    await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled({ timeout: 60_000 });
    const ua = await page.evaluate(() => navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] ?? navigator.userAgent);
    const meta = { model: 'Gemini Nano (Chrome Prompt API)', browser: ua };
    // Feature 013 (T021): BTA_MEASURE_MODES=current,formatted,refs — each repetition runs every mode, the order
    // rotated per repetition; one report per mode plus a comparison. Without it: the Feature 010 run, unchanged.
    const modes = process.env.BTA_MEASURE_MODES?.split(',').map((m) => m.trim()) as ('current' | 'formatted' | 'refs')[] | undefined;
    if (!modes) {
      const report = await measure(page, reps, meta);
      writeFileSync(testInfo.outputPath('measurement-native.json'), JSON.stringify(report, null, 2) + '\n');
      console.log('T025 native aggregate', JSON.stringify(report.aggregate), 'verdict', report.verdict);
      expect(report.evidenceClass).toBe('REAL_BROWSER_PROMPT_API');
      return;
    }
    const byMode = new Map<string, Awaited<ReturnType<typeof measure>>[]>();
    for (let rep = 0; rep < reps; rep++) {
      for (const mode of [...modes.slice(rep % modes.length), ...modes.slice(0, rep % modes.length)]) {
        await page.goto(`${baseURL}/?runner=playwright&quotes=fixture&numbers=${mode}`);
        await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled({ timeout: 60_000 });
        const r = await measure(page, 1, meta, mode, false);
        byMode.set(mode, [...(byMode.get(mode) ?? []), r]);
        // Written at once, so a later failure cannot lose finished repetitions.
        writeFileSync(testInfo.outputPath(`measurement-native-${mode}-rep${rep + 1}.json`), JSON.stringify(r, null, 2) + '\n');
        console.log('Feature 013 native', mode, 'repetition', rep + 1, JSON.stringify(r.aggregate));
      }
    }
    const compare: Record<string, unknown> = {};
    for (const [mode, parts] of byMode) {
      const runs = parts.flatMap((p) => p.runs);
      const agg = aggregate(runs);
      const report = { ...parts[0], repetitions: reps, generatedAt: new Date().toISOString(), aggregate: agg,
        verdict: verdict(agg, parts[0].evidenceClass), runs };
      writeFileSync(testInfo.outputPath(`measurement-native-${mode}.json`), JSON.stringify(report, null, 2) + '\n');
      compare[mode] = { ...agg, verdict: report.verdict, medianMs: runs.map((x) => x.ms).sort((a, b) => a - b)[Math.floor(runs.length / 2)] };
      expect(report.evidenceClass).toBe('REAL_BROWSER_PROMPT_API');
    }
    writeFileSync(testInfo.outputPath('measurement-native-compare.json'), JSON.stringify({ modes, reps, browser: ua, compare }, null, 2) + '\n');
    console.log('Feature 013 native compare', JSON.stringify(compare));
  } finally {
    await close();
  }
});

// Feature 013 hand-off to AkariSP (research R9): one `refs` pass; keeps the upstream outputs the final role read,
// so `node scripts/harness-prompts.ts <out> <this file>` rebuilds the exact final-role prompts. Opt-in, ≈ 80 min.
test('native Prompt API: harness prompt capture (BTA_CAPTURE=1 only)', async ({ baseURL }, testInfo) => {
  test.skip(!process.env.BTA_CAPTURE, 'opt-in native capture only (BTA_CAPTURE=1)');
  test.setTimeout(3 * 60 * 60_000);
  const { context, close } = await launchNativeChrome(testInfo);
  try {
    const example = JSON.stringify({ version: 1, onboardedAt: '2026-09-29T00:00:00.000Z', holdings: PORTFOLIO_FIXTURE.portfolio });
    await context.addInitScript((v) => localStorage.setItem('bta.portfolio', v), example);
    const page = await context.newPage();
    await page.goto(`${baseURL}/?runner=playwright&quotes=fixture&numbers=refs`);
    await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled({ timeout: 60_000 });
    const ua = await page.evaluate(() => navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] ?? navigator.userAgent);
    await measure(page, 1, { model: 'Gemini Nano (Chrome Prompt API)', browser: ua }, 'refs', false);
    type Rec = { outcome: string; analysis: { holding: string; question: string }; result?: Record<string, string> };
    const recs = (await page.evaluate(() => (window as unknown as { __records: unknown[] }).__records)) as Rec[];
    const ids = new Map(QUESTIONS.map((q) => [q.text, q.id]));
    const outputs = Object.fromEntries(recs.filter((r) => r.outcome === 'success').map((r) => [`${ids.get(r.analysis.question)}|${r.analysis.holding}`,
      { riskReview: r.result!.riskReview, researchDecision: r.result!.researchDecision, traderPlan: r.result!.traderPlan, finalDecision: r.result!.finalDecision }]));
    writeFileSync(testInfo.outputPath('harness-outputs-refs.json'), JSON.stringify({ browser: ua, capturedAt: new Date().toISOString(), outputs }, null, 1) + '\n');
    console.log('Feature 013 harness capture', Object.keys(outputs).length, 'of', recs.length);
  } finally {
    await close();
  }
});

// Feature 012 (T014, research R7): reuse on vs off on the native model — example-portfolio overview, alternating
// order, BTA_REUSE_REPS (default 2) per mode. Opt-in; takes about 5 minutes per overview.
test('native Prompt API: runtime reuse comparison (BTA_REUSE_COMPARE=1 only)', async ({ baseURL }, testInfo) => {
  test.skip(!process.env.BTA_REUSE_COMPARE, 'opt-in native comparison only (BTA_REUSE_COMPARE=1)');
  test.setTimeout(3 * 60 * 60_000);
  const reps = Number(process.env.BTA_REUSE_REPS ?? 2);
  const { context, close } = await launchNativeChrome(testInfo);
  type Rec = { outcome: string; lifecycle: { prepared: boolean; replaced?: unknown; discarded?: unknown }; timing: { graphMs: number; runtimeCreateMs: number } };
  const modes: Record<'on' | 'off', { runs: number; prepared: number; runtimeCreateMs: number[]; graphMs: number[]; totalMs: number[]; outcomes: string[]; replacements: number }> = {
    on: { runs: 0, prepared: 0, runtimeCreateMs: [], graphMs: [], totalMs: [], outcomes: [], replacements: 0 },
    off: { runs: 0, prepared: 0, runtimeCreateMs: [], graphMs: [], totalMs: [], outcomes: [], replacements: 0 },
  };
  try {
    const example = JSON.stringify({ version: 1, onboardedAt: '2026-09-29T00:00:00.000Z', holdings: PORTFOLIO_FIXTURE.portfolio });
    await context.addInitScript((v) => localStorage.setItem('bta.portfolio', v), example);
    let ua = '';
    for (let rep = 0; rep < reps; rep++) {
      for (const mode of (rep % 2 ? ['off', 'on'] : ['on', 'off']) as ('on' | 'off')[]) {
        const page = await context.newPage(); // a fresh page = a fresh page session (FR-002)
        await page.goto(`${baseURL}/?runner=playwright&quotes=fixture&reuse=${mode}`);
        await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled({ timeout: 60_000 });
        ua = await page.evaluate(() => navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] ?? navigator.userAgent);
        await page.evaluate(() => {
          const w = window as unknown as { __records: unknown[] };
          w.__records = [];
          document.getElementById('run')!.addEventListener('bta-done', (e) => w.__records.push((e as CustomEvent).detail));
        });
        const t0 = Date.now();
        await page.getByRole('button', { name: '전체 점검' }).click();
        await expect(page.getByRole('dialog', { name: '답변' })).toBeVisible({ timeout: 60 * 60_000 });
        const recs = (await page.evaluate(() => (window as unknown as { __records: unknown[] }).__records)) as Rec[];
        const m = modes[mode];
        m.totalMs.push(Date.now() - t0);
        m.runs += recs.length;
        m.prepared += recs.filter((r) => r.lifecycle?.prepared).length;
        m.runtimeCreateMs.push(...recs.map((r) => r.timing.runtimeCreateMs));
        m.graphMs.push(...recs.map((r) => r.timing.graphMs));
        m.outcomes.push(...recs.map((r) => r.outcome));
        m.replacements += recs.filter((r) => r.lifecycle?.replaced || r.lifecycle?.discarded).length;
        await page.close();
      }
    }
    const report = { provider: 'native', evidenceClass: 'REAL_BROWSER_PROMPT_API', model: 'Gemini Nano (Chrome Prompt API)', browser: ua,
      reps, generatedAt: new Date().toISOString(), modes };
    writeFileSync(testInfo.outputPath('measurement-reuse-native.json'), JSON.stringify(report, null, 2) + '\n');
    console.log('T014 native reuse comparison', JSON.stringify({ on: modes.on.totalMs, off: modes.off.totalMs }));
    expect(modes.on.runs).toBe(6 * reps);
  } finally {
    await close();
  }
});
