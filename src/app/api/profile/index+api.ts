import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, profiles } from "@/db";
import { auth } from "@/lib/auth";

const patchSchema = z.object({
  weightUnit: z.enum(["kg", "lb"]).optional(),
  pushToken: z.string().max(64).nullable().optional(),
});

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);
  if (!profile) return Response.json({ message: "Profile not found" }, { status: 404 });

  return Response.json({ ...profile, name: session.user.name, email: session.user.email });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ message: "Invalid profile" }, { status: 400 });

  await db.update(profiles).set(parsed.data).where(eq(profiles.userId, session.user.id));
  return Response.json({ message: "Profile updated" });
}
