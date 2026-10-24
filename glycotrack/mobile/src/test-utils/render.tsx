import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStore } from '@/data/store';
import { StoreProvider } from '@/data/store-context';
import { createMemoryAdapter } from '@/data/storage';
import { AppThemeProvider } from '@/ui/theme-context';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export interface RenderOptions {
  /** Prepare store contents before rendering. Defaults to onboarded with sample data. */
  setup?: (store: AppStore) => void;
}

export async function renderScreen(ui: ReactElement, { setup }: RenderOptions = {}) {
  const store = new AppStore(createMemoryAdapter());
  await store.hydrate();
  if (setup) setup(store);
  else store.completeOnboarding({ displayName: 'Alex', withDemoData: true });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <StoreProvider store={store}>
        <AppThemeProvider preference="light">{ui}</AppThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>,
  );
  return { store };
}

export const onboardedEmpty = (store: AppStore) => store.completeOnboarding({ displayName: '', withDemoData: false });

/** Accessibility guard: every button and switch must expose a non-empty accessible name. */
export function expectAllControlsLabelled() {
  const controls = [...screen.queryAllByRole('button'), ...screen.queryAllByRole('switch'), ...screen.queryAllByRole('tab')];
  expect(controls.length).toBeGreaterThan(0);
  for (const el of controls) {
    const label = el.props.accessibilityLabel ?? el.props['aria-label'];
    expect(typeof label === 'string' && label.trim().length > 0).toBe(true);
  }
}
