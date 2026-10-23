import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, Stepper, TextInput, TimeField } from '../components/Fields';
import { Sheet } from '../components/Sheet';
import { useToast } from '../components/Toast';
import { logRun } from '../lib/actions';
import { formatKm, MAX_RUN_KM, MIN_RUN_KM, parseNumber, roundRunKm } from '../lib/calc';
import { commonDistances } from '../lib/stats';
import type { RunEntry } from '../lib/types';
import { Preview } from './Preview';

export const RUN_ERROR = 'Ange mellan 0,1 och 200 km.';
const STEP = 0.5;

export const kmText = (km: number) => String(km).replace('.', ',');

/** Giltig sträcka eller undefined. */
export function validKm(text: string): number | undefined {
  const n = parseNumber(text);
  if (n === undefined) return undefined;
  const km = roundRunKm(n);
  return km >= MIN_RUN_KM && km <= MAX_RUN_KM ? km : undefined;
}

export function stepKm(text: string, delta: number): string {
  const cur = parseNumber(text) ?? 0;
  const next = Math.min(MAX_RUN_KM, Math.max(MIN_RUN_KM, Math.round((cur + delta) * 100) / 100));
  return kmText(next);
}

export function RunPreview({ km, baseKm }: { km: number | undefined; baseKm: number }) {
  if (km === undefined) return <Preview idle="Ange sträckan så visar jag nya saldot." />;
  const next = baseKm + km;
  const tone = Math.round(next * 10) > 0 ? 'var(--credit)' : Math.round(next * 10) < 0 ? 'var(--debt)' : 'var(--text)';
  return (
    <Preview
      idle=""
      from="Nytt saldo"
      to={formatKm(next, { sign: true, unit: false })}
      color={tone}
      foot={
        <>
          Från {formatKm(baseKm, { sign: true })} · <b>{formatKm(km, { sign: true })}</b>
        </>
      }
    />
  );
}

interface Props {
  runs: RunEntry[];
  baseKm: number;
  onClose: () => void;
}

export function RunSheet({ runs, baseKm, onClose }: Props) {
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [at, setAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  const quick = useMemo(() => commonDistances(runs), [runs]);
  const km = validKm(text);
  const error = km === undefined && (text.trim() !== '' || touched) ? RUN_ERROR : undefined;

  async function submit() {
    if (km === undefined || busy) return;
    setBusy(true);
    const logged = await logRun(km, at ?? new Date().toISOString());
    toast({
      title: formatKm(logged.entry.km),
      message: 'loggad',
      actionLabel: 'Ångra',
      onAction: logged.undo,
    });
    onClose();
  }

  const footer = (
    <>
      <RunPreview km={km} baseKm={baseKm} />
      <button className="btn" type="button" disabled={km === undefined || busy} onClick={submit}>
        Logga
      </button>
    </>
  );

  return (
    <Sheet kind="ran" title="Jag sprang" onClose={onClose} footer={footer}>
      <Field id="s-val" label="Sträcka" hero error={error}>
        <TextInput
          ref={ref}
          id="s-val"
          hero
          value={text}
          onChange={setText}
          onBlur={() => setTouched(true)}
          onEnter={submit}
          placeholder="0,0"
          inputMode="decimal"
          enterKeyHint="done"
          invalid={Boolean(error)}
        />
        <span className="field__unit">km</span>
        <Stepper step="0,5 km" onDec={() => setText(stepKm(text, -STEP))} onInc={() => setText(stepKm(text, STEP))} />
      </Field>
      {quick.length > 0 && (
        <div className="chips" role="group" aria-label="Vanliga sträckor">
          {quick.map((d) => (
            <button
              key={d}
              className="chip"
              type="button"
              aria-pressed={km !== undefined && Math.abs(km - d) < 0.001}
              onClick={() => {
                setText(kmText(d));
                setTouched(true);
              }}
            >
              {kmText(d)} km
            </button>
          ))}
        </div>
      )}
      <TimeField value={at} onChange={setAt} />
    </Sheet>
  );
}
