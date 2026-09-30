'use client';
// Feature 015 (research R5, R6): the source per domain and the Toss import (preview → confirm → replace, FR-006).
// Toss options exist only when the local server has the user's own Toss key (status route).
import { useEffect, useState } from 'react';
import type { Entry } from '../src/directory/parse.ts';
import type { Holding } from '../src/portfolio.ts';
import { loadSources, saveSources, type Sources as Choice } from '../src/sources.ts';
import { mapPositions, type ImportResult } from '../src/toss-import.ts';
import styles from './Shell.module.css';

const REASON: Record<string, string> = {
  unauthorized: '토스증권 인증에 실패했습니다. .env.local의 키를 확인하고 서버를 다시 시작하세요.',
  'forbidden-ip': '등록된 IP가 아닙니다. 토스증권 WTS의 Open API 설정에서 이 컴퓨터의 IP를 등록하세요.',
  'rate-limited': '토스증권 호출 한도에 걸렸습니다. 잠시 후 다시 시도하세요.',
  'ambiguous-account': '계좌가 여러 개입니다. .env.local에 BTA_TOSS_ACCOUNT_SEQ를 넣고 서버를 다시 시작하세요.',
  timeout: '토스증권 응답이 너무 늦습니다. 잠시 후 다시 시도하세요.', network: '토스증권에 연결하지 못했습니다.',
};

export default function Sources({ entries, onImport }: { entries?: Entry[]; onImport: (holdings: Holding[]) => void }) {
  const [status, setStatus] = useState<{ available: boolean; reason?: string }>({ available: false });
  const [choice, setChoice] = useState<Choice>({ holdings: 'manual', quotes: 'yahoo' });
  const [preview, setPreview] = useState<ImportResult>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setChoice(loadSources());
    void fetch('/api/toss/status', { cache: 'no-store' }).then((r) => r.json()).then(setStatus).catch(() => undefined);
  }, []);
  const pick = (next: Choice) => { setChoice(next); saveSources(next); };
  const load = async () => {
    setBusy(true); setError(undefined); setPreview(undefined);
    try {
      const body = await (await fetch('/api/toss/holdings', { cache: 'no-store' })).json();
      if (body?.boundary === 'toss') setError(REASON[body.kind] ?? status.reason ?? '토스증권 응답을 처리하지 못했습니다.');
      else setPreview(mapPositions(body.positions, entries ?? []));
    } catch { setError(REASON.network); } finally { setBusy(false); }
  };
  const toss = status.available;
  return (
    <section data-sources="">
      <h3>데이터 소스</h3>
      <fieldset>
        <legend>보유 종목</legend>
        <label><input type="radio" name="holdings-source" checked={choice.holdings === 'manual'} onChange={() => pick({ ...choice, holdings: 'manual' })} /> 직접 입력</label>
        <label><input type="radio" name="holdings-source" checked={choice.holdings === 'toss'} disabled={!toss} onChange={() => pick({ ...choice, holdings: 'toss' })} /> 토스증권</label>
      </fieldset>
      <fieldset>
        <legend>국내·미국 시세</legend>
        <label><input type="radio" name="quotes-source" checked={choice.quotes === 'yahoo'} onChange={() => pick({ ...choice, quotes: 'yahoo' })} /> Yahoo</label>
        <label><input type="radio" name="quotes-source" checked={choice.quotes === 'toss'} disabled={!toss} onChange={() => pick({ ...choice, quotes: 'toss' })} /> 토스증권</label>
      </fieldset>
      {!toss && status.reason && <p className={styles.muted} data-toss-reason="">{status.reason}</p>}
      {toss && choice.holdings === 'toss' && <button type="button" disabled={busy || !entries} onClick={load}>토스에서 가져오기</button>}
      {error && <p className={styles.warn} role="status" data-toss-error="">{error}</p>}
      {preview && (
        <div data-toss-preview="">
          <p>가져올 종목 {preview.holdings.length}개 — 지금 포트폴리오를 이 목록으로 바꿉니다.</p>
          <ul className={styles.holdings}>{preview.holdings.map((h) => <li key={h.instrument.kind === 'listing' ? h.instrument.ticker : h.instrument.id}>
            {h.instrument.kind === 'listing' ? `${h.instrument.name} (${h.instrument.ticker})` : h.instrument.id} · {h.quantity} · 평균 {h.averagePrice} {h.currency}</li>)}</ul>
          {preview.skipped.length > 0 && <ul data-skipped="">{preview.skipped.map((s) => <li key={s.name}>제외: {s.name} — {s.reason}</li>)}</ul>}
          <button type="button" onClick={() => { onImport(preview.holdings); setPreview(undefined); }}>가져오기</button>{' '}
          <button type="button" onClick={() => setPreview(undefined)}>취소</button>
        </div>
      )}
    </section>
  );
}
