import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppData, useSettings, useStore } from '@/data/store-context';
import { formatRelativeDay, formatTimeOfDay, fromDateKey } from '@/domain/dates';
import { adherence, FORM_LABEL, refillSoon, scheduleForDay } from '@/domain/medications';
import type { Medication } from '@/domain/types';
import { DoseRow } from '@/features/components';
import { useNow } from '@/features/hooks';
import { getReminderPermission, remindersSupported, requestReminderPermission, type PermissionState } from '@/services/reminders';
import { Button, IconButton } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Card, EmptyState, ListGroup, ListRow, Screen, Section } from '@/ui/layout';
import { Badge, ProgressBar, SafetyNote, StatTile } from '@/ui/status';
import { Text } from '@/ui/text';
import { radius, spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

export default function MedsScreen() {
  const now = useNow();
  const { colors } = useTheme();
  const medications = useAppData((d) => d.medications);
  const doseLogs = useAppData((d) => d.doseLogs);
  const doses = useMemo(() => scheduleForDay(medications, doseLogs, now, now), [medications, doseLogs, now]);
  const week = useMemo(() => adherence(medications, doseLogs, 7, now), [medications, doseLogs, now]);
  const logged = doses.filter((d) => d.state === 'taken' || d.state === 'skipped').length;
  const active = medications.filter((m) => m.active).sort((a, b) => a.name.localeCompare(b.name));
  const inactive = medications.filter((m) => !m.active).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen
      testID="meds-screen"
      title="Medications"
      subtitle="Today’s schedule and reminders"
      headerRight={<IconButton testID="add-med" icon="plus" variant="filled" label="Add medication" onPress={() => router.push('/meds/edit')} />}>
      {medications.length === 0 ? (
        <EmptyState
          icon="meds"
          title="Add your first medication"
          message="Enter prescriptions exactly as your prescriber wrote them to get a daily checklist and optional reminders."
          action={<Button label="Add medication" icon="plus" onPress={() => router.push('/meds/edit')} />}
        />
      ) : (
        <>
          <ReminderCard />
          <Section title="Today">
            {doses.length ? (
              <>
                <View style={{ gap: spacing.xs }}>
                  <Text variant="footnote" color="textSecondary" testID="dose-progress">
                    {logged} of {doses.length} doses logged
                  </Text>
                  <ProgressBar progress={doses.length ? logged / doses.length : 0} color={colors.success} label={`${logged} of ${doses.length} doses logged today`} />
                </View>
                <ListGroup testID="dose-list">{doses.map((d) => <DoseRow key={d.key} dose={d} />)}</ListGroup>
              </>
            ) : (
              <Text color="textSecondary">No doses scheduled today.</Text>
            )}
          </Section>

          <View style={styles.tiles}>
            <StatTile
              testID="adherence-7d"
              icon="checkCircle"
              tone="success"
              label="Logged as taken · 7 days"
              value={week.pct === null ? '—' : `${week.pct}%`}
              caption={`${week.taken} of ${week.scheduled} past doses`}
            />
            <StatTile icon="meds" label="Active medications" value={String(active.length)} caption={inactive.length ? `${inactive.length} not current` : undefined} />
          </View>

          <Section title="Your medications">
            <ListGroup testID="med-list">
              {active.map((m) => (
                <MedRow key={m.id} med={m} now={now} />
              ))}
            </ListGroup>
          </Section>
          {inactive.length ? (
            <Section title="Not currently taking">
              <ListGroup>
                {inactive.map((m) => (
                  <MedRow key={m.id} med={m} now={now} />
                ))}
              </ListGroup>
            </Section>
          ) : null}
        </>
      )}
      <SafetyNote>
        GlycoTrack records the schedule you enter. It never calculates, adjusts or suggests doses, including insulin. Reminders are a
        convenience and may be delayed by your device. Ask your pharmacist or prescriber about any changes.
      </SafetyNote>
    </Screen>
  );
}

function MedRow({ med, now }: { med: Medication; now: Date }) {
  const { colors } = useTheme();
  const times = med.times.map(formatTimeOfDay).join(', ');
  const soon = refillSoon(med, now);
  return (
    <ListRow
      testID={`med-${med.id}`}
      icon="meds"
      iconBackground={med.active ? colors.primarySoft : colors.surfaceMuted}
      iconColor={med.active ? colors.primaryText : colors.textTertiary}
      title={`${med.name} ${med.strength}`}
      subtitle={`${FORM_LABEL[med.form]} · ${times || 'No set times'}${med.refillOn ? ` · Refill ${formatRelativeDay(fromDateKey(med.refillOn), now)}` : ''}`}
      trailing={
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {soon ? <Badge label="Refill soon" tone="warning" icon="refill" /> : null}
          {med.demo ? <Badge label="Sample" tone="demo" /> : null}
          <Icon name={med.remindersOn ? 'bell' : 'bellOff'} size={16} color={med.remindersOn ? colors.primaryText : colors.textTertiary} />
        </View>
      }
      accessibilityLabel={`${med.name} ${med.strength}, ${FORM_LABEL[med.form]}, ${times || 'no set times'}, reminders ${med.remindersOn ? 'on' : 'off'}${soon ? ', refill soon' : ''}`}
      onPress={() => router.push({ pathname: '/meds/edit', params: { id: med.id } })}
    />
  );
}

function ReminderCard() {
  const store = useStore();
  const settings = useSettings();
  const { colors } = useTheme();
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  useEffect(() => {
    void getReminderPermission().then(setPermission).catch(() => setPermission('unsupported'));
  }, [settings.remindersEnabled]);

  if (!remindersSupported) {
    return (
      <Card tone="muted">
        <View style={styles.reminder}>
          <Icon name="bell" size={20} color={colors.textSecondary} />
          <Text variant="callout" color="textSecondary" style={{ flex: 1 }}>
            Reminders are available in the iOS and Android apps.
          </Text>
        </View>
      </Card>
    );
  }

  const enable = async () => {
    const result = await requestReminderPermission();
    setPermission(result);
    if (result === 'granted') store.updateSettings({ remindersEnabled: true });
  };

  if (settings.remindersEnabled && permission === 'granted') {
    return (
      <Card tone="muted">
        <View style={styles.reminder}>
          <View style={[styles.reminderIcon, { backgroundColor: colors.successSoft }]}>
            <Icon name="bell" size={18} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Reminders are on</Text>
            <Text variant="footnote" color="textSecondary">
              {settings.showMedicationNamesInReminders ? 'Notifications show medication names.' : 'Notifications don’t show medication names.'}
            </Text>
          </View>
          <Button label="Settings" size="sm" variant="ghost" onPress={() => router.push('/settings')} />
        </View>
      </Card>
    );
  }

  return (
    <Card tone="muted">
      <View style={styles.reminder}>
        <View style={[styles.reminderIcon, { backgroundColor: colors.primarySoft }]}>
          <Icon name="bellOff" size={18} color={colors.primaryText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">Reminders are off</Text>
          <Text variant="footnote" color="textSecondary">
            {permission === 'denied'
              ? 'Notifications are blocked for GlycoTrack. Allow them in your device settings.'
              : 'Get a private nudge at each scheduled time.'}
          </Text>
        </View>
        {permission !== 'denied' ? <Button testID="enable-reminders" label="Turn on" size="sm" variant="soft" onPress={enable} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  reminderIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
