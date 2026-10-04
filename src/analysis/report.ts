// Feature 010 hallucination measurement report (contracts/measurement.md, SC-007). Pure. Grounding and trap
// handling only — never a statement about whether a decision was right (Constitution VIII).
export const TRAP_PHRASES = ['자료에 없', '정보가 없', '알 수 없', '확인할 수 없', '찾을 수 없', '제공되지 않', '포함되어 있지 않',
  // Feature 013 FR-001: refusals seen in the Feature 010 native answers
  '내용이 없', '명시되어 있지 않', '나와 있지 않', '답변할 수 없', '답변을 드릴 수 없', '말씀드릴 수 없', '제공된 사실에 없', '제공된 정보에 없',
  'not available', 'no data', 'cannot determine', 'not provided', 'not contain'];

export type MeasureRun = { question: string; kind: 'single' | 'multi' | 'trap'; holding: string; outcome: string;
  unsupported: number; unrecognised: number; trapHandled?: boolean; language: string; ms: number; answer?: string;
  mode?: 'current' | 'formatted' | 'refs'; violations?: number; error?: string | null; // Feature 013
  mismatch?: number; // Feature 016: semantic mismatches in the answer
  raw?: string; // Feature 017: a refs answer before rendering (its citations can be re-scored offline)
  interpretation?: number; // Feature 017 (F017-R1): unsupported interpretation claims, not in `unsupported`
  structure?: 'eight-role' | 'single-role'; calls?: number }; // Feature 018: absent structure = eight-role (older reports)
export type Aggregate = { runs: number; completed: number; failed: number; zeroUnsupportedRate: number;
  unsupportedPerAnswer: number; unrecognisedPerAnswer: number; trapRuns: number; trapHandledRate: number; koreanRate: number;
  formatViolationRate?: number | null; // Feature 013: refs mode only, null otherwise
  semanticMismatchPerAnswer?: number; // Feature 016: when the runs record mismatches
  interpretationUnsupportedPerAnswer?: number }; // Feature 017: when the runs record interpretations
export type Verdict = 'USABLE' | 'LIMITED' | 'NOT_YET' | 'NOT_APPLICABLE';

// Handled = says the data is not there (committed phrases) and claims nothing unsupported.
export const trapHandled = (answer: string, unsupported: number) =>
  unsupported === 0 && TRAP_PHRASES.some((p) => answer.toLowerCase().includes(p.toLowerCase()));

const rate = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 1000 : 0);

export function aggregate(runs: readonly MeasureRun[]): Aggregate {
  const done = runs.filter((r) => r.outcome === 'success');
  const traps = done.filter((r) => r.kind === 'trap');
  return {
    runs: runs.length, completed: done.length, failed: runs.length - done.length,
    // Feature 016 (FR-020, F016-R3) and 017 (F017-R1): mismatches and interpretations are reported separately, not in
    // this verdict input.
    zeroUnsupportedRate: rate(done.filter((r) => r.unsupported === 0).length, done.length),
    unsupportedPerAnswer: rate(done.reduce((s, r) => s + r.unsupported, 0), done.length),
    unrecognisedPerAnswer: rate(done.reduce((s, r) => s + r.unrecognised, 0), done.length),
    trapRuns: traps.length, trapHandledRate: rate(traps.filter((r) => r.trapHandled).length, traps.length),
    koreanRate: rate(done.filter((r) => r.language === 'ko').length, done.length),
    ...(runs.some((r) => r.mode) ? { formatViolationRate: runs.some((r) => r.mode === 'refs')
      ? rate(done.filter((r) => (r.violations ?? 0) > 0).length, done.length) : null } : {}),
    ...(runs.some((r) => r.mismatch !== undefined) ? { semanticMismatchPerAnswer: rate(done.reduce((s, r) => s + (r.mismatch ?? 0), 0), done.length) } : {}),
    ...(runs.some((r) => r.interpretation !== undefined) ? { interpretationUnsupportedPerAnswer: rate(done.reduce((s, r) => s + (r.interpretation ?? 0), 0), done.length) } : {}),
  };
}

// SC-007. The stand-in echoes its prompt, so its numbers say nothing about a model (NOT_APPLICABLE).
export function verdict(a: Aggregate, evidenceClass: string): Verdict {
  if (evidenceClass !== 'REAL_BROWSER_PROMPT_API') return 'NOT_APPLICABLE';
  if (a.zeroUnsupportedRate >= 0.9 && a.trapHandledRate >= 0.8) return 'USABLE';
  if (a.zeroUnsupportedRate >= 0.7 && a.trapHandledRate >= 0.5) return 'LIMITED';
  return 'NOT_YET';
}
