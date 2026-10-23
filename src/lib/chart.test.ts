import { describe, expect, it } from 'vitest';
import { kindOf, layoutChart, nearestIndex, niceStep } from './chart';

const pts = (...v: number[]) => v.map((value) => ({ value }));

describe('layoutChart', () => {
  it('0 punkter ger bara nollinjen och en neutral punkt', () => {
    const l = layoutChart([], 390, 300);
    expect(l.line).toBe('');
    expect(l.ticks).toEqual([]);
    expect(l.last.kind).toBe('zero');
    expect(l.last.y).toBeCloseTo(l.yz);
  });
  it('1 punkt ger bara punkten, ingen linje', () => {
    const l = layoutChart(pts(-4), 390, 300);
    expect(l.line).toBe('');
    expect(l.last.kind).toBe('debt');
    expect(l.last.x).toBe(l.x1);
  });
  it('rymmer alltid noll, med luft', () => {
    const l = layoutChart(pts(-5, -10, -29.6), 390, 300);
    expect(l.hi).toBeGreaterThan(0);
    expect(l.lo).toBeLessThan(-29.6);
    expect(l.yz).toBeGreaterThan(20);
    expect(l.y(-29.6)).toBeLessThan(300 - 30);
  });
  it('punkterna sitter högerställda i ett fönster om minst 7 dagar', () => {
    const l = layoutChart(pts(1, 2, 3), 390, 300);
    expect(l.xs[2]).toBe(l.x1);
    expect(l.xs[0]).toBeGreaterThan(l.x0);
    const full = layoutChart(pts(1, 2, 3, 4, 5, 6, 7), 390, 300);
    expect(full.xs[0]).toBe(full.x0);
  });
  it('högst två stödlinjer, aldrig noll', () => {
    const l = layoutChart(pts(0, -10, -40, -29.6), 390, 300);
    expect(l.ticks.length).toBeLessThanOrEqual(2);
    expect(l.ticks.every((t) => t.value !== 0)).toBe(true);
  });
  it('en stor enskild post klipps inte men får en etikett', () => {
    const l = layoutChart([{ value: 0 }, { value: -1 }, { value: -2 }, { value: -32, note: 'Pizza (hel)' }], 390, 300);
    expect(l.notes).toHaveLength(1);
    expect(l.notes[0].text).toBe('Pizza (hel)');
    expect(l.y(-32)).toBeLessThan(300);
  });
  it('små steg ger inga etiketter', () => {
    const l = layoutChart([{ value: 0 }, { value: -1, note: 'Kex' }, { value: -2, note: 'Kex' }], 390, 300);
    expect(l.notes).toEqual([]);
  });
});

describe('hjälpfunktioner', () => {
  it('tecken efter avrundat värde', () => {
    expect(kindOf(0.04)).toBe('zero');
    expect(kindOf(0.05)).toBe('credit');
    expect(kindOf(-0.05)).toBe('debt');
  });
  it('snygga steg', () => {
    expect(niceStep(60)).toBe(20);
    expect(niceStep(9)).toBe(5);
    expect(niceStep(300)).toBe(100);
  });
  it('närmaste punkt', () => {
    expect(nearestIndex([10, 50, 90], 60)).toBe(1);
    expect(nearestIndex([10, 50, 90], 1000)).toBe(2);
  });
});

describe('etiketter', () => {
  it('högst två, minst 110 px isär, och inom diagrammet', () => {
    const p = [0, -20, 0, -20, 0, -20, 0].map((value, i) => ({ value, note: `Post ${i}`.repeat(3) }));
    const l = layoutChart(p, 390, 300);
    expect(l.notes.length).toBeLessThanOrEqual(2);
    if (l.notes.length === 2) expect(Math.abs(l.notes[0].x - l.notes[1].x)).toBeGreaterThanOrEqual(110);
    for (const n of l.notes) {
      if (n.anchor === 'end') expect(n.tx - (n.text.length + 7) * 6.5).toBeGreaterThanOrEqual(l.x0);
    }
  });
});
