import { describe, expect, it } from 'vitest';
import { buildFoodDraft, exactKcal } from './draft';
import { commonDistances, favoriteItems, recentItems } from './stats';
import { BUILTIN_ITEMS } from './foods';
import type { FoodItem, RunEntry } from './types';

const kanel = BUILTIN_ITEMS.find((i) => i.name === 'Kanelbulle')!;

describe('buildFoodDraft', () => {
  it('vald inbyggd sak är en uppskattning', () => {
    const d = buildFoodDraft({ text: '2 kanelbullar', kcalText: '', selected: { item: kanel, quantity: 2 }, saveAsCustom: true })!;
    expect(d.kcal).toBe(600);
    expect(d.isEstimate).toBe(true);
    expect(d.label).toBe('2 × Kanelbulle');
    expect(d.newItem).toBeUndefined();
  });
  it('exakt kcal går före tolkningen och tar bort ca', () => {
    const d = buildFoodDraft({ text: 'kanelbulle', kcalText: '412', selected: { item: kanel, quantity: 1 }, saveAsCustom: true })!;
    expect(d.kcal).toBe(412);
    expect(d.isEstimate).toBe(false);
  });
  it('okänd sak med egen kcal sparas som egen sak', () => {
    const d = buildFoodDraft({ text: 'mammas lussekaka', kcalText: '350', selected: null, saveAsCustom: true })!;
    expect(d.isEstimate).toBe(false);
    expect(d.kcal).toBe(350);
    expect(d.label).toBe('Mammas lussekaka');
    expect(d.newItem).toMatchObject({ name: 'Mammas lussekaka', kcalPerUnit: 350, source: 'custom' });
  });
  it('kan sparas som inlärd i stället', () => {
    const d = buildFoodDraft({ text: 'kaka', kcalText: '200', selected: null, saveAsCustom: false })!;
    expect(d.newItem?.source).toBe('learned');
  });
  it('antal i texten delar totalen till kcal per enhet', () => {
    const d = buildFoodDraft({ text: '3 mammas kakor', kcalText: '900', selected: null, saveAsCustom: true })!;
    expect(d.quantity).toBe(3);
    expect(d.newItem).toMatchObject({ name: 'Mammas kakor', kcalPerUnit: 300, unitLabel: 'st' });
    expect(d.kcal).toBe(900);
  });
  it('går inte att logga okänd sak utan kcal', () => {
    expect(buildFoodDraft({ text: 'något okänt', kcalText: '', selected: null, saveAsCustom: true })).toBeUndefined();
  });
  it('bara kcal utan text loggas som "Något" utan att sparas', () => {
    const d = buildFoodDraft({ text: '', kcalText: '500', selected: null, saveAsCustom: true })!;
    expect(d.label).toBe('Något');
    expect(d.newItem).toBeUndefined();
  });
  it('egen sak som används igen är inte en uppskattning', () => {
    const custom: FoodItem = { ...kanel, id: 'c', source: 'custom' };
    const d = buildFoodDraft({ text: '', kcalText: '', selected: { item: custom, quantity: 1 }, saveAsCustom: true })!;
    expect(d.isEstimate).toBe(false);
  });
  it('validerar kcal', () => {
    expect(exactKcal('0')).toBeUndefined();
    expect(exactKcal('20001')).toBeUndefined();
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
