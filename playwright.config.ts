import { defineConfig, devices } from '@playwright/test';

// Concurrent sessions: give each its own port, e.g. HARNESS_PORT=5175 npm run test:prompt-api.
// The output folder is keyed by port too: Playwright clears it when a run starts.
// One Playwright session per checkout: every server builds into the default `.next`.
const port = Number(process.env.HARNESS_PORT ?? 5174);
// BTA_DEV_SMOKE=1 runs only the @dev smoke test on `next dev`; otherwise the production server.
const devSmoke = process.env.BTA_DEV_SMOKE === '1';

export default defineConfig({
  testDir: 'e2e',
  outputDir: `test-results/${port}`,
  use: { baseURL: `http://localhost:${port}` },
  projects: devSmoke
    ? [{ name: 'chromium-dev', testIgnore: /prompt-api\.spec\.ts/, grep: /@dev/, use: { ...devices['Desktop Chrome'] } }]
    : [
        // Stand-in and BLOCKED-policy checks in Playwright's own Chromium (`npm run test:browser`).
        { name: 'chromium', testIgnore: /prompt-api\.spec\.ts/, grepInvert: /@dev/, use: { ...devices['Desktop Chrome'] } },
        // Native Prompt API in the installed Google Chrome (`npm run test:prompt-api`, this Mac only).
        { name: 'prompt-api', testMatch: /prompt-api\.spec\.ts/ },
      ],
  webServer: {
    // Exactly one server, own port and never reuse: next.config.ts embeds the git revision when the
    // build (or dev server) starts, so a reused (older) server would stamp evidence with a stale revision.
    command: devSmoke ? `npx next dev --port ${port}` : `npx next build && npx next start --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
