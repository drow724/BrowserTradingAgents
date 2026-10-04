// Dev check of v1 vs v2 on old 310 (B4 preds) + E1 test 198 (M preds). Items whose rule passes to model but lack a model pred are counted unknown.
const {preclassify} = require('./preclassify.js'), {preclassifyV2} = require('./preclassify-v2.js'), {preclassifyV3} = require('./preclassify-v3.js'), fs = require('fs');
const ds = JSON.parse(fs.readFileSync('../dataset.json')), b4 = JSON.parse(fs.readFileSync('../results/b4.json')), e1 = JSON.parse(fs.readFileSync('../results/f001.json'));
const model = Object.fromEntries([...b4.B4.items, ...b4.B4h.items, ...e1.M.items].map(r => [r.id, r.pred]));
const t1 = JSON.parse(fs.readFileSync('testset.json'));
const sets = {old310: [...ds.items, ...ds.heldout, ...ds.b5_underspecified], e1test: t1};
const group = i => i.tag === 'underspecified' ? 'under' : i.tag === 'ambiguous' ? 'leaning' : 'clear';
const ok = (i, p) => group(i) === 'under' ? p === 'CLARIFY' : group(i) === 'leaning' ? [i.gold, 'CLARIFY'].includes(p) : p === i.gold;
for (const [name, items] of Object.entries(sets)) for (const [v, f] of [['v1', preclassify], ['v2', preclassifyV2], ['v3', preclassifyV3]]) {
  let acc = 0, unk = 0, over = 0, rec = 0; const bad = [];
  for (const i of items) { const pc = f(i.command), p = pc ?? model[i.id];
    if (p === undefined) { unk++; continue; }
    if (ok(i, p)) acc++; else bad.push(`${pc ? 'RULE' : 'MODEL'} [${i.tag}] ${i.command} gold=${i.gold} pred=${p}`);
    if (group(i) === 'clear' && p === 'CLARIFY') over++; if (group(i) === 'under' && p === 'CLARIFY') rec++; }
  const nc = items.filter(i => group(i) === 'clear').length, nu = items.filter(i => group(i) === 'under').length;
  console.log(`${name} ${v}: acc ${acc}/${items.length - unk} (unknown ${unk}) recall ${rec}/${nu} over ${over}/${nc}`);
  if (v === process.argv[2]) console.log(bad.join('\n'));
}
