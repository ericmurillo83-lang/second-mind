import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import GlucoseScreen from '@/app/(tabs)/glucose';
import EditGlucoseScreen from '@/app/glucose/edit';
import * as dialogs from '@/services/dialogs';
import { expectAllControlsLabelled, onboardedEmpty, renderScreen } from '@/test-utils/render';

describe('Glucose history', () => {
  it('shows chart, stats and day-grouped history', async () => {
    await renderScreen(<GlucoseScreen />);
    expect(screen.getByTestId('glucose-chart')).toHaveAccessibleName(/Glucose chart for the last 7 days: \d+ readings/);
    expect(screen.getByTestId('stat-average')).toBeOnTheScreen();
    expect(screen.getByText('Readings in your target range')).toBeOnTheScreen();
    expect(screen.getByText('Today')).toBeOnTheScreen();
    expectAllControlsLabelled();
  });

  it('switches periods and filters by context', async () => {
    await renderScreen(<GlucoseScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('tab', { name: '30 days' }));
    expect(screen.getByRole('tab', { name: '30 days' })).toBeSelected();
    expect(screen.getByTestId('glucose-chart')).toHaveAccessibleName(/last 30 days/);
    await user.press(screen.getByRole('button', { name: 'Fasting' }));
    expect(screen.getAllByText('Fasting').length).toBeGreaterThan(1);
    expect(screen.queryByText('Bedtime', { exact: true })).toBeOnTheScreen(); // chip remains, rows filtered
  });

  it('shows an empty state with no readings', async () => {
    await renderScreen(<GlucoseScreen />, { setup: onboardedEmpty });
    expect(screen.getByText('No readings yet')).toBeOnTheScreen();
  });
});

describe('Log glucose', () => {
  it('validates input before saving', async () => {
    const { store } = await renderScreen(<EditGlucoseScreen />, { setup: onboardedEmpty });
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Save reading' }));
    expect(screen.getByText('Enter a glucose value.')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Glucose value'), '9000');
    await user.press(screen.getByRole('button', { name: 'Save reading' }));
    expect(screen.getByText(/between 20 and 600 mg\/dL/)).toBeOnTheScreen();
    expect(store.getState().data.glucose).toHaveLength(0);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('saves a reading with context and note', async () => {
    const { store } = await renderScreen(<EditGlucoseScreen />, { setup: onboardedEmpty });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Glucose value'), '142');
    expect(screen.getByText('In range')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'After meal' }));
    await user.type(screen.getByLabelText('Note'), 'Pasta lunch');
    await user.press(screen.getByRole('button', { name: 'Save reading' }));
    const [reading] = store.getState().data.glucose;
    expect(reading).toMatchObject({ valueMgdl: 142, context: 'after_meal', note: 'Pasta lunch', source: 'manual' });
    expect(router.back).toHaveBeenCalled();
  });

  it('shows a neutral safety note for values below the user range, without advice', async () => {
    await renderScreen(<EditGlucoseScreen />, { setup: onboardedEmpty });
    await userEvent.setup().type(screen.getByLabelText('Glucose value'), '62');
    expect(screen.getByText('Below range')).toBeOnTheScreen();
    expect(screen.getByText(/Follow the plan from your care team/)).toBeOnTheScreen();
    expect(screen.queryByText(/units|insulin|eat \d+|take \d+/i)).not.toBeOnTheScreen();
  });

  it('accepts mmol/L input and stores mg/dL', async () => {
    const { store } = await renderScreen(<EditGlucoseScreen />, {
      setup: (s) => {
        onboardedEmpty(s);
        s.updateSettings({ glucoseUnit: 'mmol/L' });
      },
    });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Glucose value'), '6.2');
    await user.press(screen.getByRole('button', { name: 'Save reading' }));
    expect(store.getState().data.glucose[0].valueMgdl).toBeCloseTo(111.7, 1);
  });

  it('edits and deletes an existing reading', async () => {
    let id = '';
    const { store } = await renderScreen(<EditGlucoseScreen />, {
      setup: (s) => {
        onboardedEmpty(s);
        id = s.upsert('glucose', { valueMgdl: 100, takenAt: new Date().toISOString(), context: 'fasting', source: 'manual' }).id;
        jest.mocked(useLocalSearchParams).mockReturnValue({ id });
      },
    });
    expect(screen.getByDisplayValue('100')).toBeOnTheScreen();
    jest.spyOn(dialogs, 'confirmAsync').mockResolvedValue(true);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(store.getState().data.glucose).toHaveLength(0));
  });
});
