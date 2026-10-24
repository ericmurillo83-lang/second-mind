import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppData, useHasDemoData, useRecipesById, useSettings } from '@/data/store-context';
import { formatLongDate, formatTimeAgo, greeting, toDateKey } from '@/domain/dates';
import {
  computeStats,
  CONTEXT_LABEL,
  formatGlucose,
  latestReading,
  rangeStatus,
  RANGE_LABEL,
  readingsInLastHours,
  readingsOnDay,
} from '@/domain/glucose';
import { formatCarbs, goalProgress, mealsOnDay, planForDay, SLOT_LABEL, totalCarbs } from '@/domain/meals';
import { nextDoses, scheduleForDay } from '@/domain/medications';
import { MEAL_SLOTS } from '@/domain/types';
import { AppointmentRow, DoseRow } from '@/features/components';
import { useNow } from '@/features/hooks';
import { tapFeedback, Button, IconButton } from '@/ui/button';
import { GlucoseChart } from '@/ui/glucose-chart';
import { Icon, type IconName } from '@/ui/icon';
import { Card, EmptyState, ListGroup, ListRow, Screen, Section } from '@/ui/layout';
import { DemoBanner, ProgressBar, RangeBadge, SafetyNote, StatTile, useRangeColors } from '@/ui/status';
import { Text } from '@/ui/text';
import { elevation, radius, spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

export default function HomeScreen() {
  const now = useNow();
  const { colors } = useTheme();
  const settings = useSettings();
  const name = useAppData((d) => d.profile.displayName);
  const glucose = useAppData((d) => d.glucose);
  const meals = useAppData((d) => d.meals);
  const plan = useAppData((d) => d.mealPlan);
  const medications = useAppData((d) => d.medications);
  const doseLogs = useAppData((d) => d.doseLogs);
  const appointments = useAppData((d) => d.appointments);
  const recipesById = useRecipesById();
  const hasDemo = useHasDemoData();

  const unit = settings.glucoseUnit;
  const latest = useMemo(() => latestReading(glucose), [glucose]);
  const last24 = useMemo(() => readingsInLastHours(glucose, 24, now), [glucose, now]);
  const todayStats = useMemo(
    () => computeStats(readingsOnDay(glucose, now), settings.targetLowMgdl, settings.targetHighMgdl),
    [glucose, now, settings.targetLowMgdl, settings.targetHighMgdl],
  );
  const todayKey = toDateKey(now);
  const carbsToday = useMemo(() => totalCarbs(mealsOnDay(meals, todayKey)), [meals, todayKey]);
  const carbProgress = goalProgress(carbsToday, settings.dailyCarbGoal);
  const doses = useMemo(() => nextDoses(scheduleForDay(medications, doseLogs, now, now), 3), [medications, doseLogs, now]);
  const nextAppt = useMemo(
    () =>
      appointments
        .filter((a) => new Date(a.startsAt).getTime() >= now.getTime())
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0],
    [appointments, now],
  );
  const todaysPlan = useMemo(() => planForDay(plan, todayKey), [plan, todayKey]);

  return (
    <Screen
      testID="home-screen"
      eyebrow={formatLongDate(now)}
      title={name ? `${greeting(now)}, ${name}` : greeting(now)}
      headerRight={<IconButton testID="open-settings" icon="settings" label="Settings" onPress={() => router.push('/settings')} />}>
      {hasDemo ? <DemoBanner onManage={() => router.push('/settings')} /> : null}

      <LatestReadingCard
        latest={latest}
        now={now}
        readings24h={last24}
        settings={settings}
      />

      <QuickActions />

      <Section title="Today">
        <View style={styles.tiles}>
          <StatTile
            testID="stat-avg-today"
            icon="chart"
            label="Average"
            value={todayStats.averageMgdl === null ? '—' : formatGlucose(todayStats.averageMgdl, unit)}
            unit={todayStats.averageMgdl === null ? undefined : unit}
            caption={`${todayStats.count} reading${todayStats.count === 1 ? '' : 's'}`}
          />
          <StatTile
            testID="stat-tir-today"
            icon="inRange"
            tone="success"
            label="In your range"
            value={todayStats.count ? `${todayStats.pctIn}%` : '—'}
            caption={todayStats.count ? `${todayStats.inRange} of ${todayStats.count}` : 'No readings yet'}
          />
        </View>
        <Card>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Carbs today ${formatCarbs(carbsToday)}${settings.dailyCarbGoal ? ` of ${settings.dailyCarbGoal} gram goal` : ''}. Opens meals.`}
            onPress={() => {
              tapFeedback();
              router.push('/meals');
            }}
            style={{ gap: spacing.md }}>
            <View style={styles.carbHeader}>
              <View style={[styles.miniIcon, { backgroundColor: colors.accentSoft }]}>
                <Icon name="carbs" size={16} color={colors.accent} />
              </View>
              <Text variant="headline" style={{ flex: 1 }}>
                Carbs today
              </Text>
              <Text variant="title2" numeric testID="carbs-today">
                {formatCarbs(carbsToday)}
              </Text>
              {settings.dailyCarbGoal ? (
                <Text variant="footnote" color="textSecondary">
                  / {settings.dailyCarbGoal} g
                </Text>
              ) : null}
            </View>
            {carbProgress !== null ? (
              <ProgressBar progress={carbProgress} color={colors.accent} label="Carbohydrates compared with your daily goal" />
            ) : (
              <Text variant="footnote" color="textSecondary">
                Set a personal daily goal in Settings if your care team recommends one.
              </Text>
            )}
          </Pressable>
        </Card>
      </Section>

      <Section title="Medications" action={{ label: 'See all', onPress: () => router.push('/meds') }}>
        {medications.some((m) => m.active) ? (
          doses.length ? (
            <ListGroup testID="home-doses">{doses.map((d) => <DoseRow key={d.key} dose={d} />)}</ListGroup>
          ) : (
            <Card>
              <View style={styles.allDone}>
                <Icon name="checkCircle" size={22} color={colors.success} />
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  All of today’s scheduled doses are logged.
                </Text>
              </View>
            </Card>
          )
        ) : (
          <EmptyState
            icon="meds"
            title="No medications yet"
            message="Add your prescriptions to get a daily checklist and optional reminders."
            action={<Button label="Add medication" size="sm" variant="soft" icon="plus" onPress={() => router.push('/meds/edit')} />}
          />
        )}
      </Section>

      <Section title="Next appointment" action={{ label: 'See all', onPress: () => router.push('/care') }}>
        {nextAppt ? (
          <ListGroup>
            <AppointmentRow appointment={nextAppt} now={now} />
          </ListGroup>
        ) : (
          <EmptyState
            icon="calendar"
            title="Nothing scheduled"
            message="Keep visits, prep questions and locations in one place."
            action={<Button label="Add appointment" size="sm" variant="soft" icon="plus" onPress={() => router.push('/care/appointment')} />}
          />
        )}
      </Section>

      <Section title="Today’s meal plan" action={{ label: 'Plan', onPress: () => router.push('/meals') }}>
        {todaysPlan.length ? (
          <ListGroup>
            {[...todaysPlan]
              .sort((a, b) => MEAL_SLOTS.indexOf(a.slot) - MEAL_SLOTS.indexOf(b.slot))
              .map((p) => {
                const recipe = recipesById.get(p.recipeId);
                if (!recipe) return null;
                return (
                  <ListRow
                    key={p.id}
                    icon="meals"
                    iconBackground={colors.accentSoft}
                    iconColor={colors.accent}
                    title={recipe.name}
                    subtitle={SLOT_LABEL[p.slot]}
                    detail={formatCarbs(recipe.carbsPerServing * p.servings)}
                    onPress={() => router.push({ pathname: '/meals/recipe/[id]', params: { id: recipe.id } })}
                  />
                );
              })}
          </ListGroup>
        ) : (
          <EmptyState
            icon="book"
            title="No meals planned today"
            message="Pick recipes for the week and see planned carbohydrates at a glance."
          />
        )}
      </Section>

      <SafetyNote>
        GlycoTrack helps you log and organize. It does not give medical advice, calculate doses or send glucose alerts.
        Follow your care team’s plan.
      </SafetyNote>
    </Screen>
  );
}

function LatestReadingCard({
  latest,
  now,
  readings24h,
  settings,
}: {
  latest: ReturnType<typeof latestReading>;
  now: Date;
  readings24h: ReturnType<typeof readingsInLastHours>;
  settings: ReturnType<typeof useSettings>;
}) {
  const { colors } = useTheme();
  const rcAll = useRangeColors();
  if (!latest) {
    return (
      <EmptyState
        icon="glucose"
        title="Log your first reading"
        message="Add a glucose value from your meter to start seeing your day."
        action={<Button testID="log-first-reading" label="Log glucose" icon="plus" onPress={() => router.push('/glucose/edit')} />}
      />
    );
  }
  const status = rangeStatus(latest.valueMgdl, settings.targetLowMgdl, settings.targetHighMgdl);
  const rc = rcAll[status];
  const value = formatGlucose(latest.valueMgdl, settings.glucoseUnit);
  const at = new Date(latest.takenAt);
  return (
    <View testID="latest-card" style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }, elevation(colors, 2)]}>
      <View style={styles.heroTop}>
        <View
          style={{ flex: 1, gap: spacing.xs }}
          accessible
          accessibilityLabel={`Latest reading ${value} ${settings.glucoseUnit}, ${RANGE_LABEL[status]}, ${CONTEXT_LABEL[latest.context]}, ${formatTimeAgo(at, now)}`}>
          <Text variant="overline" color="textSecondary">
            Latest reading
          </Text>
          <View style={styles.valueRow}>
            <Text variant="display" numeric testID="latest-value" style={{ color: colors.text }}>
              {value}
            </Text>
            <Text variant="headline" color="textSecondary">
              {settings.glucoseUnit}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <RangeBadge status={status} />
            <Text variant="footnote" color="textSecondary">
              {CONTEXT_LABEL[latest.context]} · {formatTimeAgo(at, now)}
            </Text>
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: rc.bg }]}>
          <Icon name="glucose" size={22} color={rc.fg} />
        </View>
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text variant="caption" color="textTertiary">
          Last 24 hours · {readings24h.length} reading{readings24h.length === 1 ? '' : 's'}
        </Text>
        <GlucoseChart
          testID="home-sparkline"
          compact
          height={64}
          readings={readings24h}
          from={new Date(now.getTime() - 24 * 3_600_000)}
          to={now}
          lowMgdl={settings.targetLowMgdl}
          highMgdl={settings.targetHighMgdl}
          unit={settings.glucoseUnit}
          accessibilityLabel={`Chart of ${readings24h.length} readings in the last 24 hours with your target range shaded`}
        />
      </View>
      <Button testID="log-glucose" label="Log glucose" icon="plus" onPress={() => router.push('/glucose/edit')} />
    </View>
  );
}

function QuickActions() {
  const { colors } = useTheme();
  const actions: { label: string; icon: IconName; onPress: () => void; testID: string }[] = [
    { label: 'Meal', icon: 'meals', onPress: () => router.push('/meals/log'), testID: 'quick-meal' },
    { label: 'Medication', icon: 'meds', onPress: () => router.push('/meds'), testID: 'quick-meds' },
    { label: 'Note', icon: 'note', onPress: () => router.push('/care/note'), testID: 'quick-note' },
    { label: 'Appointment', icon: 'calendar', onPress: () => router.push('/care/appointment'), testID: 'quick-appt' },
  ];
  return (
    <View style={styles.quick} accessibilityRole="toolbar" accessibilityLabel="Quick actions">
      {actions.map((a) => (
        <Pressable
          key={a.label}
          testID={a.testID}
          accessibilityRole="button"
          accessibilityLabel={a.label === 'Medication' ? 'Medication checklist' : `Add ${a.label.toLowerCase()}`}
          onPress={() => {
            tapFeedback();
            a.onPress();
          }}
          style={({ pressed }) => [
            styles.quickItem,
            { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.border },
          ]}>
          <View style={[styles.quickIcon, { backgroundColor: colors.primarySoft }]}>
            <Icon name={a.icon} size={20} color={colors.primaryText} />
          </View>
          <Text variant="caption" style={{ fontWeight: '600' }} numberOfLines={1}>
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  carbHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  miniIcon: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  allDone: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hero: { borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, padding: spacing.xl, gap: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  statusDot: { width: 48, height: 48, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  quick: { flexDirection: 'row', gap: spacing.sm },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 76,
  },
  quickIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
