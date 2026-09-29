// Feature 010 L1 (T030): the paper-trade ledger — validation, guarded storage, delete-only, portfolio untouched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addTrade, LEDGER_KEY, loadLedger, removeTrade, saveLedger, tradeError, type PaperTrade } from '../src/ledger.ts';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }; };
const trade = (o: Partial<PaperTrade> = {}): PaperTrade => ({ id: 't1', at: '2026-09-29T00:00:00.000Z', holding: 'KR:900001', name: '삼성테스트전자',
  action: 'hold', quantity: 0, priceBasis: { value: 65320, currency: 'KRW', source: 'latest-fixture' }, question: 'q', runRef: 'r', ...o });

test('ledger: validation — buy/sell need quantity > 0, hold allows 0, positive price basis', () => {
  assert.equal(tradeError(trade()), null);
  assert.equal(tradeError(trade({ action: 'buy', quantity: 0 })), '매수·매도 수량은 0보다 커야 합니다.');
  assert.equal(tradeError(trade({ action: 'sell', quantity: 5 })), null);
  assert.equal(tradeError(trade({ quantity: -1 })), '수량은 0 이상이어야 합니다.');
  assert.equal(tradeError(trade({ action: 'buy', quantity: Number.NaN })), '매수·매도 수량은 0보다 커야 합니다.');
  assert.equal(tradeError(trade({ priceBasis: { value: 0, currency: 'KRW', source: 'average' } })), '기준 가격이 올바르지 않습니다.');
});

test('ledger: storage round trip, unreadable, unavailable; only its own key; delete-only', () => {
  const s = mem();
  assert.deepEqual(loadLedger(s), { state: 'ok', ledger: { version: 1, entries: [] } });
  let l = addTrade({ version: 1, entries: [] }, trade());
  l = addTrade(l, trade({ id: 't2', action: 'buy', quantity: 1 }));
  assert.equal(saveLedger(l, s), true);
  assert.deepEqual(loadLedger(s), { state: 'ok', ledger: l });
  assert.deepEqual([...s.m.keys()], [LEDGER_KEY]); // never bta.portfolio
  assert.deepEqual(removeTrade(l, 't1').entries.map((e) => e.id), ['t2']);
  s.m.set(LEDGER_KEY, '{nope');
  assert.deepEqual(loadLedger(s), { state: 'unreadable' });
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(loadLedger(broken), { state: 'unavailable' });
  assert.equal(saveLedger(l, broken), false);
});
