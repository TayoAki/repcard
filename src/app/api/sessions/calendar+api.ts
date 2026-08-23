import { differenceInCalendarDays } from "date-fns";
import { and, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";

import { db, workoutSessions } from "@/db";
import { auth } from "@/lib/auth";

const rangeSchema = z
  .object({ start: z.iso.datetime(), end: z.iso.datetime() })
  .refine((r) => new Date(r.start) < new Date(r.end), { message: "start must precede end" })
  .refine((r) => differenceInCalendarDays(new Date(r.end), new Date(r.start)) <= 62, {
    message: "range too long",
  });

/** Session dates inside a range - powers calendar dots. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const parsed = rangeSchema.safeParse({
    start: url.searchParams.get("start"),
    end: url.searchParams.get("end"),
  });
  if (!parsed.success) return Response.json({ message: "Invalid range" }, { status: 400 });

  const rows = await db
    .select({ completedAt: workoutSessions.completedAt })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, session.user.id),
        gte(workoutSessions.completedAt, new Date(parsed.data.start)),
        lt(workoutSessions.completedAt, new Date(parsed.data.end)),
      ),
    );

  return Response.json({ dates: rows.map((r) => r.completedAt.toISOString()) });
}
