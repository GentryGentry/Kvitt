import type { ReactNode } from 'react';

/** Förhandsvisning i sheets: tom (streckad) eller med "från → till" och en fotrad. */
export function Preview({
  idle,
  from,
  to,
  unit = 'km',
  color,
  foot,
}: {
  idle: string;
  from?: string;
  to?: string;
  unit?: string;
  color?: string;
  foot?: ReactNode;
}) {
  if (!to) {
    return (
      <output className="preview preview--idle" aria-live="polite">
        <p>{idle}</p>
      </output>
    );
  }
  return (
    <output className="preview" aria-live="polite">
      <span className="preview__from">{from}</span>
      <span className="preview__to" style={color ? { color } : undefined}>
        {to}
        <small>{unit}</small>
      </span>
      <span className="preview__foot">{foot}</span>
    </output>
  );
}
