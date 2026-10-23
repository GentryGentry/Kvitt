import { isActive, latestReset } from './calc';
import { addDaysToKey, dayKey, daysBetween } from './time';
import type { FoodEntry, FoodItem, ResetMarker, RunEntry } from './types';

export interface DayStat {
  day: string;
  /** Mat i km, negativt. */
  ate: number;
  /** Löpning i km, positivt. */
  ran: number;
  net: number;
  /** Kumulativt slutsaldo vid dagens slut. */
  v: number;
  est: boolean;
  /** Dagens största post, för etiketten vid ett hopp. */
  note: string;
}

export type StatsScope = 'reset' | 'all';

/** Poster i valt omfång: efter senaste nollställning, eller allt. */
export function scopeEntries(
  foods: FoodEntry[],
  runs: RunEntry[],
  resets: ResetMarker[],
  scope: StatsScope,
): { foods: FoodEntry[]; runs: RunEntry[] } {
  if (scope === 'all' || !latestReset(resets)) return { foods, runs };
  return { foods: foods.filter((f) => isActive(f.at, resets)), runs: runs.filter((r) => isActive(r.at, resets)) };
}

/** Dag för dag från första posten till idag, med kumulativt saldo. */
export function dailyStats(foods: FoodEntry[], runs: RunEntry[], today: string): DayStat[] {
  const byDay = new Map<string, { ate: number; ran: number; est: boolean; note: string; biggest: number }>();
  const get = (k: string) => {
    let d = byDay.get(k);
    if (!d) byDay.set(k, (d = { ate: 0, ran: 0, est: false, note: '', biggest: -1 }));
    return d;
  };
  for (const f of foods) {
    const d = get(dayKey(f.at));
    d.ate -= f.kmEquivalent;
    d.est ||= f.isEstimate;
    if (f.kmEquivalent > d.biggest) {
      d.biggest = f.kmEquivalent;
      d.note = f.label;
    }
  }
  for (const r of runs) {
    const d = get(dayKey(r.at));
    d.ran += r.km;
    if (r.km > d.biggest) {
      d.biggest = r.km;
      d.note = 'Löprunda';
    }
  }
  const keys = [...byDay.keys()].filter((k) => k <= today).sort();
  if (!keys.length) return [];
  const out: DayStat[] = [];
  let v = 0;
  for (let k = keys[0]; k <= today; k = addDaysToKey(k, 1)) {
    const d = byDay.get(k);
    const ate = d?.ate ?? 0;
    const ran = d?.ran ?? 0;
    v += ate + ran;
    out.push({ day: k, ate, ran, net: ate + ran, v, est: d?.est ?? false, note: d?.note ?? '' });
  }
  return out;
}

export interface StatsResult {
  win: DayStat[];
  /** Förändring under perioden. */
  net: number;
  ranTotal: number;
  ateTotal: number;
  top: { name: string; count: number } | null;
  /** Längsta svit dagar i rad med positivt slutsaldo. */
  streak: number;
  est: boolean;
  /** Antal poster i perioden. */
  n: number;
}

/** "2 × Kanelbulle" och "Kanelbulle" räknas som samma sak. */
export function baseName(label: string): string {
  return label.replace(/^[\d.,]+ × /, '');
}

/** period 0 = allt. */
export function statsFor(
  foods: FoodEntry[],
  runs: RunEntry[],
  resets: ResetMarker[],
  period: number,
  scope: StatsScope,
  today: string,
): StatsResult {
  const scoped = scopeEntries(foods, runs, resets, scope);
  const all = dailyStats(scoped.foods, scoped.runs, today);
  const win = period ? all.slice(-period) : all;
  const from = win[0]?.day;
  const inWin = (at: string) => from !== undefined && dayKey(at) >= from;
  const f = scoped.foods.filter((x) => inWin(x.at));
  const r = scoped.runs.filter((x) => inWin(x.at));

  const counts = new Map<string, { name: string; count: number }>();
  for (const x of f) {
    const key = x.itemId ?? baseName(x.label).toLocaleLowerCase('sv');
    const cur = counts.get(key);
    if (cur) cur.count++;
    else counts.set(key, { name: baseName(x.label), count: 1 });
  }
  const top = [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'sv'))[0] ?? null;

  let streak = 0;
  let run = 0;
  for (const d of win) {
    run = d.v > 0 ? run + 1 : 0;
    streak = Math.max(streak, run);
  }

  return {
    win,
    net: win.reduce((a, d) => a + d.net, 0),
    ranTotal: r.reduce((a, x) => a + x.km, 0),
    ateTotal: f.reduce((a, x) => a + x.kmEquivalent, 0),
    top,
    streak,
    est: f.some((x) => x.isEstimate),
    n: f.length + r.length,
  };
}

export { daysBetween };

/** Saken en matpost kom från: via itemId, annars via namnet (äldre poster saknar itemId). */
export function itemForEntry(entry: FoodEntry, items: FoodItem[]): FoodItem | undefined {
  if (entry.itemId) {
    const byId = items.find((i) => i.id === entry.itemId);
    if (byId) return byId;
  }
  const name = baseName(entry.label).toLocaleLowerCase('sv');
  return items.find((i) => i.name.toLocaleLowerCase('sv') === name);
}
