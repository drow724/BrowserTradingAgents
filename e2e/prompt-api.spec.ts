// REAL_BROWSER_PROMPT_API with runner "playwright": the Feature 002 harness (/harness) and the
// canonical page (/) in the installed Google Chrome with the native Prompt API, on a per-run APFS clone of the golden profile built by
// scripts/prepare-prompt-api-profile.sh. macOS, on the machine that holds the model.
// Run with `npm run test:prompt-api`; it is not part of `npm run test:browser`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { chromium, expect, test, type TestInfo } from '@playwright/test';
import { REAL_YAHOO, realYahooEvidence } from './real-yahoo.ts';

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
// (specs/004…/tasks.md T059). Feature 008 T034 runs it twice as independent user runs: A with the default
// view (text execution view; Pixel Agents off) and B with Pixel Agents explicitly enabled by the host-owned
// toggle. Native output is nondeterministic, so A and B share structural invariants, not model text. The
// runtime's `{ready,1,1}` at fan-out is AkariSP admission, not evidence of native parallel inference.
const ROLE_NODES = ['marketAnalyst', 'newsAnalyst', 'bullResearcher', 'bearResearcher', 'researchManager', 'trader',
  'riskReviewer', 'finalDecisionMaker'];
const ROLE_LABELS = ['Market Analyst', 'News Analyst', 'Bull Researcher', 'Bear Researcher', 'Research Manager', 'Trader',
  'Risk Reviewer', 'Final Decision'];

async function nativeFixtureRun(baseURL: string | undefined, testInfo: TestInfo, pixel: boolean) {
  const { context, close } = await launchNativeChrome(testInfo);
  try {
    const page = await context.newPage();
    // Test-side counters (top frame only): iframes created; page requests to /api/market and /pixel-agents.
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
    const net = { api: 0, pixel: 0 };
    page.on('request', (r) => {
      const path = new URL(r.url()).pathname;
      if (path === '/api/market') net.api++;
      if (path.startsWith('/pixel-agents/')) net.pixel++;
    });
    const view = page.locator('#execution-view');
    const toggle = page.locator('#view-pixel-toggle');
    await page.goto(`${baseURL}/?runner=playwright`);
    await expect(page.getByRole('button', { name: 'Run Graph', exact: true })).toBeEnabled({ timeout: 60_000 });
    await expect(page.locator('#view-roles li')).toHaveCount(8);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false'); // D5: off on every load
    if (pixel) {
      await toggle.click(); // the explicit, host-owned opt-in
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await expect(view).toHaveAttribute('data-iframes', '0'); // idle: still no canvas
    }
    await page.getByRole('button', { name: 'Run Graph', exact: true }).click();
    await page.locator('#view-stage').scrollIntoViewIfNeeded();
    let sandbox: string | null = null, rolesSeen = 0;
    if (pixel) {
      await expect(view).toHaveAttribute('data-iframes', '1', { timeout: 60_000 }); // running and on screen
      sandbox = await page.locator('#view-stage iframe').getAttribute('sandbox');
      for (const label of ROLE_LABELS) {
        await expect(page.frameLocator('#view-stage iframe').getByText(label).first()).toBeVisible({ timeout: 60_000 });
        rolesSeen++;
      }
    }
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 9 * 60_000 });
    const record = JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
    writeFileSync(testInfo.outputPath('evidence.json'), JSON.stringify(record, null, 2) + '\n');
    const view008 = {
      scenario: pixel ? 'B: Pixel Agents explicitly enabled' : 'A: default (text view, Pixel off)',
      iframesCreated: await page.evaluate(() => (window as unknown as { __iframes: number }).__iframes),
      iframesAtEnd: await view.getAttribute('data-iframes'), sandbox, pixelRolesSeen: rolesSeen,
      pixelRequests: net.pixel, apiMarketRequests: net.api,
      textRun: await page.locator('#view-run').textContent(),
      textRoles: await page.locator('#view-roles li').evaluateAll((ls) => ls.map((l) => (l as HTMLElement).dataset.state)),
      anomalies: await view.getAttribute('data-anomalies'),
    };
    writeFileSync(testInfo.outputPath('view-008.json'), JSON.stringify(view008, null, 2) + '\n');

    // The execution invariants, identical for A and B.
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
    expect(net.api).toBe(0); // no market acquisition in fixture mode, with or without Pixel
    // The view: text is canonical in both; the canvas exists only in B, and only while running.
    expect(view008.textRun).toBe('completed');
    expect(view008.textRoles).toEqual(Array(8).fill('completed'));
    expect(view008.anomalies).toBe('0');
    expect(view008.iframesAtEnd).toBe('0'); // terminal: unmounted
    if (pixel) {
      expect(view008.iframesCreated).toBeGreaterThanOrEqual(1);
      expect(view008.sandbox).toBe('allow-scripts');
      expect(view008.pixelRolesSeen).toBe(8);
    } else {
      expect(view008.iframesCreated).toBe(0);
      expect(view008.pixelRequests).toBe(0);
    }
  } finally {
    await close();
  }
}

test('native Prompt API: canonical eight-role fixture graph completes in installed Google Chrome', async ({ baseURL }, testInfo) => {
  test.setTimeout(10 * 60_000);
  await nativeFixtureRun(baseURL, testInfo, false); // T034 A: default view, Pixel Agents off
});

test('native Prompt API: canonical eight-role fixture graph with Pixel Agents explicitly enabled', async ({ baseURL }, testInfo) => {
  test.setTimeout(10 * 60_000);
  await nativeFixtureRun(baseURL, testInfo, true); // T034 B: explicit opt-in through the host-owned toggle
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
