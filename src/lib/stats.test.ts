import { describe, expect, it } from 'vitest';
import { balanceSeries } from './stats';
import { makeFoodFields } from './calc';
import type { FoodEntry, ResetMarker, RunEntry } from './types';

const food = (at: string, kcal: number): FoodEntry => ({ id: at, at, label: 'x', isEstimate: true, ...makeFoodFields(kcal, 80) });
const run = (at: string, km: number): RunEntry => ({ id: at, at, km });
const reset = (at: string): ResetMarker => ({ id: at, at, balanceBeforeKm: 0 });

describe('balanceSeries', () => {
  const today = '2025-03-14';
  it('ger 14 punkter, äldst först, sista är idag', () => {
    const s = balanceSeries({ foods: [], runs: [], resets: [] }, today);
    expect(s).toHaveLength(14);
    expect(s[0].day).toBe('2025-03-01');
    expect(s[13].day).toBe(today);
    expect(s.every((p) => p.value === 0)).toBe(true);
  });
  it('ackumulerar saldot dag för dag', () => {
    const s = balanceSeries(
      { foods: [food('2025-03-10T10:00:00Z', 600)], runs: [run('2025-03-12T10:00:00Z', 8)], resets: [] },
      today,
    );
    expect(s.find((p) => p.day === '2025-03-09')!.value).toBe(0);
    expect(s.find((p) => p.day === '2025-03-10')!.value).toBe(-7.5);
    expect(s.find((p) => p.day === '2025-03-11')!.value).toBe(-7.5);
    expect(s[13].value).toBeCloseTo(0.5);
  });
  it('poster före fönstret ingår i startsaldot', () => {
    const s = balanceSeries({ foods: [], runs: [run('2025-01-01T10:00:00Z', 20)], resets: [] }, today);
    expect(s[0].value).toBe(20);
    expect(s[13].value).toBe(20);
  });
  it('ignorerar poster före nollställning och lämnar luckor före den', () => {
    const s = balanceSeries(
      {
        foods: [food('2025-03-05T10:00:00Z', 600)],
        runs: [run('2025-03-12T10:00:00Z', 5)],
        resets: [reset('2025-03-10T08:00:00Z')],
      },
      today,
    );
    expect(s.find((p) => p.day === '2025-03-09')!.value).toBeNull();
    expect(s.find((p) => p.day === '2025-03-10')!.value).toBe(0);
    expect(s[13].value).toBe(5);
  });
  it('sista punkten stämmer med saldot', () => {
    const foods = [food('2025-03-13T10:00:00Z', 300), food('2025-03-14T09:00:00Z', 160)];
    const runs = [run('2025-03-14T10:30:00Z', 1.25)];
    const s = balanceSeries({ foods, runs, resets: [] }, today);
    expect(s[13].value).toBeCloseTo(1.25 - 3.75 - 2);
  });
});
