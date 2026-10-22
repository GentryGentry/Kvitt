import { formatQty, parseNumber } from './calc';
import { parseQuantity } from './parse';
import type { FoodItem } from './types';

export const MAX_KCAL = 20000;
export const MIN_QTY = 0.5;
export const MAX_QTY = 99;

export interface FoodDraftInput {
  text: string;
  kcalText: string;
  selected: { item: FoodItem; quantity: number } | null;
  saveAsCustom: boolean;
}

export interface FoodDraft {
  label: string;
  kcal: number;
  isEstimate: boolean;
  item?: FoodItem;
  quantity: number;
  newItem?: { name: string; kcalPerUnit: number; unitLabel: string; source: 'learned' | 'custom' };
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

/** Gör om fälten i matsheeten till en post. Undefined = går inte att logga än. */
export function buildFoodDraft({ text, kcalText, selected, saveAsCustom }: FoodDraftInput): FoodDraft | undefined {
  const exact = exactKcal(kcalText);

  if (selected) {
    const { item, quantity } = selected;
    return {
      label: selectedLabel(item, quantity),
      kcal: exact ?? Math.round(item.kcalPerUnit * quantity),
      isEstimate: exact === undefined && item.source === 'builtin',
      item,
      quantity,
    };
  }

  if (exact === undefined) return undefined;
  const trimmed = text.trim();
  const parsed = parseQuantity(trimmed);
  const quantity = parsed.explicit ? parsed.quantity : 1;
  const name = capitalize(parsed.rest);
  return {
    label: trimmed ? capitalize(trimmed) : 'Något',
    kcal: exact,
    isEstimate: false,
    quantity,
    newItem: name
      ? {
          name,
          kcalPerUnit: exact / quantity,
          unitLabel: parsed.explicit ? 'st' : 'portion',
          source: saveAsCustom ? 'custom' : 'learned',
        }
      : undefined,
  };
}
