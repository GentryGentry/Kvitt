import { describe, expect, it } from 'vitest';
import {
  balanceState,
  balanceTone,
  computeBalance,
  formatKcal,
  formatKm,
  formatKmApprox,
  formatQty,
  kcalPerKm,
  kmFromKcal,
  latestReset,
  parseNumber,
  roundRunKm,
  tiltDegrees,
  validateRunKm,
  withEditedKcal,
  makeFoodFields,
} from './calc';
import type { FoodEntry, ResetMarker, RunEntry } from './types';

const MINUS = '−';
const N = ' ';

function food(at: string, kcal: number, perKm = 80): FoodEntry {
  return { id: at + kcal, at, label: 'x', isEstimate: true, ...makeFoodFields(kcal, perKm) };
}
function run(at: string, km: number): RunEntry {
  return { id: at + km, at, km };
}
function reset(at: string, balanceBeforeKm = 0): ResetMarker {
  return { id: 'r' + at, at, balanceBeforeKm };
}

describe('grundformel', () => {
  it('80 kg och faktor 1,0 ger 80 kcal per km', () => {
    expect(kcalPerKm({ weightKg: 80, kcalPerKmPerKg: 1 })).toBe(80);
  });
  it('en kanelbulle (300 kcal) är 3,75 km, visas som 3,8 km', () => {
    const km = kmFromKcal(300, 80);
    expect(km).toBe(3.75);
    expect(formatKm(km)).toBe(`3,8${N}km`);
  });
  it('två kanelbullar är 7,5 km', () => {
    expect(formatKm(kmFromKcal(600, 80))).toBe(`7,5${N}km`);
  });
  it('faktorn skalar kcal per km', () => {
    expect(kcalPerKm({ weightKg: 70, kcalPerKmPerKg: 1.2 })).toBeCloseTo(84);
  });
});

describe('saldo', () => {
  const t = (d: number, h = 12) => `2025-03-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00.000Z`;

  it('är 0 utan poster', () => {
    const b = computeBalance({ foods: [], runs: [], resets: [] });
    expect(b.balanceKm).toBe(0);
    expect(b.count).toBe(0);
  });
  it('mat ger skuld', () => {
    const b = computeBalance({ foods: [food(t(1), 600)], runs: [], resets: [] });
    expect(b.balanceKm).toBe(-7.5);
    expect(b.ateKm).toBe(7.5);
  });
  it('8 km löpning efter 2 kanelbullar ger +0,5', () => {
    const b = computeBalance({ foods: [food(t(1), 600)], runs: [run(t(2), 8)], resets: [] });
    expect(b.balanceKm).toBeCloseTo(0.5);
    expect(formatKm(b.balanceKm, { sign: true })).toBe(`+0,5${N}km`);
  });
  it('går att ligga före: löpning utan mat ger tillgodo', () => {
    const b = computeBalance({ foods: [], runs: [run(t(1), 12.34)], resets: [] });
    expect(b.balanceKm).toBeCloseTo(12.34);
  });
  it('saldot går obegränsat åt båda håll', () => {
    const big = computeBalance({ foods: [food(t(1), 80000)], runs: [], resets: [] });
    expect(big.balanceKm).toBe(-1000);
  });
  it('nollställning räknar bara poster efter markören', () => {
    const data = {
      foods: [food(t(1), 600)],
      runs: [run(t(2), 8)],
      resets: [reset(t(3))],
    };
    expect(computeBalance(data).balanceKm).toBe(0);
    expect(computeBalance(data).count).toBe(0);
    expect(computeBalance(data, 'all').balanceKm).toBeCloseTo(0.5);
    data.runs.push(run(t(4), 5));
    expect(computeBalance(data).balanceKm).toBe(5);
    expect(computeBalance(data, 'all').balanceKm).toBeCloseTo(5.5);
  });
  it('senaste markören gäller, och att ta bort den återställer', () => {
    const r1 = reset(t(3));
    const r2 = reset(t(6));
    const runs = [run(t(4), 3), run(t(7), 2)];
    expect(computeBalance({ foods: [], runs, resets: [r1, r2] }).balanceKm).toBe(2);
    expect(latestReset([r1, r2])).toBe(r2);
    expect(computeBalance({ foods: [], runs, resets: [r1] }).balanceKm).toBe(5);
  });
  it('summerar i full precision', () => {
    const foods = [food(t(1), 100), food(t(1, 13), 100), food(t(1, 14), 100)];
    const b = computeBalance({ foods, runs: [], resets: [] });
    expect(b.ateKm).toBeCloseTo(3.75);
  });
});

describe('frysta värden', () => {
  it('ändrad vikt påverkar inte gamla poster', () => {
    const old = food('2025-03-01T10:00:00.000Z', 300, 80);
    const fresh = food('2025-03-02T10:00:00.000Z', 300, 90);
    expect(old.kmEquivalent).toBe(3.75);
    expect(fresh.kmEquivalent).toBeCloseTo(3.3333);
    const b = computeBalance({ foods: [old, fresh], runs: [], resets: [] });
    expect(b.ateKm).toBeCloseTo(3.75 + 300 / 90);
  });
  it('redigerad kcal räknas om med postens egen faktor', () => {
    const e = food('2025-03-01T10:00:00.000Z', 300, 80);
    const edited = withEditedKcal(e, 400);
    expect(edited.kcalPerKmUsed).toBe(80);
    expect(edited.kmEquivalent).toBe(5);
  });
});

