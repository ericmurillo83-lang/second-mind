import type { DateKey, TimeOfDay } from './types';

/** Small, dependency-free date helpers. All "day" logic uses the device's local time zone. */

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return toDateKey(fromDateKey(key)) === key;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

/** Monday-start week containing `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7; // Monday = 0
  return addDays(day, -offset);
}

export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function parseTimeOfDay(time: TimeOfDay): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

export function isValidTimeOfDay(time: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return false;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export function toTimeOfDay(date: Date): TimeOfDay {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Combine a local calendar day and wall-clock time into a Date. */
export function combine(dateKey: DateKey, time: TimeOfDay): Date {
  const day = fromDateKey(dateKey);
  const { hour, minute } = parseTimeOfDay(time);
  day.setHours(hour, minute, 0, 0);
  return day;
}

export function compareTimeOfDay(a: TimeOfDay, b: TimeOfDay): number {
  return a.localeCompare(b);
}

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function weekdayShort(date: Date): string {
  return WEEKDAYS_SHORT[date.getDay()];
}

export function weekdayLong(date: Date): string {
  return WEEKDAYS_LONG[date.getDay()];
}

export function monthShort(date: Date): string {
  return MONTHS_SHORT[date.getMonth()];
}

export function monthLong(date: Date): string {
  return MONTHS_LONG[date.getMonth()];
}

/** "8:05 AM" */
export function formatTime(date: Date): string {
  const h = date.getHours();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(date.getMinutes())} ${suffix}`;
}

export function formatTimeOfDay(time: TimeOfDay): string {
  const { hour, minute } = parseTimeOfDay(time);
  const d = new Date(2000, 0, 1, hour, minute);
  return formatTime(d);
}

/** "Oct 24" */
export function formatShortDate(date: Date): string {
  return `${monthShort(date)} ${date.getDate()}`;
}

/** "Saturday, October 24" */
export function formatLongDate(date: Date): string {
  return `${weekdayLong(date)}, ${monthLong(date)} ${date.getDate()}`;
}

/** "Today", "Yesterday", "Tomorrow", or "Sat, Oct 24" (adds the year when it differs). */
export function formatRelativeDay(date: Date, now: Date = new Date()): string {
  const diff = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  const base = `${weekdayShort(date)}, ${formatShortDate(date)}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base}, ${date.getFullYear()}`;
}

/** "Just now", "12 min ago", "3 hr ago", or a day label for older values. */
export function formatTimeAgo(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return 'Just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < 12 * HOUR) return `${Math.floor(diff / HOUR)} hr ago`;
  return `${formatRelativeDay(date, now)}, ${formatTime(date)}`;
}

/** Whole days from today until `date` (negative if in the past). */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY);
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Month grid (Monday-start) of Dates, including leading/trailing days to fill 6 weeks. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
