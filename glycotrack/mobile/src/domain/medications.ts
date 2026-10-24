import { addDays, combine, toDateKey } from './dates';
import type { DateKey, DoseLog, DoseStatus, Medication, MedicationForm, TimeOfDay } from './types';

/**
 * Medication schedule helpers.
 *
 * SAFETY: GlycoTrack only records what the user's prescriber already decided. It never
 * calculates, adjusts or suggests doses (including insulin). See docs/SAFETY.md.
 */

export const FORM_LABEL: Record<MedicationForm, string> = {
  tablet: 'Tablet',
  capsule: 'Capsule',
  liquid: 'Liquid',
  injection: 'Injection',
  inhaler: 'Inhaler',
  patch: 'Patch',
  other: 'Other',
};

export type ScheduledDoseState = DoseStatus | 'due' | 'upcoming' | 'missed';

export interface ScheduledDose {
  key: string;
  medication: Medication;
  date: DateKey;
  time: TimeOfDay;
  at: Date;
  state: ScheduledDoseState;
  log?: DoseLog;
}

/** A dose is "due" from its scheduled time until this many minutes later, then "missed". */
export const DUE_WINDOW_MINUTES = 120;

export function doseKey(medicationId: string, date: DateKey, time: TimeOfDay): string {
  return `${medicationId}|${date}|${time}`;
}

export function indexDoseLogs(logs: readonly DoseLog[]): Map<string, DoseLog> {
  const map = new Map<string, DoseLog>();
  for (const log of logs) map.set(doseKey(log.medicationId, log.date, log.time), log);
  return map;
}

export function scheduleForDay(
  medications: readonly Medication[],
  logs: readonly DoseLog[],
  day: Date,
  now: Date = new Date(),
): ScheduledDose[] {
  const date = toDateKey(day);
  const byKey = indexDoseLogs(logs);
  const doses: ScheduledDose[] = [];
  for (const medication of medications) {
    if (!medication.active) continue;
    for (const time of medication.times) {
      const key = doseKey(medication.id, date, time);
      const at = combine(date, time);
      const log = byKey.get(key);
      let state: ScheduledDoseState;
      if (log) state = log.status;
      else if (at.getTime() > now.getTime()) state = 'upcoming';
      else if (now.getTime() - at.getTime() <= DUE_WINDOW_MINUTES * 60_000) state = 'due';
      else state = 'missed';
      doses.push({ key, medication, date, time, at, state, log });
    }
  }
  return doses.sort(
    (a, b) => a.time.localeCompare(b.time) || a.medication.name.localeCompare(b.medication.name),
  );
}

/** Doses still needing attention today (due first, then upcoming), for the dashboard. */
export function nextDoses(doses: readonly ScheduledDose[], limit = 3): ScheduledDose[] {
  const rank: Record<ScheduledDoseState, number> = {
    due: 0,
    missed: 1,
    upcoming: 2,
    taken: 3,
    skipped: 3,
  };
  return doses
    .filter((d) => d.state === 'due' || d.state === 'upcoming' || d.state === 'missed')
    .sort((a, b) => rank[a.state] - rank[b.state] || a.at.getTime() - b.at.getTime())
    .slice(0, limit);
}

export interface Adherence {
  scheduled: number;
  taken: number;
  skipped: number;
  /** 0–100, or null when nothing was scheduled. */
  pct: number | null;
}

/**
 * Adherence over the `days` days ending yesterday plus today's doses that are already past.
 * Upcoming doses are excluded so the number isn't penalised for the future.
 */
export function adherence(
  medications: readonly Medication[],
  logs: readonly DoseLog[],
  days: number,
  now: Date = new Date(),
): Adherence {
  let scheduled = 0;
  let taken = 0;
  let skipped = 0;
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(now, -i);
    for (const dose of scheduleForDay(medications, logs, day, now)) {
      if (dose.state === 'upcoming' || dose.state === 'due') continue;
      // Doses scheduled before the medication was added don't count against adherence.
      if (dose.at.getTime() < new Date(dose.medication.createdAt).getTime()) continue;
      scheduled++;
      if (dose.state === 'taken') taken++;
      if (dose.state === 'skipped') skipped++;
    }
  }
  return { scheduled, taken, skipped, pct: scheduled ? Math.round((taken / scheduled) * 100) : null };
}

export function sortTimes(times: readonly TimeOfDay[]): TimeOfDay[] {
  return [...new Set(times)].sort((a, b) => a.localeCompare(b));
}

export function refillSoon(medication: Medication, now: Date = new Date(), withinDays = 7): boolean {
  if (!medication.refillOn) return false;
  const diff = (new Date(`${medication.refillOn}T00:00:00`).getTime() - now.getTime()) / 86_400_000;
  return diff <= withinDays;
}
