import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppData, useSettings } from '@/data/store-context';
import { addDays, formatRelativeDay, formatTime, toDateKey } from '@/domain/dates';
import { carbsBySlot, formatCarbs, goalProgress, mealsOnDay, SLOT_LABEL, totalCarbs } from '@/domain/meals';
import { MEAL_SLOTS } from '@/domain/types';
import { useNow } from '@/features/hooks';
import { Button } from '@/ui/button';
import { Card, EmptyState, ListGroup, ListRow, Section } from '@/ui/layout';
import { Badge, ProgressBar, SafetyNote } from '@/ui/status';
import { Text } from '@/ui/text';
import { spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

export function TodayMealsView() {
  const now = useNow();
  const { colors } = useTheme();
  const settings = useSettings();
  const meals = useAppData((d) => d.meals);
  const todayKey = toDateKey(now);
  const today = useMemo(() => mealsOnDay(meals, todayKey), [meals, todayKey]);
  const total = totalCarbs(today);
  const bySlot = carbsBySlot(today);
  const progress = goalProgress(total, settings.dailyCarbGoal);
  const history = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const day = addDays(now, -(i + 1));
        const list = mealsOnDay(meals, toDateKey(day));
        return { day, count: list.length, carbs: totalCarbs(list) };
      }).filter((h) => h.count > 0),
    [meals, now],
  );

  return (
    <>
      <Card>
        <View style={{ gap: spacing.md }}>
          <View style={styles.totalRow}>
            <View style={{ flex: 1 }}>
              <Text variant="overline" color="textSecondary">
                Carbohydrates today
              </Text>
              <View style={styles.valueRow}>
                <Text variant="largeTitle" numeric testID="meals-carbs-total">
                  {formatCarbs(total)}
                </Text>
                {settings.dailyCarbGoal ? (
                  <Text variant="callout" color="textSecondary">
                    of {settings.dailyCarbGoal} g goal
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
          {progress !== null ? (
            <ProgressBar progress={progress} color={colors.accent} label="Carbohydrates compared with your daily goal" />
          ) : null}
          <View style={styles.slots}>
            {MEAL_SLOTS.map((s) => (
              <View key={s} style={[styles.slot, { backgroundColor: colors.surfaceMuted }]} accessible accessibilityLabel={`${SLOT_LABEL[s]} ${formatCarbs(bySlot[s])}`}>
                <Text variant="caption" color="textSecondary">
                  {SLOT_LABEL[s]}
                </Text>
                <Text variant="headline" numeric>
                  {formatCarbs(bySlot[s])}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      <Section title="Logged today" action={{ label: 'Log meal', onPress: () => router.push('/meals/log') }}>
        {today.length ? (
          <ListGroup testID="today-meals">
            {today.map((m) => (
              <ListRow
                key={m.id}
                testID={`meal-${m.id}`}
                icon="meals"
                iconBackground={colors.accentSoft}
                iconColor={colors.accent}
                title={m.title}
                subtitle={`${SLOT_LABEL[m.slot]} · ${formatTime(new Date(m.eatenAt))}${m.servings && m.servings !== 1 ? ` · ${m.servings} servings` : ''}`}
                detail={formatCarbs(m.carbs)}
                onPress={() => router.push({ pathname: '/meals/log', params: { id: m.id } })}
              />
            ))}
          </ListGroup>
        ) : (
          <EmptyState
            icon="meals"
            title="Nothing logged yet today"
            message="Log what you eat with its carbohydrates, or log a planned recipe in one tap."
            action={<Button label="Log a meal" size="sm" variant="soft" icon="plus" onPress={() => router.push('/meals/log')} />}
          />
        )}
      </Section>

      {history.length ? (
        <Section title="Previous days">
          <ListGroup>
            {history.map((h) => (
              <ListRow
                key={toDateKey(h.day)}
                title={formatRelativeDay(h.day, now)}
                subtitle={`${h.count} meal${h.count === 1 ? '' : 's'} logged`}
                trailing={<Badge label={formatCarbs(h.carbs)} tone="neutral" />}
              />
            ))}
          </ListGroup>
        </Section>
      ) : null}

      <SafetyNote>
        Carbohydrate values are what you enter or what a recipe lists, and may not be exact. GlycoTrack does not convert carbs
        into insulin or any medication dose.
      </SafetyNote>
    </>
  );
}

const styles = StyleSheet.create({
  totalRow: { flexDirection: 'row', alignItems: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  slots: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  slot: { flex: 1, minWidth: 72, borderRadius: 12, padding: spacing.sm, gap: 2 },
});
