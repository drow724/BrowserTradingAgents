'use client';
// Feature 009 portfolio UI (US1, US2): the onboarding and the 포트폴리오 window share one holding form.
// Holdings live only in this browser (src/portfolio.ts); nothing here makes a request except the
// directory search the parent passes in (FR-012).
import { useState } from 'react';
import {
  currenciesFor, FIXED, identity, instrumentName, parseHolding, unitFor,
  type Currency, type Holding, type InstrumentRef, type ProductType,
} from '../src/portfolio.ts';
import styles from './Shell.module.css';

export type Listing = Extract<InstrumentRef, { kind: 'listing' }>;
// Directory search as the parent provides it; `status` is shown under the search box (FR-018).
export type Search = { find: (assetClass: 'KR' | 'US', query: string) => Listing[]; status: (assetClass: 'KR' | 'US') => string };
type AssetClass = 'BTC' | 'KRX-GOLD' | 'KR' | 'US';
const CLASSES: [AssetClass, string][] = [['BTC', FIXED.BTC], ['KRX-GOLD', FIXED['KRX-GOLD']], ['KR', '국내 주식'], ['US', '미국 주식']];
const TYPE: Record<ProductType, string> = { stock: '주식', preferred: '우선주', etf: 'ETF', etn: 'ETN', reit: '리츠' };
const classOf = (i: InstrumentRef): AssetClass => (i.kind === 'fixed' ? i.id : i.assetClass);
const money = (h: Holding) => `${h.averagePrice.toLocaleString('ko-KR')} ${h.currency}`;

export function HoldingList({ holdings, onEdit, onRemove, missing }: {
  holdings: Holding[]; onEdit?: (h: Holding) => void; onRemove?: (h: Holding) => void; missing?: (h: Holding) => boolean;
}) {
  if (!holdings.length) return <p className={styles.muted}>아직 등록한 자산이 없습니다.</p>;
  return (
    <ul className={styles.holdings}>
      {holdings.map((h) => (
        <li key={identity(h.instrument)} data-holding={identity(h.instrument)}>
          <span>{instrumentName(h.instrument)}{h.instrument.kind === 'listing' && ` (${h.instrument.ticker})`}</span>
          <span>{h.quantity.toLocaleString('ko-KR', { maximumFractionDigits: 8 })} {unitFor(h.instrument)} · 평균 {money(h)}</span>
          {missing?.(h) && <span className={styles.warn}>현재 목록에 없음</span>}
          {onEdit && <button type="button" onClick={() => onEdit(h)}>수정</button>}
          {onRemove && <button type="button" onClick={() => onRemove(h)}>삭제</button>}
        </li>
      ))}
    </ul>
  );
}

export function HoldingForm({ holdings, editing, search, onSave, onCancel, onEditExisting }: {
  holdings: Holding[]; editing?: Holding; search?: Search;
  onSave: (h: Holding) => void; onCancel: () => void; onEditExisting: (h: Holding) => void;
}) {
  const [cls, setCls] = useState<AssetClass>(editing ? classOf(editing.instrument) : 'BTC');
  const [listing, setListing] = useState<Listing | undefined>(editing?.instrument.kind === 'listing' ? editing.instrument : undefined);
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState(editing ? String(editing.quantity) : '');
  const [price, setPrice] = useState(editing ? String(editing.averagePrice) : '');
  const [currency, setCurrency] = useState<Currency>(editing?.currency ?? 'KRW');
  const [error, setError] = useState<{ field: string; message: string }>();
  const instrument: InstrumentRef | undefined = cls === 'BTC' || cls === 'KRX-GOLD' ? { kind: 'fixed', id: cls } : listing;
  const currencies: Currency[] = instrument ? currenciesFor(instrument) : [cls === 'US' ? 'USD' : 'KRW'];
  const duplicate = instrument && !editing && holdings.find((h) => identity(h.instrument) === identity(instrument));
  const results = (cls === 'KR' || cls === 'US') && search && query.trim() ? search.find(cls, query) : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instrument) { setError({ field: 'instrument', message: '종목을 검색해서 선택해 주세요.' }); return; }
    if (duplicate) return;
    const r = parseHolding({ instrument, quantity, averagePrice: price, currency: currencies.includes(currency) ? currency : currencies[0] });
    if ('error' in r) setError(r.error); else onSave(r.ok);
  };
  return (
    <form className={styles.form} onSubmit={submit} aria-label="자산 입력" noValidate>
      <fieldset disabled={!!editing}>
        <legend>자산 종류</legend>
        {CLASSES.map(([c, label]) => (
          <label key={c} className={styles.choice}>
            <input type="radio" name="asset-class" value={c} checked={cls === c}
              onChange={() => { setCls(c); setListing(undefined); setQuery(''); setError(undefined); }} />
            {label}
          </label>
        ))}
      </fieldset>
      {(cls === 'KR' || cls === 'US') && !editing && (
        <div className={styles.search}>
          <label>종목 검색 <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setListing(undefined); }}
            placeholder={cls === 'KR' ? '이름 또는 종목코드' : 'Ticker or name'} autoComplete="off" /></label>
          <p className={styles.muted} data-directory-status="">{search ? search.status(cls) : '종목 목록을 불러오는 중입니다.'}</p>
          {!listing && results.length > 0 && (
            <ul className={styles.results} aria-label="검색 결과">
              {results.map((r) => (
                <li key={r.ticker}><button type="button" onClick={() => { setListing(r); setQuery(r.name); setError(undefined); }}>
                  {r.name} <span className={styles.muted}>{r.ticker} · {r.market} · {TYPE[r.productType]}</span>
                </button></li>
              ))}
            </ul>
          )}
          {listing && <p>선택: <strong>{listing.name}</strong> ({listing.ticker} · {listing.market} · {TYPE[listing.productType]})</p>}
        </div>
      )}
      {duplicate ? (
        <p className={styles.warn} role="alert">이미 있는 종목입니다. <button type="button" onClick={() => onEditExisting(duplicate)}>수정하기</button></p>
      ) : (
        <>
          <label>수량{instrument && ` (${unitFor(instrument)})`}
            <input inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} aria-invalid={error?.field === 'quantity'} />
          </label>
          <label>평균 매수가
            <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={error?.field === 'averagePrice'} />
          </label>
          {currencies.length > 1 ? (
            <label>통화
              <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                {currencies.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          ) : <p className={styles.muted}>통화: {currencies[0]}</p>}
          {error && <p className={styles.warn} role="alert">{error.message}</p>}
        </>
      )}
      <div className={styles.actions}>
        <button type="submit" disabled={!!duplicate}>{editing ? '저장' : '추가'}</button>
        <button type="button" onClick={onCancel}>취소</button>
      </div>
    </form>
  );
}

