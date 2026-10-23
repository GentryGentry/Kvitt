import type { FoodEntry, ResetMarker, RunEntry, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  weightKg: 80,
  kcalPerKmPerKg: 1.0,
  theme: 'auto',
};

export const MIN_RUN_KM = 0.1;
export const MAX_RUN_KM = 200;
export const MIN_WEIGHT_KG = 30;
export const MAX_WEIGHT_KG = 300;

const NBSP = ' ';
const MINUS = '−';

export function kcalPerKm(s: Pick<Settings, 'weightKg' | 'kcalPerKmPerKg'>): number {
  return s.weightKg * s.kcalPerKmPerKg;
}

export function kmFromKcal(kcal: number, kcalPerKmUsed: number): number {
  return kcal / kcalPerKmUsed;
}

export function kcalFromKm(km: number, perKm: number): number {
  return km * perKm;
}

/** Löprundor lagras med två decimaler. */
export function roundRunKm(km: number): number {
  return Math.round(km * 100 + 1e-9) / 100;
}

export function makeFoodFields(
  kcal: number,
  perKm: number,
): Pick<FoodEntry, 'kcal' | 'kcalPerKmUsed' | 'kmEquivalent'> {
  return { kcal, kcalPerKmUsed: perKm, kmEquivalent: kmFromKcal(kcal, perKm) };
}

/** Redigerad kcal räknas om med postens egen frysta faktor. */
export function withEditedKcal(entry: FoodEntry, kcal: number): FoodEntry {
  return { ...entry, kcal, kmEquivalent: kmFromKcal(kcal, entry.kcalPerKmUsed) };
}

// --- Nollställning och saldo ---

export function latestReset(resets: ResetMarker[]): ResetMarker | undefined {
  let latest: ResetMarker | undefined;
  for (const r of resets) {
    if (!latest || Date.parse(r.at) > Date.parse(latest.at)) latest = r;
  }
  return latest;
}

export function isActive(at: string, resets: ResetMarker[]): boolean {
  const r = latestReset(resets);
  return !r || Date.parse(at) > Date.parse(r.at);
}

export interface BalanceData {
  foods: FoodEntry[];
  runs: RunEntry[];
  resets: ResetMarker[];
}

export interface Balance {
  balanceKm: number;
  ranKm: number;
  ateKm: number;
  count: number;
}

export type Scope = 'sinceReset' | 'all';

export function computeBalance(data: BalanceData, scope: Scope = 'sinceReset'): Balance {
  const use = (at: string) => scope === 'all' || isActive(at, data.resets);
  let ranKm = 0;
  let ateKm = 0;
  let count = 0;
  for (const r of data.runs) {
    if (use(r.at)) {
      ranKm += r.km;
      count++;
    }
  }
  for (const f of data.foods) {
    if (use(f.at)) {
      ateKm += f.kmEquivalent;
      count++;
    }
  }
  return { balanceKm: ranKm - ateKm, ranKm, ateKm, count };
}

// --- Visning ---

/** Avrundar till en decimal. Epsilon så att 0,05 blir 0,1 trots flyttal. */
export function roundTenth(n: number): number {
  const r = Math.round(Math.abs(n) * 10 + 1e-9) / 10;
  return n < 0 ? -r : r;
}

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** "3,8" (utan tecken, utan enhet). */
export function formatDecimal(abs: number, decimals = 1): string {
  const [i, d] = Math.abs(abs).toFixed(decimals).split('.');
  return d ? `${groupThousands(i)},${d}` : groupThousands(i);
}

export interface FormatKmOptions {
  sign?: boolean;
  unit?: boolean;
}

/** Ett decimal, komma, riktigt minustecken. 0,0 får aldrig något tecken. */
export function formatKm(km: number, { sign = false, unit = true }: FormatKmOptions = {}): string {
  const r = roundTenth(km);
  const num = formatDecimal(r, 1);
  let prefix = '';
  if (r < 0) prefix = MINUS;
  else if (r > 0 && sign) prefix = '+';
  return `${prefix}${num}${unit ? `${NBSP}km` : ''}`;
}

/** Sträcka som matekvivalent, alltid "ca". */
export function formatKmApprox(km: number): string {
  return `ca${NBSP}${formatKm(km)}`;
}

export function formatKcal(kcal: number, { approx = false, round = 1 } = {}): string {
  const n = Math.round(kcal / round) * round;
  return `${approx ? `≈${NBSP}` : ''}${groupThousands(String(n))}${NBSP}kcal`;
}

/** Mängd med komma, utan onödiga decimaler: 1, 1,5, 0,5. */
export function formatQty(q: number): string {
  return String(Math.round(q * 100) / 100).replace('.', ',');
}

export type Tone = 'plus' | 'minus' | 'zero';

export function balanceTone(km: number): Tone {
  const r = roundTenth(km);
  return r > 0 ? 'plus' : r < 0 ? 'minus' : 'zero';
}

export type BalanceState = 'empty' | 'deepDebt' | 'debt' | 'even' | 'credit' | 'bigCredit';

export function balanceState(km: number, count: number): BalanceState {
  if (count === 0) return 'empty';
  if (km < -10) return 'deepDebt';
  if (km <= -1) return 'debt';
  if (km < 1) return 'even';
  if (km <= 10) return 'credit';
  return 'bigCredit';
}

// --- Parsning av tal från fält ---

/** "7,5" / "7.5" -> 7.5. Returnerar undefined för tomt eller ogiltigt. */
export function parseNumber(text: string): number | undefined {
  const t = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function validateRunKm(km: number | undefined): string | undefined {
  if (km === undefined) return 'Ange antal kilometer.';
  if (km < MIN_RUN_KM || km > MAX_RUN_KM) return 'Ange mellan 0,1 och 200 km.';
  return undefined;
}

export function validateWeight(kg: number | undefined): string | undefined {
  if (kg === undefined) return 'Ange din vikt i kilo.';
  if (kg < MIN_WEIGHT_KG || kg > MAX_WEIGHT_KG) return 'Ange en vikt mellan 30 och 300 kg.';
  return undefined;
}
