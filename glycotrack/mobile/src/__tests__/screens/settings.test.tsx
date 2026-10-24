import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import SafetyScreen from '@/app/safety';
import SettingsScreen from '@/app/settings';
import * as dialogs from '@/services/dialogs';
import { expectAllControlsLabelled, renderScreen } from '@/test-utils/render';

describe('Settings & privacy', () => {
  it('switches glucose units', async () => {
    const { store } = await renderScreen(<SettingsScreen />);
    expect(screen.getByRole('adjustable', { name: 'Low' })).toHaveAccessibilityValue({ text: '70 mg/dL' });
    await userEvent.setup().press(screen.getByRole('tab', { name: 'mmol/L' }));
    expect(store.getState().data.settings.glucoseUnit).toBe('mmol/L');
    expect(screen.getByRole('adjustable', { name: 'Low' })).toHaveAccessibilityValue({ text: '3.9 mmol/L' });
    expectAllControlsLabelled();
  });

  it('adjusts the target range and keeps it ordered', async () => {
    const { store } = await renderScreen(<SettingsScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Increase Low' }));
    expect(store.getState().data.settings.targetLowMgdl).toBe(75);
    await user.press(screen.getByRole('button', { name: 'Decrease High' }));
    expect(store.getState().data.settings.targetHighMgdl).toBe(175);
  });

  it('enables a personal carb goal', async () => {
    const { store } = await renderScreen(<SettingsScreen />);
    await fireEvent(screen.getByRole('switch', { name: 'Daily carbohydrate goal' }), 'valueChange', true);
    expect(store.getState().data.settings.dailyCarbGoal).toBe(180);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Increase Goal per day' }));
    expect(store.getState().data.settings.dailyCarbGoal).toBe(185);
  });

  it('keeps reminder text private by default', async () => {
    const { store } = await renderScreen(<SettingsScreen />);
    expect(store.getState().data.settings.showMedicationNamesInReminders).toBe(false);
    expect(screen.getByRole('switch', { name: 'Show medication names' })).not.toBeChecked();
  });

  it('removes only sample data after confirmation', async () => {
    jest.spyOn(dialogs, 'confirmAsync').mockResolvedValue(true);
    const { store } = await renderScreen(<SettingsScreen />);
    store.upsert('notes', { title: 'Mine', body: '', tags: [] });
    await userEvent.setup().press(screen.getByRole('button', { name: /Remove sample data/ }));
    await waitFor(() => expect(store.hasDemoData()).toBe(false));
    expect(store.getState().data.notes).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Load sample data/ })).toBeOnTheScreen();
  });

  it('does not delete when the confirmation is cancelled', async () => {
    jest.spyOn(dialogs, 'confirmAsync').mockResolvedValue(false);
    const { store } = await renderScreen(<SettingsScreen />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Delete all data' }));
    expect(store.getState().data.settings.onboarded).toBe(true);
  });

  it('deletes all data after confirmation', async () => {
    jest.spyOn(dialogs, 'confirmAsync').mockResolvedValue(true);
    const { store } = await renderScreen(<SettingsScreen />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Delete all data' }));
    await waitFor(() => expect(store.getState().data.settings.onboarded).toBe(false));
    expect(store.hasDemoData()).toBe(false);
  });

  it('exports data through the share helper', async () => {
    const share = jest.spyOn(dialogs, 'shareJson').mockResolvedValue();
    await renderScreen(<SettingsScreen />);
    await userEvent.setup().press(screen.getByRole('button', { name: /Export my data/ }));
    // Export flushes storage first, so the share call happens asynchronously.
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(share).toHaveBeenCalledWith(expect.stringMatching(/^glycotrack-export-\d{4}-\d{2}-\d{2}\.json$/), expect.stringContaining('"app": "GlycoTrack"'));
  });

  it('links to safety information', async () => {
    await renderScreen(<SettingsScreen />);
    await userEvent.setup().press(screen.getByRole('button', { name: /Safety & limitations/ }));
    expect(router.push).toHaveBeenCalledWith('/safety');
  });
});

describe('Safety & limitations', () => {
  it('lists what the app does not do', async () => {
    await renderScreen(<SafetyScreen />);
    expect(screen.getByText('Calculate, recommend or adjust insulin or any other medication dose.')).toBeOnTheScreen();
    expect(screen.getByText(/send glucose alerts or alarms/)).toBeOnTheScreen();
    expect(screen.getByText(/Replace your meter, CGM, insulin pump or their alarms/)).toBeOnTheScreen();
    expect(screen.getByText('In an emergency')).toBeOnTheScreen();
  });
});
