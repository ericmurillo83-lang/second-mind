import { newId } from '@/domain/ids';
import type {
  AppData,
  BaseRecord,
  CollectionKey,
  DateKey,
  DoseStatus,
  Profile,
  RecordOf,
  Settings,
  TimeOfDay,
} from '@/domain/types';

import { COLLECTION_KEYS, containsDemoData, emptyData, migrate, NewerSchemaError } from './schema';
import { createDemoData } from './seed';
import { BACKUP_KEY_PREFIX, DATA_KEY, type StorageAdapter } from './storage';

export type StoreStatus = 'loading' | 'ready' | 'error';

export interface StoreState {
  status: StoreStatus;
  data: AppData;
  error?: { message: string; canReset: boolean };
}

/** Fields the store fills in; callers pass everything else (and optionally an id to update). */
export type RecordInput<K extends CollectionKey> = Omit<RecordOf<K>, keyof BaseRecord> & {
  id?: string;
  demo?: boolean;
};

const ID_PREFIX: Record<CollectionKey, string> = {
  glucose: 'glu',
  recipes: 'rec',
  meals: 'meal',
  mealPlan: 'plan',
  medications: 'med',
  doseLogs: 'dose',
  appointments: 'appt',
  notes: 'note',
  records: 'hr',
};

const SAVE_DEBOUNCE_MS = 200;

/**
 * Local-first app store: an immutable AppData snapshot with subscribe/notify, persisted
 * (debounced) through a StorageAdapter. Collections keep stable references unless changed,
 * so React selectors can return slices directly.
 */
export class AppStore {
  private state: StoreState = { status: 'loading', data: emptyData() };
  private listeners = new Set<() => void>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSave: Promise<void> = Promise.resolve();
  private rawOnError: string | null = null;

