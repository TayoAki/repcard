import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db, workouts } from "@/db";
import { auth } from "@/lib/auth";

const idSchema = z.uuid();

const randomSlug = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");

/** Mints (or returns) the public share slug for a workout. */
export async function POST(request: Request, { id }: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });
  if (!idSchema.safeParse(id).success) {
    return Response.json({ message: "Invalid workout id" }, { status: 400 });
  }

  const [workout] = await db
    .select({ id: workouts.id, shareSlug: workouts.shareSlug })
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, session.user.id)))
    .limit(1);
  if (!workout) return Response.json({ message: "Workout not found" }, { status: 404 });

  if (workout.shareSlug) return Response.json({ slug: workout.shareSlug });

  // Race + collision safe: the qualified update only lands while shareSlug is
  // still null, and a unique-violation on the slug just tries a fresh one.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = randomSlug();
    try {
      const updated = await db
        .update(workouts)
        .set({ shareSlug: slug })
        .where(and(eq(workouts.id, id), isNull(workouts.shareSlug)))
        .returning();
      if (updated.length > 0) return Response.json({ slug }, { status: 201 });

      // Lost the race - return whatever the winner minted.
      const [current] = await db
        .select({ shareSlug: workouts.shareSlug })
        .from(workouts)
        .where(eq(workouts.id, id))
        .limit(1);
      if (current?.shareSlug) return Response.json({ slug: current.shareSlug });
    } catch {
      // slug collision with another workout - loop and regenerate
    }
  }
  return Response.json({ message: "Could not mint a share link" }, { status: 500 });
}
