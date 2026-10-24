import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppData, useHasDemoData, useSettings, useStore } from '@/data/store-context';
import { formatGlucose, validateTargetRange } from '@/domain/glucose';
import type { GlucoseUnit, ThemePreference } from '@/domain/types';
import { canUseAppLock, authenticate } from '@/services/app-lock';
import { confirmAsync, notify, shareJson } from '@/services/dialogs';
import { remindersSupported, requestReminderPermission } from '@/services/reminders';
import { Button } from '@/ui/button';
import { SegmentedControl, Stepper, ToggleRow } from '@/ui/controls';
import { TextField } from '@/ui/fields';
import { Icon } from '@/ui/icon';
import { Card, Divider, ListGroup, ListRow, Screen, Section } from '@/ui/layout';
import { SafetyNote } from '@/ui/status';
import { Text } from '@/ui/text';
import { radius, spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

const UNITS = [
  { value: 'mg/dL', label: 'mg/dL' },
  { value: 'mmol/L', label: 'mmol/L' },
] as const;
const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export default function SettingsScreen() {
  const store = useStore();
  const settings = useSettings();
  const { colors } = useTheme();
  const displayName = useAppData((d) => d.profile.displayName);
  const hasDemo = useHasDemoData();
  const [name, setName] = useState(displayName);
  const [lockAvailability, setLockAvailability] = useState<{ ok: boolean; reason?: string }>({ ok: false });
  const unit = settings.glucoseUnit;
  const { targetLowMgdl: low, targetHighMgdl: high } = settings;

  useEffect(() => {
    void canUseAppLock().then(setLockAvailability).catch(() => setLockAvailability({ ok: false }));
  }, []);

  const setRange = (nextLow: number, nextHigh: number) => {
    if (validateTargetRange(nextLow, nextHigh).ok) store.updateSettings({ targetLowMgdl: nextLow, targetHighMgdl: nextHigh });
  };

  const toggleReminders = async (on: boolean) => {
    if (!on) return store.updateSettings({ remindersEnabled: false });
    const permission = await requestReminderPermission();
    if (permission === 'granted') store.updateSettings({ remindersEnabled: true });
    else notify('Notifications are off', 'Allow notifications for GlycoTrack in your device settings to receive reminders.');
  };

  const toggleLock = async (on: boolean) => {
    // Require a successful unlock before changing the lock either way.
    if (await authenticate(on ? 'Turn on app lock' : 'Turn off app lock')) store.updateSettings({ appLockEnabled: on });
  };

  const exportData = async () => {
    await store.flush();
    const date = new Date().toISOString().slice(0, 10);
    await shareJson(`glycotrack-export-${date}.json`, store.exportJson());
  };

  const deleteAll = async () => {
    const ok = await confirmAsync({
      title: 'Delete all GlycoTrack data?',
      message: 'This permanently erases every reading, meal, medication, appointment, note and setting on this device. It cannot be undone. Consider exporting first.',
      confirmLabel: 'Delete everything',
      destructive: true,
    });
    if (ok) await store.deleteAllData();
  };

  const toggleDemo = async () => {
    if (hasDemo) {
      const ok = await confirmAsync({
        title: 'Remove sample data?',
        message: 'All fictional sample records will be removed. Anything you entered yourself is kept.',
        confirmLabel: 'Remove',
        destructive: true,
      });
      if (ok) store.removeDemoData();
    } else {
      store.loadDemoData();
    }
  };

  return (
    <Screen testID="settings-screen" tab={false} title="Settings" subtitle="Preferences, privacy and your data">
      <Section title="Profile">
        <Card>
          <TextField
            testID="settings-name"
            label="Your name"
            hint="Used for your greeting. Stays on this device."
            value={name}
            onChangeText={setName}
            onBlur={() => store.updateProfile({ displayName: name.trim() })}
            onSubmitEditing={() => store.updateProfile({ displayName: name.trim() })}
            returnKeyType="done"
          />
        </Card>
      </Section>

      <Section title="Glucose">
        <Card padded={false}>
          <View style={styles.padded}>
            <Text variant="subhead" style={{ fontWeight: '600' }}>
              Units
            </Text>
            <SegmentedControl testID="unit" options={UNITS} value={unit} onChange={(v: GlucoseUnit) => store.updateSettings({ glucoseUnit: v })} />
          </View>
          <Divider />
          <View style={[styles.padded, { paddingBottom: 0 }]}>
            <Text variant="subhead" style={{ fontWeight: '600' }}>
              Your target range
            </Text>
            <Text variant="footnote" color="textSecondary">
              Set this with your care team. GlycoTrack only uses it to label and count your logged readings.
            </Text>
          </View>
          <Stepper
            testID="target-low"
            label="Low"
            value={low}
            onChange={(v) => setRange(v, high)}
            step={5}
            min={40}
            max={high - 20}
            format={(v) => `${formatGlucose(v, unit)} ${unit}`}
          />
          <Stepper
            testID="target-high"
            label="High"
            value={high}
            onChange={(v) => setRange(low, v)}
            step={5}
            min={low + 20}
            max={400}
            format={(v) => `${formatGlucose(v, unit)} ${unit}`}
          />
        </Card>
      </Section>

      <Section title="Meals">
        <Card padded={false}>
          <ToggleRow
            testID="carb-goal-toggle"
            icon="carbs"
            title="Daily carbohydrate goal"
            subtitle="Optional. Only if your care team recommends one."
            value={settings.dailyCarbGoal !== null}
            onValueChange={(on) => store.updateSettings({ dailyCarbGoal: on ? 180 : null })}
          />
          {settings.dailyCarbGoal !== null ? (
            <Stepper
              testID="carb-goal"
              label="Goal per day"
              value={settings.dailyCarbGoal}
              onChange={(v) => store.updateSettings({ dailyCarbGoal: v })}
              step={5}
              min={20}
              max={500}
              format={(v) => `${v} g`}
            />
          ) : null}
        </Card>
      </Section>

      <Section title="Reminders">
        <Card padded={false}>
          <ToggleRow
            testID="reminders-toggle"
            icon="bell"
            title="Medication reminders"
            subtitle={remindersSupported ? 'Local notifications at your scheduled times' : 'Available in the iOS and Android apps'}
            value={settings.remindersEnabled}
            disabled={!remindersSupported}
            onValueChange={(v) => void toggleReminders(v)}
          />
          <Divider inset={spacing.lg} />
          <ToggleRow
            testID="reminder-names-toggle"
            icon="eyeOff"
            title="Show medication names"
            subtitle="Off keeps reminders generic so your lock screen stays private"
            value={settings.showMedicationNamesInReminders}
            onValueChange={(v) => store.updateSettings({ showMedicationNamesInReminders: v })}
          />
        </Card>
      </Section>

      <Section title="Appearance">
        <SegmentedControl testID="theme" options={THEMES} value={settings.theme} onChange={(v: ThemePreference) => store.updateSettings({ theme: v })} />
      </Section>

      <Section title="Privacy & security">
        <Card>
          <View style={styles.privacyRow}>
            <View style={[styles.privacyIcon, { backgroundColor: colors.successSoft }]}>
              <Icon name="device" size={20} color={colors.success} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headline">Your data stays on this device</Text>
              <Text variant="footnote" color="textSecondary">
                No account, no cloud sync, no analytics, no ads. Nothing is sent anywhere unless you export it yourself.
              </Text>
            </View>
          </View>
        </Card>
        <ListGroup>
          <ToggleRow
            testID="app-lock-toggle"
            icon="lock"
            title="App lock"
            subtitle={lockAvailability.ok ? 'Require Face ID, fingerprint or passcode to open' : lockAvailability.reason ?? 'Checking…'}
            value={settings.appLockEnabled}
            disabled={!lockAvailability.ok}
            onValueChange={(v) => void toggleLock(v)}
          />
          <ListRow
            testID="export-data"
            icon="share"
            title="Export my data"
            subtitle="Save or share a copy of everything as a JSON file"
            onPress={() => void exportData()}
          />
          <ListRow
            testID="toggle-demo"
            icon="sparkles"
            iconBackground={colors.demoSoft}
            iconColor={colors.demo}
            title={hasDemo ? 'Remove sample data' : 'Load sample data'}
            subtitle={hasDemo ? 'Clears fictional records and keeps your own' : 'Adds clearly labeled fictional records to explore'}
            onPress={() => void toggleDemo()}
          />
        </ListGroup>
        <Button testID="delete-all" label="Delete all data" icon="trash" variant="destructive" onPress={() => void deleteAll()} />
      </Section>

      <Section title="About">
        <ListGroup>
          <ListRow testID="open-safety" icon="shield" title="Safety & limitations" subtitle="What GlycoTrack does and doesn’t do" onPress={() => router.push('/safety')} />
          <ListRow icon="info" title="Version" detail={Constants.expoConfig?.version ?? '—'} />
        </ListGroup>
        <SafetyNote>
          GlycoTrack is a personal logging and organization tool. It is not a medical device and does not provide medical advice,
          diagnosis, treatment or dosing.
        </SafetyNote>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { padding: spacing.lg, gap: spacing.sm },
  privacyRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  privacyIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
