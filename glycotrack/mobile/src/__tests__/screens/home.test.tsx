import { screen, userEvent, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '@/app/(tabs)/index';
import { expectAllControlsLabelled, onboardedEmpty, renderScreen } from '@/test-utils/render';

describe('Home dashboard', () => {
  it('shows the sample-data banner, latest reading and today summary', async () => {
    await renderScreen(<HomeScreen />);
    expect(screen.getByTestId('demo-banner')).toBeOnTheScreen();
    expect(screen.getByText(/Alex$/)).toBeOnTheScreen();
    expect(screen.getByTestId('latest-value')).toHaveTextContent(/^\d+$/);
    expect(screen.getByText('Carbs today')).toBeOnTheScreen();
    expect(screen.getByText('Medications')).toBeOnTheScreen();
    expect(screen.getByText('Next appointment')).toBeOnTheScreen();
    expect(screen.getByText(/Endocrinology follow-up/)).toBeOnTheScreen();
    expectAllControlsLabelled();
  });

  it('marks a dose as taken from the dashboard', async () => {
    const { store } = await renderScreen(<HomeScreen />);
    const before = store.getState().data.doseLogs.length;
    const takeButtons = within(screen.getByTestId('home-doses')).getAllByRole('button', { name: 'Taken' });
    const target = takeButtons[0].props.testID as string;
    await userEvent.setup().press(takeButtons[0]);
    expect(store.getState().data.doseLogs.length).toBe(before + 1);
    expect(store.getState().data.doseLogs.at(-1)?.status).toBe('taken');
    // Logged doses leave the "needs attention" list on Home (undo lives on the Meds tab).
    expect(screen.queryByTestId(target)).not.toBeOnTheScreen();
  });

  it('navigates to logging and settings', async () => {
    await renderScreen(<HomeScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Log glucose' }));
    expect(router.push).toHaveBeenCalledWith('/glucose/edit');
    await user.press(screen.getByRole('button', { name: 'Settings' }));
    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('shows friendly empty states without data', async () => {
    await renderScreen(<HomeScreen />, { setup: onboardedEmpty });
    expect(screen.queryByTestId('demo-banner')).not.toBeOnTheScreen();
    expect(screen.getByText('Log your first reading')).toBeOnTheScreen();
    expect(screen.getByText('No medications yet')).toBeOnTheScreen();
    expect(screen.getByText('Nothing scheduled')).toBeOnTheScreen();
  });
});
