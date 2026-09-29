// Feature 009 dialog box narration (data-model.md "Narration"): one Korean line per run or role state
// change, from the Feature 008 view state only. Role names stay English (FR-001a). Nothing here claims
// which role's request is inferring or queued (FR-024, F008-O1). Pure.
import type { RoleState, ViewState } from './view-state.ts';

type Role = { node: string; label: string };
const ROLE_LINE: Partial<Record<RoleState, (r: string) => string>> = {
  working: (r) => `${r}가 작업을 시작했습니다.`,
  completed: (r) => `${r}가 작업을 마쳤습니다.`,
  failed: (r) => `${r}에서 오류가 발생했습니다.`,
  cancelled: (r) => `${r}의 작업이 취소되었습니다.`,
  stopped: (r) => `${r}가 오류로 멈췄습니다 (실패/취소 구분 불가).`,
  'not-run': (r) => `${r}는 실행되지 않았습니다.`,
};
const stage = (s?: string) => (s ? ` (${s})` : '');
const RUN_END: Partial<Record<ViewState['run']['state'], (run: ViewState['run']) => string>> = {
  completed: () => '분석이 끝났습니다.',
  failed: (run) => `분석이 실패했습니다${stage(run.stage)}.`,
  cancelled: (run) => `분석이 취소되었습니다${stage(run.stage)}.`,
  'not-run': () => '분석을 시작할 수 없습니다.',
};

export function narrate(prev: ViewState, next: ViewState, roles: readonly Role[]): string[] {
  const runChanged = prev.run.state !== next.run.state;
  const lines = runChanged && next.run.state === 'running' ? ['새 분석을 시작합니다.'] : [];
  for (const r of roles) {
    const a = prev.roles[r.node as keyof ViewState['roles']].state, b = next.roles[r.node as keyof ViewState['roles']].state;
    const line = a !== b && ROLE_LINE[b];
    if (line) lines.push(line(r.label));
  }
  const end = runChanged && RUN_END[next.run.state];
  if (end) lines.push(end(next.run));
  return lines;
}
