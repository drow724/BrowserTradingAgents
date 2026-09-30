// DETERMINISTIC_TEST: Feature 017 grounding precision — the frozen development set (tuned on; asserted against the
// SC targets) and fixture D (held out; scored and reported only, never asserted: its failures are findings).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { factSet, type Fact } from '../src/analysis/facts.ts';
import { claims, type Claim } from '../src/analysis/grounding.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';
import { refTable, render } from '../src/analysis/references.ts';
import { identity, type Holding } from '../src/portfolio.ts';

type Expect = { status: string; evidence?: string[]; citation?: { factId: string; fit: string } };
const DEV = JSON.parse(readFileSync('test/fixtures/grounding/precision-dev.json', 'utf8'));
const D = JSON.parse(readFileSync('test/fixtures/grounding/precision-d.json', 'utf8'));
const TICK = Object.keys(PORTFOLIO_FIXTURE.instruments).map((k) => k.split(':').at(-1)!);
const facts = (hold: string): Fact[] => factSet((PORTFOLIO_FIXTURE.portfolio as Holding[]).find((x) => identity(x.instrument) === hold)!).facts;
const known = (hold: string) => [...TICK, hold.split(':').at(-1)!];
export type Variant = 'plain' | 'cite';

// A text (or a raw refs answer, rendered as the page does) through the checker.
function check(hold: string, text: string, raw: string | undefined, variant: Variant) {
  const f = facts(hold);
  const r = raw === undefined ? { rendered: text, refs: [] } : render(raw, refTable(f));
  return { text: r.rendered, got: claims(r.rendered, f, known(hold), { citations: r.refs, variant }) };
}
const interp = (got: Claim[]) => got.find((c) => c.type === 'interpretation');

export function scoreDev(variant: Variant) {
  const m = { trueMismatch: 0, falseMismatch: 0, debatable: 0, realErrors: 0, missed: 0, rows: [] as string[] };
  for (const c of DEV.mismatches) {
    const { got } = check(c.holding, c.text, undefined, variant);
    const t = got.find((x) => x.start === c.at && x.text === c.target)!;
    const flagged = t.status === 'semantic-mismatch';
    if (c.judgement === 'real-error') { m.realErrors++; if (flagged) m.trueMismatch++; else m.missed++; }
    else if (flagged) { if (c.judgement === 'debatable') m.debatable++; else m.falseMismatch++; }
    m.rows.push(`| ${c.id} | ${c.judgement} | ${c.target} | ${t.status} | ${t.reason ?? ''} |`);
  }
  const it = { agree: 0, total: 0, rows: [] as string[] };
  for (const c of DEV.interpretations) {
    const { got } = check(c.holding, c.text, undefined, variant);
    const a = interp(got), status = a?.status ?? 'none';
    it.total++; if (status === c.expect.status) it.agree++;
    it.rows.push(`| ${c.id} | ${c.expect.status} | ${status} ${a?.kind ?? ''} [${a?.evidence ?? ''}] | ${a?.reason ?? ''} |`);
  }
  // Raw refs answers: every flagged mismatch is true (an `errors` entry), debatable, or false; citations agree or not.
  const r = { trueMismatch: 0, falseMismatch: 0, debatable: 0, realErrors: 0, missed: 0, citeAgree: 0, citeTotal: 0, rows: [] as string[] };
  for (const c of DEV.raws) {
    const { got } = check(c.holding, '', c.raw, variant);
    // An error is written as in the raw answer; a reference in it is compared in its rendered form.
    const table = refTable(facts(c.holding));
    const errOf = (x: Claim) => c.errors.find((e: { text: string }) => [e.text, render(e.text, table).rendered.trim()]
      .some((t) => t.includes(x.text) || x.text.includes(t)));
    for (const e of c.errors) if (e.judgement === 'real-error') {
      r.realErrors++;
      if (got.some((x) => (x.status === 'semantic-mismatch' || x.status === 'unsupported') && errOf(x) === e)) r.trueMismatch++; else r.missed++;
    }
    for (const x of got.filter((y) => y.status === 'semantic-mismatch')) {
      const e = errOf(x);
      if (!e) { r.falseMismatch++; r.rows.push(`| ${c.id} | ${x.text} | ${x.reason} |`); } else if (e.judgement === 'debatable') r.debatable++;
    }
    for (const w of c.citations.filter((y: { written?: string }) => y.written)) {
      r.citeTotal++;
      // The set names the reference (M1b); the checker records its fact (M1). "3.2배" / "-3.95%" read as "3.2" / "3.95%".
      if (got.some((x) => w.written.includes(x.text) && x.citation?.factId === w.ref.replace(/[a-z]$/, '') && x.citation?.fit === w.fit)) r.citeAgree++;
    }
  }
  return { mismatches: m, interpretations: it, raws: r };
}

