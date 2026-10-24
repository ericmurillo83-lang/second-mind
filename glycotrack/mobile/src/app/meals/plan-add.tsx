import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAppData, useStore } from '@/data/store-context';
import { toDateKey } from '@/domain/dates';
import { filterRecipes, formatCarbs, SLOT_LABEL } from '@/domain/meals';
import { MEAL_SLOTS, type MealSlot } from '@/domain/types';
import { Button } from '@/ui/button';
import { Stepper } from '@/ui/controls';
import { ChoiceField, DateField, TextField } from '@/ui/fields';
import { Card, EmptyState, FormScreen, ListGroup, ListRow } from '@/ui/layout';
import { Text } from '@/ui/text';
import { spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

const SLOT_OPTIONS = MEAL_SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }));

export default function PlanAddScreen() {
  const params = useLocalSearchParams<{ date?: string; slot?: MealSlot; recipeId?: string }>();
  const store = useStore();
  const { colors } = useTheme();
  const recipes = useAppData((d) => d.recipes);
  const [date, setDate] = useState(params.date ?? toDateKey(new Date()));
  const [slot, setSlot] = useState<MealSlot>(params.slot ?? 'dinner');
  const [recipeId, setRecipeId] = useState<string | undefined>(params.recipeId);
  const [servings, setServings] = useState(1);
  const [query, setQuery] = useState('');
  const list = useMemo(() => filterRecipes(recipes, query, null), [recipes, query]);

  const add = () => {
    if (!recipeId) return;
    store.upsert('mealPlan', { date, slot, recipeId, servings });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Plan a meal' }} />
      <FormScreen footer={<Button label="Add to plan" icon="calendar" onPress={add} disabled={!recipeId} style={{ flex: 1 }} testID="confirm-plan" />}>
        <DateField label="Day" value={date} onChange={setDate} />
        <ChoiceField testID="plan-slot" label="Meal" options={SLOT_OPTIONS} value={slot} onChange={setSlot} />
        <Card padded={false}>
          <Stepper label="Servings" value={servings} onChange={setServings} min={0.5} max={12} step={0.5} format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))} />
        </Card>
        <View style={{ gap: spacing.sm }}>
          <TextField label="Choose a recipe" placeholder="Search" value={query} onChangeText={setQuery} testID="plan-search" />
          {recipes.length === 0 ? (
            <EmptyState
              icon="book"
              title="No recipes yet"
              message="Add a recipe first, then plan it here."
              action={<Button label="Add recipe" size="sm" variant="soft" onPress={() => router.replace('/meals/recipe-edit')} />}
            />
          ) : (
            <ListGroup>
              {list.map((r) => (
                <ListRow
                  key={r.id}
                  testID={`plan-pick-${r.id}`}
                  title={r.name}
                  subtitle={`${formatCarbs(r.carbsPerServing)} per serving · ${r.prepMinutes} min`}
                  icon={r.id === recipeId ? 'checkCircle' : 'meals'}
                  iconBackground={r.id === recipeId ? colors.primary : colors.accentSoft}
                  iconColor={r.id === recipeId ? colors.textOnPrimary : colors.accent}
                  showChevron={false}
                  accessibilityLabel={`${r.name}, ${formatCarbs(r.carbsPerServing)} per serving${r.id === recipeId ? ', selected' : ''}`}
                  onPress={() => setRecipeId(r.id)}
                />
              ))}
            </ListGroup>
          )}
          {list.length === 0 && recipes.length > 0 ? <Text color="textSecondary">No recipes match.</Text> : null}
        </View>
      </FormScreen>
    </>
  );
}
