import { isSameDay } from "date-fns";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import { ensureNotificationPermission } from "@/lib/notifications";
import { type StreakSummary } from "@/lib/streak";

const REMINDER_ID = "streak-reminder";
const OPT_IN_KEY = "repcard.streakReminderOptIn";
const REMIND_HOUR = 20; // 8pm local - a gentle evening nudge
const QUIET_AFTER_HOUR = 22; // don't schedule a fresh nudge after 10pm

// Monotonic guard: only the newest syncStreakReminder call may finish its
// async work, so a stale call can't schedule after a newer one cancelled.
let generation = 0;

async function optedIn(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(OPT_IN_KEY)) === "1";
  } catch {
    return false;
  }
}

/** True only when the user opted into streak reminders AND permission is live.
 *  (Opt-in is a distinct choice - notification permission granted for battle
 *  pushes must never, by itself, arm streak reminders.) */
export async function remindersEnabled(): Promise<boolean> {
  if (!(await optedIn())) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Opt in (may prompt for permission), then arm the reminder. Returns whether
 *  reminders are now actually live (opted in + permission granted). */
export async function enableReminders(summary: StreakSummary): Promise<boolean> {
  try {
    await AsyncStorage.setItem(OPT_IN_KEY, "1");
  } catch {
    // if we can't persist the choice, reminders would silently not re-arm later
  }
  const granted = await ensureNotificationPermission();
  if (granted) await syncStreakReminder(summary);
  return granted;
}

/**
 * Schedules (or clears) a single local "your streak is about to end" nudge.
 * Fire-and-forget and fully guarded: no opt-in, no permission, or any error
 * just means no reminder. Called whenever the streak summary changes, so it
 * self-cancels the moment the user trains today or the streak lapses.
 */
export async function syncStreakReminder(summary: StreakSummary): Promise<void> {
  const gen = ++generation;
  try {
    // Clear the previous one first so scheduling stays idempotent.
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
    if (gen !== generation) return; // a newer call superseded us

    const now = new Date();
    const trainedToday = summary.trainedDays.some((d) => isSameDay(d, now));
    if (summary.current <= 0 || trainedToday) return; // nothing at risk today

    if (!(await remindersEnabled())) return; // opt-in + permission both required
    if (gen !== generation) return;

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

    if (gen !== generation) return; // last check before we commit the schedule
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: { title: "Keep your streak 🔥", body, sound: "default" },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  } catch {
    // no-op: reminders are best-effort
  }
}
