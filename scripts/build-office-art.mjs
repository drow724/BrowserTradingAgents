// Feature 011: the office art is our own — text pixel maps in art/office/ turned into PNGs in public/office/.
// One character per pixel: '.' is transparent, every other symbol comes from art/office/palette.txt. The
// character map uses slots (H hair, S skin, C shirt, T trousers; lowercase = the same colour, shaded) filled per
// role from art/office/characters.txt. Output is byte-deterministic; `--check` fails if the committed PNGs differ.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';

const SRC = 'art/office', OUT = 'public/office';
// Sizes match the retired upstream sprites, so the scene layout keeps its numbers (research R3).
export const SIZES = { desk: [48, 32], 'pc-off': [16, 32], 'pc-on-1': [16, 32], 'pc-on-2': [16, 32], 'pc-on-3': [16, 32],
  board: [32, 32], painting: [32, 32], shelf: [32, 32], clock: [16, 32], plant: [16, 32], 'big-plant': [32, 48] };
export const FRAME = [16, 32], FRAMES = 3, SLOTS = 'HSCT';

const hex = (name, s) => {
  if (!/^#[0-9a-f]{6}$/i.test(s)) throw new Error(`${name}: bad colour ${s}`);
  return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const shade = ([r, g, b]) => [r, g, b].map((v) => Math.round(v * 0.72));

export function parsePalette(text) {
  const p = new Map();
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const [sym, col] = line.split(/\s+/);
    if (sym.length !== 1 || sym === '.' || SLOTS.includes(sym.toUpperCase()) || p.has(sym)) throw new Error(`palette: bad symbol ${sym}`);
    p.set(sym, hex('palette', col));
  }
  return p;
}

// Rows of one map (or one frame) → RGBA. Unknown symbols, ragged rows and wrong sizes fail with the file name.
export function pixels(name, rows, [w, h], colour) {
  if (rows.length !== h || rows.some((r) => r.length !== w)) {
    throw new Error(`${name}: expected ${w}×${h}, got ${rows[0]?.length ?? 0}×${rows.length}${rows.some((r) => r.length !== rows[0].length) ? ' (ragged rows)' : ''}`);
  }
  const out = Buffer.alloc(w * h * 4);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const c = colour(ch);
    if (!c) throw new Error(`${name}: unknown symbol '${ch}' at ${x},${y}`);
    out.set([...c, 255], (y * w + x) * 4);
  }));
  return out;
}

export function png(w, h, rgba) {
  const chunk = (type, data) => {
    const td = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4), crc = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, no interlace
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); // filter 0 per row
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const lines = (text) => text.replace(/\r/g, '').split('\n');
const mapRows = (text) => lines(text).filter((l) => l.trim() !== '');

// Every output file: name → PNG bytes.
export function build(read = (f) => readFileSync(`${SRC}/${f}`, 'utf8')) {
  const palette = parsePalette(read('palette.txt'));
  const out = new Map();
  for (const [name, size] of Object.entries(SIZES)) {
    out.set(`${name}.png`, png(...size, pixels(`${name}.txt`, mapRows(read(`${name}.txt`)), size, (ch) => palette.get(ch))));
  }
  // Character: three frames separated by blank lines → one sheet, frames side by side.
  const frames = read('character.txt').replace(/\r/g, '').trim().split(/\n\s*\n/).map(mapRows);
  if (frames.length !== FRAMES) throw new Error(`character.txt: expected ${FRAMES} frames, got ${frames.length}`);
  const [fw, fh] = FRAME;
  for (const line of mapRows(read('characters.txt'))) {
    const [id, ...slots] = line.trim().split(/\s+/);
    const fill = new Map(slots.map((s) => { const [k, v] = s.split('='); return [k, hex(`characters.txt ${id}`, v)]; }));
    if ([...SLOTS].some((k) => !fill.has(k))) throw new Error(`characters.txt ${id}: needs ${[...SLOTS].join(', ')}`);
    const colour = (ch) => fill.get(ch) ?? (fill.has(ch.toUpperCase()) ? shade(fill.get(ch.toUpperCase())) : palette.get(ch));
    const sheet = Buffer.alloc(fw * FRAMES * fh * 4);
    frames.forEach((rows, f) => {
      const px = pixels(`character.txt frame ${f}`, rows, FRAME, colour);
      for (let y = 0; y < fh; y++) px.copy(sheet, (y * fw * FRAMES + f * fw) * 4, y * fw * 4, (y + 1) * fw * 4);
    });
    out.set(`char-${id}.png`, png(fw * FRAMES, fh, sheet));
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = build();
  if (process.argv.includes('--check')) {
    const differ = [...files].filter(([f, b]) => { try { return !readFileSync(`${OUT}/${f}`).equals(b); } catch { return true; } });
    if (differ.length) { console.error(`build-office-art: out of date: ${differ.map(([f]) => f).join(', ')}`); process.exit(1); }
    console.log(`build-office-art: ${files.size} files up to date`);
  } else {
    mkdirSync(OUT, { recursive: true });
    for (const [f, b] of files) writeFileSync(`${OUT}/${f}`, b);
    console.log(`build-office-art: ${files.size} files → ${OUT}`);
  }
}
