import { defineConfig, devices } from '@playwright/test';

// Concurrent sessions: give each its own port, e.g. HARNESS_PORT=5175 npm run test:prompt-api.
// The output folder is keyed by port too: Playwright clears it when a run starts.
const port = Number(process.env.HARNESS_PORT ?? 5174);

export default defineConfig({
  testDir: 'e2e',
  outputDir: `test-results/${port}`,
  use: { baseURL: `http://localhost:${port}` },
  projects: [
    // Stand-in and BLOCKED-policy checks in Playwright's own Chromium (`npm run test:browser`).
    { name: 'chromium', testIgnore: /prompt-api\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    // Native Prompt API in the installed Google Chrome (`npm run test:prompt-api`, this Mac only).
    { name: 'prompt-api', testMatch: /prompt-api\.spec\.ts/ },
  ],
  webServer: {
    // Own port and never reuse: Vite embeds the git revision at server start, so a reused
    // (older) server would stamp evidence with a stale revision.
    command: `npx vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
  },
});
