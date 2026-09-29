# Data Model: Feature 009

## Portfolio (browser only — `localStorage["bta.portfolio"]`)

```ts
type Portfolio = { version: 1; onboardedAt: string /* ISO time */; holdings: Holding[] };
type Holding = {
  instrument: InstrumentRef;
  quantity: number;      // > 0, finite
  averagePrice: number;  // > 0, finite
  currency: 'KRW' | 'USD';
  editedAt: string;      // ISO time
};
type InstrumentRef =
  | { kind: 'fixed'; id: 'BTC' | 'KRX-GOLD' }
  | { kind: 'listing'; assetClass: 'KR' | 'US'; ticker: string; name: string; market: string; productType: ProductType };
```

Rules (FR-005..FR-011, clarifications):

| Asset | Quantity | Decimals | Currency |
|---|---|---|---|
| BTC | BTC | ≤ 8 | KRW or USD (chosen per holding) |
| KRX-GOLD | grams | ≤ 2 | KRW (per gram) |
| KR listing | shares | 0 | KRW |
| US listing | shares | ≤ 6 | USD |

- Limits: quantity ≤ 1e12, averagePrice ≤ 1e12; otherwise rejected with a reason.
- Identity: `BTC`, `KRX-GOLD`, or `assetClass + ticker`. One holding per identity (FR-010).
- A listing holding keeps its name/market/productType as entered; if the ticker is absent from a later
  directory it is shown "not in current directory" (edge case), never removed.
- Absent key → first visit. A document that fails to parse or has `version ≠ 1` → "unreadable
  portfolio" state: offer reset or keep read-only; anomaly logged to console only.
- Interrupted onboarding writes nothing; `onboardedAt` is set only when onboarding finishes (FR-003).
- Reset removes the key (FR-011).

## Symbol directory

Server and browser share one shape (`/api/directory` body):

```ts
type Directory = {
  fetchedDay: string;               // Asia/Seoul date the server built this response, YYYY-MM-DD
  sources: SourceStatus[];
  entries: Entry[];                 // compact rows, see contracts/directory-api.md
};
type SourceStatus = {
  id: 'kr-data-go-kr' | 'us-nasdaq-trader';
  asOf: string | null;              // the source's own date (basDt / File Creation Time)
  status: 'ok' | 'stale' | 'unavailable' | 'credential-missing';
  attribution: string;              // shown in the search screen
};
type Entry = [assetClass: 'KR' | 'US', productType: ProductType, name: string, ticker: string, market: string];
type ProductType = 'stock' | 'preferred' | 'etf' | 'etn' | 'reit';
```

- `stale`: a refresh today failed and the last good copy (older `asOf`) is served.
- `unavailable`: no good copy ever; entries of that source are absent.
- Markets: KR `KOSPI | KOSDAQ | KONEX`; US `Nasdaq | NYSE | NYSE American | NYSE Arca | Cboe BZX | IEX`.
- Browser copy: the last complete response in Cache Storage (`bta-directory`), plus the parsed array in
  memory. Replaced only after a full successful parse.

## Search

`search(entries, query, limit = 20)`: case-insensitive, whitespace-trimmed; matches ticker prefix first,
then name substring; KR names matched as typed (no jamo decomposition). Pure function.

## View and office (reused, not redefined)

- `ViewState` and `reduce` from Feature 008 (`src/view/view-state.ts`), unchanged.
- **Office scene** (`src/view/office-scene.ts`, data only): world size, eight desk positions in role
  order, decoration list, sprite sheet descriptors:

```ts
type SheetLayout = { src: string; frameW: number; frameH: number; row: number; stand: number; work: number[] };
```

- **Narration** (`src/view/narration.ts`): `narrate(prev: ViewState, next: ViewState): string[]` — one
  Korean line per run or role state change, in ROLES order; role names in English. Never mentions
  queued/inferring per role.

| Change | Line |
|---|---|
| run → running | `새 분석을 시작합니다.` |
| role → working | `{role}가 작업을 시작했습니다.` |
| role → completed | `{role}가 작업을 마쳤습니다.` |
| role → failed | `{role}에서 오류가 발생했습니다.` |
| role → cancelled | `{role}의 작업이 취소되었습니다.` |
| role → stopped | `{role}가 오류로 멈췄습니다 (실패/취소 구분 불가).` |
| role → not-run | `{role}는 실행되지 않았습니다.` |
| run → completed / failed / cancelled / not-run | `분석이 끝났습니다.` / `분석이 실패했습니다 ({stage}).` / `분석이 취소되었습니다 ({stage}).` / `분석을 시작할 수 없습니다.` |

(Particle `가/는` is fixed per line; role names are English, so no batchim rule applies.)
