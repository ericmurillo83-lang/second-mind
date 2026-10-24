import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/ui/theme-context';

/** Native platform tab bar (UITabBar on iOS, Material bottom navigation on Android). */
export default function AppTabs() {
  const { colors } = useTheme();
  return (
    <NativeTabs
      tintColor={colors.primary}
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      labelStyle={{ default: { color: colors.textSecondary }, selected: { color: colors.primaryText } }}
      backgroundColor={colors.surface}
      indicatorColor={colors.primarySoft}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="glucose">
        <NativeTabs.Trigger.Label>Glucose</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'drop', selected: 'drop.fill' }} md="water_drop" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="meals">
        <NativeTabs.Trigger.Label>Meals</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="meds">
        <NativeTabs.Trigger.Label>Meds</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'pills', selected: 'pills.fill' }} md="medication" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="care">
        <NativeTabs.Trigger.Label>Care</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="stethoscope" md="stethoscope" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
