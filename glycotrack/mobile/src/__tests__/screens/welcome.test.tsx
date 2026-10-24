import { screen, userEvent } from '@testing-library/react-native';

import WelcomeScreen from '@/app/welcome';
import { expectAllControlsLabelled, renderScreen } from '@/test-utils/render';

describe('Welcome / onboarding', () => {
  it('requires the safety acknowledgement before starting', async () => {
    const { store } = await renderScreen(<WelcomeScreen />, { setup: () => undefined });
    const demo = screen.getByRole('button', { name: 'Explore with sample data' });
    expect(demo).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Start with an empty app' })).toBeDisabled();

    const user = userEvent.setup();
    await user.press(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(demo).toBeEnabled();

    await user.type(screen.getByLabelText('What should we call you?'), 'Jamie');
    await user.press(demo);

    const { data } = store.getState();
    expect(data.settings.onboarded).toBe(true);
    expect(data.settings.safetyAcknowledgedAt).not.toBeNull();
    expect(data.profile.displayName).toBe('Jamie');
    expect(store.hasDemoData()).toBe(true);
  });

  it('can start empty', async () => {
    const { store } = await renderScreen(<WelcomeScreen />, { setup: () => undefined });
    const user = userEvent.setup();
    await user.press(screen.getByRole('checkbox'));
    await user.press(screen.getByRole('button', { name: 'Start with an empty app' }));
    expect(store.getState().data.settings.onboarded).toBe(true);
    expect(store.hasDemoData()).toBe(false);
  });

  it('states the safety limits up front', async () => {
    await renderScreen(<WelcomeScreen />, { setup: () => undefined });
    expect(screen.getByText(/never calculates insulin or any medication dose/)).toBeOnTheScreen();
    expect(screen.getByText(/does not monitor glucose or send glucose alarms/)).toBeOnTheScreen();
    expectAllControlsLabelled();
  });
});
