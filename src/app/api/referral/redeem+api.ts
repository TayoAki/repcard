import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { db, profiles, user } from "@/db";
import { auth } from "@/lib/auth";
import { serverError } from "@/server/log";

const bodySchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z2-9]{6}$/) });

/** One-time: credits the caller to the owner of `code` (sets referredBy once). */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "That code doesn't look right" }, { status: 400 });

  try {
    const [referrer] = await db
      .select({ userId: profiles.userId, handle: profiles.handle, name: user.name })
      .from(profiles)
      .innerJoin(user, eq(user.id, profiles.userId))
      .where(eq(profiles.referralCode, parsed.data.code))
      .limit(1);
    if (!referrer) return Response.json({ message: "That invite code isn't valid" }, { status: 404 });
    if (referrer.userId === userId) {
      return Response.json({ message: "You can't redeem your own code" }, { status: 400 });
    }

    // One-time + race-safe: gate on referralRedeemedAt (immutable), NOT
    // referredBy - the latter can be nulled by ON DELETE SET NULL if the
    // referrer deletes their account, which must not re-open redemption.
    const claimed = await db
      .update(profiles)
      .set({ referredBy: referrer.userId, referralRedeemedAt: new Date() })
      .where(and(eq(profiles.userId, userId), isNull(profiles.referralRedeemedAt)))
      .returning({ id: profiles.id });
    if (claimed.length === 0) {
      return Response.json({ message: "You've already used an invite code" }, { status: 409 });
    }

    return Response.json({ ok: true, referrer: { handle: referrer.handle, name: referrer.name } });
  } catch (error) {
    return serverError("referral.redeem", error);
  }
}
