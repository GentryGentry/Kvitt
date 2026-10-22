import { describe, expect, it } from 'vitest';
import { findSuggestions, normalize, parseQuantity, stem } from './parse';
import { BUILTIN_ITEMS, builtinOrder } from './foods';
import type { FoodItem } from './types';

describe('parseQuantity', () => {
  const cases: [string, number, boolean, string][] = [
    ['2 kanelbullar', 2, true, 'kanelbullar'],
    ['kanelbulle', 1, false, 'kanelbulle'],
    ['3 öl', 3, true, 'öl'],
    ['en öl', 1, true, 'öl'],
    ['två pizzor', 2, true, 'pizzor'],
    ['halv påse lösgodis', 0.5, true, 'påse lösgodis'],
    ['en halv pizza', 0.5, true, 'pizza'],
    ['halva pizzan', 0.5, true, 'pizzan'],
    ['1/2 pizza', 0.5, true, 'pizza'],
    ['en och en halv pizza', 1.5, true, 'pizza'],
    ['två och en halv pizza', 2.5, true, 'pizza'],
    ['1 1/2 pizza', 1.5, true, 'pizza'],
    ['1,5 pizza', 1.5, true, 'pizza'],
    ['1.5 pizza', 1.5, true, 'pizza'],
    ['3x öl', 3, true, 'öl'],
    ['3 x öl', 3, true, 'öl'],
    ['2 st kanelbullar', 2, true, 'kanelbullar'],
    ['2st kanelbullar', 1, false, '2st kanelbullar'],
    ['fredagsmys', 1, false, 'fredagsmys'],
    ['liten pizza', 1, false, 'liten pizza'],
    ['33 cl cola', 1, false, '33 cl cola'],
    ['', 1, false, ''],
  ];
  for (const [input, qty, explicit, rest] of cases) {
    it(`"${input}"`, () => {
      const p = parseQuantity(input);
      expect(p.quantity).toBe(qty);
      expect(p.explicit).toBe(explicit);
      expect(p.rest).toBe(rest);
    });
  }
  it('behåller skiftläge i resten', () => {
    expect(parseQuantity('2 Kanelbullar').rest).toBe('Kanelbullar');
  });
});

describe('stamning', () => {
  it('för ihop böjningar', () => {
    expect(stem('bullar')).toBe(stem('bulle'));
    expect(stem('bullen')).toBe(stem('bulle'));
    expect(stem('pizzor')).toBe(stem('pizza'));
    expect(stem('ölen')).toBe(stem('öl'));
    expect(stem('kanelbullar')).toBe(stem('kanelbulle'));
  });
  it('behåller å, ä, ö men tar bort andra accenter', () => {
    expect(normalize('Wienerbröd')).toBe('wienerbröd');
    expect(normalize('Café')).toBe('cafe');
    expect(normalize('ÅÄÖ')).toBe('åäö');
  });
});

