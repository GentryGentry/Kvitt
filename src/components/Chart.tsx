import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { formatKm } from '../lib/calc';
import { formatTick, kindOf, layoutChart, nearestIndex, type ChartInput } from '../lib/chart';
import { formatShortDate } from '../lib/time';
import type { SeriesPoint } from '../lib/stats';

interface Props {
  points: SeriesPoint[];
  scrub: number | null;
  onScrub: (index: number | null) => void;
}

const fmt = (v: number) => formatKm(v, { unit: false });
const dayLabel = (day: string) => formatShortDate(`${day}T12:00:00Z`);

export function Chart({ points, scrub, onScrub }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w: W, h: H } = size;
  const n = points.length;
  const inputs: ChartInput[] = points.map((p) => ({ value: p.value, note: p.note }));
  const lay = W && H ? layoutChart(inputs, W, H) : null;
  const last = n ? points[n - 1].value : 0;
  const label = n
    ? `Saldo senaste ${n} dagarna, idag ${fmt(last)} km`
    : 'Saldo: inga poster än';

  function at(e: PointerEvent) {
    if (!lay || n < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onScrub(nearestIndex(lay.xs, e.clientX - rect.left));
  }

  const R = 20;
  return (
    <figure
      className="chart"
      ref={ref}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        at(e);
      }}
      onPointerMove={(e) => scrub !== null && at(e)}
      onPointerUp={() => onScrub(null)}
      onPointerCancel={() => onScrub(null)}
    >
      {lay && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
          <title>{label}</title>
          {n >= 2 && (
            <defs>
              <clipPath id={`${id}a`}>
                <rect x="0" y="0" width={W} height={lay.yz} />
              </clipPath>
              <clipPath id={`${id}b`}>
                <rect x="0" y={lay.yz} width={W} height={Math.max(0, H - lay.yz)} />
              </clipPath>
            </defs>
          )}
          {lay.ticks.map((t) => (
            <g key={t.value}>
              <line className="chart__grid" x1={lay.x0} x2={lay.x1 + 14} y1={t.y} y2={t.y} />
              <text className="chart__tick" x={W - R} y={t.y + 4} textAnchor="end">
                {formatTick(t.value)}
              </text>
            </g>
          ))}
          <line className="chart__zero" x1={lay.x0} x2={lay.x1 + 14} y1={lay.yz} y2={lay.yz} />
          <text className="chart__tick chart__tick--zero" x={W - R} y={lay.yz + 4} textAnchor="end">
            0
          </text>
          {n >= 2 &&
            (['credit:a', 'debt:b'] as const).map((c) => {
              const [k, cl] = c.split(':');
              return (
                <g key={k} clipPath={`url(#${id}${cl})`}>
                  <path className={`chart__area--${k}`} d={lay.area} />
                  <path className={`chart__line chart__line--${k}`} d={lay.line} />
                </g>
              );
            })}
          {lay.notes.map((nt) => (
            <text key={nt.x} className="chart__note" x={nt.x - 10} y={nt.y + 4} textAnchor="end">
              <tspan>{nt.text} </tspan>
              <tspan>{fmt(nt.delta)}</tspan>
            </text>
          ))}
          {n >= 2 && (
            <text className="chart__x" x={lay.x0} y={H - 8}>
              {dayLabel(points[0].day)}
            </text>
          )}
          <text className="chart__x" x={lay.x1} y={H - 8} textAnchor="middle">
            idag
          </text>
          {scrub !== null && n >= 2 && (() => {
            const cx = lay.xs[scrub];
            const cy = lay.ys[scrub];
            const right = cx > W * 0.55;
            const kind = kindOf(points[scrub].value);
            return (
              <>
                <line className="chart__cursor" x1={cx} x2={cx} y1={6} y2={H - 30} />
                <text className="chart__tag" x={cx + (right ? -8 : 8)} y={14} textAnchor={right ? 'end' : 'start'}>
                  <tspan>{scrub === n - 1 ? 'idag' : dayLabel(points[scrub].day)}  </tspan>
                  <tspan>{fmt(points[scrub].value)} km</tspan>
                </text>
                <circle className="chart__halo" cx={cx} cy={cy} r="8" />
                <circle className={`chart__dot--${kind}`} cx={cx} cy={cy} r="5" />
              </>
            );
          })()}
          <circle className="chart__halo" cx={lay.last.x} cy={lay.last.y} r="8" />
          <circle className={`chart__dot--${lay.last.kind}`} cx={lay.last.x} cy={lay.last.y} r="5" />
        </svg>
      )}
    </figure>
  );
}
