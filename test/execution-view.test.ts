// Feature 008 L1: execution events → view state → Pixel messages, from committed synthetic traces.
// No model, no network, no DOM, no Pixel Agents package.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { ROLES } from '../src/graph/trading-graph.ts';
import { mapFacts, newCursor, snapshotFacts, type ExecutionEvent } from '../src/view/execution-events.ts';
import { initialViewState, reduce, roleText, runText, type ViewState } from '../src/view/view-state.ts';
import { messagesFor, ROLE_IDENTITY, startSequence } from '../src/view/pixel-adapter.ts';

const DIR = 'test/fixtures/execution-traces';
type Expected = { run: string; stage?: string; roles: string; runtime: string | null; anomalies: number };
type Trace = { name: string; events: ExecutionEvent[]; expected: Expected[] };
const traces: Trace[] = readdirSync(DIR).map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')));

const CODE: Record<string, string> = {
  idle: 'i', waiting: 'w', working: 'k', completed: 'c', failed: 'f', cancelled: 'x', stopped: 's', 'not-run': 'n', queued: 'Q', inferring: 'I',
};
const project = (s: ViewState): Expected => ({
  run: s.run.state, ...(s.run.stage ? { stage: s.run.stage } : {}),
  roles: ROLES.map((r) => { const v = s.roles[r.node]; return v.errored ? 'e' : CODE[v.state]; }).join(''),
  runtime: s.runtime && `${s.runtime.state}/${s.runtime.active}/${s.runtime.queued}`, anomalies: s.anomalies,
});
const replay = (events: ExecutionEvent[]) => {
  const states: ViewState[] = [];
  events.reduce((s, e) => { const n = reduce(s, e); states.push(n); return n; }, initialViewState());
  return states;
};

test('13 committed traces', () => assert.equal(traces.length, 13));

for (const t of traces) {
  test(`trace ${t.name}: hand-written expected sequence, identical on a second replay`, () => {
    const first = replay(t.events).map(project);
    assert.deepEqual(first, t.expected);
    assert.deepEqual(replay(t.events).map(project), first); // SC-008
    for (const p of first) {
      assert.ok(!/[QI]/.test(p.roles), 'no role queued/inferring: no attribution (F008-O1)');
      if (p.run === 'running') assert.ok(!p.roles.includes('n'), 'not-run only after run-ended (FR-007a)');
      else if (p.run !== 'idle') assert.ok(!/[wke]/.test(p.roles), 'nothing waiting/working after run-ended (M9)');
    }
  });
}

test('failure: no role downstream of the failure is completed (SC-004)', () => {
  const last = replay(traces.find((t) => t.name === 'role-failure-bull')!.events).map(project).at(-1)!;
  assert.equal(last.roles.slice(3), 'nnnnn');
});

test('acquisition cancel/failure: no role ever working (SC-005)', () => {
  for (const name of ['acquisition-cancel', 'acquisition-failure']) {
    for (const p of replay(traces.find((t) => t.name === name)!.events).map(project)) assert.ok(!/[ke]/.test(p.roles), name);
  }
});

// ---- DOM-fact mapper (H1, M8) ----

const record = (outcome: string, extra: object = {}) => JSON.stringify({ evidenceClass: 'BROWSER_AUTOMATED', outcome, ...extra });

test('mapper: running… then done: in one batch → two events, not one (H1)', () => {
  const c = newCursor();
  const ev = mapFacts([{ el: 'status', text: 'running…' }, { el: 'status', text: 'done: BLOCKED · not-run' }], c,
    () => JSON.stringify({ evidenceClass: 'BLOCKED', outcome: 'not-run' }));
  assert.deepEqual(ev, [{ seq: 1, type: 'run-started' }, { seq: 2, type: 'run-ended', outcome: 'not-run', stage: 'preflight', errorKinds: [] }]);
});

test('mapper: a node that ran and finished in one batch keeps its working period (H1)', () => {
  const ev = mapFacts([{ el: 'node', node: 'marketAnalyst', text: 'running' }, { el: 'node', node: 'marketAnalyst', text: 'done' }],
    newCursor(), () => '');
  assert.deepEqual(ev.map((e) => e.type), ['role-started', 'role-completed']);
});

test('mapper: stage from the final record; runtime only on change; waiting ignored', () => {
  const c = newCursor();
  const rt = { el: 'runtime' as const, runtime: { state: 'ready', active: '1', queued: '1' } };
  const ev = mapFacts([rt, rt, { el: 'node', node: 'newsAnalyst', text: 'waiting' },
    { el: 'status', text: 'done: BROWSER_AUTOMATED · cancelled' }], c,
  () => record('cancelled', { failure: { boundary: 'market-data', stage: 'acquisition', kind: 'cancelled' } }));
  assert.deepEqual(ev.map((e) => e.type), ['runtime', 'run-ended']);
  assert.deepEqual(ev[1], { seq: 2, type: 'run-ended', outcome: 'cancelled', stage: 'acquisition', errorKinds: [] });
  assert.equal(c.anomalies, 0);
  assert.deepEqual(mapFacts([{ el: 'status', text: 'done: x' }], c, () => record('failed', { failure: { boundary: 'inference' } }))
    .map((e) => e.type === 'run-ended' && e.stage), ['graph']);
});

test('mapper: unknown text and unparseable record are anomalies, never state', () => {
  const c = newCursor();
  assert.deepEqual(mapFacts([{ el: 'node', node: 'trader', text: 'thinking' }, { el: 'node', node: 'nobody', text: 'done' }], c, () => ''), []);
  assert.equal(c.anomalies, 2);
  const [e] = mapFacts([{ el: 'status', text: 'done: ?' }], c, () => '{not json');
  assert.deepEqual(e, { seq: 1, type: 'run-ended', outcome: 'failed', stage: 'graph', errorKinds: [] });
  assert.equal(c.anomalies, 3);
});

