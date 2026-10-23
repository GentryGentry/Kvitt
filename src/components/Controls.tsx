import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLocaleLowerCase('sv');
  const i = q ? text.toLocaleLowerCase('sv').indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function Segment<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export function SearchField({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="field field--search">
      <div className="field__box">
        <Icon name="search" />
        <input
          id={id}
          className="field__input"
          type="text"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={placeholder}
          aria-label={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button className="field__act" type="button" aria-label="Rensa sökning" onClick={() => onChange('')}>
            <Icon name="close" />
          </button>
        )}
      </div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button className="switch" type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />
  );
}

/** Rad i inställningar och menyer: etikett, bisats, meta och chevron. */
export function SetRow({
  label,
  sub,
  meta,
  lead,
  chevron = true,
  onClick,
  disabled,
  expanded,
}: {
  label: ReactNode;
  sub?: ReactNode;
  meta?: ReactNode;
  lead?: 'export' | 'import';
  chevron?: boolean;
  onClick: () => void;
  disabled?: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      className={`setrow${disabled ? ' is-disabled' : ''}`}
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
    >
      {lead && <Icon name={lead} className="lead" />}
      <span className="setrow__main" style={{ flex: 1 }}>
        {label}
        {sub && <span className="setrow__sub">{sub}</span>}
      </span>
      {(meta !== undefined || chevron) && (
        <span className="setrow__meta">
          {meta}
          {chevron && <Icon name="chevron" className="chev" />}
        </span>
      )}
    </button>
  );
}
