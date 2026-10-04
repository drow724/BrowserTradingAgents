// Dev-set check of preclassify on the 310 old items (labels per B5 rules); simulates pipeline with B4 model preds.
const {preclassify} = require('./preclassify.js'), fs = require('fs');
const ds = JSON.parse(fs.readFileSync('../dataset.json')), b4 = JSON.parse(fs.readFileSync('../results/b4.json'));
const model = Object.fromEntries([...b4.B4.items, ...b4.B4h.items].map(r => [r.id, r.pred]));
const items = [...ds.items, ...ds.heldout, ...ds.b5_underspecified];
const group = i => i.tag === 'underspecified' ? 'under' : i.tag === 'ambiguous' ? 'leaning' : 'clear';
const ok = (i, p) => group(i) === 'under' ? p === 'CLARIFY' : group(i) === 'leaning' ? [i.gold, 'CLARIFY'].includes(p) : p === i.gold;
let acc = 0, unk = 0; const bad = [], over = [];
for (const i of items) {
  const pc = preclassify(i.command), p = pc ?? model[i.id];
  if (pc === null && p === undefined) { unk++; bad.push(`PASS(no model pred) ${i.id} ${i.command}`); continue; }
  if (ok(i, p)) acc++; else bad.push(`${pc ? 'RULE' : 'MODEL'} ${i.id} [${i.tag}] ${i.command} gold=${i.gold} pred=${p}`);
  if (group(i) === 'clear' && p === 'CLARIFY') over.push(i.command);
}
const under = items.filter(i => group(i) === 'under');
console.log(`dev pipeline acc ${acc}/${items.length - unk} (+${unk} under passed to model, unknown)`);
console.log(`CLARIFY recall (rule) ${under.filter(i => preclassify(i.command) === 'CLARIFY').length}/${under.length}; over-clarify ${over.length}/244`);
console.log(bad.join('\n'));
