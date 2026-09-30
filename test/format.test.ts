// Feature 013 (T010, research R5): the app's Korean display of fact values; every fixture value reads back as itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { factSet } from '../src/analysis/facts.ts';
import { formatValue, krw } from '../src/analysis/format.ts';
import { claims } from '../src/analysis/grounding.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';
import { refTable } from '../src/analysis/references.ts';
import type { Holding } from '../src/portfolio.ts';

test('format: KRW in 억/만 groups, USD, percent as in the fact, units, dates', () => {
  assert.equal(krw(9_500), '9,500원');
  assert.equal(krw(95_000_000), '9,500만 원');
  assert.equal(krw(22_812_500), '2,281만 2,500원');
  assert.equal(krw(950_000_000), '9억 5,000만 원');
  assert.equal(krw(738_000), '73만 8,000원');
  assert.equal(formatValue(512.3, 'USD'), '512.30달러');
  assert.equal(formatValue(-3.95, 'pct', '-3.95'), '-3.95%');
  assert.equal(formatValue(0.25, 'BTC'), '0.25 BTC');
  assert.equal(formatValue(40, 'shares'), '40주');
  assert.equal(formatValue(310, 'kg'), '310kg');
  assert.equal(formatValue('2026-09-25', 'date'), '2026년 9월 25일');
  assert.equal(formatValue('2026-11', 'date'), '2026년 11월');
});

test('format: every number in every fixture fact set, formatted, is supported by its own fact', () => {
  for (const h of PORTFOLIO_FIXTURE.portfolio as Holding[]) {
    const facts = factSet(h).facts;
    for (const r of refTable(facts)) {
      const shown = formatValue(r.value, r.unit, r.text);
      const c = claims(shown, facts.filter((f) => f.id === r.factId));
      assert.ok(c.length >= 1 && c.every((x) => x.status === 'supported'), `${r.name} ${shown} ${JSON.stringify(c)}`);
    }
  }
});
