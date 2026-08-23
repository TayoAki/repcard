import { differenceInCalendarDays, startOfDay, subDays } from "date-fns";

export type StreakSummary = {
  current: number;
  best: number;
  trainedDays: Date[];
};

/**
 * Streak semantics: consecutive calendar days with >=1 session. Today
 * counts when trained, but an untrained today does NOT break the run
 * until the day is actually over - the walk starts from yesterday then.
 */
export function summarizeStreak(sessionDates: Date[], now = new Date()): StreakSummary {
  const daySet = new Set(sessionDates.map((d) => startOfDay(d).getTime()));
  const days = [...daySet].sort((a, b) => a - b);
  if (days.length === 0) return { current: 0, best: 0, trainedDays: [] };

  let cursor = startOfDay(now);
  if (!daySet.has(cursor.getTime())) cursor = subDays(cursor, 1);

  let current = 0;
  while (daySet.has(cursor.getTime())) {
    current += 1;
    cursor = subDays(cursor, 1);
  }

  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of days) {
    run = previous !== null && differenceInCalendarDays(day, previous) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    previous = day;
  }

  return { current, best, trainedDays: days.map((t) => new Date(t)) };
}
