// Feature 018: the single-role baseline (research R2, R3) and the unchanged eight-role prompts (SC-005).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { factSet, toInput } from '../src/analysis/facts.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';
import { buildSingleRoleGraph, buildTradingGraph } from '../src/graph/trading-graph.ts';
import type { AkariChatModel } from '../src/integration/akari-chat-model.ts';
import type { Holding } from '../src/portfolio.ts';

const holdings = PORTFOLIO_FIXTURE.portfolio as Holding[];
const key = (h: Holding) => (h.instrument.kind === 'fixed' ? h.instrument.id : h.instrument.ticker);
// A fake model whose output depends only on the prompt's role line, so parallel branches cannot reorder anything.
const capture = () => {
  const got: string[] = [];
  const model = { invoke: async ([m]: { content: string }[]) => { got.push(m.content); return { content: `<${m.content.split('.')[0]}>` }; } };
  return { got, model: model as unknown as AkariChatModel };
};

test('Feature 018 SC-005: the eight-role prompts equal the 4b027df snapshot in both number modes', async () => {
  const snap = JSON.parse(readFileSync('test/fixtures/prompts-4b027df.json', 'utf8'));
  for (const h of holdings) for (const mode of ['current', 'refs'] as const) {
    const { got, model } = capture();
    await buildTradingGraph(model).graph.invoke({ input: toInput(factSet(h), h, snap.question, mode) });
    assert.deepEqual(got.sort(), snap.prompts[`${key(h)}|${mode}`], `${key(h)}|${mode}`);
  }
});

test('Feature 018 FR-002: the single role reads all facts, the question and the final answer policy, in one call', async () => {
  for (const mode of ['current', 'refs'] as const) {
    const h = holdings[0], input = toInput(factSet(h), h, '괜찮은가요?', mode);
    const eight = capture();
    await buildTradingGraph(eight.model).graph.invoke({ input });
    const finalPrompt = eight.got.find((p) => p.startsWith('You are the Final Decision.'))!;
    const one = capture();
    const { graph, modelRequests } = buildSingleRoleGraph(one.model);
    const state = await graph.invoke({ input });
    assert.equal(one.got.length, 1);
    assert.equal(modelRequests.finalDecisionMaker, 1);
    assert.equal(state.finalDecision, '<You are the Final Decision>');
    const p = one.got[0];
    assert.ok(p.startsWith('You are the Final Decision. Give the final decision from these facts. Reply in plain text in at most three sentences.'));
    assert.ok(!/risk review|Risk review|Trader plan|Research decision/.test(p), mode);
    // The answer policy (and the refs instruction) is the eight-role final role's, verbatim.
    assert.ok(p.endsWith(finalPrompt.slice(finalPrompt.lastIndexOf('\n\n'))), mode);
    const lines = p.split('\n').map((l) => l.split(':')[0]);
    const want = mode === 'refs' ? ['Company', 'Facts', 'User question'] : ['Company', 'Holding facts', 'Market facts', 'News facts', 'User question'];
    assert.deepEqual(lines.filter((l) => want.includes(l)), want, mode);
    if (mode === 'current') for (const f of ['marketFacts', 'newsFacts', 'holdingFacts'] as const) assert.ok(p.includes(input[f]!), f);
    else assert.ok(p.includes(input.answerFacts!));
  }
});

test('Feature 018 R7: the decision rule — 4 of 5 pairs and a pooled gap above the within-structure spread', async () => {
  const { decide, h1 } = await import('../scripts/compare-structures.ts');
  // Eight better in 4 of 5, pooled gap 0.238 > largest within-structure spread 0.21 → better.
  assert.equal(decide({ eight: [0.1, 0.1, 0.1, 0.1, 0.2], single: [0.4, 0.4, 0.4, 0.4, 0.19] }, { eight: 0.12, single: 0.358 }, 'lower').verdict, 'eight-role better');
  // Only 3 of 5 → no difference.
  assert.equal(decide({ eight: [0.1, 0.1, 0.1, 0.5, 0.5], single: [0.3, 0.3, 0.3, 0.3, 0.3] }, { eight: 0.26, single: 0.3 }, 'lower').verdict, 'no difference');
  // 5 of 5 but the gap (0.05) is inside the spread (0.2) → no difference.
  assert.equal(decide({ eight: [0.1, 0.3, 0.2, 0.1, 0.2], single: [0.15, 0.35, 0.25, 0.15, 0.25] }, { eight: 0.18, single: 0.23 }, 'lower').verdict, 'no difference');
  // Ties are not better; higher-is-better metrics work the other way round.
  assert.equal(decide({ eight: [1, 1, 1, 1, 1], single: [1, 1, 1, 1, 1] }, { eight: 1, single: 1 }, 'higher').verdict, 'no difference');
  assert.equal(decide({ eight: [0.6, 0.6, 0.6, 0.6, 0.6], single: [0.9, 0.9, 0.9, 0.9, 0.5] }, { eight: 0.6, single: 0.82 }, 'higher').verdict, 'no difference'); // spread 0.4
  assert.equal(decide({ eight: [0.6, 0.6, 0.6, 0.6, 0.7], single: [0.9, 0.9, 0.9, 0.9, 0.8] }, { eight: 0.62, single: 0.88 }, 'higher').verdict, 'single-role better');
  assert.equal(h1({ refs: 'eight-role better', current: 'eight-role better' }, true), 'holds');
  assert.equal(h1({ refs: 'eight-role better', current: 'no difference' }, true), 'does not hold');
  assert.equal(h1({ refs: 'eight-role better', current: 'eight-role better' }, false), 'not established');
});

