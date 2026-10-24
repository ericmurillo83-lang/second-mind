import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import {
  addDays,
  formatRelativeDay,
  formatTimeOfDay,
  fromDateKey,
  monthGrid,
  monthLong,
  parseTimeOfDay,
  toDateKey,
} from '@/domain/dates';
import type { DateKey, TimeOfDay } from '@/domain/types';

import { adjustableProps } from './a11y';
import { tapFeedback } from './button';
import { Chip } from './controls';
import { Icon } from './icon';
import { Text } from './text';
import { MIN_TOUCH, radius, spacing } from './theme';
import { useTheme } from './theme-context';

export function FieldLabel({ label, hint, nativeID }: { label: string; hint?: string; nativeID?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="subhead" nativeID={nativeID} style={{ fontWeight: '600' }}>
        {label}
      </Text>
      {hint ? (
        <Text variant="footnote" color="textSecondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  hint?: string;
  error?: string;
  suffix?: string;
  large?: boolean;
}

export function TextField({ label, hint, error, suffix, large, multiline, testID, ...input }: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const id = testID ? `${testID}-label` : undefined;
  return (
    <View style={{ gap: spacing.sm }}>
      <FieldLabel label={label} hint={hint} nativeID={id} />
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.borderStrong,
            borderWidth: focused || error ? 2 : 1,
          },
          multiline && { alignItems: 'flex-start' },
        ]}>
        <TextInput
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={hint}
          aria-labelledby={id}
          placeholderTextColor={colors.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          maxFontSizeMultiplier={2}
          style={[
            styles.input,
            { color: colors.text },
            large && styles.inputLarge,
            multiline && styles.inputMultiline,
          ]}
          {...input}
        />
        {suffix ? (
          <Text variant={large ? 'title2' : 'body'} color="textSecondary">
            {suffix}
          </Text>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Icon name="warning" size={14} color={colors.danger} />
          <Text variant="footnote" color="danger" style={{ flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Single-choice picker rendered as wrapping chips (works well with screen readers). */
export function ChoiceField<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  testID,
}: {
  label: string;
  hint?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testID?: string;
}) {
  return (
    <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <FieldLabel label={label} hint={hint} />
      <View style={styles.chipWrap}>
        {options.map((o) => (
          <Chip
            key={o.value}
            testID={testID ? `${testID}-${o.value}` : undefined}
            label={o.label}
            selected={o.value === value}
            onPress={() => onChange(o.value)}
          />
        ))}
      </View>
    </View>
  );
}

/** Date picker: quick choices plus an expandable month calendar. Pure JS, works on every platform. */
export function DateField({
  label,
  value,
  onChange,
  allowFuture = true,
  allowPast = true,
  testID,
}: {
  label: string;
  value: DateKey;
  onChange: (v: DateKey) => void;
  allowFuture?: boolean;
  allowPast?: boolean;
  testID?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = fromDateKey(value);
  const [cursor, setCursor] = useState({ y: selected.getFullYear(), m: selected.getMonth() });
  const today = toDateKey(new Date());
  const quick = allowFuture && !allowPast
    ? [today, toDateKey(addDays(new Date(), 1)), toDateKey(addDays(new Date(), 7))]
    : allowPast && !allowFuture
      ? [today, toDateKey(addDays(new Date(), -1))]
      : [today, toDateKey(addDays(new Date(), 1))];

  const moveMonth = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const disabled = (key: DateKey) => (!allowFuture && key > today) || (!allowPast && key < today);

  return (
    <View style={{ gap: spacing.sm }}>
      <FieldLabel label={label} />
      <View style={styles.chipWrap}>
        {quick.map((k) => (
          <Chip
            key={k}
            label={formatRelativeDay(fromDateKey(k)).replace(/^(\w{3}), /, '$1 ')}
            selected={value === k}
            onPress={() => onChange(k)}
          />
        ))}
        <Chip
          testID={testID ? `${testID}-calendar` : undefined}
          icon="calendar"
          label={quick.includes(value) ? 'Pick a date' : formatRelativeDay(selected)}
          selected={!quick.includes(value)}
          onPress={() => {
            setCursor({ y: selected.getFullYear(), m: selected.getMonth() });
            setOpen((o) => !o);
          }}
        />
      </View>
      {open ? (
        <View style={[styles.calendar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.calHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => moveMonth(-1)} style={styles.calNav}>
              <Icon name="chevronLeft" size={18} />
            </Pressable>
            <Text variant="headline" accessibilityRole="header">
              {monthLong(new Date(cursor.y, cursor.m, 1))} {cursor.y}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => moveMonth(1)} style={styles.calNav}>
              <Icon name="chevronRight" size={18} />
            </Pressable>
          </View>
          <View style={styles.calGrid}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <Text key={`h${i}`} variant="caption" color="textTertiary" align="center" style={styles.calCell} accessible={false}>
                {d}
              </Text>
            ))}
            {monthGrid(cursor.y, cursor.m).map((d) => {
              const key = toDateKey(d);
              const inMonth = d.getMonth() === cursor.m;
              const isSel = key === value;
              const isDisabled = disabled(key);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={formatRelativeDay(d)}
                  accessibilityState={{ selected: isSel, disabled: isDisabled }}
                  disabled={isDisabled}
                  onPress={() => {
                    tapFeedback();
                    onChange(key);
                    setOpen(false);
                  }}
                  style={[styles.calCell, styles.calDay, isSel && { backgroundColor: colors.primary }]}>
                  <Text
                    variant="callout"
                    numeric
                    style={{
                      color: isSel ? colors.textOnPrimary : inMonth ? colors.text : colors.textTertiary,
                      opacity: isDisabled ? 0.35 : 1,
                      fontWeight: key === today ? '700' : '400',
                    }}>
                    {d.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Time picker with hour and 5-minute steppers plus AM/PM; announced as adjustable values. */
export function TimeField({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: TimeOfDay;
  onChange: (v: TimeOfDay) => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  const { hour, minute } = parseTimeOfDay(value);
  const set = (h: number, m: number) => {
    const hh = ((h % 24) + 24) % 24;
    const mm = ((m % 60) + 60) % 60;
    onChange(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  };
  const pm = hour >= 12;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const stepBtn = (lbl: string, icon: 'plus' | 'minus', fn: () => void, id?: string) => (
    <Pressable
      testID={id}
      accessibilityRole="button"
      accessibilityLabel={lbl}
      onPress={() => {
        tapFeedback();
        fn();
      }}
      style={styles.timeBtn}>
      <Icon name={icon} size={16} />
    </Pressable>
  );
  return (
    <View style={{ gap: spacing.sm }}>
      <FieldLabel label={label} />
      <View
        accessible={false}
        style={[styles.timeRow, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
        <View
          style={styles.timeUnit}
          {...adjustableProps({
            label: `${label}, hour`,
            valueText: formatTimeOfDay(value),
            onIncrement: () => set(hour + 1, minute),
            onDecrement: () => set(hour - 1, minute),
          })}>
          {stepBtn(`${label}: one hour earlier`, 'minus', () => set(hour - 1, minute), testID ? `${testID}-hour-dec` : undefined)}
          <Text variant="title2" numeric style={styles.timeValue}>
            {h12}
          </Text>
          {stepBtn(`${label}: one hour later`, 'plus', () => set(hour + 1, minute), testID ? `${testID}-hour-inc` : undefined)}
        </View>
        <Text variant="title2" color="textSecondary">
          :
        </Text>
        <View
          style={styles.timeUnit}
          {...adjustableProps({
            label: `${label}, minutes`,
            valueText: formatTimeOfDay(value),
            onIncrement: () => set(hour, minute + 5),
            onDecrement: () => set(hour, minute - 5),
          })}>
          {stepBtn(`${label}: 5 minutes earlier`, 'minus', () => set(hour, minute - 5))}
          <Text variant="title2" numeric style={styles.timeValue}>
            {String(minute).padStart(2, '0')}
          </Text>
          {stepBtn(`${label}: 5 minutes later`, 'plus', () => set(hour, minute + 5))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pm ? 'PM, switch to AM' : 'AM, switch to PM'}
          onPress={() => set(pm ? hour - 12 : hour + 12, minute)}
          style={[styles.ampm, { backgroundColor: colors.primarySoft }]}>
          <Text variant="subhead" color="primaryText" style={{ fontWeight: '700' }}>
            {pm ? 'PM' : 'AM'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    minHeight: MIN_TOUCH + 4,
  },
  // minWidth 0 lets the input shrink in its row; web inputs otherwise keep a font-size-based width.
  input: { flex: 1, minWidth: 0, fontSize: 17, paddingVertical: spacing.md, minHeight: MIN_TOUCH },
  inputLarge: { fontSize: 40, fontWeight: '700', paddingVertical: spacing.md },
  inputMultiline: { minHeight: 120, textAlignVertical: 'top' },
  errorRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  calendar: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calNav: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center' },
  calDay: { height: 44, borderRadius: radius.pill },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  timeUnit: { flexDirection: 'row', alignItems: 'center' },
  timeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  timeValue: { minWidth: 34, textAlign: 'center' },
  ampm: {
    marginLeft: 'auto',
    minHeight: 44,
    minWidth: 56,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
