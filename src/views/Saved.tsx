import { useMemo, useState } from 'react';
import { Highlight, SearchField } from '../components/Controls';
import { Icon } from '../components/Icon';
import { toggleFavorite } from '../lib/actions';
import { formatDecimal } from '../lib/calc';
import type { FoodItem } from '../lib/types';
import { Page } from './Page';

const SOURCE: Record<FoodItem['source'], string> = { builtin: 'Inbyggd, riktvärde', learned: 'Inlärd', custom: 'Egen' };

export function sortItems(items: FoodItem[], query: string): FoodItem[] {
  const q = query.trim().toLocaleLowerCase('sv');
  return items
    .filter((i) => !q || `${i.name} ${i.aliases.join(' ')}`.toLocaleLowerCase('sv').includes(q))
    .sort(
      (a, b) =>
        Number(b.isFavorite) - Number(a.isFavorite) ||
        b.useCount - a.useCount ||
        a.name.localeCompare(b.name, 'sv'),
    );
}

export function Saved({ items, onItem }: { items: FoodItem[]; onItem: (i: FoodItem) => void }) {
  const [query, setQuery] = useState('');
  const list = useMemo(() => sortItems(items, query), [items, query]);
  const q = query.trim();
  return (
    <Page
      route="saved"
      title="Sparade saker"
      back="settings"
      tools={<SearchField id="i-q" value={query} onChange={setQuery} placeholder="Sök bland sparade saker" />}
    >
      {list.length === 0 ? (
        <div className="list-empty">
          <b>{items.length === 0 ? 'Inget än.' : 'Ingen träff.'}</b>
          <span>
            {items.length === 0 ? 'Saker du loggar sparas här.' : `Ingen sak heter eller kallas ”${q}”.`}
          </span>
        </div>
      ) : (
        <div role="list">
          {list.map((i) => (
            <div className="row row--ate" role="listitem" key={i.id} style={{ paddingRight: 0 }}>
              <button className="row__main" type="button" onClick={() => onItem(i)} style={{ gridTemplateColumns: '1fr auto' }}>
                <span className="row__text">
                  <Highlight text={i.name} query={q} />
                  <span className="setrow__sub" style={{ display: 'block' }}>
                    per {i.unitLabel} · {SOURCE[i.source]}
                    {i.useCount ? ` · ${i.useCount} ggr` : ''}
                  </span>
                </span>
                <span className="row__fx" style={{ color: 'var(--text)' }}>
                  {i.source === 'builtin' ? 'ca ' : ''}
                  {formatDecimal(i.kcalPerUnit, 0)} kcal
                </span>
              </button>
              <button
                className="row__fav"
                type="button"
                aria-pressed={i.isFavorite}
                aria-label="Favorit"
                onClick={() => toggleFavorite(i)}
              >
                <Icon name={i.isFavorite ? 'star' : 'star-off'} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
