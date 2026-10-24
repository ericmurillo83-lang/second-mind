import { useEffect, useRef, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppData, useSettings, useStore, useStoreState } from '@/data/store-context';
import { appLockSupported, authenticate } from '@/services/app-lock';
import { planReminders, syncReminders } from '@/services/reminders';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Text } from '@/ui/text';
import { radius, spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

/** Header button for modal editors (iOS modals have no back button). */
export function CancelButton({ label = 'Cancel' }: { label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={12}
      style={{ paddingHorizontal: 4, minHeight: 44, justifyContent: 'center' }}>
      <Text variant="body" color="primaryText">
        {label}
      </Text>
    </Pressable>
  );
}

/** Background work tied to app state: persist on background, keep reminders in sync. */
export function AppLifecycle() {
  const store = useStore();
  const medications = useAppData((d) => d.medications);
  const settings = useSettings();

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') void store.flush();
    });
    return () => sub.remove();
  }, [store]);

  const enabled = settings.remindersEnabled;
  const showNames = settings.showMedicationNamesInReminders;
  useEffect(() => {
    void syncReminders(planReminders(medications, { enabled, showNames })).catch(() => undefined);
  }, [medications, enabled, showNames]);

  return null;
}

/** Covers the app with a lock screen when app lock is on, at launch and after backgrounding. */
export function LockGate({ children }: { children: ReactNode }) {
  const { appLockEnabled } = useSettings();
  const active = appLockEnabled && appLockSupported;
  const [locked, setLocked] = useState(active);
  const authenticating = useRef(false);

  useEffect(() => {
    if (!active) return;
    const sub = AppState.addEventListener('change', (next) => {
      // Ignore the inactive blip caused by the system auth prompt itself.
      if (next === 'background' && !authenticating.current) setLocked(true);
    });
    return () => sub.remove();
  }, [active]);

  const unlock = async () => {
    authenticating.current = true;
    try {
      if (await authenticate()) setLocked(false);
    } finally {
      authenticating.current = false;
    }
  };

  useEffect(() => {
    if (locked && active) void unlock();
  }, [locked, active]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked && active ? <LockScreen onUnlock={unlock} /> : null}
    </View>
  );
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.lock, { backgroundColor: colors.background, paddingTop: insets.top }]}
      accessibilityViewIsModal>
      <View style={[styles.lockIcon, { backgroundColor: colors.primarySoft }]}>
        <Icon name="lock" size={34} color={colors.primaryText} />
      </View>
      <Text variant="title" align="center">
        GlycoTrack is locked
      </Text>
      <Text variant="callout" color="textSecondary" align="center">
        Your health information is protected. Unlock with Face ID, fingerprint or your device passcode.
      </Text>
      <Button label="Unlock" icon="faceid" onPress={onUnlock} />
    </View>
  );
}

export function DataErrorScreen() {
  const store = useStore();
  const state = useStoreState();
  const { colors } = useTheme();
  return (
    <View style={[styles.lock, { flex: 1, backgroundColor: colors.background }]}>
      <View style={[styles.lockIcon, { backgroundColor: colors.warningSoft }]}>
        <Icon name="warning" size={34} color={colors.warning} />
      </View>
      <Text variant="title" align="center" accessibilityRole="header">
        We couldn’t open your data
      </Text>
      <Text variant="callout" color="textSecondary" align="center">
        {state.error?.message}
      </Text>
      {state.error?.canReset ? (
        <Button label="Keep a backup and start fresh" variant="secondary" onPress={() => void store.resetAfterError()} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lock: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.lg },
  lockIcon: { width: 80, height: 80, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
