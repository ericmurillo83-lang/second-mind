import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useAppData, useStore } from '@/data/store-context';
import { parseCarbInput } from '@/domain/meals';
import { confirmAsync } from '@/services/dialogs';
import { Button } from '@/ui/button';
import { Stepper } from '@/ui/controls';
import { TextField } from '@/ui/fields';
import { Card, FormScreen } from '@/ui/layout';

const splitLines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useStore();
  const existing = useAppData((d) => d.recipes.find((r) => r.id === id));

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [carbs, setCarbs] = useState(existing ? String(existing.carbsPerServing) : '');
  const [servings, setServings] = useState(existing?.servings ?? 2);
  const [prep, setPrep] = useState(existing?.prepMinutes ?? 20);
  const [tags, setTags] = useState(existing?.tags.join(', ') ?? '');
  const [ingredients, setIngredients] = useState(existing?.ingredients.join('\n') ?? '');
  const [steps, setSteps] = useState(existing?.steps.join('\n') ?? '');
  const [submitted, setSubmitted] = useState(false);

  const carbValue = parseCarbInput(carbs);

  const save = () => {
    setSubmitted(true);
    if (!name.trim() || carbValue === null) return;
    const saved = store.upsert('recipes', {
      id: existing?.id,
      demo: existing?.demo,
      name: name.trim(),
      description: description.trim(),
      carbsPerServing: carbValue,
      servings,
      prepMinutes: prep,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      ingredients: splitLines(ingredients),
      steps: splitLines(steps),
      favorite: existing?.favorite ?? false,
    });
    if (existing) router.back();
    else router.replace({ pathname: '/meals/recipe/[id]', params: { id: saved.id } });
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirmAsync({
      title: 'Delete this recipe?',
      message: 'It will also be removed from your meal plan. Meals you already logged are kept.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) {
      store.remove('recipes', existing.id);
      router.dismissTo('/meals');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: existing ? 'Edit recipe' : 'New recipe' }} />
      <FormScreen
        footer={
          <>
            {existing ? <Button label="Delete" variant="destructive" icon="trash" onPress={remove} testID="delete-recipe" /> : null}
            <Button label="Save recipe" onPress={save} style={{ flex: 1 }} testID="save-recipe" />
          </>
        }>
        <TextField testID="recipe-name" label="Recipe name" value={name} onChangeText={setName} error={submitted && !name.trim() ? 'Add a name.' : undefined} maxLength={120} />
        <TextField label="Short description" hint="Optional" value={description} onChangeText={setDescription} maxLength={240} />
        <TextField
          testID="recipe-carbs"
          label="Carbohydrates per serving"
          hint="From the recipe source or food labels"
          value={carbs}
          onChangeText={setCarbs}
          keyboardType="decimal-pad"
          suffix="g"
          error={submitted && carbValue === null ? 'Enter grams per serving, like 30.' : undefined}
        />
        <Card padded={false}>
          <Stepper label="Servings" value={servings} onChange={setServings} min={1} max={24} testID="recipe-servings" />
          <Stepper label="Time (minutes)" value={prep} onChange={setPrep} min={0} max={480} step={5} />
        </Card>
        <TextField label="Tags" hint="Comma separated, e.g. Dinner, Vegetarian" value={tags} onChangeText={setTags} autoCapitalize="words" />
        <TextField label="Ingredients" hint="One per line" value={ingredients} onChangeText={setIngredients} multiline />
        <TextField label="Steps" hint="One per line" value={steps} onChangeText={setSteps} multiline />
      </FormScreen>
    </>
  );
}
