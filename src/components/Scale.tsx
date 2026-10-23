import { tiltDegrees } from '../lib/calc';
import s from './Scale.module.css';

const PIVOT = { x: 180, y: 62 };
const HALF = 138;
const PAN_Y = 112;

/** Antal vikter i en skål: växer långsamt, högst sex. */
export function plateCount(km: number): number {
  return km < 0.05 ? 0 : Math.min(6, Math.ceil(Math.log2(1 + km)));
}

function Pan({ side, plates }: { side: 'evil' | 'good'; plates: number }) {
  return (
    <g className={s[side]}>
      <line x1="0" y1="0" x2="-40" y2={PAN_Y} className={s.hanger} />
      <line x1="0" y1="0" x2="40" y2={PAN_Y} className={s.hanger} />
      {Array.from({ length: plates }, (_, i) => {
        const w = 56 - i * 3;
        return (
          <rect
            key={i}
            x={-w / 2}
            y={PAN_Y - 11 * (i + 1) - 1}
            width={w}
            height="10"
            rx="3"
            className={s.plate}
          />
        );
      })}
      <path d={`M -48 ${PAN_Y} H 48 Q 44 ${PAN_Y + 22} 0 ${PAN_Y + 22} Q -44 ${PAN_Y + 22} -48 ${PAN_Y} Z`} className={s.pan} />
    </g>
  );
}

interface Props {
  balanceKm: number;
  ateKm: number;
  ranKm: number;
  label: string;
}

export function Scale({ balanceKm, ateKm, ranKm, label }: Props) {
  const deg = tiltDegrees(balanceKm);
  const beam = { transform: `rotate(${deg}deg)`, transformOrigin: `${PIVOT.x}px ${PIVOT.y}px` };
  const counter = (cx: number) => ({
    transform: `rotate(${-deg}deg)`,
    transformOrigin: `${cx}px ${PIVOT.y}px`,
  });
  const lx = PIVOT.x - HALF;
  const rx = PIVOT.x + HALF;

  return (
    <svg className={s.scale} viewBox="0 0 360 252" role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      <path d={`M ${PIVOT.x - 7} ${PIVOT.y + 6} L ${PIVOT.x - 13} 226 L ${PIVOT.x + 13} 226 L ${PIVOT.x + 7} ${PIVOT.y + 6} Z`} className={s.column} />
      <rect x={PIVOT.x - 62} y="224" width="124" height="8" rx="4" className={s.base} />
      <g className={s.beamGroup} style={beam}>
        <rect x={lx - 6} y={PIVOT.y - 4} width={HALF * 2 + 12} height="8" rx="4" className={s.beam} />
        <g className={s.swing} style={counter(lx)}>
          <g transform={`translate(${lx} ${PIVOT.y})`}>
            <Pan side="evil" plates={plateCount(ateKm)} />
          </g>
        </g>
        <g className={s.swing} style={counter(rx)}>
          <g transform={`translate(${rx} ${PIVOT.y})`}>
            <Pan side="good" plates={plateCount(ranKm)} />
          </g>
        </g>
      </g>
      <circle cx={PIVOT.x} cy={PIVOT.y} r="11" className={s.pivot} />
      <circle cx={PIVOT.x} cy={PIVOT.y} r="3.5" className={s.pivotDot} />
    </svg>
  );
}
