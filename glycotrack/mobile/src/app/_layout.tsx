import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { StoreProvider, useStoreState } from '@/data/store-context';
import { AppStore } from '@/data/store';
import { asyncStorageAdapter } from '@/data/storage';
import { installNotificationHandler } from '@/services/reminders';
import { AppLifecycle, CancelButton, DataErrorScreen, LockGate } from '@/features/shell';
import { AppThemeProvider, useTheme } from '@/ui/theme-context';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [store] = useState(() => new AppStore(asyncStorageAdapter));
  useEffect(() => {
    installNotificationHandler();
    void store.hydrate();
  }, [store]);
  return (
    <StoreProvider store={store}>
      <AppShell />
    </StoreProvider>
  );
}

function AppShell() {
  const state = useStoreState();
  useEffect(() => {
    if (state.status !== 'loading') void SplashScreen.hideAsync().catch(() => undefined);
  }, [state.status]);

  if (state.status === 'loading') return null;
  return (
    <AppThemeProvider preference={state.data.settings.theme}>
      {state.status === 'error' ? <DataErrorScreen /> : <Navigation onboarded={state.data.settings.onboarded} />}
    </AppThemeProvider>
  );
}

function Navigation({ onboarded }: { onboarded: boolean }) {
  const { scheme, colors } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };
  const modal = (title: string) => ({
    title,
    presentation: 'modal' as const,
    headerLeft: () => <CancelButton />,
  });
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AppLifecycle />
      <LockGate>
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primaryText,
            headerTitleStyle: { color: colors.text, fontWeight: '600' },
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
            <Stack.Screen name="settings" options={{ title: '' }} />
            <Stack.Screen name="safety" options={{ title: '' }} />
            <Stack.Screen name="glucose/edit" options={modal('Glucose reading')} />
            <Stack.Screen name="meals/log" options={modal('Log a meal')} />
            <Stack.Screen name="meals/recipe/[id]" options={{ title: '' }} />
            <Stack.Screen name="meals/recipe-edit" options={modal('Recipe')} />
            <Stack.Screen name="meals/plan-add" options={modal('Plan a meal')} />
            <Stack.Screen name="meds/edit" options={modal('Medication')} />
            <Stack.Screen name="care/appointment" options={modal('Appointment')} />
            <Stack.Screen name="care/note" options={modal('Note')} />
            <Stack.Screen name="care/record" options={modal('Health record')} />
          </Stack.Protected>
        </Stack>
      </LockGate>
    </ThemeProvider>
  );
}
