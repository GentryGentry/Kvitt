import { db, newId } from './db';
import { computeBalance, kcalPerKm, makeFoodFields, roundRunKm, withEditedKcal } from './calc';
import { tokenize } from './parse';
import type { FoodEntry, FoodItem, ResetMarker, RunEntry, Settings } from './types';

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const row = await db.settings.get('main');
  if (!row) throw new Error('Inställningar saknas');
  await db.settings.put({ ...row, ...patch, id: 'main' });
}

export async function createSettings(settings: Settings): Promise<void> {
  await db.settings.put({ ...settings, id: 'main' });
}

export interface LogFoodInput {
  settings: Settings;
  label: string;
  kcal: number;
  isEstimate: boolean;
  at: string;
  /** Befintlig sak som användes. Dess räknare och senaste mängd uppdateras. */
  item?: FoodItem;
  quantity: number;
  /** Ny sak att spara för okänd mat med egen kcal. */
  newItem?: {
    name: string;
    kcalPerUnit: number;
    unitLabel: string;
    source: 'learned' | 'custom';
    isFavorite?: boolean;
  };
}

export interface Logged<T> {
  entry: T;
  undo: () => Promise<void>;
}

function sameName(a: string, b: string): boolean {
  return tokenize(a).join(' ') === tokenize(b).join(' ');
}

export async function logFood(input: LogFoodInput): Promise<Logged<FoodEntry>> {
  const entry: FoodEntry = {
    id: newId(),
    at: input.at,
    label: input.label,
    isEstimate: input.isEstimate,
    ...makeFoodFields(input.kcal, kcalPerKm(input.settings)),
  };
  const now = new Date().toISOString();
  let before: FoodItem | undefined;
  let created: string | undefined;

  await db.transaction('rw', db.foods, db.items, db.resets, async () => {
    await clearUndoable();
    if (input.item) entry.itemId = input.item.id;
    if (input.newItem) {
      const dup = (await db.items.toArray()).find(
        (i) => i.source !== 'builtin' && sameName(i.name, input.newItem!.name),
      );
      entry.itemId = dup?.id ?? (created = newId());
    }
    await db.foods.add(entry);
    if (input.item) {
      const cur = (await db.items.get(input.item.id)) ?? input.item;
      before = cur;
      await db.items.put({
        ...cur,
        useCount: cur.useCount + 1,
        lastUsedAt: now,
        lastQuantity: input.quantity,
      });
    } else if (input.newItem) {
      const existing = (await db.items.toArray()).find((i) => i.id === entry.itemId);
      if (existing) {
        before = existing;
        await db.items.put({
          ...existing,
          kcalPerUnit: input.newItem.kcalPerUnit,
          source: input.newItem.source === 'custom' ? 'custom' : existing.source,
          useCount: existing.useCount + 1,
          lastUsedAt: now,
          lastQuantity: input.quantity,
        });
      } else {
        await db.items.add({
          id: created!,
          name: input.newItem.name,
          kcalPerUnit: input.newItem.kcalPerUnit,
          unitLabel: input.newItem.unitLabel,
          aliases: [],
          isFavorite: input.newItem.isFavorite ?? false,
          useCount: 1,
          lastUsedAt: now,
          source: input.newItem.source,
          lastQuantity: input.quantity,
        });
      }
    }
  });

  return {
    entry,
    undo: async () => {
      await db.transaction('rw', db.foods, db.items, async () => {
        await db.foods.delete(entry.id);
        if (before) await db.items.put(before);
        if (created) await db.items.delete(created);
      });
    },
  };
}

export async function logRun(km: number, at: string): Promise<Logged<RunEntry>> {
  const entry: RunEntry = { id: newId(), at, km: roundRunKm(km) };
  await db.transaction('rw', db.runs, db.resets, async () => {
    await clearUndoable();
    await db.runs.add(entry);
  });
  return { entry, undo: async () => void (await db.runs.delete(entry.id)) };
}

export async function updateFood(
  entry: FoodEntry,
  patch: { label: string; kcal: number; at: string },
): Promise<void> {
  let next: FoodEntry = { ...entry, label: patch.label, at: patch.at };
  if (patch.kcal !== entry.kcal) {
    next = { ...withEditedKcal(next, patch.kcal), isEstimate: false };
  }
  await db.foods.put(next);
}

export async function updateRun(entry: RunEntry, patch: { km: number; at: string }): Promise<void> {
  await db.runs.put({ ...entry, km: roundRunKm(patch.km), at: patch.at });
}

export async function deleteFood(entry: FoodEntry): Promise<() => Promise<void>> {
  await db.foods.delete(entry.id);
  return async () => void (await db.foods.put(entry));
}

export async function deleteRun(entry: RunEntry): Promise<() => Promise<void>> {
  await db.runs.delete(entry.id);
  return async () => void (await db.runs.put(entry));
}

export async function toggleFavorite(item: FoodItem): Promise<void> {
  await db.items.update(item.id, { isFavorite: !item.isFavorite });
}



// --- Nollställning ---

/** Ingen nollställning går att ångra efter att en ny post loggats. */
async function clearUndoable(): Promise<void> {
  await db.resets.toCollection().modify((r) => {
    if (r.undoable) r.undoable = false;
  });
}

export async function resetBalance(balanceKm: number): Promise<ResetMarker> {
  const marker: ResetMarker = {
    id: newId(),
    at: new Date().toISOString(),
    balanceBeforeKm: balanceKm,
    undoable: true,
  };
  await db.resets.add(marker);
  return marker;
}

/** Tar bort senaste markören om den fortfarande går att ångra. Returnerar true om något ångrades. */
export async function undoReset(): Promise<boolean> {
  return db.transaction('rw', db.resets, async () => {
    const all = await db.resets.toArray();
    const latest = all.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
    if (!latest?.undoable) return false;
    await db.resets.delete(latest.id);
    return true;
  });
}

/** Saldot just nu, för att spara i markören. */
export async function currentBalanceKm(): Promise<number> {
  const [foods, runs, resets] = await Promise.all([db.foods.toArray(), db.runs.toArray(), db.resets.toArray()]);
  return computeBalance({ foods, runs, resets }).balanceKm;
}

// --- Sparade saker ---

export interface ItemPatch {
  name: string;
  kcalPerUnit: number;
  unitLabel: string;
  aliases: string[];
}

/** Ändrad kcal på en inbyggd sak gör den till din egen: exakt, inte riktvärde. */
export async function updateItem(item: FoodItem, patch: ItemPatch): Promise<void> {
  const becomesOwn = item.source === 'builtin' && patch.kcalPerUnit !== item.kcalPerUnit;
  await db.items.put({ ...item, ...patch, source: becomesOwn ? 'custom' : item.source });
}

export async function deleteItem(item: FoodItem): Promise<() => Promise<void>> {
  await db.items.delete(item.id);
  return async () => void (await db.items.put(item));
}
