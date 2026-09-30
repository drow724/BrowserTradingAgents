// Feature 018 (research R6): the maintainer's blind re-judgement of a seeded 10 % sample of answers (those with at least
// one item) and its agreement with the full audit on "real error or not", against the pre-registered bar.
// Usage: node scripts/reliability-sample.ts sample --seed <n> <judged-sheet.json> <sample.json>
//        node scripts/reliability-sample.ts agree <judged-sheet.json> <maintainer-sample.json> [out.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { shuffle, type BlindEntry, type Item } from './audit-sheet.ts';

export const BAR = { realOrNot: 0.95, positives: 0.7 };
const isError = (i: Item) => i.judgement === 'real-error' || (i.type === 'interpretation' && i.judgement === 'unsupported');

export function sample(entries: readonly BlindEntry[], seed: number) {
  const pool = entries.filter((e) => e.items.length > 0);
  const picked = shuffle(pool, seed).slice(0, Math.ceil(pool.length / 10));
  return { seed, entryIds: picked.map((e) => e.id),
    entries: picked.map((e) => ({ ...e, items: e.items.map(({ judgement: _j, note: _n, ...i }) => i) })) };
}

export function agree(full: readonly BlindEntry[], maintainer: readonly BlindEntry[]) {
  const mine = new Map(full.flatMap((e) => e.items.map((i) => [i.id, i])));
  const theirs = maintainer.flatMap((e) => e.items);
  const unjudged = theirs.filter((i) => !i.judgement).map((i) => i.id);
  if (unjudged.length) throw new Error(`unjudged items: ${unjudged.slice(0, 10).join(', ')}`);
  let same = 0, positives = 0, bothPositive = 0;
  const disagreements: string[] = [];
  for (const t of theirs) {
    const a = isError(mine.get(t.id)!), b = isError(t);
    if (a === b) same++; else disagreements.push(`${t.id}: full ${mine.get(t.id)!.judgement}, maintainer ${t.judgement} — ${t.sentence}`);
    if (a || b) { positives++; if (a && b) bothPositive++; }
  }
  const round = (x: number) => Math.round(x * 1000) / 1000;
  const agreeRealOrNot = round(same / (theirs.length || 1)), agreeOnPositives = positives ? round(bothPositive / positives) : null;
  return { items: theirs.length, agreeRealOrNot, positives, agreeOnPositives, bar: BAR,
    met: agreeRealOrNot >= BAR.realOrNot && (agreeOnPositives === null || agreeOnPositives >= BAR.positives), disagreements };
}

if (process.argv[1]?.endsWith('reliability-sample.ts')) {
  const [cmd, ...a] = process.argv.slice(2);
  if (cmd === 'sample') {
    const [, seed, sheetFile, out] = a; // --seed <n> <judged-sheet> <sample>
    const s = sample(JSON.parse(readFileSync(sheetFile, 'utf8')).entries, Number(seed));
    writeFileSync(out, JSON.stringify(s, null, 1) + '\n');
    console.log(`${s.entryIds.length} answers, ${s.entries.reduce((n, e) => n + e.items.length, 0)} items, seed ${seed}`);
  } else if (cmd === 'agree') {
    const [sheetFile, sampleFile, out] = a;
    const r = agree(JSON.parse(readFileSync(sheetFile, 'utf8')).entries, JSON.parse(readFileSync(sampleFile, 'utf8')).entries);
    if (out) writeFileSync(out, JSON.stringify(r, null, 1) + '\n');
    console.log(JSON.stringify({ ...r, disagreements: r.disagreements.length }));
  }
}
