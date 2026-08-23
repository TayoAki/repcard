import { and, count, countDistinct, desc, eq, gt, or, sql } from "drizzle-orm";
import { z } from "zod";

import { battles, db, profiles, user, workoutExercises, workouts, workoutSessions, workoutSessionSets } from "@/db";
import { auth } from "@/lib/auth";
import { sendPush } from "@/lib/push";

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

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const raw = new URL(request.url).searchParams.get("limit");
  const limit = raw ? z.coerce.number().int().min(1).max(50).safeParse(raw) : null;
  if (limit && !limit.success) return Response.json({ message: "Invalid limit" }, { status: 400 });

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
    .where(eq(workoutSessions.userId, session.user.id))
    .groupBy(workoutSessions.id, workouts.id)
    .orderBy(desc(workoutSessions.completedAt));

  return Response.json(limit?.success ? await query.limit(limit.data) : await query);
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

  const [created] = await db
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
    try {
      await db.insert(workoutSessionSets).values(
        valid.map((s) => ({
          sessionId: created.id,
          exerciseId: s.exerciseId,
          setNumber: s.setNumber,
          reps: s.reps,
          weight: s.weight ?? null,
        })),
      );
    } catch (error) {
      // No transactions on the Neon HTTP driver: compensate so a failed
      // sets-insert never strands an empty session (or duplicates on retry).
      await db.delete(workoutSessions).where(eq(workoutSessions.id, created.id));
      throw error;
    }
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
