import { adherence, nextDoses, refillSoon, scheduleForDay, sortTimes } from './medications';
import type { DoseLog, Medication } from './types';

const med = (id: string, times: string[], over: Partial<Medication> = {}): Medication => ({
  id,
  createdAt: new Date(2026, 0, 1).toISOString(),
  updatedAt: '',
  name: id,
  strength: '10 mg',
  form: 'tablet',
  instructions: '',
  times,
  remindersOn: true,
  active: true,
  ...over,
});
const log = (medicationId: string, date: string, time: string, status: DoseLog['status']): DoseLog => ({
  id: `${medicationId}-${date}-${time}`,
  createdAt: '',
  updatedAt: '',
  medicationId,
  date,
  time,
  status,
});

describe('scheduleForDay', () => {
  const now = new Date(2026, 9, 24, 12, 0);
  const meds = [med('A', ['08:00', '20:00']), med('B', ['11:00']), med('Off', ['09:00'], { active: false })];

  it('lists doses for active medications in time order with states', () => {
    const doses = scheduleForDay(meds, [log('A', '2026-10-24', '08:00', 'taken')], now, now);
    expect(doses.map((d) => `${d.medication.id}@${d.time}:${d.state}`)).toEqual([
      'A@08:00:taken',
      'B@11:00:due',
      'A@20:00:upcoming',
    ]);
  });

  it('marks unlogged doses past the due window as missed', () => {
    const later = new Date(2026, 9, 24, 14, 0);
    const doses = scheduleForDay(meds, [], later, later);
    expect(doses.find((d) => d.medication.id === 'B')?.state).toBe('missed');
  });

  it('orders next doses: due, then missed, then upcoming', () => {
    const at = new Date(2026, 9, 24, 12, 0);
    const doses = scheduleForDay(meds, [], at, at);
    expect(nextDoses(doses).map((d) => `${d.medication.id}@${d.time}`)).toEqual(['B@11:00', 'A@08:00', 'A@20:00']);
  });
});

describe('adherence', () => {
  it('counts only past doses after the medication was added', () => {
    const now = new Date(2026, 9, 24, 12, 0);
    const m = med('A', ['08:00'], { createdAt: new Date(2026, 9, 22, 0, 0).toISOString() });
    const logs = [log('A', '2026-10-22', '08:00', 'taken'), log('A', '2026-10-23', '08:00', 'skipped')];
    const result = adherence([m], logs, 7, now);
    // 22nd taken, 23rd skipped, 24th missed (08:00 + 2h window passed at 12:00)
    expect(result).toEqual({ scheduled: 3, taken: 1, skipped: 1, pct: 33 });
  });

  it('returns null pct when nothing was scheduled', () => {
    expect(adherence([], [], 7).pct).toBeNull();
  });
});

describe('helpers', () => {
  it('dedupes and sorts times', () => {
    expect(sortTimes(['20:00', '08:00', '20:00'])).toEqual(['08:00', '20:00']);
  });

  it('flags refills due within a week', () => {
    const now = new Date(2026, 9, 24);
    expect(refillSoon(med('A', [], { refillOn: '2026-10-28' }), now)).toBe(true);
    expect(refillSoon(med('A', [], { refillOn: '2026-11-20' }), now)).toBe(false);
    expect(refillSoon(med('A', []), now)).toBe(false);
  });
});
