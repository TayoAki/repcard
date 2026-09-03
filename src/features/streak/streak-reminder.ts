import { isSameDay } from "date-fns";
import * as Notifications from "expo-notifications";

import { ensureNotificationPermission } from "@/lib/notifications";
import { type StreakSummary } from "@/lib/streak";

const REMINDER_ID = "streak-reminder";
const REMIND_HOUR = 20; // 8pm local - a gentle evening nudge
const QUIET_AFTER_HOUR = 22; // don't schedule a fresh nudge after 10pm

/** True once notification permission is granted (no prompt). */
export async function remindersEnabled(): Promise<boolean> {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Ask for permission (may prompt), then arm the reminder. Returns granted. */
export async function enableReminders(summary: StreakSummary): Promise<boolean> {
  const granted = await ensureNotificationPermission();
  if (granted) await syncStreakReminder(summary);
  return granted;
}

/**
 * Schedules (or clears) a single local "your streak is about to end" nudge.
 * Fire-and-forget and fully guarded: no permission or any error just means no
 * reminder. Called whenever the streak summary changes, so it self-cancels the
 * moment the user trains today or the streak lapses.
 */
export async function syncStreakReminder(summary: StreakSummary): Promise<void> {
  try {
    // Clear the previous one first so scheduling stays idempotent.
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});

    const now = new Date();
    const trainedToday = summary.trainedDays.some((d) => isSameDay(d, now));
    if (summary.current <= 0 || trainedToday) return; // nothing at risk today

    if (!(await remindersEnabled())) return; // never prompt from the auto path

    // Fire at 8pm today; if it's already past that (but before quiet hours),
    // fire a few minutes out; after quiet hours, skip until the next cycle.
    const fireAt = new Date(now);
    if (now.getHours() < REMIND_HOUR) {
      fireAt.setHours(REMIND_HOUR, 0, 0, 0);
    } else if (now.getHours() < QUIET_AFTER_HOUR) {
      fireAt.setTime(now.getTime() + 5 * 60 * 1000);
    } else {
      return;
    }

    const hasFreeze = summary.freezesEarned - summary.freezesUsed > 0;
    const body = hasFreeze
      ? `Train today or a rest-day freeze covers your ${summary.current}-day streak.`
      : `Your ${summary.current}-day streak ends at midnight. A quick session keeps it alive.`;

    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: { title: "Keep your streak 🔥", body, sound: "default" },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  } catch {
    // no-op: reminders are best-effort
  }
}
