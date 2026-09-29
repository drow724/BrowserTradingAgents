'use client';
import { useEffect, useRef, useState } from 'react';
import type { DomFact, RuntimeSnapshot } from '../src/view/execution-events.ts';
import type { PixelMessage } from '../src/view/pixel-adapter.ts';
import type { RoleState, ViewState } from '../src/view/view-state.ts';

// Feature 008 execution view (specs/008-…/contracts/). It only reads the status surface src/main.ts
// already writes — it never writes, clicks or dispatches outside its own section, and never starts a run.
// The text panel is canonical; the Pixel Agents iframe is a decorative projection of the same state.
// `?viz=off` disables both. The view modules are imported inside the effect (the Boot pattern): a static
// import pulls LangGraph (via the ROLES constant) into the page's first-load JS (verification T013, M1).
const ICON: Record<RoleState, string> = {
  idle: '·', waiting: '…', working: '▶', queued: '⏸', inferring: '◆', completed: '✓', failed: '✗', cancelled: '■', stopped: '!', 'not-run': '–',
};
type Loaded = {
  roles: readonly { node: string; label: string }[];
  roleText: typeof import('../src/view/view-state.ts').roleText;
  runText: typeof import('../src/view/view-state.ts').runText;
};
const count = (el: HTMLElement, key: 'mounts' | 'observers' | 'iframes' | 'ignoredRequests', d: number) => {
  el.dataset[key] = String(Number(el.dataset[key] ?? 0) + d);
};

