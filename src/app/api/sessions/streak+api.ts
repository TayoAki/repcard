import { eq } from "drizzle-orm";

import { db, workoutSessions } from "@/db";
import { auth } from "@/lib/auth";

/** All session dates for the streak engine (client computes the summary). */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({ startedAt: workoutSessions.startedAt })
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, session.user.id));

  return Response.json({ dates: rows.map((r) => r.startedAt.toISOString()) });
}
