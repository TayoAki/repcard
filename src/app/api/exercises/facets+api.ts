import { isNotNull, sql } from "drizzle-orm";

import { db, exercises } from "@/db";
import { auth } from "@/lib/auth";

/** Distinct filter values for the picker's chip rows. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const [muscles, equipment, difficulties] = await Promise.all([
    db
      .select({
        value: sql<string>`distinct unnest(string_to_array(${exercises.muscles}, ' • '))`,
      })
      .from(exercises),
    db
      .select({ value: sql<string>`distinct ${exercises.equipment}` })
      .from(exercises)
      .where(isNotNull(exercises.equipment)),
    db.select({ value: sql<string>`distinct ${exercises.difficulty}` }).from(exercises),
  ]);

  const values = (rows: { value: string }[]) => rows.map((r) => r.value).sort();
  return Response.json(
    { muscles: values(muscles), equipment: values(equipment), difficulties: values(difficulties) },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
