# Contract: Next.js shell boundary

## Server side (this Feature)

- `app/layout.tsx`, `app/page.tsx`, `app/harness/page.tsx` are Server Components. They render
  static markup only and import no application module except `components/Boot.tsx`.
- The server evaluates no application module under `src/`, `harness/` or `test/` (FR-002, FR-003).
- No route handler, API route, middleware, server action or secret.

## Client entry

```tsx
'use client';
import { useEffect } from 'react';
export default function Boot({ entry }: { entry: 'app' | 'harness' }) {
  useEffect(() => { void (entry === 'app' ? import('../src/main.ts') : import('../harness/main.ts')); }, [entry]);
  return null;
}
```

- **Once per page load**: ES module caching makes a second effect run (Strict Mode) a no-op.
- **After hydration**: the module's DOM writes never race React.
- **No return value is used and there is no cleanup**: React unmount never touches the runtime,
  the `AbortController` or the graph. Their lifecycle belongs to `src/main.ts` as before.

## Markup contract (ids and initial states preserved)

**Canonical page `/`**:

| Kind | Elements |
|---|---|
| status and output | `#availability`, `#mode`, `#status[data-state="idle"]`, `#result`, `#runtime`, `#market`, `#evidence`, `#replay` |
| key entry | `#key-row[hidden]`, `#key` (`type=password`, `autocomplete=off`) |
| controls | `#run[disabled]` ("Run Graph"), `#cancel` ("Cancel") |
| role cells | `#node-<role>` ×8, each initially "waiting", with the same role labels |

The explanatory paragraphs of `index.html` keep their wording (Feature 005 truthful copy).

**Harness `/harness`**: `#availability`, `#run` ("Run"), `#copy` ("Copy JSON"), `#status[data-state="idle"]`,
`#evidence`, with the heading and paragraph of `harness/index.html`.

## Build-time constants (`next.config.ts`)

```ts
compiler: { define: {
  __BTA_REVISION__: revision,          // raw string: '<40-hex>' or '<40-hex>+dirty' — NOT JSON.stringify
  __AKARISP_VERSION__: version('akarisp'),
  __LANGCHAIN_CORE_VERSION__: version('@langchain/core'),
  __LANGGRAPH_VERSION__: version('@langchain/langgraph'),
} }
```

- The revision is computed at config load: `next dev` start or `next build`.
- `+dirty` when `git status --porcelain -- <code paths>` is non-empty.
  - Code paths during coexistence: `index.html src test harness e2e app components package.json package-lock.json vite.config.ts next.config.ts tsconfig.json playwright.config.ts`.
  - After retirement: `src test harness e2e app components package.json package-lock.json next.config.ts tsconfig.json playwright.config.ts`.

## Build output and provenance

- The canonical Next output is the **default `.next`** (dev output in `.next/dev`). There is no
  custom or per-port `distDir`, so no `distDir` key in `next.config.ts`. A custom `distDir` makes
  Next rewrite the tracked `tsconfig.json` (research R9, rejected).
- `tsconfig.json` includes exactly `.next/types/**/*.ts` and `.next/dev/types/**/*.ts` and has
  `"exclude": ["node_modules"]` (F006-001), so Next never edits it.
- **No build, dev, typegen or test command may modify a tracked code-path file.** Gates check
  `git status --porcelain -- <code paths>` after running.
- Playwright starts exactly one server per invocation: production (`next build && next start`) by
  default, or `next dev` only under `BTA_DEV_SMOKE=1`.

## Client boundary vs evaluation timing

`'use client'` makes `Boot` a React client component. App Router still prerenders client components
on the server. The browser bootstrap (`src/main.ts`, `harness/main.ts`) stays off the server because
it is imported **dynamically inside `useEffect`**, which delays its evaluation until the effect runs
in the browser. A static import, even inside `'use client'`, is evaluated during prerender (spike:
`ReferenceError: location is not defined`).

## Forbidden

- Marking `src/**`, `harness/**` or `test/**` modules `'use client'`, or importing them statically
  (including side-effect imports) from any module under `app/` or `components/`. Checked by the
  static boundary scan (research R12a).
- Moving any `src/main.ts` responsibility into React state, effects or cleanup.
- A route handler, a root `middleware.*` or `proxy.*`, `output: 'export'`, a custom server, or a
  custom `distDir`.
