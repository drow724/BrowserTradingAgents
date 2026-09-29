// Feature 008 view state (specs/008-…/data-model.md): a pure reducer from execution events to what the
// user sees. Two layers stay separate: per-role graph state and the runtime's own aggregate counts.
// Role-level `queued`/`inferring` exist in the type but are never produced: no role ↔ request
// attribution exists (research F008-O1, FR-011).
import { ROLES, type NodeName } from '../graph/trading-graph.ts';
import type { ExecutionEvent, RunStage, RuntimeSnapshot } from './execution-events.ts';

export type RoleState = 'idle' | 'waiting' | 'working' | 'queued' | 'inferring' | 'completed' | 'failed' | 'cancelled' | 'stopped'
  | 'not-run';
// `errored`: the node reported an error; its terminal state is decided at run end. The page writes `error` for
// both a failed and a graph-cancelled node (F008-009), so failed/cancelled is shown only when the record's
// error kinds attribute it directly; otherwise the role is `stopped` ("error (failed/cancelled unclear)").
export type RoleView = { state: RoleState; errored?: true };
export type RunState = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled' | 'not-run';
export type ViewState = {
  run: { state: RunState; stage?: RunStage };
  roles: Record<NodeName, RoleView>;
  runtime: RuntimeSnapshot | null;
  anomalies: number;
  lastSeq: number;
};

const TERMINAL: readonly RoleState[] = ['completed', 'failed', 'cancelled', 'stopped', 'not-run'];
const allRoles = (state: RoleState) =>
  Object.fromEntries(ROLES.map((r) => [r.node, { state }])) as Record<NodeName, RoleView>;

export const initialViewState = (): ViewState =>
  ({ run: { state: 'idle' }, roles: allRoles('idle'), runtime: null, anomalies: 0, lastSeq: 0 });

export function reduce(s: ViewState, e: ExecutionEvent): ViewState {
  const anomaly = (): ViewState => ({ ...s, anomalies: s.anomalies + 1 });
  if (e.type === 'run-started') {
    if (s.run.state === 'running') return anomaly();
    return { ...s, run: { state: 'running' }, roles: allRoles('waiting'), anomalies: 0, lastSeq: e.seq };
  }
  if (e.seq <= s.lastSeq) return anomaly(); // stale or repeated
  const t = { ...s, lastSeq: e.seq };
  if (e.type === 'runtime') return { ...t, runtime: e.runtime };
  if (s.run.state !== 'running') return { ...t, anomalies: s.anomalies + 1 }; // late event after run end
  if (e.type === 'run-ended') {
    const outcome = e.outcome === 'success' ? 'completed' : e.outcome;
    const kinds = e.errorKinds;
    // Every model error was a cancellation, or every one a failure: each errored role is attributed directly.
    const erroredAs: RoleState = e.outcome === 'cancelled' && kinds.every((k) => k === 'cancelled') ? 'cancelled'
      : e.outcome === 'failed' && kinds.length > 0 && !kinds.includes('cancelled') ? 'failed' : 'stopped';
    let anomalies = s.anomalies;
    const roles = Object.fromEntries(Object.entries(s.roles).map(([node, r]): [string, RoleView] => {
      if (TERMINAL.includes(r.state)) return [node, r];
      if (e.outcome === 'success') anomalies++; // a successful graph leaves no role unfinished
      if (r.state === 'waiting') return [node, { state: 'not-run' }];
      // errored: attributed only when the record allows it; still working: the run ended its work (M9)
      return [node, { state: r.errored ? erroredAs : 'cancelled' }];
    })) as Record<NodeName, RoleView>;
    return { ...t, run: { state: outcome, stage: e.stage }, roles, anomalies };
  }
  const r = s.roles[e.role];
  const legal = r.state === 'working' && !r.errored;
  if (e.type === 'role-started') {
    return r.state === 'waiting' ? { ...t, roles: { ...s.roles, [e.role]: { state: 'working' } } } : { ...t, anomalies: s.anomalies + 1 };
  }
  if (!legal) return { ...t, anomalies: s.anomalies + 1 };
  const next: RoleView = e.type === 'role-completed' ? { state: 'completed' } : { state: 'working', errored: true };
  return { ...t, roles: { ...s.roles, [e.role]: next } };
}

// Text for the canonical panel (FR-029): every state is readable as text.
export const ROLE_TEXT: Record<RoleState, string> = {
  idle: 'idle', waiting: 'waiting', working: 'working (graph)', queued: 'queued', inferring: 'inferring',
  completed: 'completed', failed: 'failed', cancelled: 'cancelled', stopped: 'error (failed/cancelled unclear)', 'not-run': 'not run',
};
export const roleText = (r: RoleView) => ROLE_TEXT[r.state] + (r.errored ? ', error reported' : '');
export const runText = (run: ViewState['run']) =>
  run.state === 'not-run' ? 'not run (blocked)' : run.stage && run.state !== 'completed' ? `${run.state} · ${run.stage}` : run.state;
