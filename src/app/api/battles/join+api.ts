import { addDays } from "date-fns";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { battles, db } from "@/db";
import { auth } from "@/lib/auth";

const bodySchema = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z2-9]{6}$/) });

/** Join by invite code; activates the battle for 7 days. */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ message: "Invalid code" }, { status: 400 });

  const [battle] = await db
    .select()
    .from(battles)
    .where(eq(battles.code, parsed.data.code))
    .limit(1);
  if (!battle) return Response.json({ message: "No battle with that code" }, { status: 404 });
  if (battle.creatorId === session.user.id) {
    return Response.json({ message: "That's your own battle" }, { status: 400 });
  }
  if (battle.status !== "pending") {
    return Response.json({ message: "Battle already started" }, { status: 409 });
  }

  const now = new Date();
  await db
    .update(battles)
    .set({ opponentId: session.user.id, status: "active", startedAt: now, endsAt: addDays(now, 7) })
    .where(eq(battles.id, battle.id));

  return Response.json({ id: battle.id, message: "Battle on" });
}
