'use client';
// Feature 009 office (contracts/office-view.md): the Feature 008 view state drawn by our own small renderer.
// Read-only: it never writes the status surface, starts or cancels a run (FR-030). The canvas is decorative;
// the name tags and the dialog box carry every state as text (FR-023). Art is temporary (MD-6).
import { useEffect, useRef, useState } from 'react';
import { narrate } from '../src/view/narration.ts';
import { character, DECOR, DESKS, PC, PC_ON, ROOM, SEAT, SPRITES, TAG, WORLD } from '../src/view/office-scene.ts';
import type { RoleState, ViewState } from '../src/view/view-state.ts';
import styles from './Office.module.css';

type Props = { view: ViewState; roles: readonly { node: string; label: string }[]; icon: Record<RoleState, string> };
type Node = keyof ViewState['roles'];
const load = (src: string) => new Promise<HTMLImageElement>((ok, fail) => {
  const i = new Image();
  i.onload = () => ok(i);
  i.onerror = () => fail(new Error(`asset missing: ${src}`));
  i.src = src;
});
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export default function Office({ view, roles, icon }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(view);
  const prev = useRef(view);
  const paint = useRef<() => void>(undefined);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    latest.current = view;
    const out = narrate(prev.current, view, roles);
    prev.current = view;
    if (out.length) setLines((ls) => [...ls, ...out].slice(-2));
    paint.current?.(); // reduced motion: this is the only draw
  }, [view, roles]);

  useEffect(() => {
    const ctx = canvas.current!.getContext('2d')!;
    let img: Record<string, HTMLImageElement> | undefined, frame = 0, timer: number | undefined, disposed = false;
    const draw = () => {
      if (!img || document.hidden) return; // FR-028: nothing while hidden
      frame++;
      ctx.fillStyle = ROOM.wall;
      ctx.fillRect(0, 0, WORLD.w, ROOM.wallH);
      ctx.fillStyle = ROOM.wallEdge;
      ctx.fillRect(0, ROOM.wallH - 4, WORLD.w, 4);
      for (let r = 0, y = ROOM.wallH; y < WORLD.h; r++, y += ROOM.tile) {
        for (let c = 0, x = 0; x < WORLD.w; c++, x += ROOM.tile) {
          ctx.fillStyle = ROOM.floor[(r + c) % 2];
          ctx.fillRect(x, y, ROOM.tile, ROOM.tile);
        }
      }
      for (const d of DECOR) ctx.drawImage(img[d.sprite], d.x, d.y);
      roles.forEach((r, i) => {
        const d = DESKS[i], s = latest.current.roles[r.node as Node].state, working = s === 'working';
        const { sheet, hueShift } = character(i);
        const f = working ? sheet.work[frame % sheet.work.length] : sheet.stand;
        ctx.globalAlpha = s === 'not-run' ? 0.4 : 1;
        ctx.filter = hueShift ? `hue-rotate(${hueShift}deg)` : 'none';
        ctx.drawImage(img![`c${i}`], f * sheet.frameW, sheet.row * sheet.frameH, sheet.frameW, sheet.frameH,
          d.x + SEAT.x, d.y + SEAT.y, sheet.frameW, sheet.frameH);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.drawImage(img!.desk, d.x, d.y);
        ctx.drawImage(img![working ? PC_ON[frame % PC_ON.length] : 'pcOff'], d.x + PC.x, d.y + PC.y);
      });
    };
    const srcs: [string, string][] = [...Object.entries(SPRITES), ...roles.map((_, i): [string, string] => [`c${i}`, character(i).sheet.src])];
    Promise.all(srcs.map(async ([k, src]) => [k, await load(src)] as const)).then((loaded) => {
      if (disposed) return;
      img = Object.fromEntries(loaded);
      setStatus('ready');
      draw();
      // 4 Hz is enough for two typing frames; reduced motion draws only on state changes (FR-028).
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = window.setInterval(draw, 250);
    }, (e) => {
      if (disposed) return;
      console.error('office unavailable', e); // FR-029: the text status and runs are unaffected
      setStatus('unavailable');
    });
    paint.current = draw;
    return () => { disposed = true; clearInterval(timer); paint.current = undefined; };
  }, [roles]);

  return (
    <div className={styles.office} data-office={status}>
      <div className={styles.world} hidden={status === 'unavailable'}>
        <canvas ref={canvas} width={WORLD.w} height={WORLD.h} aria-hidden="true" />
        {roles.map((r, i) => {
          const s = view.roles[r.node as Node].state;
          return (
            <span key={r.node} className={`${styles.tag} ${styles[`s-${s}`] ?? ''}`} data-role={r.node} data-state={s}
              style={{ left: pct(DESKS[i].x + TAG.x, WORLD.w), top: pct(DESKS[i].y + TAG.y, WORLD.h) }}>
              <span aria-hidden="true">{icon[s]} </span>{r.label}
            </span>
          );
        })}
      </div>
      {status === 'unavailable' && <p className={styles.unavailable}>오피스를 표시할 수 없습니다</p>}
      <div className={styles.dialog} aria-live="polite" data-office-dialog="">
        {lines.map((l, i) => <p key={`${i}:${l}`}>{l}</p>)}
      </div>
    </div>
  );
}
