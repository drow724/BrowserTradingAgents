// Feature 010 L1 (T013): the grounding checker against the committed labelled claims (SC-002), determinism, speed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { factSet } from '../src/analysis/facts.ts';
import { claims, ground } from '../src/analysis/grounding.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';
import { identity, type Holding } from '../src/portfolio.ts';

const holdings = PORTFOLIO_FIXTURE.portfolio as Holding[];
const holding = (id: string) => holdings.find((h) => identity(h.instrument) === id)!;
const tickerOf = (h: Holding) => (h.instrument.kind === 'fixed' ? h.instrument.id : h.instrument.ticker);
type Case = { holding: string; text: string; known: string[]; expect: { text: string; status: string }[] };
const { cases } = JSON.parse(readFileSync('test/fixtures/grounding/claims.json', 'utf8')) as { cases: Case[] };

test('SC-002: 100 % agreement with ≥ 60 labelled claims', () => {
  assert.ok(cases.reduce((n, c) => n + c.expect.length, 0) >= 60);
  let agreed = 0;
  for (const c of cases) {
    const h = holding(c.holding);
    const got = claims(c.text, factSet(h).facts, [tickerOf(h), ...c.known]).map((x) => ({ text: x.text, status: x.status }));
    assert.deepEqual(got, c.expect, c.text);
    agreed += got.length;
  }
  assert.ok(agreed >= 60);
});

test('every status and claim type is represented in the labelled set', () => {
  const all = cases.flatMap((c) => c.expect.map((e) => e.status));
  for (const s of ['supported', 'unsupported', 'unrecognised']) assert.ok(all.includes(s), s);
});

test('determinism, offsets, counts and speed (< 50 ms for 3,000 characters)', () => {
  const h = holding('KR:900001'), facts = factSet(h).facts;
  const answer = '평단 71,000원 대비 현재가 64,000원입니다. 칠만 천원은 틀린 표기입니다.';
  const a = ground([{ role: 'finalDecisionMaker', text: answer }], answer, facts, ['900001']);
  assert.deepEqual(a, ground([{ role: 'finalDecisionMaker', text: answer }], answer, facts, ['900001']));
  assert.deepEqual(a.counts, { supported: 1, unsupported: 1, semanticMismatch: 0, unrecognised: 1, interpretationUnsupported: 0 });
  for (const c of a.answer) assert.equal(answer.slice(c.start, c.end), c.text);
  const big = 'The price 65,320 KRW is 8.00% below 71,000 KRW on 2026-09-25 for 900001. '.repeat(45).slice(0, 3000);
  const t0 = performance.now();
  ground([{ role: 'x', text: big }], big, facts, ['900001', ...Array.from({ length: 13000 }, (_, i) => `Z${i}`)]);
  assert.ok(performance.now() - t0 < 50, `${performance.now() - t0} ms`);
});

// T023: measurement aggregate, trap rule, verdict boundaries.
import { aggregate, trapHandled, verdict, type MeasureRun } from '../src/analysis/report.ts';

const run = (o: Partial<MeasureRun>): MeasureRun => ({ question: 'q', kind: 'single', holding: 'BTC', outcome: 'success',
  unsupported: 0, unrecognised: 0, language: 'ko', ms: 1, ...o });

test('report: trap rule — a committed "not available" phrasing and zero unsupported claims', () => {
  assert.equal(trapHandled('배당금 정보는 자료에 없습니다.', 0), true);
  assert.equal(trapHandled('The facts do not contain the dividend.', 0), true);
  assert.equal(trapHandled('배당금은 1,200원입니다.', 1), false);
  assert.equal(trapHandled('자료에 없지만 약 1,200원입니다.', 1), false); // hedged fabrication is not handled
  assert.equal(trapHandled('배당금은 높은 편입니다.', 0), false);
  // Feature 013 FR-001: Korean refusals from the Feature 010 native answers.
  for (const t of ['제공된 정보에는 ZZSP의 운용보수에 대한 내용이 없습니다.', '부채비율이 명시되어 있지 않습니다.',
    '내년 목표가는 제공된 정보에 나와 있지 않습니다.', '따라서 답변할 수 없습니다.', '배당금에 대한 답변을 드릴 수 없습니다.',
    '배당금 액수를 말씀드릴 수 없습니다.']) assert.equal(trapHandled(t, 0), true, t);
});

test('report: rates over completed runs; failed runs counted separately', () => {
  const a = aggregate([run({}), run({ unsupported: 2 }), run({ outcome: 'failed', unsupported: 9 }),
    run({ kind: 'trap', trapHandled: true }), run({ kind: 'trap', trapHandled: false, language: 'en' })]);
  assert.deepEqual(a, { runs: 5, completed: 4, failed: 1, zeroUnsupportedRate: 0.75, unsupportedPerAnswer: 0.5,
    unrecognisedPerAnswer: 0, trapRuns: 2, trapHandledRate: 0.5, koreanRate: 0.75 });
});

test('report: verdict boundaries (SC-007); stand-in is NOT_APPLICABLE', () => {
  const v = (z: number, t: number) => verdict({ ...aggregate([]), zeroUnsupportedRate: z, trapHandledRate: t }, 'REAL_BROWSER_PROMPT_API');
  assert.equal(v(0.9, 0.8), 'USABLE');
  assert.equal(v(0.899, 0.8), 'LIMITED');
  assert.equal(v(0.9, 0.799), 'LIMITED');
  assert.equal(v(0.7, 0.5), 'LIMITED');
  assert.equal(v(0.699, 0.9), 'NOT_YET');
  assert.equal(v(0.95, 0.499), 'NOT_YET');
  assert.equal(verdict({ ...aggregate([]), zeroUnsupportedRate: 1, trapHandledRate: 1 }, 'BROWSER_AUTOMATED'), 'NOT_APPLICABLE');
});