test('Feature 018 R7: compare joins sheet and key, counts real errors per answer and refuses unjudged items', async () => {
  const { compare } = await import('../scripts/compare-structures.ts');
  const run = (ok = true) => ({ question: 'q', kind: 'single' as const, holding: 'h', outcome: ok ? 'success' : 'failed', unsupported: 0, unrecognised: 0, language: 'ko', ms: 5, calls: 1 });
  const entries: Record<string, { report: string; run: number; structure: string; mode: string; repetition: number }> = {};
  const sheet = { entries: [] as { id: string; items: { id: string; type: 'number' | 'interpretation'; text: string; start: number; end: number; sentence: string; judgement?: 'correct' | 'real-error' | 'unsupported' }[] }[] };
  const reports: Record<string, { runs: ReturnType<typeof run>[] }> = {};
  let n = 0;
  for (const structure of ['eight-role', 'single-role']) for (let repetition = 1; repetition <= 5; repetition++) {
    const report = `${structure}-${repetition}.json`;
    reports[report] = { runs: [run(), run()] };
    for (let r = 0; r < 2; r++) {
      const id = `e${++n}`;
      entries[id] = { report, run: r, structure, mode: 'refs', repetition };
      // Single-role answers carry one real error each; eight-role answers none.
      sheet.entries.push({ id, items: [{ id: `${id}:0`, type: 'number', text: '1', start: 0, end: 1, sentence: '1',
        judgement: structure === 'single-role' ? 'real-error' : 'correct' }] });
    }
  }
  const out = compare(sheet, { seed: 1, entries }, reports, true);
  const refs = out.modes.refs as { counts: { eight: { realErrors: number }; single: { realErrors: number } }; primary: { realErrorsPerAnswer: { verdict: string } } };
  assert.deepEqual([refs.counts.eight.realErrors, refs.counts.single.realErrors], [0, 10]);
  assert.equal(refs.primary.realErrorsPerAnswer.verdict, 'eight-role better');
  assert.equal(out.h1, 'holds');
  assert.equal(compare(sheet, { seed: 1, entries }, reports, false).h1, 'not established');
  delete sheet.entries[0].items[0].judgement;
  assert.throws(() => compare(sheet, { seed: 1, entries }, reports, true), /unjudged/);
});

test('Feature 018 R5/R6: blind multi-report sheet (seeded, no forbidden fields, key one-to-one) and reliability agreement', async () => {
  const { blindSheet } = await import('../scripts/audit-sheet.ts');
  const { sample, agree } = await import('../scripts/reliability-sample.ts');
  const run = (question: string, holding: string, answer: string) => ({ question, kind: 'single' as const, holding, outcome: 'success',
    unsupported: 0, unrecognised: 0, language: 'ko', ms: 1, answer, mode: 'current' as const });
  const reports = ['eight-role', 'single-role'].map((structure, s) => ({ file: `${structure}.json`, report: { structure, mode: 'current', repetition: 1,
    runs: [run('q02', 'KR:900001', `평단 71,000원 대비 ${s ? '-8.00%' : '-9.00%'} 손실입니다.`), run('q10', 'US:ZZSP', '평가액은 1,280.75 USD입니다.')] } }));
  const a = blindSheet(reports, 7), b = blindSheet(reports, 7), c = blindSheet(reports, 8);
  assert.deepEqual(a, b);
  assert.notDeepEqual(Object.values(a.key.entries), Object.values(c.key.entries));
  assert.deepEqual(Object.keys(a.key.entries).sort(), a.sheet.entries.map((e) => e.id).sort());
  const text = JSON.stringify(a.sheet);
  for (const f of ['structure', 'mode', 'repetition', 'question', 'holding', 'status', 'reason', 'evidence', 'citation']) assert.ok(!text.includes(`"${f}":`), f);
  assert.ok(!/single-role|eight-role/.test(text));
  assert.equal(a.sheet.entries.length, 4);
  // Judge everything correct except one real error; the maintainer agrees on all but one item.
  const judged = a.sheet.entries.map((e) => ({ ...e, items: e.items.map((i) => ({ ...i, judgement: i.text === '9.00%' ? 'real-error' as const : 'correct' as const })) }));
  const s = sample(judged, 3);
  assert.equal(s.entryIds.length, 1); // ⌈10 % of 4⌉
  assert.ok(s.entries.every((e) => e.items.every((i) => (i as { judgement?: string }).judgement === undefined)));
  const all = judged.map((e) => ({ ...e, items: e.items.map((i) => ({ ...i })) }));
  const flip = all.flatMap((e) => e.items).find((i) => i.text === '9.00%')!;
  const r1 = agree(judged, all);
  assert.deepEqual([r1.agreeRealOrNot, r1.positives, r1.agreeOnPositives, r1.met], [1, 1, 1, true]);
  flip.judgement = 'correct';
  const r2 = agree(judged, all);
  assert.deepEqual([r2.positives, r2.agreeOnPositives, r2.met], [1, 0, false]);
});
