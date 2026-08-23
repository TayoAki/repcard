import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, exercises as exerciseTable, workouts, workoutSessions, workoutSessionSets } from "@/db";
import { auth } from "@/lib/auth";

const idSchema = z.uuid();

/** Box score: header + sets grouped per exercise + total volume (kg). */
export async function GET(request: Request, { id }: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (!idSchema.safeParse(id).success) {
    return Response.json({ message: "Invalid session id" }, { status: 400 });
  }

  const [headerRows, setRows] = await Promise.all([
    db
      .select({
        id: workoutSessions.id,
        workoutId: workoutSessions.workoutId,
        workoutName: workouts.name,
        image: workouts.image,
        startedAt: workoutSessions.startedAt,
        completedAt: workoutSessions.completedAt,
        durationSeconds: workoutSessions.durationSeconds,
      })
      .from(workoutSessions)
      .innerJoin(workouts, eq(workouts.id, workoutSessions.workoutId))
      .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, session.user.id)))
      .limit(1),
    db
      .select({
        exerciseId: exerciseTable.id,
        exerciseName: exerciseTable.name,
        exerciseImage: exerciseTable.image,
        setNumber: workoutSessionSets.setNumber,
        reps: workoutSessionSets.reps,
        weight: workoutSessionSets.weight,
      })
      .from(workoutSessionSets)
      .innerJoin(exerciseTable, eq(exerciseTable.id, workoutSessionSets.exerciseId))
      .where(eq(workoutSessionSets.sessionId, id))
      .orderBy(asc(workoutSessionSets.exerciseId), asc(workoutSessionSets.setNumber)),
  ]);

  const header = headerRows[0];
  if (!header) return Response.json({ message: "Session not found" }, { status: 404 });

  const byExercise = new Map<
    string,
    { id: string; name: string; image: string | null; sets: { reps: number; weight: number | null }[] }
  >();
  let volumeKg: number | null = null;

  for (const row of setRows) {
    const entry =
      byExercise.get(row.exerciseId) ??
      byExercise
        .set(row.exerciseId, { id: row.exerciseId, name: row.exerciseName, image: row.exerciseImage, sets: [] })
        .get(row.exerciseId)!;
    entry.sets.push({ reps: row.reps, weight: row.weight });
    if (row.weight !== null) volumeKg = (volumeKg ?? 0) + row.weight * row.reps;
  }

  return Response.json({
    ...header,
    exercises: [...byExercise.values()],
    setCount: setRows.length,
    volumeKg: volumeKg !== null ? Math.round(volumeKg) : null,
  });
}
