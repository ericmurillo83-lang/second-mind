import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/ui/icon';
import { Card, Screen, Section } from '@/ui/layout';
import { Text } from '@/ui/text';
import { radius, spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

const DOES: string[] = [
  'Stores glucose values you enter from your meter and shows them over time.',
  'Labels readings against a target range that you set with your care team.',
  'Keeps recipes, a meal plan and a carbohydrate log with the values you enter.',
  'Keeps a medication checklist and optional reminders for a schedule you enter.',
  'Organizes appointments, notes and health records, exactly as you enter them.',
];

const DOES_NOT: string[] = [
  'Calculate, recommend or adjust insulin or any other medication dose.',
  'Make treatment decisions or interpret results.',
  'Monitor glucose continuously, predict trends, or send glucose alerts or alarms.',
  'Replace your meter, CGM, insulin pump or their alarms.',
  'Replace advice from your doctor, diabetes educator or pharmacist.',
];

export default function SafetyScreen() {
  const { colors } = useTheme();
  return (
    <Screen testID="safety-screen" tab={false} title="Safety & limitations" subtitle="Please read. GlycoTrack is a log and organizer, not a medical device.">
      <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.danger }}>
        <View style={styles.emergency} accessible accessibilityRole="alert">
          <Icon name="warning" size={22} color={colors.danger} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="headline" color="danger">
              In an emergency
            </Text>
            <Text variant="callout">
              If you feel very unwell, have symptoms of severe low or high blood sugar, or can’t keep fluids down, follow your care
              plan and call your local emergency number.
            </Text>
          </View>
        </View>
      </Card>

      <Section title="GlycoTrack does">
        <Card>
          <List items={DOES} icon="checkCircle" color={colors.success} />
        </Card>
      </Section>

      <Section title="GlycoTrack does not">
        <Card>
          <List items={DOES_NOT} icon="close" color={colors.danger} />
        </Card>
      </Section>

      <Section title="Reminders">
        <Card>
          <Text variant="callout" color="textSecondary">
            Medication reminders are a convenience. Your phone may delay or silence them (for example in Focus or battery-saver
            modes). Don’t rely on them for time-critical care.
          </Text>
        </Card>
      </Section>

      <Section title="Sample data">
        <Card>
          <Text variant="callout" color="textSecondary">
            Sample data is fictional, including names, clinics, readings, lab values, recipes and prescriptions. It is marked
            “Sample” throughout the app and can be removed in Settings.
          </Text>
        </Card>
      </Section>
    </Screen>
  );
}

function List({ items, icon, color }: { items: string[]; icon: IconName; color: string }) {
  return (
    <View style={{ gap: spacing.md }}>
      {items.map((i) => (
        <View key={i} style={styles.item}>
          <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
            <Icon name={icon} size={14} color={color} />
          </View>
          <Text variant="body" style={{ flex: 1 }}>
            {i}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emergency: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  item: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  iconWrap: { width: 24, height: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
