import { TabList, TabSlot, Tabs, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import type { ComponentRef, Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/ui/icon';
import { Text } from '@/ui/text';
import { elevation, MAX_CONTENT_WIDTH, radius, spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

const TABS: { name: string; href: '/' | '/glucose' | '/meals' | '/meds' | '/care'; label: string; icon: IconName }[] = [
  { name: 'index', href: '/', label: 'Home', icon: 'home' },
  { name: 'glucose', href: '/glucose', label: 'Glucose', icon: 'glucose' },
  { name: 'meals', href: '/meals', label: 'Meals', icon: 'meals' },
  { name: 'meds', href: '/meds', label: 'Meds', icon: 'meds' },
  { name: 'care', href: '/care', label: 'Care', icon: 'care' },
];

/** Web build (browser preview/testing): a floating bottom tab bar matching the native layout. */
export default function AppTabs() {
  const { colors } = useTheme();
  return (
    // Tabs discovers TabList/TabTrigger by scanning its children, so TabList must be a direct child.
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <View
          accessibilityRole="tablist"
          // TabList asChild merges its own style object into ours, so hand it a flat object.
          style={StyleSheet.flatten([styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }, elevation(colors, 2)])}>
          {TABS.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <TabButton icon={t.icon} label={t.label} />
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: IconName; label: string };

function TabButton({ icon, label, isFocused, ref, ...props }: TabButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      // expo-router's slot ref type predates RN 0.88 element refs; the runtime value is correct.
      ref={ref as unknown as Ref<ComponentRef<typeof Pressable>>}
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }}
      aria-selected={!!isFocused}
      testID={`tab-${label.toLowerCase()}`}
      style={styles.tab}>
      <View style={[styles.pill, isFocused && { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={22} color={isFocused ? colors.primaryText : colors.textSecondary} />
      </View>
      <Text variant="caption" style={{ color: isFocused ? colors.primaryText : colors.textSecondary, fontWeight: isFocused ? '700' : '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    marginHorizontal: 'auto',
    maxWidth: MAX_CONTENT_WIDTH,
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.xs, minHeight: 56 },
  pill: { width: 56, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
