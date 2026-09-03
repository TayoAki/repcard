import { and, count, eq, isNull } from "drizzle-orm";

import { db, profiles } from "@/db";
import { auth } from "@/lib/auth";
import { serverError } from "@/server/log";

// Unambiguous uppercase alphabet (no I/O/0/1), matching the invite-code look.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b % ALPHABET.length]).join("");

/** Returns the caller's invite code (minting one if needed), recruit count, and
 *  whether they've already redeemed someone else's code. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const [me] = await db
      .select({ referralCode: profiles.referralCode, referralRedeemedAt: profiles.referralRedeemedAt })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    if (!me) return Response.json({ message: "Profile not found" }, { status: 404 });

    let code = me.referralCode;
    if (!code) code = await mintCode(userId);

    const [{ recruits }] = await db
      .select({ recruits: count() })
      .from(profiles)
      .where(eq(profiles.referredBy, userId));

    return Response.json({ code, recruits, redeemed: me.referralRedeemedAt !== null });
  } catch (error) {
    return serverError("referral.GET", error);
  }
}

/**
 * Mints a code into the caller's still-empty slot. Race + collision safe: the
 * qualified update only lands while referralCode is null, and a unique-violation
 * on the code just tries a fresh one. Returns whatever ends up stored.
 */
async function mintCode(userId: string): Promise<string> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = randomCode();
    try {
      const updated = await db
        .update(profiles)
        .set({ referralCode: code })
        .where(and(eq(profiles.userId, userId), isNull(profiles.referralCode)))
        .returning({ code: profiles.referralCode });
      if (updated.length > 0) return code;

      // Lost the race - another request minted first; return the winner's code.
      const [current] = await db
        .select({ code: profiles.referralCode })
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);
      if (current?.code) return current.code;
    } catch {
      // code collided with another user's - loop and regenerate
    }
  }
  throw new Error("could not mint referral code");
}
