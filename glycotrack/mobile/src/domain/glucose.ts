import { DAY, startOfDay, toDateKey } from './dates';
import type { DateKey, GlucoseContext, GlucoseReading, GlucoseUnit } from './types';

/**
 * Glucose display and descriptive statistics.
 *
 * SAFETY: everything here is descriptive (unit conversion, averages, counts relative to the
 * user's own target range). Nothing here recommends treatment, calculates insulin, or raises
 * alarms. See docs/SAFETY.md.
 */

/** mg/dL per mmol/L for glucose (molar mass 180.156 g/mol). */
export const MGDL_PER_MMOLL = 18.0156;

/** Plausible bounds for manual entry validation (a typo guard, not a clinical threshold). */
export const ENTRY_MIN_MGDL = 20;
export const ENTRY_MAX_MGDL = 600;

export const DEFAULT_TARGET_LOW_MGDL = 70;
export const DEFAULT_TARGET_HIGH_MGDL = 180;

export function mgdlToMmol(mgdl: number): number {
  return mgdl / MGDL_PER_MMOLL;
}

export function mmolToMgdl(mmol: number): number {
  return mmol * MGDL_PER_MMOLL;
}

export function toDisplayValue(mgdl: number, unit: GlucoseUnit): number {
  return unit === 'mg/dL' ? Math.round(mgdl) : Math.round(mgdlToMmol(mgdl) * 10) / 10;
}

export function formatGlucose(mgdl: number, unit: GlucoseUnit): string {
  const v = toDisplayValue(mgdl, unit);
  return unit === 'mg/dL' ? String(v) : v.toFixed(1);
}

/** Parse user input in the given unit into canonical mg/dL. Returns null if not a number. */
export function parseGlucoseInput(input: string, unit: GlucoseUnit): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  return unit === 'mg/dL' ? n : mmolToMgdl(n);
}

export type EntryValidation = { ok: true; mgdl: number } | { ok: false; message: string };

export function validateGlucoseEntry(input: string, unit: GlucoseUnit): EntryValidation {
  if (!input.trim()) return { ok: false, message: 'Enter a glucose value.' };
  const mgdl = parseGlucoseInput(input, unit);
  if (mgdl === null) return { ok: false, message: 'Use numbers only, like 112 or 6.2.' };
  if (mgdl < ENTRY_MIN_MGDL || mgdl > ENTRY_MAX_MGDL) {
    const lo = formatGlucose(ENTRY_MIN_MGDL, unit);
    const hi = formatGlucose(ENTRY_MAX_MGDL, unit);
    return { ok: false, message: `Check the value. Entries must be between ${lo} and ${hi} ${unit}.` };
  }
  return { ok: true, mgdl };
}

export type RangeStatus = 'below' | 'in' | 'above';

export function rangeStatus(mgdl: number, lowMgdl: number, highMgdl: number): RangeStatus {
  if (mgdl < lowMgdl) return 'below';
  if (mgdl > highMgdl) return 'above';
  return 'in';
}

export const RANGE_LABEL: Record<RangeStatus, string> = {
  below: 'Below range',
  in: 'In range',
  above: 'Above range',
};

export const CONTEXT_LABEL: Record<GlucoseContext, string> = {
  fasting: 'Fasting',
  before_meal: 'Before meal',
  after_meal: 'After meal',
  bedtime: 'Bedtime',
  overnight: 'Overnight',
  other: 'Other',
};

export interface GlucoseStats {
  count: number;
  averageMgdl: number | null;
  minMgdl: number | null;
  maxMgdl: number | null;
  below: number;
  inRange: number;
  above: number;
  /** Percentages 0–100, rounded so the three sum to 100 when count > 0. */
  pctBelow: number;
  pctIn: number;
  pctAbove: number;
}

