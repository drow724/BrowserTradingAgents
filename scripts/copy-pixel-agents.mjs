// Feature 008: serve the pinned Pixel Agents webview (npm pixel-agents@1.4.1 = pixel-agents-hq/pixel-agents
// @ 3537e140) from public/pixel-agents/, unmodified except one inserted shim <script> line in index.html.
// Generated output is git- and vercel-ignored. D4 (local only): nothing is copied when VERCEL is set.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const SRC = 'node_modules/pixel-agents/dist/webview';
const DST = 'public/pixel-agents';
const SHIM = 'bta-host-shim.js'; // ours, committed: never deleted or overwritten
const TAG = '<script src="./bta-host-shim.js"></script>';
// SHA-256 of the sorted "<sha256>  <path>" inventory of SRC (verification T014).
const PINNED_INVENTORY = 'ec6dfa08ce560a7d1aaec965eee7aa0cdb4d43c549f405bc00029f022d8235d6';

if (process.env.VERCEL) {
  console.log('copy-pixel-agents: VERCEL is set; nothing copied (Feature 008 D4: upstream sprites stay local)');
  process.exit(0);
}
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const files = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true })
  .filter((d) => d.isFile()).map((d) => `${d.parentPath}/${d.name}`.slice(dir.length + 1)).sort();
const inventory = (dir, list) => sha(list.map((f) => `${sha(readFileSync(`${dir}/${f}`))}  ${f}\n`).join(''));

const src = files(SRC);
const actual = inventory(SRC, src);
if (process.argv[2] === '--print-inventory') { console.log(actual); process.exit(0); }
if (actual !== PINNED_INVENTORY) throw new Error(`pixel-agents webview differs from the pinned 1.4.1 inventory (${actual})`);
if (src.includes(SHIM)) throw new Error(`upstream ships ${SHIM}; refusing to overwrite the shim`);

// Stale output: remove everything we generated before, never the shim.
if (existsSync(DST)) for (const f of readdirSync(DST)) if (f !== SHIM) rmSync(`${DST}/${f}`, { recursive: true, force: true });
cpSync(SRC, DST, { recursive: true });

const html = readFileSync(`${SRC}/index.html`, 'utf8').split('\n');
const at = html.findIndex((l) => l.includes('<script type="module"'));
if (at < 0) throw new Error('no module script in upstream index.html');
const out = [...html.slice(0, at), html[at].match(/^\s*/)[0] + TAG, ...html.slice(at)];
writeFileSync(`${DST}/index.html`, out.join('\n'));

// Verify: every copied file byte-identical, index.html = source + exactly the one shim line.
for (const f of src) if (f !== 'index.html' && sha(readFileSync(`${DST}/${f}`)) !== sha(readFileSync(`${SRC}/${f}`))) throw new Error(`copy differs: ${f}`);
const copied = readFileSync(`${DST}/index.html`, 'utf8').split('\n');
if (copied.length !== html.length + 1 || copied.filter((l, i) => l !== html[i - (i > at ? 1 : 0)]).length !== 1 || copied[at].trim() !== TAG) {
  throw new Error('index.html differs from upstream by more than the shim line');
}
console.log(`copy-pixel-agents: ${src.length} files → ${DST} (inventory ${actual}); index.html +1 shim line`);
