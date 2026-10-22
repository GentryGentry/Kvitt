import { tiltDegrees } from '../lib/calc';
import s from './Scale.module.css';

const PIVOT = { x: 180, y: 54 };
const HALF = 136;

function Pan({ side }: { side: 'evil' | 'good' }) {
  return (
    <g className={s[side]}>
      <line x1="0" y1="0" x2="-30" y2="74" className={s.hanger} />
      <line x1="0" y1="0" x2="30" y2="74" className={s.hanger} />
      <path d="M -34 74 H 34 Q 30 92 0 92 Q -30 92 -34 74 Z" className={s.pan} />
    </g>
  );
}

export function Scale({ balanceKm, label }: { balanceKm: number; label: string }) {
  const deg = tiltDegrees(balanceKm);
  const beam = { transform: `rotate(${deg}deg)`, transformOrigin: `${PIVOT.x}px ${PIVOT.y}px` };
  const counter = (cx: number) => ({
    transform: `rotate(${-deg}deg)`,
    transformOrigin: `${cx}px ${PIVOT.y}px`,
  });
  const lx = PIVOT.x - HALF;
  const rx = PIVOT.x + HALF;

  return (
    <svg className={s.scale} viewBox="0 0 360 190" role="img" aria-label={label}>
      <path d={`M ${PIVOT.x - 5} ${PIVOT.y + 4} L ${PIVOT.x - 8} 172 L ${PIVOT.x + 8} 172 L ${PIVOT.x + 5} ${PIVOT.y + 4} Z`} className={s.column} />
      <rect x={PIVOT.x - 46} y="170" width="92" height="4" rx="2" className={s.base} />
      <g className={s.beamGroup} style={beam}>
        <line x1={lx} y1={PIVOT.y} x2={rx} y2={PIVOT.y} className={s.beam} />
        <g className={s.swing} style={counter(lx)}>
          <g transform={`translate(${lx} ${PIVOT.y})`}>
            <Pan side="evil" />
          </g>
        </g>
        <g className={s.swing} style={counter(rx)}>
          <g transform={`translate(${rx} ${PIVOT.y})`}>
            <Pan side="good" />
          </g>
        </g>
      </g>
      <circle cx={PIVOT.x} cy={PIVOT.y} r="6" className={s.pivot} />
      <circle cx={PIVOT.x} cy={PIVOT.y} r="2" className={s.pivotDot} />
    </svg>
  );
}
