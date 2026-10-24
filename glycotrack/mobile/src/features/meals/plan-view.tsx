import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppData, useRecipesById, useStore } from '@/data/store-context';
import { addDays, formatRelativeDay, formatShortDate, toDateKey, weekDays, weekdayShort } from '@/domain/dates';
import { carbsForServings, formatCarbs, planForDay, plannedCarbs, SLOT_LABEL } from '@/domain/meals';
import { MEAL_SLOTS } from '@/domain/types';
import { useNow } from '@/features/hooks';
import { Button, IconButton, tapFeedback } from '@/ui/button';
import { Card, ListGroup, Section } from '@/ui/layout';
import { Text } from '@/ui/text';
import { MIN_TOUCH, radius, spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

export function MealPlanView() {
  const now = useNow();
  const store = useStore();
  const { colors } = useTheme();
  const plan = useAppData((d) => d.mealPlan);
  const recipesById = useRecipesById();
  const [anchor, setAnchor] = useState(now);
  const [selected, setSelected] = useState(toDateKey(now));
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const todayKey = toDateKey(now);

  const entries = useMemo(() => planForDay(plan, selected), [plan, selected]);
  const dayCarbs = plannedCarbs(entries, recipesById);
  const weekCarbs = useMemo(
    () => new Map(days.map((d) => [toDateKey(d), plannedCarbs(planForDay(plan, toDateKey(d)), recipesById)])),
    [days, plan, recipesById],
  );

  const shiftWeek = (delta: number) => {
    const next = addDays(anchor, delta * 7);
    setAnchor(next);
    setSelected(toDateKey(weekDays(next)[0]));
  };

  return (
    <>
      <View style={styles.weekHeader}>
        <IconButton icon="chevronLeft" label="Previous week" onPress={() => shiftWeek(-1)} testID="prev-week" />
        <Text variant="headline" align="center" style={{ flex: 1 }}>
          {formatShortDate(days[0])} – {formatShortDate(days[6])}
        </Text>
        <IconButton icon="chevronRight" label="Next week" onPress={() => shiftWeek(1)} testID="next-week" />
      </View>
      <View style={styles.week} accessibilityRole="tablist">
        {days.map((d) => {
          const key = toDateKey(d);
          const isSel = key === selected;
          const carbs = weekCarbs.get(key) ?? 0;
          return (
            <Pressable
              key={key}
              testID={`plan-day-${key}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSel }}
              aria-selected={isSel}
              accessibilityLabel={`${formatRelativeDay(d, now)}, ${formatCarbs(carbs)} planned`}
              onPress={() => {
                tapFeedback();
                setSelected(key);
              }}
              style={[
                styles.day,
                { backgroundColor: isSel ? colors.primary : colors.surface, borderColor: key === todayKey && !isSel ? colors.primary : colors.border },
              ]}>
              <Text variant="caption" style={{ color: isSel ? colors.textOnPrimary : colors.textSecondary }}>
                {weekdayShort(d)}
              </Text>
              <Text variant="headline" numeric style={{ color: isSel ? colors.textOnPrimary : colors.text }}>
                {d.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card tone="muted">
        <View style={styles.summary} accessible accessibilityLabel={`${formatRelativeDay(new Date(`${selected}T12:00:00`), now)}: ${formatCarbs(dayCarbs)} planned across ${entries.length} meals`}>
          <Text variant="headline" style={{ flex: 1 }}>
            {formatRelativeDay(new Date(`${selected}T12:00:00`), now)}
          </Text>
          <Text variant="title2" numeric testID="planned-carbs">
            {formatCarbs(dayCarbs)}
          </Text>
          <Text variant="footnote" color="textSecondary">
            planned
          </Text>
        </View>
      </Card>

      {MEAL_SLOTS.map((slot) => {
        const slotEntries = entries.filter((e) => e.slot === slot);
        return (
          <Section key={slot} title={SLOT_LABEL[slot]}>
            {slotEntries.length ? (
              <ListGroup>
                {slotEntries.map((e) => {
                  const recipe = recipesById.get(e.recipeId);
                  if (!recipe) return null;
                  return (
                    <View key={e.id} style={styles.entry} testID={`plan-entry-${e.id}`}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${recipe.name}, ${formatCarbs(carbsForServings(recipe, e.servings))}. Opens recipe.`}
                        onPress={() => router.push({ pathname: '/meals/recipe/[id]', params: { id: recipe.id } })}
                        style={{ flex: 1, gap: 2, minHeight: MIN_TOUCH, justifyContent: 'center' }}>
                        <Text variant="bodyStrong">{recipe.name}</Text>
                        <Text variant="footnote" color="textSecondary">
                          {e.servings} serving{e.servings === 1 ? '' : 's'} · {formatCarbs(carbsForServings(recipe, e.servings))} carbs
                        </Text>
                      </Pressable>
                      <Button
                        label="Log"
                        size="sm"
                        variant="soft"
                        icon="check"
                        testID={`plan-log-${e.id}`}
                        accessibilityHint={`Log ${recipe.name} as eaten`}
                        onPress={() =>
                          router.push({
                            pathname: '/meals/log',
                            params: { recipeId: recipe.id, servings: String(e.servings), slot, date: e.date },
                          })
                        }
                      />
                      <IconButton
                        icon="close"
                        variant="plain"
                        size={16}
                        label={`Remove ${recipe.name} from plan`}
                        testID={`plan-remove-${e.id}`}
                        onPress={() => store.remove('mealPlan', e.id)}
                      />
                    </View>
                  );
                })}
              </ListGroup>
            ) : (
              <Pressable
                testID={`plan-add-${slot}`}
                accessibilityRole="button"
                accessibilityLabel={`Add a recipe for ${SLOT_LABEL[slot]}`}
                onPress={() => router.push({ pathname: '/meals/plan-add', params: { date: selected, slot } })}
                style={({ pressed }) => [styles.addSlot, { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.surfaceMuted : 'transparent' }]}>
                <Text variant="subhead" color="primaryText" style={{ fontWeight: '600' }}>
                  + Add a recipe
                </Text>
              </Pressable>
            )}
          </Section>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  weekHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  week: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 60,
    justifyContent: 'center',
  },
  summary: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  entry: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.lg, paddingRight: spacing.sm, paddingVertical: spacing.sm },
  addSlot: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    minHeight: MIN_TOUCH + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
