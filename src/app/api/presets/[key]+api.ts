import { eq } from "drizzle-orm";

import { db, exercises, profiles } from "@/db";
import { auth } from "@/lib/auth";
import { buildWorkoutFromKeys, QUICK_STARTS, type QuickStartKey } from "@/lib/plan-templates";

/**
 * One-tap composer starting point: a named split filled from the catalog,
 * dosed to the athlete's experience. Returns full picker-shaped exercises so
 * the client can drop them straight into the draft.
 */
export async function GET(request: Request, { key }: Record<string, string>) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  // Object.hasOwn: `in` would accept prototype keys like "constructor"
  if (!Object.hasOwn(QUICK_STARTS, key)) {
    return Response.json({ message: "Unknown preset" }, { status: 404 });
  }
  const preset = QUICK_STARTS[key as QuickStartKey];

  const [profile] = await db
    .select({ experience: profiles.experience })
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);

  const catalog = await db
    .select({
      id: exercises.id,
      slug: exercises.slug,
      name: exercises.name,
      image: exercises.image,
      muscles: exercises.muscles,
    })
    .from(exercises);

  const prescribed = buildWorkoutFromKeys(
    preset.muscleKeys,
    profile?.experience ?? "beginner",
    catalog,
  );
  const byId = new Map(catalog.map((e) => [e.id, e]));

  return Response.json({
    name: preset.name,
    exercises: prescribed.map((p) => {
      const meta = byId.get(p.id)!;
      return {
        id: p.id,
        name: meta.name,
        image: meta.image,
        muscles: meta.muscles,
        sets: p.sets,
        reps: p.reps,
        targetWeight: null,
        restSeconds: p.restSeconds,
      };
    }),
  });
}
