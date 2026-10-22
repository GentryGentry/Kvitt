import type { FoodItem, RunEntry } from './types';

/** De n vanligaste unika sträckorna, vanligast först. Lika antal: senast använd först. */
export function commonDistances(runs: RunEntry[], n = 3): number[] {
  const byKm = new Map<number, { count: number; last: number }>();
  for (const r of runs) {
    const key = Math.round(r.km * 100) / 100;
    const t = Date.parse(r.at);
    const cur = byKm.get(key);
    byKm.set(key, { count: (cur?.count ?? 0) + 1, last: Math.max(cur?.last ?? 0, t) });
  }
  return [...byKm.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].last - a[1].last)
    .slice(0, n)
    .map(([km]) => km);
}

export function favoriteItems(items: FoodItem[]): FoodItem[] {
  return items
    .filter((i) => i.isFavorite)
    .sort((a, b) => b.useCount - a.useCount || a.name.localeCompare(b.name, 'sv'));
}

/** De n senast använda sakerna som inte redan är favoriter. */
export function recentItems(items: FoodItem[], n = 8): FoodItem[] {
  return items
    .filter((i) => !i.isFavorite && i.lastUsedAt)
    .sort((a, b) => Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt))
    .slice(0, n);
}
