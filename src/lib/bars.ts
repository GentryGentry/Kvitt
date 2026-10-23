import { niceStep } from './chart';
import type { DayStat } from './overview';

export const BAR_MARGIN = { left: 20, right: 20, gutter: 36, top: 20, bottom: 30 };
const MIN_SLOTS = 7;
export const WEEKLY_ABOVE = 31;

export interface BarDay {
  /** Första dagen i stapeln (en dag, eller veckans första dag). */
  day: string;
  ate: number;
  ran: number;
  net: number;
}

/** Över 31 dagar grupperas per vecka, räknat bakifrån så att senaste veckan är full. */
export function aggregate(days: DayStat[]): { bars: BarDay[]; weekly: boolean } {
  if (days.length <= WEEKLY_ABOVE) {
    return { bars: days.map((d) => ({ day: d.day, ate: d.ate, ran: d.ran, net: d.net })), weekly: false };
  }
  const bars: BarDay[] = [];
  for (let end = days.length; end > 0; end -= 7) {
    const part = days.slice(Math.max(0, end - 7), end);
    const ate = part.reduce((a, d) => a + d.ate, 0);
    const ran = part.reduce((a, d) => a + d.ran, 0);
    bars.unshift({ day: part[0].day, ate, ran, net: ate + ran });
  }
  return { bars, weekly: true };
}

export interface BarsLayout {
  xs: number[];
  slot: number;
  bw: number;
  x0: number;
  xr: number;
  yz: number;
  hi: number;
  lo: number;
  y: (v: number) => number;
  ticks: { value: number; y: number }[];
  clip: number | null;
  net: string;
}

/** Port av drawBars. Stora enstaka poster klipps vid 1,7 × p90 (brott + utskrivet värde). */
export function layoutBars(bars: BarDay[], W: number, H: number): BarsLayout {
  const { left: x0, right: R, gutter: G, top: y0, bottom: B } = BAR_MARGIN;
  const xr = W - R - G;
  const y1 = H - B;
  const n = bars.length;
  const N = Math.max(MIN_SLOTS, n);
  const slot = (xr - x0) / N;
  const bw = Math.max(2, slot * 0.62);
  const xc = (i: number) => x0 + (N - n + i + 0.5) * slot;

  const mags = bars
    .flatMap((d) => [-d.ate, d.ran])
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  const mx = mags[mags.length - 1] || 0;
  const p90 = mags.length ? mags[Math.floor(0.9 * (mags.length - 1))] : 0;
  const clip = mx > 10 && mx > 2.2 * p90 ? p90 * 1.7 : null;
  const upMax = Math.max(3, ...bars.map((d) => d.ran));
  const dnMax = Math.max(3, ...bars.map((d) => -d.ate));
  const hi = (clip ? Math.min(upMax, clip) : upMax) * 1.12;
  const lo = -(clip ? Math.min(dnMax, clip) : dnMax) * 1.12;
  const y = (v: number) => y0 + ((hi - Math.max(lo, Math.min(hi, v))) / (hi - lo)) * (y1 - y0);
  const yz = y(0);

  const step = niceStep(hi - lo);
  const all: number[] = [];
  for (let k = Math.ceil(lo / step); k * step <= hi; k++) if (k) all.push(k * step);
  const ticks = all
    .sort((a, b) => Math.abs(a) - Math.abs(b))
    .slice(0, 2)
    .map((value) => ({ value, y: y(value) }));

  const f = (v: number) => v.toFixed(1);
  const net = n >= 2 ? bars.map((d, i) => `${i ? 'L' : 'M'}${f(xc(i))} ${f(y(d.net))}`).join('') : '';
  return { xs: bars.map((_, i) => xc(i)), slot, bw, x0, xr, yz, hi, lo, y, ticks, clip, net };
}
