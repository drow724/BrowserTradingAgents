# Contract: portfolio storage and first-visit decision

- Key: `localStorage["bta.portfolio"]`; value: `Portfolio` JSON (data-model.md), `version: 1`.
- Decision on page open (synchronous, before the first shell paint):
  - key absent → onboarding
  - parses with `version === 1` → office
  - otherwise → office with an "unreadable portfolio" notice (reset / keep read-only)
  - storage throws → onboarding in session-only mode with a notice; nothing is sent anywhere
- Writes: whole document on save; onboarding writes once, at finish or skip (`holdings: []` on skip).
- Reset: after confirmation, remove the key; the next open shows onboarding.
- Privacy (FR-012): no code path serializes a holding into a request, URL, header, evidence, replay or log.
  Verified by a sentinel test over all requests and the evidence/replay text (SC-005).
- Tests: `playwright.config.ts` seeds a finished empty portfolio by default; onboarding tests start empty.
