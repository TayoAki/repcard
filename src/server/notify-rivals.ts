import { and, eq, gt, or } from "drizzle-orm";

import { battles, db, profiles, user } from "@/db";
import { sendPush } from "@/lib/push";

/**
 * Push "your rival just trained" to opponents in battles that are active AND
 * still inside their window. Fire-and-forget: a push failure must never fail
 * the training-save that triggered it. Called from both workout-session and
 * run saves - a run is training too.
 */
export async function notifyRivals(userId: string, userName: string) {
  const active = await db
    .select({ creatorId: battles.creatorId, opponentId: battles.opponentId })
    .from(battles)
    .where(
      and(
        eq(battles.status, "active"),
        gt(battles.endsAt, new Date()),
        or(eq(battles.creatorId, userId), eq(battles.opponentId, userId)),
      ),
    );

  const rivalIds = active
    .map((b) => (b.creatorId === userId ? b.opponentId : b.creatorId))
    .filter((id): id is string => Boolean(id));
  if (rivalIds.length === 0) return;

  const tokens = await db
    .select({ pushToken: profiles.pushToken })
    .from(profiles)
    .innerJoin(user, eq(user.id, profiles.userId))
    .where(or(...rivalIds.map((id) => eq(profiles.userId, id))));

  await sendPush(
    tokens.map((t) => t.pushToken).filter((t): t is string => Boolean(t)),
    "Your rival just trained 🔔",
    `${userName} just logged training. The battle clock is ticking.`,
  );
}
