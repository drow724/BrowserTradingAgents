'use client';
// Feature 009 JRPG shell (D1, contracts/portfolio-storage.md). The slots are server-rendered and hold every
// element src/main.ts looks up by id, so they are ALWAYS mounted — the shell only hides or shows their
// wrappers and never re-creates them (R10). First visit → onboarding; otherwise the office.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadDirectory, search as searchEntries, statusLine, type Loaded as DirectoryLoaded } from '../src/directory/client.ts';
import { factSet, toInput, type NumberMode } from '../src/analysis/facts.ts';
import { resolve } from '../src/analysis/resolve.ts';
import { PORTFOLIO_FIXTURE } from '../src/analysis/portfolio-fixture.ts';
import { identity, instrumentName, load, reset, save, type Holding, type Loaded, type Portfolio } from '../src/portfolio.ts';
import { fetchQuotes, liveDataSource, liveFixture } from '../src/quotes.ts';
import { loadSources } from '../src/sources.ts';
import Sources from './Sources.tsx';
import Answer, { type AnalysisRecord } from './Answer.tsx';
import Ledger, { type Draft } from './Ledger.tsx';
import { addTrade, loadLedger, removeTrade, saveLedger, type Ledger as LedgerDoc } from '../src/ledger.ts';
import { HoldingsEditor, Onboarding, type Listing, type Search } from './Portfolio.tsx';
import styles from './Shell.module.css';

type Mode = 'stored' | 'session' | 'readonly';
type Props = { hud: ReactNode; stage: ReactNode; results: ReactNode; status: ReactNode };

function Window({ title, dialog, children }: { title: string; dialog: React.RefObject<HTMLDialogElement | null>; children: ReactNode }) {
  return (
    <dialog ref={dialog} className={styles.window} aria-label={title}>
      <header className={styles.windowTitle}>
        <h2>{title}</h2>
        <button type="button" onClick={() => dialog.current?.close()}>닫기</button>
      </header>
      {children}
    </dialog>
  );
}

