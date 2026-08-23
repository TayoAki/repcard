import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, profiles } from "@/db";
import { buildCardPayload } from "@/server/card-data";
import { allowRequest, clientIp, tooManyRequests } from "@/server/rate-limit";

const handleSchema = z.string().regex(/^[a-z0-9]{1,24}$/);

/** PUBLIC: the shareable card. Exposes only what the card itself shows. */
export async function GET(request: Request, { handle }: Record<string, string>) {
  if (!allowRequest(`public:card:${clientIp(request)}`, 60, 60_000)) return tooManyRequests();
  if (!handleSchema.safeParse(handle).success) {
    return Response.json({ message: "Card not found" }, { status: 404 });
  }

  const [profile] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.handle, handle))
    .limit(1);
  if (!profile) return Response.json({ message: "Card not found" }, { status: 404 });

  const card = await buildCardPayload(profile.userId);
  if (!card) return Response.json({ message: "Card not found" }, { status: 404 });
  return Response.json(card, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
