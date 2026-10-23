import { formatQty, parseNumber } from './calc';
import { parseQuantity } from './parse';
import type { FoodItem } from './types';

export const MAX_KCAL = 5000;
export const KCAL_STEP = 50;
export const KCAL_ERROR = 'Ange mellan 1 och 5 000 kcal.';

export interface PickedFood {
  item: FoodItem;
  quantity: number;
  /** kcal som valet gav, för att se om användaren ändrat värdet efteråt. */
  baseKcal: number;
}

export interface FoodFormState {
  name: string;
  kcalText: string;
  picked: PickedFood | null;
  /** Stjärnan satt på en ny sak som ännu inte finns sparad. */
  wantFavorite: boolean;
}

export interface FoodDraft {
  label: string;
  kcal: number;
  isEstimate: boolean;
  item?: FoodItem;
  quantity: number;
  newItem?: { name: string; kcalPerUnit: number; unitLabel: string; source: 'custom'; isFavorite: boolean };
}

export function capitalize(text: string): string {
  const t = text.trim();
  return t ? t.charAt(0).toLocaleUpperCase('sv') + t.slice(1) : t;
}

export function exactKcal(kcalText: string): number | undefined {
  const n = parseNumber(kcalText);
  if (n === undefined || n < 1 || n > MAX_KCAL) return undefined;
  return Math.round(n);
}

export function selectedLabel(item: FoodItem, quantity: number): string {
  return quantity === 1 ? item.name : `${formatQty(quantity)} × ${item.name}`;
}

/** kcal för en vald sak: kcal per enhet gånger antal. */
export function pickedKcal(item: FoodItem, quantity: number): number {
  return Math.round(item.kcalPerUnit * quantity);
}

/** Gör om formuläret till en post. Undefined = går inte att logga än. */
export function buildFoodDraft({ name, kcalText, picked, wantFavorite }: FoodFormState): FoodDraft | undefined {
  const kcal = exactKcal(kcalText);
  if (kcal === undefined) return undefined;

  if (picked) {
    return {
      label: selectedLabel(picked.item, picked.quantity),
      kcal,
      // "ca" bara så länge värdet är det inbyggda riktvärdet, oredigerat.
      isEstimate: picked.item.source === 'builtin' && kcal === picked.baseKcal,
      item: picked.item,
      quantity: picked.quantity,
    };
  }

  const trimmed = name.trim();
  const parsed = parseQuantity(trimmed);
  const quantity = parsed.explicit ? parsed.quantity : 1;
  const itemName = capitalize(parsed.rest);
  return {
    label: trimmed ? capitalize(trimmed) : 'Något',
    kcal,
    isEstimate: false,
    quantity,
    newItem: itemName
      ? {
          name: itemName,
          kcalPerUnit: kcal / quantity,
          unitLabel: parsed.explicit ? 'st' : 'portion',
          source: 'custom',
          isFavorite: wantFavorite,
        }
      : undefined,
  };
}

export const MIN_QTY = 0.5;
export const MAX_QTY = 99;

/** Antal upp eller ner: halva steg under 1 (0,5 → 1 → 2), annars hela. */
export function stepQuantity(quantity: number, dir: 1 | -1): number {
  const step = dir === 1 ? (quantity < 1 ? 0.5 : 1) : quantity <= 1 ? 0.5 : 1;
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.round((quantity + dir * step) * 100) / 100));
}

/**
 * Nytt kcal när antalet ändras. Oredigerat värde räknas om från sakens kcal per enhet.
 * Har du själv ändrat kcal skalas ditt värde med antalet, så att din justering behålls per enhet.
 */
export function rescaleKcal(picked: PickedFood, kcalText: string, nextQuantity: number): { kcal: number; baseKcal: number } {
  const baseKcal = pickedKcal(picked.item, nextQuantity);
  const current = exactKcal(kcalText);
  const edited = current !== undefined && current !== picked.baseKcal;
  const kcal = edited ? Math.round((current / picked.quantity) * nextQuantity) : baseKcal;
  return { kcal: Math.min(MAX_KCAL, Math.max(1, kcal)), baseKcal };
}
