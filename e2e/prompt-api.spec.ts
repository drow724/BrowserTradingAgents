// REAL_BROWSER_PROMPT_API with runner "playwright": the Feature 002 harness (/harness/) and the
// canonical page (/) in the installed Google Chrome with the native Prompt API, on a per-run APFS clone of the golden profile built by
// scripts/prepare-prompt-api-profile.sh. macOS, on the machine that holds the model.
// Run with `npm run test:prompt-api`; it is not part of `npm run test:browser`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { chromium, expect, test, type TestInfo } from '@playwright/test';

// No trace, video or screenshot for any test here (these are also the config defaults). The tests use
// their own persistent context, which those fixtures would not record anyway; stated so that the
// owner-run live test (key typed into the page) can never be captured.
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
    await page.goto(`${baseURL}/harness/?runner=playwright`);
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

// Feature 005 L5 (SC-016), owner-run only: native Prompt API + real Massive end-of-day data. The key
// comes from BTA_MASSIVE_KEY, set by the owner in their own terminal through a silent read in a
// subshell (docs/testing.md) — test-runner input, never a bundler variable. The key is never logged or
// written; never run this with DEBUG=pw:api (it prints fill values). The title deliberately contains
// neither "eight-role" nor "canonical", so the credential-free gate (-g "eight-role") never selects it.
test.describe('owner-run live market data', () => {
  test('native Prompt API: live market data run (owner-run L5)', async ({ baseURL }, testInfo) => {
    const key = process.env.BTA_MASSIVE_KEY;
    test.skip(!key, 'owner-run L5 only (BTA_MASSIVE_KEY not set)');
    test.setTimeout(10 * 60_000);
    const { context, close } = await launchNativeChrome(testInfo);
    try {
      const page = await context.newPage();
      await page.goto(`${baseURL}/?data=live&runner=playwright`);
      await expect(page.locator('#key')).toBeVisible();
      await page.locator('#key').fill(key!);
      await page.getByRole('button', { name: 'Run Graph', exact: true }).click();
      await expect(page.locator('#status')).toHaveAttribute('data-state', 'done', { timeout: 9 * 60_000 });
      const text = (await page.locator('#evidence').textContent()) ?? '{}';
      const out = testInfo.outputPath('evidence.json');
      writeFileSync(out, text + '\n');
      // Boolean checks only, so a failure can never print the key.
      expect(readFileSync(out, 'utf8').includes(key!), 'evidence file contains the key').toBe(false);
      expect(text.includes('Authorization') || text.includes('Bearer'), 'credential material in evidence').toBe(false);

      const record = JSON.parse(text);
      expect(record.evidenceClass).toBe('REAL_BROWSER_PROMPT_API');
      expect(record.provider).toBe('native');
      expect(record.environment.availability).toBe('MODEL_AVAILABLE');
      expect(record.runner).toBe('playwright');
      expect(record.outcome, JSON.stringify(record.failure ?? record.error)).toBe('success');
      expect(record.dataSource).toMatchObject({ mode: 'live', source: 'massive', httpStatus: 200, providerStatus: 'OK' });
      expect(record.dataSource.snapshotDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(record.dataSource.marketFactsDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(record.input).toEqual({ id: 'live-market@1', news: 'neutral-news@1' });
      for (const n of ['marketAnalyst', 'newsAnalyst', 'bullResearcher', 'bearResearcher', 'researchManager', 'trader',
        'riskReviewer', 'finalDecisionMaker']) expect(record.nodes[n].status, n).toBe('done');
      expect(record.lifecycle.settledBeforeShutdown).toBe(true);
      // logicalRequests / fallbackRequests are measured and validated with the record (tasks.md T051).
    } finally {
      await close();
    }
  });
});
