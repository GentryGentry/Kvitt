import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastOptions {
  /** Fetstilt del först, till exempel postens namn. */
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

interface ToastApi {
  show: (t: ToastOptions) => void;
  dismiss: () => void;
}

const Ctx = createContext<ToastApi>({ show: () => {}, dismiss: () => {} });
export const useToast = () => useContext(Ctx).show;
export const useDismissToast = () => useContext(Ctx).dismiss;

const DURATION_MS = 6000;
const OUT_MS = 120;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { key: number; out?: boolean }) | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const key = useRef(0);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast((t) => (t ? { ...t, out: true } : t));
    timer.current = window.setTimeout(() => setToast(null), OUT_MS);
  }, []);

  const show = useCallback(
    (t: ToastOptions) => {
      window.clearTimeout(timer.current);
      setToast({ ...t, key: ++key.current });
      timer.current = window.setTimeout(dismiss, DURATION_MS);
    },
    [dismiss],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Ctx.Provider value={{ show, dismiss }}>
      {children}
      {toast && (
        <div className={`toast${toast.out ? ' is-out' : ''}`} role="status" aria-live="polite" key={toast.key}>
          <p className="toast__msg">
            {toast.title && <b>{toast.title}</b>}
            {toast.title ? ' ' : ''}
            {toast.message}
          </p>
          {toast.actionLabel && (
            <button
              className="toast__undo"
              onClick={async () => {
                dismiss();
                await toast.onAction?.();
              }}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
