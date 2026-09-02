import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db, profiles } from "@/db";
import { auth } from "@/lib/auth";
import { toHandle } from "@/lib/handle";
import { onboardingSchema } from "@/lib/validation/onboarding";
import { serverError } from "@/server/log";

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

const uniqueHandle = async (name: string) => {
  const base = toHandle(name);
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const [taken] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.handle, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  return `${base.slice(0, 12)}${Date.now() % 100000000}`;
};

/**
 * Creates the profile for an authenticated user who does not have one yet -
 * the path social sign-ins (Apple) take, since they bypass the email-signup
 * hook that normally creates it. Idempotent: 409 if a profile already exists.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = onboardingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ message: "Missing onboarding details" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.userId, session.user.id))
    .limit(1);
  if (existing) return Response.json({ message: "Profile already exists" }, { status: 409 });

  try {
    const [created] = await db
      .insert(profiles)
      .values({
        userId: session.user.id,
        handle: await uniqueHandle(session.user.name),
        ...parsed.data,
      })
      .returning();
    return Response.json(created, { status: 201 });
  } catch (error) {
    return serverError("profile.POST", error);
  }
}
