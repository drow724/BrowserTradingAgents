import { defineConfig, devices } from '@playwright/test';

// Concurrent sessions: give each its own port, e.g. HARNESS_PORT=5175 npm run test:prompt-api.
// The output folder is keyed by port too: Playwright clears it when a run starts.
// One Playwright session per checkout: every server builds into the default `.next`.
const port = Number(process.env.HARNESS_PORT ?? 5174);
// BTA_DEV_SMOKE=1 runs only the @dev smoke test on `next dev`; otherwise the production server.
const devSmoke = process.env.BTA_DEV_SMOKE === '1';
// Feature 007 controlled Yahoo stand-in (e2e/market-stub.mjs): app port + 24 (5198 by default).
const stubPort = Number(process.env.STUB_PORT ?? port + 24);
// BTA_REAL_YAHOO=1 (the approval-gated G run): no stand-in, /api/market reaches Yahoo, and only the
// "real Yahoo" tests are selected, so no controlled test can accidentally hit Yahoo.
const realYahoo = process.env.BTA_REAL_YAHOO === '1';
const onlyReal = realYahoo ? { grep: /real Yahoo/ } : {};

export default defineConfig({
  testDir: 'e2e',
  // One worker: app.spec.ts and execution-view.spec.ts both drive the one shared market stub (/__scenario).
  workers: 1,
  outputDir: `test-results/${port}`,
  use: { baseURL: `http://localhost:${port}` },
  projects: devSmoke
    ? [{ name: 'chromium-dev', grep: /@dev/, use: { ...devices['Desktop Chrome'] } }]
    : [
        // Stand-in and BLOCKED-policy checks in Playwright's own Chromium (`npm run test:browser`).
        { name: 'chromium', testIgnore: /prompt-api\.spec\.ts/, grepInvert: /@dev/, ...onlyReal, use: { ...devices['Desktop Chrome'] } },
        // Native Prompt API in the installed Google Chrome (`npm run test:prompt-api`, this Mac only).
        { name: 'prompt-api', testMatch: /prompt-api\.spec\.ts/, ...onlyReal },
      ],
  webServer: [
    {
      // Exactly one app server, own port and never reuse: next.config.ts embeds the git revision when the
      // build (or dev server) starts, so a reused (older) server would stamp evidence with a stale revision.
      // Feature 008: `npx next …` skips npm's predev/prebuild, so the Pixel webview copy runs explicitly first.
      command: `node scripts/copy-pixel-agents.mjs && ${devSmoke ? `npx next dev --port ${port}` : `npx next build && npx next start --port ${port}`}`,
      url: `http://localhost:${port}`,
      reuseExistingServer: false,
      timeout: 180_000,
      // Feature 007: /api/market talks to the local Yahoo stand-in below, never to Yahoo.
      ...(realYahoo ? {} : { env: { BTA_YAHOO_BASE_URL: `http://127.0.0.1:${stubPort}` } }),
    },
    ...(realYahoo ? [] : [{ command: 'node e2e/market-stub.mjs', url: `http://127.0.0.1:${stubPort}/__stats`,
      reuseExistingServer: false, env: { STUB_PORT: String(stubPort) } }]),
  ],
});
