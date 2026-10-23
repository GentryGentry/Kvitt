import { describe, expect, it } from 'vitest';
import { aggregate, layoutBars } from './bars';
import { makeFoodFields } from './calc';
import { buildHistory } from './history';
import { baseName, dailyStats, statsFor } from './overview';
import { dayLabel, daysBetween, shortFromKey } from './time';
import type { FoodEntry, ResetMarker, RunEntry } from './types';

const food = (at: string, kcal: number, label = 'Kanelbulle', extra: Partial<FoodEntry> = {}): FoodEntry => ({
  id: at + label + kcal, at, label, isEstimate: true, ...makeFoodFields(kcal, 80), ...extra,
});
const run = (at: string, km: number): RunEntry => ({ id: at + km, at, km });
const reset = (at: string, before = 0): ResetMarker => ({ id: 'r' + at, at, balanceBeforeKm: before });
const TODAY = '2025-03-14';

describe('dagsetiketter', () => {
  it('Idag, Igår och veckodag + datum', () => {
    expect(dayLabel('2025-03-14', TODAY)).toBe('Idag');
    expect(dayLabel('2025-03-13', TODAY)).toBe('Igår');
    expect(dayLabel('2025-03-10', TODAY)).toBe('mån 10 mar');
    expect(dayLabel('2025-03-01', TODAY)).toBe('lör 1 mar');
    expect(shortFromKey('2025-10-03')).toBe('3 okt');
    expect(daysBetween('2025-03-14', '2025-03-01')).toBe(13);
  });
});

describe('buildHistory', () => {
  const foods = [food('2025-03-14T09:00:00Z', 300), food('2025-03-12T09:00:00Z', 600, '2 × Pizza')];
  const runs = [run('2025-03-14T07:00:00Z', 5), run('2025-03-10T07:00:00Z', 8)];
  const base = { foods, runs, resets: [] as ResetMarker[], filter: 'all' as const, query: '' };

  it('grupperar per dag, nyast överst, med dagssumma', () => {
    const g = buildHistory(base, TODAY);
    expect(g.map((x) => x.label)).toEqual(['Idag', 'ons 12 mar', 'mån 10 mar']);
    expect(g[0].items.map((i) => i.kind)).toEqual(['food', 'run']);
    expect(g[0].sumKm).toBeCloseTo(5 - 3.75);
    expect(g[0].est).toBe(true);
    expect(g[2].est).toBe(false);
  });
  it('filtrerar mat och löpning', () => {
    expect(buildHistory({ ...base, filter: 'ate' }, TODAY).flatMap((g) => g.items).every((i) => i.kind === 'food')).toBe(true);
    expect(buildHistory({ ...base, filter: 'ran' }, TODAY).flatMap((g) => g.items).every((i) => i.kind === 'run')).toBe(true);
  });
  it('söker i text, och "löp" hittar löpning', () => {
    const q = (query: string) => buildHistory({ ...base, query }, TODAY).flatMap((g) => g.items);
    expect(q('pizza')).toHaveLength(1);
    expect(q('PIZ')).toHaveLength(1);
    expect(q('löp')).toHaveLength(2);
    expect(q('finns inte')).toHaveLength(0);
  });
  it('nollställning blir en avdelare och poster före tonas ned', () => {
    const resets = [reset('2025-03-11T12:00:00Z', -18.2)];
    const g = buildHistory({ ...base, resets }, TODAY);
    const flat = g.flatMap((x) => x.items);
    expect(flat.map((i) => i.kind)).toEqual(['food', 'run', 'food', 'reset', 'run']);
    const before = flat.filter((i) => i.kind !== 'reset' && i.before);
    expect(before).toHaveLength(1);
    expect(g.find((x) => x.day === '2025-03-10')!.faded).toBe(true);
    expect(g.find((x) => x.day === '2025-03-14')!.faded).toBe(false);
  });
  it('dag som delas av markören summerar bara poster efter den', () => {
    const resets = [reset('2025-03-14T08:00:00Z')];
    const g = buildHistory({ ...base, resets }, TODAY);
    const today = g.find((x) => x.day === '2025-03-14')!;
    expect(today.sumKm).toBeCloseTo(-3.75);
    expect(today.faded).toBe(false);
  });
  it('avdelare visas inte under sökning eller filter', () => {
    const resets = [reset('2025-03-11T12:00:00Z')];
    expect(buildHistory({ ...base, resets, query: 'pizza' }, TODAY).flatMap((g) => g.items).some((i) => i.kind === 'reset')).toBe(false);
    expect(buildHistory({ ...base, resets, filter: 'ate' }, TODAY).flatMap((g) => g.items).some((i) => i.kind === 'reset')).toBe(false);
  });
  it('tom historik ger inga grupper', () => {
    expect(buildHistory({ ...base, foods: [], runs: [] }, TODAY)).toEqual([]);
  });
});

