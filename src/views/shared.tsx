import { useState } from 'react';
import { Clock } from 'lucide-react';
import { fromLocalInput, toLocalInput } from '../lib/time';
import s from './sheet.module.css';

/** "Ändra tid"-rad. value null = nu. */
export function TimeField({
  value,
  onChange,
  startOpen = false,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  if (!open) {
    return (
      <button className={s.link} onClick={() => setOpen(true)}>
        <Clock size={15} strokeWidth={1.75} />
        Ändra tid
      </button>
    );
  }
  return (
    <label className={s.field}>
      <span className={s.label}>Tidpunkt</span>
      <input
        className={s.input}
        type="datetime-local"
        value={toLocalInput(value ?? new Date().toISOString())}
        onChange={(e) => onChange(fromLocalInput(e.target.value) ?? null)}
      />
    </label>
  );
}
