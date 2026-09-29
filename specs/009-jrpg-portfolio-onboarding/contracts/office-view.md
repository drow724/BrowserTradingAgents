# Contract: office view (own renderer)

Input: Feature 008 `ViewState` only (from the unchanged observer and reducer in `ExecutionView`).
Output: pixels, DOM text (name tags, dialog box). Never writes the status surface or starts/cancels runs (FR-030).

## Mounting

- Rendered by `ExecutionView` in place of the retired Pixel toggle/iframe; one observer (Feature 008 FR, `data-observers` ≤ 1).
- `?viz=off`: neither the Feature 008 view nor the office is rendered.
- Assets missing (e.g. no `public/office-art/`, public deployment): the office shows `오피스를 표시할 수 없습니다` and the text status stays; runs unaffected.

## Drawing

- World 320×192; canvas backing store = world size; CSS scales it (pixelated) to the largest fit, integer scale when possible.
- One character per role at a fixed desk (ROLES order); roles 7–8 hue-shifted 180°.
- All eight characters are always at their desks (FR-022), including before any run.
- `working` → typing frames alternate at 4 Hz and the desk PC is on; every other state → standing frame, PC off; `not-run` → the character drawn at 40 % opacity.
- Every state has a DOM name tag: `{glyph} {role name}` with a state class; glyphs from Feature 008 (`▶ ✓ ✗ ■ ! – …`), so colour is never the only signal.
- No drawing while `document.hidden`; with `prefers-reduced-motion: reduce`, no timer — one static draw per view-state change.

## Dialog box

- Shows the last two narration lines (data-model.md); `aria-live="polite"`.
- Never states role-level inference or queueing; the runtime line (`state · active · queued`) is shown separately as whole-runtime information.

## Test hooks (existing convention)

`#execution-view` keeps `data-mounts`, `data-observers`, `data-anomalies`; `data-iframes` and `data-ignored-requests` are retired. The office adds `data-office="ready|unavailable"` on its root.