export default function ExecutionView() {
  const box = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [lib, setLib] = useState<Loaded>();
  const [view, setView] = useState<ViewState>();
  const [health, setHealth] = useState<'ok' | 'off' | 'unavailable' | 'error'>('ok');
  const [mode, setMode] = useState('');
  // Pixel Agents on demand (D5, F008-011): off on every load, page-session state only — never stored.
  const [pixelEnabled, setPixelEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pixelOn = useRef(false);
  const syncPixel = useRef<() => void>(undefined);
  const togglePixel = () => { pixelOn.current = !pixelOn.current; setPixelEnabled(pixelOn.current); syncPixel.current?.(); };

  useEffect(() => {
    if (new URLSearchParams(location.search).get('viz') === 'off') { setHealth('off'); return; }
    const cleanups: (() => void)[] = [];
    let disposed = false;
    const el = box.current!;
    count(el, 'mounts', 1); // test-visible: Strict Mode runs this effect, its cleanup, then again
    void Promise.all([import('../src/graph/trading-graph.ts'), import('../src/view/execution-events.ts'),
      import('../src/view/view-state.ts')]).then(([{ ROLES }, { mapFacts, newCursor, snapshotFacts }, vs]) => {
      if (disposed) return;
      setLib({ roles: ROLES, roleText: vs.roleText, runText: vs.runText });
      const $ = (id: string) => document.getElementById(id);
      const status = $('status'), evidence = $('evidence'), runtime = $('runtime'), modeEl = $('mode');
      const nodes = ROLES.map((r) => $(`node-${r.node}`));
      if (!status || !evidence || !runtime || !modeEl || nodes.some((n) => !n)) { setHealth('unavailable'); return; }

      const cursor = newCursor();
      let state = vs.initialViewState();
      let broken = false;
      let onState: ((s: ViewState) => void) | undefined; // the Pixel presentation lifecycle, if enabled
      const readRuntime = (): RuntimeSnapshot | undefined => {
        const d = runtime.dataset;
        return d.state === undefined ? undefined : { state: d.state, active: d.active ?? '', queued: d.queued ?? '' };
      };
      const apply = (facts: DomFact[]) => {
        if (broken) return;
        try {
          for (const e of mapFacts(facts, cursor, () => evidence.textContent ?? '')) state = vs.reduce(state, e);
          setView(state);
          setMode(modeEl.textContent ?? '');
          el.dataset.anomalies = String(state.anomalies + cursor.anomalies);
        } catch (e) {
          broken = true; // keep the last good text; never rethrow into the page (FR-019)
          console.error('execution view stopped', e);
          setHealth('error');
          return;
        }
        onState?.(state);
      };

      // Mount: start from the current DOM, not from idle (M8).
      apply(snapshotFacts({ status: status.textContent ?? '', runtime: readRuntime(),
        nodes: Object.fromEntries(ROLES.map((r, i) => [r.node, nodes[i]!.textContent ?? ''])) }));

      // Transitions come from each record's added text, never from the element's current value (H1);
      // only #runtime is read as its latest value.
      const observer = new MutationObserver((records) => {
        const facts: DomFact[] = [];
        for (const r of records) {
          if (r.target === runtime) { const rt = readRuntime(); if (rt) facts.push({ el: 'runtime', runtime: rt }); continue; }
          const added = r.addedNodes[0];
          if (r.target === modeEl || added?.nodeType !== Node.TEXT_NODE) continue;
          const text = (added as Text).data;
          if (r.target === status) facts.push({ el: 'status', text });
          else facts.push({ el: 'node', node: (r.target as Element).id.slice('node-'.length), text });
        }
        apply(facts);
      });
      for (const n of [status, modeEl, ...nodes]) observer.observe(n!, { childList: true });
      observer.observe(runtime, { attributes: true, attributeFilter: ['data-state', 'data-active', 'data-queued'] });
      count(el, 'observers', 1);
      cleanups.push(() => { observer.disconnect(); count(el, 'observers', -1); });

      // Pixel Agents (contracts/pixel-host-protocol.md), a presentation lifecycle only (F008-011): the iframe
      // exists only while the user enabled it AND the observed run is `running` AND its area is in the
      // viewport — off, idle, terminal or off-screen means no iframe (no timer, no grace period). It never exists under reduced motion, nor when
      // this deployment does not serve the webview (D4). Nothing here reads or drives execution.
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setReducedMotion(true); return; }
      const stageEl = stage.current!;
      let running = false, visible = false, off = false, mounting = false;
      let frame: HTMLIFrameElement | undefined, detach: (() => void) | undefined;
      let push: ((s: ViewState) => void) | undefined;
      // Webview check, adapter and decoded sprites: once per view, reused by every mount.
      let pixel: Promise<Awaited<ReturnType<typeof loadPixel>>> | undefined;
      const loadPixel = async () => {
        if (!(await fetch('/pixel-agents/index.html', { method: 'HEAD' })).ok) throw new Error('webview not served');
        const [adapter, { loadPixelAssets }] = await Promise.all([import('../src/view/pixel-adapter.ts'), import('../src/view/pixel-assets.ts')]);
        return { ...adapter, assets: await loadPixelAssets() };
      };
      const unmount = () => {
        if (!frame) return;
        detach!(); frame.remove(); frame = undefined; count(el, 'iframes', -1);
      };
      const stop = (e: unknown) => { console.error('pixel view stopped', e); off = true; unmount(); };
      const mount = async () => {
        mounting = true;
        let p: Awaited<ReturnType<typeof loadPixel>>;
        try { p = await (pixel ??= loadPixel()); } catch (e) { stop(e); return; } finally { mounting = false; }
        if (disposed || off || frame || !(pixelOn.current && running && visible)) return;
        const f = (frame = document.createElement('iframe'));
        f.src = '/pixel-agents/index.html';
        f.title = 'Pixel Agents office (decorative; the text above is authoritative)';
        f.setAttribute('sandbox', 'allow-scripts'); // opaque origin: no parent.document (F008-007)
        // Compact viewport: the upstream canvas backing store follows it (480×320, verification F008-011).
        f.style.cssText = 'display:block;width:100%;max-width:480px;aspect-ratio:3/2;border:0';
        let sent: ViewState | null = null;
        // An opaque-origin frame can only be addressed with '*'; the payload is view state only.
        const post = (ms: PixelMessage[]) => { for (const m of ms) f.contentWindow?.postMessage(m, '*'); };
        // Trust: only this frame's window (the sandbox origin "null" is not a signal), our shim's envelope,
        // and a string type. Only webviewReady gets a response; launchAgent and the rest are never acted on.
        const onMessage = (e: MessageEvent) => {
          if (e.source !== f.contentWindow) return;
          const type = (e.data as { source?: unknown; message?: { type?: unknown } } | null)?.message?.type;
          if ((e.data as { source?: unknown })?.source !== 'pixel-agents' || typeof type !== 'string') return;
          if (type !== 'webviewReady') { count(el, 'ignoredRequests', 1); return; }
          try { post(p.startSequence(p.assets.messages, p.assets.layout)); post(p.messagesFor(null, state)); sent = state; }
          catch (err) { stop(err); }
        };
        push = (s) => { if (!sent) return; try { post(p.messagesFor(sent, s)); sent = s; } catch (err) { stop(err); } };
        addEventListener('message', onMessage);
        detach = () => { removeEventListener('message', onMessage); push = undefined; };
        stageEl.append(f);
        count(el, 'iframes', 1);
      };
      const sync = () => {
        if (off || broken || disposed || !(pixelOn.current && running && visible)) unmount();
        else if (!frame && !mounting) void mount();
      };
      onState = (s) => { running = s.run.state === 'running'; push?.(s); sync(); };
      syncPixel.current = sync;
      const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
      io.observe(stageEl);
      cleanups.push(() => { io.disconnect(); unmount(); syncPixel.current = undefined; });
      onState(state); // a view mounted mid-run starts from the current snapshot
    }, (e) => { console.error('execution view unavailable', e); if (!disposed) setHealth('unavailable'); });
    return () => { disposed = true; for (const c of cleanups) c(); };
  }, []);

  if (health === 'off') return null;
  const rt = view?.runtime;
  return (
    <section ref={box} id="execution-view" aria-label="Execution view" data-health={health}
      data-mounts="0" data-observers="0" data-iframes="0" data-ignored-requests="0" data-anomalies="0">
      <h2>Execution view</h2>
      {health !== 'ok' && <p id="view-health">status unavailable{health === 'error' ? ' (view error; last known state shown)' : ''}</p>}
      {lib && view && (
        <>
          <p aria-live="polite">Run: <span id="view-run" data-state={view.run.state}>{lib.runText(view.run)}</span></p>
          <ul id="view-roles">
            {lib.roles.map((r) => {
              const role = view.roles[r.node as keyof ViewState['roles']];
              return (
                <li key={r.node} data-role={r.node} data-state={role.state}>
                  <span aria-hidden="true">{ICON[role.state]} </span>{r.label}: {lib.roleText(role)}
                </li>
              );
            })}
          </ul>
          <p>Runtime (AkariSP, whole runtime): <span id="view-runtime">{rt ? `state ${rt.state} · active ${rt.active} · queued ${rt.queued}` : '—'}</span></p>
          <p>Roles show graph state only: which role&apos;s request is active or queued is not attributed.</p>
          <p>Mode: <span id="view-mode">{mode || '—'}</span></p>
          <p>
            <button id="view-pixel-toggle" type="button" aria-pressed={pixelEnabled} disabled={reducedMotion} onClick={togglePixel}>
              {pixelEnabled ? 'Hide Pixel Agents' : 'Show Pixel Agents'}
            </button>
            {' '}
            <span id="view-pixel-note">
              {reducedMotion ? 'unavailable: reduced motion is preferred'
                : pixelEnabled ? 'shown during a run while this area is on screen (decorative; the text above is authoritative)'
                  : 'off (optional; uses extra rendering resources while shown)'}
            </span>
          </p>
        </>
      )}
      <div ref={stage} id="view-stage" />
    </section>
  );
}
