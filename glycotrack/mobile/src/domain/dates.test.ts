import {
  addDays,
  combine,
  daysUntil,
  formatRelativeDay,
  formatTime,
  formatTimeAgo,
  formatTimeOfDay,
  fromDateKey,
  isValidDateKey,
  isValidTimeOfDay,
  monthGrid,
  startOfWeek,
  toDateKey,
  weekDays,
} from './dates';

describe('date keys', () => {
  it('round-trips local calendar days', () => {
    const d = new Date(2026, 0, 5, 23, 59);
    expect(toDateKey(d)).toBe('2026-01-05');
    expect(toDateKey(fromDateKey('2026-01-05'))).toBe('2026-01-05');
  });

  it('validates keys and times', () => {
    expect(isValidDateKey('2026-02-29')).toBe(false);
    expect(isValidDateKey('2028-02-29')).toBe(true);
    expect(isValidDateKey('2026-1-5')).toBe(false);
    expect(isValidTimeOfDay('23:59')).toBe(true);
    expect(isValidTimeOfDay('24:00')).toBe(false);
  });

  it('combines a day and time', () => {
    const d = combine('2026-10-24', '07:30');
    expect(d.getHours()).toBe(7);
    expect(d.getMinutes()).toBe(30);
    expect(toDateKey(d)).toBe('2026-10-24');
  });
});

describe('weeks', () => {
  it('starts weeks on Monday', () => {
    const saturday = new Date(2026, 9, 24);
    expect(toDateKey(startOfWeek(saturday))).toBe('2026-10-19');
    const sunday = new Date(2026, 9, 25);
    expect(toDateKey(startOfWeek(sunday))).toBe('2026-10-19');
    expect(weekDays(saturday).map(toDateKey)).toHaveLength(7);
  });

  it('builds a 6-week month grid', () => {
    const grid = monthGrid(2026, 1);
    expect(grid).toHaveLength(42);
    expect(grid[0].getDay()).toBe(1);
  });
});

describe('formatting', () => {
  const now = new Date(2026, 9, 24, 12, 0);
  it('formats times in 12-hour clock', () => {
    expect(formatTime(new Date(2026, 0, 1, 0, 5))).toBe('12:05 AM');
    expect(formatTime(new Date(2026, 0, 1, 13, 0))).toBe('1:00 PM');
    expect(formatTimeOfDay('08:00')).toBe('8:00 AM');
  });

  it('formats relative days', () => {
    expect(formatRelativeDay(now, now)).toBe('Today');
    expect(formatRelativeDay(addDays(now, -1), now)).toBe('Yesterday');
    expect(formatRelativeDay(addDays(now, 1), now)).toBe('Tomorrow');
    expect(formatRelativeDay(new Date(2026, 9, 20), now)).toBe('Tue, Oct 20');
    expect(formatRelativeDay(new Date(2025, 9, 20), now)).toBe('Mon, Oct 20, 2025');
  });

  it('formats time ago', () => {
    expect(formatTimeAgo(new Date(now.getTime() - 20_000), now)).toBe('Just now');
    expect(formatTimeAgo(new Date(now.getTime() - 12 * 60_000), now)).toBe('12 min ago');
    expect(formatTimeAgo(new Date(now.getTime() - 3 * 3_600_000), now)).toBe('3 hr ago');
  });

  it('counts whole days until a date', () => {
    expect(daysUntil(addDays(now, 6), now)).toBe(6);
    expect(daysUntil(addDays(now, -2), now)).toBe(-2);
  });
});
