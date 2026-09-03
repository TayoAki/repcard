import { subDays } from "date-fns";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

import { db, profiles, runs, user, workoutSessions, workoutSessionSets } from "@/db";
import { auth } from "@/lib/auth";

const querySchema = z.object({
  metric: z.enum(["sessions", "volume", "distance"]).default("sessions"),
  period: z.enum(["week", "all"]).default("week"),
});

type Row = { userId: string; value: number };

/**
 * Global leaderboard by metric + period. Only opted-in profiles with a handle
 * appear. Returns the top 50 plus the caller's own rank (even if outside it),
 * so competing is always legible. Runs count as sessions here too.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    metric: params.get("metric") ?? undefined,
    period: params.get("period") ?? undefined,
  });
  if (!parsed.success) return Response.json({ message: "Invalid query" }, { status: 400 });
  const { metric, period } = parsed.data;
  const since = period === "week" ? subDays(new Date(), 7) : new Date(0);

  // Aggregate the chosen metric per user. Sessions unions workouts + runs.
  let values: Row[];
  if (metric === "volume") {
    values = await db
      .select({
        userId: workoutSessions.userId,
        value: sql<number>`coalesce(sum(${workoutSessionSets.weight} * ${workoutSessionSets.reps}), 0)::float`,
      })
      .from(workoutSessionSets)
      .innerJoin(workoutSessions, eq(workoutSessions.id, workoutSessionSets.sessionId))
      .where(gte(workoutSessions.completedAt, since))
      .groupBy(workoutSessions.userId);
  } else if (metric === "distance") {
    values = await db
      .select({
        userId: runs.userId,
        value: sql<number>`coalesce(sum(${runs.distanceMeters}), 0)::float`,
      })
      .from(runs)
      .where(gte(runs.completedAt, since))
      .groupBy(runs.userId);
  } else {
    const [wo, rn] = await Promise.all([
      db
        .select({ userId: workoutSessions.userId, value: sql<number>`count(*)::int` })
        .from(workoutSessions)
        .where(gte(workoutSessions.completedAt, since))
        .groupBy(workoutSessions.userId),
      db
        .select({ userId: runs.userId, value: sql<number>`count(*)::int` })
        .from(runs)
        .where(gte(runs.completedAt, since))
        .groupBy(runs.userId),
    ]);
    const merged = new Map<string, number>();
    for (const r of [...wo, ...rn]) merged.set(r.userId, (merged.get(r.userId) ?? 0) + r.value);
    values = [...merged].map(([userId, value]) => ({ userId, value }));
  }

  // Keep only opted-in profiles with a handle; attach display fields.
  const eligible = await db
    .select({ userId: profiles.userId, handle: profiles.handle, name: user.name })
    .from(profiles)
    .innerJoin(user, eq(user.id, profiles.userId))
    .where(eq(profiles.leaderboardOptOut, false));
  const meta = new Map(eligible.map((e) => [e.userId, e]));

  const ranked = values
    .filter((v) => meta.has(v.userId) && v.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((v, i) => ({
      rank: i + 1,
      handle: meta.get(v.userId)!.handle,
      name: meta.get(v.userId)!.name,
      value: Math.round(v.value),
      isMe: v.userId === session.user.id,
    }));

  const meRow = ranked.find((r) => r.isMe) ?? null;
  return Response.json({ metric, period, rows: ranked.slice(0, 50), me: meRow });
}
