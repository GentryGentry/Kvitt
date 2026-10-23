import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { Icon } from './Icon';

/** Följer visualViewport så att sheeten ligger ovanför tangentbordet. */
function useViewport(): boolean {
  const [kb, setKb] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    if (!vv) return;
    const on = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--kb', `${inset}px`);
      root.style.setProperty('--vvh', `${vv.height}px`);
      setKb(inset > 80);
    };
    on();
    vv.addEventListener('resize', on);
    vv.addEventListener('scroll', on);
    return () => {
      vv.removeEventListener('resize', on);
      vv.removeEventListener('scroll', on);
      root.style.removeProperty('--kb');
      root.style.removeProperty('--vvh');
    };
  }, []);
  return kb;
}

interface Props {
  /** Färgar sheeten (ond/god). Utelämnat = neutral. */
  kind?: 'ate' | 'ran';
  title: string;
  onClose: () => void;
  onDelete?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

const OUT_MS = 160;

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.6; // px/ms
const DISMISS_MIN = 30;

export function Sheet({ kind, title, onClose, onDelete, children, footer }: Props) {
  const [out, setOut] = useState(false);
  const [scrollable, setScrollable] = useState(false);
  const kb = useViewport();
  const sheetRef = useRef<HTMLElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; t0: number; dy: number; id: number } | null>(null);

  const close = useCallback(() => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setOut(true);
    window.setTimeout(onClose, OUT_MS);
  }, [onClose]);

  // Är innehållet längre än arket? Då är det kroppen som scrollar, annars går hela arket att dra.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [children]);

  function onPointerDown(e: RPointerEvent) {
    const t = e.target as HTMLElement;
    if (t.closest('button, input, textarea, a, select, [role="option"]')) return;
    const handle = t.closest('.grabber, .sheet__head');
    const idleBody = !scrollable && t.closest('.sheet__body, .sheet__foot');
    if (!handle && !idleBody) return;
    drag.current = { y0: e.clientY, t0: e.timeStamp, dy: 0, id: e.pointerId };
    sheetRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: RPointerEvent) {
    const d = drag.current;
    const el = sheetRef.current;
    if (!d || !el) return;
    d.dy = Math.max(0, e.clientY - d.y0);
    el.style.transition = 'none';
    el.style.transform = `translateY(${d.dy}px)`;
    if (scrimRef.current) {
      scrimRef.current.style.transition = 'none';
      scrimRef.current.style.opacity = String(Math.max(0, 1 - d.dy / (el.offsetHeight || 1)));
    }
  }

  function endDrag(e: RPointerEvent) {
    const d = drag.current;
    const el = sheetRef.current;
    drag.current = null;
    if (!d || !el) return;
    const velocity = d.dy / Math.max(1, e.timeStamp - d.t0);
    if (d.dy > DISMISS_DISTANCE || (d.dy > DISMISS_MIN && velocity > DISMISS_VELOCITY)) {
      (document.activeElement as HTMLElement | null)?.blur?.();
      el.style.transition = `transform ${OUT_MS}ms ease-in`;
      el.style.transform = 'translateY(100%)';
      if (scrimRef.current) {
        scrimRef.current.style.transition = `opacity ${OUT_MS}ms linear`;
        scrimRef.current.style.opacity = '0';
      }
      window.setTimeout(onClose, OUT_MS);
      return;
    }
    // Släppte för tidigt: fjädra tillbaka.
    el.style.transition = 'transform 200ms var(--ease-out, cubic-bezier(.2,.8,.2,1))';
    el.style.transform = '';
    if (scrimRef.current) {
      scrimRef.current.style.transition = 'opacity 200ms linear';
      scrimRef.current.style.opacity = '';
    }
    window.setTimeout(() => {
      el.style.transition = '';
      if (scrimRef.current) scrimRef.current.style.transition = '';
    }, 220);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <>
      <div ref={scrimRef} className={`scrim${out ? ' is-out' : ''}`} onClick={close} />
      <section
        ref={sheetRef}
        className={`sheet${out ? ' is-out' : ''}`}
        data-scrollable={scrollable}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        data-kind={kind}
        data-kb={kb}
        onFocusCapture={(e) => {
          // Tangentbordet tar plats: se till att fältet du skriver i hålls synligt.
          const t = e.target as HTMLElement;
          if (t.matches('input, textarea')) window.setTimeout(() => t.scrollIntoView({ block: 'nearest' }), 300);
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <span className="grabber" aria-hidden="true" />
        <header className="sheet__head">
          <h2 className="sheet__title" id="sheet-title">
            {title}
          </h2>
          <span style={{ display: 'flex', gap: 8 }}>
            {onDelete && (
              <button className="icon-btn" type="button" aria-label="Ta bort" onClick={onDelete}>
                <Icon name="trash" />
              </button>
            )}
            <button className="icon-btn" type="button" aria-label="Stäng" onClick={close}>
              <Icon name="close" />
            </button>
          </span>
        </header>
        <div className="sheet__body" ref={bodyRef}>
          {children}
        </div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </section>
    </>
  );
}
