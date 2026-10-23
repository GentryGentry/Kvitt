import { isActive, latestReset } from './calc';
import { dayKey, dayLabel } from './time';
import type { FoodEntry, ResetMarker, RunEntry } from './types';

export type HistoryFilter = 'all' | 'ate' | 'ran';

export type HistoryItem =
  | { kind: 'food'; at: string; entry: FoodEntry; before: boolean }
  | { kind: 'run'; at: string; entry: RunEntry; before: boolean }
  | { kind: 'reset'; at: string; marker: ResetMarker };

export interface HistoryGroup {
  day: string;
  label: string;
  items: HistoryItem[];
  /** Dagens summa i km. Delas en dag av en nollställning räknas bara posterna efter den. */
  sumKm: number;
  /** Någon matpost i summan är en uppskattning. */
  est: boolean;
  /** Hela dagen ligger före senaste nollställning. */
  faded: boolean;
}

export const RUN_NAME = 'Löpning';

export function entryName(item: HistoryItem): string {
  return item.kind === 'run' ? RUN_NAME : item.kind === 'food' ? item.entry.label : '';
}

interface Input {
  foods: FoodEntry[];
  runs: RunEntry[];
  resets: ResetMarker[];
  filter: HistoryFilter;
  query: string;
}

/** Feed grupperad per dag, nyast överst. Nollställningar visas som avdelare när inget filter eller sökning är satt. */
export function buildHistory({ foods, runs, resets, filter, query }: Input, todayKey: string): HistoryGroup[] {
  const q = query.trim().toLocaleLowerCase('sv');
  const matches = (name: string) => !q || name.toLocaleLowerCase('sv').includes(q);

  const items: HistoryItem[] = [];
  if (filter !== 'ran') {
    for (const entry of foods) {
      if (matches(entry.label)) items.push({ kind: 'food', at: entry.at, entry, before: !isActive(entry.at, resets) });
    }
  }
  if (filter !== 'ate') {
    for (const entry of runs) {
      if (matches(RUN_NAME)) items.push({ kind: 'run', at: entry.at, entry, before: !isActive(entry.at, resets) });
    }
  }
  if (!q && filter === 'all') for (const marker of resets) items.push({ kind: 'reset', at: marker.at, marker });
  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const groups: HistoryGroup[] = [];
  for (const item of items) {
    const day = dayKey(item.at);
    let g = groups[groups.length - 1];
    if (!g || g.day !== day) {
      g = { day, label: dayLabel(day, todayKey), items: [], sumKm: 0, est: false, faded: false };
      groups.push(g);
    }
    g.items.push(item);
  }

  for (const g of groups) {
    const entries = g.items.filter((i): i is Exclude<HistoryItem, { kind: 'reset' }> => i.kind !== 'reset');
    const live = entries.filter((i) => !i.before);
    const use = live.length ? live : entries;
    g.faded = live.length === 0 && Boolean(latestReset(resets));
    g.sumKm = use.reduce((a, i) => a + (i.kind === 'run' ? i.entry.km : -i.entry.kmEquivalent), 0);
    g.est = use.some((i) => i.kind === 'food' && i.entry.isEstimate);
  }
  return groups;
}
