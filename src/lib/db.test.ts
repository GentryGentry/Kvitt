import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { currentBalanceKm, deleteItem, logFood, logRun, resetBalance, undoReset, updateItem } from './actions';
import { parseBackup, readBackup, replaceAll, serializeBackup, summarize } from './backup';
import { DEFAULT_SETTINGS } from './calc';
import { db, seedBuiltins } from './db';
import { BUILTIN_ITEMS } from './foods';

const settings = { ...DEFAULT_SETTINGS, weightKg: 80 };

async function wipe() {
  await Promise.all([db.settings.clear(), db.foods.clear(), db.runs.clear(), db.resets.clear(), db.items.clear(), db.meta.clear()]);
  await db.settings.put({ ...settings, id: 'main' });
}

beforeEach(wipe);

describe('seedBuiltins', () => {
  it('lägger in alla inbyggda en gång och är idempotent', async () => {
    await seedBuiltins();
    await seedBuiltins();
    expect(await db.items.count()).toBe(BUILTIN_ITEMS.length);
  });
  it('återskapar inte raderade eller ändrade inbyggda saker', async () => {
    await seedBuiltins();
    const kanel = (await db.items.get('b-kanelbulle'))!;
    await deleteItem(kanel);
    const semla = (await db.items.get('b-semla'))!;
    await updateItem(semla, { name: 'Semla', kcalPerUnit: 500, unitLabel: 'st', aliases: [] });
    await seedBuiltins();
    expect(await db.items.get('b-kanelbulle')).toBeUndefined();
    expect((await db.items.get('b-semla'))!.kcalPerUnit).toBe(500);
    expect(await db.items.count()).toBe(BUILTIN_ITEMS.length - 1);
  });
  it('lägger till nya inbyggda poster i framtida versioner', async () => {
    await seedBuiltins();
    await db.meta.put({ key: 'seeded', ids: BUILTIN_ITEMS.slice(1).map((i) => i.id) });
    await db.items.delete(BUILTIN_ITEMS[0].id);
    await seedBuiltins();
    expect(await db.items.get(BUILTIN_ITEMS[0].id)).toBeDefined();
  });
});

describe('sparade saker', () => {
  it('ändrad kcal på inbyggd sak gör den egen och exakt', async () => {
    await seedBuiltins();
    const semla = (await db.items.get('b-semla'))!;
    await updateItem(semla, { ...semla, kcalPerUnit: 500, aliases: semla.aliases });
    expect((await db.items.get('b-semla'))!.source).toBe('custom');
  });
  it('bara namn eller alias ändrat låter den vara inbyggd', async () => {
    await seedBuiltins();
    const semla = (await db.items.get('b-semla'))!;
    await updateItem(semla, { name: 'Semla', kcalPerUnit: semla.kcalPerUnit, unitLabel: 'st', aliases: ['fettisdag'] });
    expect((await db.items.get('b-semla'))!.source).toBe('builtin');
  });
  it('radering går att ångra', async () => {
    await seedBuiltins();
    const it = (await db.items.get('b-semla'))!;
    const undo = await deleteItem(it);
    expect(await db.items.get('b-semla')).toBeUndefined();
    await undo();
    expect(await db.items.get('b-semla')).toBeDefined();
  });
});

describe('loggning', () => {
  it('posten får itemId, och ny egen sak skapas en gång', async () => {
    await seedBuiltins();
    const kanel = (await db.items.get('b-kanelbulle'))!;
    const a = await logFood({ settings, at: new Date().toISOString(), label: 'Kanelbulle', kcal: 300, isEstimate: true, item: kanel, quantity: 1 });
    expect(a.entry.itemId).toBe('b-kanelbulle');
    const n = { name: 'Mammas kaka', kcalPerUnit: 350, unitLabel: 'portion', source: 'custom' as const };
    const b = await logFood({ settings, at: new Date().toISOString(), label: 'Mammas kaka', kcal: 350, isEstimate: false, quantity: 1, newItem: n });
    const c = await logFood({ settings, at: new Date().toISOString(), label: 'Mammas kaka', kcal: 350, isEstimate: false, quantity: 1, newItem: n });
    expect(b.entry.itemId).toBeDefined();
    expect(c.entry.itemId).toBe(b.entry.itemId);
    expect((await db.items.where('source').equals('custom').toArray()).length).toBe(1);
  });
  it('ångra loggning tar bort posten och nyskapad sak', async () => {
    const n = { name: 'Ny sak', kcalPerUnit: 100, unitLabel: 'st', source: 'custom' as const };
    const l = await logFood({ settings, at: new Date().toISOString(), label: 'Ny sak', kcal: 100, isEstimate: false, quantity: 1, newItem: n });
    await l.undo();
    expect(await db.foods.count()).toBe(0);
    expect(await db.items.count()).toBe(0);
  });
});

