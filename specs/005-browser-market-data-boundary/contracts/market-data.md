# Contract: market-data step (`src/market-data.ts`)

The step is Massive-specific and application-local. It has one caller (`src/main.ts`) and no
provider interface.

## acquireDailyBars(instrument, key, signal) → { body, meta } | MarketDataFailure

**Request**
- `GET https://api.massive.com/v2/aggs/ticker/{symbol}/range/1/day/{from}/{to}?adjusted=true&sort=asc`
- Header: `Authorization: Bearer <key>`.
- `from` = ET date 10 days before today; `to` = ET date today.
- No key in the URL. Exactly one request. No retry. No cache.
- `signal` = the run controller's signal combined with a 30 s acquisition limit (page protection
  only).

**Outcome mapping**

| Condition | Result |
|---|---|
| empty key (checked before `fetch`) | `credential-missing` |
| `fetch` rejects and the run signal was aborted | cancelled (`boundary: market-data`) |
| `fetch` rejects on the 30 s limit | `timeout` |
| `fetch` rejects otherwise (offline, DNS, CORS) | `network` |
| HTTP 401 / 403 | `unauthorized` |
| HTTP 429 | `rate-limited` |
| other non-2xx | `provider-error` |
| 2xx but body is not JSON | `invalid-data` |

`meta` = `{ requestedAt, receivedAt, httpStatus, from, to }`.

## normalize(body, instrument) → MarketSnapshot | MarketDataFailure

- `status` ≠ `OK` → `provider-error`. `OK` is the only value evidenced (official Custom Bars sample);
  the Basic plan's "End of Day" is data recency, not a status value.
- `results` missing or not an array → `invalid-data`.
- Fewer than 2 bars → `unavailable`.
- Last up to 5 bars: any `o,h,l,c` not finite or ≤ 0, `v` not a finite integer ≥ 0, or `t` not an
  integer → `invalid-data`.
- Session dates (ET, from `t`) not strictly increasing, or after `receivedAt`'s ET date →
  `invalid-data`.
- No field is defaulted or invented. Provider field names never appear in the snapshot.
- Pure: the same `body` gives a deep-equal snapshot.

## renderMarketFacts(snapshot) → string

Two sentences, tagged `(market fact L1)` and `(market fact L2)`:

> On the <asOf> close <SYMBOL> traded at <close> <CUR>, <±chg>% from the previous session's
> <prevClose> (market fact L1). Over the last <n> sessions it ranged from <low> to <high> on average
> daily volume of <avgVol> shares (market fact L2).

| Value | Rendering |
|---|---|
| prices | `toFixed(2)` |
| `chg` | `(close/prevClose − 1)·100`, `toFixed(2)` with an explicit `+`/`-` |
| `avgVol` | `Math.round(mean volume)`, no separators |

The function is pure. The output contains no provider field name and no JSON.

## snapshotDigest(snapshot), marketFactsDigest(text) → `sha256:<hex>`

`crypto.subtle.digest('SHA-256', utf8(…))`: the snapshot as `JSON.stringify` with keys in data-model
order, and the text as-is. A digest proves identity and integrity only; replay needs the local
replay artifact.

## Local replay artifact (live mode, success only)

- The page prints `{ snapshot, marketFacts, snapshotDigest, marketFactsDigest }` in `#replay`.
  There is no credential and no raw body.
- The owner may save it to the gitignored `.local/replay/`. It is never committed.
- L1 replay check (skipped when no file exists): the digests match the committed record, and
  `renderMarketFacts(snapshot) === marketFacts`.

## Deterministic checks (L1, `test/market-data.test.ts`, synthetic bodies only)

- Same body twice → equal snapshot, equal `marketFacts`, equal digest.
- Each reject row above → its kind; nothing partial is returned.
- Every non-`OK` `status` (e.g. `ERROR`, `DELAYED`, missing) → `provider-error`.
- `marketFacts` contain the sentinels and none of `"results"`, `"vw"`, `"t":`, `request_id`, `{`.
- ET date derivation is correct across a DST change and for a midnight-ET `t`.
- Live input: real subject; `newsFacts === NEUTRAL_NEWS.text`; the neutral text names no company;
  `FIXTURE` is unchanged (deep-equal to Feature 004).