// The holdings editor used by both the onboarding and the 포트폴리오 window.
export function HoldingsEditor({ holdings, onChange, search, readOnly, missing }: {
  holdings: Holding[]; onChange: (hs: Holding[]) => void; search?: Search; readOnly?: boolean; missing?: (h: Holding) => boolean;
}) {
  const [form, setForm] = useState<{ editing?: Holding } | null>(null);
  const put = (h: Holding) => {
    onChange([...holdings.filter((x) => identity(x.instrument) !== identity(h.instrument)), h]);
    setForm(null);
  };
  return (
    <div>
      <HoldingList holdings={holdings} missing={missing}
        onEdit={readOnly ? undefined : (h) => setForm({ editing: h })}
        onRemove={readOnly ? undefined : (h) => onChange(holdings.filter((x) => x !== h))} />
      {!readOnly && (form ? (
        <HoldingForm key={form.editing ? identity(form.editing.instrument) : 'new'} holdings={holdings} editing={form.editing}
          search={search} onSave={put} onCancel={() => setForm(null)} onEditExisting={(h) => setForm({ editing: h })} />
      ) : <button type="button" onClick={() => setForm({})}>+ 자산 추가</button>)}
    </div>
  );
}

// First visit (US1): greeting → holdings → confirm. Nothing is stored until finish or skip (FR-003).
export function Onboarding({ onFinish, search, notice }: { onFinish: (holdings: Holding[]) => void; search?: Search; notice?: string }) {
  const [step, setStep] = useState<'hello' | 'holdings' | 'confirm'>('hello');
  const [holdings, setHoldings] = useState<Holding[]>([]);
  return (
    <div className={styles.onboarding} role="dialog" aria-modal="true" aria-labelledby="onboarding-title" data-onboarding={step}>
      <section className={styles.window}>
        <h2 id="onboarding-title">BrowserTradingAgents 사무소</h2>
        {notice && <p className={styles.warn} role="status">{notice}</p>}
        {step === 'hello' && (
          <>
            <p>어서 오세요! 이곳은 여덟 명의 분석가가 일하는 모의투자 사무소입니다.</p>
            <p>먼저 가지고 계신 자산을 알려 주세요. 입력한 내용은 이 브라우저에만 저장되고, 어디로도 보내지 않습니다.</p>
            <p className={styles.muted}>실제 주문은 하지 않습니다. 모든 결과는 분석이며 투자 조언이 아닙니다.</p>
            <div className={styles.actions}>
              <button type="button" onClick={() => setStep('holdings')} autoFocus>시작하기</button>
              <button type="button" onClick={() => onFinish([])}>건너뛰기</button>
            </div>
          </>
        )}
        {step === 'holdings' && (
          <>
            <p>보유 자산을 추가하세요. 비트코인, KRX 금현물, 국내 주식, 미국 주식을 입력할 수 있습니다.</p>
            <HoldingsEditor holdings={holdings} onChange={setHoldings} search={search} />
            <div className={styles.actions}>
              <button type="button" onClick={() => setStep('confirm')}>다음</button>
              <button type="button" onClick={() => onFinish([])}>건너뛰기</button>
            </div>
          </>
        )}
        {step === 'confirm' && (
          <>
            <p>이대로 시작할까요? 나중에 포트폴리오 창에서 언제든 바꿀 수 있습니다.</p>
            <HoldingList holdings={holdings} />
            <div className={styles.actions}>
              <button type="button" onClick={() => onFinish(holdings)} autoFocus>사무소 입장</button>
              <button type="button" onClick={() => setStep('holdings')}>돌아가기</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
