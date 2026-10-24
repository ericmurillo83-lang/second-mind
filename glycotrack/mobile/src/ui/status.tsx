import { Pressable, StyleSheet, View } from 'react-native';

import { RANGE_LABEL, type RangeStatus } from '@/domain/glucose';

import { Icon, type IconName } from './icon';
import { Text } from './text';
import { radius, spacing } from './theme';
import { useTheme } from './theme-context';

const RANGE_ICON: Record<RangeStatus, IconName> = { below: 'arrowDown', in: 'inRange', above: 'arrowUp' };

export function useRangeColors() {
  const { colors } = useTheme();
  return {
    below: { fg: colors.below, bg: colors.belowSoft },
    in: { fg: colors.inRange, bg: colors.inRangeSoft },
    above: { fg: colors.above, bg: colors.aboveSoft },
  } as const;
}

/** Range status pill: color + icon + words, so it never relies on color alone. */
export function RangeBadge({ status, compact }: { status: RangeStatus; compact?: boolean }) {
  const c = useRangeColors()[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]} accessible accessibilityLabel={RANGE_LABEL[status]}>
      <Icon name={RANGE_ICON[status]} size={compact ? 12 : 14} color={c.fg} />
      {!compact && (
        <Text variant="caption" style={{ color: c.fg, fontWeight: '700' }}>
          {RANGE_LABEL[status]}
        </Text>
      )}
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'demo';
  icon?: IconName;
}) {
  const { colors } = useTheme();
  const t = {
    neutral: { fg: colors.textSecondary, bg: colors.surfaceMuted },
    primary: { fg: colors.primaryText, bg: colors.primarySoft },
    success: { fg: colors.success, bg: colors.successSoft },
    warning: { fg: colors.warning, bg: colors.warningSoft },
    danger: { fg: colors.danger, bg: colors.dangerSoft },
    demo: { fg: colors.demo, bg: colors.demoSoft },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon && <Icon name={icon} size={12} color={t.fg} />}
      <Text variant="caption" style={{ color: t.fg, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

/** Persistent notice that the visible data is fictional. */
export function DemoBanner({ onManage }: { onManage?: () => void }) {
  const { colors } = useTheme();
  return (
    <View
      testID="demo-banner"
      style={[styles.banner, { backgroundColor: colors.demoSoft, borderColor: colors.demo }]}
      accessible={!onManage}
      accessibilityRole="summary">
      <Icon name="sparkles" size={18} color={colors.demo} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="subhead" color="demo" style={{ fontWeight: '700' }}>
          Fictional sample data
        </Text>
        <Text variant="footnote" color="textSecondary">
          Readings, people and prescriptions shown are invented for demonstration. Not medical data.
        </Text>
      </View>
      {onManage ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Manage sample data" onPress={onManage} hitSlop={10}>
          <Text variant="subhead" color="demo" style={{ fontWeight: '700' }}>
            Manage
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SafetyNote({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.safety, { backgroundColor: colors.surfaceMuted }]} accessible>
      <Icon name="info" size={16} color={colors.textSecondary} />
      <Text variant="footnote" color="textSecondary" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

export function StatTile({
  label,
  value,
  unit,
  caption,
  icon,
  tone = 'primary',
  compact,
  testID,
}: {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  icon?: IconName;
  tone?: 'primary' | 'accent' | 'success' | 'warning';
  /** Narrower tile so three fit across a phone screen. */
  compact?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  const t = {
    primary: { fg: colors.primaryText, bg: colors.primarySoft },
    accent: { fg: colors.accent, bg: colors.accentSoft },
    success: { fg: colors.success, bg: colors.successSoft },
    warning: { fg: colors.warning, bg: colors.warningSoft },
  }[tone];
  return (
    <View
      testID={testID}
      style={[styles.tile, compact && styles.tileCompact, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}${caption ? `. ${caption}` : ''}`}>
      <View style={styles.tileHeader}>
        {icon ? (
          <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>
            <Icon name={icon} size={14} color={t.fg} />
          </View>
        ) : null}
        <Text variant="caption" color="textSecondary" style={{ flexShrink: 1 }}>
          {label}
        </Text>
      </View>
      <View style={styles.tileValue}>
        <Text variant={compact ? 'title2' : 'title'} numeric>
          {value}
        </Text>
        {unit ? (
          <Text variant="footnote" color="textSecondary">
            {unit}
          </Text>
        ) : null}
      </View>
      {caption ? (
        <Text variant="caption" color="textTertiary">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

export function ProgressBar({ progress, color, label }: { progress: number; color?: string; label: string }) {
  const { colors } = useTheme();
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color ?? colors.primary }]} />
    </View>
  );
}

/** Stacked below / in / above range bar with a text legend. */
export function TimeInRangeBar({ below, inRange, above }: { below: number; inRange: number; above: number }) {
  const { colors } = useTheme();
  const rc = useRangeColors();
  const segments: { key: RangeStatus; pct: number }[] = [
    { key: 'below', pct: below },
    { key: 'in', pct: inRange },
    { key: 'above', pct: above },
  ];
  return (
    <View style={{ gap: spacing.md }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${inRange}% in range, ${below}% below range, ${above}% above range`}
        style={[styles.tirTrack, { backgroundColor: colors.surfaceMuted }]}>
        {segments
          .filter((s) => s.pct > 0)
          .map((s) => (
            <View key={s.key} style={{ flex: s.pct, backgroundColor: rc[s.key].fg }} />
          ))}
      </View>
      <View style={styles.legend} accessible={false} importantForAccessibility="no-hide-descendants">
        {segments.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <Icon name={RANGE_ICON[s.key]} size={13} color={rc[s.key].fg} />
            <Text variant="footnote" color="textSecondary">
              {RANGE_LABEL[s.key]}
            </Text>
            <Text variant="subhead" numeric style={{ fontWeight: '700' }}>
              {s.pct}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  banner: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: spacing.md,
  },
  safety: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, alignItems: 'flex-start' },
  tile: {
    flex: 1,
    minWidth: 140,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  tileCompact: { minWidth: 92, padding: spacing.md },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tileIcon: { width: 24, height: 24, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  tileValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' },
  track: { height: 10, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  tirTrack: { height: 14, borderRadius: radius.pill, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
