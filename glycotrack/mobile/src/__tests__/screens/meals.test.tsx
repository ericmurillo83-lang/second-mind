import { screen, userEvent } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import MealsScreen from '@/app/(tabs)/meals';
import LogMealScreen from '@/app/meals/log';
import PlanAddScreen from '@/app/meals/plan-add';
import RecipeDetailScreen from '@/app/meals/recipe/[id]';
import EditRecipeScreen from '@/app/meals/recipe-edit';
import { expectAllControlsLabelled, onboardedEmpty, renderScreen } from '@/test-utils/render';

describe('Meals tab', () => {
  it('shows today’s carbs and logged meals', async () => {
    await renderScreen(<MealsScreen />);
    expect(screen.getByText('Carbohydrates today')).toBeOnTheScreen();
    expect(screen.getByTestId('meals-carbs-total')).toHaveTextContent(/\d+(\.\d)? g/);
    expect(screen.getByText('Logged today')).toBeOnTheScreen();
    expectAllControlsLabelled();
  });

  it('switches to the weekly plan and recipes', async () => {
    await renderScreen(<MealsScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('tab', { name: 'Plan' }));
    expect(screen.getByRole('button', { name: 'Previous week' })).toBeOnTheScreen();
    expect(screen.getByTestId('planned-carbs')).toBeOnTheScreen();
    expectAllControlsLabelled();

    await user.press(screen.getByRole('tab', { name: 'Recipes' }));
    expect(screen.getByLabelText('Search recipes')).toBeOnTheScreen();
    expect(screen.getByText('Lentil & Vegetable Soup')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Search recipes'), 'lentil');
    expect(screen.getByText('1 recipe')).toBeOnTheScreen();
  });

  it('toggles a recipe favorite', async () => {
    const { store } = await renderScreen(<MealsScreen />);
    await userEvent.setup().press(screen.getByRole('tab', { name: 'Recipes' }));
    const omelet = store.getState().data.recipes.find((r) => r.name === 'Spinach & Feta Omelet')!;
    expect(omelet.favorite).toBe(false);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Add Spinach & Feta Omelet to favorites' }));
    expect(store.getState().data.recipes.find((r) => r.id === omelet.id)!.favorite).toBe(true);
  });
});

describe('Log a meal', () => {
  it('prefills carbs from a recipe and scales with servings', async () => {
    const { store } = await renderScreen(<LogMealScreen />);
    const user = userEvent.setup();
    const soup = store.getState().data.recipes.find((r) => r.name === 'Lentil & Vegetable Soup')!;
    await user.press(screen.getByTestId(`pick-${soup.id}`));
    expect(screen.getByLabelText('Carbohydrates')).toHaveDisplayValue('28');
    await user.press(screen.getByRole('button', { name: 'Increase Servings' }));
    expect(screen.getByLabelText('Carbohydrates')).toHaveDisplayValue('42');
    const before = store.getState().data.meals.length;
    await user.press(screen.getByRole('button', { name: 'Save meal' }));
    const saved = store.getState().data.meals.at(-1)!;
    expect(store.getState().data.meals.length).toBe(before + 1);
    expect(saved).toMatchObject({ title: 'Lentil & Vegetable Soup', carbs: 42, servings: 1.5, recipeId: soup.id });
    expect(saved.demo).toBeUndefined();
  });

  it('requires a name and carbs', async () => {
    const { store } = await renderScreen(<LogMealScreen />, { setup: onboardedEmpty });
    await userEvent.setup().press(screen.getByRole('button', { name: 'Save meal' }));
    expect(screen.getByText('Give this meal a name.')).toBeOnTheScreen();
    expect(screen.getByText(/Enter grams of carbohydrate/)).toBeOnTheScreen();
    expect(store.getState().data.meals).toHaveLength(0);
  });
});

describe('Recipes', () => {
  it('creates a recipe and opens it', async () => {
    const { store } = await renderScreen(<EditRecipeScreen />, { setup: onboardedEmpty });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Recipe name'), 'Black Bean Tacos');
    await user.type(screen.getByLabelText('Carbohydrates per serving'), '35');
    await user.type(screen.getByLabelText('Ingredients'), 'Beans\nTortillas');
    await user.press(screen.getByRole('button', { name: 'Save recipe' }));
    const [recipe] = store.getState().data.recipes;
    expect(recipe).toMatchObject({ name: 'Black Bean Tacos', carbsPerServing: 35, ingredients: ['Beans', 'Tortillas'] });
    expect(router.replace).toHaveBeenCalledWith({ pathname: '/meals/recipe/[id]', params: { id: recipe.id } });
  });

  it('shows recipe details with a sample-data label', async () => {
    let id = '';
    await renderScreen(<RecipeDetailScreen />, {
      setup: (s) => {
        s.completeOnboarding({ displayName: '', withDemoData: true });
        id = s.getState().data.recipes[0].id;
        jest.mocked(useLocalSearchParams).mockReturnValue({ id });
      },
    });
    expect(screen.getByText('Fictional sample recipe')).toBeOnTheScreen();
    expect(screen.getByText('Ingredients')).toBeOnTheScreen();
    expect(screen.getByText(/fictional estimates/)).toBeOnTheScreen();
    expectAllControlsLabelled();
  });

  it('adds a recipe to the plan', async () => {
    const { store } = await renderScreen(<PlanAddScreen />, {
      setup: (s) => {
        s.completeOnboarding({ displayName: '', withDemoData: true });
        jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-10-30', slot: 'lunch' });
      },
    });
    const soup = store.getState().data.recipes.find((r) => r.name === 'Lentil & Vegetable Soup')!;
    const user = userEvent.setup();
    expect(screen.getByRole('button', { name: 'Add to plan' })).toBeDisabled();
    await user.press(screen.getByTestId(`plan-pick-${soup.id}`));
    await user.press(screen.getByRole('button', { name: 'Add to plan' }));
    const entry = store.getState().data.mealPlan.at(-1)!;
    expect(entry).toMatchObject({ date: '2026-10-30', slot: 'lunch', recipeId: soup.id, servings: 1 });
  });
});
