import { emptyData, migrate, NewerSchemaError, SCHEMA_VERSION } from './schema';
import { AppStore } from './store';
import { BACKUP_KEY_PREFIX, createMemoryAdapter, DATA_KEY } from './storage';

const fixedNow = new Date(2026, 9, 24, 12, 0);
const makeStore = (initial: Record<string, string> = {}) => {
  const storage = createMemoryAdapter(initial);
  const store = new AppStore(storage, () => fixedNow);
  return { storage, store };
};
const glucoseInput = { valueMgdl: 110, takenAt: fixedNow.toISOString(), context: 'fasting' as const, source: 'manual' as const };

describe('hydrate', () => {
  it('starts empty and ready when nothing is stored', async () => {
    const { store } = makeStore();
    await store.hydrate();
    expect(store.getState().status).toBe('ready');
    expect(store.getState().data.settings.onboarded).toBe(false);
  });

  it('loads and migrates saved data, filling missing fields with defaults', async () => {
    const saved = { schemaVersion: 1, settings: { glucoseUnit: 'mmol/L' }, glucose: [{ id: 'g1' }] };
    const { store } = makeStore({ [DATA_KEY]: JSON.stringify(saved) });
    await store.hydrate();
    const data = store.getState().data;
    expect(data.settings.glucoseUnit).toBe('mmol/L');
    expect(data.settings.targetLowMgdl).toBe(70);
    expect(data.glucose).toHaveLength(1);
    expect(data.meals).toEqual([]);
  });

  it('refuses data from a newer schema without touching it', async () => {
    const raw = JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1 });
    const { store, storage } = makeStore({ [DATA_KEY]: raw });
    await store.hydrate();
    expect(store.getState().status).toBe('error');
    expect(store.getState().error?.canReset).toBe(false);
    expect(await storage.getItem(DATA_KEY)).toBe(raw);
  });

  it('backs up unreadable data before resetting', async () => {
    const { store, storage } = makeStore({ [DATA_KEY]: '{not json' });
    await store.hydrate();
    expect(store.getState().status).toBe('error');
    expect(store.getState().error?.canReset).toBe(true);
    await store.resetAfterError();
    expect(store.getState().status).toBe('ready');
    const keys = Object.keys(storage.dump());
    const backup = keys.find((k) => k.startsWith(BACKUP_KEY_PREFIX));
    expect(backup).toBeDefined();
    expect(storage.dump()[backup!]).toBe('{not json');
  });
});

