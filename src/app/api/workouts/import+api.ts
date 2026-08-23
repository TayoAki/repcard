import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, workoutExercises, workouts } from "@/db";
import { auth } from "@/lib/auth";

const bodySchema = z.object({ slug: z.string().regex(/^[a-z0-9]{4,12}$/) });

/** Clones a shared workout into the caller's library (source: imported). */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ message: "Invalid slug" }, { status: 400 });

  const [source] = await db
    .select()
    .from(workouts)
    .where(eq(workouts.shareSlug, parsed.data.slug))
    .limit(1);
  if (!source) return Response.json({ message: "Shared workout not found" }, { status: 404 });

  const plan = await db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, source.id));

  const [clone] = await db
    .insert(workouts)
    .values({
      userId: session.user.id,
      name: source.name,
      description: source.description,
      image: source.image,
      source: "imported",
    })
    .returning();

  if (plan.length > 0) {
    try {
      await db.insert(workoutExercises).values(
        plan.map((item) => ({
          workoutId: clone.id,
          exerciseId: item.exerciseId,
          sets: item.sets,
          reps: item.reps,
          targetWeight: item.targetWeight,
          restSeconds: item.restSeconds,
          position: item.position,
        })),
      );
    } catch (error) {
      // Never leave a hollow imported workout behind on a failed clone.
      await db.delete(workouts).where(eq(workouts.id, clone.id));
      throw error;
    }
  }

  return Response.json({ id: clone.id, name: clone.name }, { status: 201 });
}