describe('visning', () => {
  it('använder riktigt minustecken och alltid tecken när det begärs', () => {
    expect(formatKm(-4.6, { sign: true })).toBe(`${MINUS}4,6${N}km`);
    expect(formatKm(3.2, { sign: true })).toBe(`+3,2${N}km`);
    expect(formatKm(3.2)).toBe(`3,2${N}km`);
  });
  it('0,0 får aldrig något tecken, inte heller −0,0', () => {
    expect(formatKm(0, { sign: true })).toBe(`0,0${N}km`);
    expect(formatKm(-0.04, { sign: true })).toBe(`0,0${N}km`);
    expect(formatKm(0.04, { sign: true })).toBe(`0,0${N}km`);
    expect(formatKm(-0, { sign: true })).toBe(`0,0${N}km`);
  });
  it('avrundar halvt uppåt oberoende av flyttalsbrus', () => {
    expect(formatKm(0.05)).toBe(`0,1${N}km`);
    expect(formatKm(1.45)).toBe(`1,5${N}km`);
    expect(formatKm(-1.45, { sign: true })).toBe(`${MINUS}1,5${N}km`);
    expect(formatKm(2.25 + 1e-12)).toBe(`2,3${N}km`);
  });
  it('ger tusentalsavgränsare i stora tal', () => {
    expect(formatKm(-1234.56, { sign: true })).toBe(`${MINUS}1${N}234,6${N}km`);
  });
  it('kan visa utan enhet', () => {
    expect(formatKm(-4.6, { sign: true, unit: false })).toBe(`${MINUS}4,6`);
  });
  it('uppskattningar märks med ca', () => {
    expect(formatKmApprox(7.5)).toBe(`ca${N}7,5${N}km`);
    expect(formatKcal(600, { approx: true })).toBe(`≈${N}600${N}kcal`);
    expect(formatKcal(1500)).toBe(`1${N}500${N}kcal`);
    expect(formatKcal(643, { approx: true, round: 10 })).toBe(`≈${N}640${N}kcal`);
  });
  it('formaterar mängd med komma', () => {
    expect(formatQty(1)).toBe('1');
    expect(formatQty(1.5)).toBe('1,5');
    expect(formatQty(0.5)).toBe('0,5');
  });
  it('tonen följer det avrundade värdet', () => {
    expect(balanceTone(0.04)).toBe('zero');
    expect(balanceTone(-0.049)).toBe('zero');
    expect(balanceTone(0.05)).toBe('plus');
    expect(balanceTone(-0.05)).toBe('minus');
  });
});

describe('våglutning', () => {
  it('är 0 vid noll, tecknet följer saldot och mättas vid 14 grader', () => {
    expect(tiltDegrees(0)).toBe(0);
    expect(tiltDegrees(-5)).toBeLessThan(0);
    expect(tiltDegrees(5)).toBeGreaterThan(0);
    expect(tiltDegrees(1000)).toBeCloseTo(14, 5);
    expect(tiltDegrees(-1000)).toBeCloseTo(-14, 5);
  });
  it('är känslig nära noll', () => {
    expect(Math.abs(tiltDegrees(1))).toBeGreaterThan(1);
    expect(Math.abs(tiltDegrees(1))).toBeLessThan(Math.abs(tiltDegrees(2)));
  });
});

describe('läge för texter', () => {
  it('delar in saldot enligt specen', () => {
    expect(balanceState(0, 0)).toBe('empty');
    expect(balanceState(-10.5, 3)).toBe('deepDebt');
    expect(balanceState(-10, 3)).toBe('debt');
    expect(balanceState(-1, 3)).toBe('debt');
    expect(balanceState(-0.9, 3)).toBe('even');
    expect(balanceState(0.9, 3)).toBe('even');
    expect(balanceState(1, 3)).toBe('credit');
    expect(balanceState(10, 3)).toBe('credit');
    expect(balanceState(10.1, 3)).toBe('bigCredit');
  });
});

describe('inmatning av tal', () => {
  it('accepterar komma och punkt', () => {
    expect(parseNumber('7,5')).toBe(7.5);
    expect(parseNumber('7.5')).toBe(7.5);
    expect(parseNumber(' 12 ')).toBe(12);
  });
  it('avvisar skräp', () => {
    expect(parseNumber('')).toBeUndefined();
    expect(parseNumber('abc')).toBeUndefined();
    expect(parseNumber('-3')).toBeUndefined();
    expect(parseNumber('1,2,3')).toBeUndefined();
  });
  it('löprundor lagras med två decimaler', () => {
    expect(roundRunKm(5.005)).toBe(5.01);
    expect(roundRunKm(7.123)).toBe(7.12);
  });
  it('validerar 0,1–200 km', () => {
    expect(validateRunKm(0.1)).toBeUndefined();
    expect(validateRunKm(200)).toBeUndefined();
    expect(validateRunKm(0.05)).toMatch(/0,1 och 200/);
    expect(validateRunKm(201)).toMatch(/0,1 och 200/);
    expect(validateRunKm(undefined)).toBeDefined();
  });
});
