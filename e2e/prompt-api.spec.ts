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
// (specs/004…/tasks.md T059).
test('native Prompt API: canonical eight-role fixture graph completes in installed Google Chrome', async ({ baseURL }, testInfo) => {
  test.setTimeout(10 * 60_000);
  const { context, close } = await launchNativeChrome(testInfo);
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/?runner=playwright`);
    await page.getByRole('button', { name: 'Run Graph', exact: true }).click();
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 9 * 60_000 });
    const record = JSON.parse((await page.locator('#evidence').textContent()) ?? '{}');
    writeFileSync(testInfo.outputPath('evidence.json'), JSON.stringify(record, null, 2) + '\n');

    expect(record.evidenceClass).toBe('REAL_BROWSER_PROMPT_API');
    expect(record.provider).toBe('native');
    expect(record.environment.availability).toBe('MODEL_AVAILABLE');
    expect(record.runner).toBe('playwright');
    expect(record.outcome, JSON.stringify(record.error)).toBe('success');
    expect(record.graph.version).toBe('tradingagents-fixture-graph@1');
    for (const n of ['marketAnalyst', 'newsAnalyst', 'bullResearcher', 'bearResearcher', 'researchManager', 'trader',
      'riskReviewer', 'finalDecisionMaker']) expect(record.nodes[n].status, n).toBe('done');
    expect(record.result.finalDecision).toBeTruthy();
    expect(record.lifecycle.settledBeforeShutdown).toBe(true);
    expect(record.dataSource.mode).toBe('fixture'); // Feature 005: credential-free native + fixture gate
  } finally {
    await close();
  }
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
