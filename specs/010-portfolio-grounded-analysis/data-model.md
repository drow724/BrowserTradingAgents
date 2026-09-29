# Data Model: Feature 010

## Analysis input (graph state input, extends Feature 004 `TradingFixture`)

```ts
type TradingFixture = { id: string; subject: string; marketFacts: string; newsFacts: string;
  holdingFacts?: string;   // portfolio runs only
  question?: string };     // portfolio runs only; read by the final role
```

## Fact set (one run)

```ts
type Fact = { id: string /* H1, D1, M1, N1 … */; kind: 'holding' | 'derived' | 'market' | 'news'; text: string };
type FactSet = { id: string; holding: string /* identity */; facts: Fact[] };
```

- Holding facts: name, ticker, asset class, quantity + unit, average price + currency.
- Derived facts (only when a latest price exists): latest price, unrealised change % (2 decimals), position value.
- No fixture entry → one market fact `시장 데이터 없음 (market data not available)`, no derived facts.
- Rendered into `holdingFacts` / `marketFacts` / `newsFacts` as `text (fact Hn)` lines, like Feature 004's tags.

## Portfolio fixture (`portfolio-fixture@1`, committed, fictional)

`{ id, instruments: Record<identity, { latestPrice, currency, asOf, market: string[], news: string[] }>, portfolio: Holding[] }`
covering BTC, KRX-GOLD, ≥ 2 KR listings, ≥ 2 US listings; the measurement portfolio uses fictional tickers.

## Question resolution

```ts
type Resolution =
  | { kind: 'holdings'; identities: string[] }      // one run each, portfolio order
  | { kind: 'not-held'; name: string }               // no run
  | { kind: 'choose' };                              // user picks before any run
```

## Claim and grounding result

```ts
type Claim = { text: string; type: 'number' | 'ticker' | 'date'; value: string /* canonical */;
  status: 'supported' | 'unsupported' | 'unrecognised'; factId?: string; start: number; end: number };
type Grounding = { byRole: Record<NodeName, Claim[]>; answer: Claim[];
  counts: { supported: number; unsupported: number; unrecognised: number } };
```

Canonical values: numbers as decimal strings with unit class (`pct`, `KRW`, `USD`, `g`, `BTC`, `shares`, none);
dates as `YYYY-MM-DD`; tickers upper-case.

## Analysis run (evidence `analysis` block)

`{ holding, question, factSetId, facts: Fact[], grounding: Grounding, answerLanguage: 'ko' | 'en' | 'mixed' }`
plus the existing record (outcome, nodes, counts, lifecycle, full `result`).

## Overview (shell state, not persisted)

`{ identities: string[]; index: number; results: { identity, outcome, finalDecision?, grounding? }[]; cancelled: boolean }`

## Paper trade (`localStorage["bta.ledger"]`, version 1)

```ts
type PaperTrade = { id: string; at: string; holding: string; name: string; action: 'buy' | 'sell' | 'hold';
  quantity: number; priceBasis: { value: number; currency: 'KRW' | 'USD'; source: 'latest-fixture' | 'average' };
  question: string; runRef: string /* evidence date + holding + time */ };
```

Rules: quantity > 0 for buy/sell (0 allowed for hold); never modifies the portfolio; deletable.

## Measurement set and report

```ts
type MeasureQuestion = { id: string; text: string; kind: 'single' | 'multi' | 'trap'; expect: string[] /* identities */ };
type MeasureReport = { evidenceClass: string; model: string; browser: string; repetitions: number;
  perQuestion: { id: string; runs: { outcome: string; unsupported: number; unrecognised: number;
    trapHandled?: boolean; language: string; ms: number }[] }[];
  aggregate: { completed: number; zeroUnsupportedRate: number; unsupportedPerAnswer: number;
    trapHandledRate: number; koreanRate: number };
  verdict: 'USABLE' | 'LIMITED' | 'NOT_YET' | 'NOT_APPLICABLE' /* stand-in */ };
```