describe('findSuggestions', () => {
  const find = (q: string, items: FoodItem[] = BUILTIN_ITEMS) =>
    findSuggestions(q, items, { order: builtinOrder });

  it('"2 kanelbullar" ger Kanelbulle × 2 = 600 kcal överst', () => {
    const [top] = find('2 kanelbullar');
    expect(top.item.name).toBe('Kanelbulle');
    expect(top.quantity).toBe(2);
    expect(top.kcal).toBe(600);
  });
  it('hittar på prefix medan man skriver', () => {
    expect(find('kanel')[0].item.name).toBe('Kanelbulle');
    expect(find('sem')[0].item.name).toBe('Semla');
  });
  it('tål stavfel', () => {
    expect(find('kanelbula')[0].item.name).toBe('Kanelbulle');
    expect(find('chokladbolll')[0].item.name).toBe('Chokladboll');
  });
  it('"liten pizza" prioriterar liten pizza', () => {
    expect(find('liten pizza')[0].item.name).toBe('Pizza (liten)');
  });
  it('"pizza" ger hel pizza först', () => {
    expect(find('pizza')[0].item.name).toBe('Pizza (hel)');
  });
  it('"halv pizza" är en halv hel pizza, 450 kcal', () => {
    const [top] = find('halv pizza');
    expect(top.item.name).toBe('Pizza (hel)');
    expect(top.kcal).toBe(450);
  });
  it('"halv påse lösgodis" ger 350 kcal', () => {
    const [top] = find('halv påse lösgodis');
    expect(top.item.name).toBe('Lösgodis');
    expect(top.kcal).toBe(350);
  });
  it('"3 öl" ger 630 kcal', () => {
    const [top] = find('3 öl');
    expect(top.item.name).toBe('Öl (50 cl)');
    expect(top.kcal).toBe(630);
  });
  it('hittar via alias', () => {
    expect(find('bulle')[0].item.name).toBe('Kanelbulle');
    expect(find('fredagsmys')[0].item.name).toBe('Fredagsmys');
    expect(find('coca-cola')[0].item.name).toBe('Läsk (burk 33 cl)');
    expect(find('marabou')[0].item.name).toBe('Chokladkaka (100 g)');
  });
  it('ger inget för okända saker eller för kort inmatning', () => {
    expect(find('något helt okänt')).toEqual([]);
    expect(find('qzxv')).toEqual([]);
    expect(find('k')).toEqual([]);
    expect(find('2')).toEqual([]);
    expect(find('')).toEqual([]);
  });
  it('ger högst fem förslag', () => {
    expect(find('bulle', BUILTIN_ITEMS).length).toBeLessThanOrEqual(5);
    expect(findSuggestions('b', BUILTIN_ITEMS, { limit: 3 }).length).toBeLessThanOrEqual(3);
  });
  it('favoriter och ofta använda hamnar före lika bra träffar', () => {
    const items = BUILTIN_ITEMS.map((i) =>
      i.name === 'Öl (33 cl)' ? { ...i, isFavorite: true, useCount: 5 } : i,
    );
    expect(find('öl', items)[0].item.name).toBe('Öl (33 cl)');
  });
  it('inlärd sak föreslås med senast använd mängd', () => {
    const learned: FoodItem = {
      id: 'l1', name: 'Mammas lussekaka', kcalPerUnit: 250, unitLabel: 'st', aliases: [],
      isFavorite: false, useCount: 2, lastUsedAt: '2025-01-01T00:00:00.000Z', source: 'learned',
      lastQuantity: 3,
    };
    const [top] = find('lussekaka', [...BUILTIN_ITEMS, learned]);
    expect(top.item.id).toBe('l1');
    expect(top.quantity).toBe(3);
    expect(top.kcal).toBe(750);
    // Skriver man ett antal gäller det.
    expect(find('1 lussekaka', [...BUILTIN_ITEMS, learned])[0].quantity).toBe(1);
  });
});

describe('inbyggd lista', () => {
  it('har minst 100 poster med unika id', () => {
    expect(BUILTIN_ITEMS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(BUILTIN_ITEMS.map((i) => i.id)).size).toBe(BUILTIN_ITEMS.length);
  });
  it('har rimliga kcal och namn', () => {
    for (const i of BUILTIN_ITEMS) {
      expect(i.kcalPerUnit).toBeGreaterThan(0);
      expect(i.kcalPerUnit).toBeLessThan(2000);
      expect(i.name.length).toBeGreaterThan(1);
      expect(i.unitLabel.length).toBeGreaterThan(0);
    }
  });
  it('innehåller specens exempelposter', () => {
    const kcal = (n: string) => BUILTIN_ITEMS.find((i) => i.name === n)?.kcalPerUnit;
    expect(kcal('Kanelbulle')).toBe(300);
    expect(kcal('Pizza (hel)')).toBe(900);
    expect(kcal('Chips (stor påse)')).toBe(950);
    expect(kcal('Öl (50 cl)')).toBe(210);
  });
  it('varje post hittas av sitt eget namn', () => {
    for (const i of BUILTIN_ITEMS) {
      const names = find(i.name).map((s) => s.item.id);
      expect(names, i.name).toContain(i.id);
    }
  });
  function find(q: string) {
    return findSuggestions(q, BUILTIN_ITEMS, { order: builtinOrder, limit: 5 });
  }
});