export function scoreD(variant: Variant) {
  let agree = 0;
  const rows: string[] = [];
  for (const c of D.cases) {
    const { got } = check(c.holding, c.text, c.raw, variant);
    const t = c.target === 'interp' ? interp(got) : got.find((x) => x.text === c.target);
    const e: Expect = c.expect;
    const actual = { status: t?.status ?? 'none', evidence: t?.evidence ?? [], citation: t?.citation };
    const ok = actual.status === e.status
      && (!e.evidence || JSON.stringify(actual.evidence) === JSON.stringify(e.evidence))
      && (!e.citation || (actual.citation?.factId === e.citation.factId && actual.citation.fit === e.citation.fit))
      && (c.count === undefined || got.filter((x) => x.type === 'number').length === c.count)
      && (c.spans ?? []).every((s: { text: string; status: string }) => got.find((x) => x.text === s.text)?.status === s.status);
    if (ok) agree++;
    rows.push(`| ${c.id} | ${ok ? 'ok' : 'FAIL'} | ${c.target} | ${e.status} [${e.evidence ?? ''}]${e.citation ? ` cite ${e.citation.factId}/${e.citation.fit}` : ''} | ${actual.status} [${actual.evidence}]${actual.citation ? ` cite ${actual.citation.factId}/${actual.citation.fit}` : ''} | ${t?.reason ?? ''} |`);
  }
  return { agree, total: D.cases.length, rows };
}

const table = (head: string, rows: string[]) => [head, head.replace(/[^|]+/g, '---'), ...rows].join('\n');

for (const variant of ['plain', 'cite'] as const) {
  test(`development set (${variant}): scored`, () => {
    const s = scoreDev(variant);
    console.log(`\n### development ${variant}\n` + table('| id | judgement | target | status | reason |', s.mismatches.rows)
      + '\n\n' + table('| id | expected | actual | reason |', s.interpretations.rows) + '\n\n' + table('| raw | false mismatch | reason |', s.raws.rows));
    const { rows: _a, ...m } = s.mismatches, { rows: _b, ...i } = s.interpretations, { rows: _c, ...r } = s.raws;
    console.log(`Feature 017 dev ${variant}`, JSON.stringify({ mismatches: m, interpretations: i, raws: r }));
  });
}

// SC-001 / SC-004 on the development set (tuned on), with the adopted variant (the checker's default).
test('SC-001: development false mismatches ≤ 5 and both real errors flagged; SC-004: interpretation judgements agree', () => {
  const s = scoreDev('plain'), c = scoreDev('cite');
  const best = [s, c].find((x) => x.mismatches.falseMismatch <= 5) ?? s;
  assert.ok(best.mismatches.falseMismatch <= 5, `false mismatches ${best.mismatches.falseMismatch}`);
  assert.equal(best.mismatches.missed, 0);
  assert.equal(best.interpretations.agree, best.interpretations.total);
});

// Fixture D: reported only (held out). Set BTA_SCORE_D=1 to print it; it is first run at the rules freeze (T018).
test('fixture D (held out): reported only', { skip: !process.env.BTA_SCORE_D }, () => {
  for (const variant of ['plain', 'cite'] as const) {
    const s = scoreD(variant);
    console.log(`\n### fixture D ${variant}: ${s.agree} / ${s.total}\n` + table('| id | ok | target | expected | actual | reason |', s.rows));
  }
});

// T021: the blind-audit scripts on a small synthetic report (not a measurement).
test('audit sheet has no checker output; precision scores a judged sheet and refuses an unjudged one', async () => {
  const { sheet } = await import('../scripts/audit-sheet.ts');
  const { score } = await import('../scripts/precision.ts');
  const run = { question: 'q01', kind: 'single' as const, holding: 'KR:900001', outcome: 'success', unsupported: 0, unrecognised: 0,
    language: 'ko', ms: 1, mode: 'current' as const,
    answer: '52주 최저가는 65,320원입니다. 평단 71,000원 대비 현재가는 65,320원입니다. 현재가가 평단보다 낮아 저평가 구간입니다.' };
  const s = sheet({ runs: [run, { ...run, outcome: 'failure' }] });
  assert.equal(s.failed.length, 1);
  assert.ok(s.runs[0].items.every((i) => !('status' in i) && !('evidence' in i) && !('reason' in i)));
  assert.throws(() => score({ runs: [run] }, s), /unjudged/);
  for (const i of s.runs[0].items) {
    i.judgement = i.type === 'interpretation' ? 'unsupported' : i.sentence.startsWith('52주') && i.text === '65,320원' ? 'real-error' : 'correct';
  }
  const t = score({ runs: [run] }, s).result.plain.total;
  assert.deepEqual([t.flagged, t.trueMismatch, t.falseMismatch, t.realErrors, t.missed, t.precision, t.recall, t.threshold, t.interpAgree, t.interpTotal],
    [1, 1, 0, 1, 0, 1, 1, 'met', 1, 1]);
});
