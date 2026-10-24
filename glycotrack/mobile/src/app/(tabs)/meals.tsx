import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { MealPlanView } from '@/features/meals/plan-view';
import { RecipesView } from '@/features/meals/recipes-view';
import { TodayMealsView } from '@/features/meals/today-view';
import { IconButton } from '@/ui/button';
import { SegmentedControl } from '@/ui/controls';
import { Screen } from '@/ui/layout';

type View = 'today' | 'plan' | 'recipes';
const VIEWS = [
  { value: 'today', label: 'Today' },
  { value: 'plan', label: 'Plan' },
  { value: 'recipes', label: 'Recipes' },
] as const;

export default function MealsScreen() {
  const params = useLocalSearchParams<{ view?: View }>();
  const [view, setView] = useState<View>(params.view ?? 'today');
  return (
    <Screen
      testID="meals-screen"
      title="Meals"
      subtitle="Plan, cook and log carbohydrates"
      headerRight={
        view === 'recipes' ? (
          <IconButton testID="add-recipe" icon="plus" variant="filled" label="Add recipe" onPress={() => router.push('/meals/recipe-edit')} />
        ) : (
          <IconButton testID="add-meal" icon="plus" variant="filled" label="Log a meal" onPress={() => router.push('/meals/log')} />
        )
      }>
      <SegmentedControl testID="meals-view" options={VIEWS} value={view} onChange={setView} />
      {view === 'today' && <TodayMealsView />}
      {view === 'plan' && <MealPlanView />}
      {view === 'recipes' && <RecipesView />}
    </Screen>
  );
}
