// Feature 008 execution events (specs/008-…/contracts/execution-events.md). The DOM observer is this
// Feature's event-source adapter only, not an execution API: it turns what src/main.ts already writes
// into BrowserTradingAgents events. No DOM library, no Pixel type — the facts are plain values.
import { ROLES, type NodeName } from '../graph/trading-graph.ts';

export type RuntimeSnapshot = { state: string; active: string; queued: string };
export type RunOutcome = 'success' | 'failed' | 'cancelled' | 'not-run';
export type RunStage = 'acquisition' | 'graph' | 'preflight';

export type ExecutionEvent = { seq: number } & (
  | { type: 'run-started' }
  | { type: 'role-started' | 'role-completed' | 'role-failed'; role: NodeName }
  // errorKinds: the final record's model-request error kinds (AkariSP TaskError codes), not tied to roles.
  | { type: 'run-ended'; outcome: RunOutcome; stage: RunStage; errorKinds: string[] }
  | { type: 'runtime'; runtime: RuntimeSnapshot }
);

// Record-level facts. `text` is the record's added Text node data, never the element's current value
// (H1): a batched callback may run after several writes in the same task.
export type DomFact =
  | { el: 'status'; text: string }
  | { el: 'node'; node: string; text: string }
  | { el: 'runtime'; runtime: RuntimeSnapshot };

// Mutable per-observer cursor: next seq, last runtime emitted, anomalies seen by the mapper.
export type Cursor = { seq: number; runtime?: RuntimeSnapshot; anomalies: number };
export const newCursor = (): Cursor => ({ seq: 0, anomalies: 0 });

const NODES: readonly string[] = ROLES.map((r) => r.node);
const ROLE_EVENT = { running: 'role-started', done: 'role-completed', error: 'role-failed' } as const;
const OUTCOMES: readonly string[] = ['success', 'failed', 'cancelled', 'not-run'];

// Final evidence record → run-ended fields. Unparseable → an anomaly and failed · graph.
export function runEnded(evidenceText: string, cursor: Cursor): { outcome: RunOutcome; stage: RunStage; errorKinds: string[] } {
  try {
    const r = JSON.parse(evidenceText) as { outcome?: string; evidenceClass?: string; failure?: { boundary?: string };
      modelRequests?: { event: string; errorKind?: string | null }[] };
    if (!OUTCOMES.includes(r.outcome ?? '')) throw new Error('outcome');
    const stage = r.evidenceClass === 'BLOCKED' ? 'preflight' : r.failure?.boundary === 'market-data' ? 'acquisition' : 'graph';
    const errorKinds = (r.modelRequests ?? []).filter((m) => m.event === 'error').map((m) => m.errorKind ?? 'other');
    return { outcome: r.outcome as RunOutcome, stage, errorKinds };
  } catch {
    cursor.anomalies++;
    return { outcome: 'failed', stage: 'graph', errorKinds: [] };
  }
}

export function mapFacts(facts: DomFact[], cursor: Cursor, evidence: () => string): ExecutionEvent[] {
  const out: ExecutionEvent[] = [];
  const next = () => ++cursor.seq;
  for (const f of facts) {
    if (f.el === 'runtime') {
      const r = f.runtime, p = cursor.runtime;
      if (p && p.state === r.state && p.active === r.active && p.queued === r.queued) continue;
      cursor.runtime = r;
      out.push({ seq: next(), type: 'runtime', runtime: r });
    } else if (f.el === 'status') {
      if (f.text.startsWith('running')) { cursor.seq = 0; out.push({ seq: next(), type: 'run-started' }); }
      else if (f.text.startsWith('done:')) out.push({ seq: next(), type: 'run-ended', ...runEnded(evidence(), cursor) });
      else cursor.anomalies++; // no other text is written while a page runs
    } else if (f.text === 'waiting') {
      continue; // reset by run(); implied by run-started
    } else if (NODES.includes(f.node) && f.text in ROLE_EVENT) {
      out.push({ seq: next(), type: ROLE_EVENT[f.text as keyof typeof ROLE_EVENT], role: f.node as NodeName });
    } else {
      cursor.anomalies++;
    }
  }
  return out;
}

// Mount-time DOM snapshot → the facts that would have produced it (contract: Mount), so a view mounted
// mid-run starts from the true current state.
export type DomSnapshot = { status: string; nodes: Record<string, string>; runtime?: RuntimeSnapshot };
export function snapshotFacts(s: DomSnapshot): DomFact[] {
  const facts: DomFact[] = [];
  if (s.status.startsWith('running')) {
    facts.push({ el: 'status', text: s.status });
    for (const node of NODES) {
      const t = s.nodes[node];
      if (t === 'running' || t === 'done' || t === 'error') facts.push({ el: 'node', node, text: 'running' });
      if (t === 'done' || t === 'error') facts.push({ el: 'node', node, text: t });
    }
  }
  if (s.runtime) facts.push({ el: 'runtime', runtime: s.runtime });
  return facts;
}