  constructor(
    private readonly storage: StorageAdapter,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  getState = (): StoreState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setState(next: StoreState) {
    this.state = next;
    this.listeners.forEach((l) => l());
  }

  async hydrate(): Promise<void> {
    let raw: string | null;
    try {
      raw = await this.storage.getItem(DATA_KEY);
    } catch {
      this.setState({
        ...this.state,
        status: 'error',
        error: { message: 'GlycoTrack could not read its storage on this device.', canReset: false },
      });
      return;
    }
    if (raw === null) {
      this.setState({ status: 'ready', data: emptyData() });
      return;
    }
    try {
      this.setState({ status: 'ready', data: migrate(JSON.parse(raw)) });
    } catch (e) {
      this.rawOnError = raw;
      const newer = e instanceof NewerSchemaError;
      this.setState({
        ...this.state,
        status: 'error',
        error: {
          message: newer
            ? e.message
            : 'Your saved data could not be read. You can start fresh; a backup copy of the unreadable data will be kept on this device.',
          canReset: !newer,
        },
      });
    }
  }

  /** Recovery path for unreadable data: keep a backup copy, then start empty. */
  async resetAfterError(): Promise<void> {
    if (this.rawOnError !== null) {
      await this.storage.setItem(`${BACKUP_KEY_PREFIX}${this.clock().getTime()}`, this.rawOnError);
      this.rawOnError = null;
    }
    this.setState({ status: 'ready', data: emptyData() });
    await this.persistNow();
  }

  private update(mutate: (data: AppData) => AppData) {
    if (this.state.status !== 'ready') return;
    this.setState({ ...this.state, data: mutate(this.state.data) });
    this.scheduleSave();
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.persistNow();
    }, SAVE_DEBOUNCE_MS);
  }

  private persistNow(): Promise<void> {
    const snapshot = JSON.stringify(this.state.data);
    this.pendingSave = this.pendingSave
      .catch(() => undefined)
      .then(() => this.storage.setItem(DATA_KEY, snapshot));
    return this.pendingSave;
  }

  /** Write any pending changes immediately (used before export, on background, and in tests). */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
      await this.persistNow();
    }
    await this.pendingSave;
  }

  // ---- Generic record CRUD ----

  upsert<K extends CollectionKey>(key: K, input: RecordInput<K>): RecordOf<K> {
    const now = this.clock().toISOString();
    const list = this.state.data[key] as RecordOf<K>[];
    const existing = input.id ? list.find((r) => r.id === input.id) : undefined;
    const record = {
      ...existing,
      ...input,
      id: existing?.id ?? input.id ?? newId(ID_PREFIX[key]),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } as RecordOf<K>;
    this.update((data) => ({
      ...data,
      [key]: existing
        ? list.map((r) => (r.id === record.id ? record : r))
        : [...list, record],
    }));
    return record;
  }

  /** Update some fields of an existing record. No-op if the record doesn't exist. */
  patch<K extends CollectionKey>(key: K, id: string, changes: Partial<RecordInput<K>>): void {
    const existing = (this.state.data[key] as RecordOf<K>[]).find((r) => r.id === id);
    if (!existing) return;
    this.upsert(key, { ...existing, ...changes, id } as RecordInput<K>);
  }

  remove<K extends CollectionKey>(key: K, id: string): void {
    this.update((data) => {
      const next: AppData = {
        ...data,
        [key]: (data[key] as BaseRecord[]).filter((r) => r.id !== id),
      };
      // Keep references consistent when parents are deleted.
      if (key === 'recipes') {
        next.mealPlan = data.mealPlan.filter((p) => p.recipeId !== id);
        if (data.meals.some((m) => m.recipeId === id)) {
          next.meals = data.meals.map((m) => (m.recipeId === id ? { ...m, recipeId: undefined } : m));
        }
      }
      if (key === 'medications') {
        next.doseLogs = data.doseLogs.filter((l) => l.medicationId !== id);
      }
      return next;
    });
  }

  // ---- Medication doses ----

  setDoseStatus(medicationId: string, date: DateKey, time: TimeOfDay, status: DoseStatus | null) {
    const existing = this.state.data.doseLogs.find(
      (l) => l.medicationId === medicationId && l.date === date && l.time === time,
    );
    if (status === null) {
      if (existing) this.remove('doseLogs', existing.id);
      return;
    }
    const demo = this.state.data.medications.find((m) => m.id === medicationId)?.demo;
    this.upsert('doseLogs', { id: existing?.id, medicationId, date, time, status, demo });
  }

  // ---- Settings & profile ----

  updateSettings(patch: Partial<Settings>) {
    this.update((data) => ({ ...data, settings: { ...data.settings, ...patch } }));
  }

  updateProfile(patch: Partial<Profile>) {
    this.update((data) => ({ ...data, profile: { ...data.profile, ...patch } }));
  }

  completeOnboarding(options: { displayName: string; withDemoData: boolean }) {
    const now = this.clock().toISOString();
    this.update((data) => ({
      ...data,
      profile: { ...data.profile, displayName: options.displayName.trim() },
      settings: { ...data.settings, onboarded: true, safetyAcknowledgedAt: now },
    }));
    if (options.withDemoData) this.loadDemoData();
  }

  // ---- Sample data ----

  hasDemoData(): boolean {
    return containsDemoData(this.state.data);
  }

  /** Replace any existing sample records with a fresh set generated relative to today. */
  loadDemoData() {
    const demo = createDemoData(this.clock());
    this.update((data) => {
      const next = { ...data };
      for (const key of COLLECTION_KEYS) {
        const kept = (data[key] as BaseRecord[]).filter((r) => !r.demo);
        (next[key] as BaseRecord[]) = [...kept, ...(demo[key] as BaseRecord[])];
      }
      return next;
    });
  }

  removeDemoData() {
    this.update((data) => {
      const next = { ...data };
      for (const key of COLLECTION_KEYS) {
        (next[key] as BaseRecord[]) = (data[key] as BaseRecord[]).filter((r) => !r.demo);
      }
      return next;
    });
  }

  /** Erase everything, including settings, and return to first-run onboarding. */
  async deleteAllData(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.pendingSave.catch(() => undefined);
    await this.storage.removeItem(DATA_KEY);
    this.setState({ status: 'ready', data: emptyData() });
  }

  exportJson(): string {
    return JSON.stringify(
      { exportedAt: this.clock().toISOString(), app: 'GlycoTrack', data: this.state.data },
      null,
      2,
    );
  }
}
