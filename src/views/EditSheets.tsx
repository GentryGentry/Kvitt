import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { BottomSheet } from '../components/BottomSheet';
import { useToast } from '../components/Toast';
import { deleteFood, deleteRun, updateFood, updateRun } from '../lib/actions';
import { formatKm, formatKmApprox, kmFromKcal, parseNumber, roundRunKm, validateRunKm } from '../lib/calc';
import { exactKcal } from '../lib/draft';
import type { FoodEntry, RunEntry } from '../lib/types';
import { TimeField } from './shared';
import s from './sheet.module.css';

export function EditFoodSheet({ entry, onClose }: { entry: FoodEntry; onClose: () => void }) {
  const toast = useToast();
  const [label, setLabel] = useState(entry.label);
  const [kcalText, setKcalText] = useState(String(entry.kcal));
  const [at, setAt] = useState<string | null>(entry.at);

  const kcal = exactKcal(kcalText);
  const valid = kcal !== undefined && label.trim() !== '';

  const footer = (
    <>
      <div className={s.preview}>
        {kcal !== undefined && (
          <span className={s.previewMain}>
            {kcal === entry.kcal && entry.isEstimate
              ? formatKmApprox(kmFromKcal(kcal, entry.kcalPerKmUsed))
              : formatKm(kmFromKcal(kcal, entry.kcalPerKmUsed))}
          </span>
        )}
      </div>
      <div className={s.actions}>
        <button
          className={s.danger}
          aria-label="Radera"
          onClick={async () => {
            const undo = await deleteFood(entry);
            toast({ message: 'Raderade posten', actionLabel: 'Ångra', onAction: undo });
            onClose();
          }}
        >
          <Trash2 size={18} strokeWidth={1.75} />
        </button>
        <button
          className={s.primary}
          disabled={!valid}
          onClick={async () => {
            await updateFood(entry, { label: label.trim(), kcal: kcal!, at: at ?? entry.at });
            onClose();
          }}
        >
          Spara
        </button>
      </div>
    </>
  );

  return (
    <BottomSheet title="Redigera måltid" onClose={onClose} footer={footer}>
      <div className={s.pad}>
        <label className={s.field} style={{ marginTop: 4 }}>
          <span className={s.label}>Text</span>
          <input className={s.input} value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className={s.field}>
          <span className={s.label}>kcal</span>
          <input
            className={s.input}
            inputMode="numeric"
            value={kcalText}
            aria-invalid={kcal === undefined}
            onChange={(e) => setKcalText(e.target.value)}
          />
        </label>
        {kcal === undefined && <p className={s.error}>Ange kcal som ett helt tal mellan 1 och 20 000.</p>}
        <TimeField value={at} onChange={setAt} startOpen />
      </div>
    </BottomSheet>
  );
}

export function EditRunSheet({ entry, onClose }: { entry: RunEntry; onClose: () => void }) {
  const toast = useToast();
  const [text, setText] = useState(String(entry.km).replace('.', ','));
  const [at, setAt] = useState<string | null>(entry.at);

  const km = parseNumber(text);
  const error = validateRunKm(km === undefined ? undefined : roundRunKm(km));

  const footer = (
    <div className={s.actions}>
      <button
        className={s.danger}
        aria-label="Radera"
        onClick={async () => {
          const undo = await deleteRun(entry);
          toast({ message: 'Raderade löprundan', actionLabel: 'Ångra', onAction: undo });
          onClose();
        }}
      >
        <Trash2 size={18} strokeWidth={1.75} />
      </button>
      <button
        className={s.primary}
        disabled={Boolean(error)}
        onClick={async () => {
          await updateRun(entry, { km: km!, at: at ?? entry.at });
          onClose();
        }}
      >
        Spara
      </button>
    </div>
  );

  return (
    <BottomSheet title="Redigera löprunda" onClose={onClose} footer={footer}>
      <div className={s.pad}>
        <label className={s.field} style={{ marginTop: 4 }}>
          <span className={s.label}>Kilometer</span>
          <input
            className={`${s.input} ${s.big}`}
            inputMode="decimal"
            value={text}
            aria-invalid={Boolean(error)}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        {error && <p className={s.error}>{error}</p>}
        <TimeField value={at} onChange={setAt} startOpen />
      </div>
    </BottomSheet>
  );
}
