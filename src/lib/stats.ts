import { isActive, latestReset, type BalanceData } from './calc';
import { dayKey } from './time';
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

// --- Saldokurva ---

export interface SeriesPoint {
  day: string;
  /** Saldo vid dagens slut. Null före senaste nollställning. */
  value: number | null;
}

function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

/**
 * Saldo vid slutet av varje dag, de senaste `days` dagarna, äldst först.
 * Räknar bara poster efter senaste nollställning. Sista punkten är dagens saldo.
 */
export function balanceSeries(
  data: BalanceData,
  today: string,
  days = 14,
): SeriesPoint[] {
  const reset = latestReset(data.resets);
  const resetDay = reset ? dayKey(reset.at) : undefined;
  const deltas = new Map<string, number>();
  const add = (at: string, v: number) => {
    if (!isActive(at, data.resets)) return;
    const k = dayKey(at);
    deltas.set(k, (deltas.get(k) ?? 0) + v);
  };
  for (const r of data.runs) add(r.at, r.km);
  for (const f of data.foods) add(f.at, -f.kmEquivalent);

  const keys = [...deltas.keys()].sort();
  const points: SeriesPoint[] = [];
  const first = addDays(today, -(days - 1));
  let running = 0;
  let ki = 0;
  // Poster före fönstret ingår i startsaldot.
  while (ki < keys.length && keys[ki] < first) running += deltas.get(keys[ki++])!;
  for (let i = 0; i < days; i++) {
    const day = addDays(first, i);
    while (ki < keys.length && keys[ki] <= day) running += deltas.get(keys[ki++])!;
    points.push({ day, value: resetDay && day < resetDay ? null : running });
  }
  return points;
}
