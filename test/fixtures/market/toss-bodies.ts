// Feature 015 controlled Toss Securities responses (spike S1 shapes, FICTIONAL values). Shared by test/toss.test.ts and
// the browser stand-in (e2e/market-stub.mjs). Instruments come from the fictional directory fixtures.
import { HISTORY, sessionDates } from './stub-bodies.ts';

export const FAKE = { id: 'test-toss-id-not-real', secret: 'test-toss-secret-not-real', token: 'test-toss-token-not-real', seq: '424242', accountNo: '000-TEST-0000' };

export const TOKEN = { access_token: FAKE.token, token_type: 'Bearer', expires_in: 86_399 };
export const accounts = (n = 1) => ({ result: Array.from({ length: n }, (_, i) => ({ accountNo: FAKE.accountNo, accountSeq: Number(FAKE.seq) + i, accountType: 'TEST' })) });
const money = { krw: '0', usd: '0' };
export const HOLDINGS = { result: { totalPurchaseAmount: money, marketValue: { amount: money, amountAfterCost: money },
  items: [
    { symbol: '900001', name: '삼성테스트전자', marketCountry: 'KR', currency: 'KRW', quantity: '10', lastPrice: '65320', averagePurchasePrice: '70000' },
    { symbol: 'ZZAP', name: 'Zeta Apple Test Inc.', marketCountry: 'US', currency: 'USD', quantity: '2.5', lastPrice: '188.4', averagePurchasePrice: '180.123456' },
    { symbol: '999999', name: '목록에없는테스트', marketCountry: 'KR', currency: 'KRW', quantity: '1', lastPrice: '1000', averagePurchasePrice: '1000' },
    { symbol: '9999', name: 'Japan Test KK', marketCountry: 'JP', currency: 'JPY', quantity: '100', lastPrice: '1', averagePurchasePrice: '1' },
  ] } };

// Daily candles for `endDate` and before, newest first, 100 per page; `before` is an exclusive ISO timestamp cursor.
// KR candles are stamped 00:00+09:00, US ones 13:00+09:00 (= 00:00 New York), as Toss does (spike S1).
export function candles(symbol: string, endDate: string, before?: string, count = HISTORY.length) {
  const kr = /^\d{6}$/.test(symbol);
  const dates = sessionDates(endDate, count), src = HISTORY.slice(-count);
  const all = dates.map((d, i) => ({ timestamp: `${d}T${kr ? '00' : '13'}:00:00.000+09:00`, openPrice: String(src[i].open),
    highPrice: String(src[i].high), lowPrice: String(src[i].low), closePrice: String(src[i].close), volume: String(src[i].volume),
    currency: kr ? 'KRW' : 'USD' })).reverse();
  const from = before ? all.findIndex((c) => Date.parse(c.timestamp) < Date.parse(before)) : 0;
  const page = from < 0 ? [] : all.slice(from, from + 100);
  return { result: { candles: page, nextBefore: page.length === 100 ? page.at(-1)!.timestamp : '' } };
}
