import type { FoodItem } from './types';

// --- Mängd ---

const NUMBER_WORDS: Record<string, number> = {
  en: 1, ett: 1, två: 2, tva: 2, tre: 3, fyra: 4, fem: 5, sex: 6, sju: 7,
  åtta: 8, atta: 8, nio: 9, tio: 10, elva: 11, tolv: 12,
};
const HALF = new Set(['halv', 'halva', 'halvt', 'halvan']);
const MEASURES = new Set(['cl', 'dl', 'l', 'ml', 'g', 'gram', 'kg', 'liter', 'kcal', 'cm']);
const PIECE = new Set(['st', 'styck', 'stycken']);

export interface ParsedQuantity {
  quantity: number;
  /** Fanns ett antal i texten? Annars är quantity 1. */
  explicit: boolean;
  /** Texten utan antalet, med ursprunglig skiftläge. */
  rest: string;
}

function digitValue(tok: string): number | undefined {
  let m = /^(\d+(?:[.,]\d+)?)x?$/.exec(tok);
  if (m) return Number(m[1].replace(',', '.'));
  m = /^(\d+)\/(\d+)$/.exec(tok);
  if (m && Number(m[2]) !== 0) return Number(m[1]) / Number(m[2]);
  return undefined;
}

export function parseQuantity(input: string): ParsedQuantity {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const low = tokens.map((t) => t.toLocaleLowerCase('sv'));
  const none: ParsedQuantity = { quantity: 1, explicit: false, rest: tokens.join(' ') };
  if (tokens.length === 0) return none;

  let i = 0;
  let qty: number | undefined;

  if (HALF.has(low[0])) {
    qty = 0.5;
    i = 1;
  } else if ((low[0] === 'en' || low[0] === 'ett') && HALF.has(low[1] ?? '')) {
    qty = 0.5;
    i = 2;
  } else {
    const digit = digitValue(low[0]);
    const n = digit ?? NUMBER_WORDS[low[0]];
    if (n === undefined) return none;
    if (digit !== undefined && MEASURES.has(low[1] ?? '')) return none;
    qty = n;
    i = 1;
    if (low[i] === 'x') i++;
    const frac = /^\d+\/\d+$/.test(low[i] ?? '') ? digitValue(low[i]) : undefined;
    if (digit !== undefined && /^\d+$/.test(low[0]) && frac !== undefined) {
      qty += frac;
      i++;
    } else if (low[i] === 'och') {
      if ((low[i + 1] === 'en' || low[i + 1] === 'ett') && HALF.has(low[i + 2] ?? '')) {
        qty += 0.5;
        i += 3;
      } else if (HALF.has(low[i + 1] ?? '')) {
        qty += 0.5;
        i += 2;
      }
    }
    if (PIECE.has(low[i] ?? '')) i++;
  }

  return { quantity: qty, explicit: true, rest: tokens.slice(i).join(' ') };
}

// --- Normalisering och stamning ---

const SUFFIXES = ['arna', 'erna', 'orna', 'ar', 'er', 'or', 'en', 'et', 'na', 'a', 'e', 'n'];

/** Gemener, utan accenter som inte är svenska bokstäver. Behåller å, ä, ö. */
export function normalize(text: string): string {
  return text
    .toLocaleLowerCase('sv')
    .replace(/[åäö]/g, (c) => ({ å: '\u0001', ä: '\u0002', ö: '\u0003' })[c]!)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\u0001/g, 'å')
    .replace(/\u0002/g, 'ä')
    .replace(/\u0003/g, 'ö');
}

/** Enkel svensk ändelsestamning: bullar/bulle/bullen -> bull. */
export function stem(word: string): string {
  for (const suf of SUFFIXES) {
    if (word.endsWith(suf) && word.length - suf.length >= 2) return word.slice(0, -suf.length);
  }
  return word;
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

// Ord som beskriver enhet eller är fyllnad. De hjälper om de matchar men straffas aldrig.
const OPTIONAL = new Set(([
  'st', 'styck', 'påse', 'burk', 'glas', 'bit', 'kula', 'rad', 'flaska', 'portion', 'skål',
  'näve', 'och', 'med', 'en', 'ett', 'av', 'pinne', 'strut', 'paket', 'förpackning',
] as string[]).map((w) => stem(w)));

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 0–1: hur väl en söktoken (stammad) matchar en kandidattoken (stammad). */
function tokenScore(q: string, c: string): number {
  if (q === c) return 1;
  if (q.length >= 2 && c.startsWith(q)) return 0.9;
  if (q.length >= 4 && c.length >= 4 && q.startsWith(c)) return 0.8;
  if (q.length >= 4 && c.length >= 4) {
    const d = levenshtein(q, c);
    if (d <= 1) return 0.8;
    if (d <= 2 && Math.min(q.length, c.length) >= 8) return 0.7;
  }
  return 0;
}

function candidateScore(queryTokens: string[], candidate: string): number {
  const cand = tokenize(candidate).map(stem);
  if (cand.length === 0) return 0;
  let sum = 0;
  let n = 0;
  for (const q of queryTokens) {
    let best = 0;
    for (const c of cand) best = Math.max(best, tokenScore(q, c));
    if (OPTIONAL.has(q)) {
      if (best > 0) sum += best * 0.5;
      continue;
    }
    sum += best;
    n++;
  }
  if (n === 0) return 0;
  return sum / n;
}

export interface Suggestion {
  item: FoodItem;
  quantity: number;
  explicitQuantity: boolean;
  kcal: number;
  score: number;
}

export interface SuggestOptions {
  limit?: number;
  /** Position i inbyggda listan, för stabil sortering vid lika poäng. */
  order?: (item: FoodItem) => number;
}

export function findSuggestions(
  query: string,
  items: FoodItem[],
  { limit = 5, order = () => 0 }: SuggestOptions = {},
): Suggestion[] {
  const parsed = parseQuantity(query);
  const raw = tokenize(parsed.rest).filter((t) => !/^\d+$/.test(t));
  if (raw.length === 0) return [];
  const tokens = raw.map(stem);
  const required = tokens.filter((t) => !OPTIONAL.has(t));
  if (parsed.rest.replace(/\s/g, '').length < 2) return [];
  const threshold = required.length <= 1 ? 0.7 : 0.6;

  const scored: { s: Suggestion; rank: number; ord: number }[] = [];
  for (const item of items) {
    let base = 0;
    for (const cand of [item.name, ...item.aliases]) {
      base = Math.max(base, candidateScore(tokens, cand));
    }
    if (base < threshold) continue;
    const boost =
      (item.isFavorite ? 0.15 : 0) +
      Math.min(0.1, Math.log2(1 + item.useCount) * 0.03) +
      (item.source === 'builtin' ? 0 : 0.05);
    const quantity = parsed.explicit ? parsed.quantity : item.lastQuantity ?? 1;
    scored.push({
      s: {
        item,
        quantity,
        explicitQuantity: parsed.explicit,
        kcal: item.kcalPerUnit * quantity,
        score: base,
      },
      rank: base + boost,
      ord: order(item),
    });
  }
  scored.sort((a, b) => b.rank - a.rank || a.ord - b.ord);
  return scored.slice(0, limit).map((x) => x.s);
}