describe('dailyStats och statsFor', () => {
  const foods = [food('2025-03-10T09:00:00Z', 600), food('2025-03-12T09:00:00Z', 300, 'Kanelbulle'), food('2025-03-13T09:00:00Z', 300, '2 × Kanelbulle', { itemId: 'b-kanelbulle' })];
  const runs = [run('2025-03-11T07:00:00Z', 12), run('2025-03-14T07:00:00Z', 4)];

  it('fyller dagar utan poster och ackumulerar', () => {
    const d = dailyStats(foods, runs, TODAY);
    expect(d).toHaveLength(5);
    expect(d[0]).toMatchObject({ day: '2025-03-10', ate: -7.5, ran: 0, v: -7.5 });
    expect(d[1].v).toBeCloseTo(4.5);
    expect(d[4].v).toBeCloseTo(-7.5 + 12 - 3.75 - 3.75 + 4);
  });
  it('tom data ger inga dagar', () => {
    expect(dailyStats([], [], TODAY)).toEqual([]);
  });
  it('nyckeltal: förändring, totaler, vanligaste, svit', () => {
    const s = statsFor(foods, runs, [], 0, 'all', TODAY);
    expect(s.net).toBeCloseTo(s.win[s.win.length - 1].v);
    expect(s.ranTotal).toBe(16);
    expect(s.ateTotal).toBeCloseTo(7.5 + 3.75 + 3.75);
    expect(s.top).toEqual({ name: 'Kanelbulle', count: 2 });
    expect(s.streak).toBe(2);
    expect(s.est).toBe(true);
    expect(s.n).toBe(5);
  });
  it('vanligaste slår ihop "2 × X" och "X", och räknar via itemId när det finns', () => {
    expect(baseName('2 × Kanelbulle')).toBe('Kanelbulle');
    expect(baseName('1,5 × Pizza')).toBe('Pizza');
    const f = [food('2025-03-10T09:00:00Z', 300, 'Kaka'), food('2025-03-11T09:00:00Z', 300, 'Kaka'), food('2025-03-12T09:00:00Z', 900, 'Pizza')];
    expect(statsFor(f, [], [], 0, 'all', TODAY).top).toEqual({ name: 'Kaka', count: 2 });
  });
  it('period begränsar fönstret', () => {
    const s = statsFor(foods, runs, [], 2, 'all', TODAY);
    expect(s.win).toHaveLength(2);
    expect(s.ranTotal).toBe(4);
    expect(s.n).toBe(2);
  });
  it('omfång: efter nollställning eller allt sedan start', () => {
    const resets = [reset('2025-03-11T12:00:00Z')];
    const afterReset = statsFor(foods, runs, resets, 0, 'reset', TODAY);
    expect(afterReset.win[0].day).toBe('2025-03-12');
    expect(afterReset.ranTotal).toBe(4);
    const all = statsFor(foods, runs, resets, 0, 'all', TODAY);
    expect(all.win[0].day).toBe('2025-03-10');
    expect(all.ranTotal).toBe(16);
  });
  it('tom statistik', () => {
    const s = statsFor([], [], [], 30, 'all', TODAY);
    expect(s).toMatchObject({ win: [], n: 0, net: 0, streak: 0, top: null });
  });
});

describe('staplar', () => {
  const mk = (n: number): ReturnType<typeof dailyStats> =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10);
      return { day: d, ate: -1, ran: 2, net: 1, v: i, est: false, note: '' };
    });
  it('upp till 31 dagar visas per dag', () => {
    const a = aggregate(mk(31));
    expect(a.weekly).toBe(false);
    expect(a.bars).toHaveLength(31);
  });
  it('över 31 dagar per vecka, bakifrån', () => {
    const a = aggregate(mk(90));
    expect(a.weekly).toBe(true);
    expect(a.bars).toHaveLength(Math.ceil(90 / 7));
    expect(a.bars[a.bars.length - 1].ran).toBe(14);
    expect(a.bars[0].ran).toBe(2 * (90 % 7 || 7));
    expect(a.bars.reduce((s, b) => s + b.ran, 0)).toBe(180);
  });
  it('enstaka stor post klipps vid 1,7 × p90', () => {
    const days = mk(10).map((d, i) => (i === 5 ? { ...d, ran: 40 } : d));
    const l = layoutBars(aggregate(days).bars, 390, 188);
    expect(l.clip).not.toBeNull();
    expect(l.hi).toBeLessThan(40);
    expect(l.y(40)).toBeCloseTo(l.y(l.hi));
  });
  it('ingen klippning utan extremvärde', () => {
    expect(layoutBars(aggregate(mk(10)).bars, 390, 188).clip).toBeNull();
  });
  it('nollan ligger mellan max och min, staplar högerjusterade i minst 7 platser', () => {
    const l = layoutBars(aggregate(mk(3)).bars, 390, 188);
    expect(l.hi).toBeGreaterThan(0);
    expect(l.lo).toBeLessThan(0);
    expect(l.xs[2]).toBeGreaterThan(l.xs[1]);
    expect(l.xs[0]).toBeGreaterThan(l.x0 + 3 * l.slot);
    expect(l.ticks.length).toBeLessThanOrEqual(2);
  });
});
