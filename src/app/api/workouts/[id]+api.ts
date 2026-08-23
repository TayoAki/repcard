import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, exercises as exerciseTable, workoutExercises, workouts } from "@/db";
import { auth } from "@/lib/auth";
import { storeCoverImage } from "@/lib/upload";
import { workoutPayloadSchema } from "./index+api";
import { serverError } from "@/server/log";

const idSchema = z.uuid();

const ownWorkout = async (userId: string, id: string) => {
  const [row] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
    .limit(1);
  return row;
};

export async function GET(request: Request, { id }: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (!idSchema.safeParse(id).success) {
    return Response.json({ message: "Invalid workout id" }, { status: 400 });
  }

  const [workout, items] = await Promise.all([
    ownWorkout(session.user.id, id),
    db
      .select({
        id: exerciseTable.id,
        name: exerciseTable.name,
        image: exerciseTable.image,
        muscles: exerciseTable.muscles,
        sets: workoutExercises.sets,
        reps: workoutExercises.reps,
        targetWeight: workoutExercises.targetWeight,
        restSeconds: workoutExercises.restSeconds,
        position: workoutExercises.position,
      })
      .from(workoutExercises)
      .innerJoin(exerciseTable, eq(exerciseTable.id, workoutExercises.exerciseId))
      .where(eq(workoutExercises.workoutId, id))
      .orderBy(asc(workoutExercises.position)),
  ]);

  if (!workout) return Response.json({ message: "Workout not found" }, { status: 404 });

  const muscles = [...new Set(items.map((i) => i.muscles))].join(" • ");
  return Response.json({ ...workout, exercises: items, muscles });
}

/** Full-replace update: workout fields + the exercise list. */
export async function PATCH(request: Request, { id }: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (!idSchema.safeParse(id).success) {
    return Response.json({ message: "Invalid workout id" }, { status: 400 });
  }

  const existing = await ownWorkout(session.user.id, id);
  if (!existing) return Response.json({ message: "Workout not found" }, { status: 404 });

  const parsed = workoutPayloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ message: "Invalid workout", error: parsed.error }, { status: 400 });
  }
  const { name, description, image, exercises: items } = parsed.data;

  // image: undefined = keep, null = clear, base64 = replace
  let cover = existing.image;
  if (image === null) cover = null;
  else if (image) {
    cover = await storeCoverImage(image, `cover-${session.user.id}-${Date.now()}.jpg`);
  }

  try {
    await db.transaction(async (tx) => {
    await tx
      .update(workouts)
      .set({ name, description: description || null, image: cover })
      .where(eq(workouts.id, id));
    await tx.delete(workoutExercises).where(eq(workoutExercises.workoutId, id));
    await tx.insert(workoutExercises).values(
      items.map((item, position) => ({
        workoutId: id,
        exerciseId: item.id,
        sets: item.sets,
        reps: item.reps,
        targetWeight: item.targetWeight ?? null,
        restSeconds: item.restSeconds,
        position,
      })),
    );
    });
  } catch (error) {
    return serverError("workouts.PATCH", error);
  }

  return Response.json({ message: "Workout updated", coverStored: image == null || cover !== null });
}

export async function DELETE(request: Request, { id }: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (!idSchema.safeParse(id).success) {
    return Response.json({ message: "Invalid workout id" }, { status: 400 });
  }

  const existing = await ownWorkout(session.user.id, id);
  if (!existing) return Response.json({ message: "Workout not found" }, { status: 404 });

  await db.delete(workouts).where(eq(workouts.id, id)); // cascades to workout_exercises
  return Response.json({ message: "Workout deleted" });
}
