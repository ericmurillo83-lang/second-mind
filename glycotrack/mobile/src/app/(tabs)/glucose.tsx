import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppData, useSettings } from '@/data/store-context';
import { addDays, formatRelativeDay, fromDateKey, startOfDay } from '@/domain/dates';
import {
  computeStats,
  CONTEXT_LABEL,
  formatGlucose,
  groupByDay,
  readingsInLastDays,
  readingsInLastHours,
} from '@/domain/glucose';
import { GLUCOSE_CONTEXTS, type GlucoseContext } from '@/domain/types';
import { GlucoseRow } from '@/features/components';
import { useNow } from '@/features/hooks';
import { Button, IconButton } from '@/ui/button';
import { Chip, ChipScroller, SegmentedControl } from '@/ui/controls';
import { GlucoseChart } from '@/ui/glucose-chart';
import { Card, EmptyState, ListGroup, Screen, Section } from '@/ui/layout';
import { SafetyNote, StatTile, TimeInRangeBar } from '@/ui/status';
import { Text } from '@/ui/text';
import { spacing } from '@/ui/theme';

type Period = '1' | '7' | '14' | '30';
const PERIODS = [
  { value: '1', label: '24 hr' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
] as const;

export default function GlucoseScreen() {
  const now = useNow();
  const settings = useSettings();
  const all = useAppData((d) => d.glucose);
  const [period, setPeriod] = useState<Period>('7');
  const [context, setContext] = useState<GlucoseContext | 'all'>('all');
  const unit = settings.glucoseUnit;
  const { targetLowMgdl: low, targetHighMgdl: high } = settings;

  const days = Number(period);
  const windowed = useMemo(
    () => (days === 1 ? readingsInLastHours(all, 24, now) : readingsInLastDays(all, days, now)),
    [all, days, now],
  );
  const filtered = useMemo(
    () => (context === 'all' ? windowed : windowed.filter((r) => r.context === context)),
    [windowed, context],
  );
  const stats = useMemo(() => computeStats(filtered, low, high), [filtered, low, high]);
  const groups = useMemo(() => groupByDay(filtered, (r) => r.takenAt), [filtered]);
  const from = days === 1 ? new Date(now.getTime() - 24 * 3_600_000) : startOfDay(addDays(now, -(days - 1)));
  const fmt = (v: number | null) => (v === null ? '—' : formatGlucose(v, unit));
  const periodLabel = PERIODS.find((p) => p.value === period)!.label;

  const chartSummary = stats.count
    ? `Glucose chart for the last ${periodLabel}: ${stats.count} readings, average ${fmt(stats.averageMgdl)} ${unit}, ` +
      `lowest ${fmt(stats.minMgdl)}, highest ${fmt(stats.maxMgdl)}. ${stats.pctIn}% within your target range of ` +
      `${formatGlucose(low, unit)} to ${formatGlucose(high, unit)}.`
    : `No readings in the last ${periodLabel}.`;

  return (
    <Screen
      testID="glucose-screen"
      title="Glucose"
      subtitle="Your logged readings"
      headerRight={<IconButton testID="add-glucose" icon="plus" variant="filled" label="Log glucose" onPress={() => router.push('/glucose/edit')} />}>
      <SegmentedControl testID="period" options={PERIODS} value={period} onChange={setPeriod} />

      {all.length === 0 ? (
        <EmptyState
          icon="glucose"
          title="No readings yet"
          message="Log values from your meter to see your history, averages and how often you’re in your target range."
          action={<Button label="Log glucose" icon="plus" onPress={() => router.push('/glucose/edit')} />}
        />
      ) : (
        <>
          <Card>
            <View style={styles.chartHeader}>
              <Text variant="headline">Readings</Text>
              <Text variant="footnote" color="textSecondary">
                Target {formatGlucose(low, unit)}–{formatGlucose(high, unit)} {unit}
              </Text>
            </View>
            <GlucoseChart
              testID="glucose-chart"
              readings={filtered}
              from={from}
              to={now}
              lowMgdl={low}
              highMgdl={high}
              unit={unit}
              height={210}
              accessibilityLabel={chartSummary}
            />
          </Card>

          <ChipScroller>
            <Chip label="All" selected={context === 'all'} onPress={() => setContext('all')} testID="ctx-all" />
            {GLUCOSE_CONTEXTS.filter((c) => c !== 'other').map((c) => (
              <Chip key={c} label={CONTEXT_LABEL[c]} selected={context === c} onPress={() => setContext(c)} testID={`ctx-${c}`} />
            ))}
          </ChipScroller>

          <View style={styles.tiles}>
            <StatTile testID="stat-average" icon="chart" label="Average" value={fmt(stats.averageMgdl)} unit={stats.count ? unit : undefined} caption={`${stats.count} readings`} />
            <StatTile testID="stat-in-range" icon="inRange" tone="success" label="In range" value={stats.count ? `${stats.pctIn}%` : '—'} caption={`${stats.inRange} of ${stats.count}`} />
          </View>
          <View style={styles.tiles}>
            <StatTile icon="arrowDown" tone="warning" label="Lowest" value={fmt(stats.minMgdl)} unit={stats.count ? unit : undefined} />
            <StatTile icon="arrowUp" tone="warning" label="Highest" value={fmt(stats.maxMgdl)} unit={stats.count ? unit : undefined} />
          </View>

          {stats.count ? (
            <Card>
              <View style={{ gap: spacing.md }}>
                <Text variant="headline">Readings in your target range</Text>
                <TimeInRangeBar below={stats.pctBelow} inRange={stats.pctIn} above={stats.pctAbove} />
                <Text variant="footnote" color="textTertiary">
                  Based on {stats.count} manual readings, not continuous monitoring. Your range is set in Settings.
                </Text>
              </View>
            </Card>
          ) : null}

          <Section title="History">
            {groups.length === 0 ? (
              <Text variant="callout" color="textSecondary">
                No readings match this view.
              </Text>
            ) : (
              groups.map((g) => (
                <View key={g.dateKey} style={{ gap: spacing.sm }}>
                  <Text variant="overline" color="textSecondary" accessibilityRole="header">
                    {formatRelativeDay(fromDateKey(g.dateKey), now)}
                  </Text>
                  <ListGroup>
                    {g.items.map((r) => (
                      <GlucoseRow key={r.id} reading={r} settings={settings} />
                    ))}
                  </ListGroup>
                </View>
              ))
            )}
          </Section>
        </>
      )}
      <SafetyNote>
        GlycoTrack shows the values you log. It does not monitor glucose, predict trends or send alerts. Keep using your meter or
        CGM and its alarms as directed.
      </SafetyNote>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.sm },
  tiles: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
});
