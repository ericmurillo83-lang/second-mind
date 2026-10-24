import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '@/data/store-context';
import { Button } from '@/ui/button';
import { TextField } from '@/ui/fields';
import { Icon, type IconName } from '@/ui/icon';
import { Text } from '@/ui/text';
import { MAX_CONTENT_WIDTH, radius, spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'glucose', title: 'Log glucose', body: 'Record readings and see trends against your own target range.' },
  { icon: 'meals', title: 'Plan meals', body: 'Recipes, a weekly plan and a simple carbohydrate log.' },
  { icon: 'meds', title: 'Stay on schedule', body: 'Medication checklist with optional private reminders.' },
  { icon: 'care', title: 'Keep care organized', body: 'Appointments, questions for your doctor and lab results.' },
];

const SAFETY_POINTS = [
  'GlycoTrack is an organizer and log. It does not give medical advice.',
  'It never calculates insulin or any medication dose.',
  'It does not monitor glucose or send glucose alarms, and does not replace your meter, CGM or its alerts.',
  'Always follow your care team’s plan. In an emergency, call your local emergency number.',
];

export default function WelcomeScreen() {
  const store = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const start = (withDemoData: boolean) => store.completeOnboarding({ displayName: name, withDemoData });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xxxl }]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        <View style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Icon name="glucose" size={34} color={colors.textOnPrimary} />
          </View>
          <Text variant="largeTitle" align="center" accessibilityRole="header">
            Welcome to GlycoTrack
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            A calm, private place to keep your diabetes day-to-day in order.
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature} accessible accessibilityLabel={`${f.title}. ${f.body}`}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primarySoft }]}>
                <Icon name={f.icon} size={20} color={colors.primaryText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline">{f.title}</Text>
                <Text variant="callout" color="textSecondary">
                  {f.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.safety, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.safetyHeader}>
            <Icon name="shield" size={20} color={colors.primaryText} />
            <Text variant="headline" accessibilityRole="header">
              Before you start
            </Text>
          </View>
          {SAFETY_POINTS.map((p) => (
            <View key={p} style={styles.bullet}>
              <Text variant="callout" color="textSecondary" accessible={false}>
                •
              </Text>
              <Text variant="callout" color="textSecondary" style={{ flex: 1 }}>
                {p}
              </Text>
            </View>
          ))}
          <Pressable
            testID="ack-checkbox"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledged }}
            // Explicit so web always announces the state (react-native-web omits a false `checked`).
            aria-checked={acknowledged}
            accessibilityLabel="I understand GlycoTrack does not provide medical advice, dosing or glucose alerts"
            onPress={() => setAcknowledged((a) => !a)}
            style={[styles.ack, { borderColor: acknowledged ? colors.primary : colors.borderStrong }]}>
            <Icon name={acknowledged ? 'checkCircle' : 'circle'} size={24} color={acknowledged ? colors.primary : colors.textTertiary} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              I understand GlycoTrack does not provide medical advice, dosing or glucose alerts.
            </Text>
          </Pressable>
        </View>

        <TextField
          testID="name-input"
          label="What should we call you?"
          hint="Optional. Stays on this device."
          placeholder="First name"
          value={name}
          onChangeText={setName}
          autoComplete="given-name"
          returnKeyType="done"
        />

        <View style={{ gap: spacing.md }}>
          <Button
            testID="start-demo"
            label="Explore with sample data"
            icon="sparkles"
            disabled={!acknowledged}
            onPress={() => start(true)}
            accessibilityHint="Loads clearly labeled fictional data you can remove at any time in Settings"
          />
          <Button
            testID="start-empty"
            label="Start with an empty app"
            variant="secondary"
            disabled={!acknowledged}
            onPress={() => start(false)}
          />
          <Text variant="footnote" color="textTertiary" align="center">
            Sample data is fictional and clearly labeled. Remove it any time in Settings.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, alignItems: 'center' },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH - 160, gap: spacing.xxl },
  hero: { alignItems: 'center', gap: spacing.md },
  logo: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  features: { gap: spacing.lg },
  feature: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  featureIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  safety: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  safetyHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.xs },
  bullet: { flexDirection: 'row', gap: spacing.sm },
  ack: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    minHeight: 56,
  },
});
