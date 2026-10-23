import { useMemo } from 'react';
import { Cookie } from 'lucide-react';
import { BalanceChart } from '../components/BalanceChart';
import { RunningShoe } from '../components/icons';
import {
  balanceState,
  balanceTone,
  computeBalance,
  formatKcal,
  formatKm,
  isActive,
  kcalPerKm,
} from '../lib/calc';
import { pickLine } from '../lib/copy';
import { balanceSeries } from '../lib/stats';
import { dayKey, formatWhen } from '../lib/time';
import type { FoodEntry, ResetMarker, RunEntry, Settings } from '../lib/types';
import s from './Start.module.css';

interface Props {
  settings: Settings;
  foods: FoodEntry[];
  runs: RunEntry[];
  resets: ResetMarker[];
  onEat: () => void;
  onRun: () => void;
  onEditFood: (e: FoodEntry) => void;
  onEditRun: (e: RunEntry) => void;
}

function latest<T extends { at: string }>(list: T[]): T | undefined {
  let best: T | undefined;
  for (const x of list) if (!best || Date.parse(x.at) > Date.parse(best.at)) best = x;
  return best;
}

export function Start({ settings, foods, runs, resets, onEat, onRun, onEditFood, onEditRun }: Props) {
  const { balanceKm, ranKm, ateKm, count } = useMemo(
    () => computeBalance({ foods, runs, resets }),
    [foods, runs, resets],
  );
  const tone = balanceTone(balanceKm);
  const state = balanceState(balanceKm, count);
  const today = dayKey(new Date());
  const line = pickLine(state, today);

  const lastFood = latest(foods.filter((f) => isActive(f.at, resets)));
  const lastRun = latest(runs.filter((r) => isActive(r.at, resets)));

  const series = useMemo(
    () => balanceSeries({ foods, runs, resets }, today),
    [foods, runs, resets, today],
  );

  const numberText = formatKm(balanceKm, { sign: true, unit: false });
  const status = tone === 'minus' ? 'Skuld' : tone === 'plus' ? 'Tillgodo' : 'Jämnt';
  const kcal = Math.abs(balanceKm) * kcalPerKm(settings);
  const ariaLabel =
    tone === 'zero'
      ? 'Saldokurva, senaste 14 dagarna: jämnt'
      : `Saldokurva, senaste 14 dagarna. Nu: ${status.toLowerCase()} ${formatKm(Math.abs(balanceKm))}`;

  return (
    <main className={s.root}>
      <header className={s.top}>
        <h1 className={s.brand}>Kvitt</h1>
      </header>

      <section className={s.readout} aria-live="polite">
        <div className={s.number} data-tone={tone} data-size={numberText.length > 6 ? 'xs' : numberText.length > 5 ? 's' : 'm'}>
          <span className={s.digits}>{numberText}</span>
          <span className={s.unitKm}>km</span>
        </div>
        <p className={s.status}>
          <span>{status}</span>
          {tone !== 'zero' && <span className={s.kcal}>{formatKcal(kcal, { approx: true, round: 10 })}</span>}
        </p>
        <p className={s.line}>{line}</p>
      </section>

      <div className={s.scaleWrap}>
        <BalanceChart points={series} label={ariaLabel} />
      </div>

      <section className={s.cols}>
        <div className={s.col} data-side="evil">
          <div className={s.colHead}>
            <span>Åtit</span>
            <span className={s.colSum}>{formatKm(ateKm)}</span>
          </div>
          {lastFood ? (
            <button className={s.last} onClick={() => onEditFood(lastFood)}>
              <span className={s.lastTitle}>{lastFood.label}</span>
              <span className={s.lastMeta}>
                {formatWhen(lastFood.at)} · {formatKm(-lastFood.kmEquivalent)}
              </span>
            </button>
          ) : (
            <span className={s.none}>Inget ännu</span>
          )}
        </div>
        <div className={s.col} data-side="good">
          <div className={s.colHead}>
            <span>Sprungit</span>
            <span className={s.colSum}>{formatKm(ranKm)}</span>
          </div>
          {lastRun ? (
            <button className={s.last} onClick={() => onEditRun(lastRun)}>
              <span className={s.lastTitle}>{formatKm(lastRun.km)}</span>
              <span className={s.lastMeta}>
                {formatWhen(lastRun.at)}
              </span>
            </button>
          ) : (
            <span className={s.none}>Inget ännu</span>
          )}
        </div>
      </section>

      <nav className={s.actions} aria-label="Logga">
        <button className={s.action} data-side="evil" onClick={onEat} aria-label="Jag åt något">
          <Cookie size={40} strokeWidth={1.6} />
        </button>
        <button className={s.action} data-side="good" onClick={onRun} aria-label="Jag sprang">
          <RunningShoe size={40} strokeWidth={1.6} />
        </button>
      </nav>
    </main>
  );
}
