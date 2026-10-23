import Dexie, { type Table } from 'dexie';
import { BUILTIN_ITEMS } from './foods';
import type { FoodEntry, FoodItem, ResetMarker, RunEntry, Settings } from './types';

export type SettingsRow = Settings & { id: 'main' };

/** Vilka inbyggda id:n som redan lagts in, så att raderade inte återuppstår. */
export interface MetaRow {
  key: 'seeded';
  ids: string[];
}

class KvittDB extends Dexie {
  settings!: Table<SettingsRow, string>;
  foods!: Table<FoodEntry, string>;
  runs!: Table<RunEntry, string>;
  resets!: Table<ResetMarker, string>;
  items!: Table<FoodItem, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('kvitt');
    this.version(1).stores({
      settings: 'id',
      foods: 'id, at',
      runs: 'id, at',
      resets: 'id, at',
      items: 'id, lastUsedAt, isFavorite, source',
    });
    this.version(2).stores({
      settings: 'id',
      foods: 'id, at',
      runs: 'id, at',
      resets: 'id, at',
      items: 'id, lastUsedAt, isFavorite, source',
      meta: 'key',
    });
  }
}

export const db = new KvittDB();

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Lägger till inbyggda poster som aldrig lagts in förut. Rör aldrig sådant användaren
 * ändrat eller raderat: det som redan finns i `seeded` läggs inte till igen.
 */
export async function seedBuiltins(): Promise<void> {
  await db.transaction('rw', db.items, db.meta, async () => {
    const meta = await db.meta.get('seeded');
    const seeded = new Set(meta?.ids ?? []);
    const existing = new Set(await db.items.toCollection().primaryKeys());
    // Databas från före `meta`: det som redan finns räknas som inlagt.
    if (!meta) for (const i of BUILTIN_ITEMS) if (existing.has(i.id)) seeded.add(i.id);
    const missing = BUILTIN_ITEMS.filter((i) => !seeded.has(i.id) && !existing.has(i.id));
    if (missing.length) await db.items.bulkAdd(missing);
    for (const i of BUILTIN_ITEMS) seeded.add(i.id);
    await db.meta.put({ key: 'seeded', ids: [...seeded] });
  });
}

export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    // Inget att göra. Exporten är skyddet.
  }
}
