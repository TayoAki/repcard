import { and, asc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { db, exercises } from "@/db";
import { auth } from "@/lib/auth";

const filterSchema = z.object({
  search: z.string().trim().max(60).optional(),
  muscle: z.string().trim().max(40).optional(),
  equipment: z.string().trim().max(40).optional(),
  difficulty: z.enum(["beginner", "intermediate", "expert"]).optional(),
});

/**
 * List the global catalog. `?search=` matches name or muscles; `?muscle=`,
 * `?equipment=`, and `?difficulty=` narrow it further and combine freely.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const parsed = filterSchema.safeParse({
    search: params.get("search") ?? undefined,
    muscle: params.get("muscle") ?? undefined,
    equipment: params.get("equipment") ?? undefined,
    difficulty: params.get("difficulty") ?? undefined,
  });
  if (!parsed.success) return Response.json({ message: "Invalid filters" }, { status: 400 });
  const { search, muscle, equipment, difficulty } = parsed.data;

  const rows = await db
    .select({
      id: exercises.id,
      name: exercises.name,
      image: exercises.image,
      muscles: exercises.muscles,
      difficulty: exercises.difficulty,
    })
    .from(exercises)
    .where(
      and(
        search
          ? or(ilike(exercises.name, `%${search}%`), ilike(exercises.muscles, `%${search}%`))
          : undefined,
        muscle ? ilike(exercises.muscles, `%${muscle}%`) : undefined,
        equipment ? eq(exercises.equipment, equipment) : undefined,
        difficulty ? eq(exercises.difficulty, difficulty) : undefined,
      ),
    )
    .orderBy(asc(exercises.name));

  return Response.json(rows);
}
