# Contract: Pixel Agents host (adapter side)

Upstream: `pixel-agents-hq/pixel-agents` @ `3537e140c2094761beae748592aeb92ece8edfdd` (v1.4.1, MIT),
consumed as the npm package `pixel-agents@1.4.1`. The message shapes are those of
`core/src/messages.ts` at that SHA. The adapter declares only the subset listed here, as its own
local types; no upstream file is imported or copied.

## Serving (no upstream edit)

- **Copy step**: `scripts/copy-pixel-agents.mjs` copies `node_modules/pixel-agents/dist/webview/**`
  and the required `dist/assets/**` (the T014 inventory) into `public/pixel-agents/`.
  - It runs in `predev` and `prebuild`, and explicitly before every Playwright webServer command
    (`playwright.config.ts`), because `npx next build`, `npx next start` and `npx next dev` bypass
    npm lifecycle scripts (analyze H2).
  - It never deletes or overwrites `public/pixel-agents/bta-host-shim.js`. It replaces only the
    files it copies.
- **Generated, never committed**: `.gitignore` and `.vercelignore` both list
  `public/pixel-agents/*` and `!public/pixel-agents/bta-host-shim.js`. No font rule is needed:
  T014 found that the built CSS uses the relative `../fonts/…` path and ships the font inside
  `dist/webview/fonts/` (F008-005 resolved; analyze M7).
- **`VERCEL` gate (D4)**: when `VERCEL` is set, the copy step writes nothing. With `.vercelignore`,
  no deployment path serves the upstream sprites: not git-integrated builds, and not CLI uploads of a
  local tree.
- **Font**: served from `public/pixel-agents/fonts/` as part of the `dist/webview` copy. Nothing is
  copied to `public/fonts/` (F008-005, resolved at T014).
- **`index.html` shim**: the copied `index.html` gets exactly one inserted tag before its module
  script: `<script src="./bta-host-shim.js"></script>`. `bta-host-shim.js` is a BrowserTradingAgents
  file of a few lines. It defines `acquireVsCodeApi()`, which returns `{ postMessage: m =>
  parent.postMessage({ source: 'pixel-agents', message: m }, location.origin), getState, setState }`.
  `location.origin` is the URL's origin even in a sandboxed frame (T017: `self.origin` `"null"`,
  `location.origin` = the app). The shim therefore names the parent page as the only receiver in
  both modes.
- **Unmodified upstream files**: no built JS/CSS or asset file is changed. The copy step verifies
  this by comparing the SHA-256 of every copied file except `index.html` with its source. For
  `index.html`, it verifies that the copy equals the source with exactly one inserted line, the shim
  tag (analyze L4). Any other difference is a non-zero exit.

## Host → webview (sent with `iframe.contentWindow.postMessage(msg, origin)`)

Sent once after `webviewReady`, in this order:

1. `settingsLoaded` — `soundEnabled: false`; other fields at their defaults.
2. `providerCapabilities` — `{ readingTools: [], subagentToolNames: [] }`, so no subagent characters appear.
3. `characterSpritesLoaded`, `floorTilesLoaded`, `wallTilesLoaded`, `furnitureAssetsLoaded`
   (and carpet or pet messages if the webview requires them). The payloads are PNGs from
   `public/pixel-agents/assets/`, decoded by native `createImageBitmap` + canvas into the hex arrays
   the message types define.
4. `layoutLoaded` — the package's default layout.
5. `existingAgents` — `agents: [1..8]`, `agentMeta` = palette, hueShift and seat per role
   ([data-model.md](../data-model.md) Role identity), `folderNames: {}`, `externalAgents: {}`.
6. `agentTeamInfo` per role — `agentName` = role label, `teamName: 'BrowserTradingAgents'`.

The adapter then maps each view-state change to messages, as a pure function over the
`ViewState` diff:

| Role view state | Messages |
|---|---|
| `idle`, `waiting` | `agentToolsClear`; `agentStatus{status: 'active'}` is **not** sent |
| `working` | `agentStatus{active}` + `agentToolStart{toolId: 'bta-<node>', status: 'working (graph)'}` |
| `completed` | `agentToolDone{bta-<node>}` + `agentStatus{waiting}` (the upstream "Done" bubble) |
| `failed`, `cancelled`, `stopped`, `not-run` | `agentToolsClear` + `agentToolStart{toolId: 'bta-<node>-end', status: '<state>'}` with no active status (status text only; `stopped` → `error (unclear)`) |

