import { eq } from "drizzle-orm";

import { db, user } from "@/db";
import { auth } from "@/lib/auth";

/** Deletes the account and, via FK cascade, every owned row. */
export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  await db.delete(user).where(eq(user.id, session.user.id));
  return Response.json({ message: "Account deleted" });
}
