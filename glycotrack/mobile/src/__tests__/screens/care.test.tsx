import { screen, userEvent } from '@testing-library/react-native';

import CareScreen from '@/app/(tabs)/care';
import EditAppointmentScreen from '@/app/care/appointment';
import EditNoteScreen from '@/app/care/note';
import EditRecordScreen from '@/app/care/record';
import { expectAllControlsLabelled, onboardedEmpty, renderScreen } from '@/test-utils/render';

describe('Care tab', () => {
  it('shows upcoming and past appointments', async () => {
    await renderScreen(<CareScreen />);
    expect(screen.getByText('Upcoming')).toBeOnTheScreen();
    expect(screen.getByText('Past')).toBeOnTheScreen();
    expect(screen.getByText('Endocrinology follow-up')).toBeOnTheScreen();
    expectAllControlsLabelled();
  });

  it('switches to notes with search, and to records', async () => {
    await renderScreen(<CareScreen />);
    const user = userEvent.setup();
    await user.press(screen.getByRole('tab', { name: 'Notes' }));
    expect(screen.getByText('Walking after dinner')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Search notes'), 'lab');
    expect(screen.queryByText('Walking after dinner')).not.toBeOnTheScreen();
    expect(screen.getByText('Lab visit')).toBeOnTheScreen();

    await user.press(screen.getByRole('tab', { name: 'Records' }));
    expect(screen.getAllByText('A1C')).toHaveLength(2);
    expect(screen.getByText(/doesn’t interpret results/)).toBeOnTheScreen();
  });

  it('shows empty states', async () => {
    await renderScreen(<CareScreen />, { setup: onboardedEmpty });
    expect(screen.getByText('No appointments')).toBeOnTheScreen();
  });
});

describe('Care editors', () => {
  it('creates an appointment', async () => {
    const { store } = await renderScreen(<EditAppointmentScreen />, { setup: onboardedEmpty });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Visit'), 'Dental cleaning');
    await user.type(screen.getByLabelText('Provider'), 'Example Dental');
    await user.press(screen.getByRole('button', { name: 'Save appointment' }));
    const [a] = store.getState().data.appointments;
    expect(a).toMatchObject({ title: 'Dental cleaning', provider: 'Example Dental', durationMinutes: 30 });
    expect(new Date(a.startsAt).getHours()).toBe(9);
  });

  it('creates a note with tags', async () => {
    const { store } = await renderScreen(<EditNoteScreen />, { setup: onboardedEmpty });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Title'), 'Question');
    await user.type(screen.getByLabelText('Note'), 'Ask about eye exam timing');
    await user.type(screen.getByLabelText('Tags'), 'Appointment prep, Eyes');
    await user.press(screen.getByRole('button', { name: 'Save note' }));
    expect(store.getState().data.notes[0]).toMatchObject({ title: 'Question', tags: ['Appointment prep', 'Eyes'] });
  });

  it('creates a health record from a preset', async () => {
    const { store } = await renderScreen(<EditRecordScreen />, { setup: onboardedEmpty });
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'A1C' }));
    await user.type(screen.getByLabelText('Result'), '7.0');
    await user.press(screen.getByRole('button', { name: 'Save record' }));
    expect(store.getState().data.records[0]).toMatchObject({ name: 'A1C', value: '7.0', unit: '%' });
  });
});
