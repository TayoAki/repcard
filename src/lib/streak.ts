import { addDays, startOfDay, subDays } from "date-fns";

export type StreakSummary = {
  current: number;
  best: number;
  trainedDays: Date[];
  /**
   * Freezes in play for the live streak: those still banked plus any currently
   * bridging a gap in it. `freezesEarned - freezesUsed` is what's still banked.
   */
  freezesEarned: number;
  /** Freezes currently spent bridging gaps in the live streak. */
  freezesUsed: number;
};

const DAYS_PER_FREEZE = 7;
const FREEZE_CAP = 2;

/**
 * Streak = consecutive calendar days with >=1 training entry. Two rules soften
 * it:
 *  - An untrained *today* doesn't break the run until the day is over (the walk
 *    anchors at yesterday then).
 *  - Earned rest-day "freezes" (1 per 7 trained days, max 2 banked) each bridge
 *    a single missed day, so consistency protects the streak. Freezes bridge
 *    gaps but are not themselves counted as trained days.
 *
 * Freezes are allocated CHRONOLOGICALLY by a forward walk: a freeze can only
 * bridge a gap if it was already earned by training that happened before that
 * gap - you can never spend a freeze earned by a later session. Freezes only
 * ever help, so this can't shorten a streak that already held.
 */
export function summarizeStreak(sessionDates: Date[], now = new Date()): StreakSummary {
  const daySet = new Set(sessionDates.map((d) => startOfDay(d).getTime()));
  const days = [...daySet].sort((a, b) => a - b);
  if (days.length === 0) {
    return { current: 0, best: 0, trainedDays: [], freezesEarned: 0, freezesUsed: 0 };
  }

  // An untrained today doesn't break the run yet, so stop the walk at yesterday.
  const anchor = daySet.has(startOfDay(now).getTime())
    ? startOfDay(now)
    : subDays(startOfDay(now), 1);

  // Forward pass over every calendar day from the first trained day to the
  // anchor. `banked` freezes accrue as training happens and are only spent on
  // gaps encountered afterward, so allocation is chronologically honest.
  let banked = 0; // earned, unspent (inventory, capped at FREEZE_CAP)
  let progress = 0; // trained-day count toward the next freeze
  let streak = 0; // length of the run ending at the current cursor
  let used = 0; // freezes spent within that live run
  let best = 0;

  for (let cursor = new Date(days[0]); cursor.getTime() <= anchor.getTime(); cursor = addDays(cursor, 1)) {
    if (daySet.has(cursor.getTime())) {
      streak += 1;
      progress += 1;
      if (progress >= DAYS_PER_FREEZE) {
        progress -= DAYS_PER_FREEZE;
        if (banked < FREEZE_CAP) banked += 1;
      }
    } else if (banked > 0) {
      banked -= 1; // bridge this missed day with a banked freeze
      used += 1;
    } else {
      streak = 0; // no freeze available - the run breaks
      used = 0;
    }
    if (streak > best) best = streak;
  }

  return {
    current: streak,
    best,
    trainedDays: days.map((t) => new Date(t)),
    freezesEarned: banked + used,
    freezesUsed: used,
  };
}
