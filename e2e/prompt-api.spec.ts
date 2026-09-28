// REAL_BROWSER_PROMPT_API with runner "playwright": the harness in the installed Google Chrome with
// the native Prompt API, on a per-run APFS clone of the golden profile built by
// scripts/prepare-prompt-api-profile.sh. macOS, on the machine that holds the model.
// Run with `npm run test:prompt-api`; it is not part of `npm run test:browser`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { chromium, expect, test } from '@playwright/test';

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

test('native Prompt API: S1–S5 and S7 PASS in installed Google Chrome', async ({ baseURL }, testInfo) => {
  test.setTimeout(10 * 60_000);
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
  try {
    const page = await context.newPage();
    await page.goto(`${baseURL}/?runner=playwright`);
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
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  }
});
