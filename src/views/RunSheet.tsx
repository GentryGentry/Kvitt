import { useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { useToast } from '../components/Toast';
import { logRun } from '../lib/actions';
import { formatKm, parseNumber, roundRunKm, validateRunKm } from '../lib/calc';
import { commonDistances } from '../lib/stats';
import type { RunEntry } from '../lib/types';
import { TimeField } from './shared';
import s from './sheet.module.css';

interface Props {
  runs: RunEntry[];
  balanceKm: number;
  onClose: () => void;
}

const asText = (km: number) => String(km).replace('.', ',');

export function RunSheet({ runs, balanceKm, onClose }: Props) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [at, setAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const quick = useMemo(() => commonDistances(runs), [runs]);
  const km = parseNumber(text);
  const error = validateRunKm(km === undefined ? undefined : roundRunKm(km));
  const showError = touched && text.trim() !== '' && error;
  const valid = km !== undefined && !error;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    const logged = await logRun(km, at ?? new Date().toISOString());
    toast({
      message: `Sprang ${formatKm(logged.entry.km)}`,
      actionLabel: 'Ångra',
      onAction: logged.undo,
    });
    onClose();
  }

  const footer = (
    <>
      <div className={s.preview}>
        {valid ? (
          <>
            <span className={s.previewMain}>
              {formatKm(roundRunKm(km), { sign: true })} → saldo blir{' '}
              {formatKm(balanceKm + roundRunKm(km), { sign: true })}
            </span>
          </>
        ) : (
          <span className={s.previewSub}>Saldot nu: {formatKm(balanceKm, { sign: true })}</span>
        )}
      </div>
      <div className={s.actions}>
        <button className={s.primary} disabled={!valid || busy} onClick={submit}>
          Logga
        </button>
      </div>
    </>
  );

  return (
    <BottomSheet title="Jag sprang" onClose={onClose} footer={footer}>
      <div className={s.pad}>
        <label className={s.field} style={{ marginTop: 4 }}>
          <span className={s.label}>Kilometer</span>
          <input
            ref={inputRef}
            className={`${s.input} ${s.big}`}
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            placeholder="0,0"
            aria-invalid={Boolean(showError)}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setTouched(true);
                void submit();
              }
            }}
          />
        </label>
        {showError && <p className={s.error}>{error}</p>}

        {quick.length > 0 && (
          <div className={s.quick}>
            {quick.map((d) => (
              <button
                key={d}
                className={s.quickBtn}
                onClick={() => {
                  setText(asText(d));
                  setTouched(true);
                }}
              >
                {formatKm(d)}
              </button>
            ))}
          </div>
        )}

        <TimeField value={at} onChange={setAt} />
      </div>
    </BottomSheet>
  );
}
