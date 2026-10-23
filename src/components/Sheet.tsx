import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
  kind: 'ate' | 'ran';
  title: string;
  onClose: () => void;
  onDelete?: () => void;
  children: ReactNode;
  footer: ReactNode;
}

const OUT_MS = 160;

export function Sheet({ kind, title, onClose, onDelete, children, footer }: Props) {
  const [out, setOut] = useState(false);
  const kb = useViewport();

  const close = useCallback(() => {
    setOut(true);
    window.setTimeout(onClose, OUT_MS);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <>
      <div className={`scrim${out ? ' is-out' : ''}`} onClick={close} />
      <section
        className={`sheet${out ? ' is-out' : ''}`}
        data-kind={kind}
        data-kb={kb}
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
        <div className="sheet__body">{children}</div>
        <div className="sheet__foot">{footer}</div>
      </section>
    </>
  );
}
