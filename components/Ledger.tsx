'use client';
// Feature 010 모의 거래 window (US4, FR-022, FR-023): record a final decision as a simulated trade, list and delete.
// Always labelled "모의 거래 (실제 주문 아님)"; nothing here changes the portfolio or makes a request.
import { useState } from 'react';
import { tradeError, type PaperTrade } from '../src/ledger.ts';
import styles from './Shell.module.css';

export type Draft = Omit<PaperTrade, 'id' | 'at' | 'action' | 'quantity'>;
const ACTION: Record<PaperTrade['action'], string> = { buy: '모의 매수', sell: '모의 매도', hold: '보유 유지' };
const LABEL = '모의 거래 (실제 주문 아님)';
const basis = (b: PaperTrade['priceBasis']) =>
  `${b.value.toLocaleString('ko-KR')} ${b.currency} (${b.source === 'latest-fixture' ? '예시 데이터 최신가' : b.source === 'latest-live' ? '최신 시세' : '평균 매수가'})`;

export default function Ledger({ entries, draft, notice, onSave, onDelete, onDiscard }: {
  entries: PaperTrade[]; draft?: Draft; notice?: string;
  onSave: (t: PaperTrade) => void; onDelete: (id: string) => void; onDiscard: () => void;
}) {
  const [action, setAction] = useState<PaperTrade['action']>('hold');
  const [quantity, setQuantity] = useState('0');
  const [error, setError] = useState<string>();
  return (
    <div data-ledger="">
      <p className={styles.advice}>{LABEL} — 기록만 남기며 어떤 주문도 보내지 않습니다.</p>
      {notice && <p className={styles.warn} role="status">{notice}</p>}
      {draft && (
        <form className={styles.form} aria-label="모의 거래 기록" onSubmit={(e) => {
          e.preventDefault();
          const t: PaperTrade = { ...draft, id: `${Date.now()}`, at: new Date().toISOString(), action, quantity: Number(quantity) };
          const err = tradeError(t);
          if (err) setError(err); else { setError(undefined); setAction('hold'); setQuantity('0'); onSave(t); }
        }}>
          <p>{draft.name} · 기준 가격 {basis(draft.priceBasis)}</p>
          <label>행동
            <select value={action} onChange={(e) => setAction(e.target.value as PaperTrade['action'])}>
              {Object.entries(ACTION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>수량 <input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
          {error && <p className={styles.warn} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button type="submit">기록</button>
            <button type="button" onClick={onDiscard}>취소</button>
          </div>
        </form>
      )}
      {entries.length ? (
        <ul className={styles.holdings}>
          {entries.map((t) => (
            <li key={t.id} data-trade={t.id}>
              <span>[{LABEL}]</span>
              <span>{t.at.slice(0, 10)} · {t.name} · {ACTION[t.action]} {t.quantity.toLocaleString('ko-KR')} · 기준 {basis(t.priceBasis)}</span>
              <button type="button" onClick={() => onDelete(t.id)}>삭제</button>
            </li>
          ))}
        </ul>
      ) : <p className={styles.muted}>기록된 모의 거래가 없습니다.</p>}
    </div>
  );
}
