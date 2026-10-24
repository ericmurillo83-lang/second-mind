import { toDateKey } from './dates';
import type { DateKey, MealLog, MealPlanEntry, MealSlot, Recipe } from './types';

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

/** Rounds to one decimal place so carb sums don't drift (e.g. 1.5 servings × 33 g). */
export function roundCarbs(grams: number): number {
  return Math.round(grams * 10) / 10;
}

export function formatCarbs(grams: number): string {
  const r = roundCarbs(grams);
  return `${Number.isInteger(r) ? r : r.toFixed(1)} g`;
}

export function carbsForServings(recipe: Pick<Recipe, 'carbsPerServing'>, servings: number): number {
  return roundCarbs(recipe.carbsPerServing * servings);
}

export function mealsOnDay(meals: readonly MealLog[], dateKey: DateKey): MealLog[] {
  return meals
    .filter((m) => toDateKey(new Date(m.eatenAt)) === dateKey)
    .sort((a, b) => a.eatenAt.localeCompare(b.eatenAt));
}

export function totalCarbs(meals: readonly Pick<MealLog, 'carbs'>[]): number {
  return roundCarbs(meals.reduce((sum, m) => sum + m.carbs, 0));
}

export function carbsBySlot(meals: readonly MealLog[]): Record<MealSlot, number> {
  const totals: Record<MealSlot, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  for (const m of meals) totals[m.slot] = roundCarbs(totals[m.slot] + m.carbs);
  return totals;
}

export function planForDay(plan: readonly MealPlanEntry[], dateKey: DateKey): MealPlanEntry[] {
  return plan.filter((p) => p.date === dateKey);
}

export function plannedCarbs(
  entries: readonly MealPlanEntry[],
  recipesById: ReadonlyMap<string, Recipe>,
): number {
  let total = 0;
  for (const e of entries) {
    const recipe = recipesById.get(e.recipeId);
    if (recipe) total += recipe.carbsPerServing * e.servings;
  }
  return roundCarbs(total);
}

/** Fraction of a personal goal used, clamped 0–1 for progress UI. Null when no goal is set. */
export function goalProgress(total: number, goal: number | null): number | null {
  if (!goal || goal <= 0) return null;
  return Math.max(0, Math.min(1, total / goal));
}

export function recipeTags(recipes: readonly Recipe[]): string[] {
  const set = new Set<string>();
  for (const r of recipes) for (const t of r.tags) set.add(t);
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function filterRecipes(
  recipes: readonly Recipe[],
  query: string,
  tag: string | null,
  favoritesOnly = false,
): Recipe[] {
  const q = query.trim().toLowerCase();
  return recipes
    .filter((r) => (favoritesOnly ? r.favorite : true))
    .filter((r) => (tag ? r.tags.includes(tag) : true))
    .filter((r) => {
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
}

/** Infer a sensible meal slot for "now" when logging a meal. */
export function defaultSlotFor(date: Date): MealSlot {
  const h = date.getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'snack';
}

export function parseCarbInput(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  return n <= 1000 ? n : null;
}
