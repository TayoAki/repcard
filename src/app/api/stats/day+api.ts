import { differenceInCalendarDays } from "date-fns";
import { and, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";

import { db, runs, workoutSessions } from "@/db";
import { auth } from "@/lib/auth";

const daySchema = z
  .object({ start: z.iso.datetime(), end: z.iso.datetime() })
  .refine((r) => new Date(r.start) < new Date(r.end), { message: "start must precede end" })
  .refine((r) => differenceInCalendarDays(new Date(r.end), new Date(r.start)) <= 1, {
    message: "one day max",
  });

/** Single-day dashboard stats: session count, total + average time. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const parsed = daySchema.safeParse({
    start: url.searchParams.get("start"),
    end: url.searchParams.get("end"),
  });
  if (!parsed.success) return Response.json({ message: "Invalid day range" }, { status: 400 });

  const [rows, runRows] = await Promise.all([
    db
      .select({ durationSeconds: workoutSessions.durationSeconds })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, session.user.id),
          gte(workoutSessions.completedAt, new Date(parsed.data.start)),
          lt(workoutSessions.completedAt, new Date(parsed.data.end)),
        ),
      ),
    db
      .select({ durationSeconds: runs.durationSeconds })
      .from(runs)
      .where(
        and(
          eq(runs.userId, session.user.id),
          gte(runs.completedAt, new Date(parsed.data.start)),
          lt(runs.completedAt, new Date(parsed.data.end)),
        ),
      ),
  ]);

  // A run is a training session for daily-stats purposes.
  const all = [...rows, ...runRows];
  const totalSeconds = all.reduce((sum, r) => sum + r.durationSeconds, 0);
  return Response.json({
    sessions: all.length,
    totalSeconds,
    averageSeconds: all.length ? Math.round(totalSeconds / all.length) : 0,
  });
}
