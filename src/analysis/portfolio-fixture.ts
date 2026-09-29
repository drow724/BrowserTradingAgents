// Feature 010 portfolio fixture (MD-8): FICTIONAL instruments, prices, market and news facts for all four asset
// classes, and a fictional portfolio over them. It is runtime input for portfolio analysis and the committed
// ground truth of the hallucination measurement. Tickers are fictional (900xxx, ZZ*); no value is real.
import type { Holding } from '../portfolio.ts';

export type InstrumentFacts = { latestPrice: number; currency: 'KRW' | 'USD'; asOf: string; market: string[]; news: string[] };

const T = '2026-09-25T00:00:00.000Z';
export const PORTFOLIO_FIXTURE = {
  id: 'portfolio-fixture@1',
  instruments: {
    BTC: { latestPrice: 91_250_000, currency: 'KRW', asOf: '2026-09-25', market: [
      'Bitcoin fell 4.1% over the last 7 days.',
      'The 30-day high was 98,400,000 KRW on 2026-09-02.',
    ], news: ['A large exchange reported a temporary withdrawal halt on 2026-09-23 (fictional).'] },
    'KRX-GOLD': { latestPrice: 148_500, currency: 'KRW', asOf: '2026-09-25', market: [
      'KRX gold spot rose 2.3% over the last 30 days.',
      'Daily trading volume averaged 310 kg over the last 20 sessions.',
    ], news: ['Central bank gold purchases were reported to continue in the third quarter (fictional).'] },
    'KR:900001': { latestPrice: 65_320, currency: 'KRW', asOf: '2026-09-25', market: [
      'The share price fell 11.2% over the last 20 sessions.',
      'The price is below its 50-day moving average of 69,800 KRW.',
      'The 52-week low is 61,500 KRW.',
    ], news: ['The company guided third-quarter operating profit 18% below the prior quarter (fictional).'] },
    'KR:900006': { latestPrice: 18_450, currency: 'KRW', asOf: '2026-09-25', market: [
      'The share price rose 27.4% over the last 20 sessions.',
      'Trading volume was 3.2 times its 20-day average on 2026-09-24.',
    ], news: ['A phase 2 trial result is expected in November 2026 (fictional).'] },
    'US:ZZSP': { latestPrice: 512.3, currency: 'USD', asOf: '2026-09-25', market: [
      'The ETF rose 1.8% over the last 20 sessions.',
      'The ETF is 2.1% below its all-time high of 523.30 USD.',
    ], news: ['Index constituents reported mixed third-quarter guidance (fictional).'] },
    'US:ZZAP': { latestPrice: 188.4, currency: 'USD', asOf: '2026-09-25', market: [
      'The share price fell 6.5% over the last 20 sessions.',
      'The stock trades at 24.3 times trailing earnings.',
    ], news: ['The company announced a 15,000,000,000 USD share buyback on 2026-09-18 (fictional).'] },
  } satisfies Record<string, InstrumentFacts>,
  portfolio: [
    { instrument: { kind: 'fixed', id: 'BTC' }, quantity: 0.25, averagePrice: 95_000_000, currency: 'KRW', editedAt: T },
    { instrument: { kind: 'fixed', id: 'KRX-GOLD' }, quantity: 50, averagePrice: 132_000, currency: 'KRW', editedAt: T },
    { instrument: { kind: 'listing', assetClass: 'KR', ticker: '900001', name: '삼성테스트전자', market: 'KOSPI', productType: 'stock' },
      quantity: 10, averagePrice: 71_000, currency: 'KRW', editedAt: T },
    { instrument: { kind: 'listing', assetClass: 'KR', ticker: '900006', name: '테스트바이오', market: 'KOSDAQ', productType: 'stock' },
      quantity: 40, averagePrice: 15_000, currency: 'KRW', editedAt: T },
    { instrument: { kind: 'listing', assetClass: 'US', ticker: 'ZZSP', name: 'Zeta S&P 500 Test ETF Trust', market: 'NYSE Arca', productType: 'etf' },
      quantity: 2.5, averagePrice: 480, currency: 'USD', editedAt: T },
    { instrument: { kind: 'listing', assetClass: 'US', ticker: 'ZZAP', name: 'Zeta Apple Test Inc.', market: 'Nasdaq', productType: 'stock' },
      quantity: 12, averagePrice: 201, currency: 'USD', editedAt: T },
  ] satisfies Holding[],
};
