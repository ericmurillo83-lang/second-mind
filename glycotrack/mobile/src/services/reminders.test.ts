import type { Medication } from '@/domain/types';

import { planReminders, REMINDER_ID_PREFIX } from './reminders';

const med = (over: Partial<Medication>): Medication => ({
  id: 'm1',
  createdAt: '',
  updatedAt: '',
  name: 'Metformin',
  strength: '500 mg',
  form: 'tablet',
  instructions: '',
  times: ['08:00', '19:30'],
  remindersOn: true,
  active: true,
  ...over,
});

describe('planReminders', () => {
  it('plans one daily reminder per scheduled time', () => {
    const plans = planReminders([med({})], { enabled: true, showNames: false });
    expect(plans.map((p) => [p.hour, p.minute])).toEqual([
      [8, 0],
      [19, 30],
    ]);
    expect(plans.every((p) => p.identifier.startsWith(REMINDER_ID_PREFIX))).toBe(true);
    expect(new Set(plans.map((p) => p.identifier)).size).toBe(2);
  });

  it('plans nothing when reminders are disabled globally, per medication, or the medication is inactive', () => {
    expect(planReminders([med({})], { enabled: false, showNames: false })).toEqual([]);
    expect(planReminders([med({ remindersOn: false })], { enabled: true, showNames: false })).toEqual([]);
    expect(planReminders([med({ active: false })], { enabled: true, showNames: false })).toEqual([]);
  });

  // Privacy: the lock screen should reveal nothing unless the user opts in.
  it('keeps notification text generic unless names are allowed', () => {
    const [hidden] = planReminders([med({})], { enabled: true, showNames: false });
    expect(`${hidden.title} ${hidden.body}`).not.toMatch(/Metformin|500 mg/);
    const [shown] = planReminders([med({})], { enabled: true, showNames: true });
    expect(shown.body).toMatch(/Metformin 500 mg/);
  });

  // Safety: reminders never contain dosing advice or glucose values.
  it('never includes dosing or glucose language', () => {
    const plans = planReminders([med({})], { enabled: true, showNames: true });
    for (const p of plans) expect(`${p.title} ${p.body}`.toLowerCase()).not.toMatch(/insulin|units|mg\/dl|mmol|glucose|take \d/);
  });
});
