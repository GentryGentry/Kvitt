const TZ = 'Europe/Stockholm';

const partsFmt = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const shortDateFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, day: 'numeric', month: 'short' });
const longDateFmt = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

interface Parts {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
}

function parts(ms: number): Parts {
  const p: Record<string, number> = {};
  for (const part of partsFmt.formatToParts(new Date(ms))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  return { y: p.year, mo: p.month, d: p.day, h: p.hour, mi: p.minute };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2025-03-09" i Stockholmstid. */
export function dayKey(iso: string | number | Date): string {
  const p = parts(new Date(iso).getTime());
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
}

export function formatTime(iso: string): string {
  const p = parts(Date.parse(iso));
  return `${pad(p.h)}:${pad(p.mi)}`;
}

function stripDot(s: string): string {
  return s.replace(/\.$/, '');
}

export function formatShortDate(iso: string): string {
  return stripDot(shortDateFmt.format(new Date(iso)));
}

export function formatLongDate(iso: string): string {
  return longDateFmt.format(new Date(iso));
}

/** "Idag 14:32", "I går 09:10", "12 okt 18:05". */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const key = dayKey(iso);
  const today = dayKey(now);
  const yesterday = dayKey(now.getTime() - 24 * 3600 * 1000);
  const time = formatTime(iso);
  if (key === today) return `Idag ${time}`;
  if (key === yesterday) return `I går ${time}`;
  return `${formatShortDate(iso)} ${time}`;
}

/** Värde för <input type="datetime-local">, i Stockholmstid. */
export function toLocalInput(iso: string): string {
  const p = parts(Date.parse(iso));
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

function offsetMinutes(ms: number): number {
  const p = parts(ms);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
  return Math.round((asUtc - Math.floor(ms / 60000) * 60000) / 60000);
}

/** Tolkar "2025-03-09T14:30" som Stockholmstid och ger ISO (UTC). */
export function fromLocalInput(value: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return undefined;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let ms = wall - offsetMinutes(wall) * 60000;
  const off2 = offsetMinutes(ms);
  if (off2 !== offsetMinutes(wall)) ms = wall - off2 * 60000;
  return new Date(ms).toISOString();
}

const DOW = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];
const MON = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function keyParts(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

/** "22 okt" för en dagsnyckel (Stockholmstid). */
export function shortFromKey(key: string): string {
  const { m, d } = keyParts(key);
  return `${d} ${MON[m - 1]}`;
}

/** "Idag", "Igår" eller "tors 22 okt". */
export function dayLabel(key: string, todayKey: string): string {
  if (key === todayKey) return 'Idag';
  const { y, m, d } = keyParts(key);
  const t = keyParts(todayKey);
  const yesterday = new Date(Date.UTC(t.y, t.m - 1, t.d - 1)).toISOString().slice(0, 10);
  if (key === yesterday) return 'Igår';
  return `${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MON[m - 1]}`;
}

/** Heltal dagar mellan två dagsnycklar (a − b). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);
}

export function addDaysToKey(key: string, delta: number): string {
  const { y, m, d } = keyParts(key);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}
