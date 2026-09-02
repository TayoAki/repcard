import { eq } from "drizzle-orm";

import { db, runs, workoutSessions } from "@/db";
import { auth } from "@/lib/auth";

/** All training dates - workout sessions AND runs - for the streak engine. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const [sessionRows, runRows] = await Promise.all([
    db
      .select({ completedAt: workoutSessions.completedAt })
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, session.user.id)),
    db
      .select({ completedAt: runs.completedAt })
      .from(runs)
      .where(eq(runs.userId, session.user.id)),
  ]);

  return Response.json({
    dates: [...sessionRows, ...runRows].map((r) => r.completedAt.toISOString()),
  });
}
