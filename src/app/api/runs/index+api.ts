import { and, desc, eq, lt, or } from "drizzle-orm";
import { z } from "zod";

import { db, runs } from "@/db";
import { auth } from "@/lib/auth";
import { serverError } from "@/server/log";
import { notifyRivals } from "@/server/notify-rivals";

const CLOCK_SKEW_MS = 5 * 60 * 1000;

const saveSchema = z
  .object({
    distanceMeters: z.number().int().min(100).max(100_000), // 100m - 100km
    durationSeconds: z.number().int().min(60).max(24 * 3600),
    note: z.string().trim().max(280).optional(),
    completedAt: z.iso.datetime().optional(), // defaults to now (log-after-run)
  })
  .refine(
    (v) => !v.completedAt || new Date(v.completedAt).getTime() <= Date.now() + CLOCK_SKEW_MS,
    { message: "completedAt cannot be in the future" },
  );

// Composite "<ISO>_<uuid>" cursor, same convention as /api/sessions.
const cursorSchema = z
  .string()
  .regex(/^.+_[0-9a-f-]{36}$/)
  .transform((raw) => {
    const at = raw.lastIndexOf("_");
    return { completedAt: raw.slice(0, at), id: raw.slice(at + 1) };
  })
  .pipe(z.object({ completedAt: z.iso.datetime(), id: z.uuid() }));

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const rawLimit = params.get("limit");
  const limit = rawLimit ? z.coerce.number().int().min(1).max(50).safeParse(rawLimit) : null;
  if (limit && !limit.success) return Response.json({ message: "Invalid limit" }, { status: 400 });
  const pageSize = limit?.success ? limit.data : 20;

  const rawCursor = params.get("cursor");
  const cursor = rawCursor ? cursorSchema.safeParse(rawCursor) : null;
  if (cursor && !cursor.success) return Response.json({ message: "Invalid cursor" }, { status: 400 });

  const rows = await db
    .select()
    .from(runs)
    .where(
      and(
        eq(runs.userId, session.user.id),
        cursor?.success
          ? or(
              lt(runs.completedAt, new Date(cursor.data.completedAt)),
              and(
                eq(runs.completedAt, new Date(cursor.data.completedAt)),
                lt(runs.id, cursor.data.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(desc(runs.completedAt), desc(runs.id))
    .limit(pageSize + 1);

  const items = rows.slice(0, pageSize);
  const last = items[items.length - 1];
  const nextCursor =
    rows.length > pageSize ? `${last.completedAt.toISOString()}_${last.id}` : null;

  return Response.json({ items, nextCursor });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = saveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ message: "Invalid run", error: parsed.error }, { status: 400 });
  }
  const { distanceMeters, durationSeconds, note, completedAt } = parsed.data;

  try {
    const [created] = await db
      .insert(runs)
      .values({
        userId: session.user.id,
        distanceMeters,
        durationSeconds,
        note: note || null,
        completedAt: completedAt ? new Date(completedAt) : new Date(),
      })
      .returning();
    notifyRivals(session.user.id, session.user.name).catch(() => {});
    return Response.json(created, { status: 201 });
  } catch (error) {
    return serverError("runs.POST", error);
  }
}