describe('nollställning', () => {
  it('går att ångra tills nästa post loggats', async () => {
    await logRun(8, new Date(Date.now() - 1000).toISOString());
    expect(await currentBalanceKm()).toBe(8);
    await resetBalance(8);
    expect(await currentBalanceKm()).toBe(0);
    expect(await undoReset()).toBe(true);
    expect(await currentBalanceKm()).toBe(8);
  });
  it('går inte att ångra efter att en post loggats', async () => {
    await logRun(8, new Date(Date.now() - 1000).toISOString());
    await resetBalance(8);
    await new Promise((r) => setTimeout(r, 5));
    await logRun(5, new Date().toISOString());
    expect(await undoReset()).toBe(false);
    expect(await currentBalanceKm()).toBe(5);
    expect(await db.resets.count()).toBe(1);
  });
  it('ångrar bara senaste markören', async () => {
    await resetBalance(1);
    await db.resets.toCollection().modify({ undoable: false });
    await new Promise((r) => setTimeout(r, 5));
    await resetBalance(2);
    expect(await undoReset()).toBe(true);
    expect(await db.resets.count()).toBe(1);
  });
});

describe('export och import', () => {
  it('rundtur ger exakt samma data (acceptans 9)', async () => {
    await seedBuiltins();
    const kanel = (await db.items.get('b-kanelbulle'))!;
    await logFood({ settings, at: '2025-03-01T10:00:00.000Z', label: 'Kanelbulle', kcal: 300, isEstimate: true, item: kanel, quantity: 1 });
    await logRun(7.25, '2025-03-02T07:00:00.000Z');
    await resetBalance(3.5);
    await deleteItem((await db.items.get('b-semla'))!);

    const exported = (await readBackup('2025-03-10T12:00:00.000Z'))!;
    const text = serializeBackup(exported);
    const parsed = parseBackup(text)!;
    expect(parsed).toEqual(exported);
    expect(summarize(parsed)).toEqual({ entries: 2, items: BUILTIN_ITEMS.length - 1 });

    await wipe();
    await db.items.put({ ...BUILTIN_ITEMS[0] });
    await replaceAll(parsed);
    const again = (await readBackup('2025-03-10T12:00:00.000Z'))!;
    expect(again).toEqual(exported);
    // Raderad inbyggd sak återuppstår inte efter import + start.
    await seedBuiltins();
    expect(await db.items.get('b-semla')).toBeUndefined();
  });
  it('avvisar hela filen vid en enda ogiltig rad', async () => {
    await logRun(5, '2025-03-02T07:00:00.000Z');
    const good = (await readBackup())!;
    expect(parseBackup(serializeBackup(good))).toBeDefined();
    const bad = JSON.parse(serializeBackup(good));
    bad.runs[0].km = -3;
    expect(parseBackup(JSON.stringify(bad))).toBeUndefined();
  });
  it('avvisar fel app, version, vikt och dubblerade id:n', async () => {
    await logRun(5, '2025-03-02T07:00:00.000Z');
    const good = JSON.parse(serializeBackup((await readBackup())!));
    const mut = (f: (b: any) => void) => {
      const b = structuredClone(good);
      f(b);
      return JSON.stringify(b);
    };
    expect(parseBackup(mut((b) => (b.app = 'annat')))).toBeUndefined();
    expect(parseBackup(mut((b) => (b.version = 2)))).toBeUndefined();
    expect(parseBackup(mut((b) => (b.settings.weightKg = 500)))).toBeUndefined();
    expect(parseBackup(mut((b) => b.runs.push(b.runs[0])))).toBeUndefined();
    expect(parseBackup('inte json')).toBeUndefined();
    expect(parseBackup('{}')).toBeUndefined();
    expect(parseBackup('[]')).toBeUndefined();
  });
  it('misslyckad import ändrar inget', async () => {
    await logRun(5, '2025-03-02T07:00:00.000Z');
    const good = (await readBackup())!;
    const broken = { ...good, runs: [good.runs[0], good.runs[0]] };
    await expect(replaceAll(broken)).rejects.toBeDefined();
    expect(await db.runs.count()).toBe(1);
    expect(await db.settings.get('main')).toBeDefined();
  });
});