export default function Shell({ hud, stage, results, status }: Props) {
  // The symbol directory: loaded once per page, refreshed at most once per Seoul day (FR-017).
  const [dir, setDir] = useState<DirectoryLoaded>();
  useEffect(() => { void loadDirectory().then(setDir); }, []);
  const search = useMemo<Search | undefined>(() => dir && {
    find: (assetClass, query) => searchEntries(dir.directory?.entries ?? [], assetClass, query)
      .map(([a, productType, name, ticker, market]): Listing => ({ kind: 'listing', assetClass: a, productType, name, ticker, market })),
    status: (assetClass) => statusLine(dir.sources, assetClass, dir.failed),
  }, [dir]);
  // Feature 010: portfolio runs (contracts/analysis-events.md), one holding per run, in portfolio order. The facts
  // come from the committed fictional fixture (MD-8); a holding without an entry is analysed on its own position
  // facts only. A sequence continues past a failed run and stops at Cancel (FR-012, FR-013).
  // Feature 014: `live` carries the quoted facts and each holding's data source; absent → the fixture (MD-8).
  type Live = { fixture: ReturnType<typeof liveFixture>; sources: Map<string, unknown> };
  type Sequence = { holdings: Holding[]; question: string; index: number; results: AnalysisRecord[]; cancelledAt?: number; live?: Live };
  const seq = useRef<Sequence>(undefined);
  const known = useRef<string[]>([]);
  known.current = dir?.directory?.entries.map((e) => e[3]) ?? [];
  const [progress, setProgress] = useState<{ name: string; k: number; n: number }>();
  const [answers, setAnswers] = useState<AnalysisRecord[]>([]);
  const [cancelMs, setCancelMs] = useState<number>();
  const [notice, setNotice] = useState<string>();
  const answerDialog = useRef<HTMLDialogElement>(null);
  const pickerDialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<string>(); // the question waiting for the picker

  const numberMode = (): NumberMode => {
    const m = new URLSearchParams(location.search).get('numbers');
    return m === 'formatted' || m === 'refs' ? m : 'current';
  };
  // Feature 014: ?quotes=live|fixture (default live) — the example portfolio sets fixture, saving holdings clears it.
  const quotesMode = () => (new URLSearchParams(location.search).get('quotes') === 'fixture' ? 'fixture' : 'live');
  const setQuotes = (mode?: 'fixture') => {
    const u = new URL(location.href);
    if (mode) u.searchParams.set('quotes', mode); else u.searchParams.delete('quotes');
    history.replaceState(history.state, '', u);
  };
  const startRun = (h: Holding, question: string, live?: Live) => {
    const s = factSet(h, live?.fixture);
    document.getElementById('run')!.dispatchEvent(new CustomEvent('bta-analyze', { detail: {
      // Feature 013: ?numbers=current|formatted|refs (default current) selects the final role's number mode.
      input: toInput(s, h, question, numberMode()), holding: identity(h.instrument), question, factSetId: s.id, facts: s.facts,
      knownTickers: known.current,
      dataSource: live?.sources.get(identity(h.instrument)) ?? { mode: 'portfolio-fixture', fixture: 'portfolio-fixture@1' },
    } }));
  };
  const next = () => {
    const s = seq.current!;
    setProgress({ name: instrumentName(s.holdings[s.index].instrument), k: s.index + 1, n: s.holdings.length });
    startRun(s.holdings[s.index], s.question, s.live);
  };
  const quoting = useRef<AbortController>(undefined);
  const shownLive = useRef<Live>(undefined); // the live quotes behind the answers on screen (paper-trade basis)
  const analyse = async (holdings: Holding[], question: string) => {
    if (seq.current || quoting.current || !holdings.length) return;
    portfolioDialog.current?.close();
    pickerDialog.current?.close();
    setNotice(undefined);
    setCancelMs(undefined);
    let live: Live | undefined;
    if (quotesMode() === 'live') {
      // Quotes first, all in parallel; Cancel aborts them and no run starts (FR-009).
      const ac = (quoting.current = new AbortController());
      setProgress({ name: '시세 조회', k: 0, n: holdings.length });
      try {
        const quotes = await fetchQuotes(holdings, ac.signal, undefined, loadSources().quotes);
        live = { fixture: liveFixture(quotes), sources: new Map(await Promise.all([...quotes].map(async ([id, q]) => [id, await liveDataSource(q)] as const))) };
      } catch {
        setProgress(undefined);
        setNotice('시세 조회를 취소했습니다. 분석을 시작하지 않았습니다.');
        return;
      } finally {
        quoting.current = undefined;
      }
    }
    seq.current = { holdings, question, index: 0, results: [], live };
    next();
  };
  useEffect(() => {
    const run = document.getElementById('run')!, cancel = document.getElementById('cancel')!;
    const done = (e: Event) => {
      const s = seq.current, r = (e as CustomEvent<AnalysisRecord>).detail;
      if (!s || !r.analysis) return;
      s.results.push(r);
      s.index++;
      if (s.cancelledAt === undefined && r.outcome !== 'cancelled' && s.index < s.holdings.length) { setTimeout(next); return; }
      if (s.cancelledAt !== undefined) setCancelMs(Math.round(performance.now() - s.cancelledAt)); // dogfooding (T027)
      seq.current = undefined;
      setProgress(undefined);
      shownLive.current = s.live;
      setAnswers(s.results);
      answerDialog.current?.showModal();
    };
    const onCancel = () => {
      quoting.current?.abort(new Error('cancelled by user'));
      if (seq.current && seq.current.cancelledAt === undefined) seq.current.cancelledAt = performance.now();
    };
    run.addEventListener('bta-done', done);
    cancel.addEventListener('click', onCancel);
    return () => { run.removeEventListener('bta-done', done); cancel.removeEventListener('click', onCancel); };
  }, []);
  // Feature 010 paper-trade ledger (US4): browser-only; price basis = the example data's latest price when the run
  // had one, else the average purchase price.
  const ledgerDialog = useRef<HTMLDialogElement>(null);
  const [ledger, setLedger] = useState<LedgerDoc>({ version: 1, entries: [] });
  const [ledgerNotice, setLedgerNotice] = useState<string>();
  const [draft, setDraft] = useState<Draft>();
  useEffect(() => {
    const l = loadLedger();
    if (l.state === 'ok') setLedger(l.ledger);
    else setLedgerNotice(l.state === 'unavailable' ? '이 브라우저에 저장할 수 없어 기록이 유지되지 않습니다.' : '저장된 모의 거래 기록을 읽을 수 없습니다.');
  }, []);
  const putLedger = (l: LedgerDoc) => {
    setLedger(l);
    if (!saveLedger(l)) setLedgerNotice('이 브라우저에 저장할 수 없어 기록이 유지되지 않습니다.');
  };
  const recordTrade = (r: AnalysisRecord) => {
    const h = portfolio?.holdings.find((x) => identity(x.instrument) === r.analysis!.holding);
    if (!h) return;
    // Feature 014 (FR-017): a live run's own latest price; the fixture price only for fixture runs; else the average.
    const live = r.dataSource?.mode === 'portfolio-live';
    const f = ((live ? shownLive.current?.fixture.instruments : PORTFOLIO_FIXTURE.instruments) as
      Record<string, { latestPrice: number; currency: string } | undefined> | undefined)?.[r.analysis!.holding];
    const latest = f && f.currency === h.currency;
    setDraft({ holding: r.analysis!.holding, name: instrumentName(h.instrument), question: r.analysis!.question,
      priceBasis: { value: latest ? f.latestPrice : h.averagePrice, currency: h.currency,
        source: latest ? (live ? 'latest-live' : 'latest-fixture') : 'average' },
      runRef: `${new Date().toISOString()} ${r.analysis!.holding}` });
    answerDialog.current?.close();
    ledgerDialog.current?.showModal();
  };
  const ask = (question: string) => {
    const holdings = portfolio?.holdings ?? [];
    if (!holdings.length) { setNotice('먼저 보유 자산을 추가하세요.'); return; }
    const r = resolve(question, holdings, dir?.directory?.entries);
    if (r.kind === 'holdings') analyse(holdings.filter((h) => r.identities.includes(identity(h.instrument))), question);
    else if (r.kind === 'not-held') setNotice(`보유하지 않은 종목입니다: ${r.name}`);
    else { setPending(question); pickerDialog.current?.showModal(); }
  };
  const loadExample = () => {
    if (portfolio?.holdings.length && !confirm('지금 포트폴리오를 예시 포트폴리오(가상 종목)로 바꿀까요?')) return;
    persist({ ...(portfolio ?? { version: 1, onboardedAt: new Date().toISOString() }), holdings: PORTFOLIO_FIXTURE.portfolio as Holding[] });
    setQuotes('fixture'); // fictional instruments: fictional facts (Feature 014 R8)
  };
  const listed = useMemo(() => new Set(dir?.directory?.entries.map((e) => `${e[0]}:${e[3]}`)), [dir]);
  const missing = (h: Holding) => h.instrument.kind === 'listing' && !!dir?.directory && !listed.has(`${h.instrument.assetClass}:${h.instrument.ticker}`);
  const [loaded, setLoaded] = useState<Loaded | null>(null); // null: before the first client read
  const [portfolio, setPortfolio] = useState<Portfolio>();
  const [mode, setMode] = useState<Mode>('stored');
  const resultsDialog = useRef<HTMLDialogElement>(null);
  const statusDialog = useRef<HTMLDialogElement>(null);
  const portfolioDialog = useRef<HTMLDialogElement>(null);

  // Before the first paint: no flash of the wrong screen.
  useLayoutEffect(() => {
    const l = load();
    setLoaded(l);
    if (l.state === 'ok') setPortfolio(l.portfolio);
  }, []);

  const persist = (p: Portfolio) => {
    setPortfolio(p);
    if (mode === 'stored' && !save(p)) setMode('session');
  };
  const finish = (holdings: Holding[]) => {
    const p: Portfolio = { version: 1, onboardedAt: new Date().toISOString(), holdings };
    setQuotes();
    const stored = loaded?.state !== 'unavailable' && save(p);
    setMode(stored ? 'stored' : 'session');
    setPortfolio(p);
    setLoaded({ state: 'ok', portfolio: p });
  };
  const resetAll = () => {
    if (!confirm('포트폴리오를 모두 지우고 처음부터 다시 시작할까요?')) return;
    reset();
    portfolioDialog.current?.close();
    setPortfolio(undefined);
    setMode('stored');
    setLoaded({ state: 'first' });
  };

  const phase = !loaded ? 'loading' : loaded.state === 'first' || loaded.state === 'unavailable' ? 'onboarding' : 'office';
  const open = (d: React.RefObject<HTMLDialogElement | null>) => () => d.current?.showModal();
  return (
    <div className={styles.shell} data-phase={phase}>
      <header className={styles.hud} hidden={phase !== 'office'}>
        {hud}
        <form className={styles.ask} onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get('question');
          if (typeof q === 'string' && q.trim()) ask(q.trim()); }}>
          <label>질문 <input name="question" placeholder="예: 삼성전자가 계속 하락 중인데 괜찮은 건가요?" autoComplete="off" /></label>
          <button type="submit" disabled={!!progress}>질문하기</button>
          <button type="button" disabled={!!progress || !portfolio?.holdings.length}
            onClick={() => analyse(portfolio?.holdings ?? [], '전체 포트폴리오 점검')}>전체 점검</button>
        </form>
        {progress && <p data-analysing="">분석 중: {progress.name} ({progress.k} / {progress.n})</p>}
        {notice && <p className={styles.warn} role="status" data-ask-notice="">{notice}</p>}
        <nav className={styles.menu} aria-label="메뉴">
          <button type="button" onClick={open(portfolioDialog)}>포트폴리오</button>
          <button type="button" onClick={open(answerDialog)}>답변</button>
          <button type="button" onClick={open(ledgerDialog)}>모의 거래</button>
          <button type="button" onClick={open(resultsDialog)}>결과</button>
          <button type="button" onClick={open(statusDialog)}>상태</button>
        </nav>
      </header>
      {loaded?.state === 'unreadable' && mode !== 'readonly' && (
        <p className={styles.notice} role="alert">
          저장된 포트폴리오를 읽을 수 없습니다.{' '}
          <button type="button" onClick={resetAll}>초기화</button>{' '}
          <button type="button" onClick={() => setMode('readonly')}>읽기 전용으로 유지</button>
        </p>
      )}
      {mode === 'session' && <p className={styles.notice} role="status">이 브라우저에 저장할 수 없어 이번 방문 동안만 유지됩니다.</p>}
      <main className={styles.stage} hidden={phase !== 'office'}>{stage}</main>

      <Window title="결과" dialog={resultsDialog}>
        <p className={styles.advice}>이 결과는 분석이며 투자 조언이 아닙니다. 실제 주문은 하지 않습니다.</p>
        {results}
      </Window>
      <Window title="상태" dialog={statusDialog}>{status}</Window>
      <Window title="답변" dialog={answerDialog}><Answer records={answers} cancelMs={cancelMs} onRecord={recordTrade} /></Window>
      <Window title="모의 거래" dialog={ledgerDialog}>
        <Ledger entries={ledger.entries} draft={draft} notice={ledgerNotice} onDiscard={() => setDraft(undefined)}
          onSave={(t) => { putLedger(addTrade(ledger, t)); setDraft(undefined); }} onDelete={(id) => putLedger(removeTrade(ledger, id))} />
      </Window>
      <Window title="종목 선택" dialog={pickerDialog}>
        <form onSubmit={(e) => { e.preventDefault(); const ids = new FormData(e.currentTarget).getAll('pick');
          analyse((portfolio?.holdings ?? []).filter((h) => ids.includes('ALL') || ids.includes(identity(h.instrument))), pending ?? ''); }}>
          <p>질문에서 종목을 찾지 못했습니다. 분석할 종목을 고르세요.</p>
          <label className={styles.choice}><input type="checkbox" name="pick" value="ALL" /> 전체</label>
          {(portfolio?.holdings ?? []).map((h) => (
            <label key={identity(h.instrument)} className={styles.choice}>
              <input type="checkbox" name="pick" value={identity(h.instrument)} /> {instrumentName(h.instrument)}
            </label>
          ))}
          <div className={styles.actions}><button type="submit">분석</button></div>
        </form>
      </Window>
      <Window title="포트폴리오" dialog={portfolioDialog}>
        {portfolio ? (
          <HoldingsEditor holdings={portfolio.holdings} search={search} readOnly={mode === 'readonly'} missing={missing}
            onAnalyze={(h) => analyse([h], `${instrumentName(h.instrument)} 보유 현황을 분석해 주세요.`)}
            onChange={(holdings) => { persist({ ...portfolio, holdings }); setQuotes(); }} />
        ) : <p className={styles.muted}>{loaded?.state === 'unreadable' ? '읽기 전용: 저장된 내용을 표시할 수 없습니다.' : '포트폴리오가 없습니다.'}</p>}
        <div className={styles.actions}>
          <button type="button" onClick={loadExample}>예시 포트폴리오</button>
          <button type="button" onClick={resetAll}>초기화</button>
        </div>
        <Sources entries={dir?.directory?.entries}
          onImport={(holdings) => { persist({ ...(portfolio ?? { version: 1, onboardedAt: new Date().toISOString() }), holdings }); setQuotes(); }} />
      </Window>

      {phase === 'onboarding' && (
        <Onboarding onFinish={finish} search={search}
          notice={loaded?.state === 'unavailable' ? '이 브라우저에 저장할 수 없어 이번 방문 동안만 유지됩니다.' : undefined} />
      )}
    </div>
  );
}
