import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

import { battles, db, profiles, runs, user, workoutSessions } from "@/db";
import { auth } from "@/lib/auth";
import { summarizeStreak } from "@/lib/streak";

const idSchema = z.uuid();

async function fighterStats(userId: string, windowStart: Date | null, windowEnd: Date | null) {
  const [rows, runRows, named] = await Promise.all([
    db
      .select({ completedAt: workoutSessions.completedAt })
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, userId)),
    db
      .select({ completedAt: runs.completedAt })
      .from(runs)
      .where(eq(runs.userId, userId)),
    db
      .select({ name: user.name, handle: profiles.handle })
      .from(user)
      .innerJoin(profiles, eq(profiles.userId, user.id))
      .where(eq(user.id, userId))
      .limit(1),
  ]);
  // Runs count as training - same as streak/stats/card - so a battle reflects
  // ALL training, not just lifting.
  const trainingDates = [...rows, ...runRows].map((r) => r.completedAt);
  const streak = summarizeStreak(trainingDates);
  // Scores freeze at endsAt: training after the window can't change a result.
  const inWindow = windowStart
    ? trainingDates.filter(
        (d) => d >= windowStart && (windowEnd === null || d <= windowEnd),
      ).length
    : 0;
  return {
    name: named[0]?.name ?? "Athlete",
    handle: named[0]?.handle ?? "",
    streak: streak.current,
    sessionsInBattle: inWindow,
  };
}

/** Head-to-head payload for one battle. */
export async function GET(request: Request, { id }: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (!idSchema.safeParse(id).success) {
    return Response.json({ message: "Battle not found" }, { status: 404 });
  }

  const [battle] = await db.select().from(battles).where(eq(battles.id, id)).limit(1);
  if (!battle || (battle.creatorId !== session.user.id && battle.opponentId !== session.user.id)) {
    return Response.json({ message: "Battle not found" }, { status: 404 });
  }

  const finished = battle.endsAt !== null && battle.endsAt < new Date();
  const me = session.user.id;
  const rivalId = battle.creatorId === me ? battle.opponentId : battle.creatorId;

  const [mine, rival] = await Promise.all([
    fighterStats(me, battle.startedAt, battle.endsAt),
    rivalId ? fighterStats(rivalId, battle.startedAt, battle.endsAt) : Promise.resolve(null),
  ]);

  return Response.json({
    id: battle.id,
    code: battle.code,
    status: finished && battle.status === "active" ? "finished" : battle.status,
    startedAt: battle.startedAt,
    endsAt: battle.endsAt,
    me: mine,
    rival,
  });
}
