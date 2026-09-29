# Testing

| Command | What runs | Evidence class |
|---|---|---|
| `npm test` | unit tests (fake `Runtime`), incl. the Feature 004 eight-role fixture graph (`test/trading-graph.test.ts`) and the Feature 005 market-data boundary without network (`test/market-data.test.ts`, synthetic bodies; its local-replay check is skipped unless `.local/replay/*.json` exists) + Node integration (real `akarisp`, stand-in `LanguageModel`; `test/node-integration.test.ts`, `test/trading-graph-integration.test.ts`) | `DETERMINISTIC_TEST`, `NODE_INTEGRATION` |
| `npm run test:browser` | on the Next.js **production** server (`next build && next start`): canonical app `/` = eight-role graph (`e2e/app.spec.ts`: fixture mode, and live mode on **controlled** Massive responses via `page.route` — every other non-local request is aborted, dummy key only) and Feature 002 harness `/harness` (`e2e/harness.spec.ts`) in Playwright's Chromium with the stand-in; native paths must report `BLOCKED` | `BROWSER_AUTOMATED` |
| `npm run test:browser:dev` | dev smoke only (`BTA_DEV_SMOKE=1`, `next dev`): the `@dev` test checks one click = one runtime and one graph run under React Strict Mode | `BROWSER_AUTOMATED` |
| `npm run test:prompt-api` | on the same production server: canonical app `/` (fixture mode) and Feature 002 harness `/harness` in the **installed Google Chrome** with the **native Prompt API** (Gemini Nano), headless; the owner-run live test is skipped unless `BTA_MASSIVE_KEY` is set (see below) | `REAL_BROWSER_PROMPT_API`, `runner: playwright` |
| `npm run dev` | `next dev`: canonical app at `http://localhost:3000/` (Next's default port) for a manual run in your own Chrome (`?provider=standin` = stand-in, never Prompt API evidence; `?data=live` = live market data, see below) | `REAL_BROWSER_PROMPT_API`, `runner: manual` (or `BLOCKED`) |
| `npm run dev` → `/harness` | the Feature 002 harness page, `http://localhost:3000/harness` | Feature 002 record |

Other commands: `npm run build` (`next build`), `npm start` (`next start`), `npm run typecheck`
(`next typegen && tsc --noEmit`).

## Application shell (Feature 006)

- The app is a Next.js App Router application. Vite is retired. Server Components render only the
  static markup; a small client component (`components/Boot.tsx`) imports the unchanged browser
  entry (`src/main.ts`, or `harness/main.ts` for `/harness`) inside an effect, so the graph,
  AkariSP and the Prompt API run only in the browser.
- The canonical harness route is `/harness` (`app/harness/page.tsx`). `harness/index.html` is
  retained as a protected historical file; it is no longer an executable entry.
- The Feature 005 live path is still client-side (the browser calls Massive directly). There is no
  `/api/market` or any other route handler yet; a server data boundary is Feature 007
  (`007-upstream-server-data-boundary`).
- Playwright uses its own explicit port (`HARNESS_PORT`, default 5174), separate from the dev
  port. It starts exactly one server per run: the production server for `test:browser` and
  `test:prompt-api`, `next dev` only for `test:browser:dev`. The dev server is never a browser gate.
- Build output is always the default `.next` (gitignored with `next-env.d.ts`). Run one Playwright
  session per checkout; use a separate `git worktree` for parallel work. No build, dev, typegen or
  test command may modify a tracked file.
- **Revision**: `next.config.ts` reads `git rev-parse HEAD` when `next build` or `next dev` starts
  and appends `+dirty` if any code path (`src test harness e2e app components package.json
  package-lock.json next.config.ts tsconfig.json playwright.config.ts`) differs from HEAD. The
  values go to `compiler.define` as raw strings (Next quotes them itself; `JSON.stringify` would
  embed the quotes).
- **Dev hot reload**: `src/main.ts` wires the page at module evaluation, once per page load. After
  editing it under `npm run dev`, reload the page instead of relying on hot reload. The revision
  is also fixed when `next dev` starts; restart it for a fresh revision.

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
   headless on it, runs one full eight-role fixture graph on the canonical page `/` (Feature 004, native
   provider only — never the stand-in) or the harness S1–S7 (Feature 002), and deletes the clone. The record is written to
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

## Data modes (Feature 005)

Two independent choices in the canonical page URL:

| | fixture (default) | live (`?data=live`) |
|---|---|---|
| stand-in (`?provider=standin`) | `/?provider=standin` | `/?provider=standin&data=live` |
| native (default) | `/` | `/?data=live` |

- **fixture**: the committed fictional fixture (Feature 004). No market-data request is made.
- **live**: at run time, the page requests end-of-day daily bars for IBM from Massive
  (`api.massive.com`) with the key you type into the page. "Live" means *fetched at run time*, not
  real-time data. News stays a committed, company-neutral text. On success the page shows the
  snapshot (`#market`) and a local replay artifact (`#replay`). The evidence record (`#evidence`)
  holds provenance and two digests, never prices, role output text or the key.
- **Native provider only**: the Prompt API availability check runs before any market-data request.
  The stand-in never depends on it.
- **Live failure**: a live failure (no key, network, 401/403, 429, provider error, unusable data,
  timeout, Cancel) ends the run as a market-data failure before any runtime exists. It never falls
  back to the fixture.

### Key handling

- The key is read from the password field when you click Run. It is sent only as
  `Authorization: Bearer …` to `api.massive.com`, and is not stored anywhere by the app: not in
  storage, the URL, the console, the evidence or the replay artifact.
- Never put a key in source, `.env*` files or a `NEXT_PUBLIC_*` (formerly `VITE_*`) variable. A bundler environment variable
  is inlined into the JavaScript bundle; it is not secret protection.
- Chrome may offer to save the key typed into the password field. Decline it: that store is outside
  the application.

### Local replay artifact

Copy the `#replay` JSON of a successful live run into `.local/replay/<name>.json`. `.local/` is
gitignored; never commit it. It holds the normalized snapshot and `marketFacts` with their digests,
and no credential. `npm test` then checks that it re-renders to itself and matches a committed
evidence record by digest.

### Owner-run live gates (L4/L5; Massive key required)

These run only after prerequisite **P-1** is recorded (Massive's written confirmation or a licence
for personal, local, LLM-assisted analysis — `specs/005-browser-market-data-boundary/tasks.md`).
Only the key's owner runs them. The agent never handles the key.

- **L4, stand-in**: `npm run dev`, open `/?provider=standin&data=live`, type the key, Run, save
  `#evidence` unedited.
- **L5, native, Playwright runner**: the key must never appear in shell history, a process's argv,
  a file, storage, evidence or test output. Read it silently inside a subshell, export it only to
  the child process, and it is gone when the subshell exits. This was verified with a dummy value in
  zsh 5.9 and bash 3.2.

  ```bash
  # zsh
  ( read -rs "BTA_MASSIVE_KEY?Massive key: " && export BTA_MASSIVE_KEY && npm run test:prompt-api -- -g "live market data" )
  ```

  ```bash
  # bash
  ( read -rsp "Massive key: " BTA_MASSIVE_KEY && export BTA_MASSIVE_KEY && npm run test:prompt-api -- -g "live market data" )
  ```

  - Never write the key on the command line, and never run with `DEBUG=pw:api` (it prints `fill`
    values).
  - While the subshell runs, its environment is readable by the same OS user.
  - The test writes the evidence to `test-results/<port>/…/evidence.json`. It asserts that the file
    does not contain the key.
- **Checking an artifact for the real key without printing it**: run the same subshell pattern with
  `grep -rcF -f <(printf '%s\n' "$BTA_MASSIVE_KEY") <paths>`. It prints only counts. The pattern goes
  through a file descriptor (`printf` is a shell builtin), so the key never becomes a process
  argument.