describe('records', () => {
  it('creates, updates and persists records', async () => {
    const { store, storage } = makeStore();
    await store.hydrate();
    const created = store.upsert('glucose', glucoseInput);
    expect(created.id).toMatch(/^glu_/);
    expect(created.createdAt).toBe(fixedNow.toISOString());

    store.upsert('glucose', { ...glucoseInput, id: created.id, valueMgdl: 120 });
    expect(store.getState().data.glucose).toHaveLength(1);
    expect(store.getState().data.glucose[0].valueMgdl).toBe(120);

    await store.flush();
    const persisted = JSON.parse((await storage.getItem(DATA_KEY))!);
    expect(persisted.glucose[0].valueMgdl).toBe(120);
    expect(persisted.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('patches only the given fields', async () => {
    const { store } = makeStore();
    await store.hydrate();
    const r = store.upsert('recipes', {
      name: 'Soup',
      description: '',
      servings: 2,
      carbsPerServing: 20,
      prepMinutes: 10,
      tags: [],
      ingredients: [],
      steps: [],
      favorite: false,
    });
    store.patch('recipes', r.id, { favorite: true });
    expect(store.getState().data.recipes[0]).toMatchObject({ name: 'Soup', favorite: true });
  });

  it('keeps unchanged collections referentially stable', async () => {
    const { store } = makeStore();
    await store.hydrate();
    const mealsBefore = store.getState().data.meals;
    store.upsert('glucose', glucoseInput);
    expect(store.getState().data.meals).toBe(mealsBefore);
  });

  it('cascades recipe deletes to the plan and unlinks logged meals', async () => {
    const { store } = makeStore();
    await store.hydrate();
    const r = store.upsert('recipes', {
      name: 'Soup',
      description: '',
      servings: 1,
      carbsPerServing: 20,
      prepMinutes: 5,
      tags: [],
      ingredients: [],
      steps: [],
      favorite: false,
    });
    store.upsert('mealPlan', { date: '2026-10-24', slot: 'lunch', recipeId: r.id, servings: 1 });
    store.upsert('meals', { eatenAt: fixedNow.toISOString(), slot: 'lunch', title: 'Soup', carbs: 20, recipeId: r.id });
    store.remove('recipes', r.id);
    const data = store.getState().data;
    expect(data.mealPlan).toHaveLength(0);
    expect(data.meals).toHaveLength(1);
    expect(data.meals[0].recipeId).toBeUndefined();
  });

  it('removes dose history with a deleted medication', async () => {
    const { store } = makeStore();
    await store.hydrate();
    const m = store.upsert('medications', {
      name: 'Test',
      strength: '1 mg',
      form: 'tablet',
      instructions: '',
      times: ['08:00'],
      remindersOn: false,
      active: true,
    });
    store.setDoseStatus(m.id, '2026-10-24', '08:00', 'taken');
    expect(store.getState().data.doseLogs).toHaveLength(1);
    store.remove('medications', m.id);
    expect(store.getState().data.doseLogs).toHaveLength(0);
  });

  it('toggles dose status and clears it on undo', async () => {
    const { store } = makeStore();
    await store.hydrate();
    store.setDoseStatus('m1', '2026-10-24', '08:00', 'taken');
    store.setDoseStatus('m1', '2026-10-24', '08:00', 'skipped');
    expect(store.getState().data.doseLogs).toHaveLength(1);
    expect(store.getState().data.doseLogs[0].status).toBe('skipped');
    store.setDoseStatus('m1', '2026-10-24', '08:00', null);
    expect(store.getState().data.doseLogs).toHaveLength(0);
  });

  it('notifies subscribers on change', async () => {
    const { store } = makeStore();
    await store.hydrate();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    store.updateSettings({ glucoseUnit: 'mmol/L' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.updateSettings({ glucoseUnit: 'mg/dL' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('onboarding, sample data and deletion', () => {
  it('completes onboarding with sample data, then removes only sample records', async () => {
    const { store } = makeStore();
    await store.hydrate();
    store.completeOnboarding({ displayName: '  Sam ', withDemoData: true });
    const data = store.getState().data;
    expect(data.settings.onboarded).toBe(true);
    expect(data.settings.safetyAcknowledgedAt).toBe(fixedNow.toISOString());
    expect(data.profile.displayName).toBe('Sam');
    expect(store.hasDemoData()).toBe(true);
    expect(data.glucose.length).toBeGreaterThan(50);

    store.upsert('glucose', glucoseInput);
    store.removeDemoData();
    expect(store.hasDemoData()).toBe(false);
    expect(store.getState().data.glucose).toHaveLength(1);
  });

  it('reloading sample data replaces it instead of duplicating', async () => {
    const { store } = makeStore();
    await store.hydrate();
    store.loadDemoData();
    const count = store.getState().data.glucose.length;
    store.loadDemoData();
    expect(store.getState().data.glucose.length).toBe(count);
  });

  it('deletes everything and returns to onboarding', async () => {
    const { store, storage } = makeStore();
    await store.hydrate();
    store.completeOnboarding({ displayName: 'Sam', withDemoData: true });
    await store.flush();
    await store.deleteAllData();
    expect(await storage.getItem(DATA_KEY)).toBeNull();
    expect(store.getState().data).toEqual(emptyData());
  });

  it('exports all data as JSON', async () => {
    const { store } = makeStore();
    await store.hydrate();
    store.upsert('glucose', glucoseInput);
    const exported = JSON.parse(store.exportJson());
    expect(exported.app).toBe('GlycoTrack');
    expect(exported.data.glucose).toHaveLength(1);
  });
});

describe('migrate', () => {
  it('rejects non-objects', () => {
    expect(() => migrate(null)).toThrow();
    expect(() => migrate([])).toThrow();
  });
  it('drops malformed collection entries', () => {
    const data = migrate({ schemaVersion: 1, glucose: [{ id: 'ok' }, 'bad', null, 5] });
    expect(data.glucose).toHaveLength(1);
  });
  it('throws a typed error for newer schemas', () => {
    expect(() => migrate({ schemaVersion: 99 })).toThrow(NewerSchemaError);
  });
});
