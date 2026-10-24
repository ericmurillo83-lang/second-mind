import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatRelativeDay, formatTime, formatTimeOfDay, monthShort } from '@/domain/dates';
import { CONTEXT_LABEL, formatGlucose, rangeStatus, RANGE_LABEL } from '@/domain/glucose';
import { FORM_LABEL, type ScheduledDose } from '@/domain/medications';
import type { Appointment, GlucoseReading, Settings } from '@/domain/types';
import { useStore } from '@/data/store-context';
import { Button, tapFeedback } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { Badge, RangeBadge, useRangeColors } from '@/ui/status';
import { MIN_TOUCH, radius, spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

export function GlucoseRow({ reading, settings }: { reading: GlucoseReading; settings: Settings }) {
  const status = rangeStatus(reading.valueMgdl, settings.targetLowMgdl, settings.targetHighMgdl);
  const rc = useRangeColors()[status];
  const { colors } = useTheme();
  const value = formatGlucose(reading.valueMgdl, settings.glucoseUnit);
  const time = formatTime(new Date(reading.takenAt));
  return (
    <Pressable
      testID={`glucose-row-${reading.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${settings.glucoseUnit}, ${RANGE_LABEL[status]}, ${CONTEXT_LABEL[reading.context]}, ${time}${reading.note ? `, note: ${reading.note}` : ''}`}
      accessibilityHint="Opens the reading to edit or delete"
      onPress={() => {
        tapFeedback();
        router.push({ pathname: '/glucose/edit', params: { id: reading.id } });
      }}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={[styles.valuePill, { backgroundColor: rc.bg }]}>
        <Text variant="headline" numeric style={{ color: rc.fg }}>
          {value}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{CONTEXT_LABEL[reading.context]}</Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          {time}
          {reading.note ? ` · ${reading.note}` : ''}
        </Text>
      </View>
      <RangeBadge status={status} compact />
      <Icon name="chevronRight" size={14} color={colors.textTertiary} />
    </Pressable>
  );
}

const DOSE_STATE_LABEL = {
  taken: 'Taken',
  skipped: 'Skipped',
  due: 'Due now',
  upcoming: 'Upcoming',
  missed: 'Not logged',
} as const;

/** One scheduled dose with quick "Taken" / "Skip" actions (or undo once logged). */
export function DoseRow({ dose }: { dose: ScheduledDose }) {
  const store = useStore();
  const { colors } = useTheme();
  const { medication: med, state } = dose;
  const logged = state === 'taken' || state === 'skipped';
  const tone = state === 'taken' ? 'success' : state === 'due' ? 'primary' : state === 'missed' ? 'warning' : 'neutral';
  const label = `${med.name} ${med.strength}, ${FORM_LABEL[med.form]}, ${formatTimeOfDay(dose.time)}, ${DOSE_STATE_LABEL[state]}`;
  return (
    <View style={styles.doseRow} testID={`dose-${med.id}-${dose.time}`}>
      <View style={styles.doseTop}>
        <View style={[styles.doseIcon, { backgroundColor: state === 'taken' ? colors.successSoft : colors.primarySoft }]}>
          <Icon name={state === 'taken' ? 'check' : 'meds'} size={18} color={state === 'taken' ? colors.success : colors.primaryText} />
        </View>
        <View style={{ flex: 1, gap: 3 }} accessible accessibilityLabel={label}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {med.name}
          </Text>
          <Text variant="footnote" color="textSecondary" numeric numberOfLines={1}>
            {med.strength ? `${med.strength} · ` : ''}
            {formatTimeOfDay(dose.time)}
          </Text>
        </View>
        <Badge label={DOSE_STATE_LABEL[state]} tone={tone} />
      </View>
      <View style={styles.doseActions}>
        {logged ? (
          <Button
            testID={`dose-undo-${med.id}-${dose.time}`}
            label="Undo"
            variant="ghost"
            size="sm"
            icon="undo"
            onPress={() => store.setDoseStatus(med.id, dose.date, dose.time, null)}
            accessibilityHint={`Clears the ${state} mark for ${med.name}`}
          />
        ) : (
          <>
            <Button
              testID={`dose-take-${med.id}-${dose.time}`}
              label="Taken"
              variant="soft"
              size="sm"
              icon="check"
              onPress={() => store.setDoseStatus(med.id, dose.date, dose.time, 'taken')}
              accessibilityHint={`Marks ${med.name} at ${formatTimeOfDay(dose.time)} as taken`}
            />
            <Button
              testID={`dose-skip-${med.id}-${dose.time}`}
              label="Skip"
              variant="ghost"
              size="sm"
              onPress={() => store.setDoseStatus(med.id, dose.date, dose.time, 'skipped')}
              accessibilityHint={`Marks ${med.name} at ${formatTimeOfDay(dose.time)} as skipped`}
            />
          </>
        )}
      </View>
    </View>
  );
}

export function DateBlock({ date }: { date: Date }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.dateBlock, { backgroundColor: colors.primarySoft }]}>
      <Text variant="caption" color="primaryText" style={{ fontWeight: '700' }}>
        {monthShort(date).toUpperCase()}
      </Text>
      <Text variant="title2" color="primaryText" numeric>
        {date.getDate()}
      </Text>
    </View>
  );
}

export function AppointmentRow({ appointment, now }: { appointment: Appointment; now: Date }) {
  const { colors } = useTheme();
  const at = new Date(appointment.startsAt);
  const when = `${formatRelativeDay(at, now)} · ${formatTime(at)}`;
  return (
    <Pressable
      testID={`appt-${appointment.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${appointment.title} with ${appointment.provider}, ${when}, ${appointment.location}`}
      onPress={() => {
        tapFeedback();
        router.push({ pathname: '/care/appointment', params: { id: appointment.id } });
      }}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <DateBlock date={at} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {appointment.title}
        </Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          {appointment.provider}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="clock" size={12} color={colors.textTertiary} />
          <Text variant="footnote" color="textSecondary">
            {when}
          </Text>
        </View>
      </View>
      <Icon name="chevronRight" size={14} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: MIN_TOUCH + 12,
  },
  valuePill: {
    minWidth: 64,
    paddingHorizontal: spacing.sm,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  doseTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  // Indented to line up with the text column (icon width + gap).
  doseActions: { flexDirection: 'row', gap: spacing.sm, marginLeft: 38 + spacing.md, flexWrap: 'wrap' },
  doseIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dateBlock: { width: 52, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
