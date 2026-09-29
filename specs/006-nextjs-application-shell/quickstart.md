# Quickstart: Feature 006 validation

## After migration (target state)

```bash
npm ci
npm run dev          # next dev — http://localhost:3000/ (Next's default port; the Vite dev port 5173 is gone). Harness: /harness
npm run build        # next build
npm start            # next start
npm run typecheck    # next typegen && tsc --noEmit
npm test             # unchanged: 62 (61 pass, 1 intended skip)
npm run test:browser # canonical: Playwright on next build + next start only (explicit test port, default 5174)
npm run test:browser:dev  # dev smoke only: BTA_DEV_SMOKE=1, Playwright on next dev (the @dev test)
npm run test:prompt-api -- -g "eight-role"   # installed Chrome, native + fixture, clean revision
```

URLs are unchanged: `/?provider=standin`, `/`, `/?provider=standin&data=live`, `/?data=live`. The
harness is at `/harness?provider=standin` (a Next App Router route). `harness/index.html` is retained
as a protected historical file and is no longer an executable entry.

Build output is always the default `.next`. After any command below, tracked code paths must stay
unmodified (`git status --porcelain -- <code paths>` empty). Run one Playwright session per
checkout; use a separate `git worktree` for parallel work.

## Checkpoint checks

| Checkpoint | Check | Expected |
|---|---|---|
| A | baseline gates on Vite; baseline evidence saved; protected hashes recorded | 62 / 28; hashes listed |
| B | `npm run next:build` | build OK; `/` and `/harness` prerendered; no browser-API evaluation |
| C | browser test (a) + harness on `next start`; evidence comparison ([contracts/evidence-equivalence.md](contracts/evidence-equivalence.md)) | equal except allowed fields; revision format OK |
| D | full `npm run test:browser` (prod) ×3; `npm run test:browser:dev` | all prior tests pass; creates = 1 per click in dev; no dev server during prod runs |
| E | clean vs dirty revision; M1–M3 | `+dirty` only when code paths differ; each mutation fails as designed, then restored |
| F | approval commit; `npm run test:prompt-api -- -g "eight-role"` | `REAL_BROWSER_PROMPT_API`, 8/8, 8/0, settled, no `+dirty` |
| G | remove Vite files/scripts/dependency; all automated gates again | one canonical app; all pass |
| H | approval commit; native gate again at the final revision; hash re-check | as F; historical files unchanged |

No credential of any kind is needed at any step.
