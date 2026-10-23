import { type PointerEvent } from 'react';
import { formatDecimal, formatKm } from '../lib/calc';
import { type BarDay, layoutBars, BAR_MARGIN } from '../lib/bars';
import { formatTick, nearestIndex } from '../lib/chart';
import { shortFromKey } from '../lib/time';
import { useSize } from './useSize';

interface Props {
  bars: BarDay[];
  weekly: boolean;
  today: string;
  scrub: number | null;
  onScrub: (i: number | null) => void;
}

const km1 = (v: number) => formatDecimal(Math.abs(v));
const signed = (v: number) => formatKm(v, { sign: true, unit: false });

/** Staplar per dag eller vecka: mat nedåt, löpning uppåt, netto som linje. Port av drawBars. */
export function BarsChart({ bars, weekly, today, scrub, onScrub }: Props) {
  const [ref, { w: W, h: H }] = useSize<HTMLElement>();
  const n = bars.length;
  const lay = W && H ? layoutBars(bars, W, H) : null;
  const unit = weekly ? 'veckor' : 'dagar';
  const label = n ? `Mat och löpning per ${weekly ? 'vecka' : 'dag'}, ${n} ${unit}` : 'Inga poster';

  function at(e: PointerEvent) {
    if (!lay || !n) return;
    onScrub(nearestIndex(lay.xs, e.clientX - e.currentTarget.getBoundingClientRect().left));
  }

  const R = BAR_MARGIN.right;
  return (
    <figure
      className="chart chart--bars"
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
          {lay.ticks.map((t) => (
            <g key={t.value}>
              <line className="chart__grid" x1={lay.x0} x2={lay.xr + 14} y1={t.y} y2={t.y} />
              <text className="chart__tick" x={W - R} y={t.y + 4} textAnchor="end">
                {formatTick(t.value)}
              </text>
            </g>
          ))}
          <line className="chart__zero" x1={lay.x0} x2={lay.xr + 14} y1={lay.yz} y2={lay.yz} />
          <text className="chart__tick chart__tick--zero" x={W - R} y={lay.yz + 4} textAnchor="end">
            0
          </text>
          {bars.map((d, i) => {
            const cx = lay.xs[i];
            const x = cx - lay.bw / 2;
            return (
              <g key={d.day}>
                {d.ran > 0 && (
                  <>
                    <rect className="chart__bar--credit" x={x} y={lay.y(d.ran)} width={lay.bw} height={Math.max(0, lay.yz - lay.y(d.ran))} />
                    {d.ran > lay.hi && (
                      <>
                        <line className="chart__break" x1={x - 1} x2={x + lay.bw + 1} y1={lay.y(d.ran) + 9} y2={lay.y(d.ran) + 5} />
                        <text className="chart__over" x={cx} y={lay.y(d.ran) - 4} textAnchor="middle">
                          +{km1(d.ran)}
                        </text>
                      </>
                    )}
                  </>
                )}
                {d.ate < 0 && (
                  <>
                    <rect className="chart__bar--debt" x={x} y={lay.yz} width={lay.bw} height={Math.max(0, lay.y(d.ate) - lay.yz)} />
                    {-d.ate > -lay.lo && (
                      <>
                        <line className="chart__break" x1={x - 1} x2={x + lay.bw + 1} y1={lay.y(d.ate) - 5} y2={lay.y(d.ate) - 9} />
                        <text className="chart__over" x={Math.min(cx, lay.xr - 14)} y={lay.y(d.ate) + 13} textAnchor="middle">
                          −{km1(d.ate)}
                        </text>
                      </>
                    )}
                  </>
                )}
              </g>
            );
          })}
          {lay.net && (
            <>
              <path className="chart__net-halo" d={lay.net} />
              <path className="chart__net" d={lay.net} />
            </>
          )}
          {n > 0 && (
            <text className="chart__x" x={lay.x0} y={H - 8}>
              {shortFromKey(bars[0].day)}
            </text>
          )}
          {n > 0 && (
            <text className="chart__x" x={lay.xs[n - 1]} y={H - 8} textAnchor="middle">
              idag
            </text>
          )}
          {scrub !== null && n > 0 && bars[scrub] && (() => {
            const d = bars[scrub];
            const cx = lay.xs[scrub];
            const right = cx > W * 0.5;
            return (
              <>
                <line className="chart__cursor" x1={cx} x2={cx} y1={6} y2={H - BAR_MARGIN.bottom} />
                <text className="chart__tag" x={cx + (right ? -8 : 8)} y={14} textAnchor={right ? 'end' : 'start'}>
                  <tspan>{!weekly && d.day === today ? 'idag' : shortFromKey(d.day)}  </tspan>
                  <tspan>
                    mat {d.ate ? signed(d.ate) : '0,0'} · löp {d.ran ? signed(d.ran) : '0,0'}
                  </tspan>
                </text>
              </>
            );
          })()}
        </svg>
      )}
    </figure>
  );
}
