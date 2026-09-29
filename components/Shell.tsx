'use client';
// Feature 009 JRPG shell (D1, contracts/portfolio-storage.md). The slots are server-rendered and hold every
// element src/main.ts looks up by id, so they are ALWAYS mounted — the shell only hides or shows their
// wrappers and never re-creates them (R10). First visit → onboarding; otherwise the office.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadDirectory, search as searchEntries, statusLine, type Loaded as DirectoryLoaded } from '../src/directory/client.ts';
import { load, reset, save, type Holding, type Loaded, type Portfolio } from '../src/portfolio.ts';
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
        <nav className={styles.menu} aria-label="메뉴">
          <button type="button" onClick={open(portfolioDialog)}>포트폴리오</button>
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
      <Window title="포트폴리오" dialog={portfolioDialog}>
        {portfolio ? (
          <HoldingsEditor holdings={portfolio.holdings} search={search} readOnly={mode === 'readonly'} missing={missing}
            onChange={(holdings) => persist({ ...portfolio, holdings })} />
        ) : <p className={styles.muted}>{loaded?.state === 'unreadable' ? '읽기 전용: 저장된 내용을 표시할 수 없습니다.' : '포트폴리오가 없습니다.'}</p>}
        <div className={styles.actions}><button type="button" onClick={resetAll}>초기화</button></div>
      </Window>

      {phase === 'onboarding' && (
        <Onboarding onFinish={finish} search={search}
          notice={loaded?.state === 'unavailable' ? '이 브라우저에 저장할 수 없어 이번 방문 동안만 유지됩니다.' : undefined} />
      )}
    </div>
  );
}
