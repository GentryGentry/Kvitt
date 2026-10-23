import { useMemo, useState } from 'react';
import { BarsChart } from '../components/BarsChart';
import { Chart } from '../components/Chart';
import { Segment, Switch } from '../components/Controls';
import { aggregate } from '../lib/bars';
import { balanceTone, formatKm } from '../lib/calc';
import { figure } from '../lib/figure';
import { latestReset } from '../lib/calc';
import { statsFor, type StatsScope } from '../lib/overview';
import { dayKey, shortFromKey } from '../lib/time';
import type { FoodEntry, ResetMarker, RunEntry } from '../lib/types';
import { Page } from './Page';

interface Props {
  foods: FoodEntry[];
  runs: RunEntry[];
  resets: ResetMarker[];
}

export function Stats({ foods, runs, resets }: Props) {
  const [period, setPeriod] = useState(30);
  const [scope, setScope] = useState<StatsScope>('reset');
  const [curveScrub, setCurveScrub] = useState<number | null>(null);
  const [barScrub, setBarScrub] = useState<number | null>(null);
  const today = dayKey(new Date());
  const marker = latestReset(resets);

  const stats = useMemo(
    () => statsFor(foods, runs, resets, period, scope, today),
    [foods, runs, resets, period, scope, today],
  );
  const { bars, weekly } = useMemo(() => aggregate(stats.win), [stats.win]);
  const points = useMemo(() => stats.win.map((d) => ({ day: d.day, value: d.v, note: d.note })), [stats.win]);

  const fig = figure(stats.net);
  const tone = balanceTone(stats.net);
  const state = stats.n === 0 ? 'empty' : tone === 'minus' ? 'debt' : tone === 'plus' ? 'credit' : 'zero';
  const cap = period ? `senaste ${period} dagarna` : 'sedan start';
  const days = (n: number) => `${n} ${n === 1 ? 'dag' : 'dagar'}`;

  return (
    <Page
      route="stats"
      title="Statistik"
      back="start"
      tools={
        <>
          <Segment
            label="Period"
            value={period}
            onChange={(v) => {
              setPeriod(v);
              setCurveScrub(null);
              setBarScrub(null);
            }}
            options={[[7, '7 dagar'], [30, '30'], [90, '90'], [0, 'Allt']]}
          />
          {marker && (
            <div className="switchrow">
              <span>Räkna från nollställningen {shortFromKey(dayKey(marker.at))}</span>
              <Switch checked={scope === 'reset'} onChange={(on) => setScope(on ? 'reset' : 'all')} label="Räkna från nollställning" />
            </div>
          )}
        </>
      }
    >
      <section className="stat-hero" data-state={state}>
        <p className="stat-hero__fig">
          <span>{fig.sign}</span>
          <span>{fig.int}</span>
          <span className="balance__dec">{fig.dec}</span>
          <small>km</small>
        </p>
        <p className="stat-hero__cap">
          Förändring, {cap}
          {stats.est ? ', ca' : ''}
        </p>
      </section>
      <Chart
        className="chart--curve"
        points={points}
        scrub={curveScrub}
        onScrub={setCurveScrub}
        ariaLabel={points.length ? `Saldo senaste ${points.length} dagarna, idag ${formatKm(points[points.length - 1].value, { unit: false })} km` : 'Saldo: inga poster än'}
      />
      <div className="sect">
        <span>Per {weekly ? 'dag (veckovis)' : 'dag'}</span>
        <span className="legend">
          <span><i className="d" />Mat</span>
          <span><i className="c" />Löpning</span>
          <span><i className="n" />Netto</span>
        </span>
      </div>
      <BarsChart bars={bars} weekly={weekly} today={today} scrub={barScrub} onScrub={setBarScrub} />
      {stats.n > 0 ? (
        <dl className="kv">
          <div className="kv__row">
            <dt>Sprungit totalt</dt>
            <dd style={{ color: 'var(--credit)' }}>{formatKm(stats.ranTotal)}</dd>
          </div>
          <div className="kv__row">
            <dt>Mat totalt</dt>
            <dd style={{ color: 'var(--debt)' }}>
              {stats.est ? 'ca ' : ''}
              {formatKm(stats.ateTotal)}
            </dd>
          </div>
          <div className="kv__row">
            <dt>Vanligaste onyttigheten</dt>
            <dd>{stats.top ? `${stats.top.name} · ${stats.top.count} ${stats.top.count === 1 ? 'gång' : 'ggr'}` : '—'}</dd>
          </div>
          <div className="kv__row">
            <dt>Längsta svit med plus</dt>
            <dd>{days(stats.streak)}</dd>
          </div>
        </dl>
      ) : (
        <div className="list-empty">
          <b>Inget att visa än.</b>
          <span>Statistiken fylls på när du loggat några dagar.</span>
        </div>
      )}
    </Page>
  );
}