Only `working` produces the typing animation. No state implies model inference on the canvas, and
queued and inferring are never sent (F008-O1).

## Webview → host

| Message | Host action |
|---|---|
| `webviewReady` | send the start sequence above, then the current view state |
| anything else (`launchAgent`, `closeAgent`, `focusAgent`, `saveLayout`, `saveAgentSeats`, `setHooksEnabled`, …) | ignored; counted in a test-visible counter |

Observed at T017:
- `webviewReady` is sent at boot.
- `saveAgentSeats` is sent automatically after `existingAgents`.
- `launchAgent` is sent when "+ Agent" is clicked.
- Settings sends nothing: it opens a local modal.


Acceptance:
- `event.source === iframe.contentWindow`
- `data.source === 'pixel-agents'`
- `data.message.type` is a string
- same-origin mode only: `event.origin === location.origin`

Everything else is dropped silently. No webview message can reach the graph, the Run control, market
acquisition or the runtime. This is enforced by test (T026): after clicking the webview's own
controls ("+ Agent", Settings), graph runs, `/api/market` requests and model requests are all 0
(analyze M6).

## Mounting

- **On demand (D5, F008-011)**: nothing below happens until the user enables the host-owned
  "Show Pixel Agents" control. It is off by default, it is session state only (never stored), and it
  is unavailable under reduced motion. Turning it off unmounts the iframe at once, even during a run.
  The rows below apply only while it is enabled.
- **Presentation lifecycle (F008-011, while enabled)**:
  - The iframe exists only while the observed run is `running` **and** its area is in the viewport
    (IntersectionObserver).
  - An idle or terminal run (completed, failed, cancelled, not run), or an off-screen area, means no
    iframe. There is no timer or grace period.
  - On remount, the current view state is sent after `webviewReady`.
  - The webview check, the adapter and the decoded sprites are loaded once per view and reused.
  - This lifecycle only reads view state. It never affects execution.
- **Compact viewport (F008-011)**: CSS `width: 100%; max-width: 480px; aspect-ratio: 3/2`. The upstream
  canvas backing store follows the iframe viewport: 900×600 before, 480×320 after, and 359×239 at a
  375 px page width (measured; it is not a CSS transform).
- **Reduced motion**: with `prefers-reduced-motion: reduce`, no iframe is created. The text panel
  shows all states (F008-006).
- **Disabled view**: `?viz=off` creates neither the iframe nor the observer.
- **Missing webview (D4 fallback)**: a same-origin `HEAD /pixel-agents/index.html` that is not 200
  means no iframe, and the view is text-only. It is neither a build error nor a runtime error.
- **Iframe attributes**: `src="/pixel-agents/index.html"`, plus a title for screen readers. The
  iframe is decorative. The text panel is the accessible source.
- **Sandbox (C0 result, analyze M6; maintainer confirmation requested)**:
  - **Recommended**: `sandbox="allow-scripts"` without `allow-same-origin`. The frame has an opaque
    origin, and `parent.document` throws `SecurityError` (T017, measured).
  - **Required serving header (F008-007)**: the upstream `index.html` loads its JS and CSS with
    `crossorigin`. From an opaque origin these are CORS requests, so `/pixel-agents/:path*` must be
    served with `Access-Control-Allow-Origin: *` (`next.config.ts` `headers()`).
    - Measured: without the header the boot fails (CORS errors); with it, the frame renders
      identically to same-origin mode.
    - These files are public static files already served to this page, so the header exposes
      nothing new.
  - **Host transport**: the host posts to the frame with target origin `'*'`, the only value that
    reaches an opaque origin. The payload is view state only. The host validates webview messages by
    `event.source`, and `event.origin` is `"null"`.
  - **Mode A rejected**: same-origin without a sandbox was measured to let the frame reach
    `parent.document`. The T014 grep found no such access in the upstream code, but the policy
    would not be enforced.
  - **Never used**: a sandbox that allows both scripts and same-origin gives no isolation.
