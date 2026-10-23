import { MAX_WEIGHT_KG, MIN_WEIGHT_KG } from './calc';
import { db } from './db';
import type { FoodEntry, FoodItem, ResetMarker, RunEntry, Settings } from './types';

export const BACKUP_VERSION = 1;
const MAX_ROWS = 500_000;

export interface Backup {
  app: 'kvitt';
  version: number;
  exportedAt: string;
  settings: Settings;
  foods: FoodEntry[];
  runs: RunEntry[];
  resets: ResetMarker[];
  items: FoodItem[];
  /** Inbyggda id:n som redan lagts in, så att raderade inte återuppstår efter import. */
  seeded: string[];
}

export interface BackupSummary {
  entries: number;
  items: number;
}

export function summarize(b: Backup): BackupSummary {
  return { entries: b.foods.length + b.runs.length, items: b.items.length };
}

// --- Validering (ren, utan databas) ---

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown): v is string => typeof v === 'string';
const iso = (v: unknown): v is string => str(v) && Number.isFinite(Date.parse(v));
const uniqueIds = (rows: { id: string }[]) => new Set(rows.map((r) => r.id)).size === rows.length;

function validSettings(s: unknown): s is Settings {
  return (
    isRec(s) &&
    num(s.weightKg) &&
    s.weightKg >= MIN_WEIGHT_KG &&
    s.weightKg <= MAX_WEIGHT_KG &&
    num(s.kcalPerKmPerKg) &&
    s.kcalPerKmPerKg >= 0.8 &&
    s.kcalPerKmPerKg <= 1.2 &&
    (s.theme === 'auto' || s.theme === 'light' || s.theme === 'dark') &&
    (s.lastExportAt === undefined || iso(s.lastExportAt))
  );
}

const validFood = (f: unknown): f is FoodEntry =>
  isRec(f) &&
  str(f.id) &&
  iso(f.at) &&
  str(f.label) &&
  num(f.kcal) &&
  f.kcal > 0 &&
  typeof f.isEstimate === 'boolean' &&
  num(f.kcalPerKmUsed) &&
  f.kcalPerKmUsed > 0 &&
  num(f.kmEquivalent) &&
  f.kmEquivalent >= 0 &&
  (f.itemId === undefined || str(f.itemId));

const validRun = (r: unknown): r is RunEntry =>
  isRec(r) && str(r.id) && iso(r.at) && num(r.km) && r.km > 0 && r.km <= 1000;

const validReset = (r: unknown): r is ResetMarker =>
  isRec(r) &&
  str(r.id) &&
  iso(r.at) &&
  num(r.balanceBeforeKm) &&
  (r.undoable === undefined || typeof r.undoable === 'boolean');

const validItem = (i: unknown): i is FoodItem =>
  isRec(i) &&
  str(i.id) &&
  str(i.name) &&
  i.name.trim() !== '' &&
  num(i.kcalPerUnit) &&
  i.kcalPerUnit > 0 &&
  str(i.unitLabel) &&
  Array.isArray(i.aliases) &&
  i.aliases.every(str) &&
  typeof i.isFavorite === 'boolean' &&
  num(i.useCount) &&
  i.useCount >= 0 &&
  str(i.lastUsedAt) &&
  (i.source === 'builtin' || i.source === 'learned' || i.source === 'custom') &&
  (i.lastQuantity === undefined || num(i.lastQuantity));

function table<T extends { id: string }>(v: unknown, check: (x: unknown) => x is T): T[] | undefined {
  if (!Array.isArray(v) || v.length > MAX_ROWS || !v.every(check)) return undefined;
  return uniqueIds(v) ? v : undefined;
}

/** Läser en exportfil. Allt eller inget: en enda ogiltig rad avvisar hela filen. */
export function parseBackup(text: string): Backup | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!isRec(raw) || raw.app !== 'kvitt' || raw.version !== BACKUP_VERSION || !iso(raw.exportedAt)) return undefined;
  if (!validSettings(raw.settings)) return undefined;
  const foods = table(raw.foods, validFood);
  const runs = table(raw.runs, validRun);
  const resets = table(raw.resets, validReset);
  const items = table(raw.items, validItem);
  if (!foods || !runs || !resets || !items) return undefined;
  if (!Array.isArray(raw.seeded) || !raw.seeded.every(str)) return undefined;
  return {
    app: 'kvitt',
    version: BACKUP_VERSION,
    exportedAt: raw.exportedAt,
    settings: raw.settings,
    foods,
    runs,
    resets,
    items,
    seeded: raw.seeded,
  };
}

export function serializeBackup(b: Backup): string {
  return JSON.stringify(b, null, 1);
}

export function backupFileName(at: string | Date = new Date()): string {
  const d = new Date(at);
  const p = (n: number) => String(n).padStart(2, '0');
  return `kvitt-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

// --- Databas ---

/** `forExport` sätter lastExportAt i filen. Ett ögonblicksavtryck för ångra rör inte den. */
export async function readBackup(
  exportedAt: string = new Date().toISOString(),
  forExport = true,
): Promise<Backup | undefined> {
  const [row, foods, runs, resets, items, meta] = await Promise.all([
    db.settings.get('main'),
    db.foods.toArray(),
    db.runs.toArray(),
    db.resets.toArray(),
    db.items.toArray(),
    db.meta.get('seeded'),
  ]);
  if (!row) return undefined;
  const { id: _id, ...settings } = row;
  void _id;
  return {
    app: 'kvitt',
    version: BACKUP_VERSION,
    exportedAt,
    settings: forExport ? { ...settings, lastExportAt: exportedAt } : settings,
    foods,
    runs,
    resets,
    items,
    seeded: meta?.ids ?? [],
  };
}

/** Ersätter allt i en enda transaktion. Går något fel återställs databasen av Dexie. */
export async function replaceAll(b: Backup): Promise<void> {
  await db.transaction('rw', [db.settings, db.foods, db.runs, db.resets, db.items, db.meta], async () => {
    await Promise.all([db.settings.clear(), db.foods.clear(), db.runs.clear(), db.resets.clear(), db.items.clear(), db.meta.clear()]);
    await db.settings.put({ ...b.settings, id: 'main' });
    await db.foods.bulkAdd(b.foods);
    await db.runs.bulkAdd(b.runs);
    await db.resets.bulkAdd(b.resets);
    await db.items.bulkAdd(b.items);
    await db.meta.put({ key: 'seeded', ids: b.seeded });
  });
}

/** Delar eller laddar ner filen. Returnerar true om användaren fullföljde. */
export async function deliverBackup(b: Backup): Promise<boolean> {
  const name = backupFileName(b.exportedAt);
  const file = new File([serializeBackup(b)], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false;
      // Delning gick inte: faller tillbaka på nedladdning.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}
