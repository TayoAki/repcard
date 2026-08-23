/** Shared card-payload builder used by /api/card/me and /api/card/[handle]. */
import { subDays } from "date-fns";
import { and, eq, gte, lt, max, sql } from "drizzle-orm";

import { db, exercises, profiles, user, workoutSessions, workoutSessionSets } from "@/db";
import { computeRating, POSITION } from "@/lib/rating";
import { summarizeStreak } from "@/lib/streak";

export async function buildCardPayload(userId: string) {
  const now = new Date();
  const d14 = subDays(now, 14);
  const d28 = subDays(now, 28);
  const d30 = subDays(now, 30);

  const [profileRows, userRows, sessionRows, volumeRows, muscleRows, prRows] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
    db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1),
    db
      .select({ completedAt: workoutSessions.completedAt, durationSeconds: workoutSessions.durationSeconds })
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, userId)),
    // volume per half-window (kg)
    db
      .select({
        recent: sql<number>`coalesce(sum(case when ${workoutSessions.completedAt} >= ${d14} then ${workoutSessionSets.weight} * ${workoutSessionSets.reps} else 0 end), 0)::float`,
        prior: sql<number>`coalesce(sum(case when ${workoutSessions.completedAt} >= ${d28} and ${workoutSessions.completedAt} < ${d14} then ${workoutSessionSets.weight} * ${workoutSessionSets.reps} else 0 end), 0)::float`,
      })
      .from(workoutSessionSets)
      .innerJoin(workoutSessions, eq(workoutSessions.id, workoutSessionSets.sessionId))
      .where(eq(workoutSessions.userId, userId)),
    db
      .select({ count: sql<number>`count(distinct split_part(${exercises.muscles}, ' • ', 1))::int` })
      .from(workoutSessionSets)
      .innerJoin(workoutSessions, eq(workoutSessions.id, workoutSessionSets.sessionId))
      .innerJoin(exercises, eq(exercises.id, workoutSessionSets.exerciseId))
      .where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.completedAt, d28))),
    // exercises whose 30d max beats their prior all-time max
    db
      .select({
        exerciseId: workoutSessionSets.exerciseId,
        recentMax: max(sql<number>`case when ${workoutSessions.completedAt} >= ${d30} then ${workoutSessionSets.weight} end`),
        priorMax: max(sql<number>`case when ${workoutSessions.completedAt} < ${d30} then ${workoutSessionSets.weight} end`),
      })
      .from(workoutSessionSets)
      .innerJoin(workoutSessions, eq(workoutSessions.id, workoutSessionSets.sessionId))
      .where(eq(workoutSessions.userId, userId))
      .groupBy(workoutSessionSets.exerciseId),
  ]);

  const profile = profileRows[0];
  if (!profile) return null;

  const streak = summarizeStreak(sessionRows.map((s) => s.completedAt));
  const sessionsLast28 = sessionRows.filter((s) => s.completedAt >= d28).length;
  const prCount30 = prRows.filter(
    (r) => r.recentMax !== null && (r.priorMax === null || Number(r.recentMax) > Number(r.priorMax)),
  ).length;

  const rating = computeRating({
    goal: profile.goal,
    sessionsLast28,
    currentStreak: streak.current,
    volumeLast14: volumeRows[0]?.recent ?? 0,
    volumePrev14: volumeRows[0]?.prior ?? 0,
    muscleGroups28: muscleRows[0]?.count ?? 0,
    prCount30,
  });

  const totalSeconds = sessionRows.reduce((sum, s) => sum + s.durationSeconds, 0);

  return {
    name: userRows[0]?.name ?? "Athlete",
    handle: profile.handle,
    serial: profile.cardSerial,
    position: POSITION[profile.goal],
    season: now.getFullYear(),
    overall: rating.overall,
    components: rating.components,
    streak: streak.current,
    bestStreak: streak.best,
    stats: {
      sessions28: sessionsLast28,
      totalSessions: sessionRows.length,
      totalMinutes: Math.round(totalSeconds / 60),
      volume28Kg: Math.round((volumeRows[0]?.recent ?? 0) + (volumeRows[0]?.prior ?? 0)),
      prCount30,
      muscleGroups28: muscleRows[0]?.count ?? 0,
    },
  };
}

export type CardPayload = NonNullable<Awaited<ReturnType<typeof buildCardPayload>>>;
