// Feature 009 L1 (T014, SC-007): dialog narration and the office scene, from the 13 committed Feature 008
// traces. No DOM, no model, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { ROLES } from '../src/graph/trading-graph.ts';
import type { ExecutionEvent } from '../src/view/execution-events.ts';
import { initialViewState, reduce, type ViewState } from '../src/view/view-state.ts';
import { narrate } from '../src/view/narration.ts';
import { character, DESKS, DECOR, SPRITES, WORLD } from '../src/view/office-scene.ts';

const DIR = 'test/fixtures/execution-traces';
const traces: { name: string; events: ExecutionEvent[] }[] = readdirSync(DIR).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')));
const NARRATED = ['working', 'completed', 'failed', 'cancelled', 'stopped', 'not-run'];
const TERMINAL_RUN = ['completed', 'failed', 'cancelled', 'not-run'];

function story(events: ExecutionEvent[]) {
  let s: ViewState = initialViewState();
  const lines: string[] = [];
  let expected = 0;
  for (const e of events) {
    const n = reduce(s, e);
    const out = narrate(s, n, ROLES);
    // exactly one line per narrated role change, one for the run starting, one for the run ending
    const roleChanges = ROLES.filter((r) => s.roles[r.node].state !== n.roles[r.node].state && NARRATED.includes(n.roles[r.node].state)).length;
    const runChange = s.run.state !== n.run.state && (n.run.state === 'running' || TERMINAL_RUN.includes(n.run.state)) ? 1 : 0;
    assert.equal(out.length, roleChanges + runChange, `seq ${e.seq}`);
    if (runChange && n.run.state === 'running') assert.equal(out[0], '새 분석을 시작합니다.');
    if (runChange && n.run.state !== 'running') assert.match(out.at(-1)!, /^분석/);
    expected += out.length;
    lines.push(...out);
    s = n;
  }
  assert.equal(lines.length, expected);
  return lines;
}

test('narration: every trace — one line per transition, in order; never claims queued/inferring', () => {
  assert.equal(traces.length, 13);
  for (const t of traces) {
    const lines = story(t.events);
    assert.ok(!lines.some((l) => /queued|inferring|대기열|추론 중/.test(l)), t.name);
  }
});

test('narration: success trace reads in topology order', () => {
  const lines = story(traces.find((t) => t.name === 'success')!.events);
  assert.deepEqual(lines, [
    '새 분석을 시작합니다.',
    'Market Analyst가 작업을 시작했습니다.', 'News Analyst가 작업을 시작했습니다.',
    'Market Analyst가 작업을 마쳤습니다.', 'News Analyst가 작업을 마쳤습니다.',
    ...ROLES.slice(2).flatMap((r) => [`${r.label}가 작업을 시작했습니다.`, `${r.label}가 작업을 마쳤습니다.`]),
    '분석이 끝났습니다.',
  ]);
});

test('narration: failure, cancel and unclear errors', () => {
  const bull = story(traces.find((t) => t.name === 'role-failure-bull')!.events);
  assert.ok(bull.includes('Bull Researcher에서 오류가 발생했습니다.'));
  assert.ok(bull.includes('Bear Researcher는 실행되지 않았습니다.'));
  assert.equal(bull.at(-1), '분석이 실패했습니다 (graph).');
  const unclear = story(traces.find((t) => t.name === 'ambiguous-sibling-error')!.events);
  assert.ok(unclear.some((l) => l.endsWith('오류로 멈췄습니다 (실패/취소 구분 불가).')));
  const cancel = story(traces.find((t) => t.name === 'acquisition-cancel')!.events);
  assert.equal(cancel.at(-1), '분석이 취소되었습니다 (acquisition).');
  const blocked = story(traces.find((t) => t.name === 'blocked-preflight')!.events);
  assert.equal(blocked.at(-1), '분석을 시작할 수 없습니다.');
});

// T015: the scene is data; every path is under the ignored art folder.
test('office scene: 8 desks inside the world, unique; identity i % 6 with a 180° hue shift for roles 7–8', () => {
  assert.equal(DESKS.length, 8);
  assert.equal(new Set(DESKS.map((d) => `${d.x},${d.y}`)).size, 8);
  for (const d of DESKS) assert.ok(d.x >= 0 && d.x + 48 <= WORLD.w && d.y >= 0 && d.y + 32 <= WORLD.h);
  const ids = ROLES.map((_, i) => `${character(i).sheet.src}/${character(i).hueShift}`);
  assert.equal(new Set(ids).size, 8);
  assert.deepEqual(ROLES.map((_, i) => character(i).hueShift), [0, 0, 0, 0, 0, 0, 180, 180]);
  for (const p of [...Object.values(SPRITES), ...ROLES.map((_, i) => character(i).sheet.src)]) assert.match(p, /^\/office-art\//);
  for (const d of DECOR) assert.ok(d.sprite in SPRITES);
});
