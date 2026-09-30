# Quickstart: Feature 014 validation

1. `npm run typecheck && npm test` — symbol rules, 52-week range, live facts, route allowlist and cache.
2. `npm run test:browser` — includes `e2e/live-quotes.spec.ts` (stand-in): KOSPI/KOSDAQ/US live facts equal the values
   computed from the served sessions; gold and BTC make no request; failure / invalid body → "시세 없음", no fixture value;
   hang + cancel → no run within 1 s; second question on the same day → 0 stand-in requests; `quotes=fixture` →
   facts byte-identical to Feature 013 and 0 requests. Existing suites pass unchanged.
3. Manual: `npm run dev`, add a real KR and a US holding, ask about each; the answer shows `시세 기준: <date> (Yahoo)`
   and the notice. (Contacts Yahoo — local research use, Feature 007 §2.4 note.)
4. Opt-in real check (maintainer approval): `BTA_REAL_YAHOO=1 npm run test:prompt-api -- -g "real Yahoo"` with
   ≥ 5 real holdings; hand-compare every market number with Yahoo's chart for the quote date; record in
   `verification.md`.
