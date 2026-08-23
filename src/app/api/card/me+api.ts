import { auth } from "@/lib/auth";
import { buildCardPayload } from "@/server/card-data";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ message: "Unauthorized" }, { status: 401 });

  const card = await buildCardPayload(session.user.id);
  if (!card) return Response.json({ message: "Card not found" }, { status: 404 });
  return Response.json(card);
}
