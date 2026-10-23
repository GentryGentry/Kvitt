import { forwardRef, useState, type ReactNode } from 'react';
import { fromLocalInput, toLocalInput } from '../lib/time';
import { Icon } from './Icon';

interface FieldProps {
  id: string;
  label: string;
  hero?: boolean;
  error?: string;
  /** Etiketten finns för skärmläsare men syns inte. */
  hideLabel?: boolean;
  children: ReactNode;
}

/** Fältram med etikett och felmeddelande. Fel visas aldrig i rött, utan i text med varningsikon. */
export function Field({ id, label, hero, error, hideLabel, children }: FieldProps) {
  return (
    <div className={`field${hero ? ' field--hero' : ''}${error ? ' is-error' : ''}`}>
      <label className={`field__label${hideLabel ? ' sr-only' : ''}`} htmlFor={id}>
        {label}
      </label>
      <div className="field__box">{children}</div>
      <p className="field__msg" role="alert" hidden={!error}>
        <Icon name="alert" />
        <span>{error}</span>
      </p>
    </div>
  );
}

interface InputProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  onEnter?: () => void;
  placeholder?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  num?: boolean;
  /** Hjältefält: bredden följer innehållet (ersätter field-sizing, som saknas före Safari 26). */
  hero?: boolean;
  invalid?: boolean;
  enterKeyHint?: 'next' | 'done' | 'go';
}

export const TextInput = forwardRef<HTMLInputElement, InputProps>(function TextInput(
  { id, value, onChange, onBlur, onEnter, placeholder, inputMode, num, hero, invalid, enterKeyHint },
  ref,
) {
  const shown = value || placeholder || '';
  const seps = (shown.match(/[.,]/g) ?? []).length;
  const digits = Math.max(1, shown.length - seps);
  return (
    <input
      ref={ref}
      id={id}
      className={`field__input${num ? ' field__input--num' : ''}`}
      // Siffror är 1ch, decimaltecken smalare, och bokstavsavståndet är negativt.
      style={hero ? { width: `calc(${digits}ch + ${seps * 0.4}ch - ${shown.length * 0.05}em + 2px)` } : undefined}
      value={value}
      placeholder={placeholder}
      inputMode={inputMode}
      enterKeyHint={enterKeyHint}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      aria-invalid={invalid || undefined}
      maxLength={hero ? 6 : undefined}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
    />
  );
});

export function Stepper({ onDec, onInc, step }: { onDec: () => void; onInc: () => void; step: string }) {
  return (
    <>
      <button className="step" type="button" aria-label={`Minska ${step}`} onClick={onDec}>
        <Icon name="minus" />
      </button>
      <button className="step" type="button" aria-label={`Öka ${step}`} onClick={onInc}>
        <Icon name="plus" />
      </button>
    </>
  );
}

/** "Ändra tid"-länk som öppnar ett datum- och tidsfält. value null = nu. */
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
      <button className="text-btn" type="button" onClick={() => setOpen(true)}>
        <Icon name="clock" />
        Ändra tid
      </button>
    );
  }
  return (
    <div className="field">
      <label className="field__label" htmlFor="time-input">
        Tidpunkt
      </label>
      <div className="field__box">
        <input
          id="time-input"
          className="field__input"
          type="datetime-local"
          value={toLocalInput(value ?? new Date().toISOString())}
          onChange={(e) => onChange(fromLocalInput(e.target.value) ?? null)}
        />
      </div>
    </div>
  );
}
