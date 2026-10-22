import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import s from './BottomSheet.module.css';

function useViewport() {
  const read = () => {
    const vv = window.visualViewport;
    if (!vv) return { inset: 0, height: window.innerHeight };
    return { inset: Math.max(0, window.innerHeight - vv.height - vv.offsetTop), height: vv.height };
  };
  const [v, setV] = useState(read);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const on = () => setV(read());
    vv.addEventListener('resize', on);
    vv.addEventListener('scroll', on);
    return () => {
      vv.removeEventListener('resize', on);
      vv.removeEventListener('scroll', on);
    };
  }, []);
  return v;
}

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function BottomSheet({ title, onClose, children, footer }: Props) {
  const [shown, setShown] = useState(false);
  const { inset, height } = useViewport();

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const close = useCallback(() => {
    setShown(false);
    window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <div className={s.layer} data-shown={shown}>
      <div className={s.scrim} onClick={close} />
      <section
        className={s.sheet}
        data-kb={inset > 80}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ bottom: inset, maxHeight: Math.max(240, height - 12) }}
      >
        <header className={s.header}>
          <h2 className={s.title}>{title}</h2>
          <button className={s.close} onClick={close} aria-label="Stäng">
            <X size={20} strokeWidth={1.75} />
          </button>
        </header>
        <div className={s.body}>{children}</div>
        {footer && <footer className={s.footer}>{footer}</footer>}
      </section>
    </div>
  );
}
