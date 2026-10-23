import { isActive, type BalanceData } from './calc';
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
  /** Saldo vid dagens slut. */
  value: number;
  /** Dagens största post, för etiketten vid ett hopp. */
  note: string;
}

export const MAX_SERIES_DAYS = 14;

function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  const t = (k: string) => Date.parse(`${k}T00:00:00Z`);
  return Math.round((t(a) - t(b)) / 86400000);
}

/**
 * Saldo vid slutet av varje dag, äldst först, högst 14 dagar. Historiken börjar vid
 * första dagen med en post efter senaste nollställning, så en ny användare får korta serier.
 * Sista punkten är dagens saldo.
 */
export function balanceSeries(data: BalanceData, today: string): SeriesPoint[] {
  const days = new Map<string, { sum: number; note: string; biggest: number }>();
  const add = (at: string, v: number, note: string) => {
    if (!isActive(at, data.resets)) return;
    const k = dayKey(at);
    const d = days.get(k) ?? { sum: 0, note: '', biggest: -1 };
    d.sum += v;
    if (Math.abs(v) > d.biggest) {
      d.biggest = Math.abs(v);
      d.note = note;
    }
    days.set(k, d);
  };
  for (const r of data.runs) add(r.at, r.km, 'Löprunda');
  for (const f of data.foods) add(f.at, -f.kmEquivalent, f.label);

  const keys = [...days.keys()].filter((k) => k <= today).sort();
  if (keys.length === 0) return [];

  const span = Math.min(MAX_SERIES_DAYS, dayDiff(today, keys[0]) + 1);
  const first = addDays(today, -(span - 1));
  let running = 0;
  let ki = 0;
  // Poster före fönstret ingår i startsaldot.
  while (ki < keys.length && keys[ki] < first) running += days.get(keys[ki++])!.sum;
  const points: SeriesPoint[] = [];
  for (let i = 0; i < span; i++) {
    const day = addDays(first, i);
    let note = '';
    if (ki < keys.length && keys[ki] === day) {
      const d = days.get(keys[ki++])!;
      running += d.sum;
      note = d.note;
    }
    points.push({ day, value: running, note });
  }
  return points;
}
