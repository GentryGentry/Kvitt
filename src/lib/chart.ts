import { balanceTone, formatDecimal } from './calc';

export interface ChartInput {
  value: number;
  note?: string;
}

export type Kind = 'debt' | 'credit' | 'zero';

/** Samma avrundning som saldot visas med, så färg och siffra aldrig säger emot varandra. */
export function kindOf(v: number): Kind {
  const t = balanceTone(v);
  return t === 'plus' ? 'credit' : t === 'minus' ? 'debt' : 'zero';
}

/** 1, 2, 5 eller 10 gånger tiopotens, minst span/3. */
export function niceStep(span: number): number {
  const raw = span / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
}

export const MARGIN = { left: 20, right: 20, gutter: 36, top: 20, bottom: 30 };
const MIN_SPAN = 6;
const MIN_WINDOW_DAYS = 7;
const JUMP_SHARE = 0.35;

export interface ChartLayout {
  x0: number;
  x1: number;
  xs: number[];
  yz: number;
  ys: number[];
  ticks: { value: number; y: number }[];
  line: string;
  area: string;
  last: { x: number; y: number; kind: Kind };
  notes: { x: number; y: number; text: string; delta: number; anchor: 'start' | 'end'; tx: number }[];
  y: (v: number) => number;
  hi: number;
  lo: number;
}

/** Port av drawChart ur designöverlämningen. Y är linjär, rymmer alltid noll och har 12 % luft. */
export function layoutChart(points: ChartInput[], W: number, H: number): ChartLayout {
  const { left: L, right: R, gutter: G, top: T, bottom: B } = MARGIN;
  const x0 = L;
  const x1 = W - R - G;
  const y0 = T;
  const y1 = H - B;
  const n = points.length;
  const N = Math.max(MIN_WINDOW_DAYS, n);
  const vs = points.map((p) => p.value);
  const vmin = Math.min(0, ...vs);
  const vmax = Math.max(0, ...vs);
  const span = Math.max(vmax - vmin, MIN_SPAN);
  const pad = span * 0.12;
  const lo = vmin - pad + (vmax - vmin < MIN_SPAN ? -(MIN_SPAN - (vmax - vmin)) / 2 : 0);
  const hi = lo + span + 2 * pad;
  const y = (v: number) => y0 + ((hi - v) / (hi - lo)) * (y1 - y0);
  const x = (i: number) => x1 - ((n - 1 - i) * (x1 - x0)) / (N - 1);
  const yz = y(0);
  const xs = points.map((_, i) => x(i));
  const ys = vs.map(y);

  const ticks: ChartLayout['ticks'] = [];
  if (n >= 2) {
    const step = niceStep(hi - lo);
    const all: number[] = [];
    for (let k = Math.ceil(lo / step); k * step <= hi; k++) if (k) all.push(k * step);
    all
      .sort((a, b) => Math.abs(a) - Math.abs(b))
      .slice(0, 2)
      .forEach((value) => ticks.push({ value, y: y(value) }));
  }

  const f = (v: number) => v.toFixed(1);
  const line = n >= 2 ? points.map((p, i) => `${i ? 'L' : 'M'}${f(x(i))} ${f(y(p.value))}`).join('') : '';
  const area = n >= 2 ? `${line}L${f(x(n - 1))} ${f(yz)}L${f(x(0))} ${f(yz)}Z` : '';

  // Högst två etiketter, de största hoppen, med minst 110 px mellan. Etiketten hålls inom diagrammet.
  const candidates: { x: number; y: number; text: string; delta: number }[] = [];
  for (let i = 1; i < n; i++) {
    const text = points[i].note;
    const delta = vs[i] - vs[i - 1];
    if (text && Math.abs(delta) > JUMP_SHARE * (hi - lo)) {
      candidates.push({ x: (x(i) + x(i - 1)) / 2, y: (y(vs[i]) + y(vs[i - 1])) / 2, text, delta });
    }
  }
  candidates.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const notes: ChartLayout['notes'] = [];
  for (const c of candidates) {
    if (notes.length >= 2) break;
    if (notes.some((o) => Math.abs(o.x - c.x) < 110)) continue;
    const width = (c.text.length + 7) * 6.5;
    const fitsLeft = c.x - 10 - width >= x0;
    notes.push({ ...c, anchor: fitsLeft ? 'end' : 'start', tx: fitsLeft ? c.x - 10 : c.x + 10 });
  }

  const lastValue = vs[n - 1] ?? 0;
  return {
    x0,
    x1,
    xs,
    yz,
    ys,
    ticks,
    line,
    area,
    last: { x: x1, y: n ? y(lastValue) : yz, kind: n ? kindOf(lastValue) : 'zero' },
    notes,
    y,
    hi,
    lo,
  };
}

/** Närmaste punkt till x, för skrubbning. */
export function nearestIndex(xs: number[], x: number): number {
  let best = 0;
  for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - x) < Math.abs(xs[best] - x)) best = i;
  return best;
}

export function formatTick(v: number): string {
  return `${v < 0 ? '−' : ''}${formatDecimal(Math.abs(v), 0)}`;
}
