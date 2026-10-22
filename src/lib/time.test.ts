import { describe, expect, it } from 'vitest';
import { dayKey, formatTime, formatWhen, fromLocalInput, toLocalInput } from './time';
import { pickLine, LINES } from './copy';

describe('Stockholmstid', () => {
  it('visar vintertid (UTC+1) och sommartid (UTC+2)', () => {
    expect(formatTime('2025-01-15T12:00:00.000Z')).toBe('13:00');
    expect(formatTime('2025-07-15T12:00:00.000Z')).toBe('14:00');
  });
  it('dagsgräns följer Stockholm, inte UTC', () => {
    expect(dayKey('2025-07-15T22:30:00.000Z')).toBe('2025-07-16');
    expect(dayKey('2025-01-15T22:30:00.000Z')).toBe('2025-01-15');
    expect(dayKey('2025-01-15T23:30:00.000Z')).toBe('2025-01-16');
  });
  it('rundar fram och tillbaka via datetime-local', () => {
    for (const iso of ['2025-01-15T12:34:00.000Z', '2025-07-15T12:34:00.000Z', '2025-03-30T12:00:00.000Z']) {
      const local = toLocalInput(iso);
      expect(fromLocalInput(local)).toBe(iso);
    }
  });
  it('tolkar inmatad tid som Stockholmstid', () => {
    expect(fromLocalInput('2025-01-15T13:00')).toBe('2025-01-15T12:00:00.000Z');
    expect(fromLocalInput('2025-07-15T14:00')).toBe('2025-07-15T12:00:00.000Z');
  });
  it('hanterar sommartidsbytet', () => {
    // 2025-03-30 02:00 -> 03:00. 01:30 är vintertid, 03:30 är sommartid.
    expect(fromLocalInput('2025-03-30T01:30')).toBe('2025-03-30T00:30:00.000Z');
    expect(fromLocalInput('2025-03-30T03:30')).toBe('2025-03-30T01:30:00.000Z');
    // 2025-10-26 03:00 -> 02:00. 04:30 är vintertid.
    expect(fromLocalInput('2025-10-26T04:30')).toBe('2025-10-26T03:30:00.000Z');
  });
  it('avvisar ogiltig inmatning', () => {
    expect(fromLocalInput('')).toBeUndefined();
    expect(fromLocalInput('igår')).toBeUndefined();
  });
  it('skriver Idag, I går och datum', () => {
    const now = new Date('2025-10-22T10:00:00.000Z');
    expect(formatWhen('2025-10-22T07:05:00.000Z', now)).toBe('Idag 09:05');
    expect(formatWhen('2025-10-21T07:05:00.000Z', now)).toBe('I går 09:05');
    expect(formatWhen('2025-10-12T16:05:00.000Z', now)).toBe('12 okt 18:05');
  });
});

describe('dagens rad', () => {
  it('finns minst sex varianter per läge', () => {
    for (const lines of Object.values(LINES)) expect(lines.length).toBeGreaterThanOrEqual(6);
  });
  it('är stabil under en dag och roterar mellan dagar', () => {
    expect(pickLine('debt', '2025-03-01')).toBe(pickLine('debt', '2025-03-01'));
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) seen.add(pickLine('debt', `2025-03-${String(d).padStart(2, '0')}`));
    expect(seen.size).toBeGreaterThan(3);
  });
  it('har inga utropstecken', () => {
    for (const lines of Object.values(LINES)) for (const l of lines) expect(l).not.toContain('!');
  });
});
