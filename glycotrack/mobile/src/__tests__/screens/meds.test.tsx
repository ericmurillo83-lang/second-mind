import { fireEvent, screen, userEvent, within } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import MedsScreen from '@/app/(tabs)/meds';
import EditMedicationScreen from '@/app/meds/edit';
import { expectAllControlsLabelled, onboardedEmpty, renderScreen } from '@/test-utils/render';

describe('Medications tab', () => {
  it('lists today’s doses, adherence and medications', async () => {
    await renderScreen(<MedsScreen />);
    expect(screen.getByTestId('dose-progress')).toHaveTextContent(/\d+ of \d+ doses logged/);
    expect(screen.getByTestId('adherence-7d')).toHaveAccessibleName(/Logged as taken · 7 days: \d+%/);
    const list = within(screen.getByTestId('med-list'));
    expect(list.getByText('Metformin 500 mg')).toBeOnTheScreen();
    expect(screen.getByText(/never calculates, adjusts or suggests doses, including insulin/)).toBeOnTheScreen();
    expectAllControlsLabelled();
  });

  it('logs and undoes a dose', async () => {
    const { store } = await renderScreen(<MedsScreen />);
    const user = userEvent.setup();
    const doseList = within(screen.getByTestId('dose-list'));
    const before = store.getState().data.doseLogs.length;
    await user.press(doseList.getAllByRole('button', { name: 'Taken' })[0]);
    expect(store.getState().data.doseLogs.length).toBe(before + 1);
    await user.press(doseList.getAllByRole('button', { name: 'Undo' }).at(-1)!);
    expect(store.getState().data.doseLogs.length).toBe(before);
  });

  it('shows an empty state without medications', async () => {
    await renderScreen(<MedsScreen />, { setup: onboardedEmpty });
    expect(screen.getByText('Add your first medication')).toBeOnTheScreen();
  });
});

describe('Edit medication', () => {
  it('adds a medication with two times exactly as entered', async () => {
    const { store } = await renderScreen(<EditMedicationScreen />, { setup: onboardedEmpty });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Medication name'), 'Lisinopril');
    await user.type(screen.getByLabelText('Strength'), '10 mg');
    await user.press(screen.getByRole('button', { name: 'Add a time' }));
    await user.press(screen.getByRole('button', { name: 'Save medication' }));
    const [med] = store.getState().data.medications;
    expect(med).toMatchObject({ name: 'Lisinopril', strength: '10 mg', form: 'tablet', times: ['08:00', '20:00'], active: true });
  });

  it('reminds the user that doses are never calculated', async () => {
    await renderScreen(<EditMedicationScreen />, { setup: onboardedEmpty });
    expect(screen.getByText(/never calculates or changes doses/)).toBeOnTheScreen();
    expectAllControlsLabelled();
  });

  it('can archive instead of delete', async () => {
    let id = '';
    const { store } = await renderScreen(<EditMedicationScreen />, {
      setup: (s) => {
        s.completeOnboarding({ displayName: '', withDemoData: true });
        id = s.getState().data.medications[0].id;
        jest.mocked(useLocalSearchParams).mockReturnValue({ id });
      },
    });
    const user = userEvent.setup();
    await fireEvent(screen.getByRole('switch', { name: 'Currently taking' }), 'valueChange', false);
    await user.press(screen.getByRole('button', { name: 'Save medication' }));
    const med = store.getState().data.medications.find((m) => m.id === id)!;
    expect(med.active).toBe(false);
    expect(store.getState().data.doseLogs.some((l) => l.medicationId === id)).toBe(true);
  });
});
