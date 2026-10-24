import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { parseTimeOfDay } from '@/domain/dates';
import type { Medication } from '@/domain/types';

/**
 * Local medication reminders (on-device notifications; nothing leaves the phone).
 *
 * SAFETY: these are convenience reminders for a schedule the user entered. They are not
 * alarms, can be delayed or suppressed by the OS, and never carry glucose values or dosing
 * advice. By default they don't name the medication either, so a lock screen reveals nothing.
 */

export const REMINDER_ID_PREFIX = 'glycotrack-med-';
const CHANNEL_ID = 'medication-reminders';

export const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

let handlerInstalled = false;
export function installNotificationHandler() {
  if (!remindersSupported || handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getReminderPermission(): Promise<PermissionState> {
  if (!remindersSupported) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

export async function requestReminderPermission(): Promise<PermissionState> {
  if (!remindersSupported) return 'unsupported';
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  if (!current.canAskAgain) return 'denied';
  const { status } = await Notifications.requestPermissionsAsync();
  return status as PermissionState;
}

export interface ReminderPlan {
  identifier: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
}

/** Pure: which daily reminders should exist for these medications. */
export function planReminders(
  medications: readonly Medication[],
  options: { enabled: boolean; showNames: boolean },
): ReminderPlan[] {
  if (!options.enabled) return [];
  const plans: ReminderPlan[] = [];
  for (const med of medications) {
    if (!med.active || !med.remindersOn) continue;
    for (const time of med.times) {
      const { hour, minute } = parseTimeOfDay(time);
      plans.push({
        identifier: `${REMINDER_ID_PREFIX}${med.id}-${time.replace(':', '')}`,
        hour,
        minute,
        title: 'Medication reminder',
        body: options.showNames
          ? `Scheduled: ${med.name} ${med.strength}. Open GlycoTrack to log it.`
          : 'You have a scheduled medication. Open GlycoTrack to log it.',
      });
    }
  }
  return plans;
}

/**
 * Make the OS schedule match the plan: cancel our reminders, then schedule the current set.
 * Returns the number scheduled. Safe to call often; it only touches GlycoTrack reminders.
 */
export async function syncReminders(plans: readonly ReminderPlan[]): Promise<number> {
  if (!remindersSupported) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (plans.length === 0) return 0;
  if ((await getReminderPermission()) !== 'granted') return 0;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Medication reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }
  for (const p of plans) {
    await Notifications.scheduleNotificationAsync({
      identifier: p.identifier,
      content: { title: p.title, body: p.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: p.hour,
        minute: p.minute,
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      },
    });
  }
  return plans.length;
}
