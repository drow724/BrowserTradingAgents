// DETERMINISTIC_TEST: Feature 016 semantic grounding — fact templates, clause split and the frozen fixtures A–C
// (test/fixtures/grounding/semantic.json, frozen before the checker change; never edited to fit results).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { factSet, type Fact } from '../src/analysis/facts.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';
import { claims } from '../src/analysis/grounding.ts';
import { clauses, factSemantics, VALUE_ONLY } from '../src/analysis/semantics.ts';
import { computeIndicators, type MarketBundle, type Session } from '../src/market-bundle.ts';
import { liveInstrumentFacts } from '../src/quotes.ts';
import type { Holding } from '../src/portfolio.ts';

type Expect = { status: string; evidence: string[]; ambiguous?: boolean };
type FixClaim = { text: string; target: string; expect: Expect; spans?: { text: string; status: string }[]; hypothesis: string };
type Fixture = { id: string; subject: string; known: string[]; facts: Fact[]; claims: FixClaim[] };
const FIX: { fixtures: Fixture[] } = JSON.parse(readFileSync('test/fixtures/grounding/semantic.json', 'utf8'));
const A = FIX.fixtures[0].facts;
const sem = (id: string) => factSemantics(A.find((f) => f.id === id)!).map(({ start: _s, end: _e, ...rest }) => rest);

test('templates: fixture A facts carry metric, basis, unit and direction', () => {
  assert.deepEqual(sem('D2'), [{ metric: 'unrealised_return', basis: 'since_average_purchase', direction: 'down' }]);
  assert.deepEqual(sem('M1'), [{ metric: 'price_return', basis: 'sessions:20', direction: 'down' }]);
  assert.deepEqual(sem('M2'), [{ metric: 'moving_average', basis: 'days:50', direction: 'down' }]);
  assert.deepEqual(sem('M3'), [{ metric: 'range_high', basis: 'weeks:52' }, { metric: 'range_low', basis: 'weeks:52' }]);
  assert.deepEqual(sem('D1'), [{ metric: 'price', basis: 'latest' }]);
  assert.deepEqual(sem('N1'), [{ metric: 'news', absent: true }]);
});

test('coverage: every fact sentence the code produces (fixture and live) matches a template or is listed value-only', () => {
  const texts = new Set<string>();
  for (const h of PORTFOLIO_FIXTURE.portfolio as Holding[]) for (const f of factSet(h).facts) texts.add(f.text);
  const history: Session[] = JSON.parse(readFileSync('test/fixtures/market/history.json', 'utf8'));
  const b = { symbol: 'X', currency: 'USD', provider: 'p', adjustment: 'split-dividend', analysisDate: '2026-01-09', marketAsOf: '2026-01-08',
    acquiredAt: '', historySessions: history.length, latest: history.at(-1)!, indicators: computeIndicators(history), recent: history.slice(-30),
    range52w: { high: 200, low: 100 } } as MarketBundle;
  for (const t of liveInstrumentFacts(b).market) texts.add(t);
  texts.add('Market data not available (시장 데이터 없음).');
  const uncovered = [...texts].filter((t) => !factSemantics({ id: 'X', kind: 'market', text: t }).length && !VALUE_ONLY.some((re) => re.test(t)));
  assert.deepEqual(uncovered, []);
});

test('clause split: after verb connectives only; the US4 sentence keeps each cue with its value', () => {
  assert.deepEqual(clauses('최근 20거래일에는 7.6% 하락했고 현재가는 50일 이동평균 아래에 있습니다.').map((c) => c.text.trim()),
    ['최근 20거래일에는 7.6% 하락했고', '현재가는 50일 이동평균 아래에 있습니다.']);
  assert.equal(clauses('보고서와 그리고 20일 동안').length, 1);
});

// ---- The frozen fixtures: expected vs actual, with the mapping (SC-012) ----
const rows: string[] = [];
let agree = 0, total = 0;
const counts: Record<string, number> = {};
for (const fx of FIX.fixtures) {
  for (const c of fx.claims) {
    test(`fixture ${fx.id}: ${c.text} → ${c.target} ${c.expect.status}`, () => {
      const got = claims(c.text, fx.facts, fx.known);
      const t = got.find((x) => x.text === c.target);
      total++;
      const actual = t ? { status: t.status, evidence: t.evidence, ...(t.ambiguous ? { ambiguous: true } : {}) } : { status: '(not extracted)', evidence: [] };
      counts[actual.status] = (counts[actual.status] ?? 0) + 1;
      const ok = JSON.stringify(actual) === JSON.stringify(c.expect)
        && (c.spans ?? []).every((s) => got.find((x) => x.text === s.text)?.status === s.status);
      if (ok) agree++;
      rows.push(`| ${fx.id} | ${c.text} | ${c.target} | ${c.expect.status} [${c.expect.evidence}] | ${actual.status} [${actual.evidence}] | ${t?.reason ?? ''} |`);
      assert.deepEqual(actual, c.expect);
      for (const s of c.spans ?? []) assert.equal(got.find((x) => x.text === s.text)?.status, s.status, `span ${s.text}`);
    });
  }
}
test('summary (SC-012)', () => {
  console.log(['| Fixture | Claim | Target | Expected | Actual | Reason |', '|---|---|---|---|---|---|', ...rows].join('\n'));
  console.log('Feature 016 fixtures', JSON.stringify({ claims: total, agreement: agree, ...counts }));
});
