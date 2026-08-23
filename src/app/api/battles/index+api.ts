import { desc, eq, or } from "drizzle-orm";

import { battles, db } from "@/db";
import { auth } from "@/lib/auth";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const randomCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");

/** My battles, newest first. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(battles)
    .where(or(eq(battles.creatorId, session.user.id), eq(battles.opponentId, session.user.id)))
    .orderBy(desc(battles.createdAt));

  return Response.json(rows);
}

/** Create a battle and get its invite code. */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const [created] = await db
    .insert(battles)
    .values({ code: randomCode(), creatorId: session.user.id })
    .returning();

  return Response.json(created, { status: 201 });
}
