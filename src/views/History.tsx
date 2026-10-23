import { useMemo, useState } from 'react';
import { Highlight, SearchField, Segment } from '../components/Controls';
import { Icon } from '../components/Icon';
import { toggleFavorite } from '../lib/actions';
import { formatKm } from '../lib/calc';
import { buildHistory, entryName, type HistoryFilter, type HistoryItem } from '../lib/history';
import { itemForEntry } from '../lib/overview';
import { dayKey, formatTime, shortFromKey } from '../lib/time';
import type { FoodEntry, FoodItem, ResetMarker, RunEntry } from '../lib/types';
import { Page } from './Page';

interface Props {
  foods: FoodEntry[];
  runs: RunEntry[];
  resets: ResetMarker[];
  items: FoodItem[];
  onEditFood: (e: FoodEntry) => void;
  onEditRun: (e: RunEntry) => void;
}

const EFFECT = (i: Exclude<HistoryItem, { kind: 'reset' }>) =>
  i.kind === 'run' ? formatKm(i.entry.km, { sign: true }) : `${i.entry.isEstimate ? 'ca ' : ''}${formatKm(-i.entry.kmEquivalent)}`;

export function History({ foods, runs, resets, items, onEditFood, onEditRun }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const today = dayKey(new Date());
  const groups = useMemo(
    () => buildHistory({ foods, runs, resets, filter, query }, today),
    [foods, runs, resets, filter, query, today],
  );
  const q = query.trim();
  const total = foods.length + runs.length;

  let empty: { title: string; text: string } | null = null;
  if (total === 0) empty = { title: 'Inget än.', text: 'Poster dyker upp här när du loggar något från startsidan.' };
  else if (groups.length === 0) {
    empty = q
      ? { title: 'Ingen träff.', text: `Inget heter något med ”${q}”. Prova ett kortare ord.` }
      : { title: filter === 'ran' ? 'Ingen löpning loggad.' : 'Ingen mat loggad.', text: 'Byt filter för att se resten.' };
  }

  return (
    <Page
      route="history"
      title="Historik"
      back="start"
      tools={
        <>
          <SearchField id="h-q" value={query} onChange={setQuery} placeholder="Sök i historiken" />
          <Segment
            label="Filter"
            value={filter}
            onChange={setFilter}
            options={[['all', 'Alla'], ['ate', 'Mat'], ['ran', 'Löpning']]}
          />
        </>
      }
    >
      {empty ? (
        <div className="list-empty">
          <b>{empty.title}</b>
          <span>{empty.text}</span>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.day} role="list" aria-label={g.label}>
            <div className={`day${g.faded ? ' is-before' : ''}`}>
              <span>{g.label}</span>
              <span className="day__sum" data-sign={g.faded ? '' : g.sumKm > 0.049 ? 'pos' : g.sumKm < -0.049 ? 'neg' : ''}>
                {g.est ? 'ca ' : ''}
                {formatKm(g.sumKm, { sign: true })}
              </span>
            </div>
            {g.items.map((item) => {
              if (item.kind === 'reset') {
                return (
                  <div className="reset-divider" role="listitem" key={item.marker.id}>
                    Före nollställning ({shortFromKey(dayKey(item.marker.at))})
                    <span>Saldot var {formatKm(item.marker.balanceBeforeKm, { sign: true })}. Poster nedan räknas inte med.</span>
                  </div>
                );
              }
              const food = item.kind === 'food' ? item.entry : null;
              const saved = food ? itemForEntry(food, items) : undefined;
              return (
                <div className={`row row--${food ? 'ate' : 'ran'}${item.before ? ' is-before' : ''}`} role="listitem" key={item.entry.id}>
                  <button
                    className="row__main"
                    type="button"
                    onClick={() => (food ? onEditFood(food) : onEditRun(item.entry as RunEntry))}
                  >
                    <span className="row__time">{formatTime(item.at)}</span>
                    <span className="row__text">
                      <Highlight text={entryName(item)} query={q} />
                    </span>
                    <span className="row__fx">{EFFECT(item)}</span>
                  </button>
                  {food && (
                    <button
                      className="row__fav"
                      type="button"
                      aria-pressed={saved?.isFavorite ?? false}
                      aria-label="Favorit"
                      disabled={!saved}
                      onClick={() => saved && toggleFavorite(saved)}
                    >
                      <Icon name={saved?.isFavorite ? 'star' : 'star-off'} />
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        ))
      )}
    </Page>
  );
}
