import { and, count, countDistinct, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import { z } from "zod";

import { battles, db, profiles, user, workoutExercises, workouts, workoutSessions, workoutSessionSets } from "@/db";
import { auth } from "@/lib/auth";
import { sendPush } from "@/lib/push";
import { serverError } from "@/server/log";

const CLOCK_SKEW_MS = 5 * 60 * 1000;

const saveSchema = z
  .object({
    workoutId: z.uuid(),
    startedAt: z.iso.datetime(),
    completedAt: z.iso.datetime(),
    durationSeconds: z.number().int().min(0).max(24 * 3600),
    // 12 exercises x 20 sets is the largest plan the composer allows
    sets: z
      .array(
        z.object({
          exerciseId: z.uuid(),
          setNumber: z.number().int().min(1).max(30),
          reps: z.number().int().min(0).max(500),
          weight: z.number().min(0).max(1000).optional(), // kg canonical
        }),
      )
      .max(240),
  })
  .refine((v) => new Date(v.startedAt) <= new Date(v.completedAt), {
    message: "startedAt must not follow completedAt",
  })
  .refine((v) => new Date(v.completedAt).getTime() <= Date.now() + CLOCK_SKEW_MS, {
    message: "completedAt cannot be in the future",
  });

const cursorSchema = z.iso.datetime();

/** Cursor-paginated history: `?cursor=` is the previous page's nextCursor. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const rawLimit = params.get("limit");
  const limit = rawLimit ? z.coerce.number().int().min(1).max(50).safeParse(rawLimit) : null;
  if (limit && !limit.success) return Response.json({ message: "Invalid limit" }, { status: 400 });
  const pageSize = limit?.success ? limit.data : 20;

  const rawCursor = params.get("cursor");
  const cursor = rawCursor ? cursorSchema.safeParse(rawCursor) : null;
  if (cursor && !cursor.success) return Response.json({ message: "Invalid cursor" }, { status: 400 });

  // leftJoin: sessions of deleted workouts still belong in history
  const query = db
    .select({
      id: workoutSessions.id,
      workoutId: workoutSessions.workoutId,
      workoutName: sql<string>`coalesce(${workouts.name}, 'Deleted workout')`,
      image: workouts.image,
      completedAt: workoutSessions.completedAt,
      durationSeconds: workoutSessions.durationSeconds,
      exerciseCount: countDistinct(workoutSessionSets.exerciseId),
      setCount: count(workoutSessionSets.id),
    })
    .from(workoutSessions)
    .leftJoin(workouts, eq(workouts.id, workoutSessions.workoutId))
    .leftJoin(workoutSessionSets, eq(workoutSessionSets.sessionId, workoutSessions.id))
    .where(
      and(
        eq(workoutSessions.userId, session.user.id),
        cursor?.success ? lt(workoutSessions.completedAt, new Date(cursor.data)) : undefined,
      ),
    )
    .groupBy(workoutSessions.id, workouts.id)
    .orderBy(desc(workoutSessions.completedAt));

  // Fetch one extra row to learn whether another page exists.
  const rows = await query.limit(pageSize + 1);
  const items = rows.slice(0, pageSize);
  const nextCursor =
    rows.length > pageSize ? items[items.length - 1].completedAt.toISOString() : null;

  return Response.json({ items, nextCursor });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = saveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ message: "Invalid session", error: parsed.error }, { status: 400 });
  }
  const { workoutId, startedAt, completedAt, durationSeconds, sets } = parsed.data;

  const [[workout], planned] = await Promise.all([
    db
      .select({ id: workouts.id, userId: workouts.userId })
      .from(workouts)
      .where(eq(workouts.id, workoutId))
      .limit(1),
    db
      .select({ exerciseId: workoutExercises.exerciseId, sets: workoutExercises.sets })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, workoutId)),
  ]);

  if (!workout || workout.userId !== session.user.id) {
    return Response.json({ message: "Workout not found" }, { status: 404 });
  }

  // A set is recorded only if its exercise is in the plan, its set number is
  // within that exercise's planned count, and it's the first with that number.
  const plannedSets = new Map(planned.map((p) => [p.exerciseId, p.sets]));
  const seen = new Set<string>();
  const valid = sets.filter((s) => {
    const max = plannedSets.get(s.exerciseId);
    if (max === undefined || s.setNumber > max) return false;
    const key = `${s.exerciseId}:${s.setNumber}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  let created;
  try {
    created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(workoutSessions)
      .values({
        userId: session.user.id,
        workoutId,
        startedAt: new Date(startedAt),
        completedAt: new Date(completedAt),
        durationSeconds,
      })
      .returning();
    if (valid.length > 0) {
      await tx.insert(workoutSessionSets).values(
        valid.map((s) => ({
          sessionId: row.id,
          exerciseId: s.exerciseId,
          setNumber: s.setNumber,
          reps: s.reps,
          weight: s.weight ?? null,
        })),
      );
    }
      return row;
    });
  } catch (error) {
    return serverError("sessions.POST", error);
  }

  notifyRivals(session.user.id, session.user.name).catch(() => {});

  return Response.json({ id: created.id, recordedSets: valid.length }, { status: 201 });
}

/** Tell rivals in battles that are active AND inside their window. Never throws. */
async function notifyRivals(userId: string, userName: string) {
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
    `${userName} logged a session. The battle clock is ticking.`,
  );
}
