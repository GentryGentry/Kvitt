export type ThemeChoice = 'auto' | 'light' | 'dark';

export interface Settings {
  weightKg: number;
  kcalPerKmPerKg: number;
  theme: ThemeChoice;
  lastExportAt?: string;
}

export interface FoodEntry {
  id: string;
  at: string;
  label: string;
  kcal: number;
  isEstimate: boolean;
  /** Fryst vid loggning: weightKg * kcalPerKmPerKg. */
  kcalPerKmUsed: number;
  /** Fryst vid loggning: kcal / kcalPerKmUsed. */
  kmEquivalent: number;
  /** Saken posten kom från, för favoritstjärna och statistik. Saknas på poster utan sparad sak. */
  itemId?: string;
}

export interface RunEntry {
  id: string;
  at: string;
  km: number;
}

export interface ResetMarker {
  id: string;
  at: string;
  balanceBeforeKm: number;
  /** Sant tills nästa post loggas. Då går nollställningen att ångra. */
  undoable?: boolean;
}

export type FoodSource = 'builtin' | 'learned' | 'custom';

export interface FoodItem {
  id: string;
  name: string;
  kcalPerUnit: number;
  unitLabel: string;
  aliases: string[];
  isFavorite: boolean;
  useCount: number;
  lastUsedAt: string;
  source: FoodSource;
  /** Senast använda mängd, föreslås när man skriver samma sak igen. */
  lastQuantity?: number;
}
