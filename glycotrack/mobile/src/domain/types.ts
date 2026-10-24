/**
 * Core GlycoTrack data model.
 *
 * Glucose values are always stored canonically in mg/dL and converted for display.
 * Every record can carry `demo: true`, which marks clearly fictional sample data.
 */

export type ISODateTime = string; // e.g. 2026-10-24T08:30:00.000Z
export type DateKey = string; // local calendar day, YYYY-MM-DD
export type TimeOfDay = string; // local wall-clock time, HH:mm (24h)

export interface BaseRecord {
  id: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  /** True for fictional sample data loaded for demonstration. */
  demo?: boolean;
}

export type GlucoseUnit = 'mg/dL' | 'mmol/L';

export const GLUCOSE_CONTEXTS = [
  'fasting',
  'before_meal',
  'after_meal',
  'bedtime',
  'overnight',
  'other',
] as const;
export type GlucoseContext = (typeof GLUCOSE_CONTEXTS)[number];

/** Where a reading came from. Only manual entry exists today; CGM sources come later. */
export type GlucoseSource = 'manual';

export interface GlucoseReading extends BaseRecord {
  /** Canonical value in mg/dL. */
  valueMgdl: number;
  takenAt: ISODateTime;
  context: GlucoseContext;
  source: GlucoseSource;
  note?: string;
}

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export interface Recipe extends BaseRecord {
  name: string;
  description: string;
  servings: number;
  /** Grams of carbohydrate per serving, as entered by the user. */
  carbsPerServing: number;
  prepMinutes: number;
  tags: string[];
  ingredients: string[];
  steps: string[];
  favorite: boolean;
}

export interface MealLog extends BaseRecord {
  eatenAt: ISODateTime;
  slot: MealSlot;
  title: string;
  /** Total grams of carbohydrate eaten, as entered by the user. */
  carbs: number;
  recipeId?: string;
  servings?: number;
  note?: string;
}

export interface MealPlanEntry extends BaseRecord {
  date: DateKey;
  slot: MealSlot;
  recipeId: string;
  servings: number;
}

export const MEDICATION_FORMS = [
  'tablet',
  'capsule',
  'liquid',
  'injection',
  'inhaler',
  'patch',
  'other',
] as const;
export type MedicationForm = (typeof MEDICATION_FORMS)[number];

export interface Medication extends BaseRecord {
  name: string;
  /** Strength exactly as written on the prescription label, e.g. "500 mg". Never calculated. */
  strength: string;
  form: MedicationForm;
  /** Instructions as given by the prescriber, copied by the user. */
  instructions: string;
  /** Scheduled times of day for reminders and the daily checklist. */
  times: TimeOfDay[];
  remindersOn: boolean;
  active: boolean;
  prescriber?: string;
  refillOn?: DateKey;
}

export type DoseStatus = 'taken' | 'skipped';

export interface DoseLog extends BaseRecord {
  medicationId: string;
  date: DateKey;
  time: TimeOfDay;
  status: DoseStatus;
}

export interface Appointment extends BaseRecord {
  title: string;
  provider: string;
  specialty: string;
  location: string;
  startsAt: ISODateTime;
  durationMinutes: number;
  /** Questions to ask, things to bring, prep notes. */
  notes: string;
}

export interface MedicalNote extends BaseRecord {
  title: string;
  body: string;
  tags: string[];
}

export interface HealthRecord extends BaseRecord {
  /** e.g. "A1C", "Lipid panel – LDL" */
  name: string;
  /** Kept as text so results are stored exactly as reported. */
  value: string;
  unit: string;
  recordedOn: DateKey;
  notes: string;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  glucoseUnit: GlucoseUnit;
  /** Personal target range in mg/dL, set by the user with their care team. */
  targetLowMgdl: number;
  targetHighMgdl: number;
  /** Optional personal daily carbohydrate goal in grams. */
  dailyCarbGoal: number | null;
  remindersEnabled: boolean;
  /** When false (default), reminder notifications never name the medication. */
  showMedicationNamesInReminders: boolean;
  appLockEnabled: boolean;
  theme: ThemePreference;
  onboarded: boolean;
  safetyAcknowledgedAt: ISODateTime | null;
}

export interface Profile {
  displayName: string;
}

export interface AppData {
  schemaVersion: number;
  profile: Profile;
  settings: Settings;
  glucose: GlucoseReading[];
  recipes: Recipe[];
  meals: MealLog[];
  mealPlan: MealPlanEntry[];
  medications: Medication[];
  doseLogs: DoseLog[];
  appointments: Appointment[];
  notes: MedicalNote[];
  records: HealthRecord[];
}

/** Keys of AppData that hold record collections. */
export type CollectionKey = {
  [K in keyof AppData]: AppData[K] extends BaseRecord[] ? K : never;
}[keyof AppData];

export type RecordOf<K extends CollectionKey> = AppData[K][number];
