import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, exercises, profiles, workoutExercises, workouts } from "@/db";
import { auth } from "@/lib/auth";
import { buildFallbackPlan } from "@/lib/plan-templates";

const aiPlanSchema = z.object({
  workouts: z
    .array(
      z.object({
        name: z.string().min(3).max(60),
        description: z.string().max(200),
        exercises: z
          .array(
            z.object({
              slug: z.string(),
              sets: z.number().int().min(2).max(6),
              reps: z.number().int().min(3).max(20),
              restSeconds: z.number().int().min(30).max(300),
            }),
          )
          .min(3)
          .max(8),
      }),
    )
    .length(3),
});

/**
 * Generates a 3-workout program from the athlete's profile and saves it
 * (source: ai_plan). AI path validates slugs against the catalog and falls
 * back to the deterministic template generator on any failure.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);
  if (!profile) return Response.json({ message: "Profile not found" }, { status: 404 });

  const catalog = await db
    .select({ id: exercises.id, slug: exercises.slug, name: exercises.name, muscles: exercises.muscles })
    .from(exercises);
  const bySlug = new Map(catalog.map((e) => [e.slug, e]));

  let plan = buildFallbackPlan(profile.goal, profile.experience, catalog);
  let source: "ai" | "template" = "template";

  if (process.env.AI_GATEWAY_API_KEY) {
    try {
      const { output } = await generateText({
        model: "google/gemini-2.5-flash",
        output: Output.object({ schema: aiPlanSchema }),
        system:
          "You are a strength coach designing a weekly program. Use ONLY exercise slugs from the provided catalog. Return exactly 3 workouts.",
        prompt: `Athlete: goal=${profile.goal}, experience=${profile.experience}, gender=${profile.gender}\nCatalog slugs: ${catalog.map((e) => e.slug).join(", ")}`,
      });
      const candidate = (output?.workouts ?? [])
        .map((w) => ({
          name: w.name,
          description: w.description,
          exercises: w.exercises
            .filter((e) => bySlug.has(e.slug))
            .map((e) => ({
              id: bySlug.get(e.slug)!.id,
              sets: e.sets,
              reps: e.reps,
              restSeconds: e.restSeconds,
            })),
        }))
        .filter((w) => w.exercises.length >= 3);
      if (candidate.length === 3) {
        plan = candidate;
        source = "ai";
      }
    } catch (error) {
      console.warn("AI plan fell back to templates:", error);
    }
  }

  const created: { id: string; name: string; exerciseCount: number }[] = [];
  for (const workout of plan) {
    const [row] = await db
      .insert(workouts)
      .values({
        userId: session.user.id,
        name: workout.name,
        description: workout.description,
        source: "ai_plan",
      })
      .returning();
    if (workout.exercises.length > 0) {
      await db.insert(workoutExercises).values(
        workout.exercises.map((e, position) => ({
          workoutId: row.id,
          exerciseId: e.id,
          sets: e.sets,
          reps: e.reps,
          restSeconds: e.restSeconds,
          position,
        })),
      );
    }
    created.push({ id: row.id, name: workout.name, exerciseCount: workout.exercises.length });
  }

  return Response.json({ source, workouts: created }, { status: 201 });
}
