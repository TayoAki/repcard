import { differenceInCalendarDays, startOfDay, subDays } from "date-fns";

export type StreakSummary = {
  current: number;
  best: number;
  trainedDays: Date[];
  /** Rest-day freezes earned by consistency (1 per 7 trained days, capped). */
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
 * Freezes only ever help, so this can't shorten a streak that already held.
 */
export function summarizeStreak(sessionDates: Date[], now = new Date()): StreakSummary {
  const daySet = new Set(sessionDates.map((d) => startOfDay(d).getTime()));
  const days = [...daySet].sort((a, b) => a - b);
  if (days.length === 0) {
    return { current: 0, best: 0, trainedDays: [], freezesEarned: 0, freezesUsed: 0 };
  }

  const freezesEarned = Math.min(FREEZE_CAP, Math.floor(days.length / DAYS_PER_FREEZE));

  // Walk backward from the anchor, counting trained days and spending freezes
  // to bridge single missed days until the budget runs out.
  let cursor = startOfDay(now);
  if (!daySet.has(cursor.getTime())) cursor = subDays(cursor, 1);

  let current = 0;
  let budget = freezesEarned;
  const oldest = days[0];
  while (cursor.getTime() >= oldest) {
    if (daySet.has(cursor.getTime())) {
      current += 1;
      cursor = subDays(cursor, 1);
    } else if (budget > 0) {
      budget -= 1; // spend a freeze to bridge this missed day
      cursor = subDays(cursor, 1);
    } else {
      break;
    }
  }
  const freezesUsed = freezesEarned - budget;

  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of days) {
    run = previous !== null && differenceInCalendarDays(day, previous) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    previous = day;
  }
  best = Math.max(best, current); // freeze-bridged current can set a record

  return {
    current,
    best,
    trainedDays: days.map((t) => new Date(t)),
    freezesEarned,
    freezesUsed,
  };
}
