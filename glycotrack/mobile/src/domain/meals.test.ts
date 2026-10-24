import {
  carbsBySlot,
  carbsForServings,
  defaultSlotFor,
  filterRecipes,
  formatCarbs,
  goalProgress,
  mealsOnDay,
  parseCarbInput,
  plannedCarbs,
  recipeTags,
  totalCarbs,
} from './meals';
import type { MealLog, MealPlanEntry, Recipe } from './types';

const base = { createdAt: '', updatedAt: '' };
const recipe = (id: string, over: Partial<Recipe> = {}): Recipe => ({
  ...base,
  id,
  name: id,
  description: '',
  servings: 2,
  carbsPerServing: 30,
  prepMinutes: 10,
  tags: [],
  ingredients: [],
  steps: [],
  favorite: false,
  ...over,
});
const meal = (id: string, eatenAt: string, carbs: number, slot: MealLog['slot'] = 'lunch'): MealLog => ({
  ...base,
  id,
  eatenAt,
  carbs,
  slot,
  title: id,
});

describe('carb math', () => {
  it('scales recipes by servings without float drift', () => {
    expect(carbsForServings({ carbsPerServing: 33 }, 1.5)).toBe(49.5);
    expect(carbsForServings({ carbsPerServing: 0.1 }, 3)).toBe(0.3);
  });

  it('totals and splits by slot', () => {
    const meals = [meal('a', 'x', 10.1, 'breakfast'), meal('b', 'x', 20.2, 'lunch'), meal('c', 'x', 5, 'lunch')];
    expect(totalCarbs(meals)).toBe(35.3);
    expect(carbsBySlot(meals)).toEqual({ breakfast: 10.1, lunch: 25.2, dinner: 0, snack: 0 });
  });

  it('formats grams', () => {
    expect(formatCarbs(45)).toBe('45 g');
    expect(formatCarbs(49.5)).toBe('49.5 g');
  });

  it('computes goal progress only when a goal exists', () => {
    expect(goalProgress(90, 180)).toBe(0.5);
    expect(goalProgress(400, 180)).toBe(1);
    expect(goalProgress(90, null)).toBeNull();
  });

  it('parses carb input', () => {
    expect(parseCarbInput('45')).toBe(45);
    expect(parseCarbInput('12,5')).toBe(12.5);
    expect(parseCarbInput('lots')).toBeNull();
    expect(parseCarbInput('5000')).toBeNull();
  });
});

describe('days and plans', () => {
  it('selects meals on a local day in time order', () => {
    const d1 = new Date(2026, 9, 24, 18).toISOString();
    const d2 = new Date(2026, 9, 24, 8).toISOString();
    const other = new Date(2026, 9, 23, 8).toISOString();
    const list = mealsOnDay([meal('dinner', d1, 1), meal('breakfast', d2, 1), meal('old', other, 1)], '2026-10-24');
    expect(list.map((m) => m.id)).toEqual(['breakfast', 'dinner']);
  });

  it('sums planned carbs and ignores missing recipes', () => {
    const r = recipe('r1', { carbsPerServing: 20 });
    const entries: MealPlanEntry[] = [
      { ...base, id: 'p1', date: '2026-10-24', slot: 'lunch', recipeId: 'r1', servings: 2 },
      { ...base, id: 'p2', date: '2026-10-24', slot: 'dinner', recipeId: 'missing', servings: 1 },
    ];
    expect(plannedCarbs(entries, new Map([['r1', r]]))).toBe(40);
  });

  it('picks a meal slot from the time of day', () => {
    expect(defaultSlotFor(new Date(2026, 0, 1, 7))).toBe('breakfast');
    expect(defaultSlotFor(new Date(2026, 0, 1, 12))).toBe('lunch');
    expect(defaultSlotFor(new Date(2026, 0, 1, 19))).toBe('dinner');
    expect(defaultSlotFor(new Date(2026, 0, 1, 16))).toBe('snack');
  });
});

describe('recipe search', () => {
  const recipes = [
    recipe('Soup', { name: 'Lentil Soup', tags: ['Lunch'], ingredients: ['lentils'] }),
    recipe('Oats', { name: 'Overnight Oats', tags: ['Breakfast'], favorite: true }),
    recipe('Salad', { name: 'Chickpea Salad', tags: ['Lunch', 'Vegetarian'] }),
  ];
  it('filters by text, ingredient, tag and favorites; favorites sort first', () => {
    expect(filterRecipes(recipes, '', null).map((r) => r.name)).toEqual(['Overnight Oats', 'Chickpea Salad', 'Lentil Soup']);
    expect(filterRecipes(recipes, 'lentils', null).map((r) => r.id)).toEqual(['Soup']);
    expect(filterRecipes(recipes, '', 'Lunch')).toHaveLength(2);
    expect(filterRecipes(recipes, '', null, true).map((r) => r.id)).toEqual(['Oats']);
  });
  it('lists unique sorted tags', () => {
    expect(recipeTags(recipes)).toEqual(['Breakfast', 'Lunch', 'Vegetarian']);
  });
});
