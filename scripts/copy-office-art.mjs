// Feature 009 (MD-6): temporary office art — the upstream Pixel Agents sprites from the pinned npm package
// pixel-agents@1.4.1 — copied into git- and vercel-ignored public/office-art/. Local only (F008-L1 open):
// nothing is copied when VERCEL is set, and the office then shows itself as unavailable.
import { createHash } from 'node:crypto';
import { cpSync, readdirSync, readFileSync, rmSync } from 'node:fs';

const SRC = 'node_modules/pixel-agents/dist/assets';
const DST = 'public/office-art';
const DIRS = ['characters', 'floors', 'walls', 'furniture'];
// sha256 of the sorted "<sha256>  <path>" lines of SRC/{DIRS} (verification T001).
const PINNED_INVENTORY = '5f758db153f649fdf0ac67e3a8db2eca7052e8ad8aff1845cea491971bfb83ba';

if (process.env.VERCEL) {
  console.log('copy-office-art: VERCEL is set; nothing copied (upstream sprites stay local, F008-L1)');
  process.exit(0);
}
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const files = DIRS.flatMap((d) => readdirSync(`${SRC}/${d}`, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile()).map((e) => `${e.parentPath}/${e.name}`.slice(SRC.length + 1))).sort();
const inventory = sha(files.map((f) => `${sha(readFileSync(`${SRC}/${f}`))}  ${f}\n`).join(''));
if (inventory !== PINNED_INVENTORY) throw new Error(`pixel-agents art differs from the pinned 1.4.1 inventory (${inventory})`);

rmSync(DST, { recursive: true, force: true });
for (const d of DIRS) cpSync(`${SRC}/${d}`, `${DST}/${d}`, { recursive: true });
console.log(`copy-office-art: ${files.length} files → ${DST} (inventory ${inventory})`);
