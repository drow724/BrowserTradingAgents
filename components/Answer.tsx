'use client';
// Feature 010 answer window (FR-015, FR-029): the final answer with every unsupported claim marked "근거 확인 안 됨"
// and every unrecognised form "확인 불가 표기" (text labels, not colour alone), the counts, and the facts the model
// was given. Reads the finished evidence record only.
import type { Fact } from '../src/analysis/facts.ts';
import type { Claim, Grounding } from '../src/analysis/grounding.ts';
import styles from './Shell.module.css';

export type AnalysisRecord = { outcome: string; analysis?: { holding: string; question: string; facts: Fact[];
  grounding?: Grounding; answerLanguage?: string }; result?: { finalDecision?: string } };

const LABEL: Partial<Record<Claim['status'], string>> = { unsupported: '근거 확인 안 됨', unrecognised: '확인 불가 표기' };

function Marked({ text, claims }: { text: string; claims: Claim[] }) {
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const c of claims.filter((c) => LABEL[c.status])) {
    parts.push(text.slice(at, c.start));
    parts.push(<mark key={c.start} className={styles.flag} data-claim={c.status} title={LABEL[c.status]}>
      {text.slice(c.start, c.end)}<span className={styles.flagLabel}> [{LABEL[c.status]}]</span></mark>);
    at = c.end;
  }
  parts.push(text.slice(at));
  return <p data-answer="">{parts}</p>;
}

function One({ record, onRecord }: { record: AnalysisRecord; onRecord?: (r: AnalysisRecord) => void }) {
  const a = record.analysis!;
  const answer = record.result?.finalDecision;
  const g = a.grounding;
  return (
    <section data-answer-for={a.holding}>
      <h3>{a.holding}</h3>
      <p className={styles.muted}>질문: {a.question}</p>
      {record.outcome !== 'success' || answer === undefined
        ? <p className={styles.warn}>분석이 끝나지 않았습니다 ({record.outcome}).</p>
        : <Marked text={answer} claims={g?.answer ?? []} />}
      {g && (
        <p data-grounding-counts="">
          근거 확인: 일치 {g.counts.supported}건 · <strong>근거 확인 안 됨 {g.counts.unsupported}건</strong> · 확인 불가 표기 {g.counts.unrecognised}건
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
