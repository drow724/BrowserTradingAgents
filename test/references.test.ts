// Feature 013 (T011, research R3/R4): reference names, fact annotation, rendering and violations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { factSet } from '../src/analysis/facts.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';
import { annotate, refTable, render } from '../src/analysis/references.ts';
import { identity, type Holding } from '../src/portfolio.ts';

const btc = factSet((PORTFOLIO_FIXTURE.portfolio as Holding[]).find((h) => identity(h.instrument) === 'BTC')!);
const table = refTable(btc.facts);
const name = (n: string) => table.find((r) => r.name === n)!;

test('refs: one number → fact id; several → id + a, b; dates count; unique names', () => {
  assert.equal(name('H3').value, 95_000_000);
  assert.equal(name('D1a').value, '2026-09-25');
  assert.equal(name('D1b').value, 91_250_000);
  assert.equal(name('D2').text, '-3.95');
  assert.equal(new Set(table.map((r) => r.name)).size, table.length);
  assert.ok(!table.some((r) => r.factId === 'H1')); // "Holding: Bitcoin (BTC)…" has no number
  const d1 = btc.facts.find((f) => f.id === 'D1')!;
  assert.equal(annotate(d1, table), 'Latest price (2026-09-25 {D1a}): 91,250,000 KRW {D1b}.');
});

test('render: references become formatted values; violations are typed', () => {
  const r = render('평균 매입가 {H3} 대비 {d2} 하락했고 현재 가치는 { D3 }입니다.', table);
  assert.equal(r.rendered, '평균 매입가 9,500만 원 대비 -3.95% 하락했고 현재 가치는 2,281만 2,500원입니다.');
  assert.deepEqual(r.refs.map((x) => x.name), ['H3', 'D2', 'D3']);
  assert.deepEqual(r.violations, []);
  for (const x of r.refs) assert.ok(r.rendered.slice(x.start, x.end).length > 0);
  const v = render('가치는 {D9}이고 손실률은 D2이며 가격은 9억 원입니다.', table);
  assert.deepEqual(v.violations.map((x) => [x.kind, x.text]),
    [['unknown-reference', '{D9}'], ['unbraced-reference', 'D2'], ['bare-number', '9억 원']]);
});

test('render: numbers from the question and small counts are allowed', () => {
  const r = render('10주를 더 사면 20주가 됩니다. 세 가지 이유가 있습니다.', table, '10주 더 사면 20주가 되나요?');
  assert.deepEqual(r.violations, []);
});
