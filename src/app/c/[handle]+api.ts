import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, profiles } from "@/db";
import { buildCardPayload } from "@/server/card-data";
import { escapeHtml, htmlPage } from "@/lib/web/page";
import { allowRequest, clientIp, tooManyRequests } from "@/server/rate-limit";

const handleSchema = z.string().regex(/^[a-z0-9]{1,24}$/);

/** PUBLIC HTML: the player card as a web page. */
export async function GET(request: Request, { handle }: Record<string, string>) {
  if (!allowRequest(`public:c:${clientIp(request)}`, 60, 60_000)) return tooManyRequests();
  if (!handleSchema.safeParse(handle).success) return new Response("Not found", { status: 404 });

  const [profile] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.handle, handle))
    .limit(1);
  if (!profile) return new Response("Not found", { status: 404 });

  const card = await buildCardPayload(profile.userId);
  if (!card) return new Response("Not found", { status: 404 });

  const cells = [
    [String(card.stats.sessions28), "SESSIONS 28D"],
    [`${(card.stats.volume28Kg / 1000).toFixed(1)}t`, "VOLUME 28D"],
    [`${card.streak}d`, "STREAK"],
    [`${card.bestStreak}d`, "BEST RUN"],
    [String(card.stats.prCount30), "PRS 30D"],
    [String(card.stats.muscleGroups28), "MUSCLES"],
  ];

  const body = `
<div style="display:flex;justify-content:space-between;align-items:flex-start">
  <div><span class="big">${card.overall}</span>
  <div class="sub" style="letter-spacing:2px;text-transform:uppercase">${escapeHtml(card.position)}</div></div>
  <div class="sub" style="text-align:right">#${String(card.serial).padStart(4, "0")}<br/>S${card.season}</div>
</div>
<h1 style="margin-top:18px">${escapeHtml(card.name)}</h1>
<p class="sub">@${escapeHtml(card.handle)}</p>
<div class="grid">
${cells.map(([v, l]) => `<div class="cell"><b>${escapeHtml(v)}</b><span>${l}</span></div>`).join("\n")}
</div>`;

  return new Response(
    htmlPage({
      title: `${card.name} — ${card.overall} OVR`,
      description: `${card.position} · ${card.streak}-day streak · RepCard player card`,
      deepLink: "repcard://",
      body,
    }),
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } },
  );
}
