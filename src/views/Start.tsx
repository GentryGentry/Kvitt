import { useMemo, useState } from 'react';
import { Brand } from '../components/Brand';
import { Chart } from '../components/Chart';
import { Icon } from '../components/Icon';
import {
  balanceState,
  balanceTone,
  computeBalance,
  formatDecimal,
  formatKcal,
  formatKm,
  isActive,
  kcalPerKm,
  roundTenth,
} from '../lib/calc';
import { pickLine } from '../lib/copy';
import { figure } from '../lib/figure';
import { balanceSeries } from '../lib/stats';
import { dayKey, formatWhen } from '../lib/time';
import type { FoodEntry, ResetMarker, RunEntry, Settings } from '../lib/types';

interface Props {
  settings: Settings;
  foods: FoodEntry[];
  runs: RunEntry[];
  resets: ResetMarker[];
  onEat: () => void;
  onRun: () => void;
  onEditFood: (e: FoodEntry) => void;
  onEditRun: (e: RunEntry) => void;
  onMenu: () => void;
}

function latest<T extends { at: string }>(list: T[]): T | undefined {
  let best: T | undefined;
  for (const x of list) if (!best || Date.parse(x.at) > Date.parse(best.at)) best = x;
  return best;
}

const INK = { plus: 'var(--credit)', minus: 'var(--debt)', zero: 'var(--text)' } as const;

export function Start({ settings, foods, runs, resets, onEat, onRun, onEditFood, onEditRun, onMenu }: Props) {
  const [scrub, setScrub] = useState<number | null>(null);
  const { balanceKm, ranKm, ateKm, count } = useMemo(
    () => computeBalance({ foods, runs, resets }),
    [foods, runs, resets],
  );
  const today = dayKey(new Date());
  const series = useMemo(() => balanceSeries({ foods, runs, resets }, today), [foods, runs, resets, today]);

  const tone = balanceTone(balanceKm);
  const state = count === 0 ? 'empty' : tone === 'minus' ? 'debt' : tone === 'plus' ? 'credit' : 'zero';
  const tag = tone === 'minus' ? 'Skuld' : tone === 'plus' ? 'Tillgodo' : 'Jämnt';
  const note = pickLine(balanceState(balanceKm, count), today);
  const kcal = Math.abs(balanceKm) * kcalPerKm(settings);

  const shown = scrub !== null && series[scrub] ? series[scrub].value : balanceKm;
  const fig = figure(shown);
  const figInk = INK[balanceTone(shown)];

  const lastFood = latest(foods.filter((f) => isActive(f.at, resets)));
  const lastRun = latest(runs.filter((r) => isActive(r.at, resets)));

  return (
    <main className="screen home" data-state={state}>
      <header className="home__head">
        <Brand />
        <button className="nav-btn" type="button" onClick={onMenu} aria-label="Meny">
          <Icon name="more" />
        </button>
      </header>

      <section className="balance" aria-label="Saldo">
        <p className="balance__figure" data-digits={fig.digits} style={{ ['--ink' as string]: figInk }}>
          <span>{fig.sign}</span>
          <span>{fig.int}</span>
          <span className="balance__dec">{fig.dec}</span>
          <span className="balance__unit">km</span>
        </p>
        <p className="balance__status">
          <span className="tag">{tag}</span>
          {tone !== 'zero' && <span>{formatKcal(kcal, { approx: true, round: 10 })}</span>}
        </p>
        <p className="balance__note">{note}</p>
      </section>

      <Chart points={series} scrub={scrub} onScrub={setScrub} />

      <section className="ledger" aria-label="Totalt">
        <div className="ledger__col" data-kind="ate" data-zero={roundTenth(ateKm) === 0 ? '' : undefined}>
          <h2 className="ledger__label">
            <Icon name="cookie" />
            Ätit
          </h2>
          <p className="ledger__total">
            <span>{formatDecimal(ateKm)}</span>
            <small>km</small>
          </p>
          {lastFood ? (
            <button className="entry" type="button" onClick={() => onEditFood(lastFood)} aria-label={`Ändra ${lastFood.label}`}>
              <span className="entry__title">{lastFood.label}</span>
              <span className="entry__meta">
                {formatWhen(lastFood.at)} · {lastFood.isEstimate ? 'ca ' : ''}
                {formatKm(-lastFood.kmEquivalent)}
              </span>
            </button>
          ) : (
            <p className="entry entry--empty">
              <span className="entry__title">Inget än</span>
              <span className="entry__meta" />
            </p>
          )}
        </div>
        <div className="ledger__col" data-kind="ran" data-zero={roundTenth(ranKm) === 0 ? '' : undefined}>
          <h2 className="ledger__label">
            <Icon name="shoe" />
            Sprungit
          </h2>
          <p className="ledger__total">
            <span>{formatDecimal(ranKm)}</span>
            <small>km</small>
          </p>
          {lastRun ? (
            <button className="entry" type="button" onClick={() => onEditRun(lastRun)} aria-label={`Ändra ${formatKm(lastRun.km)}`}>
              <span className="entry__title">{formatKm(lastRun.km)}</span>
              <span className="entry__meta">{formatWhen(lastRun.at)}</span>
            </button>
          ) : (
            <p className="entry entry--empty">
              <span className="entry__title">Inget än</span>
              <span className="entry__meta" />
            </p>
          )}
        </div>
      </section>

      <nav className="actions" aria-label="Logga">
        <button className="act act--ate" type="button" onClick={onEat} aria-label="Jag åt något">
          <Icon name="cookie" />
        </button>
        <button className="act act--ran" type="button" onClick={onRun} aria-label="Jag sprang">
          <Icon name="shoe" />
        </button>
      </nav>
    </main>
  );
}
