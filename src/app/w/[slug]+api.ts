import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, exercises, workoutExercises, workouts } from "@/db";
import { escapeHtml, htmlPage } from "@/lib/web/page";

const slugSchema = z.string().regex(/^[a-z0-9]{4,12}$/);

/** PUBLIC HTML: shared workout page with an import deep link. */
export async function GET(_request: Request, { slug }: Record<string, string>) {
  if (!slugSchema.safeParse(slug).success) return new Response("Not found", { status: 404 });

  const [workout] = await db
    .select({ id: workouts.id, name: workouts.name, description: workouts.description })
    .from(workouts)
    .where(eq(workouts.shareSlug, slug))
    .limit(1);
  if (!workout) return new Response("Not found", { status: 404 });

  const items = await db
    .select({
      name: exercises.name,
      muscles: exercises.muscles,
      sets: workoutExercises.sets,
      reps: workoutExercises.reps,
      restSeconds: workoutExercises.restSeconds,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(eq(workoutExercises.workoutId, workout.id))
    .orderBy(asc(workoutExercises.position));

  const body = `
<h1>${escapeHtml(workout.name)}</h1>
<p class="sub">${escapeHtml(workout.description ?? `${items.length} exercises · shared from RepCard`)}</p>
<ul>
${items
  .map(
    (e) =>
      `<li>${escapeHtml(e.name)}<small>${e.sets}×${e.reps} · rest ${e.restSeconds}s · ${escapeHtml(e.muscles)}</small></li>`,
  )
  .join("\n")}
</ul>`;

  return new Response(
    htmlPage({
      title: workout.name,
      description: `${items.length}-exercise workout shared on RepCard`,
      deepLink: `repcard://import/${slug}`,
      body,
    }),
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } },
  );
}
