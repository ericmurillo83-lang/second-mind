import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useAppData, useStore } from '@/data/store-context';
import { toDateKey } from '@/domain/dates';
import { defaultSlotFor, formatCarbs } from '@/domain/meals';
import { Button, IconButton } from '@/ui/button';
import { Card, EmptyState, Row, Screen, Section } from '@/ui/layout';
import { Badge, SafetyNote, StatTile } from '@/ui/status';
import { Text } from '@/ui/text';
import { spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const { colors } = useTheme();
  const recipe = useAppData((d) => d.recipes.find((r) => r.id === id));

  if (!recipe) {
    return (
      <Screen title="Recipe" tab={false}>
        <EmptyState icon="book" title="Recipe not found" message="It may have been deleted." />
      </Screen>
    );
  }

  return (
    <Screen
      testID="recipe-detail"
      tab={false}
      title={recipe.name}
      subtitle={recipe.description}
      headerRight={
        <>
          <IconButton
            icon={recipe.favorite ? 'star' : 'starOutline'}
            label={recipe.favorite ? 'Remove from favorites' : 'Add to favorites'}
            onPress={() => store.patch('recipes', recipe.id, { favorite: !recipe.favorite })}
          />
          <IconButton
            testID="edit-recipe"
            icon="edit"
            label="Edit recipe"
            onPress={() => router.push({ pathname: '/meals/recipe-edit', params: { id: recipe.id } })}
          />
        </>
      }>
      <Row wrap gap={spacing.xs}>
        {recipe.demo ? <Badge label="Fictional sample recipe" tone="demo" icon="sparkles" /> : null}
        {recipe.tags.map((t) => (
          <Badge key={t} label={t} />
        ))}
      </Row>
      <View style={styles.tiles}>
        <StatTile compact icon="carbs" tone="accent" label="Carbs/serving" value={formatCarbs(recipe.carbsPerServing).replace(' g', '')} unit="g" />
        <StatTile compact icon="person" label="Servings" value={String(recipe.servings)} />
        <StatTile compact icon="timer" label="Time" value={String(recipe.prepMinutes)} unit="min" />
      </View>
      <Row gap={spacing.md}>
        <Button
          testID="recipe-log"
          label="Log as eaten"
          icon="check"
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/meals/log', params: { recipeId: recipe.id } })}
        />
        <Button
          testID="recipe-plan"
          label="Add to plan"
          icon="calendar"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() =>
            router.push({
              pathname: '/meals/plan-add',
              params: { date: toDateKey(new Date()), slot: defaultSlotFor(new Date()), recipeId: recipe.id },
            })
          }
        />
      </Row>
      <Section title="Ingredients">
        <Card>
          <View style={{ gap: spacing.sm }}>
            {recipe.ingredients.length ? (
              recipe.ingredients.map((i, idx) => (
                <View key={`${idx}-${i}`} style={styles.listItem}>
                  <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                  <Text variant="body" style={{ flex: 1 }}>
                    {i}
                  </Text>
                </View>
              ))
            ) : (
              <Text color="textSecondary">No ingredients added.</Text>
            )}
          </View>
        </Card>
      </Section>
      <Section title="Steps">
        <Card>
          <View style={{ gap: spacing.md }}>
            {recipe.steps.length ? (
              recipe.steps.map((s, idx) => (
                <View key={`${idx}-${s}`} style={styles.listItem}>
                  <View style={[styles.stepNum, { backgroundColor: colors.primarySoft }]}>
                    <Text variant="caption" color="primaryText" style={{ fontWeight: '700' }}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text variant="body" style={{ flex: 1 }}>
                    {s}
                  </Text>
                </View>
              ))
            ) : (
              <Text color="textSecondary">No steps added.</Text>
            )}
          </View>
        </Card>
      </Section>
      <SafetyNote>
        {recipe.demo
          ? 'Carbohydrate values in sample recipes are fictional estimates for demonstration. Check food labels and your care team’s guidance.'
          : 'Carbohydrate values are as entered and may not be exact. Check food labels.'}
      </SafetyNote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  listItem: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 9 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