export function computeStats(
  readings: readonly GlucoseReading[],
  lowMgdl: number,
  highMgdl: number,
): GlucoseStats {
  const count = readings.length;
  if (count === 0) {
    return {
      count: 0,
      averageMgdl: null,
      minMgdl: null,
      maxMgdl: null,
      below: 0,
      inRange: 0,
      above: 0,
      pctBelow: 0,
      pctIn: 0,
      pctAbove: 0,
    };
  }
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let below = 0;
  let above = 0;
  for (const r of readings) {
    sum += r.valueMgdl;
    min = Math.min(min, r.valueMgdl);
    max = Math.max(max, r.valueMgdl);
    const s = rangeStatus(r.valueMgdl, lowMgdl, highMgdl);
    if (s === 'below') below++;
    else if (s === 'above') above++;
  }
  const inRange = count - below - above;
  const [pctBelow, pctIn, pctAbove] = roundPercentages([below, inRange, above], count);
  return {
    count,
    averageMgdl: sum / count,
    minMgdl: min,
    maxMgdl: max,
    below,
    inRange,
    above,
    pctBelow,
    pctIn,
    pctAbove,
  };
}

/** Largest-remainder rounding so whole-number percentages always total 100. */
export function roundPercentages(parts: number[], total: number): number[] {
  if (total <= 0) return parts.map(() => 0);
  const raw = parts.map((p) => (p / total) * 100);
  const floored = raw.map(Math.floor);
  let remainder = 100 - floored.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floored[i]++;
    remainder--;
  }
  return floored;
}

export function sortByTimeDesc(readings: readonly GlucoseReading[]): GlucoseReading[] {
  return [...readings].sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}

export function latestReading(readings: readonly GlucoseReading[]): GlucoseReading | undefined {
  let latest: GlucoseReading | undefined;
  for (const r of readings) if (!latest || r.takenAt > latest.takenAt) latest = r;
  return latest;
}

/** Readings within the last `days` calendar days including today. */
export function readingsInLastDays(
  readings: readonly GlucoseReading[],
  days: number,
  now: Date = new Date(),
): GlucoseReading[] {
  const from = startOfDay(now).getTime() - (days - 1) * DAY;
  return readings.filter((r) => {
    const t = new Date(r.takenAt).getTime();
    return t >= from && t <= now.getTime();
  });
}

/** Readings within the trailing window of `hours` hours. */
export function readingsInLastHours(
  readings: readonly GlucoseReading[],
  hours: number,
  now: Date = new Date(),
): GlucoseReading[] {
  const from = now.getTime() - hours * 3_600_000;
  return readings.filter((r) => {
    const t = new Date(r.takenAt).getTime();
    return t >= from && t <= now.getTime();
  });
}

export function readingsOnDay(readings: readonly GlucoseReading[], day: Date): GlucoseReading[] {
  const key = toDateKey(day);
  return readings.filter((r) => toDateKey(new Date(r.takenAt)) === key);
}

export interface DayGroup<T> {
  dateKey: DateKey;
  items: T[];
}

/** Group items by local day, newest day first, items newest first. */
export function groupByDay<T>(items: readonly T[], getTime: (item: T) => string): DayGroup<T>[] {
  const map = new Map<DateKey, T[]>();
  const sorted = [...items].sort((a, b) => getTime(b).localeCompare(getTime(a)));
  for (const item of sorted) {
    const key = toDateKey(new Date(getTime(item)));
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()].map(([dateKey, list]) => ({ dateKey, items: list }));
}

export interface TargetRangeValidation {
  ok: boolean;
  message?: string;
}

/** Keeps the target range internally consistent. The values themselves are the user's choice. */
export function validateTargetRange(lowMgdl: number, highMgdl: number): TargetRangeValidation {
  if (!Number.isFinite(lowMgdl) || !Number.isFinite(highMgdl)) {
    return { ok: false, message: 'Enter both values.' };
  }
  if (lowMgdl < 40 || highMgdl > 400) {
    return { ok: false, message: 'Target range must be between 40 and 400 mg/dL (2.2–22.2 mmol/L).' };
  }
  if (highMgdl - lowMgdl < 20) {
    return { ok: false, message: 'The upper value must be at least 20 mg/dL (1.1 mmol/L) above the lower value.' };
  }
  return { ok: true };
}
