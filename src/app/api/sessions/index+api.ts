import { count, countDistinct, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, workoutExercises, workouts, workoutSessions, workoutSessionSets } from "@/db";
import { auth } from "@/lib/auth";

const saveSchema = z.object({
  workoutId: z.uuid(),
  startedAt: z.iso.datetime(),
  completedAt: z.iso.datetime(),
  durationSeconds: z.number().int().min(0).max(24 * 3600),
  sets: z
    .array(
      z.object({
        exerciseId: z.uuid(),
        setNumber: z.number().int().min(1).max(30),
        reps: z.number().int().min(0).max(500),
        weight: z.number().min(0).max(1000).optional(), // kg canonical
      }),
    )
    .max(200),
});

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const raw = new URL(request.url).searchParams.get("limit");
  const limit = raw ? z.coerce.number().int().min(1).max(50).safeParse(raw) : null;
  if (limit && !limit.success) return Response.json({ message: "Invalid limit" }, { status: 400 });

  const query = db
    .select({
      id: workoutSessions.id,
      workoutId: workoutSessions.workoutId,
      workoutName: workouts.name,
      image: workouts.image,
      completedAt: workoutSessions.completedAt,
      durationSeconds: workoutSessions.durationSeconds,
      exerciseCount: countDistinct(workoutSessionSets.exerciseId),
      setCount: count(workoutSessionSets.id),
    })
    .from(workoutSessions)
    .innerJoin(workouts, eq(workouts.id, workoutSessions.workoutId))
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
      .select({ exerciseId: workoutExercises.exerciseId })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, workoutId)),
  ]);

  if (!workout || workout.userId !== session.user.id) {
    return Response.json({ message: "Workout not found" }, { status: 404 });
  }

  // Only sets belonging to the workout's plan are recorded.
  const allowed = new Set(planned.map((p) => p.exerciseId));
  const valid = sets.filter((s) => allowed.has(s.exerciseId));

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
    await db.insert(workoutSessionSets).values(
      valid.map((s) => ({
        sessionId: created.id,
        exerciseId: s.exerciseId,
        setNumber: s.setNumber,
        reps: s.reps,
        weight: s.weight ?? null,
      })),
    );
  }

  return Response.json({ id: created.id, recordedSets: valid.length }, { status: 201 });
}
