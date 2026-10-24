import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { adjustableProps } from './a11y';
import { tapFeedback } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';
import { MIN_TOUCH, radius, spacing } from './theme';
import { useTheme } from './theme-context';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/** Segmented control exposed to assistive tech as a tab list. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      style={[styles.segmented, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={testID ? `${testID}-${o.value}` : undefined}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            aria-selected={selected}
            accessibilityLabel={o.label}
            onPress={() => {
              tapFeedback();
              onChange(o.value);
            }}
            style={[
              styles.segment,
              selected && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
            ]}>
            <Text
              variant="subhead"
              color={selected ? 'text' : 'textSecondary'}
              style={{ fontWeight: selected ? '700' : '500' }}
              numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      accessibilityLabel={label}
      onPress={() => {
        tapFeedback();
        onPress?.();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.borderStrong,
        },
      ]}>
      {icon && <Icon name={icon} size={14} color={selected ? colors.textOnPrimary : colors.textSecondary} />}
      <Text variant="subhead" style={{ color: selected ? colors.textOnPrimary : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Horizontally scrolling chip row for filters. */
export function ChipScroller({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}>
      {children}
    </ScrollView>
  );
}

export function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  icon,
  testID,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  icon?: IconName;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggleRow}>
      {icon ? (
        <View style={[styles.iconTile, { backgroundColor: colors.primarySoft }]}>
          <Icon name={icon} size={19} color={colors.primaryText} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="footnote" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        testID={testID}
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          tapFeedback();
          onValueChange(v);
        }}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.borderStrong}
      />
    </View>
  );
}

/** Numeric stepper with large +/- targets; announced as an adjustable control. */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  format = (v) => String(v),
  testID,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min: number;
  max: number;
  format?: (v: number) => string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const dec = () => onChange(clamp(value - step));
  const inc = () => onChange(clamp(value + step));
  return (
    <View style={styles.stepperRow}>
      <Text variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </Text>
      <View
        testID={testID}
        {...adjustableProps({ label, valueText: format(value), onIncrement: inc, onDecrement: dec })}
        style={[styles.stepper, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
        <Pressable
          testID={testID ? `${testID}-dec` : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          disabled={value <= min}
          onPress={() => {
            tapFeedback();
            dec();
          }}
          style={[styles.stepperBtn, value <= min && { opacity: 0.4 }]}>
          <Icon name="minus" size={18} />
        </Pressable>
        <Text variant="headline" numeric style={styles.stepperValue}>
          {format(value)}
        </Text>
        <Pressable
          testID={testID ? `${testID}-inc` : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          disabled={value >= max}
          onPress={() => {
            tapFeedback();
            inc();
          }}
          style={[styles.stepperBtn, value >= max && { opacity: 0.4 }]}>
          <Icon name="plus" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flex: 1,
    minHeight: MIN_TOUCH - 6,
    borderRadius: radius.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md + 2,
    minHeight: 40,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: MIN_TOUCH + 12,
  },
  iconTile: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexWrap: 'wrap',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stepperBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 72, textAlign: 'center' },
});
