# Quickstart: Feature 009 validation

## Prerequisites

- `npm install` (installs `pixel-agents@1.4.1`, the temporary art source)
- `npm run dev` (runs the art copy first) → http://localhost:3000
- Optional, for real Korean listings: a data.go.kr service key issued by the maintainer, put in `.env.local`
  as `BTA_DATA_GO_KR_KEY=…` (server-only; never commit). Without it, Korean search shows "credential missing"
  and everything else works.

## Scenarios

1. **First visit** — fresh profile (or DevTools → Application → clear `bta.portfolio`): the Korean onboarding
   fills the screen. Add 비트코인 (KRW), KRX 금현물, one Korean stock, one US ETF; finish → office. (US1, US2)
   Time it: under 3 minutes with mouse, and again keyboard only (SC-001, maintainer check).
2. **Returning visit** — reload: office directly, eight characters at desks. (US3)
3. **Run** — press Run (stand-in: `?provider=standin`): characters type while working, tags change, the dialog
   box narrates in order; 결과 shows decision/evidence with the advice statement. Cancel mid-run. (US3, US4)
4. **Directory** — search "삼성", "KODEX", "AAPL", "SPY": results show type and market; typing sends no request
   (DevTools Network). The as-of date and attribution are visible. (US5)
5. **Privacy** — enter quantity `777777.77`; run once; search Network and the evidence/replay text for it: none. (US6)
6. **Accessibility** — keyboard only through onboarding, Run, Cancel, 결과; OS reduced motion → static office. (US7)
7. **viz=off** — `/?viz=off`: no office, text status works.

## Automated

```bash
npm run typecheck && npm run build && npm test
npm run test:browser          # controlled directory stub; no real source contacted
npm run test:prompt-api       # installed Chrome native fixture gate
```

Real-source validation (checkpoint H) runs only after explicit maintainer approval.
