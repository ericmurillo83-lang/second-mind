import { COLLECTION_KEYS } from './schema';
import { createDemoData } from './seed';

const now = new Date(2026, 9, 24, 12, 0);

describe('fictional sample data', () => {
  const demo = createDemoData(now);

  it('marks every record as demo', () => {
    for (const key of COLLECTION_KEYS) {
      for (const r of demo[key] as { demo?: boolean }[]) expect(r.demo).toBe(true);
    }
  });

  it('is deterministic for a given day', () => {
    expect(createDemoData(now)).toEqual(demo);
  });

  it('has unique ids', () => {
    const ids = COLLECTION_KEYS.flatMap((k) => (demo[k] as { id: string }[]).map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never places readings or meals in the future', () => {
    for (const g of demo.glucose) expect(new Date(g.takenAt).getTime()).toBeLessThanOrEqual(now.getTime());
    for (const m of demo.meals) expect(new Date(m.eatenAt).getTime()).toBeLessThanOrEqual(now.getTime());
  });

  it('keeps readings within the plausible entry range', () => {
    for (const g of demo.glucose) {
      expect(g.valueMgdl).toBeGreaterThanOrEqual(20);
      expect(g.valueMgdl).toBeLessThanOrEqual(600);
    }
  });

  it('references only existing recipes and medications', () => {
    const recipeIds = new Set(demo.recipes.map((r) => r.id));
    const medIds = new Set(demo.medications.map((m) => m.id));
    for (const p of demo.mealPlan) expect(recipeIds.has(p.recipeId)).toBe(true);
    for (const m of demo.meals) if (m.recipeId) expect(recipeIds.has(m.recipeId)).toBe(true);
    for (const d of demo.doseLogs) expect(medIds.has(d.medicationId)).toBe(true);
  });

  it('labels people and providers as fictional or sample', () => {
    for (const a of demo.appointments) expect(a.provider).toMatch(/fictional|Sample/);
  });

  // Safety guard: sample data must not model insulin or dosing.
  it('contains no insulin or dosing content', () => {
    const text = JSON.stringify(demo).toLowerCase();
    expect(text).not.toMatch(/insulin|units? of|correction factor|carb ratio|bolus|basal/);
  });
});