test('mount snapshot mid-run: starts from the true state, not idle (M8)', () => {
  const nodes = Object.fromEntries(ROLES.map((r) => [r.node, 'waiting']));
  Object.assign(nodes, { marketAnalyst: 'done', newsAnalyst: 'error', bullResearcher: 'running' });
  const c = newCursor();
  const events = mapFacts(snapshotFacts({ status: 'running…', nodes, runtime: { state: 'ready', active: '1', queued: '0' } }), c, () => '');
  const p = project(replay(events).at(-1)!);
  assert.deepEqual(p, { run: 'running', roles: 'cekwwwww', runtime: 'ready/1/0', anomalies: 0 });
  assert.deepEqual(mapFacts(snapshotFacts({ status: 'idle', nodes }), newCursor(), () => ''), []);
});

test('mapper: errorKinds come from the final record; attribution only when the kinds allow it (F008-009)', () => {
  const rec = (outcome: string, kinds: string[]) => JSON.stringify({ evidenceClass: 'BROWSER_AUTOMATED', outcome,
    failure: { boundary: 'inference' }, modelRequests: [{ event: 'start' }, ...kinds.map((errorKind) => ({ event: 'error', errorKind }))] });
  const end = (outcome: string, kinds: string[]) => mapFacts([{ el: 'status', text: 'done: x' }], newCursor(), () => rec(outcome, kinds))[0];
  assert.deepEqual(end('failed', ['failed', 'cancelled']), { seq: 1, type: 'run-ended', outcome: 'failed', stage: 'graph', errorKinds: ['failed', 'cancelled'] });
  const after = (outcome: 'failed' | 'cancelled', kinds: string[]) => replay([{ seq: 1, type: 'run-started' },
    { seq: 2, type: 'role-started', role: 'marketAnalyst' }, { seq: 3, type: 'role-failed', role: 'marketAnalyst' },
    { seq: 4, type: 'run-ended', outcome, stage: 'graph', errorKinds: kinds }]).at(-1)!.roles.marketAnalyst.state;
  assert.equal(after('failed', ['failed']), 'failed');
  assert.equal(after('cancelled', ['cancelled']), 'cancelled');
  assert.equal(after('failed', ['failed', 'cancelled']), 'stopped');
  assert.equal(after('failed', []), 'stopped');
  assert.equal(after('cancelled', ['failed']), 'stopped');
});

test('text labels: every state readable as text; run stage shown', () => {
  assert.equal(roleText({ state: 'stopped' }), 'error (failed/cancelled unclear)');
  assert.equal(roleText({ state: 'working' }), 'working (graph)');
  assert.equal(roleText({ state: 'not-run' }), 'not run');
  assert.equal(roleText({ state: 'working', errored: true }), 'working (graph), error reported');
  assert.equal(runText({ state: 'cancelled', stage: 'acquisition' }), 'cancelled · acquisition');
  assert.equal(runText({ state: 'not-run', stage: 'preflight' }), 'not run (blocked)');
  assert.equal(runText({ state: 'completed', stage: 'graph' }), 'completed');
});

// ---- Pixel adapter (no package: messages only) ----

test('adapter: deterministic identity, 8 distinct characters, labels from ROLES', () => {
  const a = startSequence([], null), b = startSequence([], null);
  assert.deepEqual(a, b);
  assert.equal(new Set(ROLE_IDENTITY.map((r) => `${r.palette}/${r.hueShift}/${r.seatId}`)).size, 8);
  assert.deepEqual(a.filter((m) => m.type === 'agentTeamInfo').map((m) => (m as { agentName: string }).agentName), ROLES.map((r) => r.label));
  assert.equal(a[0].type, 'settingsLoaded');
  assert.equal((a[0] as { soundEnabled: boolean }).soundEnabled, false);
});

test('adapter: only working animates; nothing implies queued/inferring; success ends Done', () => {
  const states = replay(traces.find((t) => t.name === 'success')!.events);
  const msgs = states.flatMap((s, i) => messagesFor(i ? states[i - 1] : null, s));
  const text = JSON.stringify(msgs);
  assert.ok(!/queued|inferring/.test(text));
  for (const m of msgs.filter((m) => m.type === 'agentStatus' && m.status === 'active')) {
    const prev = msgs[msgs.indexOf(m) + 1];
    assert.equal(prev.type, 'agentToolStart'); assert.equal((prev as { status: string }).status, 'working (graph)');
  }
  const done = messagesFor(states.at(-2)!, states.at(-1)!); // run-ended changes no role state
  assert.deepEqual(done, []);
  const last = new Map<number, string>();
  for (const m of msgs) if (m.type === 'agentStatus') last.set(m.id as number, m.status as string);
  assert.deepEqual([...last.values()], Array(8).fill('waiting'));
});

// ---- T009: the ROLES import is metadata only ----

test('ROLES import: 8 roles; no view module imports akarisp, main or the bridge', () => {
  assert.equal(ROLE_IDENTITY.length, 8);
  for (const f of ['execution-events', 'view-state', 'pixel-adapter']) {
    const src = readFileSync(`src/view/${f}.ts`, 'utf8');
    assert.ok(!/from ['"](akarisp|\.\.\/main|\.\.\/integration)/.test(src), f);
    assert.ok(!/buildTradingGraph/.test(src), f);
  }
});
