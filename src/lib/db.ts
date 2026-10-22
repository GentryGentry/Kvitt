import Dexie, { type Table } from 'dexie';
import { BUILTIN_ITEMS } from './foods';
import type { FoodEntry, FoodItem, ResetMarker, RunEntry, Settings } from './types';

export type SettingsRow = Settings & { id: 'main' };

class KvittDB extends Dexie {
  settings!: Table<SettingsRow, string>;
  foods!: Table<FoodEntry, string>;
  runs!: Table<RunEntry, string>;
  resets!: Table<ResetMarker, string>;
  items!: Table<FoodItem, string>;

  constructor() {
    super('kvitt');
    this.version(1).stores({
      settings: 'id',
      foods: 'id, at',
      runs: 'id, at',
      resets: 'id, at',
      items: 'id, lastUsedAt, isFavorite, source',
    });
  }
}

export const db = new KvittDB();

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Lägger till inbyggda poster som saknas. Rör aldrig sådant användaren ändrat. */
export async function seedBuiltins(): Promise<void> {
  const have = new Set(await db.items.where('source').equals('builtin').primaryKeys());
  const missing = BUILTIN_ITEMS.filter((i) => !have.has(i.id));
  if (missing.length) await db.items.bulkAdd(missing);
}

export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    // Inget att göra. Exporten är skyddet.
  }
}
