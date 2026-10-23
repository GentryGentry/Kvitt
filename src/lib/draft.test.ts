import { describe, expect, it } from 'vitest';
import { buildFoodDraft, exactKcal, pickedKcal } from './draft';
import { commonDistances, favoriteItems, recentItems } from './stats';
import { BUILTIN_ITEMS } from './foods';
import type { FoodItem, RunEntry } from './types';

const kanel = BUILTIN_ITEMS.find((i) => i.name === 'Kanelbulle')!;

describe('buildFoodDraft', () => {
  const pick = (item: FoodItem, quantity: number) => ({ item, quantity, baseKcal: pickedKcal(item, quantity) });

  it('"2 kanelbullar" ger 600 kcal och är en uppskattning', () => {
    const picked = pick(kanel, 2);
    const d = buildFoodDraft({ name: 'Kanelbulle', kcalText: String(picked.baseKcal), picked, wantFavorite: false })!;
    expect(d.kcal).toBe(600);
    expect(d.isEstimate).toBe(true);
    expect(d.label).toBe('2 × Kanelbulle');
    expect(d.newItem).toBeUndefined();
  });
  it('ändrat kcal-värde tar bort "ca"', () => {
    const picked = pick(kanel, 1);
    const d = buildFoodDraft({ name: 'Kanelbulle', kcalText: '350', picked, wantFavorite: false })!;
    expect(d.kcal).toBe(350);
    expect(d.isEstimate).toBe(false);
  });
  it('okänd sak med egen kcal sparas som egen sak', () => {
    const d = buildFoodDraft({ name: 'mammas lussekaka', kcalText: '350', picked: null, wantFavorite: false })!;
    expect(d.isEstimate).toBe(false);
    expect(d.kcal).toBe(350);
    expect(d.label).toBe('Mammas lussekaka');
    expect(d.newItem).toMatchObject({ name: 'Mammas lussekaka', kcalPerUnit: 350, source: 'custom', isFavorite: false });
  });
  it('stjärnan på en ny sak gör den till favorit', () => {
    const d = buildFoodDraft({ name: 'kaka', kcalText: '200', picked: null, wantFavorite: true })!;
    expect(d.newItem?.isFavorite).toBe(true);
  });
  it('antal i texten delar totalen till kcal per enhet', () => {
    const d = buildFoodDraft({ name: '3 mammas kakor', kcalText: '900', picked: null, wantFavorite: false })!;
    expect(d.quantity).toBe(3);
    expect(d.newItem).toMatchObject({ name: 'Mammas kakor', kcalPerUnit: 300, unitLabel: 'st' });
    expect(d.kcal).toBe(900);
  });
  it('går inte att logga utan giltig kcal', () => {
    expect(buildFoodDraft({ name: 'något okänt', kcalText: '', picked: null, wantFavorite: false })).toBeUndefined();
    const picked = pick(kanel, 1);
    expect(buildFoodDraft({ name: 'Kanelbulle', kcalText: '', picked, wantFavorite: false })).toBeUndefined();
  });
  it('bara kcal utan text loggas som "Något" utan att sparas', () => {
    const d = buildFoodDraft({ name: '', kcalText: '500', picked: null, wantFavorite: false })!;
    expect(d.label).toBe('Något');
    expect(d.newItem).toBeUndefined();
  });
  it('egen sak som används igen är inte en uppskattning', () => {
    const custom: FoodItem = { ...kanel, id: 'c', source: 'custom' };
    const picked = pick(custom, 1);
    const d = buildFoodDraft({ name: custom.name, kcalText: '300', picked, wantFavorite: false })!;
    expect(d.isEstimate).toBe(false);
  });
  it('validerar kcal 1–5 000', () => {
    expect(exactKcal('0')).toBeUndefined();
    expect(exactKcal('5001')).toBeUndefined();
    expect(exactKcal('5000')).toBe(5000);
    expect(exactKcal('abc')).toBeUndefined();
    expect(exactKcal('412,6')).toBe(413);
  });
});

describe('snabbval', () => {
  const run = (km: number, day: number): RunEntry => ({ id: `${km}-${day}`, km, at: `2025-03-${String(day).padStart(2, '0')}T10:00:00Z` });
  it('de tre vanligaste sträckorna från egen historik', () => {
    const runs = [run(5, 1), run(5, 2), run(5, 3), run(10, 4), run(10, 5), run(7.5, 6), run(3, 7)];
    expect(commonDistances(runs)).toEqual([5, 10, 3]);
  });
  it('tom historik ger inga knappar', () => {
    expect(commonDistances([])).toEqual([]);
  });
  it('favoriter och senaste hålls isär', () => {
    const mk = (id: string, fav: boolean, last: string, uses = 1): FoodItem => ({ ...kanel, id, name: id, isFavorite: fav, lastUsedAt: last, useCount: uses });
    const items = [
      mk('a', true, '2025-03-01T00:00:00Z', 5),
      mk('b', false, '2025-03-03T00:00:00Z'),
      mk('c', false, '2025-03-02T00:00:00Z'),
      mk('d', false, ''),
    ];
    expect(favoriteItems(items).map((i) => i.id)).toEqual(['a']);
    expect(recentItems(items).map((i) => i.id)).toEqual(['b', 'c']);
    expect(recentItems(items, 1).map((i) => i.id)).toEqual(['b']);
  });
});
