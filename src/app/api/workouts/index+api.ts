import { count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db, exercises, workoutExercises, workouts } from "@/db";
import { auth } from "@/lib/auth";
import { storeCoverImage } from "@/lib/upload";

export const workoutPayloadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  image: z.string().min(100).max(12_000_000).nullish(),
  exercises: z
    .array(
      z.object({
        id: z.uuid(),
        sets: z.number().int().min(1).max(20),
        reps: z.number().int().min(1).max(100),
        targetWeight: z.number().min(0).max(1000).nullish(),
        restSeconds: z.number().int().min(0).max(600),
      }),
    )
    .min(1)
    .max(12)
    .refine((list) => new Set(list.map((e) => e.id)).size === list.length, {
      message: "Duplicate exercise",
    }),
});

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: workouts.id,
      name: workouts.name,
      image: workouts.image,
      source: workouts.source,
      muscles: sql<string>`coalesce(string_agg(distinct ${exercises.muscles}, ' • '), '')`,
      exerciseCount: count(workoutExercises.id),
      totalSets: sql<number>`coalesce(sum(${workoutExercises.sets}), 0)::int`,
    })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .leftJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(eq(workouts.userId, session.user.id))
    .groupBy(workouts.id)
    .orderBy(desc(workouts.createdAt));

  return Response.json(rows);
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = workoutPayloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ message: "Invalid workout", error: parsed.error }, { status: 400 });
  }
  const { name, description, image, exercises: items } = parsed.data;

  const cover = image
    ? await storeCoverImage(image, `cover-${session.user.id}-${Date.now()}.jpg`)
    : null;

  const [created] = await db
    .insert(workouts)
    .values({ userId: session.user.id, name, description: description || null, image: cover })
    .returning();

  await db.insert(workoutExercises).values(
    items.map((item, position) => ({
      workoutId: created.id,
      exerciseId: item.id,
      sets: item.sets,
      reps: item.reps,
      targetWeight: item.targetWeight ?? null,
      restSeconds: item.restSeconds,
      position,
    })),
  );

  return Response.json(created, { status: 201 });
}
