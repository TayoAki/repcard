import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, exercises, workoutExercises, workouts } from "@/db";
import { allowRequest, clientIp, tooManyRequests } from "@/server/rate-limit";

const slugSchema = z.string().regex(/^[a-z0-9]{4,12}$/);

/** PUBLIC: shared-workout JSON - powers the web page and in-app import. */
export async function GET(request: Request, { slug }: Record<string, string>) {
  if (!allowRequest(`public:shared:${clientIp(request)}`, 60, 60_000)) return tooManyRequests();
  if (!slugSchema.safeParse(slug).success) {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  const [workout] = await db
    .select({ id: workouts.id, name: workouts.name, description: workouts.description, image: workouts.image })
    .from(workouts)
    .where(eq(workouts.shareSlug, slug))
    .limit(1);
  if (!workout) return Response.json({ message: "Not found" }, { status: 404 });

  const items = await db
    .select({
      exerciseId: workoutExercises.exerciseId,
      name: exercises.name,
      muscles: exercises.muscles,
      sets: workoutExercises.sets,
      reps: workoutExercises.reps,
      targetWeight: workoutExercises.targetWeight,
      restSeconds: workoutExercises.restSeconds,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(eq(workoutExercises.workoutId, workout.id))
    .orderBy(asc(workoutExercises.position));

  return Response.json(
    { name: workout.name, description: workout.description, image: workout.image, exercises: items },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
