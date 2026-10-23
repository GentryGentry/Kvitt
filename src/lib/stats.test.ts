import { describe, expect, it } from 'vitest';
import { balanceSeries } from './stats';
import { makeFoodFields } from './calc';
import type { FoodEntry, ResetMarker, RunEntry } from './types';

const food = (at: string, kcal: number): FoodEntry => ({ id: at, at, label: 'x', isEstimate: true, ...makeFoodFields(kcal, 80) });
const run = (at: string, km: number): RunEntry => ({ id: at, at, km });
const reset = (at: string): ResetMarker => ({ id: at, at, balanceBeforeKm: 0 });

describe('balanceSeries', () => {
  const today = '2025-03-14';
  it('är tom utan poster', () => {
    expect(balanceSeries({ foods: [], runs: [], resets: [] }, today)).toEqual([]);
  });
  it('börjar vid första dagen med en post och slutar idag', () => {
    const s = balanceSeries({ foods: [food('2025-03-10T10:00:00Z', 600)], runs: [], resets: [] }, today);
    expect(s.map((p) => p.day)).toEqual(['2025-03-10', '2025-03-11', '2025-03-12', '2025-03-13', '2025-03-14']);
  });
  it('en post idag ger en enda punkt', () => {
    const s = balanceSeries({ foods: [], runs: [run('2025-03-14T10:00:00Z', 5)], resets: [] }, today);
    expect(s).toHaveLength(1);
    expect(s[0].value).toBe(5);
  });
  it('ackumulerar saldot dag för dag', () => {
    const s = balanceSeries(
      { foods: [food('2025-03-10T10:00:00Z', 600)], runs: [run('2025-03-12T10:00:00Z', 8)], resets: [] },
      today,
    );
    expect(s.find((p) => p.day === '2025-03-10')!.value).toBe(-7.5);
    expect(s.find((p) => p.day === '2025-03-11')!.value).toBe(-7.5);
    expect(s[s.length - 1].value).toBeCloseTo(0.5);
  });
  it('högst 14 dagar, och äldre poster ingår i startsaldot', () => {
    const s = balanceSeries({ foods: [], runs: [run('2025-01-01T10:00:00Z', 20)], resets: [] }, today);
    expect(s).toHaveLength(14);
    expect(s[0].day).toBe('2025-03-01');
    expect(s[0].value).toBe(20);
    expect(s[13].value).toBe(20);
  });
  it('ignorerar poster före nollställning', () => {
    const s = balanceSeries(
      {
        foods: [food('2025-03-05T10:00:00Z', 600)],
        runs: [run('2025-03-12T10:00:00Z', 5)],
        resets: [reset('2025-03-10T08:00:00Z')],
      },
      today,
    );
    expect(s[0].day).toBe('2025-03-12');
    expect(s[s.length - 1].value).toBe(5);
  });
  it('sista punkten stämmer med saldot', () => {
    const foods = [food('2025-03-13T10:00:00Z', 300), food('2025-03-14T09:00:00Z', 160)];
    const runs = [run('2025-03-14T10:30:00Z', 1.25)];
    const s = balanceSeries({ foods, runs, resets: [] }, today);
    expect(s[s.length - 1].value).toBeCloseTo(1.25 - 3.75 - 2);
  });
  it('noten är dagens största post', () => {
    const big = { ...food('2025-03-14T09:00:00Z', 900), label: 'Pizza (hel)' };
    const small = { ...food('2025-03-14T11:00:00Z', 100), label: 'Kex' };
    const s = balanceSeries({ foods: [small, big], runs: [run('2025-03-14T12:00:00Z', 2)], resets: [] }, today);
    expect(s[0].note).toBe('Pizza (hel)');
  });
});
