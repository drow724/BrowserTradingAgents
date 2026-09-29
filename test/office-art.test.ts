// Feature 011: the office art is our own — pixel maps in art/office/ generate public/office/*.png deterministically;
// the scene data points only at those files; every file has one provenance row.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { build, pixels, png } from '../scripts/build-office-art.mjs';
import { character, SPRITES } from '../src/view/office-scene.ts';

test('office art: committed PNGs equal a fresh generation (--check)', () => {
  execFileSync('node', ['scripts/build-office-art.mjs', '--check'], { stdio: 'pipe' });
});

test('office art: bad maps fail with the file name; output is byte-deterministic', () => {
  const colour = (ch: string) => (ch === 'k' ? [0, 0, 0] : undefined);
  assert.throws(() => pixels('a.txt', ['kk', 'k'], [2, 2], colour), /a\.txt: expected 2×2.*ragged/);
  assert.throws(() => pixels('b.txt', ['kk', 'kk'], [3, 2], colour), /b\.txt: expected 3×2/);
  assert.throws(() => pixels('c.txt', ['kq', 'kk'], [2, 2], colour), /c\.txt: unknown symbol 'q' at 1,0/);
  const px = pixels('d.txt', ['k.', '.k'], [2, 2], colour);
  assert.deepEqual(png(2, 2, px), png(2, 2, px));
  assert.deepEqual([...build()].map(([f, b]) => [f, b.length]), [...build()].map(([f, b]) => [f, b.length]));
});

test('office art: scene data uses only /office/ files that exist; eight distinct characters', () => {
  const paths = [...Object.values(SPRITES), ...Array.from({ length: 8 }, (_, i) => character(i).sheet.src)];
  for (const p of paths) {
    assert.match(p, /^\/office\//);
    assert.ok(existsSync(`public${p}`), p);
  }
  const chars = Array.from({ length: 8 }, (_, i) => readFileSync(`public${character(i).sheet.src}`).toString('base64'));
  assert.equal(new Set(chars).size, 8);
  assert.ok(Array.from({ length: 8 }, (_, i) => character(i).hueShift).every((h) => h === 0));
});

test('office art: PROVENANCE.md has exactly one row per PNG; no upstream art is tracked', () => {
  const rows = readFileSync('art/office/PROVENANCE.md', 'utf8').split('\n')
    .map((l) => l.match(/^\| `([^`]+\.png)` \|/)?.[1]).filter(Boolean).sort();
  const files = readdirSync('public/office').filter((f) => f.endsWith('.png')).sort();
  assert.deepEqual(rows, files);
  assert.equal(execFileSync('git', ['ls-files', 'public/office-art']).toString(), '');
});
