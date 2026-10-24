import { DEFAULT_TARGET_HIGH_MGDL, DEFAULT_TARGET_LOW_MGDL } from '@/domain/glucose';
import type { AppData, CollectionKey, Settings } from '@/domain/types';

/** Bump when the persisted shape changes, and add a step to MIGRATIONS. */
export const SCHEMA_VERSION = 1;

export const COLLECTION_KEYS: readonly CollectionKey[] = [
  'glucose',
  'recipes',
  'meals',
  'mealPlan',
  'medications',
  'doseLogs',
  'appointments',
  'notes',
  'records',
];

export const DEFAULT_SETTINGS: Settings = {
  glucoseUnit: 'mg/dL',
  targetLowMgdl: DEFAULT_TARGET_LOW_MGDL,
  targetHighMgdl: DEFAULT_TARGET_HIGH_MGDL,
  dailyCarbGoal: null,
  remindersEnabled: false,
  showMedicationNamesInReminders: false,
  appLockEnabled: false,
  theme: 'system',
  onboarded: false,
  safetyAcknowledgedAt: null,
};

export function emptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: { displayName: '' },
    settings: { ...DEFAULT_SETTINGS },
    glucose: [],
    recipes: [],
    meals: [],
    mealPlan: [],
    medications: [],
    doseLogs: [],
    appointments: [],
    notes: [],
    records: [],
  };
}

export function containsDemoData(data: AppData): boolean {
  return COLLECTION_KEYS.some((k) => (data[k] as { demo?: boolean }[]).some((r) => r.demo));
}

export class NewerSchemaError extends Error {
  constructor(public readonly found: number) {
    super(
      `Your saved data was created by a newer version of GlycoTrack (schema ${found}). ` +
        'Update the app to open it. Your data has not been changed.',
    );
    this.name = 'NewerSchemaError';
  }
}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[n] upgrades schema n → n+1. */
const MIGRATIONS: Record<number, Migration> = {};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Turn whatever was persisted into a valid AppData, running migrations and filling any
 * missing fields with defaults. Throws NewerSchemaError rather than silently downgrading.
 */
export function migrate(raw: unknown): AppData {
  if (!isObject(raw)) throw new Error('Saved data is not an object.');
  let data: Record<string, unknown> = { ...raw };
  let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;
  if (version > SCHEMA_VERSION) throw new NewerSchemaError(version);
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (step) data = step(data);
    version++;
  }

  const base = emptyData();
  const result: AppData = {
    ...base,
    schemaVersion: SCHEMA_VERSION,
    profile: { ...base.profile, ...(isObject(data.profile) ? data.profile : {}) },
    settings: { ...base.settings, ...(isObject(data.settings) ? data.settings : {}) },
  };
  for (const key of COLLECTION_KEYS) {
    const value = data[key];
    (result[key] as unknown[]) = Array.isArray(value) ? value.filter(isObject) : [];
  }
  return result;
}
