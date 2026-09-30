# Data Model: Feature 015 — Toss Securities as a Local Provider

## Sources (browser, `localStorage['bta.sources']`)

`{ holdings: 'manual' | 'toss', quotes: 'yahoo' | 'toss' }` — default `{ holdings: 'manual', quotes: 'yahoo' }`;
unreadable → default; never sent anywhere.

## Toss configuration (server environment only)

| Variable | Required | Notes |
|---|---|---|
| `BTA_TOSS_CLIENT_ID` | yes | user-issued in Toss WTS |
| `BTA_TOSS_CLIENT_SECRET` | yes | never logged, never sent to the browser |
| `BTA_TOSS_ACCOUNT_SEQ` | no | else the single account of `/api/v1/accounts`; several → `ambiguous-account` |
| `BTA_TOSS_BASE_URL` | tests only | the stand-in |

Available ⇔ client id and secret set ∧ `VERCEL` unset.

## Toss position (holdings route response, reduced)

`{ code: string; country: 'KR' | 'US' | string; name: string; quantity: string; averagePrice: string; currency: string }`
— from Toss `items[].symbol / marketCountry / name / quantity / averagePurchasePrice / currency` (spike S1); decimal
strings as Toss reports them, parsed in the browser with the manual-entry rules (`parseHolding`). No account number,
no totals, no profit/loss, no last price.

## Import result (browser)

`{ holdings: Holding[]; skipped: { name: string; reason: string }[] }` — `Holding` as Feature 009 (listing with
`market` for KR, `productType` from the directory). Skip reasons: 목록에 없는 종목, 지원하지 않는 자산, 수량 0.

## Quote source in evidence

Feature 014 `dataSource` gains the provider actually used: `provider: 'yahoo-chart@1' | 'toss-candles@1'`; the
answer line reads `시세 기준: <date> (Yahoo)` or `(토스증권)`.

## Toss failure kinds

`not-configured | unauthorized | forbidden-ip | rate-limited | provider-error | invalid-data | timeout | network |
ambiguous-account` — each with a Korean reason the user can act on.
