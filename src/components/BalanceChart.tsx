import { useId } from 'react';
import { formatShortDate } from '../lib/time';
import type { SeriesPoint } from '../lib/stats';
import { balanceTone } from '../lib/calc';
import s from './BalanceChart.module.css';

const W = 360;
const H = 256;
const PAD_X = 20;
const TOP = 24;
const BOTTOM = 214;

/** Skala som alltid rymmer noll, med luft och minst 10 km spann. */
export function chartRange(values: number[]): { lo: number; hi: number } {
  let lo = Math.min(0, ...values);
  let hi = Math.max(0, ...values);
  if (hi - lo < 10) {
    const mid = (hi + lo) / 2;
    lo = Math.min(lo, mid - 5);
    hi = Math.max(hi, mid + 5);
  }
  const pad = (hi - lo) * 0.1;
  return { lo: lo - pad, hi: hi + pad };
}

export function BalanceChart({ points, label }: { points: SeriesPoint[]; label: string }) {
  const id = useId();
  const real = points.filter((p): p is { day: string; value: number } => p.value !== null);
  const { lo, hi } = chartRange(real.map((p) => p.value));
  const x = (i: number) => PAD_X + (i * (W - 2 * PAD_X)) / Math.max(1, points.length - 1);
  const y = (v: number) => TOP + ((hi - v) / (hi - lo)) * (BOTTOM - TOP);
  const zy = y(0);

  const idx = points.map((p, i) => (p.value === null ? -1 : i)).filter((i) => i >= 0);
  const line = idx.map((i, n) => `${n ? 'L' : 'M'}${x(i).toFixed(1)} ${y(points[i].value!).toFixed(1)}`).join(' ');
  const area = idx.length > 1 ? `${line} L${x(idx[idx.length - 1])} ${zy} L${x(idx[0])} ${zy} Z` : '';
  const last = idx.length ? idx[idx.length - 1] : points.length - 1;
  const lastValue = idx.length ? points[last].value! : 0;
  const tone = balanceTone(lastValue);
  const firstDay = points[0]?.day;

  return (
    <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <defs>
        <clipPath id={`${id}-up`}>
          <rect x="0" y="0" width={W} height={zy} />
        </clipPath>
        <clipPath id={`${id}-dn`}>
          <rect x="0" y={zy} width={W} height={H - zy} />
        </clipPath>
      </defs>
      {area && (
        <>
          <path d={area} className={s.areaGood} clipPath={`url(#${id}-up)`} />
          <path d={area} className={s.areaEvil} clipPath={`url(#${id}-dn)`} />
        </>
      )}
      <line x1={PAD_X} x2={W - PAD_X} y1={zy} y2={zy} className={s.zero} />
      <text x={PAD_X} y={zy - 8} className={s.axis}>0</text>
      {line && idx.length > 1 && <path d={line} className={s.line} />}
      <circle
        cx={x(last)}
        cy={y(lastValue)}
        r="6"
        className={s.dot}
        data-tone={tone}
      />
      {firstDay && (
        <text x={PAD_X} y={H - 4} className={s.axis}>
          {formatShortDate(`${firstDay}T12:00:00Z`)}
        </text>
      )}
      <text x={W - PAD_X} y={H - 4} textAnchor="end" className={s.axis}>idag</text>
    </svg>
  );
}
