import { eq } from "drizzle-orm";

import { db, profiles, user } from "@/db";
import { escapeHtml, htmlPage } from "@/lib/web/page";
import { allowRequest, clientIp, tooManyRequests } from "@/server/rate-limit";

/** PUBLIC HTML: referral invite. Deep-links into the app to redeem the code. */
export async function GET(request: Request, { code }: Record<string, string>) {
  if (!allowRequest(`public:i:${clientIp(request)}`, 60, 60_000)) return tooManyRequests();
  const up = (code ?? "").toUpperCase();

  // An unknown/mistyped code still gets a working "join RepCard" page rather
  // than a dead 404 - a referral link should never look broken.
  let inviter: { name: string; handle: string } | null = null;
  if (/^[A-Z2-9]{6}$/.test(up)) {
    const [row] = await db
      .select({ name: user.name, handle: profiles.handle })
      .from(profiles)
      .innerJoin(user, eq(user.id, profiles.userId))
      .where(eq(profiles.referralCode, up))
      .limit(1);
    if (row) inviter = row;
  }

  const heading = inviter ? `${escapeHtml(inviter.name)} invited you to RepCard` : "You're invited to RepCard";
  const body = `
<h1>${heading}</h1>
<p class="sub">Track every workout and earn a baseball-style Player Card rated on your real training - streaks, PRs, volume, the works.</p>
${inviter ? `<div class="grid"><div class="cell"><b>${escapeHtml(up)}</b><span>INVITE CODE</span></div></div>` : ""}
<p class="hint">New here? Install RepCard, then enter this code under My Card → Invite friends.</p>`;

  return new Response(
    htmlPage({
      title: inviter ? `${inviter.name} invited you` : "Join RepCard",
      description: "Get your Player Card, rated on real training. RepCard.",
      deepLink: inviter ? `repcard://invite/${up}` : "repcard://",
      body,
    }),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Known invites are cacheable; an unknown code must NOT be cached - it
        // could be minted to a real user later, and a stale generic page (deep
        // link repcard://) would then lose that new invite's attribution.
        "Cache-Control": inviter ? "public, max-age=120" : "no-store",
      },
    },
  );
}
