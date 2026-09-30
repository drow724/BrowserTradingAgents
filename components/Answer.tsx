'use client';
// Feature 010 answer window (FR-015, FR-029): the final answer with every unsupported claim marked "근거 확인 안 됨"
// and every unrecognised form "확인 불가 표기" (text labels, not colour alone), the counts, and the facts the model
// was given. Reads the finished evidence record only.
import type { Fact } from '../src/analysis/facts.ts';
import type { Claim, Grounding } from '../src/analysis/grounding.ts';
import type { Rendered } from '../src/analysis/references.ts';
import styles from './Shell.module.css';

export type AnalysisRecord = { outcome: string; analysis?: { holding: string; question: string; facts: Fact[];
  grounding?: Grounding; answerLanguage?: string; numbers?: { mode: string; raw?: string } & Partial<Rendered> };
  result?: { finalDecision?: string } };

const LABEL: Partial<Record<Claim['status'], string>> = { unsupported: '근거 확인 안 됨', unrecognised: '확인 불가 표기' };

// Marks in text order; the first mark wins where two overlap (format violations before claims, Feature 013).
type Mark = { start: number; end: number; label: string; attr: Record<string, string>; flag: boolean };
function Marked({ text, claims, numbers }: { text: string; claims: Claim[]; numbers?: Partial<Rendered> }) {
  const marks: Mark[] = [
    ...(numbers?.violations ?? []).map((v) => ({ start: v.start, end: v.end, label: '형식 위반', attr: { 'data-violation': v.kind }, flag: true })),
    ...claims.filter((c) => LABEL[c.status]).map((c) => ({ start: c.start, end: c.end, label: LABEL[c.status]!, attr: { 'data-claim': c.status }, flag: true })),
    ...(numbers?.refs ?? []).map((r) => ({ start: r.start, end: r.end, label: r.factId, attr: { 'data-ref': r.name }, flag: false })),
  ];
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const m of marks.sort((a, b) => a.start - b.start)) {
    if (m.start < at) continue;
    parts.push(text.slice(at, m.start));
    parts.push(<mark key={m.start} className={m.flag ? styles.flag : undefined} {...m.attr} title={m.label}>
      {text.slice(m.start, m.end)}<span className={styles.flagLabel}> [{m.label}]</span></mark>);
    at = m.end;
  }
  parts.push(text.slice(at));
  return <p data-answer="">{parts}</p>;
}

function One({ record, onRecord }: { record: AnalysisRecord; onRecord?: (r: AnalysisRecord) => void }) {
  const a = record.analysis!;
  const answer = a.numbers?.rendered ?? record.result?.finalDecision;
  const g = a.grounding;
  return (
    <section data-answer-for={a.holding}>
      <h3>{a.holding}</h3>
      <p className={styles.muted}>질문: {a.question}</p>
      {record.outcome !== 'success' || answer === undefined
        ? <p className={styles.warn}>분석이 끝나지 않았습니다 ({record.outcome}).</p>
        : <Marked text={answer} claims={g?.answer ?? []} numbers={a.numbers} />}
      {g && (
        <p data-grounding-counts="">
          근거 확인: 일치 {g.counts.supported}건 · <strong>근거 확인 안 됨 {g.counts.unsupported}건</strong> · 확인 불가 표기 {g.counts.unrecognised}건
          {a.numbers?.violations && <> · <strong>형식 위반 {a.numbers.violations.length}건</strong></>}
        </p>
      )}
      <details>
        <summary>모델에 준 사실 {a.facts.length}개</summary>
        <ul className={styles.holdings}>{a.facts.map((f) => <li key={f.id}><strong>{f.id}</strong> {f.text}</li>)}</ul>
      </details>
      {onRecord && record.outcome === 'success' && <button type="button" onClick={() => onRecord(record)}>모의 거래로 기록</button>}
    </section>
  );
}

// One question may analyse several holdings (one run each); with more than one, a summary comes first (US3 AS3).
export default function Answer({ records, cancelMs, onRecord }: { records: AnalysisRecord[]; cancelMs?: number; onRecord?: (r: AnalysisRecord) => void }) {
  if (!records.length) return <p className={styles.muted}>아직 답변이 없습니다. 질문하거나 포트폴리오에서 종목을 분석해 보세요.</p>;
  return (
    <div data-answer-window="">
      {records.length > 1 && (
        <table data-summary="">
          <thead><tr><th>종목</th><th>결과</th><th>근거 확인 안 됨</th></tr></thead>
          <tbody>{records.map((r) => (
            <tr key={r.analysis!.holding} data-summary-row={r.analysis!.holding} data-outcome={r.outcome}>
              <td>{r.analysis!.holding}</td><td>{r.outcome}</td><td>{r.analysis!.grounding?.counts.unsupported ?? '–'}</td>
            </tr>))}
          </tbody>
        </table>
      )}
      {cancelMs !== undefined && <p className={styles.muted} data-cancel-ms={cancelMs}>취소됨 (취소 후 {cancelMs} ms 안에 멈춤). 남은 종목은 실행하지 않았습니다.</p>}
      {records.map((r) => <One key={r.analysis!.holding} record={r} onRecord={onRecord} />)}
      <p className={styles.advice}>분석이며 투자 조언이 아닙니다. 실제 주문은 하지 않습니다.</p>
    </div>
  );
}
