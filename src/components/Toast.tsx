import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import s from './Toast.module.css';

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

const Ctx = createContext<(t: ToastOptions) => void>(() => {});
export const useToast = () => useContext(Ctx);

const DURATION_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const key = useRef(0);

  const show = useCallback((t: ToastOptions) => {
    window.clearTimeout(timer.current);
    setToast({ ...t, key: ++key.current });
    timer.current = window.setTimeout(() => setToast(null), DURATION_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <div className={s.wrap} role="status" aria-live="polite" key={toast.key}>
          <div className={s.toast}>
            <span className={s.message}>{toast.message}</span>
            {toast.actionLabel && (
              <button
                className={s.action}
                onClick={async () => {
                  window.clearTimeout(timer.current);
                  setToast(null);
                  await toast.onAction?.();
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
