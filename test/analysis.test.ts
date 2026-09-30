// Feature 010 L1 (T004, T006, T018): fact sets, the graph input, demo prompt identity, question resolution.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { factSet, toInput } from '../src/analysis/facts.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';
import { FIXTURE, NEUTRAL_NEWS } from '../src/graph/trading-fixture.ts';
import type { Holding } from '../src/portfolio.ts';
import { capturePrompts } from './demo-prompts.ts';

const P = PORTFOLIO_FIXTURE.portfolio as Holding[];
const byId = (id: string) => P.find((h) => (h.instrument.kind === 'fixed' ? h.instrument.id : `${h.instrument.assetClass}:${h.instrument.ticker}`) === id)!;
const text = (s: ReturnType<typeof factSet>, id: string) => s.facts.find((f) => f.id === id)?.text;

test('facts: every asset class; derived values computed by the app; ids unique', () => {
  const kr = factSet(byId('KR:900001'));
  assert.equal(text(kr, 'H1'), 'Holding: 삼성테스트전자 (900001), Korean listing.');
  assert.equal(text(kr, 'H2'), 'Quantity held: 10 shares.');
  assert.equal(text(kr, 'H3'), 'Average purchase price: 71,000 KRW.');
  assert.equal(text(kr, 'D1'), 'Latest price (2026-09-25): 65,320 KRW.');
  assert.equal(text(kr, 'D2'), 'Unrealised change vs. average purchase price: -8.00%.');
  assert.equal(text(kr, 'D3'), 'Position value at the latest price: 653,200 KRW.');
  assert.equal(text(factSet(byId('US:ZZSP')), 'D2'), 'Unrealised change vs. average purchase price: +6.73%.');
  assert.equal(text(factSet(byId('US:ZZSP')), 'D3'), 'Position value at the latest price: 1,280.75 USD.');
  assert.equal(text(factSet(byId('BTC')), 'H2'), 'Quantity held: 0.25 BTC.');
  assert.equal(text(factSet(byId('KRX-GOLD')), 'H3'), 'Average purchase price: 132,000 KRW per g.');
  for (const h of P) {
    const s = factSet(h);
    assert.equal(new Set(s.facts.map((f) => f.id)).size, s.facts.length);
    assert.ok(s.facts.some((f) => f.kind === 'derived'), s.holding);
  }
});

test('facts: no fixture entry (or another currency) → explicit "not available", no derived facts, nothing invented', () => {
  const real: Holding = { instrument: { kind: 'listing', assetClass: 'KR', ticker: '005930', name: '삼성전자', market: 'KOSPI', productType: 'stock' },
    quantity: 3, averagePrice: 70000, currency: 'KRW', editedAt: '2026-09-29T00:00:00.000Z' };
  for (const h of [real, { ...byId('BTC'), currency: 'USD' as const }]) {
    const s = factSet(h);
    assert.deepEqual(s.facts.filter((f) => f.kind === 'derived'), []);
    assert.deepEqual(s.facts.filter((f) => f.kind === 'market').map((f) => f.text), ['Market data not available (시장 데이터 없음).']);
    assert.equal(s.facts.length, 5);
  }
});

test('toInput: holding facts, market, news and the question in the graph input', () => {
  const h = byId('KR:900001');
  const i = toInput(factSet(h), h, '삼성테스트전자 괜찮을까요?');
  assert.equal(i.subject, '삼성테스트전자 (900001)');
  assert.match(i.holdingFacts!, /Average purchase price: 71,000 KRW\. \(fact H3\)/);
  assert.match(i.marketFacts, /\(fact M3\)$/);
  assert.equal(i.question, '삼성테스트전자 괜찮을까요?');
});

// T006: demo prompts are byte-identical to e9b2425; portfolio runs add exactly the planned lines.
test('prompts: demo fixture and live inputs unchanged since e9b2425 (FR-007)', async () => {
  const snap = JSON.parse(readFileSync('test/fixtures/grounding/demo-prompts@e9b2425.json', 'utf8'));
  assert.deepEqual(await capturePrompts(FIXTURE), snap.fixture);
  assert.deepEqual(await capturePrompts({ id: 'live-market@2', subject: 'International Business Machines Corp. (IBM)',
    marketFacts: 'MARKET FACTS PLACEHOLDER', newsFacts: NEUTRAL_NEWS.text }), snap.live);
});

test('prompts: a portfolio input adds holding facts to five roles, the question and the Korean instruction to the final role only', async () => {
  const h = byId('KR:900001');
  const prompts = await capturePrompts(toInput(factSet(h), h, '괜찮을까요?'));
  const has = (p: string, s: string) => p.includes(s);
  // call order: market, news, bull, bear, research manager, trader, risk, final
  assert.deepEqual(prompts.map((p) => has(p, 'Holding facts: ')), [true, false, false, false, true, true, true, true]);
  assert.deepEqual(prompts.map((p) => has(p, 'User question: ')), [false, false, false, false, false, false, false, true]);
  assert.deepEqual(prompts.map((p) => has(p, 'Answer the user\'s question in Korean')), [false, false, false, false, false, false, false, true]);
});

