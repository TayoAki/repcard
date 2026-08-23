import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

import { battles, db, profiles, user, workoutSessions } from "@/db";
import { auth } from "@/lib/auth";
import { summarizeStreak } from "@/lib/streak";

const idSchema = z.uuid();

async function fighterStats(userId: string, windowStart: Date | null) {
  const [rows, named] = await Promise.all([
    db
      .select({ startedAt: workoutSessions.startedAt })
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, userId)),
    db
      .select({ name: user.name, handle: profiles.handle })
      .from(user)
      .innerJoin(profiles, eq(profiles.userId, user.id))
      .where(eq(user.id, userId))
      .limit(1),
  ]);
  const streak = summarizeStreak(rows.map((r) => r.startedAt));
  const inWindow = windowStart ? rows.filter((r) => r.startedAt >= windowStart).length : 0;
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
    fighterStats(me, battle.startedAt),
    rivalId ? fighterStats(rivalId, battle.startedAt) : Promise.resolve(null),
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
