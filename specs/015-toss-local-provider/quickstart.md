# Quickstart: Feature 015 validation

0. Maintainer (not the implementer): issue `client_id` / `client_secret` in Toss WTS → Settings → Open API, register
   this Mac's IP, read the terms, and put `BTA_TOSS_CLIENT_ID` / `BTA_TOSS_CLIENT_SECRET` (optionally
   `BTA_TOSS_ACCOUNT_SEQ`) into `.env.local`.
1. Spike S1 (approval): a throwaway script prints only shapes and counts of token, accounts, holdings and two
   daily-candle responses; results recorded in research.md (no values).
2. `npm run typecheck && npm test` — allowlist, no order path, mapping, candles → bundle, failures, leak checks.
3. `npm run test:browser` — `e2e/toss.spec.ts` with the fictional Toss stand-in: status, import preview → confirm →
   portfolio replaced; skipped entries; Toss quotes in the fact shape with `(토스증권)`; unavailable Toss quote →
   "시세 없음" (no Yahoo request); failures leave the portfolio unchanged; no secret in traffic, records or logs;
   without configuration no Toss option and no Toss request. Feature 014 suites unchanged.
4. Opt-in real check (approval): `BTA_REAL_TOSS=1 …` — import count and one date of Toss quotes vs the Toss app,
   recorded as counts and pass/fail only.
