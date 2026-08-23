import { auth } from "@/lib/auth";
import { allowRequest, clientIp, tooManyRequests } from "@/server/rate-limit";

const handler = auth.handler;

export { handler as GET };

/** Credential endpoints get a per-IP brake against brute force. */
export async function POST(request: Request) {
  if (!allowRequest(`auth:${clientIp(request)}`, 30, 60_000)) return tooManyRequests();
  return handler(request);
}
