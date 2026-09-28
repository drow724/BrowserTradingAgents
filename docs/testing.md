# Testing

| Command | What runs | Evidence class |
|---|---|---|
| `npm test` | unit tests (fake `Runtime`), incl. the Feature 003 graph (`test/minimal-graph.test.ts`) + Node integration (real `akarisp`, stand-in `LanguageModel`; `test/node-integration.test.ts`, `test/graph-integration.test.ts`) | `DETERMINISTIC_TEST`, `NODE_INTEGRATION` |
| `npm run test:browser` | canonical app `/` (`e2e/app.spec.ts`) and Feature 002 harness `/harness/` (`e2e/harness.spec.ts`) in Playwright's Chromium with the stand-in; native paths must report `BLOCKED` | `BROWSER_AUTOMATED` |
| `npm run test:prompt-api` | canonical app `/` and Feature 002 harness `/harness/` in the **installed Google Chrome** with the **native Prompt API** (Gemini Nano), headless | `REAL_BROWSER_PROMPT_API`, `runner: playwright` |
| `npm run dev` | canonical app at `http://localhost:5173/` for a manual run in your own Chrome (`?provider=standin` = stand-in, never Prompt API evidence) | `REAL_BROWSER_PROMPT_API`, `runner: manual` (or `BLOCKED`) |
| `npm run harness` | same dev server (unchanged command); the Feature 002 harness page is now at `http://localhost:5173/harness/` | Feature 002 record |

## Real Prompt API without downloading the model again

`npm run test:prompt-api` reuses the model your Google Chrome already downloaded. It works only on
the macOS machine that has that Chrome and model (not in cloud sessions).

1. Once (and again after Chrome updates its model): build the golden profile.

   ```bash
   npm run prepare:prompt-api
   ```

   It APFS-clones `OptGuideOnDeviceModel/` from your Chrome profile (no data copied, ~0 extra disk)
   into `~/.cache/browser-trading-agents/prompt-api-profile` and writes a `Local State` containing
   only the model prefs. Nothing else is read from your Chrome profile; nothing is downloaded.

2. Run:

   ```bash
   npm run test:prompt-api
   ```

   Each test APFS-clones the golden profile into its own output folder, launches Google Chrome
   headless on it, runs the canonical minimal graph (Feature 003) or the harness S1–S7
   (Feature 002), and deletes the clone. The record is written to
   `test-results/<port>/…/evidence.json`.

- **Several sessions at once**: give each its own port —
  `HARNESS_PORT=5175 npm run test:prompt-api`. The output folder is keyed by port.
- **Override paths**: `PROMPT_API_PROFILE` (golden profile), `CHROME_USER_DATA_DIR` (source
  Chrome profile for the prepare step).
- **Why the special launch flag**: Playwright disables Chrome's `OptimizationHints` feature by
  default, which the on-device model needs. The test re-enables only that feature. Playwright's
  other defaults (no component updates, no background networking) stay on, so a test cannot start
  a model download. The list of Playwright's default disabled features is pinned to Playwright
  1.63.0; the test fails with a clear message after a Playwright upgrade until the list is updated.
- **What does not work** (probed 2026-09-28): Playwright's default launch arguments (model reports
  `downloadable`/`unavailable`), and Chrome for Testing with those arguments removed
  (`availability()` never resolves). Only the installed Google Chrome with `OptimizationHints`
  re-enabled reports `available`.
