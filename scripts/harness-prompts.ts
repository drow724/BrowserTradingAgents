// Feature 013 hand-off to AkariSP (research R9): the final-role prompts of one `refs` repetition, built by the real
// graph code (promptFor via buildTradingGraph) with a fake model. The three upstream outputs the final role reads
// are model text; without `outputs.json` they stay `{{key}}` slots. Offline and pure.
// Usage: node scripts/harness-prompts.ts <out.json> [outputs.json]
//   outputs.json: the capture file (e2e/prompt-api.spec.ts, BTA_CAPTURE=1) or { "<question>|<holding>": { "riskReview": "…", "researchDecision": "…", "traderPlan": "…" } }
import { readFileSync, writeFileSync } from 'node:fs';
import { factSet, toInput } from '../src/analysis/facts.ts';
import { formatValue } from '../src/analysis/format.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';
import { refTable } from '../src/analysis/references.ts';
import { buildTradingGraph, ROLES } from '../src/graph/trading-graph.ts';
import type { AkariChatModel } from '../src/integration/akari-chat-model.ts';
import { identity, type Holding } from '../src/portfolio.ts';

const [out, outputsFile] = process.argv.slice(2);
const outputs: Record<string, Record<string, string>> = outputsFile ? (({ outputs: o, ...rest }) => o ?? rest)(JSON.parse(readFileSync(outputsFile, 'utf8'))) : {};
const questions = JSON.parse(readFileSync('test/fixtures/grounding/questions.json', 'utf8')).questions as
  { id: string; text: string; kind: string; expect: string[] }[];
const holdings = PORTFOLIO_FIXTURE.portfolio as Holding[];

const items = [];
for (const q of questions) {
  for (const id of q.expect) {
    const h = holdings.find((x) => identity(x.instrument) === id)!;
    const s = factSet(h), key = `${q.id}|${id}`;
    let finalPrompt = '';
    const model = { invoke: async ([m]: { content: string }[]) => {
      const role = ROLES.find((r) => m.content.startsWith(`You are the ${r.label}.`))!;
      if (role.node === 'finalDecisionMaker') finalPrompt = m.content;
      return { content: outputs[key]?.[role.writes] ?? `{{${role.writes}}}` };
    } } as unknown as AkariChatModel;
    await buildTradingGraph(model).graph.invoke({ input: toInput(s, h, q.text, 'refs') });
    items.push({ key, question: q.id, kind: q.kind, holding: id, questionText: q.text,
      filled: !finalPrompt.includes('{{'), finalPrompt,
      refs: refTable(s.facts).map((r) => ({ name: r.name, factId: r.factId, shown: formatValue(r.value, r.unit, r.text) })) });
  }
}
writeFileSync(out, JSON.stringify({ fixture: 'portfolio-fixture@1', mode: 'refs', role: 'finalDecisionMaker',
  generatedAt: new Date().toISOString(), items }, null, 1) + '\n');
console.log(`${items.length} prompts, ${items.filter((i) => i.filled).length} filled`);