// Feature 013 T016: number modes change only the final role; current is Feature 010 byte for byte.
test('prompts: number modes — current = Feature 010; formatted/refs change the final role only', async () => {
  const h = byId('BTC'), s = factSet(h);
  const base = await capturePrompts(toInput(s, h, '비트코인 괜찮을까요?'));
  assert.deepEqual(await capturePrompts(toInput(s, h, '비트코인 괜찮을까요?', 'current')), base);
  for (const mode of ['formatted', 'refs'] as const) {
    const p = await capturePrompts(toInput(s, h, '비트코인 괜찮을까요?', mode));
    assert.deepEqual(p.slice(0, 7), base.slice(0, 7), mode);
    assert.ok(p[7].includes('Facts: ') && !p[7].includes('Holding facts: '), mode);
    assert.ok(p[7].includes('98,400,000 KRW'), mode); // market facts reach the final role
  }
  const f = await capturePrompts(toInput(s, h, 'q', 'formatted'));
  assert.ok(f[7].includes('95,000,000 KRW (9,500만 원)') && !f[7].includes('{H3}') && !f[7].includes('Never write a number'));
  const r = await capturePrompts(toInput(s, h, 'q', 'refs'));
  assert.ok(r[7].includes('95,000,000 KRW {H3}') && r[7].includes('Never write a number yourself'));
});

// T018: question → holdings.
import { resolve } from '../src/analysis/resolve.ts';
import type { Entry } from '../src/directory/parse.ts';

test('resolve: every committed question resolves to its expected holdings (SC-001 input)', () => {
  const { questions } = JSON.parse(readFileSync('test/fixtures/grounding/questions.json', 'utf8')) as { questions: { id: string; text: string; expect: string[] }[] };
  for (const q of questions) assert.deepEqual(resolve(q.text, P), { kind: 'holdings', identities: q.expect }, q.id);
});

test('resolve: longest match, ticker only, not held, none, empty portfolio', () => {
  const pref: Holding = { ...byId('KR:900001'), instrument: { kind: 'listing', assetClass: 'KR', ticker: '900002', name: '삼성테스트전자우', market: 'KOSPI', productType: 'preferred' } };
  const both = [...P, pref];
  assert.deepEqual(resolve('삼성테스트전자우 어때요?', both), { kind: 'holdings', identities: ['KR:900002'] });
  assert.deepEqual(resolve('삼성테스트전자 어때요?', both), { kind: 'holdings', identities: ['KR:900001'] });
  assert.deepEqual(resolve('900006 어때요?', P), { kind: 'holdings', identities: ['KR:900006'] });
  const dir: Entry[] = [['US', 'stock', 'Apple Inc.', 'AAPL', 'Nasdaq'], ['KR', 'stock', '한빛가상화학', '900003', 'KOSPI']];
  assert.deepEqual(resolve('AAPL 사도 될까요?', P, dir), { kind: 'not-held', name: 'Apple Inc.' });
  assert.deepEqual(resolve('한빛가상화학 전망은?', P, dir), { kind: 'not-held', name: '한빛가상화학' });
  assert.deepEqual(resolve('AAPL 사도 될까요?', P), { kind: 'choose' }); // no directory → picker (FR-003)
  assert.deepEqual(resolve('요즘 시장 어때요?', P, dir), { kind: 'choose' });
  assert.deepEqual(resolve('전체 점검', []), { kind: 'choose' });
});

test('Feature 016 FR-020: semantic mismatches are reported per answer but do not change the clean-answer rate', async () => {
  const { aggregate } = await import('../src/analysis/report.ts');
  const run = (mismatch: number) => ({ question: 'q', kind: 'single' as const, holding: 'h', outcome: 'success', unsupported: 0, unrecognised: 0, language: 'ko', ms: 1, mismatch });
  const a = aggregate([run(0), run(1), run(0), run(2)]);
  assert.equal(a.zeroUnsupportedRate, 1);
  assert.equal(a.semanticMismatchPerAnswer, 0.75);
  assert.equal(aggregate([{ ...run(0), mismatch: undefined }]).semanticMismatchPerAnswer, undefined);
});

test('Feature 016 A-016-1: the final role is told where the evidence stops (valuation, long-term outlook)', async () => {
  const src = (await import('node:fs')).readFileSync('src/graph/trading-graph.ts', 'utf8');
  assert.match(src, /do not call the stock under- or ' \+\s*'overvalued or state a long-term outlook unless the facts contain such evidence; if they do not, say that the evidence ' \+\s*'is insufficient\./);
});

test('Feature 017 F017-R1: unsupported interpretation claims are reported per answer, apart from the verdict input', async () => {
  const { aggregate } = await import('../src/analysis/report.ts');
  const { ground } = await import('../src/analysis/grounding.ts');
  const { factSet } = await import('../src/analysis/facts.ts');
  const { PORTFOLIO_FIXTURE } = await import('../src/analysis/portfolio-fixture.ts');
  const h = PORTFOLIO_FIXTURE.portfolio.find((x) => x.instrument.id === 'BTC')!;
  const answer = '비트코인의 장기적인 근본 요인이 긍정적이므로 보유를 유지합니다.';
  const c = ground([], answer, factSet(h as never).facts).counts;
  assert.deepEqual([c.unsupported, c.interpretationUnsupported], [0, 1]);
  const run = (interpretation: number) => ({ question: 'q', kind: 'single' as const, holding: 'h', outcome: 'success', unsupported: 0, unrecognised: 0, language: 'ko', ms: 1, interpretation });
  const a = aggregate([run(1), run(0)]);
  assert.equal(a.zeroUnsupportedRate, 1);
  assert.equal(a.interpretationUnsupportedPerAnswer, 0.5);
});
