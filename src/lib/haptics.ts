/**
 * Centralized haptic vocabulary - one place decides how RepCard feels.
 * All fire-and-forget; haptics must never block or throw.
 */
import * as Haptics from "expo-haptics";

const safe = (fn: () => Promise<void>) => fn().catch(() => {});

export const haptic = {
  /** Checking off a set. */
  setDone: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Finishing a workout / saving something meaningful. */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Destructive or failed action. */
  warn: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Light tick for toggles and steppers. */
  tick: () => safe(() => Haptics.selectionAsync()),
};
