import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useAppData, useRecipesById, useStore } from '@/data/store-context';
import { combine, toDateKey, toTimeOfDay } from '@/domain/dates';
import { carbsForServings, defaultSlotFor, formatCarbs, parseCarbInput, SLOT_LABEL } from '@/domain/meals';
import { MEAL_SLOTS, type MealSlot } from '@/domain/types';
import { confirmAsync } from '@/services/dialogs';
import { Button } from '@/ui/button';
import { Chip, ChipScroller, Stepper } from '@/ui/controls';
import { ChoiceField, DateField, FieldLabel, TextField, TimeField } from '@/ui/fields';
import { Card, FormScreen } from '@/ui/layout';
import { Badge } from '@/ui/status';
import { Text } from '@/ui/text';
import { spacing } from '@/ui/theme';

const SLOT_OPTIONS = MEAL_SLOTS.map((s) => ({ value: s, label: SLOT_LABEL[s] }));
const SLOT_TIME: Record<MealSlot, string> = { breakfast: '08:00', lunch: '12:30', dinner: '18:30', snack: '15:30' };

export default function LogMealScreen() {
  const params = useLocalSearchParams<{ id?: string; recipeId?: string; servings?: string; slot?: MealSlot; date?: string }>();
  const store = useStore();
  const existing = useAppData((d) => d.meals.find((m) => m.id === params.id));
  const recipes = useAppData((d) => d.recipes);
  const recipesById = useRecipesById();

  const now = new Date();
  const todayKey = toDateKey(now);
  const initialDate = existing ? toDateKey(new Date(existing.eatenAt)) : params.date ?? todayKey;
  const initialSlot = existing?.slot ?? params.slot ?? defaultSlotFor(now);
  const initialTime = existing
    ? toTimeOfDay(new Date(existing.eatenAt))
    : initialDate === todayKey
      ? toTimeOfDay(now)
      : SLOT_TIME[initialSlot];
  const initialRecipe = recipesById.get(existing?.recipeId ?? params.recipeId ?? '');
  const initialServings = existing?.servings ?? (params.servings ? Number(params.servings) : 1);

  const [recipeId, setRecipeId] = useState(initialRecipe?.id);
  const [servings, setServings] = useState(initialServings);
  const [title, setTitle] = useState(existing?.title ?? initialRecipe?.name ?? '');
  const [carbs, setCarbs] = useState(
    existing ? String(existing.carbs) : initialRecipe ? String(carbsForServings(initialRecipe, initialServings)) : '',
  );
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [note, setNote] = useState(existing?.note ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [inFuture, setInFuture] = useState(false);

  const recipe = recipeId ? recipesById.get(recipeId) : undefined;
  const quickRecipes = useMemo(
    () => [...recipes].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name)).slice(0, 10),
    [recipes],
  );
  const carbValue = parseCarbInput(carbs);
  const titleError = submitted && !title.trim() ? 'Give this meal a name.' : undefined;
  const carbError = submitted && carbValue === null ? 'Enter grams of carbohydrate, like 45. Use 0 if none.' : undefined;

  const chooseRecipe = (id: string) => {
    const r = recipesById.get(id);
    if (!r) return;
    setRecipeId(id);
    setTitle(r.name);
    setServings(1);
    setCarbs(String(carbsForServings(r, 1)));
  };

  const changeServings = (v: number) => {
    setServings(v);
    if (recipe) setCarbs(String(carbsForServings(recipe, v)));
  };

  const save = () => {
    setSubmitted(true);
    const future = combine(date, time).getTime() > Date.now() + 5 * 60_000;
    setInFuture(future);
    if (!title.trim() || carbValue === null || future) return;
    store.upsert('meals', {
      id: existing?.id,
      demo: existing?.demo,
      title: title.trim(),
      carbs: carbValue,
      slot,
      eatenAt: combine(date, time).toISOString(),
      recipeId,
      servings: recipe ? servings : undefined,
      note: note.trim() || undefined,
    });
    router.back();
  };

  const remove = async () => {
    if (!existing) return;
    if (await confirmAsync({ title: 'Delete this meal?', message: 'This removes it from your log.', confirmLabel: 'Delete', destructive: true })) {
      store.remove('meals', existing.id);
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Edit meal' : 'Log a meal' }} />
      <FormScreen
        footer={
          <>
            {existing ? <Button label="Delete" variant="destructive" icon="trash" onPress={remove} testID="delete-meal" /> : null}
            <Button label={existing ? 'Save changes' : 'Save meal'} onPress={save} style={{ flex: 1 }} testID="save-meal" />
          </>
        }>
        {existing?.demo ? <Badge label="Fictional sample entry" tone="demo" icon="sparkles" /> : null}
        {!existing && quickRecipes.length ? (
          <View style={{ gap: spacing.sm }}>
            <FieldLabel label="Start from a recipe" hint="Optional — fills in the name and carbs" />
            <ChipScroller>
              {quickRecipes.map((r) => (
                <Chip key={r.id} label={r.name} icon={r.favorite ? 'star' : undefined} selected={r.id === recipeId} onPress={() => chooseRecipe(r.id)} testID={`pick-${r.id}`} />
              ))}
            </ChipScroller>
          </View>
        ) : null}

        <TextField testID="meal-title" label="What did you eat?" value={title} onChangeText={setTitle} placeholder="e.g. Turkey sandwich" error={titleError} maxLength={120} />

        {recipe ? (
          <Card tone="muted" padded={false}>
            <Stepper
              testID="servings"
              label="Servings"
              value={servings}
              onChange={changeServings}
              step={0.5}
              min={0.5}
              max={12}
              format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))}
            />
            <Text variant="footnote" color="textSecondary" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              {formatCarbs(recipe.carbsPerServing)} per serving from the recipe
            </Text>
          </Card>
        ) : null}

        <TextField
          testID="meal-carbs"
          label="Carbohydrates"
          hint="Total grams for what you ate"
          value={carbs}
          onChangeText={setCarbs}
          keyboardType="decimal-pad"
          suffix="g"
          placeholder="0"
          error={carbError}
        />
        <ChoiceField testID="slot" label="Meal" options={SLOT_OPTIONS} value={slot} onChange={setSlot} />
        <DateField label="Date" value={date} onChange={setDate} allowFuture={false} />
        <TimeField label="Time" value={time} onChange={setTime} />
        {submitted && inFuture ? (
          <Text variant="footnote" color="danger" accessibilityRole="alert">
            A logged meal can’t be in the future. Change the date or time.
          </Text>
        ) : null}
        <TextField label="Note" hint="Optional" value={note} onChangeText={setNote} multiline maxLength={500} />
      </FormScreen>
    </>
  );
}
