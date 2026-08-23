import { expo } from "@better-auth/expo";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { eq } from "drizzle-orm";

import { db, profiles } from "@/db";
import * as schema from "@/db/schema";
import { toHandle } from "@/lib/handle";
import { onboardingSchema } from "@/lib/validation/onboarding";

const baseURL = process.env.BETTER_AUTH_URL!;

/** Signup carries onboarding answers as extra body fields; reject early if bad. */
const readOnboarding = (body: unknown) => {
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    throw new APIError("BAD_REQUEST", { message: "Missing onboarding details" });
  }
  return parsed.data;
};

const uniqueHandle = async (name: string) => {
  const base = toHandle(name);
  const [taken] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.handle, base)).limit(1);
  if (!taken) return base;
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
};

export const auth = betterAuth({
  appName: "RepCard",
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [
    "repcard://",
    "exp://",
    "exp://*",
    "http://localhost:*",
    "http://192.168.*.*:*",
    baseURL,
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") readOnboarding(ctx.body);
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email" || !ctx.context.newSession) return;
      const { user } = ctx.context.newSession;
      await db.insert(profiles).values({
        userId: user.id,
        handle: await uniqueHandle(user.name),
        ...readOnboarding(ctx.body),
      });
    }),
  },
  plugins: [expo()],
});

export type AuthSession = typeof auth.$Infer.Session;
